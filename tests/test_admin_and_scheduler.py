"""
Unit & Integration Tests for KisanSahay Scheduler, Review Workflow, and Admin API
================================================================================
Covers Prompt 4 requirements:
1. Admin authentication (X-Admin-Key, Authorization: Bearer, 401 Unauthorized)
2. GET /admin/pending (before & after diffs, wait time, metadata)
3. POST /admin/approve/<id> (publishes live, triggers Chroma vector indexing)
4. POST /admin/reject/<id> (discards change, preserves existing live record)
5. Daily Health Check alerts:
   - Sources with >= 3 consecutive failed runs
   - Records past their Time-To-Live (TTL)
   - Pending changes waiting > 3 days
6. Process lock (fcntl) ensuring non-overlapping sync runs
7. Refresh interval calculation per source in run_sync.py
"""

import os
import fcntl
import json
import tempfile
import unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient

from app import app, ADMIN_API_KEY
from src.admin import (
    get_pending_changes,
    approve_pending_change,
    reject_pending_change,
    run_daily_health_check,
    compute_json_diff,
)
from src.data_layer import KisanDataLayer, SourceRegistry, canonicalize_json
from sync_engine import SyncEngine, DeterministicFallbackEmbeddings
from run_sync import ProcessLock, is_source_due_for_refresh, parse_interval_to_timedelta


class TestAdminAuthentication(unittest.TestCase):
    """Tests authentication enforcement on admin endpoints."""

    def setUp(self):
        self.client = TestClient(app)

    def test_missing_credentials_returns_401(self):
        res = self.client.get("/admin/pending")
        self.assertEqual(res.status_code, 401)
        self.assertIn("Unauthorized", res.json().get("detail", ""))

    def test_invalid_key_returns_401(self):
        res = self.client.get("/admin/pending", headers={"X-Admin-Key": "wrong-secret-key"})
        self.assertEqual(res.status_code, 401)

    def test_invalid_bearer_token_returns_401(self):
        res = self.client.get("/admin/pending", headers={"Authorization": "Bearer invalid-token"})
        self.assertEqual(res.status_code, 401)

    def test_valid_x_admin_key_returns_200(self):
        res = self.client.get("/admin/pending", headers={"X-Admin-Key": ADMIN_API_KEY})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

    def test_valid_bearer_token_returns_200(self):
        res = self.client.get("/admin/pending", headers={"Authorization": f"Bearer {ADMIN_API_KEY}"})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))


class TestReviewManager(unittest.TestCase):
    """Tests the review manager diffing, approve, and reject workflows."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_review.db"
        self.chroma_dir = Path(self.temp_dir.name) / "test_chroma"
        self.registry = SourceRegistry(target_state="Madhya Pradesh")
        self.data_layer = KisanDataLayer(db_path=str(self.db_path), registry=self.registry)
        self.sync_engine = SyncEngine(
            db_path=str(self.db_path),
            chroma_dir=str(self.chroma_dir),
            collection_name="test_review_coll",
            target_state="Madhya Pradesh",
            embeddings=DeterministicFallbackEmbeddings(),
            data_layer=self.data_layer
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_compute_json_diff(self):
        before = {"scheme_name": "KCC Loan", "interest_rate": "7%"}
        after = {"scheme_name": "KCC Loan", "interest_rate": "4% (Prompt Repayment)"}
        diff = compute_json_diff(before, after)
        self.assertIn("--- before (live)", diff)
        self.assertIn("+++ after (pending_review)", diff)
        self.assertIn("-  \"interest_rate\": \"7%\"", diff)
        self.assertIn("+  \"interest_rate\": \"4% (Prompt Repayment)\"", diff)

    def test_approve_draft_update_publishes_live_and_indexes_chroma(self):
        # 1. Insert live base record
        initial_data = {
            "scheme_name": "PM KISAN",
            "benefits": "Rs 6000 per year",
            "eligibility": ["Small farmers"],
            "documents": ["Aadhaar"],
            "how_to_apply": "Online",
            "deadlines": "Annual",
            "portal_link": "https://pmkisan.gov.in"
        }
        rec = self.data_layer.upsert_record(
            record_id="scheme_pmkisan",
            data_type="gov_schemes_loans",
            state="Madhya Pradesh",
            district="All",
            content=initial_data,
            source_id="src_gov_schemes_loans_Madhya Pradesh",
            source_url="https://agricoop.nic.in",
            status="live"
        )
        self.assertEqual(rec["version"], 1)

        # 2. Insert draft update in pending_review
        updated_data = dict(initial_data)
        updated_data["benefits"] = "Rs 8000 per year (Updated Budget)"
        self.data_layer.upsert_record(
            record_id="scheme_pmkisan__pending",
            data_type="gov_schemes_loans",
            state="Madhya Pradesh",
            district="All",
            content=updated_data,
            source_id="src_gov_schemes_loans_Madhya Pradesh",
            source_url="https://agricoop.nic.in",
            status="pending_review"
        )

        # 3. Check pending list
        pending = get_pending_changes(self.data_layer)
        self.assertEqual(len(pending), 1)
        self.assertEqual(pending[0]["base_id"], "scheme_pmkisan")
        self.assertFalse(pending[0]["is_new_addition"])
        self.assertIn("Rs 8000 per year", pending[0]["diff"])

        # 4. Approve change
        res = approve_pending_change("scheme_pmkisan__pending", self.data_layer, self.sync_engine)
        self.assertTrue(res["success"])
        self.assertEqual(res["published_id"], "scheme_pmkisan")
        self.assertGreater(res["chunks_indexed"], 0)

        # Verify base record has been updated, version bumped, status is live
        live_rec = self.data_layer.get_record("scheme_pmkisan")
        self.assertEqual(live_rec["status"], "live")
        self.assertEqual(live_rec["version"], 2)
        self.assertEqual(live_rec["content"]["benefits"], "Rs 8000 per year (Updated Budget)")

        # Verify draft was removed
        self.assertIsNone(self.data_layer.get_record("scheme_pmkisan__pending"))

    def test_reject_draft_preserves_live_version(self):
        # 1. Insert live base record
        initial_data = {"scheme_name": "Tractor Subsidy", "benefits": "50% off"}
        self.data_layer.upsert_record(
            record_id="scheme_tractor",
            data_type="gov_schemes_loans",
            state="Madhya Pradesh",
            district="All",
            content=initial_data,
            source_id="src_gov_schemes_loans_Madhya Pradesh",
            source_url="https://agricoop.nic.in",
            status="live"
        )

        # 2. Insert draft update in pending_review
        draft_data = {"scheme_name": "Tractor Subsidy", "benefits": "90% off (unverified claim)"}
        self.data_layer.upsert_record(
            record_id="scheme_tractor__pending",
            data_type="gov_schemes_loans",
            state="Madhya Pradesh",
            district="All",
            content=draft_data,
            source_id="src_gov_schemes_loans_Madhya Pradesh",
            source_url="https://agricoop.nic.in",
            status="pending_review"
        )

        # 3. Reject pending change
        res = reject_pending_change("scheme_tractor__pending", self.data_layer)
        self.assertTrue(res["success"])

        # 4. Draft is removed
        self.assertIsNone(self.data_layer.get_record("scheme_tractor__pending"))

        # 5. Live record remains intact with original benefits
        live_rec = self.data_layer.get_record("scheme_tractor")
        self.assertEqual(live_rec["status"], "live")
        self.assertEqual(live_rec["content"]["benefits"], "50% off")


class TestDailyHealthCheck(unittest.TestCase):
    """Tests daily health check alerts on consecutive failures, TTL expiration, and overdue reviews."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_health.db"
        self.registry = SourceRegistry(target_state="Madhya Pradesh")
        self.data_layer = KisanDataLayer(db_path=str(self.db_path), registry=self.registry)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_consecutive_failures_alert(self):
        source_id = "src_mandi_prices_Madhya Pradesh"
        now = datetime.now(timezone.utc)

        # Record 3 consecutive failures in sync_log
        for i in range(3):
            t_iso = (now - timedelta(hours=i + 1)).isoformat()
            with self.data_layer.get_connection() as conn:
                conn.cursor().execute(
                    """
                    INSERT INTO sync_log (source_id, started_at, completed_at, result, records_added, records_updated, records_retired, error, execution_seconds)
                    VALUES (?, ?, ?, 'failure', 0, 0, 0, ?, 1.5)
                    """,
                    (source_id, t_iso, t_iso, f"Connection timed out error #{i+1}")
                )
                conn.commit()

        report = run_daily_health_check(self.data_layer, self.registry, max_consecutive_failures=3)
        self.assertEqual(report["status"], "UNHEALTHY")
        consec_alerts = [a for a in report["alerts"] if a["type"] == "CONSECUTIVE_SOURCE_FAILURES"]
        self.assertEqual(len(consec_alerts), 1)
        self.assertEqual(consec_alerts[0]["source_id"], source_id)
        self.assertEqual(consec_alerts[0]["consecutive_failures"], 3)

    def test_ttl_expiration_alert(self):
        # Insert a mandi price record verified 400 days ago (TTL is 30 days)
        old_time = (datetime.now(timezone.utc) - timedelta(days=400)).isoformat()
        with self.data_layer.get_connection() as conn:
            conn.cursor().execute(
                """
                INSERT INTO records (id, type, state, district, content_json, content_hash, source_id, source_url, status, version, created_at, updated_at, last_verified, expires_at, is_stale)
                VALUES ('mandi_old_1', 'mandi_prices', 'Madhya Pradesh', 'Bhopal', '{"crop": "Wheat"}', 'hash1', 'src_mandi', 'https://mandi', 'live', 1, ?, ?, ?, ?, 1)
                """,
                (old_time, old_time, old_time, old_time)
            )
            conn.commit()

        report = run_daily_health_check(self.data_layer, self.registry)
        ttl_alerts = [a for a in report["alerts"] if a["type"] == "RECORDS_PASSED_TTL"]
        self.assertEqual(len(ttl_alerts), 1)
        self.assertGreater(ttl_alerts[0]["stale_count"], 0)

    def test_overdue_pending_review_alert(self):
        # Insert a pending review record that has waited 5 days (> 3 days threshold)
        waited_time = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
        with self.data_layer.get_connection() as conn:
            conn.cursor().execute(
                """
                INSERT INTO records (id, type, state, district, content_json, content_hash, source_id, source_url, status, version, created_at, updated_at, last_verified, expires_at, is_stale)
                VALUES ('scheme_overdue', 'gov_schemes_loans', 'Madhya Pradesh', 'All', '{"name": "Old Draft"}', 'hash2', 'src_schemes', 'https://scheme', 'pending_review', 1, ?, ?, ?, ?, 0)
                """,
                (waited_time, waited_time, waited_time, waited_time)
            )
            conn.commit()

        report = run_daily_health_check(self.data_layer, self.registry, max_pending_days=3.0)
        overdue_alerts = [a for a in report["alerts"] if a["type"] == "OVERDUE_PENDING_REVIEWS"]
        self.assertEqual(len(overdue_alerts), 1)
        self.assertIn("scheme_overdue", overdue_alerts[0]["overdue_ids"])


class TestSchedulerAndLock(unittest.TestCase):
    """Tests process lock and refresh interval calculations in run_sync.py."""

    def test_process_lock_mutual_exclusion(self):
        lock_file = Path(tempfile.gettempdir()) / "test_kisansahay.lock"
        if lock_file.exists():
            lock_file.unlink()

        # Acquire lock in first instance
        with ProcessLock(lock_file):
            # Second attempt to open and flock with LOCK_NB should fail immediately
            with open(lock_file, "w") as fp2:
                with self.assertRaises(BlockingIOError):
                    fcntl.flock(fp2.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)

    def test_interval_parsing(self):
        self.assertEqual(parse_interval_to_timedelta("24h"), timedelta(hours=24))
        self.assertEqual(parse_interval_to_timedelta("72h"), timedelta(hours=72))
        self.assertEqual(parse_interval_to_timedelta("14d"), timedelta(days=14))
        self.assertEqual(parse_interval_to_timedelta("180d"), timedelta(days=180))

    def test_is_source_due_for_refresh(self):
        with tempfile.TemporaryDirectory() as tmp:
            registry = SourceRegistry(target_state="Madhya Pradesh")
            dl = KisanDataLayer(db_path=str(Path(tmp) / "sched.db"), registry=registry)
            source_cfg = {"id": "test_src", "refresh_interval": "24h"}
            now = datetime.now(timezone.utc)

            # Never synced before -> True
            is_due, _ = is_source_due_for_refresh(source_cfg, dl, now, force=False)
            self.assertTrue(is_due)

            # Synced 2 hours ago -> False (< 24h)
            recent_t = (now - timedelta(hours=2)).isoformat()
            with dl.get_connection() as conn:
                conn.cursor().execute(
                    """
                    INSERT INTO sync_log (source_id, started_at, completed_at, result, records_added, records_updated, records_retired, execution_seconds)
                    VALUES (?, ?, ?, 'success', 10, 0, 0, 1.0)
                    """,
                    (source_cfg["id"], recent_t, recent_t)
                )
                conn.commit()
            is_due, _ = is_source_due_for_refresh(source_cfg, dl, now, force=False)
            self.assertFalse(is_due)

            # Force flag overrides interval -> True
            is_due, _ = is_source_due_for_refresh(source_cfg, dl, now, force=True)
            self.assertTrue(is_due)

            # Synced 26 hours ago -> True (> 24h)
            old_t = (now - timedelta(hours=26)).isoformat()
            with dl.get_connection() as conn:
                conn.cursor().execute(
                    """
                    INSERT INTO sync_log (source_id, started_at, completed_at, result, records_added, records_updated, records_retired, execution_seconds)
                    VALUES (?, ?, ?, 'success', 0, 0, 0, 1.0)
                    """,
                    (source_cfg["id"], old_t, old_t)
                )
                conn.commit()
            is_due, _ = is_source_due_for_refresh(source_cfg, dl, now, force=False)
            self.assertTrue(is_due)


if __name__ == "__main__":
    unittest.main()
