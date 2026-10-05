"""
KisanSahay Automated Data Layer & Registry Manager
==================================================
Manages official agricultural source registries, handles automated synchronization,
tracks versioning and SHA-256 change detection, calculates Time-To-Live (TTL),
flags stale records, and logs sync audit metrics in SQLite.
"""

import os
import re
import json
import sqlite3
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union

try:
    import yaml
except ImportError:
    yaml = None  # Fallback handled in source loader

logger = logging.getLogger("KisanDataLayer")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] [DataLayer] %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Default TTL Policies as specified in Prompt 1
DEFAULT_TTL_POLICIES: Dict[str, timedelta] = {
    "mandi_prices": timedelta(days=1),            # Daily mandi prices (24 hours)
    "imd_weather_advisory": timedelta(days=3),    # Twice weekly IMD bulletins (72 hours)
    "crop_advisory": timedelta(days=14),          # Seasonal agronomic advisories (14 days)
    "kvk_training_calendar": timedelta(days=30),  # Monthly training schedules (30 days)
    "gov_schemes_loans": timedelta(days=90),      # Quarterly schemes & loans (90 days, high risk)
    "kvk_directory": timedelta(days=180),         # Institutional KVK directory (6 months)
}

DEFAULT_STALE_ACTION: Dict[str, str] = {
    "mandi_prices": "flag_stale",
    "imd_weather_advisory": "flag_stale",
    "crop_advisory": "flag_stale",
    "kvk_training_calendar": "flag_stale",
    "gov_schemes_loans": "pending_review",        # High risk items undergo review on expiry
    "kvk_directory": "flag_stale",
}

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "Data" / "kisansahay.db"
if not DEFAULT_DB_PATH.exists():
    _repo_db = Path(__file__).resolve().parent.parent.parent.parent / "Data" / "kisansahay.db"
    if _repo_db.exists():
        DEFAULT_DB_PATH = _repo_db

DEFAULT_SOURCES_PATH = Path(__file__).resolve().parent.parent.parent / "sources.yaml"
if not DEFAULT_SOURCES_PATH.exists():
    _repo_sources = Path(__file__).resolve().parent.parent.parent.parent / "sources.yaml"
    if _repo_sources.exists():
        DEFAULT_SOURCES_PATH = _repo_sources


def get_utc_now() -> datetime:
    """Returns current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def to_iso_utc(dt: Optional[datetime] = None) -> str:
    """Formats datetime as ISO-8601 UTC string."""
    if dt is None:
        dt = get_utc_now()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def parse_iso_utc(ts_str: str) -> datetime:
    """Parses ISO-8601 string to UTC datetime."""
    dt = datetime.fromisoformat(ts_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def canonicalize_json(content: Union[str, Dict[str, Any], List[Any]]) -> Tuple[str, str]:
    """
    Normalizes content into canonical JSON string with sorted keys and generates SHA-256 hash.
    Returns: (canonical_json_str, sha256_hex)
    """
    if isinstance(content, str):
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            parsed = {"raw_text": content.strip()}
    else:
        parsed = content

    canonical_str = json.dumps(parsed, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    content_hash = hashlib.sha256(canonical_str.encode('utf-8')).hexdigest()
    return canonical_str, content_hash


class SourceRegistry:
    """
    Parses and manages the sources.yaml registry, supporting dynamic [STATE] substitution
    and runtime filtering by type, risk level, or fetch method.
    """

    def __init__(self, sources_path: Optional[Union[str, Path]] = None, target_state: str = "Madhya Pradesh"):
        self.sources_path = Path(sources_path or DEFAULT_SOURCES_PATH)
        self.target_state = target_state
        self.sources: List[Dict[str, Any]] = []
        self.ttl_policies: Dict[str, timedelta] = dict(DEFAULT_TTL_POLICIES)
        self.stale_actions: Dict[str, str] = dict(DEFAULT_STALE_ACTION)
        self.metadata: Dict[str, Any] = {}
        self.load()

    def load(self) -> None:
        """Loads and resolves sources.yaml."""
        if not self.sources_path.exists():
            # Check fallback in src/data/sources.yaml
            alt_path = self.sources_path.parent / "src" / "data" / "sources.yaml"
            if alt_path.exists():
                self.sources_path = alt_path
            else:
                raise FileNotFoundError(f"sources.yaml not found at {self.sources_path} or {alt_path}")

        with open(self.sources_path, "r", encoding="utf-8") as f:
            raw_text = f.read()

        # Dynamic state parameter substitution
        resolved_text = raw_text.replace("[STATE]", self.target_state)

        if yaml is not None:
            data = yaml.safe_load(resolved_text) or {}
        else:
            raise RuntimeError("PyYAML is required to parse sources.yaml. Install via: pip install pyyaml")

        self.metadata = {
            "version": data.get("version", "1.0.0"),
            "registry_name": data.get("registry_name", "KisanSahay Registry"),
            "target_state": self.target_state,
        }

        # Parse TTL policies if present
        raw_ttl = data.get("ttl_policies", {})
        for dtype, policy in raw_ttl.items():
            days = policy.get("ttl_days")
            hours = policy.get("ttl_hours")
            if days is not None:
                self.ttl_policies[dtype] = timedelta(days=float(days))
            elif hours is not None:
                self.ttl_policies[dtype] = timedelta(hours=float(hours))

            if "stale_action" in policy:
                self.stale_actions[dtype] = policy["stale_action"]

        self.sources = data.get("sources", [])
        logger.info("Loaded %d sources for state '%s' from %s", len(self.sources), self.target_state, self.sources_path.name)

    def get_source(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves source configuration by source_id."""
        for src in self.sources:
            if src.get("id") == source_id:
                return src
        return None

    def filter_sources(
        self,
        data_type: Optional[str] = None,
        risk_level: Optional[str] = None,
        fetch_method: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Filters sources by type, risk level, or fetch method."""
        res = self.sources
        if data_type:
            res = [s for s in res if s.get("data_type") == data_type]
        if risk_level:
            res = [s for s in res if s.get("risk_level") == risk_level]
        if fetch_method:
            res = [s for s in res if s.get("fetch_method") == fetch_method]
        return res

    def get_ttl(self, data_type: str) -> timedelta:
        """Returns timedelta TTL for a given data_type."""
        return self.ttl_policies.get(data_type, DEFAULT_TTL_POLICIES.get(data_type, timedelta(days=7)))

    def get_stale_action(self, data_type: str) -> str:
        """Returns the policy action when a record becomes stale (flag_stale or pending_review)."""
        return self.stale_actions.get(data_type, DEFAULT_STALE_ACTION.get(data_type, "flag_stale"))


class KisanDataLayer:
    """
    SQLite Data Layer handling storage, versioning, SHA-256 change detection,
    TTL expiration, staleness monitoring, and sync telemetry.
    """

    def __init__(self, db_path: Optional[Union[str, Path]] = None, registry: Optional[SourceRegistry] = None):
        self.db_path = Path(db_path or DEFAULT_DB_PATH)
        self.registry = registry or SourceRegistry()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        """Establishes SQLite connection with WAL mode and foreign keys enabled."""
        conn = sqlite3.connect(str(self.db_path), timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        return conn

    def init_db(self) -> None:
        """Executes schema DDL to create tables and indexes."""
        schema_file = Path(__file__).resolve().parent / "schema.sql"
        if not schema_file.exists():
            raise FileNotFoundError(f"schema.sql not found at {schema_file}")

        with open(schema_file, "r", encoding="utf-8") as f:
            ddl = f.read()

        with self.get_connection() as conn:
            conn.executescript(ddl)
            conn.commit()
        logger.info("Initialized SQLite Data Layer schema at %s", self.db_path)

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Sync Logging Lifecycle
    # -------------------------------------------------------------------------

    def start_sync_log(self, source_id: str) -> int:
        """Creates an audit entry in sync_log with status 'running' and returns log_id."""
        started_at = to_iso_utc()
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO sync_log (source_id, started_at, result, records_added, records_updated, records_retired)
                VALUES (?, ?, 'running', 0, 0, 0)
                """,
                (source_id, started_at)
            )
            conn.commit()
            return cur.lastrowid

    def finish_sync_log(
        self,
        log_id: int,
        result: str,
        records_added: int = 0,
        records_updated: int = 0,
        records_retired: int = 0,
        error: Optional[str] = None
    ) -> None:
        """Completes an audit entry in sync_log with execution duration and metrics."""
        completed_at = to_iso_utc()
        now_dt = get_utc_now()

        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT started_at FROM sync_log WHERE id = ?", (log_id,))
            row = cur.fetchone()
            exec_secs = 0.0
            if row and row["started_at"]:
                started_dt = parse_iso_utc(row["started_at"])
                exec_secs = max(0.0, (now_dt - started_dt).total_seconds())

            cur.execute(
                """
                UPDATE sync_log
                SET completed_at = ?,
                    result = ?,
                    records_added = ?,
                    records_updated = ?,
                    records_retired = ?,
                    error = ?,
                    execution_seconds = ?
                WHERE id = ?
                """,
                (completed_at, result, records_added, records_updated, records_retired, error, exec_secs, log_id)
            )
            conn.commit()

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Record Upsert & Change Detection (SHA-256)
    # -------------------------------------------------------------------------

    def upsert_record(
        self,
        record_id: str,
        data_type: str,
        state: str,
        content: Union[str, Dict[str, Any], List[Any]],
        source_id: str,
        source_url: str,
        district: Optional[str] = None,
        last_verified: Optional[datetime] = None,
        status: Optional[str] = None,
        ttl_override: Optional[timedelta] = None
    ) -> Dict[str, Any]:
        """
        Upserts an agricultural record with deterministic SHA-256 change detection:
        - If new record: inserts version 1, sets expires_at = last_verified + TTL.
        - If existing record with IDENTICAL hash: bumps last_verified & expires_at,
          resets is_stale to 0, does NOT increment version.
        - If existing record with CHANGED hash: increments version by 1, updates content,
          hash, last_verified, and expires_at. If risk_level is 'high', status transitions
          to 'pending_review' unless explicitly supplied.
        """
        now = get_utc_now()
        verified_dt = last_verified or now
        verified_iso = to_iso_utc(verified_dt)
        canonical_content, content_hash = canonicalize_json(content)

        # Determine TTL & expiration
        ttl = ttl_override or self.registry.get_ttl(data_type)
        expires_dt = verified_dt + ttl
        expires_iso = to_iso_utc(expires_dt)
        is_stale = 1 if now > expires_dt else 0

        # Check source risk level from registry
        source_cfg = self.registry.get_source(source_id)
        risk_level = source_cfg.get("risk_level", "low") if source_cfg else "low"

        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM records WHERE id = ?", (record_id,))
            existing = cur.fetchone()

            if existing is None:
                # Brand new record
                initial_status = status or ("pending_review" if risk_level == "high" and status is None else "live")
                created_iso = to_iso_utc(now)
                cur.execute(
                    """
                    INSERT INTO records (
                        id, type, state, district, content_json, content_hash,
                        source_id, source_url, last_verified, status, version,
                        created_at, updated_at, expires_at, is_stale
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
                    """,
                    (
                        record_id, data_type, state, district, canonical_content, content_hash,
                        source_id, source_url, verified_iso, initial_status,
                        created_iso, created_iso, expires_iso, is_stale
                    )
                )
                conn.commit()
                return {
                    "action": "inserted",
                    "id": record_id,
                    "version": 1,
                    "status": initial_status,
                    "content_hash": content_hash,
                    "expires_at": expires_iso
                }

            # Existing record
            old_hash = existing["content_hash"]
            old_version = existing["version"]
            old_status = existing["status"]

            if old_hash == content_hash:
                # Content unmodified -> refresh verification and reset staleness
                # Do NOT increment version
                cur.execute(
                    """
                    UPDATE records
                    SET last_verified = ?,
                        expires_at = ?,
                        is_stale = ?
                    WHERE id = ?
                    """,
                    (verified_iso, expires_iso, is_stale, record_id)
                )
                conn.commit()
                return {
                    "action": "verified_unmodified",
                    "id": record_id,
                    "version": old_version,
                    "status": old_status,
                    "content_hash": content_hash,
                    "expires_at": expires_iso
                }
            else:
                # Content changed -> increment version
                new_version = old_version + 1
                updated_iso = to_iso_utc(now)
                # If high risk (e.g. scheme eligibility or loan rule changed), route to pending_review
                if status is not None:
                    new_status = status
                elif risk_level == "high":
                    new_status = "pending_review"
                    logger.warning("High-risk record '%s' (%s) modified. Moved to pending_review.", record_id, data_type)
                else:
                    new_status = "live"

                cur.execute(
                    """
                    UPDATE records
                    SET content_json = ?,
                        content_hash = ?,
                        last_verified = ?,
                        updated_at = ?,
                        expires_at = ?,
                        status = ?,
                        version = ?,
                        is_stale = ?
                    WHERE id = ?
                    """,
                    (
                        canonical_content, content_hash, verified_iso,
                        updated_iso, expires_iso, new_status, new_version,
                        is_stale, record_id
                    )
                )
                conn.commit()
                return {
                    "action": "updated",
                    "id": record_id,
                    "version": new_version,
                    "status": new_status,
                    "content_hash": content_hash,
                    "expires_at": expires_iso
                }

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Staleness Monitoring & Record Retirement
    # -------------------------------------------------------------------------

    def flag_stale_records(self, as_of: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Evaluates active records against their TTL expiration timestamps:
        - Marks records as is_stale = 1 if expires_at < as_of.
        - For high-risk expired records (e.g., gov_schemes_loans), transitions
          status to 'pending_review' to protect farmers from outdated rules.
        Returns a detailed staleness audit report.
        """
        check_time = as_of or get_utc_now()
        check_iso = to_iso_utc(check_time)

        with self.get_connection() as conn:
            cur = conn.cursor()

            # Mark all expired records as stale
            cur.execute(
                """
                UPDATE records
                SET is_stale = 1
                WHERE expires_at < ? AND is_stale = 0 AND status != 'retired'
                """,
                (check_iso,)
            )
            newly_flagged = cur.rowcount

            # Reset any un-expired records that might have been prematurely flagged
            cur.execute(
                """
                UPDATE records
                SET is_stale = 0
                WHERE expires_at >= ? AND is_stale = 1 AND status != 'retired'
                """,
                (check_iso,)
            )

            # High-risk safety gate: move expired live gov_schemes_loans to pending_review
            cur.execute(
                """
                UPDATE records
                SET status = 'pending_review'
                WHERE type = 'gov_schemes_loans'
                  AND status = 'live'
                  AND expires_at < ?
                """,
                (check_iso,)
            )
            high_risk_reviewed = cur.rowcount

            conn.commit()

            # Generate summary statistics
            cur.execute(
                """
                SELECT type,
                       COUNT(*) as total,
                       SUM(CASE WHEN is_stale = 1 THEN 1 ELSE 0 END) as stale_count,
                       SUM(CASE WHEN status = 'live' AND is_stale = 0 THEN 1 ELSE 0 END) as live_fresh_count,
                       SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_review_count,
                       SUM(CASE WHEN status = 'retired' THEN 1 ELSE 0 END) as retired_count
                FROM records
                GROUP BY type
                """
            )
            breakdown = [dict(row) for row in cur.fetchall()]

            total_stale = sum(b.get("stale_count", 0) or 0 for b in breakdown)
            total_records = sum(b.get("total", 0) or 0 for b in breakdown)

            return {
                "check_timestamp": check_iso,
                "newly_flagged": newly_flagged,
                "high_risk_moved_to_review": high_risk_reviewed,
                "total_stale_active": total_stale,
                "total_records": total_records,
                "type_breakdown": breakdown
            }

    def retire_missing_records(self, source_id: str, active_ids_in_batch: List[str]) -> int:
        """
        Retires active records belonging to source_id that were not observed in the current harvest.
        Status transitions to 'retired' so historical queries or audit trails remain intact.
        """
        if not active_ids_in_batch:
            return 0

        now_iso = to_iso_utc()
        with self.get_connection() as conn:
            cur = conn.cursor()
            placeholders = ",".join("?" for _ in active_ids_in_batch)
            query = f"""
                UPDATE records
                SET status = 'retired',
                    updated_at = ?
                WHERE source_id = ?
                  AND status != 'retired'
                  AND id NOT IN ({placeholders})
            """
            params = [now_iso, source_id] + list(active_ids_in_batch)
            cur.execute(query, params)
            retired_count = cur.rowcount
            conn.commit()
            if retired_count > 0:
                logger.info("Retired %d missing record(s) for source '%s'", retired_count, source_id)
            return retired_count

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Retrieval & RAG Export
    # -------------------------------------------------------------------------

    def get_records(
        self,
        data_type: Optional[str] = None,
        state: Optional[str] = None,
        district: Optional[str] = None,
        status: str = "live",
        fresh_only: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Queries records with optional type, state, district, status, and freshness filtering.
        """
        query = "SELECT * FROM records WHERE 1=1"
        params: List[Any] = []

        if data_type:
            query += " AND type = ?"
            params.append(data_type)
        if state:
            query += " AND state = ?"
            params.append(state)
        if district:
            query += " AND (district = ? OR district IS NULL OR district = 'all')"
            params.append(district)
        if status:
            query += " AND status = ?"
            params.append(status)
        if fresh_only:
            query += " AND is_stale = 0"

        query += " ORDER BY type, district, id"

        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(query, params)
            rows = [dict(r) for r in cur.fetchall()]
            for r in rows:
                try:
                    r["content"] = json.loads(r["content_json"])
                except Exception:
                    r["content"] = r["content_json"]
            return rows

    def get_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves single record by id."""
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM records WHERE id = ?", (record_id,))
            row = cur.fetchone()
            if not row:
                return None
            res = dict(row)
            try:
                res["content"] = json.loads(res["content_json"])
            except Exception:
                res["content"] = res["content_json"]
            return res

    def export_for_rag(self, output_jsonl_path: Optional[Union[str, Path]] = None) -> List[Dict[str, Any]]:
        """
        Exports all 'live' and non-stale records formatted as enriched documents
        ready for the ChromaDB RAG chunking and embedding pipeline (scripts/ingest_data.py).
        """
        live_records = self.get_records(status="live", fresh_only=True)
        documents = []

        for rec in live_records:
            dtype = rec["type"]
            state = rec["state"]
            dist = rec.get("district") or "All Districts"
            content = rec["content"]

            # Format human-readable text document with contextual header
            text_lines = [
                f"# Category: {dtype.replace('_', ' ').title()}",
                f"## Region: {state} > {dist}",
                f"**Source ID:** {rec['source_id']} (Verified: {rec['last_verified'][:10]})",
                ""
            ]

            if isinstance(content, dict):
                for k, v in content.items():
                    key_title = k.replace('_', ' ').title()
                    if isinstance(v, list):
                        text_lines.append(f"### {key_title}")
                        for item in v:
                            text_lines.append(f"- {item}")
                    elif isinstance(v, dict):
                        text_lines.append(f"### {key_title}")
                        for sub_k, sub_v in v.items():
                            text_lines.append(f"- **{sub_k.replace('_', ' ').title()}:** {sub_v}")
                    else:
                        text_lines.append(f"- **{key_title}:** {v}")
            else:
                text_lines.append(str(content))

            doc_text = "\n".join(text_lines)

            doc_obj = {
                "text": doc_text,
                "metadata": {
                    "record_id": rec["id"],
                    "data_type": dtype,
                    "state": state,
                    "district": dist,
                    "source_id": rec["source_id"],
                    "source_url": rec["source_url"],
                    "last_verified": rec["last_verified"],
                    "version": rec["version"]
                }
            }
            documents.append(doc_obj)

        if output_jsonl_path:
            out_file = Path(output_jsonl_path)
            out_file.parent.mkdir(parents=True, exist_ok=True)
            with open(out_file, "w", encoding="utf-8") as f:
                for d in documents:
                    f.write(json.dumps(d, ensure_ascii=False) + "\n")
            logger.info("Exported %d RAG documents to %s", len(documents), out_file)

        return documents
