"""
KisanSahay Admin Review Manager & Health Alerting Engine
========================================================
Handles:
- Generation of before & after diffs for pending review records
- Publishing approved records and triggering ChromaDB vector indexing
- Discarding rejected changes while keeping live records intact
- Daily health checks alerting on:
  1. Sources failing for several runs in a row (>= 3 consecutive failures)
  2. Records that have passed their Time-To-Live (TTL expiration)
  3. Pending changes that have waited for more than a few days (> 3 days)
"""

import os
import json
import difflib
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("AdminReview")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] [AdminReview] %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def compute_json_diff(before_dict: Optional[Dict[str, Any]], after_dict: Dict[str, Any]) -> str:
    """Generates a readable unified diff between before and after JSON representations."""
    before_lines = json.dumps(before_dict or {}, indent=2, sort_keys=True).splitlines(keepends=True)
    after_lines = json.dumps(after_dict, indent=2, sort_keys=True).splitlines(keepends=True)

    diff = difflib.unified_diff(
        before_lines,
        after_lines,
        fromfile="before (live)",
        tofile="after (pending_review)",
        lineterm=""
    )
    return "\n".join(diff)


def get_pending_changes(data_layer: Any) -> List[Dict[str, Any]]:
    """
    Retrieves all records awaiting review with before/after diffs and wait duration.
    """
    now = datetime.now(timezone.utc)
    pending_list = []

    with data_layer.get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM records WHERE status = 'pending_review' ORDER BY last_verified ASC")
        rows = [dict(r) for r in cur.fetchall()]

    for p in rows:
        rec_id = p["id"]
        # If it's a draft like scheme_kcc__pending, the base ID is scheme_kcc
        base_id = rec_id[:-9] if rec_id.endswith("__pending") else rec_id

        # Look up existing live version if present
        live_rec = data_layer.get_record(base_id)
        before_content = None
        is_new_addition = True

        if live_rec and live_rec["status"] == "live":
            before_content = live_rec.get("content")
            is_new_addition = False

        # Parse pending content
        try:
            after_content = json.loads(p["content_json"]) if isinstance(p["content_json"], str) else p["content_json"]
        except Exception:
            after_content = {"raw": p["content_json"]}

        diff_str = compute_json_diff(before_content, after_content)

        # Calculate how long this change has been waiting in review
        try:
            verified_dt = datetime.fromisoformat(p["last_verified"])
            if verified_dt.tzinfo is None:
                verified_dt = verified_dt.replace(tzinfo=timezone.utc)
            waited_days = max(0.0, (now - verified_dt).total_seconds() / 86400.0)
        except Exception:
            waited_days = 0.0

        pending_list.append({
            "id": rec_id,
            "base_id": base_id,
            "is_new_addition": is_new_addition,
            "data_type": p["type"],
            "state": p["state"],
            "district": p.get("district") or "All",
            "source_id": p["source_id"],
            "source_url": p["source_url"],
            "version": p["version"],
            "last_verified": p["last_verified"],
            "waited_days": round(waited_days, 1),
            "before": before_content,
            "after": after_content,
            "diff": diff_str
        })

    return pending_list


def approve_pending_change(
    record_id: str,
    data_layer: Any,
    sync_engine: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Approves and publishes a pending change:
    1. If it's a draft (e.g. scheme_kcc__pending), copies content to base record (scheme_kcc),
       increments version, sets status='live', and removes the draft.
    2. If it's a brand new record, updates status to 'live'.
    3. Triggers ChromaDB vector indexing for the newly published live record.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    pending_rec = data_layer.get_record(record_id)

    if not pending_rec or pending_rec["status"] != "pending_review":
        raise ValueError(f"Record '{record_id}' is not in pending_review status.")

    base_id = record_id[:-9] if record_id.endswith("__pending") else record_id
    content_raw = pending_rec["content"]
    content_json = pending_rec["content_json"]
    content_hash = pending_rec["content_hash"]
    dtype = pending_rec["type"]
    state = pending_rec["state"]
    dist = pending_rec.get("district")
    source_id = pending_rec["source_id"]
    source_url = pending_rec["source_url"]

    with data_layer.get_connection() as conn:
        cur = conn.cursor()
        if record_id.endswith("__pending"):
            # Update base record with the approved pending content
            cur.execute("SELECT version FROM records WHERE id = ?", (base_id,))
            live_row = cur.fetchone()
            new_version = (live_row["version"] + 1) if live_row else pending_rec["version"]

            cur.execute(
                """
                UPDATE records
                SET content_json = ?,
                    content_hash = ?,
                    version = ?,
                    status = 'live',
                    updated_at = ?,
                    last_verified = ?,
                    is_stale = 0
                WHERE id = ?
                """,
                (content_json, content_hash, new_version, now_iso, now_iso, base_id)
            )
            # Remove the pending draft
            cur.execute("DELETE FROM records WHERE id = ?", (record_id,))
            target_published_id = base_id
        else:
            # Standalone pending record goes live
            cur.execute(
                """
                UPDATE records
                SET status = 'live',
                    updated_at = ?,
                    last_verified = ?,
                    is_stale = 0
                WHERE id = ?
                """,
                (now_iso, now_iso, record_id)
            )
            target_published_id = record_id

        conn.commit()

    logger.info("Approved and published record: %s (Status: live)", target_published_id)

    # Trigger ChromaDB vector indexing
    chunks_indexed = 0
    if sync_engine is not None:
        published_rec = data_layer.get_record(target_published_id)
        if published_rec:
            chunks_indexed = sync_engine.update_chroma_for_record(published_rec)
            logger.info("ChromaDB vector indexed for %s (%d chunks)", target_published_id, chunks_indexed)

    return {
        "success": True,
        "message": f"Record '{target_published_id}' approved and published live.",
        "published_id": target_published_id,
        "chunks_indexed": chunks_indexed
    }


def reject_pending_change(record_id: str, data_layer: Any) -> Dict[str, Any]:
    """
    Rejects and discards a pending change:
    - If draft (__pending), deletes the draft while preserving the live version.
    - If standalone new record, marks status='retired'.
    """
    pending_rec = data_layer.get_record(record_id)
    if not pending_rec or pending_rec["status"] != "pending_review":
        raise ValueError(f"Record '{record_id}' is not in pending_review status.")

    with data_layer.get_connection() as conn:
        cur = conn.cursor()
        if record_id.endswith("__pending"):
            cur.execute("DELETE FROM records WHERE id = ?", (record_id,))
        else:
            now_iso = datetime.now(timezone.utc).isoformat()
            cur.execute("UPDATE records SET status = 'retired', updated_at = ? WHERE id = ?", (now_iso, record_id))
        conn.commit()

    logger.info("Rejected and discarded pending change: %s", record_id)
    return {
        "success": True,
        "message": f"Pending change for '{record_id}' was discarded.",
        "rejected_id": record_id
    }


# ─────────────────────────────────────────────────────────────────────────────
# Daily Health Check & Alerting Engine
# -------------------------------------------------------------------------

def run_daily_health_check(
    data_layer: Any,
    registry: Any,
    max_consecutive_failures: int = 3,
    max_pending_days: float = 3.0,
    email_alert: bool = False
) -> Dict[str, Any]:
    """
    Evaluates health telemetry and raises alerts:
    1. Sources with >= 3 consecutive failed runs in sync_log
    2. Stale records that have passed their Time-To-Live
    3. Pending changes that have waited for > 3 days
    """
    now = datetime.now(timezone.utc)
    alerts: List[Dict[str, Any]] = []

    # 1. Consecutive Failure Check per Source
    with data_layer.get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT source_id, result, started_at, error
            FROM sync_log
            ORDER BY source_id, id DESC
            """
        )
        logs = [dict(r) for r in cur.fetchall()]

    logs_by_source: Dict[str, List[Dict[str, Any]]] = {}
    for entry in logs:
        sid = entry["source_id"]
        logs_by_source.setdefault(sid, []).append(entry)

    for sid, source_logs in logs_by_source.items():
        # Check consecutive failures from the top
        consecutive_failures = 0
        latest_error = None
        for log_entry in source_logs:
            if log_entry["result"] == "failure":
                consecutive_failures += 1
                if not latest_error:
                    latest_error = log_entry.get("error")
            else:
                break

        if consecutive_failures >= max_consecutive_failures:
            alert = {
                "type": "CONSECUTIVE_SOURCE_FAILURES",
                "severity": "CRITICAL",
                "source_id": sid,
                "consecutive_failures": consecutive_failures,
                "latest_error": latest_error or "Unknown error",
                "message": f"Source '{sid}' has failed {consecutive_failures} consecutive sync runs."
            }
            alerts.append(alert)
            logger.critical("🚨 HEALTH ALERT: %s", alert["message"])

    # 2. TTL Stale Records Check
    staleness_report = data_layer.flag_stale_records(as_of=now)
    total_stale = staleness_report.get("total_stale_active", 0)

    if total_stale > 0:
        alert = {
            "type": "RECORDS_PASSED_TTL",
            "severity": "WARNING",
            "stale_count": total_stale,
            "message": f"{total_stale} agricultural record(s) have passed their Time-To-Live and require re-harvesting."
        }
        alerts.append(alert)
        logger.warning("⚠️ HEALTH ALERT: %s", alert["message"])

    # 3. Pending Review Wait Duration Check (> 3 days)
    pending_changes = get_pending_changes(data_layer)
    overdue_pending = [p for p in pending_changes if p["waited_days"] >= max_pending_days]

    if overdue_pending:
        alert = {
            "type": "OVERDUE_PENDING_REVIEWS",
            "severity": "WARNING",
            "count": len(overdue_pending),
            "overdue_ids": [p["id"] for p in overdue_pending],
            "message": f"{len(overdue_pending)} pending change(s) have been waiting in review for over {max_pending_days} days without human decision."
        }
        alerts.append(alert)
        logger.warning("⚠️ HEALTH ALERT: %s", alert["message"])

    # Email simulation/dispatch
    if email_alert and alerts:
        send_alert_email(alerts)

    return {
        "timestamp": now.isoformat(),
        "status": "UNHEALTHY" if any(a["severity"] == "CRITICAL" for a in alerts) else ("WARNING" if alerts else "HEALTHY"),
        "total_alerts": len(alerts),
        "alerts": alerts,
        "staleness_summary": staleness_report,
        "pending_count": len(pending_changes)
    }


def send_alert_email(alerts: List[Dict[str, Any]], recipient: str = "alerts@kisansahay.org") -> None:
    """Dispatches or logs alert email notifications for site administrators."""
    subject = f"[KisanSahay Alert] {len(alerts)} health check issue(s) detected"
    body_lines = [f"KisanSahay Health Check Alert Report — {datetime.now(timezone.utc).isoformat()}", ""]
    for a in alerts:
        body_lines.append(f"[{a['severity']}] {a['type']}: {a['message']}")
    email_text = "\n".join(body_lines)
    logger.info("📧 Dispatched health alert notification to %s:\n%s", recipient, email_text)
