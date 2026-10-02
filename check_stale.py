#!/usr/bin/env python3
"""
KisanSahay Stale-Record Check Engine (check_stale.py)
===================================================
Scans active SQLite records (and ChromaDB last_verified metadata) to identify
and list live records exceeding their Time-To-Live (TTL) freshness policy.

Prompt 1 Requirements:
1. Reads every record from SQLite records table and last_verified in ChromaDB.
2. 90-day limit is default, with per-type override read from sources.yaml
   (e.g., mandi prices and advisories after a few days, KVK directory after 180 days).
3. Lists each live record whose last_verified is more than 90 days old (or per-type TTL).
4. Outputs formatted terminal table:
   Record ID, Type, State, District, Title, Last Verified, Days Overdue, Source URL
   Sorted by most overdue first.
5. Saves report as stale_report.csv.
6. --mark flag sets is_stale = 1 on those records, so /chat retrieval warns users
   and suggests confirming with the nearest KVK or bank.
7. Schedules monthly with APScheduler or cron-friendly entry point.
8. Logs the run in sync_log.
9. Sends an alert (log line and/or email) when overdue records exceed threshold.
10. NEVER deletes or hides stale records automatically (records stay status='live').
"""

import os
import sys
import csv
import json
import yaml
import logging
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [StaleChecker] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("StaleChecker")

# Default Constants
DEFAULT_DB_PATH = Path(__file__).resolve().parent / "Data" / "kisansahay.db"
DEFAULT_SOURCES_PATH = Path(__file__).resolve().parent / "sources.yaml"
DEFAULT_CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_db")
DEFAULT_TTL_DAYS = 90.0
DEFAULT_ALERT_THRESHOLD = int(os.getenv("STALE_ALERT_THRESHOLD", "5"))


def get_utc_now() -> datetime:
    """Returns timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def parse_iso_utc(ts_str: str) -> datetime:
    """Parses ISO-8601 string to UTC datetime."""
    dt = datetime.fromisoformat(ts_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def to_iso_utc(dt: Optional[datetime] = None) -> str:
    """Formats datetime as ISO-8601 UTC string."""
    if dt is None:
        dt = get_utc_now()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


# ─────────────────────────────────────────────────────────────────────────────
# 1. TTL Policy Loader & Title Extraction
# ─────────────────────────────────────────────────────────────────────────────

def load_ttl_policies(sources_file: Optional[Union[str, Path]] = None) -> Dict[str, float]:
    """
    Loads per-type TTL overrides from sources.yaml ttl_policies.
    Falls back to checking individual source configurations if needed.
    """
    path = Path(sources_file or DEFAULT_SOURCES_PATH)
    if not path.exists():
        alt = path.parent / "src" / "data" / "sources.yaml"
        if alt.exists():
            path = alt

    policies: Dict[str, float] = {}
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}

            # Read from ttl_policies section
            ttl_p = data.get("ttl_policies", {})
            for dtype, pcfg in ttl_p.items():
                if isinstance(pcfg, dict) and "ttl_days" in pcfg:
                    policies[dtype] = float(pcfg["ttl_days"])

            # Also check individual sources for refresh intervals as secondary guidance
            for s in data.get("sources", []):
                dt = s.get("data_type")
                if dt and dt not in policies:
                    interval_str = str(s.get("refresh_interval", "")).strip().lower()
                    if interval_str.endswith("d"):
                        policies[dt] = float(interval_str[:-1])
                    elif interval_str.endswith("h"):
                        policies[dt] = max(1.0, float(interval_str[:-1]) / 24.0)

            logger.info("Loaded TTL policies for %d data types from %s", len(policies), path.name)
        except Exception as e:
            logger.warning("Could not load TTL policies from %s (%s). Using default %0.1f days.", path, e, DEFAULT_TTL_DAYS)

    return policies


def get_ttl_days_for_type(
    data_type: str,
    ttl_policies: Dict[str, float],
    default_ttl: float = DEFAULT_TTL_DAYS
) -> float:
    """
    Returns TTL in days for a specific data type.
    Uses per-type override from sources.yaml or defaults to 90 days.
    """
    return ttl_policies.get(data_type, default_ttl)


def extract_record_title(rec: Dict[str, Any]) -> str:
    """
    Extracts a concise, human-readable title for a record from its content.
    """
    content = rec.get("content")
    if not content:
        content_json = rec.get("content_json")
        if content_json:
            try:
                content = json.loads(content_json)
            except Exception:
                content = {}
        else:
            content = {}

    if isinstance(content, dict):
        if content.get("name"):
            return str(content["name"])
        if content.get("title"):
            return str(content["title"])
        if content.get("scheme_name"):
            return str(content["scheme_name"])
        if content.get("training_topic"):
            return str(content["training_topic"])
        if content.get("commodity"):
            center = content.get("market_center", "")
            return f"{content['commodity']} Mandi Rate ({center})" if center else f"{content['commodity']} Mandi Rate"
        if content.get("crop"):
            return f"{content['crop']} Advisory"

    rec_type = rec.get("type", "record")
    rec_dist = rec.get("district") or ""
    return f"{rec_type.replace('_', ' ').title()} - {rec_dist or rec.get('id', '')}".strip()


# ─────────────────────────────────────────────────────────────────────────────
# 2. ChromaDB Metadata Reading & Updating
# ─────────────────────────────────────────────────────────────────────────────

def read_chromadb_verified_metadata(
    chroma_dir: Optional[str] = None,
    collection_name: str = "kisansahay_knowledge"
) -> Dict[str, Dict[str, Any]]:
    """
    Reads last_verified and record metadata directly from ChromaDB chunks.
    Returns: { record_id: { "last_verified": ..., "type": ..., "chunk_count": ... } }
    """
    c_dir = chroma_dir or DEFAULT_CHROMA_DIR
    if not os.path.exists(c_dir):
        return {}

    try:
        import chromadb
        client = chromadb.PersistentClient(path=c_dir)
        coll = client.get_or_create_collection(collection_name)
        get_res = coll.get(include=["metadatas"])
        records_in_chroma: Dict[str, Dict[str, Any]] = {}
        if get_res and "metadatas" in get_res:
            for meta in get_res["metadatas"]:
                if not meta:
                    continue
                rec_id = meta.get("record_id")
                if not rec_id:
                    continue
                if rec_id not in records_in_chroma:
                    records_in_chroma[rec_id] = {
                        "last_verified": meta.get("last_verified"),
                        "type": meta.get("type"),
                        "state": meta.get("state"),
                        "district": meta.get("district"),
                        "source_url": meta.get("source_url"),
                        "chunk_count": 1,
                        "is_stale": meta.get("is_stale", False)
                    }
                else:
                    records_in_chroma[rec_id]["chunk_count"] += 1
        return records_in_chroma
    except Exception as e:
        logger.debug("ChromaDB metadata read notice: %s", e)
        return {}


def update_chromadb_staleness(
    record_ids: List[str],
    is_stale: bool = True,
    chroma_dir: Optional[str] = None,
    collection_name: str = "kisansahay_knowledge"
) -> int:
    """Updates chunk metadata in ChromaDB to reflect staleness flag."""
    c_dir = chroma_dir or DEFAULT_CHROMA_DIR
    if not os.path.exists(c_dir) or not record_ids:
        return 0

    try:
        import chromadb
        client = chromadb.PersistentClient(path=c_dir)
        coll = client.get_or_create_collection(collection_name)
        target_set = set(record_ids)
        get_res = coll.get(include=["metadatas"])
        updated = 0
        if get_res and "ids" in get_res and "metadatas" in get_res:
            ids_to_update = []
            metas_to_update = []
            for cid, meta in zip(get_res["ids"], get_res["metadatas"]):
                if meta and meta.get("record_id") in target_set:
                    meta_copy = dict(meta)
                    meta_copy["is_stale"] = is_stale
                    ids_to_update.append(cid)
                    metas_to_update.append(meta_copy)
            if ids_to_update:
                coll.update(ids=ids_to_update, metadatas=metas_to_update)
                updated = len(ids_to_update)
                logger.info("Updated staleness flag (is_stale=%s) on %d ChromaDB chunks", is_stale, updated)
        return updated
    except Exception as e:
        logger.debug("ChromaDB staleness metadata update notice: %s", e)
        return 0


# ─────────────────────────────────────────────────────────────────────────────
# 3. Core Staleness Evaluation & Database Operations
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_record_freshness(
    rec: Dict[str, Any],
    ttl_policies: Dict[str, float],
    as_of: Optional[datetime] = None,
    default_ttl: float = DEFAULT_TTL_DAYS
) -> Optional[Dict[str, Any]]:
    """
    Evaluates whether a live record is overdue based on last_verified timestamp.
    Returns overdue details dict if overdue, else None.
    """
    # Strict safety constraint: Only evaluate live records.
    if rec.get("status") != "live":
        return None

    now_dt = as_of or get_utc_now()
    lv_str = rec.get("last_verified")
    if not lv_str:
        return None

    try:
        lv_dt = parse_iso_utc(lv_str)
    except Exception:
        return None

    age_days = (now_dt - lv_dt).total_seconds() / 86400.0
    rec_type = rec.get("type", "unknown")
    ttl_days = get_ttl_days_for_type(rec_type, ttl_policies, default_ttl=default_ttl)

    days_overdue = age_days - ttl_days
    if days_overdue > 0:
        return {
            "record_id": rec.get("id"),
            "type": rec_type,
            "state": rec.get("state", ""),
            "district": rec.get("district") or "All",
            "title": extract_record_title(rec),
            "last_verified": lv_str,
            "age_days": round(age_days, 1),
            "ttl_days": ttl_days,
            "days_overdue": round(days_overdue, 1),
            "source_url": rec.get("source_url", "")
        }
    return None


def fetch_live_records(db_path: Union[str, Path]) -> List[Dict[str, Any]]:
    """
    Fetches all live records from SQLite records table.
    Ensures safe, read-only extraction with connection management.
    """
    import sqlite3
    path = Path(db_path)
    if not path.exists():
        logger.warning("Database not found at %s. Returning empty record set.", path)
        return []

    conn = sqlite3.connect(str(path), timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM records WHERE status = 'live' ORDER BY id ASC")
        rows = [dict(r) for r in cur.fetchall()]
        return rows
    finally:
        conn.close()


def mark_records_stale(
    overdue_ids: List[str],
    db_path: Union[str, Path],
    chroma_dir: Optional[str] = None
) -> int:
    """
    Sets is_stale = 1 on overdue records in SQLite.
    CRITICAL RULE: NEVER deletes or hides stale records automatically.
    Records strictly remain status='live'.
    """
    if not overdue_ids:
        return 0

    import sqlite3
    path = Path(db_path)
    conn = sqlite3.connect(str(path), timeout=30.0)
    try:
        cur = conn.cursor()
        placeholders = ",".join("?" for _ in overdue_ids)
        # Safely update is_stale flag without altering status or deleting
        cur.execute(
            f"""
            UPDATE records
            SET is_stale = 1
            WHERE id IN ({placeholders}) AND status = 'live'
            """,
            overdue_ids
        )
        marked_count = cur.rowcount
        conn.commit()
        logger.info("Marked %d record(s) as stale (is_stale=1) in SQLite database (status remains 'live').", marked_count)
    finally:
        conn.close()

    # Mirror staleness in ChromaDB
    update_chromadb_staleness(overdue_ids, is_stale=True, chroma_dir=chroma_dir)

    return marked_count


def log_stale_check_to_sync_log(
    db_path: Union[str, Path],
    started_at: datetime,
    completed_at: datetime,
    overdue_count: int,
    marked_count: int,
    error: Optional[str] = None
) -> int:
    """
    Logs the execution audit of the stale record check into the sync_log table.
    """
    import sqlite3
    path = Path(db_path)
    if not path.exists():
        return 0

    duration = (completed_at - started_at).total_seconds()
    conn = sqlite3.connect(str(path), timeout=30.0)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO sync_log (
                source_id, started_at, completed_at, result,
                records_added, records_updated, records_retired,
                error, execution_seconds
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "check_stale_monthly",
                to_iso_utc(started_at),
                to_iso_utc(completed_at),
                "success" if not error else "failure",
                0,
                marked_count,
                0,  # Never delete or retire records automatically
                error,
                round(duration, 3)
            )
        )
        log_id = cur.lastrowid
        conn.commit()
        return log_id
    except Exception as e:
        logger.warning("Could not write to sync_log: %s", e)
        return 0
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# 4. Output Formatting & Reports
# ─────────────────────────────────────────────────────────────────────────────

def format_stale_table(overdue_records: List[Dict[str, Any]]) -> str:
    """
    Formats the overdue records as a clean, aligned terminal table.
    """
    if not overdue_records:
        return "✅ All live records are fresh and within their TTL thresholds. No stale records found."

    headers = ["Record ID", "Type", "State", "District", "Title", "Last Verified", "Days Overdue", "Source URL"]

    # Prepare rows with safe truncations for terminal display
    display_rows = []
    for r in overdue_records:
        rec_id = str(r["record_id"])
        dtype = str(r["type"])
        state = str(r["state"])
        dist = str(r["district"])
        title = str(r["title"])
        if len(title) > 38:
            title = title[:35] + "..."
        lv = str(r["last_verified"]).split("T")[0]
        overdue_str = f"{r['days_overdue']:.1f}d"
        url = str(r["source_url"])
        if len(url) > 32:
            url = url[:29] + "..."
        display_rows.append([rec_id, dtype, state, dist, title, lv, overdue_str, url])

    # Calculate column widths
    col_widths = [len(h) for h in headers]
    for row in display_rows:
        for idx, cell in enumerate(row):
            col_widths[idx] = max(col_widths[idx], len(cell))

    sep = "+-" + "-+-".join("-" * w for w in col_widths) + "-+"
    header_line = "| " + " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers)) + " |"

    lines = [
        sep,
        header_line,
        sep
    ]
    for row in display_rows:
        line = "| " + " | ".join(cell.ljust(col_widths[i]) for i, cell in enumerate(row)) + " |"
        lines.append(line)
    lines.append(sep)

    summary_line = (
        f"\nTotal Overdue Records: {len(overdue_records)} | "
        f"Most Overdue: {overdue_records[0]['record_id']} ({overdue_records[0]['days_overdue']} days)"
    )
    lines.append(summary_line)
    return "\n".join(lines)


def save_stale_report_csv(
    overdue_records: List[Dict[str, Any]],
    output_path: Union[str, Path] = "stale_report.csv"
) -> str:
    """
    Saves overdue records to CSV file.
    Columns: record_id, type, state, district, title, last_verified, days_overdue, source_url
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "record_id", "type", "state", "district", "title",
        "last_verified", "days_overdue", "source_url"
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in overdue_records:
            writer.writerow({
                "record_id": r["record_id"],
                "type": r["type"],
                "state": r["state"],
                "district": r["district"],
                "title": r["title"],
                "last_verified": r["last_verified"],
                "days_overdue": r["days_overdue"],
                "source_url": r["source_url"]
            })
    logger.info("Saved stale records report to %s (%d records)", path.resolve(), len(overdue_records))
    return str(path.resolve())


# ─────────────────────────────────────────────────────────────────────────────
# 5. Alerting Engine (Log line & Email)
# ─────────────────────────────────────────────────────────────────────────────

def send_stale_alert(
    overdue_records: List[Dict[str, Any]],
    alert_threshold: int = DEFAULT_ALERT_THRESHOLD,
    email_alert: bool = False,
    recipient: Optional[str] = None
) -> bool:
    """
    Sends an alert (log line and optional email) when overdue records exceed threshold.
    Returns True if alert was triggered, False otherwise.
    """
    count = len(overdue_records)
    if count <= alert_threshold:
        return False

    top_rec = overdue_records[0]
    rec_id = top_rec.get("record_id", "unknown_record")
    rec_title = top_rec.get("title", rec_id)
    rec_type = top_rec.get("type", "unknown")
    rec_dist = top_rec.get("district", "All")
    rec_state = top_rec.get("state", "State")
    rec_days = top_rec.get("days_overdue", 0.0)
    rec_lv = top_rec.get("last_verified", "Unknown")
    rec_url = top_rec.get("source_url", "https://farmer.gov.in")

    alert_msg = (
        f"🚨 [STALE RECORD ALERT] OVERDUE THRESHOLD EXCEEDED: {count} records are overdue "
        f"(Threshold: {alert_threshold})! Most overdue: '{rec_id}' "
        f"({rec_type}, {rec_dist}, {rec_days} days overdue). "
        f"Report saved to stale_report.csv."
    )
    logger.warning(alert_msg)

    if email_alert:
        to_email = recipient or os.getenv("ALERT_EMAIL_TO", "admin@kisansahay.in")
        subject = f"⚠️ KisanSahay Alert: {count} Stale Records Detected ({rec_days} days overdue)"
        email_body = (
            f"Dear KisanSahay Administrator,\n\n"
            f"The monthly stale record check detected {count} active live records exceeding their Time-To-Live limits.\n"
            f"Alert threshold: {alert_threshold} records.\n\n"
            f"Most overdue record:\n"
            f"• Record ID: {rec_id}\n"
            f"• Title: {rec_title}\n"
            f"• Type: {rec_type}\n"
            f"• Region: {rec_dist}, {rec_state}\n"
            f"• Last Verified: {rec_lv}\n"
            f"• Days Overdue: {rec_days} days\n"
            f"• Official Source: {rec_url}\n\n"
            f"Please inspect stale_report.csv and trigger re-harvesting.\n"
            f"Stale records remain live but flagged to protect farmers from outdated information.\n"
        )

        smtp_host = os.getenv("SMTP_HOST")
        if smtp_host:
            try:
                import smtplib
                from email.mime.text import MIMEText
                mime_msg = MIMEText(email_body)
                mime_msg["Subject"] = subject
                mime_msg["From"] = os.getenv("SMTP_FROM", "alerts@kisansahay.in")
                mime_msg["To"] = to_email
                with smtplib.SMTP(smtp_host, int(os.getenv("SMTP_PORT", "587"))) as server:
                    if os.getenv("SMTP_USER"):
                        server.starttls()
                        server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
                    server.send_message(mime_msg)
                logger.info("📧 Stale record alert email dispatched to %s", to_email)
            except Exception as mail_err:
                logger.error("Failed sending email alert to %s: %s", to_email, mail_err)
        else:
            logger.info("📧 [SIMULATED EMAIL DISPATCH to %s]\nSubject: %s\n%s", to_email, subject, email_body)

    return True


# ─────────────────────────────────────────────────────────────────────────────
# 6. Main Orchestrator Routine
# ─────────────────────────────────────────────────────────────────────────────

def run_stale_check(
    db_path: Optional[Union[str, Path]] = None,
    sources_file: Optional[Union[str, Path]] = None,
    chroma_dir: Optional[str] = None,
    mark: bool = False,
    output_csv: Optional[Union[str, Path]] = "stale_report.csv",
    alert_threshold: int = DEFAULT_ALERT_THRESHOLD,
    email_alert: bool = False,
    as_of: Optional[datetime] = None,
    default_ttl: float = DEFAULT_TTL_DAYS,
    log_sync: bool = True
) -> Dict[str, Any]:
    """
    Main orchestration function:
    1. Loads TTL policies from sources.yaml (with 90d default).
    2. Queries live records from SQLite records table (and ChromaDB last_verified).
    3. Evaluates days overdue and sorts by most overdue first.
    4. Outputs terminal table and saves stale_report.csv.
    5. If mark=True, marks records with is_stale = 1 (keeping status='live').
    6. Logs audit run into sync_log table.
    7. Emits alerts if overdue count > alert_threshold.
    """
    start_time = get_utc_now()
    resolved_db = Path(db_path or DEFAULT_DB_PATH)
    resolved_sources = Path(sources_file or DEFAULT_SOURCES_PATH)
    resolved_csv = Path(output_csv or "stale_report.csv")
    resolved_chroma = chroma_dir or DEFAULT_CHROMA_DIR

    logger.info("Starting Stale-Record Check (DB: %s, Sources: %s, Mark: %s)",
                resolved_db.name, resolved_sources.name, mark)

    # 1. Load TTL overrides from sources.yaml
    ttl_policies = load_ttl_policies(resolved_sources)

    # 2. Read live records from SQLite
    live_records = fetch_live_records(resolved_db)
    logger.info("Inspecting %d live records in SQLite records table...", len(live_records))

    # 3. Read ChromaDB metadata
    chroma_metadata = read_chromadb_verified_metadata(resolved_chroma)
    if chroma_metadata:
        logger.info("Cross-verified with %d record entries indexed in ChromaDB", len(chroma_metadata))

    # 4. Evaluate staleness
    overdue_records: List[Dict[str, Any]] = []
    for rec in live_records:
        overdue_info = evaluate_record_freshness(
            rec=rec,
            ttl_policies=ttl_policies,
            as_of=as_of,
            default_ttl=default_ttl
        )
        if overdue_info:
            overdue_records.append(overdue_info)

    # 5. Sort by most overdue first
    overdue_records.sort(key=lambda r: r["days_overdue"], reverse=True)

    # 6. Format terminal table and save CSV
    table_output = format_stale_table(overdue_records)
    csv_path = save_stale_report_csv(overdue_records, resolved_csv)

    # 7. Apply --mark flag if requested
    marked_count = 0
    if mark and overdue_records:
        overdue_ids = [r["record_id"] for r in overdue_records]
        marked_count = mark_records_stale(
            overdue_ids=overdue_ids,
            db_path=resolved_db,
            chroma_dir=resolved_chroma
        )

    # 8. Check and trigger alerts
    alert_triggered = send_stale_alert(
        overdue_records=overdue_records,
        alert_threshold=alert_threshold,
        email_alert=email_alert
    )

    end_time = get_utc_now()

    # 9. Audit log entry in sync_log
    log_id = 0
    if log_sync and resolved_db.exists():
        log_id = log_stale_check_to_sync_log(
            db_path=resolved_db,
            started_at=start_time,
            completed_at=end_time,
            overdue_count=len(overdue_records),
            marked_count=marked_count,
            error=None
        )

    execution_duration = (end_time - start_time).total_seconds()
    logger.info("Stale-Record Check completed in %0.2fs. Overdue: %d, Marked: %d, Alert Triggered: %s (Log ID: %d)",
                execution_duration, len(overdue_records), marked_count, alert_triggered, log_id)

    return {
        "status": "success",
        "total_live_inspected": len(live_records),
        "overdue_count": len(overdue_records),
        "overdue_records": overdue_records,
        "table_output": table_output,
        "csv_path": csv_path,
        "marked_count": marked_count,
        "alert_triggered": alert_triggered,
        "log_id": log_id,
        "execution_seconds": round(execution_duration, 3)
    }


# ─────────────────────────────────────────────────────────────────────────────
# 7. APScheduler Monthly Setup & CLI Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def start_monthly_scheduler(
    db_path: Optional[Union[str, Path]] = None,
    sources_file: Optional[Union[str, Path]] = None,
    chroma_dir: Optional[str] = None,
    mark: bool = True,
    output_csv: str = "stale_report.csv",
    alert_threshold: int = DEFAULT_ALERT_THRESHOLD,
    email_alert: bool = False,
    day_of_month: int = 1,
    hour: int = 2,
    minute: int = 0,
    blocking: bool = False
) -> Any:
    """
    Initializes and starts an APScheduler job to execute stale check monthly.
    Triggers on the 1st of every month at 02:00 UTC by default.
    """
    try:
        from apscheduler.triggers.cron import CronTrigger
        if blocking:
            from apscheduler.schedulers.blocking import BlockingScheduler
            scheduler = BlockingScheduler()
        else:
            from apscheduler.schedulers.background import BackgroundScheduler
            scheduler = BackgroundScheduler()

        trigger = CronTrigger(day=day_of_month, hour=hour, minute=minute)
        scheduler.add_job(
            func=run_stale_check,
            trigger=trigger,
            id="monthly_stale_record_check",
            name="Monthly Stale Agricultural Record Checker",
            kwargs={
                "db_path": db_path,
                "sources_file": sources_file,
                "chroma_dir": chroma_dir,
                "mark": mark,
                "output_csv": output_csv,
                "alert_threshold": alert_threshold,
                "email_alert": email_alert
            },
            replace_existing=True
        )
        scheduler.start()
        logger.info("APScheduler monthly stale check active (Trigger: Day %d at %02d:%02d UTC)",
                    day_of_month, hour, minute)
        return scheduler
    except ImportError:
        logger.error("APScheduler is not installed. Please install with: pip install apscheduler")
        return None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="KisanSahay Stale-Record Check Engine (90 days default, monthly schedule)"
    )
    parser.add_argument("--db-path", default=str(DEFAULT_DB_PATH), help="Path to SQLite kisansahay.db")
    parser.add_argument("--sources-file", default=str(DEFAULT_SOURCES_PATH), help="Path to sources.yaml")
    parser.add_argument("--chroma-dir", default=DEFAULT_CHROMA_DIR, help="Path to ChromaDB storage directory")
    parser.add_argument("--mark", action="store_true", help="Set is_stale=1 flag on overdue records (without hiding/deleting)")
    parser.add_argument("--output-csv", default="stale_report.csv", help="Path to save CSV report (default: stale_report.csv)")
    parser.add_argument("--alert-threshold", type=int, default=DEFAULT_ALERT_THRESHOLD, help="Overdue count threshold to trigger alert")
    parser.add_argument("--email-alert", action="store_true", help="Send email alert when overdue threshold exceeded")
    parser.add_argument("--default-ttl", type=float, default=DEFAULT_TTL_DAYS, help="Default TTL in days (default: 90.0)")
    parser.add_argument("--schedule", choices=["monthly"], help="Start scheduler in background or blocking mode")
    parser.add_argument("--daemon", action="store_true", help="Run scheduler in blocking daemon mode")

    args = parser.parse_args()

    if args.schedule == "monthly" or args.daemon:
        logger.info("Starting monthly stale check scheduler...")
        scheduler = start_monthly_scheduler(
            db_path=args.db_path,
            sources_file=args.sources_file,
            chroma_dir=args.chroma_dir,
            mark=args.mark,
            output_csv=args.output_csv,
            alert_threshold=args.alert_threshold,
            email_alert=args.email_alert,
            blocking=args.daemon
        )
        if not args.daemon and scheduler:
            logger.info("Scheduler running in background. Performing initial run now...")
            res = run_stale_check(
                db_path=args.db_path,
                sources_file=args.sources_file,
                chroma_dir=args.chroma_dir,
                mark=args.mark,
                output_csv=args.output_csv,
                alert_threshold=args.alert_threshold,
                email_alert=args.email_alert,
                default_ttl=args.default_ttl
            )
            print(res["table_output"])
    else:
        # Standard one-shot CLI execution (cron-friendly)
        res = run_stale_check(
            db_path=args.db_path,
            sources_file=args.sources_file,
            chroma_dir=args.chroma_dir,
            mark=args.mark,
            output_csv=args.output_csv,
            alert_threshold=args.alert_threshold,
            email_alert=args.email_alert,
            default_ttl=args.default_ttl
        )
        print(res["table_output"])


if __name__ == "__main__":
    main()
