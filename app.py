#!/usr/bin/env python3
"""
KisanSahay Hybrid RAG Backend API (FastAPI)
===========================================
Hybrid Retrieval-Augmented Generation (Hybrid RAG) combining:
  1. Local ChromaDB Vector Store (via nomic-embed-text) for Official Uploaded Documents.
  2. DuckDuckGo Web Search Tool (via langchain-community) as an automatic fallback
     when local document similarity is low or the LLM identifies missing data.
  3. Llama 3.2 (via Ollama) with temperature=0.0 for grounded answer synthesis.
  4. CORS Middleware for web frontend integration (e.g. Sahay AI on http://localhost:3000).

Every answer explicitly states its source:
  - "Official Uploaded Documents"
  - "Web Search"

Run locally:
    python app.py
    # or
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import sys
import ssl
import time
import logging
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure project modules are on sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Pipeline imports
from scripts.retrieve_context import get_relevant_context, get_vector_store
from scripts.generate_answer import generate_answer_langchain, FALLBACK_MESSAGE
from scripts.ingest_data import check_ollama_service

# macOS LibreSSL compatibility safeguard for ddgs / duckduckgo-search
try:
    import ddgs.http_client2
    def _safe_ssl_context(verify):
        return ssl.create_default_context()
    ddgs.http_client2._get_random_ssl_context = _safe_ssl_context
except Exception:
    pass

# LangChain Community DuckDuckGo Tool
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("HybridRAG")

# ─────────────────────────────────────────────────────────────────────────────
# 1. FastAPI Application & CORS Configuration
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="KisanSahay Hybrid RAG API",
    description="Backend API featuring Hybrid RAG (Local ChromaDB + DuckDuckGo Web Search + Llama 3.2)",
    version="2.0.0"
)

# Configure CORS Middleware to allow requests from web frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Express / Node dev server
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "*"                        # Permissive for local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration settings
CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "kisansahay_knowledge")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.2")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

# Cosine distance threshold in ChromaDB:
# Smaller is closer / more relevant. Values <= 0.65 represent high confidence.
# Values > 0.65 represent weak or irrelevant matches.
SIMILARITY_DISTANCE_THRESHOLD = float(os.getenv("DISTANCE_THRESHOLD", "0.65"))

# Initialize DuckDuckGo search tool
ddg_search_tool = DuckDuckGoSearchRun()


# ─────────────────────────────────────────────────────────────────────────────
# 2. Web Search Prompt Template
# ─────────────────────────────────────────────────────────────────────────────

WEB_SYSTEM_PROMPT = """You are a helpful and reliable AI assistant for KisanSahay.
The user's query could not be answered from the official local uploaded documents, so an automatic live DuckDuckGo web search was performed.
Answer the user query accurately, clearly, and concisely based ONLY on the provided web search results.

Instructions:
1. Synthesize a direct, factual answer using the web results.
2. Present relevant scheme names, eligibility rules, subsidy amounts, or farming advice if present in the results.
3. If the web search results are completely unrelated or do not contain enough facts to answer the question, state that clearly."""

WEB_HUMAN_PROMPT = """Web Search Results:
{context}

User Query:
{query}

Answer:"""

web_prompt_template = ChatPromptTemplate.from_messages([
    ("system", WEB_SYSTEM_PROMPT),
    ("human", WEB_HUMAN_PROMPT)
])


def generate_answer_from_web(query: str, web_context: str, model: str = LLM_MODEL, ollama_url: str = OLLAMA_URL) -> str:
    """Generates an answer from DuckDuckGo web search results using Llama 3.2."""
    llm = ChatOllama(
        model=model,
        base_url=ollama_url,
        temperature=0.0
    )
    chain = web_prompt_template | llm | StrOutputParser()
    response = chain.invoke({"context": web_context, "query": query})
    return response.strip()


def is_missing_information(answer: str) -> bool:
    """
    Checks if the local LLM determined that the required information was missing
    from the uploaded documents.
    """
    if not answer or not answer.strip():
        return True
    lowered = answer.lower()
    missing_indicators = [
        "couldn't find that information in the uploaded data",
        "could not find that information in the uploaded data",
        "not mentioned in the provided context",
        "not found in the uploaded data",
        "not present in the provided context",
        "not provided in the context",
        "does not contain information",
        "no information provided"
    ]
    return any(indicator in lowered for indicator in missing_indicators)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    user_query: str = Field(
        ...,
        min_length=1,
        example="How much money is provided to farmer families under PM-KISAN?",
        description="The question or prompt submitted by the user."
    )
    top_k: Optional[int] = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of relevant context chunks to retrieve from ChromaDB."
    )
    include_context: Optional[bool] = Field(
        default=False,
        description="Whether to include the raw context chunks (local or web) in the JSON response."
    )
    force_web_search: Optional[bool] = Field(
        default=False,
        description="Optionally force a web search bypass of local documents."
    )


class ChatResponse(BaseModel):
    answer: str = Field(..., description="The generated answer with clear source attribution.")
    user_query: str = Field(..., description="The original user query.")
    source_type: str = Field(
        ...,
        description="The origin of the information: 'Official Uploaded Documents' or 'Web Search'."
    )
    confidence_score: Optional[float] = Field(
        default=None,
        description="Local ChromaDB distance score (lower is more relevant; null if web search used)."
    )
    context: Optional[str] = Field(
        default=None,
        description="The context chunks (local or web) used to generate the answer."
    )
    duration_ms: float = Field(..., description="Total pipeline latency in milliseconds.")
    status: str = Field(default="success", description="Status code (success, fallback, no_results, error).")


class HealthResponse(BaseModel):
    status: str
    ollama_online: bool
    llm_model: str
    embed_model: str
    chroma_db_dir: str
    vector_count: int
    web_search_available: bool


# ─────────────────────────────────────────────────────────────────────────────
# 4. API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Info"])
def root_info():
    """Returns API overview and links."""
    return {
        "service": "KisanSahay Hybrid RAG Backend API",
        "version": "2.0.0",
        "mode": "Hybrid (ChromaDB + DuckDuckGo + Llama 3.2)",
        "docs_url": "/docs",
        "endpoints": {
            "POST /chat": "Submit a question to the Hybrid RAG pipeline",
            "GET /health": "Verify Ollama, ChromaDB, and Web Search status"
        }
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Verifies Ollama availability, ChromaDB statistics, and Web Search functionality."""
    ollama_ok = check_ollama_service(OLLAMA_URL, LLM_MODEL)
    doc_count = 0

    try:
        vs = get_vector_store(
            chroma_dir=CHROMA_DIR,
            collection_name=COLLECTION_NAME,
            ollama_url=OLLAMA_URL,
            embed_model=EMBED_MODEL
        )
        doc_count = vs._collection.count()
    except Exception as e:
        logger.warning("Could not read ChromaDB count: %s", e)

    return HealthResponse(
        status="healthy" if ollama_ok else "degraded",
        ollama_online=ollama_ok,
        llm_model=LLM_MODEL,
        embed_model=EMBED_MODEL,
        chroma_db_dir=CHROMA_DIR,
        vector_count=doc_count,
        web_search_available=True
    )


@app.post("/chat", response_model=ChatResponse, tags=["Hybrid RAG"])
def chat_endpoint(request: ChatRequest):
    """
    Hybrid RAG Endpoint:
    1. First searches the local ChromaDB vector store.
    2. If the local search returns a low-confidence result (distance > threshold)
       OR the LLM decides the information is missing from the uploaded data:
       --> Automatically performs a DuckDuckGo web search.
    3. Returns the final answer with explicit source attribution:
       - 'Official Uploaded Documents'
       - 'Web Search'
    """
    start_time = time.time()
    query = request.user_query.strip()
    logger.info("═" * 60)
    logger.info("📥 Incoming /chat query: '%s' (top_k=%d, force_web=%s)", query, request.top_k, request.force_web_search)

    source_type = None
    final_answer = None
    context_used = None
    best_distance = None

    try:
        vector_store = get_vector_store(
            chroma_dir=CHROMA_DIR,
            collection_name=COLLECTION_NAME,
            ollama_url=OLLAMA_URL,
            embed_model=EMBED_MODEL
        )

        # ─────────────────────────────────────────────────────────────────────
        # Step 1: Search Local ChromaDB
        # ─────────────────────────────────────────────────────────────────────
        if not request.force_web_search:
            logger.info("🔍 Step 1: Searching local ChromaDB...")
            docs_with_scores = vector_store.similarity_search_with_score(query, k=request.top_k)

            if docs_with_scores:
                best_doc, best_distance = docs_with_scores[0]
                logger.info("   ChromaDB best match distance: %.4f (threshold: <= %.2f)", best_distance, SIMILARITY_DISTANCE_THRESHOLD)

                # Check if local retrieval confidence is high
                if best_distance <= SIMILARITY_DISTANCE_THRESHOLD:
                    local_chunks = [doc.page_content.strip() for doc, _ in docs_with_scores if doc.page_content]
                    local_context = "\n\n---\n\n".join(local_chunks)

                    logger.info("   Testing local context with Llama 3.2...")
                    raw_local_answer = generate_answer_langchain(
                        query=query,
                        context=local_context,
                        model=LLM_MODEL,
                        ollama_url=OLLAMA_URL,
                        temperature=0.0
                    )

                    # Check if the LLM was able to answer from local documents
                    if not is_missing_information(raw_local_answer):
                        logger.info("✅ Answer found in Official Uploaded Documents!")
                        source_type = "Official Uploaded Documents"
                        context_used = local_context
                        final_answer = (
                            f"{raw_local_answer}\n\n"
                            f"---\n"
                            f"📌 **Source:** Official Uploaded Documents"
                        )
                    else:
                        logger.info("⚠️ LLM decided information is missing from local context. Triggering Web Search fallback...")
                else:
                    logger.info("⚠️ Low-confidence local match (distance: %.4f > %.2f). Triggering Web Search fallback...", best_distance, SIMILARITY_DISTANCE_THRESHOLD)
            else:
                logger.info("⚠️ ChromaDB returned 0 documents. Triggering Web Search fallback...")
        else:
            logger.info("⚡ force_web_search is enabled. Skipping local search...")

        # ─────────────────────────────────────────────────────────────────────
        # Step 2: Fallback to DuckDuckGo Web Search
        # ─────────────────────────────────────────────────────────────────────
        if source_type is None:
            logger.info("🌐 Step 2: Executing DuckDuckGo Web Search for: '%s'...", query)
            try:
                web_results = ddg_search_tool.run(query)
            except Exception as search_err:
                logger.warning("DuckDuckGo search error: %s", search_err)
                web_results = ""

            if web_results and web_results.strip():
                logger.info("   Web search returned %d characters. Synthesizing answer with Llama 3.2...", len(web_results))
                raw_web_answer = generate_answer_from_web(
                    query=query,
                    web_context=web_results,
                    model=LLM_MODEL,
                    ollama_url=OLLAMA_URL
                )
                source_type = "Web Search"
                context_used = web_results
                final_answer = (
                    f"{raw_web_answer}\n\n"
                    f"---\n"
                    f"🌐 **Source:** Web Search"
                )
                logger.info("✅ Answer synthesized from Web Search!")
            else:
                logger.warning("❌ DuckDuckGo search yielded no results.")
                source_type = "Web Search"
                final_answer = (
                    "I'm sorry, but I couldn't find that information in the official uploaded documents, "
                    "and a live web search did not return sufficient results.\n\n"
                    "---\n"
                    "🌐 **Source:** Web Search"
                )

        elapsed = (time.time() - start_time) * 1000
        logger.info("⏱️ Request completed in %.2f ms (Source: %s)", elapsed, source_type)
        logger.info("═" * 60)

        return ChatResponse(
            answer=final_answer,
            user_query=query,
            source_type=source_type,
            confidence_score=round(best_distance, 4) if best_distance is not None else None,
            context=context_used if request.include_context else None,
            duration_ms=round(elapsed, 2),
            status="success"
        )

    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ollama service is unreachable. Please ensure Ollama is running ('ollama serve')."
        )
    except Exception as err:
        logger.error("Error processing /chat request: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating the answer: {str(err)}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 5. Entrypoint
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("FASTAPI_PORT", "8000"))
    logger.info("Starting KisanSahay Hybrid RAG FastAPI server on http://0.0.0.0:%d", port)
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
