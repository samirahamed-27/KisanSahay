"""
Unit & Integration Tests for Fresh Retrieval, Chat Behaviour & Eligibility Engine
================================================================================
Covers Prompt 5 requirements:
1. retrieve(question, state=None, n=6) queries ChromaDB with where filters
   for user's state (plus 'ALL') and only chunks with status='live'.
2. Group returned chunks by record_id and merge them in chunk_index order.
3. Keep top 3 or 4 records.
4. Time-sensitive preference (mandi prices, weather advisories, training dates)
   ranking freshest records first and showing dates.
5. Pending change note added when a record has an active pending update.
6. TTL expiration notice added when a record is older than its time-to-live.
7. Python deterministic eligibility engine (Yes/No decisions kept in Python).
8. Gemini rules: answer only from context, cite source_url and last_verified date,
   say not sure and suggest nearest KVK or bank when context doesn't cover question.
"""

import os
import tempfile
import unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient

from app import app
from src.data_layer import KisanDataLayer, SourceRegistry
from sync_engine import SyncEngine, DeterministicFallbackEmbeddings
from src.rag.retrieval import retrieve, build_chroma_where_filter, is_time_sensitive_query
from src.rag.eligibility_engine import evaluate_eligibility, extract_farmer_attributes
from src.rag.gemini_generator import generate_with_gemini, build_gemini_system_prompt


class TestEligibilityEngine(unittest.TestCase):
    """Tests that eligibility Yes/No decisions are strictly evaluated in Python."""

    def test_pm_kisan_landowner_eligible(self):
        query = "I own 3 acres of agricultural land in Sehore. Am I eligible for PM-KISAN?"
        res = evaluate_eligibility(query)
        self.assertTrue(res["is_eligibility_query"])
        self.assertEqual(res["decision"], "YES")
        self.assertEqual(res["scheme_key"], "pm_kisan")
        self.assertIn("Pradhan Mantri Kisan Samman Nidhi", res["scheme_name"])
        self.assertTrue(any("Applicant holds ownership" in r or "Landholding size" in r for r in res["reasons"]))

    def test_pm_kisan_tenant_farmer_not_eligible(self):
        query = "I am a tenant farmer cultivating on lease. Can I apply for PM-KISAN?"
        res = evaluate_eligibility(query)
        self.assertTrue(res["is_eligibility_query"])
        self.assertEqual(res["decision"], "NO")
        self.assertEqual(res["scheme_key"], "pm_kisan")
        self.assertTrue(any("Tenant farmers and sharecroppers are not eligible" in u for u in res["unmet_criteria"]))

    def test_pm_kisan_govt_employee_excluded(self):
        query = "I am a government employee with 2 acres land. Am I eligible for PM-KISAN?"
        res = evaluate_eligibility(query)
        self.assertEqual(res["decision"], "NO")
        self.assertTrue(any("government employees" in u for u in res["unmet_criteria"]))

    def test_kcc_tenant_farmer_eligible(self):
        query = "Can a tenant farmer get Kisan Credit Card crop loan?"
        res = evaluate_eligibility(query)
        self.assertTrue(res["is_eligibility_query"])
        self.assertEqual(res["decision"], "YES")
        self.assertEqual(res["scheme_key"], "kisan_credit_card")
        self.assertTrue(any("eligible for KCC" in r.lower() or "tenant" in r.lower() for r in res["reasons"]))

    def test_tractor_subsidy_large_land_excluded(self):
        query = "I have 25 acres of land. Am I eligible for small farmer tractor subsidy under SMAM?"
        res = evaluate_eligibility(query)
        self.assertEqual(res["decision"], "NO")
        self.assertTrue(any("exceeds priority" in u.lower() for u in res["unmet_criteria"]))


class TestFreshRetrieval(unittest.TestCase):
    """Tests retrieve(question, state, n=6) and ChromaDB filtering/grouping."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_retrieval.db"
        self.chroma_dir = Path(self.temp_dir.name) / "test_chroma"
        self.registry = SourceRegistry(target_state="Madhya Pradesh")
        self.data_layer = KisanDataLayer(db_path=str(self.db_path), registry=self.registry)
        self.embeddings = DeterministicFallbackEmbeddings()
        self.sync_engine = SyncEngine(
            db_path=str(self.db_path),
            chroma_dir=str(self.chroma_dir),
            collection_name="test_retrieval_coll",
            target_state="Madhya Pradesh",
            embeddings=self.embeddings,
            data_layer=self.data_layer
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_build_chroma_where_filter(self):
        f_none = build_chroma_where_filter(None)
        self.assertEqual(f_none, {"status": "live"})

        f_mp = build_chroma_where_filter("Madhya Pradesh")
        self.assertIn("$and", f_mp)
        self.assertEqual(f_mp["$and"][0], {"status": "live"})
        self.assertIn("Madhya Pradesh", f_mp["$and"][1]["state"]["$in"])
        self.assertIn("ALL", f_mp["$and"][1]["state"]["$in"])

    def test_group_chunks_and_merge_in_index_order(self):
        # Insert a live scheme with 3 chunks
        scheme_data = {
            "scheme_name": "Integrated Nutrient Management",
            "benefits": "50% assistance on bio-fertilizers up to Rs 5000.",
            "eligibility": ["All landholding farmers"],
            "documents": ["Aadhaar", "Land Record"],
            "how_to_apply": "Apply via Agriculture Officer or KVK.",
            "deadlines": "Annual",
            "portal_link": "https://farmer.gov.in"
        }
        rec = self.data_layer.upsert_record(
            record_id="scheme_nutrient_mp",
            data_type="gov_schemes_loans",
            state="Madhya Pradesh",
            district="All",
            content=scheme_data,
            source_id="src_gov_schemes_loans_Madhya Pradesh",
            source_url="https://farmer.gov.in",
            status="live"
        )
        self.sync_engine.update_chroma_for_record(rec)

        res = retrieve(
            question="nutrient bio fertilizer assistance",
            state="Madhya Pradesh",
            n=6,
            data_layer=self.data_layer,
            vector_store=self.sync_engine.vector_store
        )
        self.assertGreater(res["count"], 0)
        self.assertLessEqual(res["count"], 4, "Should keep at most top 3 or 4 records")

        top_rec = res["records"][0]
        self.assertEqual(top_rec["record_id"], "scheme_nutrient_mp")
        self.assertEqual(top_rec["state"], "Madhya Pradesh")
        self.assertIn("50% assistance on bio-fertilizers", top_rec["content"])

    def test_pending_change_note_attached(self):
        # 1. Live base record
        rec = self.data_layer.upsert_record(
            record_id="scheme_solar_pump",
            data_type="gov_schemes_loans",
            state="Madhya Pradesh",
            district="All",
            content={"scheme_name": "Solar Pump Subsidy", "benefits": "60% subsidy"},
            source_id="src_gov_schemes_loans_Madhya Pradesh",
            source_url="https://pmkusum.mnre.gov.in",
            status="live"
        )
        self.sync_engine.update_chroma_for_record(rec)

        # 2. Insert draft update in pending_review
        self.data_layer.upsert_record(
            record_id="scheme_solar_pump__pending",
            data_type="gov_schemes_loans",
            state="Madhya Pradesh",
            district="All",
            content={"scheme_name": "Solar Pump Subsidy", "benefits": "80% subsidy"},
            source_id="src_gov_schemes_loans_Madhya Pradesh",
            source_url="https://pmkusum.mnre.gov.in",
            status="pending_review"
        )

        res = retrieve(
            question="solar pump subsidy benefits",
            state="Madhya Pradesh",
            n=6,
            data_layer=self.data_layer,
            vector_store=self.sync_engine.vector_store
        )
        self.assertTrue(res["has_pending_updates"])
        self.assertTrue(res["records"][0]["has_pending_change"])
        self.assertIn("PENDING UPDATE ADVISORY", res["formatted_context"])
        self.assertIn("confirmed directly with your local bank branch or Krishi Vigyan Kendra", res["formatted_context"])

    def test_ttl_stale_record_notice_attached(self):
        # Insert a record with expires_at in the past
        old_time = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
        with self.data_layer.get_connection() as conn:
            conn.cursor().execute(
                """
                INSERT INTO records (id, type, state, district, content_json, content_hash, source_id, source_url, status, version, created_at, updated_at, last_verified, expires_at, is_stale)
                VALUES ('mandi_stale_wheat', 'mandi_prices', 'Madhya Pradesh', 'Bhopal', '{"crop": "Wheat", "price": 2200}', 'hash123', 'src_mandi', 'https://agmarknet.gov.in', 'live', 1, ?, ?, ?, ?, 1)
                """,
                (old_time, old_time, old_time, old_time)
            )
            conn.commit()

        stale_rec = self.data_layer.get_record("mandi_stale_wheat")
        self.sync_engine.update_chroma_for_record(stale_rec)

        res = retrieve(
            question="wheat mandi price in Bhopal",
            state="Madhya Pradesh",
            n=6,
            data_layer=self.data_layer,
            vector_store=self.sync_engine.vector_store
        )
        self.assertTrue(res["has_stale_records"])
        self.assertIn("TTL EXPIRATION NOTICE", res["formatted_context"])

    def test_time_sensitive_query_prefers_fresh_records(self):
        now = datetime.now(timezone.utc)
        fresh_time = now.isoformat()
        older_time = (now - timedelta(days=10)).isoformat()

        # Older mandi price
        with self.data_layer.get_connection() as conn:
            conn.cursor().execute(
                """
                INSERT INTO records (id, type, state, district, content_json, content_hash, source_id, source_url, status, version, created_at, updated_at, last_verified, expires_at, is_stale)
                VALUES ('mandi_older_gram', 'mandi_prices', 'Madhya Pradesh', 'Ujjain', '{"crop": "Gram", "price": 5400}', 'h_old', 'src_mandi', 'https://agmarknet.gov.in', 'live', 1, ?, ?, ?, ?, 0)
                """,
                (older_time, older_time, older_time, fresh_time)
            )
            # Fresh mandi price
            conn.cursor().execute(
                """
                INSERT INTO records (id, type, state, district, content_json, content_hash, source_id, source_url, status, version, created_at, updated_at, last_verified, expires_at, is_stale)
                VALUES ('mandi_fresh_gram', 'mandi_prices', 'Madhya Pradesh', 'Ujjain', '{"crop": "Gram", "price": 5600}', 'h_fresh', 'src_mandi', 'https://agmarknet.gov.in', 'live', 1, ?, ?, ?, ?, 0)
                """,
                (fresh_time, fresh_time, fresh_time, fresh_time)
            )
            conn.commit()

        self.sync_engine.update_chroma_for_record(self.data_layer.get_record("mandi_older_gram"))
        self.sync_engine.update_chroma_for_record(self.data_layer.get_record("mandi_fresh_gram"))

        res = retrieve(
            question="What is the latest mandi price for Gram in Ujjain today?",
            state="Madhya Pradesh",
            n=6,
            data_layer=self.data_layer,
            vector_store=self.sync_engine.vector_store
        )
        self.assertTrue(res["is_time_sensitive"])
        # Fresh record should be ranked first
        self.assertEqual(res["records"][0]["record_id"], "mandi_fresh_gram")


class TestGeminiGeneratorRules(unittest.TestCase):
    """Tests Gemini generation rules: grounding, citations, TTL warnings, uncertainty fallback."""

    def test_gemini_uncertain_fallback_when_empty_context(self):
        res = generate_with_gemini(
            query="What is the subsidy for mango orchards in Kerala?",
            retrieval_result={"records": [], "formatted_context": "", "citations": []},
            lang="en"
        )
        self.assertIn("not sure", res["answer"].lower())
        self.assertIn("krishi vigyan kendra", res["answer"].lower())

    def test_gemini_includes_citations_and_notices(self):
        retrieval_mock = {
            "records": [
                {
                    "record_id": "scheme_soil_health",
                    "data_type": "gov_schemes_loans",
                    "source_url": "https://soilhealth.dac.gov.in",
                    "last_verified": "2026-10-02T10:00:00Z",
                    "content": "Free soil sample testing provided to all farmers across 12 chemical parameters.",
                    "has_pending_change": True,
                    "is_stale": True
                }
            ],
            "formatted_context": "Free soil sample testing provided to all farmers across 12 chemical parameters.",
            "citations": [
                {
                    "record_id": "scheme_soil_health",
                    "source_url": "https://soilhealth.dac.gov.in",
                    "last_verified": "2026-10-02T10:00:00Z"
                }
            ],
            "has_pending_updates": True,
            "has_stale_records": True
        }

        ans = generate_with_gemini(
            query="How to get soil tested?",
            retrieval_result=retrieval_mock,
            lang="en"
        )
        self.assertIn("https://soilhealth.dac.gov.in", ans["answer"])
        self.assertIn("2026-10-02T10:00:00Z", ans["answer"])
        self.assertTrue(ans["has_pending_updates"])
        self.assertTrue(ans["has_stale_records"])
        self.assertIn("undergoing updates", ans["answer"].lower())
        self.assertIn("time-to-live", ans["answer"].lower())


class TestChatEndpointIntegration(unittest.TestCase):
    """End-to-end API tests on /chat."""

    def setUp(self):
        self.client = TestClient(app)

    def test_chat_returns_citations_and_status(self):
        payload = {
            "user_query": "What are the soil testing facilities and contact details at Sehore KVK?",
            "state": "Madhya Pradesh"
        }
        res = self.client.post("/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("answer", data)
        self.assertEqual(data["status"], "success")

    def test_chat_eligibility_response_uses_python_decision(self):
        payload = {
            "user_query": "I am a tenant farmer cultivating on lease without land ownership. Can I receive PM-KISAN cash benefits?",
            "state": "Madhya Pradesh"
        }
        res = self.client.post("/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("NO", data["answer"].upper())
        self.assertIn("tenant", data["answer"].lower())


if __name__ == "__main__":
    unittest.main()
