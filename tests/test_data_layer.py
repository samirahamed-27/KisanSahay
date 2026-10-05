"""
Unit Tests for KisanSahay Automated Data Layer & Registry
=========================================================
Tests:
- sources.yaml loading and [STATE] parameter substitution
- SQLite table initialization and constraints
- SHA-256 change detection and version incrementing
- TTL expiration and stale record flagging (e.g. mandi prices > 1 day)
- High-risk scheme review gate (gov_schemes_loans -> pending_review)
- Sync audit logging
- RAG document export formatting
"""

import os
import json
import tempfile
import unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta

import sys
_backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from src.data_layer.data_layer import (
    KisanDataLayer,
    SourceRegistry,
    canonicalize_json,
    to_iso_utc,
    get_utc_now,
    DEFAULT_TTL_POLICIES
)
from src.data_layer.models import (
    KVKDirectoryRecord,
    MandiPriceRecord,
    GovSchemeLoanRecord
)


class TestKisanDataLayer(unittest.TestCase):

    def setUp(self):
        # Create temporary database file for isolated testing
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_kisansahay.db"
        self.state = "Madhya Pradesh"
        self.registry = SourceRegistry(target_state=self.state)
        self.dl = KisanDataLayer(db_path=self.db_path, registry=self.registry)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_sources_yaml_registry(self):
        """Validates that sources.yaml defines all 6 required agricultural data types."""
        sources = self.registry.sources
        self.assertGreaterEqual(len(sources), 6)

        data_types = {s["data_type"] for s in sources}
        expected_types = {
            "kvk_directory",
            "kvk_training_calendar",
            "crop_advisory",
            "gov_schemes_loans",
            "mandi_prices",
            "imd_weather_advisory"
        }
        self.assertTrue(expected_types.issubset(data_types))

        # Check required fields on each source
        for src in sources:
            self.assertIn("id", src)
            self.assertIn("name", src)
            self.assertIn("official_url", src)
            self.assertIn("data_type", src)
            self.assertIn("fetch_method", src)
            self.assertIn("refresh_interval", src)
            self.assertIn("risk_level", src)
            self.assertIn("parser_name", src)
            self.assertIn(src["fetch_method"], ["api", "csv", "rss", "html"])
            self.assertIn(src["risk_level"], ["low", "high"])

        # Check TTL policies
        self.assertEqual(self.registry.get_ttl("mandi_prices").days, 1)
        self.assertEqual(self.registry.get_ttl("imd_weather_advisory").days, 3)
        self.assertEqual(self.registry.get_ttl("kvk_directory").days, 180)

    def test_record_insertion_and_versioning(self):
        """Verifies initial insertion (v1) and content hash change detection."""
        kvk = KVKDirectoryRecord(
            name="KVK Sehore",
            district="Sehore",
            address="Near Agri College",
            phone="07562-222456",
            website="https://kvksehore.icar.gov.in",
            soil_testing_facility=True
        )

        # 1. First insert
        res1 = self.dl.upsert_record(
            record_id="kvk_sehore_test",
            data_type="kvk_directory",
            state=self.state,
            district="Sehore",
            content=kvk.to_dict(),
            source_id="src_kvk_directory_Madhya Pradesh",
            source_url="https://kvk.icar.gov.in"
        )
        self.assertEqual(res1["action"], "inserted")
        self.assertEqual(res1["version"], 1)
        self.assertEqual(res1["status"], "live")

        # 2. Re-insert with identical content -> should NOT increment version
        res2 = self.dl.upsert_record(
            record_id="kvk_sehore_test",
            data_type="kvk_directory",
            state=self.state,
            district="Sehore",
            content=kvk.to_dict(),
            source_id="src_kvk_directory_Madhya Pradesh",
            source_url="https://kvk.icar.gov.in"
        )
        self.assertEqual(res2["action"], "verified_unmodified")
        self.assertEqual(res2["version"], 1)

        # 3. Update content (phone number changed) -> should bump to v2
        kvk_updated = KVKDirectoryRecord(
            name="KVK Sehore",
            district="Sehore",
            address="Near Agri College",
            phone="07562-999999",  # Modified
            website="https://kvksehore.icar.gov.in",
            soil_testing_facility=True
        )
        res3 = self.dl.upsert_record(
            record_id="kvk_sehore_test",
            data_type="kvk_directory",
            state=self.state,
            district="Sehore",
            content=kvk_updated.to_dict(),
            source_id="src_kvk_directory_Madhya Pradesh",
            source_url="https://kvk.icar.gov.in"
        )
        self.assertEqual(res3["action"], "updated")
        self.assertEqual(res3["version"], 2)
        self.assertNotEqual(res1["content_hash"], res3["content_hash"])

    def test_high_risk_record_workflow(self):
        """Verifies high-risk records (gov_schemes_loans) require review upon modification."""
        scheme = GovSchemeLoanRecord(
            scheme_name="Test Subsidized Loan",
            scheme_type="Subsidized Credit",
            eligibility=["Small Farmers"],
            documents=["Aadhaar", "Khasra"],
            benefits="4% Interest Rate",
            how_to_apply="Bank branch",
            deadlines="Open"
        )

        # Initial insert explicitly marked live
        r1 = self.dl.upsert_record(
            record_id="scheme_test_01",
            data_type="gov_schemes_loans",
            state=self.state,
            district="all",
            content=scheme.to_dict(),
            source_id="src_gov_schemes_loans_Madhya Pradesh",
            source_url="https://agricoop.nic.in",
            status="live"
        )
        self.assertEqual(r1["status"], "live")

        # Upstream modification detected without explicit pre-approval
        scheme.benefits = "5% Interest Rate (Changed by Bank)"
        r2 = self.dl.upsert_record(
            record_id="scheme_test_01",
            data_type="gov_schemes_loans",
            state=self.state,
            district="all",
            content=scheme.to_dict(),
            source_id="src_gov_schemes_loans_Madhya Pradesh",
            source_url="https://agricoop.nic.in"
        )
        self.assertEqual(r2["action"], "updated")
        self.assertEqual(r2["status"], "pending_review")

        # When querying live records, pending_review records are shielded from farmers
        live_schemes = self.dl.get_records(data_type="gov_schemes_loans", status="live")
        self.assertEqual(len(live_schemes), 0)

    def test_ttl_and_staleness_flagging(self):
        """Verifies that records older than their TTL are flagged as stale."""
        now = get_utc_now()
        yesterday_morning = now - timedelta(days=2)  # Older than 1-day mandi price TTL

        mandi = MandiPriceRecord(
            market_center="Sehore",
            district="Sehore",
            commodity="Wheat",
            variety="Lokwan",
            arrival_date="2026-09-30",
            min_price=2300.0,
            max_price=2600.0,
            modal_price=2450.0
        )

        self.dl.upsert_record(
            record_id="mandi_wheat_old",
            data_type="mandi_prices",
            state=self.state,
            district="Sehore",
            content=mandi.to_dict(),
            source_id="src_mandi_prices_Madhya Pradesh",
            source_url="https://agmarknet.gov.in",
            last_verified=yesterday_morning  # 2 days old
        )

        # Run staleness check
        report = self.dl.flag_stale_records(as_of=now)
        self.assertGreaterEqual(report["total_stale_active"], 1)

        # Verify querying with fresh_only=True excludes stale records
        fresh_records = self.dl.get_records(data_type="mandi_prices", fresh_only=True)
        self.assertEqual(len(fresh_records), 0)

        # Querying with fresh_only=False includes them
        all_records = self.dl.get_records(data_type="mandi_prices", fresh_only=False)
        self.assertEqual(len(all_records), 1)
        self.assertEqual(all_records[0]["is_stale"], 1)

    def test_sync_audit_log(self):
        """Verifies sync_log lifecycle and execution tracking."""
        source_id = "src_mandi_prices_Madhya Pradesh"
        log_id = self.dl.start_sync_log(source_id)
        self.assertIsInstance(log_id, int)

        self.dl.finish_sync_log(
            log_id=log_id,
            result="success",
            records_added=15,
            records_updated=3,
            records_retired=2,
            error=None
        )

        with self.dl.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM sync_log WHERE id = ?", (log_id,))
            row = cur.fetchone()
            self.assertEqual(row["source_id"], source_id)
            self.assertEqual(row["result"], "success")
            self.assertEqual(row["records_added"], 15)
            self.assertEqual(row["records_updated"], 3)
            self.assertEqual(row["records_retired"], 2)
            self.assertIsNotNone(row["completed_at"])

    def test_retire_missing_records(self):
        """Verifies that missing records in a batch are marked retired."""
        source_id = "src_mandi_prices_Madhya Pradesh"

        # Insert 3 records
        for i in range(3):
            rec = MandiPriceRecord(
                market_center=f"Yard_{i}",
                district="Sehore",
                commodity="Soybean",
                variety="Yellow",
                arrival_date="2026-10-02",
                min_price=4000.0,
                max_price=4500.0,
                modal_price=4200.0
            )
            self.dl.upsert_record(
                record_id=f"mandi_batch_{i}",
                data_type="mandi_prices",
                state=self.state,
                district="Sehore",
                content=rec.to_dict(),
                source_id=source_id,
                source_url="https://agmarknet.gov.in"
            )

        # Suppose subsequent sync only found record 0 and 1
        retired_count = self.dl.retire_missing_records(
            source_id=source_id,
            active_ids_in_batch=["mandi_batch_0", "mandi_batch_1"]
        )
        self.assertEqual(retired_count, 1)

        # Record 2 should now have status == 'retired'
        rec2 = self.dl.get_record("mandi_batch_2")
        self.assertEqual(rec2["status"], "retired")

    def test_rag_export(self):
        """Verifies RAG document export generates enriched text with metadata."""
        kvk = KVKDirectoryRecord(
            name="KVK Sehore",
            district="Sehore",
            address="Main Road, Sehore",
            phone="07562-111111",
            website="https://kvk.icar.gov.in",
            soil_testing_facility=True
        )
        self.dl.upsert_record(
            record_id="kvk_export_test",
            data_type="kvk_directory",
            state=self.state,
            district="Sehore",
            content=kvk.to_dict(),
            source_id="src_kvk_directory_Madhya Pradesh",
            source_url="https://kvk.icar.gov.in"
        )

        out_path = Path(self.temp_dir.name) / "rag_export.jsonl"
        docs = self.dl.export_for_rag(out_path)
        self.assertEqual(len(docs), 1)
        self.assertIn("# Category: Kvk Directory", docs[0]["text"])
        self.assertIn("Soil Testing Facility", docs[0]["text"])
        self.assertEqual(docs[0]["metadata"]["record_id"], "kvk_export_test")


if __name__ == "__main__":
    unittest.main()
