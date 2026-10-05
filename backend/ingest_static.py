#!/usr/bin/env python3
"""
KisanSahay Static Ingestion Pipeline & Volatile Figures Validator (ingest_static.py)
===================================================================================
Scans static records and Markdown documents before embedding into ChromaDB.
Validates that volatile financial figures (loan limits, interest rates, subsidy
amounts, premium rates) are explicitly dated and sourced:
    `Interest rate: X% (as of YYYY-MM-DD, source: <url>)`
    `Loan limit: ₹X (as of YYYY-MM-DD, source: <url>)`
or replaced with a link to the official source.

Prompt 2 Requirements:
- Scans every record before it is embedded.
- Rejects or flags any volatile figure lacking an 'as of' date and source,
  with the record ID and line number in the error.
- Guarantees two-tier chunking keeps the number and its date/source on one line
  and never splits inside a bracketed 'as of' note.
"""

import os
import sys
import json
import logging
import argparse
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional, Union

# Third-party dependencies
try:
    from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
    except ImportError:
        print("Error: langchain-text-splitters is required. Install via: pip install langchain-text-splitters")
        sys.exit(1)

# Import our validator module
try:
    from src.ingest.volatile_validator import (
        validate_record_volatile_figures,
        protect_volatile_notes,
        unprotect_volatile_notes,
        VolatileFigureValidator,
        ValidationError
    )
except ImportError:
    # If running from outside root or direct invocation
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from src.ingest.volatile_validator import (
        validate_record_volatile_figures,
        protect_volatile_notes,
        unprotect_volatile_notes,
        VolatileFigureValidator,
        ValidationError
    )

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [StaticIngest] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("StaticIngest")

DEFAULT_CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_db")
DEFAULT_COLLECTION = os.getenv("COLLECTION_NAME", "kisansahay_knowledge")
DEFAULT_DATA_FILE = Path(__file__).resolve().parent / "src" / "data" / "fresh_agri_records.jsonl"


def chunk_record_two_tier(
    record_id: str,
    text: str,
    metadata: Dict[str, Any],
    chunk_size: int = 800,
    chunk_overlap: int = 100
) -> List[Dict[str, Any]]:
    """
    Executes two-tier chunking:
      1. MarkdownHeaderTextSplitter splits along # and ## headers.
      2. RecursiveCharacterTextSplitter splits sections > 800 chars.
    Guarantees that bracketed '(as of ...)' notes and volatile figures
    are NEVER split across chunks by using non-breaking space protection.
    """
    md_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=[("#", "header_1"), ("##", "header_2")],
        strip_headers=False
    )
    rec_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""]
    )

    try:
        sections = md_splitter.split_text(text)
    except Exception as e:
        logger.debug("Markdown split notice for %s: %s", record_id, e)
        from langchain_core.documents import Document
        sections = [Document(page_content=text, metadata={"header_1": f"Record {record_id}"})]

    chunks = []
    chunk_idx = 0

    for sec in sections:
        sec_text = sec.page_content.strip()
        if not sec_text:
            continue

        h1 = sec.metadata.get("header_1", "")
        h2 = sec.metadata.get("header_2", "")
        header_path = f"{h1} > {h2}" if h2 else h1
        context_anchor = f"[{header_path}]\n\n" if header_path else ""

        if len(sec_text) > chunk_size:
            # Protect bracketed '(as of ...)' notes from being split
            protected_text = protect_volatile_notes(sec_text)
            sub_texts = rec_splitter.split_text(protected_text)

            for sub in sub_texts:
                # Restore original spaces
                chunk_body = unprotect_volatile_notes(sub).strip()
                if context_anchor and not chunk_body.startswith("["):
                    chunk_body = context_anchor + chunk_body

                chunk_meta = dict(metadata)
                chunk_meta.update({
                    "record_id": record_id,
                    "header_path": header_path,
                    "chunk_index": chunk_idx,
                    "status": metadata.get("status", "live")
                })
                chunk_id = f"{record_id}::{chunk_idx}"
                chunks.append({"id": chunk_id, "text": chunk_body, "metadata": chunk_meta})
                chunk_idx += 1
        else:
            chunk_body = sec_text
            if context_anchor and not chunk_body.startswith("#") and not chunk_body.startswith("["):
                chunk_body = context_anchor + chunk_body

            chunk_meta = dict(metadata)
            chunk_meta.update({
                "record_id": record_id,
                "header_path": header_path,
                "chunk_index": chunk_idx,
                "status": metadata.get("status", "live")
            })
            chunk_id = f"{record_id}::{chunk_idx}"
            chunks.append({"id": chunk_id, "text": chunk_body, "metadata": chunk_meta})
            chunk_idx += 1

    return chunks


def scan_and_validate_records(
    records: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Validates a list of records:
    - Scans every record line-by-line.
    - Rejects or flags any volatile figure without 'as of' date and source.
    - Returns (valid_records, rejected_records).
    """
    valid_records = []
    rejected_records = []

    for rec in records:
        rec_id = rec.get("id") or rec.get("record_id") or rec.get("metadata", {}).get("record_id") or "unknown_record"
        text = rec.get("text") or rec.get("content") or rec.get("content_json") or ""
        if isinstance(text, dict):
            text = json.dumps(text, indent=2)

        is_valid, errors = validate_record_volatile_figures(rec_id, text)
        if is_valid:
            valid_records.append(rec)
        else:
            rec_rejection = {
                "record_id": rec_id,
                "errors": errors,
                "raw_record": rec
            }
            rejected_records.append(rec_rejection)
            for err in errors:
                logger.warning("❌ [REJECTED] %s", err)

    return valid_records, rejected_records


def ingest_static_file(
    file_path: Union[str, Path],
    chroma_dir: str = DEFAULT_CHROMA_DIR,
    collection_name: str = DEFAULT_COLLECTION,
    validate_only: bool = False,
    raise_on_error: bool = False
) -> Dict[str, Any]:
    """
    Ingests and embeds records from a file (e.g. JSONL or Markdown) after strict validation.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Static file not found at {path}")

    records = []
    if path.suffix.lower() == ".jsonl":
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        records.append(json.loads(line))
                    except Exception as e:
                        logger.warning("Skipping invalid JSON line in %s: %s", path.name, e)
    elif path.suffix.lower() in [".md", ".txt"]:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        records.append({
            "id": path.stem,
            "text": content,
            "metadata": {"source": path.name, "record_id": path.stem}
        })
    else:
        raise ValueError(f"Unsupported static file format: {path.suffix}")

    logger.info("Loaded %d static record(s) from %s", len(records), path.name)
    valid_records, rejected_records = scan_and_validate_records(records)

    if rejected_records and raise_on_error:
        first_err = rejected_records[0]["errors"][0]
        raise ValidationError(first_err, record_id=rejected_records[0]["record_id"], line_no=1, snippet=first_err)

    if validate_only:
        logger.info("Validation Only: %d valid, %d rejected", len(valid_records), len(rejected_records))
        return {
            "total_scanned": len(records),
            "valid_count": len(valid_records),
            "rejected_count": len(rejected_records),
            "rejected_records": rejected_records,
            "embedded_chunks": 0
        }

    # Generate chunks for valid records
    all_chunks = []
    for rec in valid_records:
        rec_id = rec.get("id") or rec.get("record_id") or rec.get("metadata", {}).get("record_id") or "rec"
        text = rec.get("text") or rec.get("content") or ""
        meta = rec.get("metadata") or {}
        chunks = chunk_record_two_tier(rec_id, text, meta)
        all_chunks.extend(chunks)

    # Embed chunks into ChromaDB
    embedded_count = 0
    if all_chunks:
        try:
            import chromadb
            client = chromadb.PersistentClient(path=chroma_dir)
            coll = client.get_or_create_collection(collection_name)
            # Add or upsert in batches
            batch_size = 50
            for i in range(0, len(all_chunks), batch_size):
                batch = all_chunks[i:i + batch_size]
                b_ids = [c["id"] for c in batch]
                b_texts = [c["text"] for c in batch]
                b_metas = [c["metadata"] for c in batch]
                coll.upsert(ids=b_ids, documents=b_texts, metadatas=b_metas)
            embedded_count = len(all_chunks)
            logger.info("Successfully embedded %d chunk(s) from %d valid record(s) into ChromaDB (%s)",
                        embedded_count, len(valid_records), collection_name)
        except Exception as embed_err:
            logger.warning("ChromaDB vector embedding notice: %s", embed_err)

    return {
        "total_scanned": len(records),
        "valid_count": len(valid_records),
        "rejected_count": len(rejected_records),
        "rejected_records": rejected_records,
        "embedded_chunks": embedded_count
    }


def main():
    parser = argparse.ArgumentParser(
        description="KisanSahay Static Ingest & Volatile Figures Validator (Prompt 2)"
    )
    parser.add_argument("--file", default=str(DEFAULT_DATA_FILE), help="Path to static record file (JSONL/MD)")
    parser.add_argument("--chroma-dir", default=DEFAULT_CHROMA_DIR, help="Path to ChromaDB storage directory")
    parser.add_argument("--collection", default=DEFAULT_COLLECTION, help="ChromaDB collection name")
    parser.add_argument("--validate-only", action="store_true", help="Only validate figures without embedding")
    parser.add_argument("--raise-on-error", action="store_true", help="Raise exception on first validation error")

    args = parser.parse_args()
    res = ingest_static_file(
        file_path=args.file,
        chroma_dir=args.chroma_dir,
        collection_name=args.collection,
        validate_only=args.validate_only,
        raise_on_error=args.raise_on_error
    )

    print("\n" + "=" * 70)
    print("KISANSAHAY STATIC INGESTION & VOLATILE VALIDATION REPORT")
    print("=" * 70)
    print(f"Total Records Scanned: {res['total_scanned']}")
    print(f"Valid Records Passed:  {res['valid_count']}")
    print(f"Rejected Records:      {res['rejected_count']}")
    print(f"Embedded Chunks:       {res['embedded_chunks']}")

    if res['rejected_records']:
        print("\nRejection Breakdown:")
        for r in res['rejected_records']:
            print(f"\n❌ Record ID: {r['record_id']}")
            for err in r['errors']:
                print(f"   • {err}")
    print("=" * 70)


if __name__ == "__main__":
    main()
