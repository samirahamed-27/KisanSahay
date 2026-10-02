"""
Unit & Integration Tests for KisanSahay Stale-Record Check Engine (check_stale.py)
================================================================================
Validates all requirements of Prompt 1:
1. 90-day default freshness threshold.
2. Per-type TTL overrides read from sources.yaml (mandi: 1d, advisory: 14d, kvk: 180d, etc.).
3. Sorting by most overdue first (highest days overdue at top).
4. Terminal table output with required fields (record id, type, state, district, title, last_verified, days overdue, source_url).
5. Saving results to stale_report.csv.
6. --mark flag sets is_stale=1 in SQLite records table while keeping status='live' (NEVER deleting or hiding records).
7. Sync logging in sync_log audit table.
8. Alert trigger (log and email) when overdue count exceeds threshold.
9. APScheduler monthly job configuration.
10. Chat retrieval warning integration for stale records.
"""

import os
import csv
import json
import tempfile
import unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

import check_stale
from check_stale import (
    load_ttl_policies,
    get_ttl_days_for_type,
    extract_record_title,
    evaluate_record_freshness,
    format_stale_table,
    save_stale_report_csv,
    mark_records_stale,
    log_stale_check_to_sync_log,
    send_stale_alert,
    run_stale_check,
    start_monthly_scheduler,
    DEFAULT_TTL_DAYS
)
from src.data_layer import KisanDataLayer, SourceRegistry, canonicalize_json
from src.rag.retrieval import retrieve
from src.rag.gemini_generator import generate_with_gemini


class TestCheckStale(unittest.TestCase):
    """Test suite for check_stale.py staleness detection, CSV export, marking, and alerting."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_stale.db"
        self.csv_path = Path(self.temp_dir.name) / "test_stale_report.csv"
        self.sources_yaml_path = Path(self.temp_dir.name) / "sources.yaml"

        # Create a sample sources.yaml with explicit ttl_policies
        sample_sources_yaml = """
version: "1.0.0"
ttl_policies:
  mandi_prices:
    ttl_days: 1
  imd_weather_advisory:
    ttl_days: 3
  crop_advisory:
    ttl_days: 14
  kvk_training_calendar:
    ttl_days: 30
  gov_schemes_loans:
    ttl_days: 90
  kvk_directory:
    ttl_days: 180
sources:
  - id: "src_mandi"
    data_type: "mandi_prices"
    refresh_interval: "24h"
  - id: "src_kvk"
    data_type: "kvk_directory"
    refresh_interval: "180d"
"""
        with open(self.sources_yaml_path, "w", encoding="utf-8") as f:
            f.write(sample_sources_yaml)

        # Initialize test database
        self.registry = SourceRegistry(sources_path=str(self.sources_yaml_path), target_state="Madhya Pradesh")
        self.data_layer = KisanDataLayer(db_path=str(self.db_path), registry=self.registry)

        # Base reference time for predictable testing: 2026-10-03 12:00:00 UTC
        self.now = datetime(2026, 10, 3, 12, 0, 0, tzinfo=timezone.utc)

    def tearDown(self):
        self.temp_dir.cleanup()

    def _insert_test_record(
        self,
        record_id: str,
        rec_type: str,
        days_ago: float,
        title: str = "Test Title",
        status: str = "live",
        is_stale: int = 0,
        district: str = "Bhopal",
        state: str = "Madhya Pradesh",
        source_url: str = "https://farmer.gov.in"
    ):
        """Helper to insert records with specific verification ages."""
        lv_dt = self.now - timedelta(days=days_ago)
        lv_iso = lv_dt.isoformat()
        content = {
            "name": title,
            "district": district,
            "state": state
        }
        canonical_content, c_hash = canonicalize_json(content)
        with self.data_layer.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO records (
                    id, type, state, district, content_json, content_hash,
                    source_id, source_url, last_verified, status, version,
                    created_at, updated_at, expires_at, is_stale
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record_id, rec_type, state, district, canonical_content, c_hash,
                    f"src_{rec_type}", source_url, lv_iso, status, 1,
                    lv_iso, lv_iso, (lv_dt + timedelta(days=90)).isoformat(), is_stale
                )
            )
            conn.commit()

    # 1. TTL Policy Loading & Overrides
    def test_load_ttl_policies_reads_overrides(self):
        policies = load_ttl_policies(self.sources_yaml_path)
        self.assertEqual(policies.get("mandi_prices"), 1.0)
        self.assertEqual(policies.get("crop_advisory"), 14.0)
        self.assertEqual(policies.get("kvk_directory"), 180.0)
        self.assertEqual(policies.get("gov_schemes_loans"), 90.0)

        # Default fallback for unknown type
        ttl_custom = get_ttl_days_for_type("unknown_finance_type", policies, default_ttl=90.0)
        self.assertEqual(ttl_custom, 90.0)

    # 2. Freshness Evaluation & 90-Day Default
    def test_freshness_evaluation_default_90_days(self):
        policies = load_ttl_policies(self.sources_yaml_path)

        # Record with generic/unknown type verified 95 days ago -> overdue by ~5 days
        rec_stale = {
            "id": "rec_generic_old",
            "type": "unspecified_credit_guideline",
            "status": "live",
            "last_verified": (self.now - timedelta(days=95)).isoformat(),
            "content": {"title": "General Agricultural Credit Directive"}
        }
        res_stale = evaluate_record_freshness(rec_stale, policies, as_of=self.now, default_ttl=90.0)
        self.assertIsNotNone(res_stale)
        self.assertEqual(res_stale["days_overdue"], 5.0)

        # Record with generic/unknown type verified 85 days ago -> NOT overdue
        rec_fresh = {
            "id": "rec_generic_fresh",
            "type": "unspecified_credit_guideline",
            "status": "live",
            "last_verified": (self.now - timedelta(days=85)).isoformat(),
            "content": {"title": "Recent Credit Directive"}
        }
        res_fresh = evaluate_record_freshness(rec_fresh, policies, as_of=self.now, default_ttl=90.0)
        self.assertIsNone(res_fresh)

    # 3. Per-Type Overrides: Mandi Prices (1d) & KVK Directory (180d)
    def test_freshness_evaluation_per_type_overrides(self):
        policies = load_ttl_policies(self.sources_yaml_path)

        # Mandi price: 2 days old (TTL 1 day) -> overdue by 1 day
        mandi_rec = {
            "id": "mandi_wheat_ujjain",
            "type": "mandi_prices",
            "status": "live",
            "last_verified": (self.now - timedelta(days=2.5)).isoformat(),
            "content": {"commodity": "Wheat", "market_center": "Ujjain"}
        }
        res_mandi = evaluate_record_freshness(mandi_rec, policies, as_of=self.now)
        self.assertIsNotNone(res_mandi)
        self.assertAlmostEqual(res_mandi["days_overdue"], 1.5, places=1)

        # KVK directory: 100 days old (TTL 180 days) -> NOT overdue
        kvk_rec = {
            "id": "kvk_bhopal",
            "type": "kvk_directory",
            "status": "live",
            "last_verified": (self.now - timedelta(days=100)).isoformat(),
            "content": {"name": "KVK Bhopal"}
        }
        res_kvk = evaluate_record_freshness(kvk_rec, policies, as_of=self.now)
        self.assertIsNone(res_kvk)

        # KVK directory: 200 days old (TTL 180 days) -> overdue by 20 days
        kvk_rec_old = {
            "id": "kvk_sehore_old",
            "type": "kvk_directory",
            "status": "live",
            "last_verified": (self.now - timedelta(days=200)).isoformat(),
            "content": {"name": "KVK Sehore"}
        }
        res_kvk_old = evaluate_record_freshness(kvk_rec_old, policies, as_of=self.now)
        self.assertIsNotNone(res_kvk_old)
        self.assertAlmostEqual(res_kvk_old["days_overdue"], 20.0, places=1)

    # 4. Sorting by Most Overdue First
    def test_run_stale_check_sorting_most_overdue_first(self):
        # Insert 3 overdue records with varying overdue amounts
        # 1. KVK directory 200 days ago (TTL 180d) -> 20 days overdue
        self._insert_test_record("kvk_rec", "kvk_directory", days_ago=200, title="KVK Campus")
        # 2. Mandi price 10 days ago (TTL 1d) -> 9 days overdue
        self._insert_test_record("mandi_rec", "mandi_prices", days_ago=10, title="Soybean Mandi")
        # 3. Scheme 150 days ago (TTL 90d) -> 60 days overdue (most overdue)
        self._insert_test_record("scheme_rec", "gov_schemes_loans", days_ago=150, title="Solar Pump Scheme")

        res = run_stale_check(
            db_path=self.db_path,
            sources_file=self.sources_yaml_path,
            output_csv=self.csv_path,
            as_of=self.now,
            log_sync=False
        )

        overdue_list = res["overdue_records"]
        self.assertEqual(len(overdue_list), 3)
        # Check order: highest days_overdue first
        self.assertEqual(overdue_list[0]["record_id"], "scheme_rec")   # ~60 days
        self.assertEqual(overdue_list[1]["record_id"], "kvk_rec")      # ~20 days
        self.assertEqual(overdue_list[2]["record_id"], "mandi_rec")    # ~9 days
        self.assertTrue(overdue_list[0]["days_overdue"] > overdue_list[1]["days_overdue"] > overdue_list[2]["days_overdue"])

    # 5. CSV Output Generation
    def test_save_stale_report_csv_format(self):
        records = [
            {
                "record_id": "rec_001",
                "type": "gov_schemes_loans",
                "state": "Madhya Pradesh",
                "district": "Bhopal",
                "title": "PM Kisan Samman Nidhi",
                "last_verified": "2026-05-01T00:00:00+00:00",
                "days_overdue": 65.5,
                "source_url": "https://pmkisan.gov.in"
            }
        ]
        csv_file = save_stale_report_csv(records, self.csv_path)
        self.assertTrue(Path(csv_file).exists())

        with open(csv_file, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader)
            self.assertEqual(header, [
                "record_id", "type", "state", "district", "title",
                "last_verified", "days_overdue", "source_url"
            ])
            row = next(reader)
            self.assertEqual(row[0], "rec_001")
            self.assertEqual(row[1], "gov_schemes_loans")
            self.assertEqual(row[4], "PM Kisan Samman Nidhi")
            self.assertEqual(row[6], "65.5")

    # 6. Terminal Table Formatting
    def test_format_stale_table_headers_and_content(self):
        records = [
            {
                "record_id": "scheme_pmsby",
                "type": "gov_schemes_loans",
                "state": "Madhya Pradesh",
                "district": "All",
                "title": "Pradhan Mantri Suraksha Bima Yojana",
                "last_verified": "2026-06-01T00:00:00+00:00",
                "days_overdue": 34.2,
                "source_url": "https://financialservices.gov.in"
            }
        ]
        table_text = format_stale_table(records)
        self.assertIn("Record ID", table_text)
        self.assertIn("Days Overdue", table_text)
        self.assertIn("scheme_pmsby", table_text)
        self.assertIn("34.2d", table_text)

    # 7. --mark Flag Sets is_stale=1 While Preserving status='live'
    def test_mark_flag_sets_is_stale_without_deleting_or_retiring(self):
        self._insert_test_record("scheme_kcc_old", "gov_schemes_loans", days_ago=120, title="KCC Scheme")
        self._insert_test_record("scheme_pmfby_fresh", "gov_schemes_loans", days_ago=20, title="PMFBY Fresh")

        res = run_stale_check(
            db_path=self.db_path,
            sources_file=self.sources_yaml_path,
            output_csv=self.csv_path,
            mark=True,
            as_of=self.now,
            log_sync=False
        )

        self.assertEqual(res["marked_count"], 1)

        # Verify directly in SQLite records table
        with self.data_layer.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, status, is_stale FROM records WHERE id = 'scheme_kcc_old'")
            stale_row = cur.fetchone()
            self.assertEqual(stale_row["status"], "live")  # NEVER deleted or retired
            self.assertEqual(stale_row["is_stale"], 1)     # Flagged stale

            cur.execute("SELECT id, status, is_stale FROM records WHERE id = 'scheme_pmfby_fresh'")
            fresh_row = cur.fetchone()
            self.assertEqual(fresh_row["status"], "live")
            self.assertEqual(fresh_row["is_stale"], 0)

    # 8. Never Delete or Hide Stale Records Automatically
    def test_never_delete_or_retire_records_automatically(self):
        self._insert_test_record("rec_old_1", "mandi_prices", days_ago=10)
        self._insert_test_record("rec_old_2", "crop_advisory", days_ago=40)

        run_stale_check(
            db_path=self.db_path,
            sources_file=self.sources_yaml_path,
            output_csv=self.csv_path,
            mark=True,
            as_of=self.now,
            log_sync=False
        )

        # Count total records in database
        with self.data_layer.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM records")
            total_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM records WHERE status = 'retired'")
            retired_count = cur.fetchone()[0]

        self.assertEqual(total_count, 2)
        self.assertEqual(retired_count, 0)  # Zero records retired

    # 9. Audit Logging in sync_log
    def test_audit_logging_in_sync_log(self):
        self._insert_test_record("rec_mandi_stale", "mandi_prices", days_ago=5)

        res = run_stale_check(
            db_path=self.db_path,
            sources_file=self.sources_yaml_path,
            output_csv=self.csv_path,
            mark=True,
            as_of=self.now,
            log_sync=True
        )

        log_id = res["log_id"]
        self.assertGreater(log_id, 0)

        with self.data_layer.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM sync_log WHERE id = ?", (log_id,))
            log_row = cur.fetchone()

        self.assertEqual(log_row["source_id"], "check_stale_monthly")
        self.assertEqual(log_row["result"], "success")
        self.assertEqual(log_row["records_updated"], 1)
        self.assertEqual(log_row["records_retired"], 0)
        self.assertGreaterEqual(log_row["execution_seconds"], 0.0)

    # 10. Alert Triggering When Overdue Threshold Exceeded
    def test_alerting_threshold(self):
        records = [
            {"record_id": f"rec_{i}", "type": "crop_advisory", "district": "Sehore", "title": f"Crop {i}", "days_overdue": 10.0 + i, "source_url": "https://farmer.gov.in"}
            for i in range(6)
        ]

        # Threshold 5, records 6 -> Alert triggered
        triggered = send_stale_alert(records, alert_threshold=5, email_alert=True)
        self.assertTrue(triggered)

        # Threshold 10, records 6 -> Alert NOT triggered
        not_triggered = send_stale_alert(records, alert_threshold=10, email_alert=False)
        self.assertFalse(not_triggered)

    # 11. APScheduler Monthly Scheduler Setup
    def test_apscheduler_monthly_setup(self):
        scheduler = start_monthly_scheduler(
            db_path=self.db_path,
            sources_file=self.sources_yaml_path,
            output_csv=str(self.csv_path),
            mark=True,
            blocking=False
        )
        self.assertIsNotNone(scheduler)
        jobs = scheduler.get_jobs()
        self.assertTrue(any(j.id == "monthly_stale_record_check" for j in jobs))
        scheduler.shutdown(wait=False)

    # 12. Chat Retrieval Staleness Warning Integration
    def test_chat_retrieval_staleness_warning_integration(self):
        """Verifies that marked stale records produce the required advisory in Gemini answer synthesis."""
        mock_retrieval_res = {
            "records": [
                {
                    "record_id": "scheme_kcc_old",
                    "data_type": "gov_schemes_loans",
                    "state": "Madhya Pradesh",
                    "district": "All",
                    "source_url": "https://agricoop.nic.in",
                    "last_verified": "2026-05-01",
                    "content": "Kisan Credit Card provides short term credit at subsidized interest rate.",
                    "best_score": 0.25,
                    "has_pending_change": False,
                    "is_stale": True
                }
            ],
            "formatted_context": "=== RECORD 1: scheme_kcc_old ===\nLast Verified: 2026-05-01\n⚠️ [TTL EXPIRATION NOTICE]\nKCC credit details.",
            "citations": [
                {
                    "record_id": "scheme_kcc_old",
                    "data_type": "gov_schemes_loans",
                    "source_url": "https://agricoop.nic.in",
                    "last_verified": "2026-05-01",
                    "has_pending_change": False,
                    "is_stale": True
                }
            ],
            "has_pending_updates": False,
            "has_stale_records": True
        }

        ans = generate_with_gemini(
            query="What is the interest rate for KCC loan?",
            retrieval_result=mock_retrieval_res,
            lang="en"
        )

        self.assertTrue(ans["has_stale_records"])
        self.assertIn("Time-To-Live", ans["answer"])
        self.assertIn("outdated", ans["answer"].lower())
        self.assertIn("nearest krishi vigyan kendra (kvk) or local bank branch", ans["answer"].lower())


if __name__ == "__main__":
    unittest.main()
