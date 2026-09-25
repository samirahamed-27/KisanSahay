#!/usr/bin/env python3
"""
Data Ingestion Pipeline for KisanSahay
======================================
Reads raw data files from `src/data` (supporting JSON, JSONL, PDF, CSV, TXT, MD, DOCX, HTML),
splits text into 500-token chunks with 50-token overlap, generates embeddings via Ollama
using the `nomic-embed-text` model, and saves them into a local ChromaDB vector store.

Usage:
    python scripts/ingest_data.py
    python scripts/ingest_data.py --data-dir src/data --chroma-dir ./chroma_db
    python scripts/ingest_data.py --reset  # clear existing Chroma collection before ingestion
    python scripts/ingest_data.py --query-test "What are the benefits of PM-KISAN?"
"""

import os
import sys
import re
import csv
import json
import time
import hashlib
import logging
import argparse
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

# Third-party imports with resilient fallback
try:
    import requests
except ImportError:
    print("Error: 'requests' package is required. Install via: pip install requests")
    sys.exit(1)

try:
    from tqdm import tqdm
except ImportError:
    # Minimal fallback if tqdm is unavailable
    def tqdm(iterable, *args, **kwargs):
        return iterable

# LangChain Imports
try:
    from langchain_core.documents import Document
except ImportError:
    try:
        from langchain.docstore.document import Document
    except ImportError:
        print("Error: 'langchain' or 'langchain-core' is required. Install via: pip install langchain langchain-core")
        sys.exit(1)

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        print("Error: 'langchain-text-splitters' is required. Install via: pip install langchain-text-splitters")
        sys.exit(1)

try:
    from langchain_ollama import OllamaEmbeddings
except ImportError:
    try:
        from langchain_community.embeddings import OllamaEmbeddings
    except ImportError:
        print("Error: 'langchain-ollama' or 'langchain-community' is required. Install via: pip install langchain-ollama")
        sys.exit(1)

try:
    from langchain_chroma import Chroma
except ImportError:
    try:
        from langchain_community.vectorstores import Chroma
    except ImportError:
        print("Error: 'langchain-chroma' or 'langchain-community' is required. Install via: pip install langchain-chroma chromadb")
        sys.exit(1)

# Optional format parsers
try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("DataIngestion")


# ─────────────────────────────────────────────────────────────────────────────
# 1. Helper Functions & Pre-Flight Checks
# ─────────────────────────────────────────────────────────────────────────────

def check_ollama_service(base_url: str, model_name: str) -> bool:
    """Verifies that the Ollama daemon is accessible and the requested model is pulled."""
    tags_url = f"{base_url.rstrip('/')}/api/tags"
    logger.info("Checking Ollama service at %s...", tags_url)
    try:
        res = requests.get(tags_url, timeout=5)
        if res.status_code != 200:
            logger.error("Ollama returned HTTP %d: %s", res.status_code, res.text)
            return False

        data = res.json()
        models = [m.get("name", "") for m in data.get("models", [])]
        logger.info("Found %d model(s) in Ollama: %s", len(models), models)

        # Match model name with or without tag suffix (e.g., nomic-embed-text:latest)
        model_found = any(
            m == model_name or m.startswith(f"{model_name}:")
            for m in models
        )

        if not model_found:
            logger.warning(
                "Model '%s' was NOT found in Ollama models: %s.\n"
                "Please run: ollama pull %s",
                model_name, models, model_name
            )
            return False

        logger.info("Ollama is online and '%s' is ready.", model_name)
        return True

    except requests.exceptions.RequestException as e:
        logger.error(
            "Could not connect to Ollama at %s (%s).\n"
            "Please ensure Ollama is running (e.g. run 'ollama serve' in your terminal).",
            base_url, e
        )
        return False


def sanitize_text(text: Any) -> str:
    """Sanitizes text: handles line ending anomalies, strips HTML, collapses whitespace."""
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)

    # Normalize carriage returns and macOS/TextEdit artifacts (\r\r\n -> \n)
    text = text.replace("\r\r\n", "\n").replace("\r\n", "\n").replace("\r", "\n")

    # Strip HTML tags
    text = re.sub(r"<[^>]+>", " ", text)

    # Decode common HTML entities
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')

    # Collapse horizontal spaces/tabs
    text = re.sub(r"[ \t]+", " ", text)

    # Collapse 3+ newlines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def compute_content_hash(text: str) -> str:
    """Generates a stable sha256 hash for deduplication/id generation."""
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()[:16]


# ─────────────────────────────────────────────────────────────────────────────
# 2. File-Specific Document Loaders with Error Handling
# ─────────────────────────────────────────────────────────────────────────────

def format_record_to_text(record: Dict[str, Any]) -> str:
    """Formats a structured JSON/CSV record into readable natural text block for embedding."""
    lines = []
    for k, v in record.items():
        if v is None or v == "" or k in ("embedding", "vector"):
            continue
        key_label = k.replace("_", " ").title()
        if isinstance(v, (list, tuple)):
            if len(v) > 0 and isinstance(v[0], dict):
                sub_entries = [format_record_to_text(sub) for sub in v]
                lines.append(f"{key_label}:\n  " + "\n  ".join(sub_entries))
            else:
                lines.append(f"{key_label}: {', '.join(str(item) for item in v)}")
        elif isinstance(v, dict):
            sub_text = ", ".join(f"{sk}: {sv}" for sk, sv in v.items() if sv is not None)
            lines.append(f"{key_label}: {sub_text}")
        else:
            lines.append(f"{key_label}: {v}")
    return "\n".join(lines)


def load_jsonl_file(file_path: Path) -> List[Document]:
    """
    Loads JSON Lines (.jsonl) file with per-line error handling.
    Extracts text and enriches with original metadata.
    """
    documents: List[Document] = []
    line_errors = 0

    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        for line_no, raw_line in enumerate(f, start=1):
            line_str = raw_line.strip()
            if not line_str:
                continue

            try:
                data = json.loads(line_str)
            except json.JSONDecodeError as err:
                line_errors += 1
                if line_errors <= 5:
                    logger.warning(
                        "[%s] Malformed JSON on line %d: %s. Skipping line.",
                        file_path.name, line_no, err
                    )
                continue

            # Determine text content
            text = ""
            if isinstance(data, dict):
                for candidate in ["text", "content", "body", "description", "summary", "article"]:
                    if candidate in data and data[candidate]:
                        text = str(data[candidate])
                        break
                if not text:
                    text = format_record_to_text(data)
            elif isinstance(data, str):
                text = data
            else:
                text = str(data)

            clean_content = sanitize_text(text)
            if len(clean_content) < 30:
                continue

            # Build metadata
            metadata: Dict[str, Any] = {
                "source": str(file_path),
                "filename": file_path.name,
                "file_type": "jsonl",
                "line_number": line_no
            }

            if isinstance(data, dict):
                for meta_key in ["title", "url", "category", "type", "source_url", "id", "financial_year"]:
                    if meta_key in data and data[meta_key] is not None:
                        metadata[meta_key] = str(data[meta_key])[:300]

            documents.append(Document(page_content=clean_content, metadata=metadata))

    if line_errors > 5:
        logger.warning("[%s] Skipped a total of %d malformed JSONL lines.", file_path.name, line_errors)

    return documents


def load_json_file(file_path: Path) -> List[Document]:
    """
    Loads JSON (.json) file.
    Skips pre-computed vector index files like rag_index.json to avoid indexing raw vectors.
    Handles lists of objects or single dictionary structures.
    """
    # Detect and skip pre-computed vector dumps
    if "rag_index" in file_path.stem.lower() or file_path.name.lower() == "rag_index.json":
        logger.info("Skipping pre-computed vector dump: %s (not raw source data)", file_path.name)
        return []

    encodings = ["utf-8", "utf-8-sig", "latin-1"]
    raw_content = None
    last_err = None

    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                raw_content = f.read()
                break
        except UnicodeDecodeError as e:
            last_err = e
            continue

    if raw_content is None:
        raise ValueError(f"Could not read {file_path.name} with encodings {encodings}: {last_err}")

    # Fix carriage return issues in raw JSON
    raw_content = raw_content.replace("\r\r\n", "\n").replace("\r\n", "\n")

    try:
        parsed_data = json.loads(raw_content)
    except json.JSONDecodeError as err:
        raise ValueError(f"JSON syntax error in {file_path.name} at line {err.lineno}, col {err.colno}: {err.msg}")

    # Safety check: if parsed_data is a large array of embeddings, skip it
    if isinstance(parsed_data, list) and len(parsed_data) > 0 and isinstance(parsed_data[0], dict):
        if "embedding" in parsed_data[0] and isinstance(parsed_data[0]["embedding"], list):
            logger.info("Skipping vector store dump: %s (contains pre-calculated embeddings)", file_path.name)
            return []

    documents: List[Document] = []

    if isinstance(parsed_data, list):
        for idx, item in enumerate(parsed_data):
            if isinstance(item, dict):
                # Check for explicit text field
                text = ""
                for candidate in ["text", "content", "description", "details", "summary"]:
                    if candidate in item and item[candidate]:
                        text = str(item[candidate])
                        break

                if not text:
                    text = format_record_to_text(item)

                clean_text = sanitize_text(text)
                if len(clean_text) < 20:
                    continue

                meta: Dict[str, Any] = {
                    "source": str(file_path),
                    "filename": file_path.name,
                    "file_type": "json",
                    "item_index": idx
                }
                for k in ["id", "name", "title", "category", "season", "provider", "state", "regionName", "url"]:
                    if k in item and item[k] is not None:
                        meta[k] = str(item[k])[:300]

                documents.append(Document(page_content=clean_text, metadata=meta))

            elif isinstance(item, str):
                clean_text = sanitize_text(item)
                if len(clean_text) >= 20:
                    documents.append(Document(
                        page_content=clean_text,
                        metadata={"source": str(file_path), "filename": file_path.name, "item_index": idx, "file_type": "json"}
                    ))

    elif isinstance(parsed_data, dict):
        # Dictionary format (e.g., config, strings, or domain lookup)
        formatted_text = format_record_to_text(parsed_data)
        clean_text = sanitize_text(formatted_text)
        if len(clean_text) >= 20:
            documents.append(Document(
                page_content=clean_text,
                metadata={"source": str(file_path), "filename": file_path.name, "file_type": "json"}
            ))

    return documents


def load_pdf_file(file_path: Path) -> List[Document]:
    """Loads PDF file using pypdf. Extracts text page-by-page with error handling."""
    if not PYPDF_AVAILABLE:
        logger.warning("[%s] 'pypdf' library not installed. Run: pip install pypdf to process PDFs.", file_path.name)
        return []

    documents: List[Document] = []
    try:
        reader = pypdf.PdfReader(str(file_path))
        if reader.is_encrypted:
            try:
                # Try decrypting with blank password
                reader.decrypt("")
            except Exception:
                logger.warning("[%s] PDF is password-protected and cannot be read. Skipping.", file_path.name)
                return []

        for page_idx, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text() or ""
                clean_text = sanitize_text(page_text)
                if len(clean_text) < 30:
                    continue

                documents.append(Document(
                    page_content=clean_text,
                    metadata={
                        "source": str(file_path),
                        "filename": file_path.name,
                        "file_type": "pdf",
                        "page": page_idx + 1,
                        "total_pages": len(reader.pages)
                    }
                ))
            except Exception as page_err:
                logger.warning("[%s] Error extracting page %d: %s", file_path.name, page_idx + 1, page_err)

    except Exception as pdf_err:
        raise ValueError(f"Failed to read PDF file ({pdf_err})")

    return documents


def load_csv_file(file_path: Path) -> List[Document]:
    """Loads CSV file row-by-row into structured text documents."""
    encodings = ["utf-8", "utf-8-sig", "latin-1"]
    documents: List[Document] = []
    file_content = None

    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                file_content = f.read()
                break
        except UnicodeDecodeError:
            continue

    if file_content is None:
        raise ValueError(f"Could not decode CSV {file_path.name} with any standard encoding.")

    reader = csv.DictReader(file_content.splitlines())
    for row_idx, row in enumerate(reader, start=1):
        clean_row = {k: v for k, v in row.items() if k and v and v.strip()}
        if not clean_row:
            continue

        row_text = format_record_to_text(clean_row)
        clean_text = sanitize_text(row_text)
        if len(clean_text) < 15:
            continue

        documents.append(Document(
            page_content=clean_text,
            metadata={
                "source": str(file_path),
                "filename": file_path.name,
                "file_type": "csv",
                "row_number": row_idx
            }
        ))

    return documents


def load_text_file(file_path: Path) -> List[Document]:
    """Loads plain text (.txt) and markdown (.md, .markdown) files."""
    encodings = ["utf-8", "utf-8-sig", "cp1252", "latin-1"]
    content = None

    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                content = f.read()
                break
        except UnicodeDecodeError:
            continue

    if content is None:
        raise ValueError(f"Could not decode text file {file_path.name}")

    clean_content = sanitize_text(content)
    if len(clean_content) < 20:
        return []

    return [Document(
        page_content=clean_content,
        metadata={
            "source": str(file_path),
            "filename": file_path.name,
            "file_type": file_path.suffix.lstrip(".").lower()
        }
    )]


def load_docx_file(file_path: Path) -> List[Document]:
    """Loads Word (.docx) files using python-docx."""
    if not DOCX_AVAILABLE:
        logger.warning("[%s] 'python-docx' library not installed. Run: pip install python-docx to process .docx files.", file_path.name)
        return []

    try:
        doc = docx.Document(str(file_path))
        text_parts = []
        for p in doc.paragraphs:
            if p.text and p.text.strip():
                text_parts.append(p.text.strip())

        for table in doc.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text and c.text.strip()]
                if cells:
                    text_parts.append(" | ".join(cells))

        full_text = "\n".join(text_parts)
        clean_content = sanitize_text(full_text)
        if len(clean_content) < 20:
            return []

        return [Document(
            page_content=clean_content,
            metadata={
                "source": str(file_path),
                "filename": file_path.name,
                "file_type": "docx"
            }
        )]
    except Exception as err:
        raise ValueError(f"Failed to parse DOCX file: {err}")


def load_html_file(file_path: Path) -> List[Document]:
    """Loads HTML files, stripping script/style tags and extracting plain text."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            html = f.read()

        # Remove scripts, styles
        html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
        html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.IGNORECASE)
        clean_content = sanitize_text(html)

        if len(clean_content) < 30:
            return []

        return [Document(
            page_content=clean_content,
            metadata={
                "source": str(file_path),
                "filename": file_path.name,
                "file_type": "html"
            }
        )]
    except Exception as err:
        raise ValueError(f"Failed to read HTML file: {err}")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Directory Ingestion & Dispatcher
# ─────────────────────────────────────────────────────────────────────────────

LOADER_MAP = {
    ".jsonl": load_jsonl_file,
    ".json": load_json_file,
    ".pdf": load_pdf_file,
    ".csv": load_csv_file,
    ".txt": load_text_file,
    ".md": load_text_file,
    ".markdown": load_text_file,
    ".rst": load_text_file,
    ".docx": load_docx_file,
    ".html": load_html_file,
    ".htm": load_html_file,
}


def load_all_files(data_dir: Path) -> Tuple[List[Document], Dict[str, Any]]:
    """
    Traverses data_dir, identifies file types, routes them to specific loaders,
    and isolates errors per file so one broken file never aborts the ingestion.
    """
    if not data_dir.exists() or not data_dir.is_dir():
        raise FileNotFoundError(f"Data directory '{data_dir}' does not exist or is not a directory.")

    all_documents: List[Document] = []
    stats = {
        "total_files": 0,
        "processed_files": 0,
        "skipped_files": 0,
        "failed_files": [],
        "documents_by_type": {}
    }

    # Discover all files in directory
    file_list = sorted([p for p in data_dir.iterdir() if p.is_file()])
    stats["total_files"] = len(file_list)
    logger.info("Found %d file(s) in %s", len(file_list), data_dir)

    for file_path in file_list:
        suffix = file_path.suffix.lower()

        # Skip hidden files or system files (e.g., .DS_Store, .gitkeep)
        if file_path.name.startswith("."):
            stats["skipped_files"] += 1
            continue

        # Skip empty zero-byte files
        if file_path.stat().st_size == 0:
            logger.warning("Skipping 0-byte file: %s", file_path.name)
            stats["skipped_files"] += 1
            continue

        loader_fn = LOADER_MAP.get(suffix)

        if not loader_fn:
            # Attempt plain text loader for unknown text-like files
            logger.info("No specific loader for extension '%s'. Attempting text loader for: %s", suffix, file_path.name)
            loader_fn = load_text_file

        try:
            file_docs = loader_fn(file_path)
            doc_count = len(file_docs)

            if doc_count > 0:
                all_documents.extend(file_docs)
                stats["processed_files"] += 1
                stats["documents_by_type"][suffix] = stats["documents_by_type"].get(suffix, 0) + doc_count
                logger.info("✓ [%s] Successfully extracted %d document(s)", file_path.name, doc_count)
            else:
                stats["skipped_files"] += 1
                logger.info("- [%s] No indexable text extracted (skipped)", file_path.name)

        except Exception as file_err:
            stats["failed_files"].append({"file": file_path.name, "error": str(file_err)})
            logger.error("✗ [%s] Ingestion failed: %s", file_path.name, file_err)

    return all_documents, stats


# ─────────────────────────────────────────────────────────────────────────────
# 4. 500-Token Text Chunking with 50-Token Overlap
# ─────────────────────────────────────────────────────────────────────────────

def create_token_text_splitter(chunk_size: int = 500, chunk_overlap: int = 50) -> RecursiveCharacterTextSplitter:
    """
    Creates a text splitter configured to split text into chunks of `chunk_size` tokens
    with `chunk_overlap` tokens overlap.

    Uses `RecursiveCharacterTextSplitter.from_tiktoken_encoder` with the standard
    'cl100k_base' tokenizer. This respects semantic text boundaries (paragraphs, sentences,
    words) while measuring length strictly in tokens.
    """
    try:
        splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            encoding_name="cl100k_base",
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        logger.info(
            "Initialized RecursiveCharacterTextSplitter with tiktoken (cl100k_base): "
            "chunk_size=%d tokens, chunk_overlap=%d tokens",
            chunk_size, chunk_overlap
        )
        return splitter
    except Exception as exc:
        logger.warning(
            "Could not initialize tiktoken encoder (%s). Falling back to character-based estimation.", exc
        )
        # Approximate 1 token ~= 4 characters as standard fallback
        return RecursiveCharacterTextSplitter(
            chunk_size=chunk_size * 4,
            chunk_overlap=chunk_overlap * 4,
            separators=["\n\n", "\n", ". ", " ", ""]
        )


def chunk_documents(documents: List[Document], splitter: RecursiveCharacterTextSplitter) -> List[Document]:
    """Splits input documents into token-bounded chunks and enriches chunk metadata."""
    logger.info("Splitting %d document(s) into chunks...", len(documents))
    raw_chunks = splitter.split_documents(documents)

    enriched_chunks: List[Document] = []
    chunk_counter_by_source: Dict[str, int] = {}

    for idx, chunk in enumerate(raw_chunks):
        content = sanitize_text(chunk.page_content)
        if len(content) < 30:
            continue

        src = chunk.metadata.get("source", "unknown")
        chunk_num = chunk_counter_by_source.get(src, 0)
        chunk_counter_by_source[src] = chunk_num + 1

        meta = dict(chunk.metadata)
        meta["chunk_index"] = chunk_num
        meta["content_hash"] = compute_content_hash(content)

        enriched_chunks.append(Document(page_content=content, metadata=meta))

    logger.info("Generated %d valid chunk(s) from %d original document(s).", len(enriched_chunks), len(documents))
    return enriched_chunks


# ─────────────────────────────────────────────────────────────────────────────
# 5. ChromaDB Ingestion with Batched Embedding Generation
# ─────────────────────────────────────────────────────────────────────────────

def ingest_to_chromadb(
    chunks: List[Document],
    chroma_dir: str,
    collection_name: str,
    ollama_url: str,
    batch_size: int = 64
) -> Chroma:
    """
    Initializes nomic-embed-text via OllamaEmbeddings and saves chunks
    into a persistent local ChromaDB instance in batches.
    """
    os.makedirs(chroma_dir, exist_ok=True)

    logger.info("Initializing OllamaEmbeddings(model='nomic-embed-text', base_url='%s')...", ollama_url)
    embeddings = OllamaEmbeddings(
        model="nomic-embed-text",
        base_url=ollama_url
    )

    logger.info(
        "Initializing local ChromaDB (directory: '%s', collection: '%s')...",
        chroma_dir, collection_name
    )

    vector_store = Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=chroma_dir
    )

    total_chunks = len(chunks)
    if total_chunks == 0:
        logger.warning("No chunks to insert into ChromaDB.")
        return vector_store

    logger.info("Writing %d chunk(s) to ChromaDB in batches of %d...", total_chunks, batch_size)

    total_batches = (total_chunks + batch_size - 1) // batch_size
    progress_bar = tqdm(total=total_chunks, desc="Ingesting to ChromaDB", unit="chunk")

    for i in range(0, total_chunks, batch_size):
        batch = chunks[i : i + batch_size]
        batch_idx = (i // batch_size) + 1

        # Deterministic IDs to avoid duplicates if re-indexed
        ids = [
            f"{doc.metadata.get('filename', 'doc')}_{doc.metadata.get('chunk_index', idx)}_{doc.metadata.get('content_hash', compute_content_hash(doc.page_content))}"
            for idx, doc in enumerate(batch, start=i)
        ]

        # Retry logic with backoff for Ollama/Chroma resilience
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                vector_store.add_documents(documents=batch, ids=ids)
                break
            except Exception as batch_err:
                if attempt < max_retries:
                    backoff = attempt * 2
                    logger.warning(
                        "Batch %d/%d failed (attempt %d/%d): %s. Retrying in %ds...",
                        batch_idx, total_batches, attempt, max_retries, batch_err, backoff
                    )
                    time.sleep(backoff)
                else:
                    logger.error("Batch %d/%d permanently failed after %d retries: %s", batch_idx, total_batches, max_retries, batch_err)

        progress_bar.update(len(batch))

    progress_bar.close()

    # Backwards compatibility check for older Chroma versions
    if hasattr(vector_store, "persist"):
        try:
            vector_store.persist()
        except Exception:
            pass

    logger.info("Vector store successfully written and persisted to: %s", chroma_dir)
    return vector_store


# ─────────────────────────────────────────────────────────────────────────────
# 6. Verification & Test Query
# ─────────────────────────────────────────────────────────────────────────────

def verify_retrieval(vector_store: Chroma, query: str = "PM-KISAN scheme eligibility and benefits", k: int = 3):
    """Executes a sample similarity search to confirm that embeddings and storage work properly."""
    logger.info("\n" + "=" * 65)
    logger.info("🔍 RUNNING SANITY VERIFICATION QUERY")
    logger.info("   Query: '%s'", query)
    logger.info("=" * 65)

    try:
        results = vector_store.similarity_search_with_score(query, k=k)
        if not results:
            logger.warning("No results returned for query '%s'.", query)
            return

        for rank, (doc, score) in enumerate(results, start=1):
            fn = doc.metadata.get("filename", "unknown")
            chunk_idx = doc.metadata.get("chunk_index", 0)
            preview = doc.page_content.replace("\n", " ")[:200]
            logger.info("Result #%d (Score / Distance: %.4f)", rank, score)
            logger.info("  File: %s (Chunk #%s)", fn, chunk_idx)
            logger.info("  Content: %s...", preview)
            logger.info("-" * 65)

        logger.info("Vector retrieval verified successfully!")
    except Exception as query_err:
        logger.error("Verification query encountered an error: %s", query_err)


# ─────────────────────────────────────────────────────────────────────────────
# 7. Main Pipeline Runner
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline(
    data_dir_path: str = "src/data",
    chroma_dir_path: str = "./chroma_db",
    collection_name: str = "kisansahay_knowledge",
    ollama_url: str = "http://localhost:11434",
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    batch_size: int = 64,
    reset_collection: bool = False,
    query_test: Optional[str] = None
):
    """Orchestrates the entire ingestion workflow."""
    start_time = time.time()
    data_dir = Path(data_dir_path).resolve()
    chroma_dir = Path(chroma_dir_path).resolve()

    print("\n" + "═" * 65)
    print("🌾 KISANSAHAY DATA INGESTION PIPELINE (Python + LangChain)")
    print("═" * 65)
    print(f" • Source Directory : {data_dir}")
    print(f" • Vector Database  : {chroma_dir} (Collection: {collection_name})")
    print(f" • Embedding Model  : nomic-embed-text (Ollama: {ollama_url})")
    print(f" • Token Chunking   : {chunk_size} tokens (overlap: {chunk_overlap} tokens)")
    print(f" • Batch Size       : {batch_size} chunks")
    print("═" * 65 + "\n")

    # Step 1: Health check Ollama
    if not check_ollama_service(ollama_url, "nomic-embed-text"):
        logger.error("Pipeline aborted: Ollama service or 'nomic-embed-text' model is not available.")
        sys.exit(1)

    # Step 2: Handle collection reset if requested
    if reset_collection and chroma_dir.exists():
        logger.info("Reset requested. Clearing existing ChromaDB collection...")
        import shutil
        try:
            shutil.rmtree(chroma_dir)
            logger.info("Cleared directory: %s", chroma_dir)
        except Exception as e:
            logger.warning("Could not clear %s: %s", chroma_dir, e)

    # Step 3: Load files with multi-format error handling
    logger.info("Step 1/4: Loading and sanitizing data files from '%s'...", data_dir)
    documents, stats = load_all_files(data_dir)

    if not documents:
        logger.error("No valid documents could be loaded. Ingestion stopped.")
        sys.exit(1)

    # Step 4: Token-based text chunking (500 tokens, 50 token overlap)
    logger.info("Step 2/4: Chunking documents into 500-token chunks...")
    splitter = create_token_text_splitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    chunks = chunk_documents(documents, splitter)

    if not chunks:
        logger.error("No chunks generated from documents.")
        sys.exit(1)

    # Step 5: Embed & Save into local ChromaDB
    logger.info("Step 3/4: Generating embeddings & saving to ChromaDB...")
    vector_store = ingest_to_chromadb(
        chunks=chunks,
        chroma_dir=str(chroma_dir),
        collection_name=collection_name,
        ollama_url=ollama_url,
        batch_size=batch_size
    )

    # Step 6: Verification Query
    logger.info("Step 4/4: Performing sanity verification query...")
    test_q = query_test or "PM-KISAN scheme eligibility and farmer benefits"
    verify_retrieval(vector_store, query=test_q)

    # Ingestion Summary Report
    elapsed = time.time() - start_time
    print("\n" + "═" * 65)
    print("🎉 INGESTION PIPELINE COMPLETE")
    print("═" * 65)
    print(f" • Total Files Scanned  : {stats['total_files']}")
    print(f" • Files Processed OK   : {stats['processed_files']}")
    print(f" • Files Skipped        : {stats['skipped_files']}")
    print(f" • Files with Errors    : {len(stats['failed_files'])}")
    for failed in stats["failed_files"]:
        print(f"     - {failed['file']}: {failed['error']}")
    print(f" • Documents Extracted  : {len(documents)}")
    for ftype, cnt in stats["documents_by_type"].items():
        print(f"     - {ftype or 'untyped'}: {cnt} documents")
    print(f" • 500-Token Chunks     : {len(chunks)}")
    print(f" • Vector Store Path    : {chroma_dir}")
    print(f" • Total Time Elapsed   : {elapsed:.2f} seconds ({elapsed / 60:.1f} mins)")
    print("═" * 65 + "\n")


# ─────────────────────────────────────────────────────────────────────────────
# 8. Command-Line Interface Entrypoint
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Ingest raw data files from src/data into a local ChromaDB vector store using LangChain & nomic-embed-text."
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default="src/data",
        help="Path to raw data directory (default: src/data)"
    )
    parser.add_argument(
        "--chroma-dir",
        type=str,
        default="./chroma_db",
        help="Path to local ChromaDB persistence directory (default: ./chroma_db)"
    )
    parser.add_argument(
        "--collection-name",
        type=str,
        default="kisansahay_knowledge",
        help="ChromaDB collection name (default: kisansahay_knowledge)"
    )
    parser.add_argument(
        "--ollama-url",
        type=str,
        default="http://localhost:11434",
        help="Ollama base URL (default: http://localhost:11434)"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=500,
        help="Chunk size in tokens (default: 500)"
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=50,
        help="Chunk overlap in tokens (default: 50)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=64,
        help="Number of chunks per embedding batch (default: 64)"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear existing ChromaDB store before starting ingestion"
    )
    parser.add_argument(
        "--query-test",
        type=str,
        default=None,
        help="Optional test query to run after ingestion"
    )

    args = parser.parse_args()

    run_pipeline(
        data_dir_path=args.data_dir,
        chroma_dir_path=args.chroma_dir,
        collection_name=args.collection_name,
        ollama_url=args.ollama_url,
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
        batch_size=args.batch_size,
        reset_collection=args.reset,
        query_test=args.query_test
    )


if __name__ == "__main__":
    main()
