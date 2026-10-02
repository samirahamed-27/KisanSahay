"""
KisanSahay Fresh Retrieval Engine
==================================
Implements Prompt 5 retrieval requirements:
- retrieve(question, state=None, n=6) queries ChromaDB with where filters for the user's
  state (plus 'ALL') and only chunks whose record status is 'live'.
- Groups returned chunks by record_id and merges them in chunk_index order.
- Keeps top 3 or 4 records (capped appropriately).
- For time-sensitive questions (mandi prices, weather advisories, training dates),
  ranks the freshest records first and includes their dates prominently.
- Detects pending changes in SQLite and attaches an advisory note.
- Detects records older than their time-to-live (TTL) and attaches a staleness warning.
"""

import os
import sys
import re
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.data_layer import KisanDataLayer, SourceRegistry, parse_iso_utc, to_iso_utc, get_utc_now
from scripts.retrieve_context import get_vector_store

logger = logging.getLogger("FreshRetrieval")

# Keywords identifying time-sensitive queries
TIME_SENSITIVE_KEYWORDS = {
    "mandi", "bhav", "price", "rate", "modal price", "arrival", "market rate",
    "weather", "forecast", "mausam", "barish", "rain", "temperature", "agromet",
    "monsoon", "humidity", "rainfall",
    "training", "demonstration", "calendar", "event", "workshop", "karyashala",
    "advisory", "current", "today", "tomorrow", "this week", "latest", "taja"
}

# Data types considered time-sensitive
TIME_SENSITIVE_DATA_TYPES = {
    "mandi_prices",
    "imd_weather_advisory",
    "kvk_training_calendar",
    "crop_advisory"
}


def is_time_sensitive_query(query: str) -> bool:
    """Detects whether a query concerns time-sensitive information."""
    q_words = re.findall(r"\w+", query.lower())
    return any(w in TIME_SENSITIVE_KEYWORDS for w in q_words)


def build_chroma_where_filter(state: Optional[str] = None) -> Dict[str, Any]:
    """
    Builds ChromaDB filter matching:
    - status == 'live'
    - state in [user_state, 'ALL', 'All', 'All India', 'National']
    """
    base_status = {"status": "live"}

    if not state or not state.strip():
        return base_status

    st_clean = state.strip().title()
    allowed_states = list({st_clean, state.strip(), "ALL", "All", "All India", "National", "India"})

    return {
        "$and": [
            base_status,
            {"state": {"$in": allowed_states}}
        ]
    }


def retrieve(
    question: str,
    state: Optional[str] = None,
    n: int = 6,
    chroma_dir: Optional[str] = None,
    collection_name: Optional[str] = None,
    ollama_url: Optional[str] = None,
    embed_model: Optional[str] = None,
    data_layer: Optional[KisanDataLayer] = None,
    vector_store: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Queries ChromaDB with state and live status filters, merges chunks by record_id
    in chunk_index order, evaluates staleness & pending changes, and returns top 3-4 records.

    Args:
        question: User query text.
        state: Optional state filter (e.g. 'Madhya Pradesh').
        n: Number of candidate chunks to retrieve from ChromaDB (default 6).
        data_layer: Optional KisanDataLayer instance for SQLite verification.

    Returns:
        Dict containing:
        - records: List of top 3-4 merged records
        - formatted_context: Context string formatted with headers, citations, and notices
        - is_time_sensitive: bool
        - citations: List of sources cited
        - has_pending_updates: bool
        - has_stale_records: bool
    """
    start_time = datetime.now(timezone.utc)
    dl = data_layer or KisanDataLayer()
    now_dt = get_utc_now()
    is_time_sensitive = is_time_sensitive_query(question)

    # 1. Prepare Vector Store
    if vector_store is None:
        vs_dir = chroma_dir or os.getenv("CHROMA_DB_DIR", "./chroma_db")
        vs_coll = collection_name or os.getenv("CHROMA_COLLECTION", "kisansahay_knowledge")
        vs_url = ollama_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        vs_model = embed_model or os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
        vs = get_vector_store(chroma_dir=vs_dir, collection_name=vs_coll, ollama_url=vs_url, embed_model=vs_model)
    else:
        vs = vector_store

    # 2. Build Where Filter
    where_filter = build_chroma_where_filter(state=state)
    logger.info("Executing ChromaDB retrieve for: '%s' (state=%s, n=%d, time_sensitive=%s)", question, state, n, is_time_sensitive)

    # 3. Fetch candidate chunks with scores
    # Query more chunks (e.g. max(n, 8)) to ensure multi-chunk records can be fully gathered
    fetch_k = max(n, 8)
    try:
        results_with_scores = vs.similarity_search_with_score(
            query=question,
            k=fetch_k,
            filter=where_filter
        )
    except Exception as search_err:
        logger.warning("Chroma search with filter failed (%s). Retrying with status-only filter...", search_err)
        try:
            results_with_scores = vs.similarity_search_with_score(
                query=question,
                k=fetch_k,
                filter={"status": "live"}
            )
        except Exception as retry_err:
            logger.warning("Chroma search fallback failed: %s. Performing unfiltered query.", retry_err)
            results_with_scores = vs.similarity_search_with_score(query=question, k=fetch_k)

    # 4. Group returned chunks by record_id
    chunks_by_record: Dict[str, List[Tuple[Any, float]]] = {}
    record_best_score: Dict[str, float] = {}

    for doc, score in results_with_scores:
        meta = doc.metadata or {}
        rec_id = meta.get("record_id")
        if not rec_id:
            # Fallback for older document chunks without record_id
            rec_id = meta.get("source") or meta.get("id") or "doc_unknown"

        chunks_by_record.setdefault(rec_id, []).append((doc, score))
        if rec_id not in record_best_score or score < record_best_score[rec_id]:
            record_best_score[rec_id] = score

    # 5. Verify records against SQLite and assemble merged content
    merged_records = []

    for rec_id, chunk_pairs in chunks_by_record.items():
        # Look up live record in SQLite
        db_rec = dl.get_record(rec_id)
        if db_rec and db_rec.get("status") != "live":
            # Skip non-live records strictly
            continue

        first_meta = chunk_pairs[0][0].metadata or {}
        dtype = db_rec["type"] if db_rec else first_meta.get("type", "general")
        rec_state = db_rec["state"] if db_rec else first_meta.get("state", state or "All India")
        district = db_rec.get("district") if db_rec else first_meta.get("district")
        source_url = db_rec["source_url"] if db_rec else first_meta.get("source_url", "https://agricoop.nic.in")
        last_verified = db_rec["last_verified"] if db_rec else first_meta.get("last_verified")

        # Sort chunks in chunk_index order
        sorted_pairs = sorted(
            chunk_pairs,
            key=lambda cp: int(cp[0].metadata.get("chunk_index", 0)) if cp[0].metadata else 0
        )
        merged_chunks_text = [cp[0].page_content.strip() for cp in sorted_pairs]
        merged_text = "\n\n".join(merged_chunks_text)

        # Check if record has a pending update in review
        has_pending = False
        with dl.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT id FROM records WHERE (id = ? OR id = ?) AND status = 'pending_review' LIMIT 1",
                (f"{rec_id}__pending", rec_id)
            )
            has_pending = cur.fetchone() is not None

        # Check TTL and staleness
        is_stale = False
        ttl_days = 30.0
        if db_rec:
            is_stale = bool(db_rec.get("is_stale", 0))
            if db_rec.get("expires_at"):
                exp_dt = parse_iso_utc(db_rec["expires_at"])
                if now_dt > exp_dt:
                    is_stale = True

        rec_obj = {
            "record_id": rec_id,
            "data_type": dtype,
            "state": rec_state,
            "district": district or "All",
            "source_url": source_url,
            "last_verified": last_verified,
            "content": merged_text,
            "best_score": record_best_score[rec_id],
            "chunk_count": len(sorted_pairs),
            "has_pending_change": has_pending,
            "is_stale": is_stale,
            "is_time_sensitive": dtype in TIME_SENSITIVE_DATA_TYPES or is_time_sensitive
        }
        merged_records.append(rec_obj)

    # 6. Ranking: For time-sensitive questions, prefer freshest records first; otherwise rank by score
    if is_time_sensitive:
        def time_sensitive_sort_key(r: Dict[str, Any]):
            # Primary: last_verified date descending (newest first)
            # Secondary: relevance score ascending (lowest distance first)
            lv_str = r.get("last_verified")
            dt_ts = 0.0
            if lv_str:
                try:
                    dt_ts = parse_iso_utc(lv_str).timestamp()
                except Exception:
                    dt_ts = 0.0
            return (-dt_ts, r["best_score"])

        merged_records.sort(key=time_sensitive_sort_key)
    else:
        # Standard relevance ranking (lowest distance first)
        merged_records.sort(key=lambda r: r["best_score"])

    # 7. Keep top 3 or 4 records (capped at 4)
    top_records = merged_records[:4]

    # 8. Build formatted context string for Gemini with citations and notices
    context_blocks = []
    citations = []
    has_any_pending = False
    has_any_stale = False

    for idx, rec in enumerate(top_records, 1):
        rec_id = rec["record_id"]
        dtype = rec["data_type"]
        s_url = rec["source_url"]
        l_ver = rec["last_verified"] or "Recently verified"
        content_body = rec["content"]

        notices = []
        if rec["has_pending_change"]:
            has_any_pending = True
            notices.append(
                "⚠️ [PENDING UPDATE ADVISORY]: A revision for this scheme/loan rule is currently undergoing administrative review. "
                "The rule is being updated and details should be confirmed directly with your local bank branch or Krishi Vigyan Kendra (KVK)."
            )

        if rec["is_stale"]:
            has_any_stale = True
            notices.append(
                f"⚠️ [TTL EXPIRATION NOTICE]: This record was last verified on {l_ver} and has exceeded its recommended Time-To-Live. "
                "Information may be outdated. Please confirm current figures and directives with your nearest Krishi Vigyan Kendra (KVK) or local bank branch."
            )

        notices_text = "\n".join(notices) + "\n\n" if notices else ""

        block = (
            f"=== RECORD {idx}: {rec_id} (Type: {dtype}, State: {rec['state']}) ===\n"
            f"Official Source URL: {s_url}\n"
            f"Last Verified Date: {l_ver}\n"
            f"{notices_text}"
            f"{content_body}\n"
        )
        context_blocks.append(block)

        citations.append({
            "record_id": rec_id,
            "data_type": dtype,
            "source_url": s_url,
            "last_verified": l_ver,
            "has_pending_change": rec["has_pending_change"],
            "is_stale": rec["is_stale"]
        })

    formatted_context = "\n\n---\n\n".join(context_blocks)

    return {
        "records": top_records,
        "count": len(top_records),
        "formatted_context": formatted_context,
        "is_time_sensitive": is_time_sensitive,
        "citations": citations,
        "has_pending_updates": has_any_pending,
        "has_stale_records": has_any_stale,
        "duration_ms": (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
    }
