#!/usr/bin/env python3
"""
KisanSahay Cron-Friendly Sync Scheduler (run_sync.py)
====================================================
Scheduled task runner for automated agricultural data synchronization:
- Uses an OS-level file lock (fcntl) to ensure two sync instances never overlap.
- Runs each source at its own refresh interval (e.g. 24h, 72h, 14d, 30d, 90d, 180d).
- Traps and isolates all adapter failures so sync issues never impact chat availability.
- Performs daily health checks alerting on:
  1. Sources failing >= 3 runs in a row
  2. Records that have passed their Time-To-Live
  3. Pending reviews waiting > 3 days

Cron Examples:
    # Run hourly to check which sources are due for refresh:
    0 * * * * cd /Users/veersingh1/OWN\ KISANSAHAY && .venv/bin/python run_sync.py >> /tmp/kisansahay_sync.log 2>&1

    # Force immediate sync of all sources:
    python run_sync.py --force
"""

import os
import sys
import time
import fcntl
import logging
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from sync_engine import SyncEngine
from src.admin.review_manager import run_daily_health_check
from src.data_layer import get_utc_now, parse_iso_utc

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Scheduler] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("Scheduler")

DEFAULT_LOCK_FILE = Path("/tmp/kisansahay_sync.lock")


def parse_interval_to_timedelta(interval_str: str) -> timedelta:
    """Parses refresh interval strings like '24h', '72h', '14d', '30d', '180d' into timedelta."""
    s = interval_str.strip().lower()
    if s.endswith("h"):
        hours = float(s[:-1])
        return timedelta(hours=hours)
    elif s.endswith("d"):
        days = float(s[:-1])
        return timedelta(days=days)
    elif s.endswith("m"):
        minutes = float(s[:-1])
        return timedelta(minutes=minutes)
    # Default to 24 hours
    return timedelta(hours=24)


class ProcessLock:
    """Exclusive process lock using OS fcntl to guarantee non-overlapping runs."""

    def __init__(self, lock_file: Path = DEFAULT_LOCK_FILE):
        self.lock_file = lock_file
        self.fp = None

    def __enter__(self):
        try:
            self.lock_file.parent.mkdir(parents=True, exist_ok=True)
            self.fp = open(self.lock_file, "w")
            # Try acquiring exclusive non-blocking lock
            fcntl.flock(self.fp.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.fp.write(f"PID: {os.getpid()}\nStarted: {datetime.now(timezone.utc).isoformat()}\n")
            self.fp.flush()
            return self
        except (BlockingIOError, IOError):
            logger.warning("Another sync process is already active (Lock: %s). Exiting gracefully.", self.lock_file)
            sys.exit(0)

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.fp:
            try:
                fcntl.flock(self.fp.fileno(), fcntl.LOCK_UN)
                self.fp.close()
            except Exception:
                pass


def is_source_due_for_refresh(
    source_cfg: Dict[str, Any],
    data_layer: Any,
    now: datetime,
    force: bool = False
) -> Tuple[bool, str]:
    """
    Checks sync_log to determine if source has elapsed past its refresh_interval.
    Returns (is_due, reason_message).
    """
    if force:
        return True, "Forced execution flag active"

    source_id = source_cfg["id"]
    interval_str = source_cfg.get("refresh_interval", "24h")
    interval_td = parse_interval_to_timedelta(interval_str)

    with data_layer.get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT started_at, result
            FROM sync_log
            WHERE source_id = ? AND result = 'success'
            ORDER BY id DESC LIMIT 1
            """,
            (source_id,)
        )
        row = cur.fetchone()

    if not row:
        return True, "Never successfully synchronized before"

    last_started = parse_iso_utc(row["started_at"])
    elapsed = now - last_started

    if elapsed >= interval_td:
        return True, f"Due: {elapsed.total_seconds()/3600:.1f}h elapsed >= {interval_td.total_seconds()/3600:.1f}h interval"
    else:
        return False, f"Not due yet: {elapsed.total_seconds()/3600:.1f}h elapsed < {interval_td.total_seconds()/3600:.1f}h interval"


def run_scheduled_sync(
    state: str = "Madhya Pradesh",
    force: bool = False,
    fixtures: bool = False,
    email_alert: bool = False,
    health_check_only: bool = False
) -> Dict[str, Any]:
    """
    Main orchestration routine executed by cron or CLI.
    Runs locked, selective sync and health check.
    """
    engine = SyncEngine(target_state=state)
    now = get_utc_now()

    if health_check_only:
        logger.info("Executing daily health check evaluation only...")
        health_rep = run_daily_health_check(engine.data_layer, engine.registry, email_alert=email_alert)
        return {"health_check": health_rep}

    sources_to_run = []
    logger.info("Checking schedule for %d sources (State: '%s')...", len(engine.registry.sources), state)

    for cfg in engine.registry.sources:
        is_due, reason = is_source_due_for_refresh(cfg, engine.data_layer, now, force=force)
        if is_due:
            logger.info(" ✓ Source '%s' is DUE (%s)", cfg["id"], reason)
            sources_to_run.append(cfg)
        else:
            logger.info(" - Source '%s' SKIPPED (%s)", cfg["id"], reason)

    results = []
    fixture_map = {
        "kvk_directory": "sample_kvk_directory.html",
        "kvk_training_calendar": "sample_kvk_calendar.html",
        "crop_advisory": "sample_crop_advisory.rss",
        "gov_schemes_loans": "sample_gov_schemes.html",
        "mandi_prices": "sample_mandi_prices.json",
        "imd_weather_advisory": "sample_imd_agromet.xml",
    }
    fixtures_dir = Path(__file__).resolve().parent / "tests" / "fixtures"

    start_time = time.time()
    for cfg in sources_to_run:
        data_override = None
        if fixtures:
            dtype = cfg.get("data_type")
            fname = fixture_map.get(dtype)
            if fname and (fixtures_dir / fname).exists():
                with open(fixtures_dir / fname, "r", encoding="utf-8") as f:
                    data_override = f.read()

        try:
            res = engine.sync_source(cfg, data_override=data_override)
            results.append(res)
        except Exception as e:
            logger.error("Unexpected failure in sync_source for %s: %s", cfg["id"], e)
            results.append({
                "source_id": cfg["id"],
                "data_type": cfg.get("data_type", "unknown"),
                "result": "failure",
                "added": 0,
                "updated": 0,
                "retired": 0,
                "chroma_chunks": 0,
                "error": str(e)
            })

    total_duration = time.time() - start_time
    if results:
        engine.print_summary(results, total_duration)
    else:
        logger.info("No sources were due for synchronization in this scheduled cycle.")

    # Execute Daily Health Check & Alerting at the end of each run
    logger.info("Running daily system health check...")
    health_rep = run_daily_health_check(engine.data_layer, engine.registry, email_alert=email_alert)

    return {
        "sync_results": results,
        "health_check": health_rep,
        "duration_seconds": total_duration
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="KisanSahay Automated Sync Scheduler (Cron Friendly)")
    parser.add_argument("--state", default="Madhya Pradesh", help="Target Indian State")
    parser.add_argument("--force", action="store_true", help="Force sync all sources regardless of interval")
    parser.add_argument("--fixtures", action="store_true", help="Run with mock fixtures (for tests / offline)")
    parser.add_argument("--health-check-only", action="store_true", help="Run health check and exit")
    parser.add_argument("--email-alert", action="store_true", help="Simulate email dispatch on critical alerts")
    args = parser.parse_args()

    # Enforce non-overlapping execution lock
    with ProcessLock():
        run_scheduled_sync(
            state=args.state,
            force=args.force,
            fixtures=args.fixtures,
            email_alert=args.email_alert,
            health_check_only=args.health_check_only
        )


if __name__ == "__main__":
    main()
