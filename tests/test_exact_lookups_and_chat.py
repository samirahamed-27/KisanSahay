"""
Unit & Integration Tests for Prompt 6: Exact Lookups, API and Direct Chat Direct Answering
========================================================================================
Tests:
  1. Database-backed KVK directory lookup (not static JSON file).
  2. KVK upcoming events and training demonstrations lookup.
  3. Current crop advisories and IMD weather advisories lookup.
  4. Latest mandi wholesale prices lookup with commodity/district filtering.
  5. API endpoints: GET /api/kvk, /api/kvk/events, /api/advisories, /api/mandi.
  6. Zero-Model Direct Chat Intent Matching in /chat with "Updated on <date> – source: <name>" label.
  7. Failing source notice detection and reporting.
"""

import unittest
import tempfile
import shutil
import json
from pathlib import Path
from fastapi.testclient import TestClient

import sys
_backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from app import app
from src.data_layer import (
    KisanDataLayer,
    SourceRegistry,
    get_kvk_directory,
    get_kvk_events,
    get_crop_advisories,
    get_mandi_prices,
    check_source_health,
    format_kvk_direct_answer,
    format_soil_testing_direct_answer,
    format_events_direct_answer,
    format_mandi_direct_answer,
    extract_district_from_text,
    extract_crop_from_text,
)


class TestExactLookupsDataLayer(unittest.TestCase):
    """Verifies that records are queried directly from SQLite database."""

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.tmp_dir) / "test_lookups.db"
        self.registry = SourceRegistry(target_state="Madhya Pradesh")
        self.data_layer = KisanDataLayer(db_path=self.db_path, registry=self.registry)
        self.data_layer.init_db()

        # Seed realistic live records
        # 1. KVK Directory (Sehore)
        self.data_layer.upsert_record(
            record_id="kvk_sehore_test",
            data_type="kvk_directory",
            state="Madhya Pradesh",
            district="Sehore",
            content={
                "name": "ICAR - Krishi Vigyan Kendra, Sehore",
                "district": "Sehore",
                "address": "Near RAK College of Agriculture, Sehore - 466001",
                "phone": "07562-222456",
                "email": "kvksehore@rediffmail.com",
                "website": "https://kvksehore.icar.gov.in",
                "soil_testing_facility": True,
                "host_organization": "RVSKVV Gwalior"
            },
            source_id="src_kvk_directory_Madhya Pradesh",
            source_url="https://kvk.icar.gov.in/directory/mp",
            status="live"
        )

        # 2. KVK Training Calendar (Sehore)
        self.data_layer.upsert_record(
            record_id="cal_sehore_drip_test",
            data_type="kvk_training_calendar",
            state="Madhya Pradesh",
            district="Sehore",
            content={
                "kvk_name": "ICAR - KVK Sehore",
                "district": "Sehore",
                "training_topic": "Precision Drip Irrigation and Fertigation for Soybean",
                "start_date": "2026-10-15",
                "end_date": "2026-10-18",
                "venue": "Demonstration Plot 3, KVK Campus, Sehore",
                "fees": "Free of Cost (ATMA)",
                "target_audience": "Small and Marginal Farmers, Rural Youth",
                "coordinator_contact": "Dr. S. K. Sharma (+91-9425012345)"
            },
            source_id="src_kvk_calendar_Madhya Pradesh",
            source_url="https://kvk.icar.gov.in/training_schedule.aspx?state=MP",
            status="live"
        )

        # 3. Crop Advisory (Soybean)
        self.data_layer.upsert_record(
            record_id="crop_soybean_test",
            data_type="crop_advisory",
            state="Madhya Pradesh",
            district="All",
            content={
                "crop_name": "Soybean",
                "season": "Kharif",
                "growth_stage": "Maturity / Harvest",
                "advisory_text": "Harvest soybean when 90% pods turn golden brown to avoid shattering.",
                "pest_disease_alerts": ["Tobacco caterpillar", "Pod borer"],
                "fertilizer_guidance": "Cease nitrogen applications; prepare for Rabi sowing.",
                "irrigation_guidance": "Withhold irrigation 10 days prior to harvest."
            },
            source_id="src_crop_advisories_Madhya Pradesh",
            source_url="https://farmer.gov.in/CropAdvisories.aspx?state=Madhya Pradesh",
            status="live"
        )

        # 4. Mandi Wholesale Prices (Dewas Soybean)
        self.data_layer.upsert_record(
            record_id="mandi_dewas_soybean_test",
            data_type="mandi_prices",
            state="Madhya Pradesh",
            district="Dewas",
            content={
                "market_center": "Dewas",
                "district": "Dewas",
                "commodity": "Soybean",
                "variety": "Yellow",
                "arrival_date": "2026-10-02",
                "min_price": 4600.0,
                "max_price": 4980.0,
                "modal_price": 4850.0,
                "arrivals_tonnes": 140.0
            },
            source_id="src_mandi_prices_Madhya Pradesh",
            source_url="https://agmarknet.gov.in",
            status="live"
        )

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_load_kvk_from_database(self):
        """Confirms KVK directory records load dynamically from SQLite, not static JSON."""
        res = get_kvk_directory(district="Sehore", state="Madhya Pradesh", data_layer=self.data_layer)
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["count"], 1)
        k = res["records"][0]
        self.assertEqual(k["name"], "ICAR - Krishi Vigyan Kendra, Sehore")
        self.assertEqual(k["phone"], "07562-222456")
        self.assertTrue(k["soil_testing_facility"])
        self.assertIn("Updated on", format_kvk_direct_answer(res))
        self.assertIn("source: ICAR Krishi Vigyan Kendra", format_kvk_direct_answer(res))

    def test_load_kvk_events_from_database(self):
        """Confirms upcoming vocational trainings load from database."""
        res = get_kvk_events(district="Sehore", state="Madhya Pradesh", data_layer=self.data_layer)
        self.assertEqual(res["count"], 1)
        ev = res["records"][0]
        self.assertIn("Precision Drip Irrigation", ev["training_topic"])
        self.assertEqual(ev["start_date"], "2026-10-15")
        ans = format_events_direct_answer(res)
        self.assertIn("Free of Cost", ans)
        self.assertIn("source: KVK Seasonal Training", ans)

    def test_load_crop_advisories_from_database(self):
        """Confirms seasonal crop advisories load from database."""
        res = get_crop_advisories(crop="Soybean", state="Madhya Pradesh", data_layer=self.data_layer)
        self.assertEqual(res["count"], 1)
        rec = res["records"][0]
        self.assertEqual(rec["crop_name"], "Soybean")
        self.assertIn("Harvest soybean", rec["advisory_text"])

    def test_load_mandi_prices_from_database(self):
        """Confirms mandi prices load from database with commodity and district matching."""
        res = get_mandi_prices(crop="Soybean", district="Dewas", state="Madhya Pradesh", data_layer=self.data_layer)
        self.assertEqual(res["count"], 1)
        p = res["records"][0]
        self.assertEqual(p["commodity"], "Soybean")
        self.assertEqual(p["modal_price"], 4850.0)
        ans = format_mandi_direct_answer(res)
        self.assertIn("₹4,850", ans)
        self.assertIn("source: Agmarknet", ans)

    def test_source_failing_telemetry(self):
        """Confirms failing source detection via sync_log."""
        # Log a failure in sync_log
        log_id = self.data_layer.start_sync_log("src_mandi_prices_Madhya Pradesh")
        self.data_layer.finish_sync_log(log_id, result="failure", error="HTTP 503 Gateway Timeout")

        health = check_source_health("src_mandi_prices_Madhya Pradesh", data_layer=self.data_layer)
        self.assertTrue(health["is_failing"])
        self.assertEqual(health["last_result"], "failure")

        res = get_mandi_prices(crop="Soybean", district="Dewas", state="Madhya Pradesh", data_layer=self.data_layer)
        self.assertTrue(res["is_source_failing"])
        ans = format_mandi_direct_answer(res)
        self.assertIn("sync delays", ans.lower())


class TestExactLookupsHttpEndpoints(unittest.TestCase):
    """End-to-end tests for GET /api/kvk, /api/kvk/events, /api/advisories, /api/mandi."""

    def setUp(self):
        self.client = TestClient(app)

    def test_api_kvk_endpoint(self):
        res = self.client.get("/api/kvk?district=Bhopal&state=Madhya Pradesh")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("records", data)
        self.assertIn("last_updated", data)
        self.assertIn("source_name", data)

    def test_api_kvk_events_endpoint(self):
        res = self.client.get("/api/kvk/events?district=Bhopal&state=Madhya Pradesh")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("records", data)

    def test_api_advisories_endpoint(self):
        res = self.client.get("/api/advisories?crop=Soybean&state=Madhya Pradesh")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("records", data)

    def test_api_mandi_endpoint(self):
        res = self.client.get("/api/mandi?crop=Soybean&district=Dewas&state=Madhya Pradesh")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("records", data)
        self.assertIn("last_updated", data)


class TestChatDirectAnsweringZeroModel(unittest.TestCase):
    """Verifies that questions on KVK, soil testing, trainings, and mandi prices
    are answered directly from SQLite with NO model call and proper labels."""

    def setUp(self):
        self.client = TestClient(app)

    def test_chat_soil_testing_answered_directly(self):
        payload = {
            "user_query": "What are the soil testing facilities and contact details at Sehore KVK?",
            "state": "Madhya Pradesh"
        }
        res = self.client.post("/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("Direct Database Lookup", data["source_type"])
        self.assertIn("07562-222456", data["answer"])
        self.assertIn("Updated on", data["answer"])
        self.assertIn("source: ICAR Krishi Vigyan Kendra", data["answer"])
        self.assertIsNotNone(data.get("last_updated"))
        self.assertIsNotNone(data.get("source_name"))

    def test_chat_mandi_price_answered_directly(self):
        payload = {
            "user_query": "What is the latest mandi price for Soybean in Dewas market today?",
            "state": "Madhya Pradesh"
        }
        res = self.client.post("/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("Direct Database Lookup (Agmarknet Mandi)", data["source_type"])
        self.assertIn("4,850", data["answer"])
        self.assertIn("Updated on", data["answer"])
        self.assertIn("source: Agmarknet", data["answer"])

    def test_chat_upcoming_trainings_answered_directly(self):
        payload = {
            "user_query": "What are the upcoming KVK training dates and demonstration schedule in Sehore?",
            "state": "Madhya Pradesh"
        }
        res = self.client.post("/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("Direct Database Lookup (KVK Training Calendar)", data["source_type"])
        self.assertIn("Precision Drip Irrigation", data["answer"])
        self.assertIn("Updated on", data["answer"])

    def test_chat_nearest_kvk_answered_directly(self):
        payload = {
            "user_query": "Where is the nearest KVK in Bhopal?",
            "state": "Madhya Pradesh"
        }
        res = self.client.post("/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("Direct Database Lookup (KVK Directory)", data["source_type"])
        self.assertIn("0755-2730985", data["answer"])
        self.assertIn("Updated on", data["answer"])


if __name__ == "__main__":
    unittest.main()
