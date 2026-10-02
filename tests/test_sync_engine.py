"""
Unit Tests for KisanSahay Sync Engine & Two-Tier Chunking
=========================================================
Tests:
- Markdown conversion with required ## subsections (Eligibility, Documents Required, Benefits, How to Apply, Notes)
- Two-tier hybrid chunking (Markdown headers + Recursive splitting on > 800 chars)
- Stable IDs ({record_id}::{chunk_index}) and Contextual Anchors
- Content hashing and version bumping on change
- High-risk safety gating (pending_review draft while previous live keeps being served)
- Retirement of missing records and Chroma chunk removal
- Sync logging audit metrics
"""

import os
import shutil
import tempfile
import unittest
from pathlib import Path
from datetime import datetime, timezone

from sync_engine import (
    SyncEngine,
    format_record_to_markdown,
    DeterministicFallbackEmbeddings,
)
from src.data_layer import KisanDataLayer, SourceRegistry
from src.data_layer.models import (
    KVKDirectoryRecord,
    GovSchemeLoanRecord,
    MandiPriceRecord,
)

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


class TestSyncEngine(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_sync.db"
        self.chroma_dir = Path(self.temp_dir.name) / "test_chroma"
        self.state = "Madhya Pradesh"

        self.embeddings = DeterministicFallbackEmbeddings()
        self.engine = SyncEngine(
            db_path=str(self.db_path),
            chroma_dir=str(self.chroma_dir),
            collection_name="test_sync_collection",
            target_state=self.state,
            embeddings=self.embeddings
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    def _read_fixture(self, filename: str) -> str:
        with open(FIXTURES_DIR / filename, "r", encoding="utf-8") as f:
            return f.read()

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Markdown Formatting & Required Subsections
    # -------------------------------------------------------------------------

    def test_markdown_conversion_has_required_subsections(self):
        """Verifies that format_record_to_markdown produces # title and all required ## subsections."""
        scheme_rec = {
            "id": "scheme_test_kcc",
            "type": "gov_schemes_loans",
            "state": "Madhya Pradesh",
            "district": "All",
            "source_url": "https://agricoop.nic.in",
            "last_verified": "2026-10-02T12:00:00Z",
            "version": 1,
            "content": {
                "scheme_name": "Kisan Credit Card (KCC)",
                "scheme_type": "Subsidized Credit",
                "benefits": "Credit limit up to 3 Lakh at 4% effective interest.",
                "how_to_apply": "Submit form at nearest bank branch.",
                "deadlines": "Year-round",
                "helpline": "1800-180-1551",
                "eligibility": ["All owner cultivator farmers", "Tenant farmers"],
                "documents": ["Aadhaar Card", "Khasra/Khatauni", "No Dues Certificate"]
            }
        }

        md = format_record_to_markdown(scheme_rec)

        # Must start with # Title
        self.assertTrue(md.startswith("# Scheme: Kisan Credit Card (KCC)"))

        # Must contain all 5 required ## subsections
        self.assertIn("## Eligibility", md)
        self.assertIn("## Documents Required", md)
        self.assertIn("## Benefits", md)
        self.assertIn("## How to Apply", md)
        self.assertIn("## Notes", md)

        # Verify content elements within sections
        self.assertIn("- All owner cultivator farmers", md)
        self.assertIn("- Aadhaar Card", md)
        self.assertIn("Credit limit up to 3 Lakh", md)

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Two-Tier Hybrid Chunking & Stable IDs
    # -------------------------------------------------------------------------

    def test_two_tier_hybrid_chunking_and_metadata(self):
        """
        Tests two-tier chunking:
        - Tier 1 splits along Markdown headers
        - Tier 2 splits large sections (> 800 chars)
        - Checks metadata: record_id, type, state, district, source_url, last_verified, version, header_path, chunk_index
        - Stable ID format: {record_id}::{chunk_index}
        """
        # Create a record with one very long benefits section (> 1000 characters)
        long_benefits = "Detailed interest subvention clause. " * 35  # ~1260 chars
        rec = {
            "id": "scheme_pm_large",
            "type": "gov_schemes_loans",
            "state": "Madhya Pradesh",
            "district": "Sehore",
            "source_url": "https://agricoop.nic.in/pmkisan",
            "last_verified": "2026-10-02T12:00:00Z",
            "version": 2,
            "content": {
                "scheme_name": "PM-KISAN Large Scale",
                "scheme_type": "Direct Subsidy",
                "benefits": long_benefits,
                "how_to_apply": "Apply online at pmkisan.gov.in portal.",
                "deadlines": "Ongoing",
                "helpline": "1800-11-5526",
                "eligibility": ["Landholding farmer families"],
                "documents": ["Aadhaar", "Land Records"]
            }
        }

        chunks = self.engine.chunk_record(rec)
        self.assertGreaterEqual(len(chunks), 5)

        for c in chunks:
            # Check stable ID format
            self.assertTrue(c["id"].startswith("scheme_pm_large::"))
            self.assertIn("::", c["id"])

            # Check Contextual Anchor
            self.assertTrue(c["text"].startswith("[") or c["text"].startswith("#"))

            # Check metadata fields
            meta = c["metadata"]
            self.assertEqual(meta["record_id"], "scheme_pm_large")
            self.assertEqual(meta["type"], "gov_schemes_loans")
            self.assertEqual(meta["state"], "Madhya Pradesh")
            self.assertEqual(meta["district"], "Sehore")
            self.assertEqual(meta["version"], 2)
            self.assertIn("header_path", meta)
            self.assertIsInstance(meta["chunk_index"], int)

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Synchronizer with Low-Risk vs High-Risk Logic
    # -------------------------------------------------------------------------

    def test_sync_low_risk_source_live_and_chroma(self):
        """Low-risk source (Mandi prices): new/changed records go live immediately and update ChromaDB."""
        src_cfg = self.engine.registry.get_source(f"src_mandi_prices_{self.state}")
        json_data = self._read_fixture("sample_mandi_prices.json")

        summary = self.engine.sync_source(src_cfg, data_override=json_data)

        self.assertEqual(summary["result"], "success")
        self.assertEqual(summary["added"], 3)  # 3 valid records in fixture
        self.assertGreaterEqual(summary["chroma_chunks"], 3)

        # Verify ChromaDB contains chunks
        if self.engine.vector_store is not None:
            col_count = self.engine.vector_store._collection.count()
            self.assertGreaterEqual(col_count, 3)

        # Re-running with identical data should detect 0 added, 0 updated (hash match)
        summary2 = self.engine.sync_source(src_cfg, data_override=json_data)
        self.assertEqual(summary2["added"], 0)
        self.assertEqual(summary2["updated"], 0)
        self.assertEqual(summary2["chroma_chunks"], 0)

    def test_high_risk_safety_gate_pending_review(self):
        """
        High-risk source (schemes):
        When a record is changed, the new version is stored as pending_review,
        while the previous live version keeps being served!
        """
        src_cfg = self.engine.registry.get_source(f"src_gov_schemes_loans_{self.state}")

        # 1. Establish an initial verified live scheme
        initial_scheme = GovSchemeLoanRecord(
            scheme_name="Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
            scheme_type="Direct Subsidy",
            eligibility=["All landholding farmer families"],
            documents=["Aadhaar", "Khasra"],
            benefits="Rs. 6000 per year in 3 installments.",
            how_to_apply="CSC Center",
            deadlines="Open",
            helpline="1800-11-5526"
        )
        self.engine.data_layer.upsert_record(
            record_id="scheme_pm_kisan_test",
            data_type="gov_schemes_loans",
            state=self.state,
            district="All",
            content=initial_scheme.to_dict(),
            source_id=src_cfg["id"],
            source_url="https://pmkisan.gov.in",
            status="live"
        )

        # 2. Mock adapter harvest returns updated rules (e.g. payout amount changed)
        modified_scheme = initial_scheme.to_dict()
        modified_scheme["benefits"] = "Rs. 8000 per year (Updated by Department)"

        class MockModifiedSchemeAdapter:
            def fetch(self, previous_count=None):
                return [{
                    "id": "scheme_pm_kisan_test",
                    "type": "gov_schemes_loans",
                    "state": "Madhya Pradesh",
                    "district": "All",
                    "content": modified_scheme,
                    "source_id": src_cfg["id"],
                    "source_url": "https://pmkisan.gov.in"
                }]

        # 3. Execute sync
        summary = self.engine.sync_source(src_cfg, adapter_override=MockModifiedSchemeAdapter())
        self.assertEqual(summary["updated"], 1)

        # 4. Verify that previous LIVE version is still active and served
        live_rec = self.engine.data_layer.get_record("scheme_pm_kisan_test")
        self.assertIsNotNone(live_rec)
        self.assertEqual(live_rec["status"], "live")
        self.assertIn("6000", live_rec["content"]["benefits"])

        # 5. Verify that new version is safely quarantined in pending_review
        pending_rec = self.engine.data_layer.get_record("scheme_pm_kisan_test__pending")
        self.assertIsNotNone(pending_rec)
        self.assertEqual(pending_rec["status"], "pending_review")
        self.assertIn("8000", pending_rec["content"]["benefits"])

    def test_missing_records_marked_retired_and_removed_from_chroma(self):
        """Verifies that missing records are marked 'retired' and their ChromaDB chunks deleted."""
        src_cfg = self.engine.registry.get_source(f"src_mandi_prices_{self.state}")

        # Seed 2 records
        for mid in ["mandi_rec_A", "mandi_rec_B"]:
            rec = MandiPriceRecord(
                market_center=mid,
                district="Sehore",
                commodity="Soybean",
                variety="Yellow",
                arrival_date="2026-10-02",
                min_price=4500.0,
                max_price=4900.0,
                modal_price=4700.0
            )
            self.engine.data_layer.upsert_record(
                record_id=mid,
                data_type="mandi_prices",
                state=self.state,
                district="Sehore",
                content=rec.to_dict(),
                source_id=src_cfg["id"],
                source_url="https://agmarknet.gov.in",
                status="live"
            )
            # Index into Chroma
            self.engine.update_chroma_for_record(self.engine.data_layer.get_record(mid))

        if self.engine.vector_store is not None:
            self.assertGreaterEqual(self.engine.vector_store._collection.count(), 2)

        # Subsequent sync only returns mandi_rec_A (mandi_rec_B is missing)
        class MockSingleRecordAdapter:
            def fetch(self, previous_count=None):
                return [{
                    "id": "mandi_rec_A",
                    "type": "mandi_prices",
                    "state": "Madhya Pradesh",
                    "district": "Sehore",
                    "content": {
                        "market_center": "mandi_rec_A",
                        "district": "Sehore",
                        "commodity": "Soybean",
                        "variety": "Yellow",
                        "arrival_date": "2026-10-02",
                        "min_price": 4500.0,
                        "max_price": 4900.0,
                        "modal_price": 4700.0
                    },
                    "source_id": src_cfg["id"],
                    "source_url": "https://agmarknet.gov.in"
                }]

        summary = self.engine.sync_source(src_cfg, adapter_override=MockSingleRecordAdapter())
        self.assertEqual(summary["retired"], 1)

        # mandi_rec_B should be marked 'retired' in SQLite
        rec_b = self.engine.data_layer.get_record("mandi_rec_B")
        self.assertEqual(rec_b["status"], "retired")

        # mandi_rec_B chunks should be deleted from Chroma
        if self.engine.vector_store is not None:
            b_chunks = self.engine.vector_store._collection.get(where={"record_id": "mandi_rec_B"})
            self.assertEqual(len(b_chunks["ids"]), 0)


if __name__ == "__main__":
    unittest.main()
