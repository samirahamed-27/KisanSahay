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

# macOS / Apple Silicon ChromaDB SQLite compatibility shim
try:
    __import__("pysqlite3")
    sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")
except (ImportError, KeyError):
    pass
import ssl
import time
import logging
import re
import json
import traceback
import concurrent.futures
import urllib.parse
import asyncio
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List

import httpx
import hmac
from fastapi import FastAPI, HTTPException, status, Request, Response, Header, Depends, Query
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
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
from src.rag import retrieve, evaluate_eligibility, generate_with_gemini

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
        "http://localhost:3001",   # Express dev server (PORT=3001)
        "http://localhost:5173",   # Vite dev server
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "null",                    # file:/// origin
        "*"
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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

WEB_SYSTEM_PROMPT = """You are Sahay AI, the agricultural finance assistant for KisanSahay.
Your primary goal is absolute factual reliability. Answer the user query based strictly on the provided web search results below.

CRITICAL FACTUAL RELIABILITY & GROUNDING RULES:
1. Synthesize a direct, factual answer using ONLY the provided web search results. Do NOT guess, extrapolate, or use outside knowledge.
2. If the answer is stated in the web results, cite the specific source title or domain.
3. If the information is NOT present in the search results, do NOT attempt to guess or use general knowledge. Instead, respond with:
"I cannot find the specific answer to this in the official directives. Please verify this detail with your local bank branch or Krishi Vigyan Kendra."
4. Prioritize accuracy over helpfulness; it is better to admit you don't know than to provide a vague or incorrect answer.

RESPONSE FORMAT — FOR LOAN OR GOVERNMENT SCHEME QUERIES:
Avoid vague or generic responses. When explaining a loan or government scheme, you must provide:

**📋 Eligibility Criteria**
You are eligible if you meet these specific conditions:
• [List each specific condition as a separate bullet point]
• If a specific condition is not specified in the data, state exactly what is missing rather than giving a general answer: "⚠️ [Condition name] not specified in official directives."

**📄 Required Documentation**
• [List each required document as a separate bullet point]
• If the document list is not specified in your data, state exactly what is missing: "⚠️ Required document list not specified in official directives. Please verify with your local bank branch or Krishi Vigyan Kendra."

**🪜 Step-by-Step Instructions on How to Apply**
1. [First step]
2. [Second step]
3. [Continue for every subsequent step]
• If application steps are not specified in your data, state exactly what is missing: "⚠️ Application procedure not specified in official directives. Visit the official portal or nearest bank branch."

BANNED PHRASES — NEVER USE:
- "you may be eligible" → MUST use: "You are eligible if you meet these specific conditions: [List Conditions]"
- "you might qualify" → State exact conditions
- "generally" / "typically" / "usually" → Only state confirmed facts
- "contact your bank for details" (as a standalone answer) → Always state what IS confirmed first, then state exactly what is missing

LANGUAGE RULE — MANDATORY:
You are Sahay AI. You must detect the language used by the user in their query and respond exclusively in that same language. Do not switch languages mid-conversation or provide responses in Hindi unless the user specifically asks in Hindi or requests a translation. If the user's language is ambiguous, default to English."""

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
# 2b. Dynamic Domain, Safety & FAQ Engine
#     Powered entirely by dynamic backend data files (NOT hardcoded in code):
#       1. src/data/duckduckgo_moderation_rules.json (DuckDuckGo SafeSearch scratch data)
#       2. src/data/domain_config.json (allowed domains, app identity, off-topic rules)
#       3. src/data/sahayKnowledgeBase.json (curated 50 FAQ questions)
# ─────────────────────────────────────────────────────────────────────────────

DOMAIN_CONFIG_PATH = BASE_DIR / "src" / "data" / "domain_config.json"
MODERATION_RULES_PATH = BASE_DIR / "src" / "data" / "duckduckgo_moderation_rules.json"
KB_PATH = BASE_DIR / "src" / "data" / "sahayKnowledgeBase.json"

# Dynamic runtime caches with automatic mtime / TTL refresh
_config_cache: dict = {}
_moderation_cache: dict = {}
_kb_cache: list = []
_cache_loaded_at: float = 0.0
_cache_mtimes: dict = {}
_CACHE_CHECK_INTERVAL = 1.0  # seconds between stat() checks


def _load_dynamic_backend_data() -> None:
    """
    Dynamically loads all rules, scratch data, and FAQ questions from backend JSON files.
    Auto-detects file updates via mtime so edits to JSON take effect without server restart.
    """
    global _config_cache, _moderation_cache, _kb_cache, _cache_loaded_at, _cache_mtimes
    now = time.time()
    if (now - _cache_loaded_at) < _CACHE_CHECK_INTERVAL and _config_cache and _moderation_cache and _kb_cache:
        return

    # 1. Load domain configuration
    try:
        if DOMAIN_CONFIG_PATH.exists():
            cur_mtime = DOMAIN_CONFIG_PATH.stat().st_mtime
            if _cache_mtimes.get("domain") != cur_mtime or not _config_cache:
                with open(DOMAIN_CONFIG_PATH, "r", encoding="utf-8") as f:
                    _config_cache = json.load(f)
                _cache_mtimes["domain"] = cur_mtime
                logger.info("✅ domain_config.json loaded dynamically (%d identity phrases, %d keyword groups)",
                            len(_config_cache.get("identity_phrases", [])),
                            len(_config_cache.get("domain_keywords", {})))
    except Exception as e:
        logger.warning("⚠️ Error reading domain_config.json: %s", e)

    # 2. Load DuckDuckGo-inspired moderation rules & scratch data
    try:
        if MODERATION_RULES_PATH.exists():
            cur_mtime = MODERATION_RULES_PATH.stat().st_mtime
            if _cache_mtimes.get("moderation") != cur_mtime or not _moderation_cache:
                with open(MODERATION_RULES_PATH, "r", encoding="utf-8") as f:
                    _moderation_cache = json.load(f)
                _cache_mtimes["moderation"] = cur_mtime
                logger.info("✅ duckduckgo_moderation_rules.json loaded dynamically (%d bad words, %d adult terms, %d scams)",
                            len(_moderation_cache.get("profanity_and_bad_words", [])),
                            len(_moderation_cache.get("adult_and_nsfw_terms", [])),
                            len(_moderation_cache.get("financial_scams_and_predatory_fraud", [])))
    except Exception as e:
        logger.warning("⚠️ Error reading duckduckgo_moderation_rules.json: %s", e)

    # 3. Load curated 50 FAQ questions
    try:
        if KB_PATH.exists():
            cur_mtime = KB_PATH.stat().st_mtime
            if _cache_mtimes.get("kb") != cur_mtime or not _kb_cache:
                with open(KB_PATH, "r", encoding="utf-8") as f:
                    _kb_cache = json.load(f)
                _cache_mtimes["kb"] = cur_mtime
                logger.info("✅ sahayKnowledgeBase.json loaded dynamically (%d FAQ items)", len(_kb_cache))
    except Exception as e:
        logger.warning("⚠️ Error reading sahayKnowledgeBase.json: %s", e)

    _cache_loaded_at = now


# ── Pipeline Step 1: DuckDuckGo-style Content Moderation & Bad Text ──────────

def check_duckduckgo_safety(query: str, lang: str = "en") -> Tuple[bool, Optional[str]]:
    """
    Checks input against dynamic scratch data in duckduckgo_moderation_rules.json:
    - Bad words and profanities (English + Hindi/Hinglish)
    - Adult and NSFW terms
    - Violence and harmful activities
    - Hate speech and harassment
    - Predatory financial scams and fraudulent loan traps
    - Gambling and betting
    - Prompt injections and jailbreak attempts

    Uses regex word boundaries for single-word tokens to avoid false positives (e.g. passbook != ass).
    Returns (is_unsafe, localized_action_response).
    """
    _load_dynamic_backend_data()
    q = query.lower().strip()
    actions = _moderation_cache.get("action_responses", {})

    category_mapping = [
        ("profanity_and_bad_words", "profanity"),
        ("adult_and_nsfw_terms", "adult"),
        ("violence_and_harmful", "harmful"),
        ("hate_speech_and_harassment", "default_blocked"),
        ("financial_scams_and_predatory_fraud", "scam"),
        ("gambling_and_betting", "default_blocked"),
        ("prompt_injection_and_malicious", "default_blocked")
    ]

    for list_key, action_key in category_mapping:
        terms = _moderation_cache.get(list_key, [])
        for term in terms:
            t = term.lower().strip()
            if not t:
                continue
            matched = False
            if " " in t or "-" in t:
                if t in q:
                    matched = True
            else:
                if re.search(r"\b" + re.escape(t) + r"\b", q):
                    matched = True

            if matched:
                logger.info("🛡️ DuckDuckGo safety filter matched: category=%s, term='%s'", list_key, t)
                resp_map = actions.get(action_key, actions.get("default_blocked", {}))
                return True, resp_map.get(lang, resp_map.get("en", "⚠️ This query cannot be processed due to content safety limitations."))

    return False, None


# ── Pipeline Step 2: KisanSahay App Identity Check ───────────────────────────

def is_identity_query(query: str) -> bool:
    """True if user is asking about KisanSahay app, identity, capabilities, or offering a greeting."""
    _load_dynamic_backend_data()
    q = query.lower().strip()

    # Friendly standalone greetings (e.g. "hello", "hi", "namaste", "pranam", "hey", "ram ram")
    words = q.split()
    if len(words) <= 2 and any(g == q or q.startswith(g + " ") for g in ["hello", "hi", "hey", "namaste", "pranam", "ram ram"]):
        return True

    # If the user is asking about a specific agricultural/financial topic, do NOT hijack as identity query
    strong_domain_terms = [
        "loan", "rin", "karz", "kcc", "pm-kisan", "pmkisan", "pmfby", "bima",
        "scheme", "yojana", "tractor", "subsidy", "fertilizer", "soil", "crop",
        "fasal", "kheti", "dastevez", "document", "khasra", "khatauni", "aadhaar",
        "interest", "byaj", "dairy", "animal husbandry", "pashu"
    ]
    has_domain_topic = any(dt in q for dt in strong_domain_terms)
    if has_domain_topic:
        explicit_identity = [
            "what is kisansahay", "what is sahay", "about kisansahay", "kisansahay app",
            "tell me about kisansahay", "sahay ai", "who are you"
        ]
        return any(ei in q for ei in explicit_identity)

    phrases = _config_cache.get("identity_phrases", [])
    for phrase in phrases:
        p = phrase.lower().strip()
        if not p:
            continue
        if re.search(r"\b" + re.escape(p) + r"\b", q):
            return True

    return False


def get_identity_response(lang: str = "en") -> str:
    """Returns the KisanSahay intro from domain_config.json."""
    _load_dynamic_backend_data()
    responses = _config_cache.get("identity_response", {})
    return responses.get(lang, responses.get("en", "Hello! I'm Sahay AI, your agricultural assistant."))


# ── Pipeline Step 3: First 50 Questions Check (sahayKnowledgeBase.json) ──────

def _normalize_text_for_match(text: str) -> str:
    """Normalizes acronyms and punctuation for high-precision FAQ matching."""
    t = text.lower()
    t = re.sub(r"pm[\s\-_]*kisan", "pmkisan", t)
    t = re.sub(r"kisan[\s\-_]*credit[\s\-_]*card", "kcc", t)
    t = re.sub(r"[^\w\s]", " ", t)
    return " ".join(t.split())


def find_faq_match(query: str, lang: str = "en") -> Optional[Tuple[str, str]]:
    """
    Evaluates the user query against the 50 curated FAQ questions from sahayKnowledgeBase.json.
    Returns (answer, faq_id) if score >= min_score_to_return, else None.
    All scoring parameters and stop words are loaded dynamically from domain_config.json.
    """
    _load_dynamic_backend_data()
    if not _kb_cache:
        return None

    cfg = _config_cache.get("faq_match_config", {})
    min_score = cfg.get("min_score_to_return", 35)
    exact_bonus = cfg.get("exact_match_bonus", 150)
    q_contains = cfg.get("question_contains_bonus", 80)
    kw_exact = cfg.get("keyword_exact_bonus", 70)
    kw_partial = cfg.get("keyword_partial_bonus", 35)
    tok_bonus = cfg.get("token_match_bonus", 12)
    stop_words = set(cfg.get("stop_words", []))

    q_norm = _normalize_text_for_match(query)
    words = [w for w in q_norm.split() if w not in stop_words and len(w) >= 3]
    # Guard against matching single short words or empty tokens
    if not words and len(q_norm) < 4:
        return None

    best_score = 0
    best_item = None

    for item in _kb_cache:
        score = 0
        q_en = _normalize_text_for_match(item.get("question_en", ""))
        q_hi = _normalize_text_for_match(item.get("question_hi", ""))

        # 1. Exact match on normalized question
        if q_norm == q_en or q_norm == q_hi:
            score += exact_bonus
        # Whole FAQ question contained in user's query
        elif (len(q_en) > 10 and q_en in q_norm) or (len(q_hi) > 5 and q_hi in q_norm):
            score += q_contains
        # Multi-word user query contained in question with word boundaries
        elif len(words) >= 2 and (
            re.search(r"\b" + re.escape(q_norm) + r"\b", q_en) or
            re.search(r"\b" + re.escape(q_norm) + r"\b", q_hi)
        ):
            score += q_contains

        # 2. Keyword matching with word boundaries & plural/stem matching
        q_stem = re.sub(r"\b(\w+?)s\b", r"\1", q_norm)
        for kw in item.get("keywords", []):
            kw_norm = _normalize_text_for_match(kw)
            if not kw_norm:
                continue
            kw_stem = re.sub(r"\b(\w+?)s\b", r"\1", kw_norm)
            if q_norm == kw_norm or q_stem == kw_stem:
                score += kw_exact
            elif re.search(r"\b" + re.escape(kw_norm) + r"\b", q_norm) or re.search(r"\b" + re.escape(kw_stem) + r"\b", q_stem):
                score += kw_partial
            elif len(words) >= 2 and (re.search(r"\b" + re.escape(q_norm) + r"\b", kw_norm) or re.search(r"\b" + re.escape(q_stem) + r"\b", kw_stem)):
                score += kw_partial

        # 3. Content token overlap
        q_en_words = set(q_en.split())
        q_hi_words = set(q_hi.split())
        for w in words:
            if w in q_en_words:
                score += tok_bonus
            if w in q_hi_words:
                score += tok_bonus

        if score > best_score:
            best_score = score
            best_item = item

    if best_score >= min_score and best_item:
        answer = best_item.get(f"answer_{lang}", best_item.get("answer_en", ""))
        logger.info("📚 First 50 FAQ match: '%s' (score=%d, lang=%s)", best_item.get("id"), best_score, lang)
        return answer, best_item.get("id", "faq_item")

    return None


# ── Pipeline Step 4: Domain Relevance Verification (Farmer / Loans / Schemes) ─

def is_related_to_farmer_or_loans(text: str) -> bool:
    """
    Checks if a query or search result relates to farmer, agriculture, loans, or schemes.
    Uses dynamic off_topic_indicators and domain_keywords with word boundaries.
    """
    _load_dynamic_backend_data()
    q = text.lower().strip()

    # Check off-topic indicators (jobs, cricket, movies, bollywood, coding, etc.)
    off_topics = _config_cache.get("off_topic_indicators", [])
    for ot in off_topics:
        ot_l = ot.lower().strip()
        if re.search(r"\b" + re.escape(ot_l) + r"\b", q):
            # Only allow if a strong agricultural/loan keyword is also explicitly present
            strong_agri = ["kcc", "pm-kisan", "pmkisan", "kisan", "farmer", "krishi", "fasal", "kheti", "rin", "karz"]
            if not any(ak in q for ak in strong_agri):
                return False

    # Check allowed domain keywords across all categories
    kw_map = _config_cache.get("domain_keywords", {})
    for key, words in kw_map.items():
        if key.startswith("_") or not isinstance(words, list):
            continue
        for kw in words:
            kw_l = kw.lower().strip()
            if re.search(r"\b" + re.escape(kw_l) + r"\b", q):
                return True

    # Friendly short greetings (<= 2 words like "hello", "namaste", "pranam")
    words = q.split()
    if len(words) <= 2 and any(g in q for g in ["hello", "hi", "namaste", "pranam", "hey", "ram ram"]):
        return True

    # Explicit farmer tools / local services / personal vault
    try:
        if is_explicit_kvk_query(q) or is_explicit_soil_query(q) or is_explicit_training_query(q) or is_explicit_mandi_query(q) or is_vault_query(q):
            return True
    except Exception:
        pass

    return False


def get_off_topic_response(lang: str = "en") -> str:
    """Returns the polite domain restriction response from domain_config.json."""
    _load_dynamic_backend_data()
    responses = _config_cache.get("off_topic_response", {})
    return responses.get(lang, responses.get("en", "I can only help with agricultural loans, government schemes, and the KisanSahay app."))


MAX_CHAT_QUERY_CHARS = 4000
KVK_SEARCH_TIMEOUT_SEC = 7
KVK_WEB_SEARCH_ENABLED = os.getenv("KVK_WEB_SEARCH", "1").strip().lower() not in ("0", "false", "off", "no")

_PLACE_TO_STATE = {
    "kanpur": "Uttar Pradesh",
    "lucknow": "Uttar Pradesh",
    "varanasi": "Uttar Pradesh",
    "prayagraj": "Uttar Pradesh",
    "allahabad": "Uttar Pradesh",
    "agra": "Uttar Pradesh",
    "meerut": "Uttar Pradesh",
    "noida": "Uttar Pradesh",
    "ghaziabad": "Uttar Pradesh",
    "bareilly": "Uttar Pradesh",
    "aligarh": "Uttar Pradesh",
    "gorakhpur": "Uttar Pradesh",
    "jhansi": "Uttar Pradesh",
    "patna": "Bihar",
    "gaya": "Bihar",
    "muzaffarpur": "Bihar",
    "jaipur": "Rajasthan",
    "ludhiana": "Punjab",
    "amritsar": "Punjab",
    "jalandhar": "Punjab",
    "chandigarh": "Chandigarh",
    "nagpur": "Maharashtra",
    "pune": "Maharashtra",
    "nashik": "Maharashtra",
    "ahmedabad": "Gujarat",
    "surat": "Gujarat",
    "hisar": "Haryana",
    "karnal": "Haryana",
    "rohtak": "Haryana",
    "bhopal": "Madhya Pradesh",
    "indore": "Madhya Pradesh",
    "sehore": "Madhya Pradesh",
    "dewas": "Madhya Pradesh",
    "gwalior": "Madhya Pradesh",
    "jabalpur": "Madhya Pradesh",
    "ujjain": "Madhya Pradesh",
    "raipur": "Chhattisgarh",
    "ranchi": "Jharkhand",
    "bhubaneswar": "Odisha",
    "cuttack": "Odisha",
    "kolkata": "West Bengal",
    "howrah": "West Bengal",
    "guwahati": "Assam",
    "hyderabad": "Telangana",
    "warangal": "Telangana",
    "bengaluru": "Karnataka",
    "bangalore": "Karnataka",
    "mysuru": "Karnataka",
    "chennai": "Tamil Nadu",
    "coimbatore": "Tamil Nadu",
    "madurai": "Tamil Nadu",
}

_KNOWN_PLACES = tuple(sorted(set(
    [d.lower() for d in [
        "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani",
        "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara",
        "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior",
        "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni",
        "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur",
        "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa",
        "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur",
        "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"
    ]] + list(_PLACE_TO_STATE.keys())
), key=len, reverse=True))


def _friendly_chat_fallback(lang: str = "en") -> str:
    if (lang or "en").lower() == "hi":
        return "क्षमा करें, मुझे उत्तर नहीं मिल सका। कृपया पुनः प्रयास करें।"
    return "Sorry, I couldn't get an answer. Please try again."


def _ask_district_for_kvk(lang: str = "en") -> str:
    if (lang or "en").lower() == "hi":
        return (
            "कृपया अपना ज़िला बताएं ताकि मैं आपके नजदीकी कृषि विज्ञान केंद्र (KVK) का पता बता सकूँ। "
            "उदाहरण: कानपुर, सीहोर, भोपाल।"
        )
    return (
        "Please tell me your district so I can find the nearest Krishi Vigyan Kendra (KVK). "
        "For example: Kanpur, Sehore, or Bhopal."
    )


def extract_mentioned_location(query: str) -> Optional[str]:
    """Extracts a district/city the user actually named. Never guesses Sehore/MP."""
    if not query:
        return None
    q = query.strip()
    q_low = q.lower()

    from src.data_layer import extract_district_from_text
    mp_hit = extract_district_from_text(q)
    if mp_hit:
        return mp_hit

    for place in _KNOWN_PLACES:
        if re.search(r"\b" + re.escape(place) + r"\b", q_low):
            return place.title() if place not in ("noida",) else "Noida"

    m = re.search(
        r"(?:from|in|at|near|around|for)\s+([A-Za-z][A-Za-z\s]{2,40}?)(?:\s|$|,|\.|!|\?)",
        q,
        flags=re.IGNORECASE,
    )
    if m:
        candidate = re.sub(r"\b(district|city|town|area|market|india)\b", "", m.group(1), flags=re.IGNORECASE).strip(" ,.-")
        if len(candidate) >= 3 and candidate.lower() not in ("the", "my", "our", "me", "here", "there"):
            return candidate.title()
    return None


def _location_key(name: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().lower())


def is_explicit_kvk_query(query: str) -> bool:
    q = (query or "").lower()
    kvk_terms = ("kvk", "krishi vigyan kendra", "krishi vigyan kendr", "krishi vigyan")
    loc_terms = ("nearest", "near me", "address", "contact", "phone", "where is", "location")
    has_kvk = any(t in q for t in kvk_terms)
    if not has_kvk:
        return False
    if any(t in q for t in loc_terms):
        return True
    return has_kvk and not any(w in q for w in ["pm-kisan", "pmkisan", "kcc", "loan", "subsidy", "tractor", "bima"])


def is_explicit_soil_query(query: str) -> bool:
    q = (query or "").lower()
    return any(w in q for w in [
        "soil test", "soil testing", "mitti ki janch", "mitti parikshan", "soil lab",
        "testing lab", "soil health card lab", "soil sample"
    ])


def is_explicit_training_query(query: str) -> bool:
    q = (query or "").lower()
    if any(w in q for w in ["pm-kisan", "pmkisan", "kcc", "loan", "subsidy", "tractor", "bima"]):
        return False
    return any(w in q for w in [
        "training", "demonstration", "demonstrations", "workshop",
        "karyashala", "prashikshan", "training date", "training dates", "upcoming training"
    ])


def is_explicit_mandi_query(query: str) -> bool:
    q = (query or "").lower()
    if any(w in q for w in ["pm-kisan", "pmkisan", "kcc", "loan", "subsidy", "tractor", "bima", "eligible", "patra", "interest"]):
        return False
    return any(w in q for w in [
        "mandi", "mandi price", "mandi bhav", "mandi rate", "today's price",
        "todays price", "market price", "market rate"
    ])


def is_vault_query(query: str) -> bool:
    q = (query or "").lower()
    return any(p in q for p in [
        "saved vault", "vault document", "my vault", "documents do i have",
        "what documents do i have", "check my saved", "my saved document"
    ])


def format_vault_answer(farmer_profile: Optional[Dict[str, Any]], lang: str = "en") -> str:
    docs = (farmer_profile or {}).get("documents") or {}
    names: List[str] = []
    if isinstance(docs, dict):
        names = [str(k) for k, v in docs.items() if v]
    elif isinstance(docs, list):
        names = [str(d) for d in docs if d]
    if not names:
        if (lang or "en").lower() == "hi":
            return "आपके दस्तावेज़ वॉल्ट में अभी कोई सहेजा गया दस्तावेज़ नहीं मिला। Document Vault में जाकर अपने कागजात सुरक्षित कर सकते हैं।"
        return "I don't see any documents saved in your Document Vault yet. You can add them from the Document Vault tab."
    listed = "\n".join(f"• {n}" for n in names)
    if (lang or "en").lower() == "hi":
        return f"**🔒 आपके सुरक्षित वॉल्ट दस्तावेज़**\n\n{listed}"
    return f"**🔒 Your saved vault documents**\n\n{listed}"


def _records_match_location(records: List[Dict[str, Any]], location: str) -> List[Dict[str, Any]]:
    loc = _location_key(location)
    if not loc:
        return []
    matched = []
    for rec in records or []:
        blob = " ".join([
            str(rec.get("district") or ""),
            str(rec.get("state") or ""),
            str(rec.get("name") or ""),
            str(rec.get("address") or ""),
            str(rec.get("market_center") or ""),
            json.dumps(rec, ensure_ascii=False) if isinstance(rec, dict) else "",
        ]).lower()
        if loc in blob:
            matched.append(rec)
    return matched


def _run_with_timeout(func, timeout_sec: float, *args, **kwargs):
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        fut = pool.submit(func, *args, **kwargs)
        return fut.result(timeout=timeout_sec)


def search_kvk_info(
    query: str,
    lang: str = "en",
    requested_district: Optional[str] = None,
    requested_state: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Isolated KVK/location lookup. Called ONLY for explicit KVK/address questions.
    5–8s timeout, never raises, never guesses a district.
    """
    try:
        logger.info("🔎 search_kvk_info() start for query: '%s'", query)
        mentioned = extract_mentioned_location(query)
        location = mentioned or (requested_district.strip() if requested_district and requested_district.strip() else None)
        if not location:
            logger.info("🔎 search_kvk_info: location unclear — asking for district")
            return {
                "answer": _ask_district_for_kvk(lang),
                "source_type": "KisanSahay Guide",
                "status": "success",
                "last_updated": None,
                "source_name": None,
                "is_source_failing": False,
                "citations": None,
            }

        loc_key = _location_key(location)
        inferred_state = _PLACE_TO_STATE.get(loc_key)
        state_for_lookup = inferred_state or requested_state
        # Never force Madhya Pradesh when the user named a non-MP place.
        if loc_key not in ("sehore", "bhopal", "dewas", "indore", "gwalior", "jabalpur", "ujjain") and _location_key(state_for_lookup) == "madhya pradesh" and inferred_state is None:
            if mentioned:
                state_for_lookup = inferred_state  # may be None — do not default to MP

        from src.data_layer import (
            get_kvk_directory,
            format_kvk_direct_answer,
        )
        dl = get_admin_data_layer()
        lookup_res = get_kvk_directory(district=location, state=state_for_lookup, data_layer=dl)
        matched = _records_match_location(lookup_res.get("records") or [], location)
        lookup_res = dict(lookup_res)
        lookup_res["records"] = matched
        lookup_res["district"] = location
        if state_for_lookup:
            lookup_res["state"] = state_for_lookup

        if matched:
            logger.info("🔎 search_kvk_info: DB hit for %s (%d records)", location, len(matched))
            return {
                "answer": format_kvk_direct_answer(lookup_res, lang=lang),
                "source_type": "Direct Database Lookup (KVK Directory)",
                "status": "success",
                "last_updated": lookup_res.get("last_updated"),
                "source_name": lookup_res.get("source_name"),
                "is_source_failing": lookup_res.get("is_source_failing", False),
                "citations": [{
                    "record_id": lookup_res.get("source_name", "KVK Directory"),
                    "source_url": lookup_res.get("source_url", "https://kvk.icar.gov.in"),
                    "last_verified": lookup_res.get("last_updated", ""),
                }],
            }

        if not KVK_WEB_SEARCH_ENABLED:
            logger.info("🔎 search_kvk_info: web search disabled; no DB match for %s", location)
            return None

        search_q = f"Krishi Vigyan Kendra {location} India official address phone"
        logger.info("🔎 search_kvk_info: timed web search for '%s'", search_q)
        try:
            web_results = _run_with_timeout(ddg_search_tool.run, KVK_SEARCH_TIMEOUT_SEC, search_q)
        except Exception as search_err:
            logger.warning("🔎 search_kvk_info web search failed/timed out: %s", search_err, exc_info=True)
            return None

        text = (web_results or "").strip()
        if not text or loc_key not in text.lower():
            logger.info("🔎 search_kvk_info: web results missing location '%s' — discarding", location)
            return None
        # Guard against a wrong district leaking through (e.g. Sehore for Kanpur)
        if loc_key != "sehore" and "sehore" in text.lower() and loc_key not in text.lower():
            return None

        snippet = text[:900].strip()
        if lang == "hi":
            answer = (
                f"**🏛️ {location} के नजदीकी कृषि विज्ञान केंद्र (KVK)**\n\n"
                f"{snippet}\n\n"
                f"कृपया आधिकारिक पोर्टल https://kvk.icar.gov.in पर भी सत्यापित करें।\n\n"
                f"---\n🌐 **Source:** Web Search"
            )
        else:
            answer = (
                f"**🏛️ Nearest Krishi Vigyan Kendra (KVK) for {location}**\n\n"
                f"{snippet}\n\n"
                f"Please also verify on the official portal: https://kvk.icar.gov.in\n\n"
                f"---\n🌐 **Source:** Web Search"
            )
        logger.info("🔎 search_kvk_info: web answer prepared for %s", location)
        return {
            "answer": answer,
            "source_type": "Web Search",
            "status": "success",
            "last_updated": None,
            "source_name": "Web Search (KVK)",
            "is_source_failing": False,
            "citations": [{"record_id": "ICAR KVK Portal", "source_url": "https://kvk.icar.gov.in", "last_verified": ""}],
        }
    except Exception as err:
        logger.error("🔎 search_kvk_info crashed: %s", err, exc_info=True)
        return None


def _build_chat_response(
    *,
    answer: str,
    query: str,
    source_type: str,
    start_time: float,
    status_code: str = "success",
    confidence_score: Optional[float] = None,
    context: Optional[str] = None,
    citations=None,
    has_pending_updates: bool = False,
    last_updated=None,
    source_name=None,
    is_source_failing: bool = False,
    eligibility_result=None,
) -> "ChatResponse":
    elapsed = (time.time() - start_time) * 1000
    if not isinstance(answer, str) or not answer.strip():
        answer = _friendly_chat_fallback("en")
        status_code = "error"
    return ChatResponse(
        answer=answer,
        user_query=query or "",
        source_type=source_type or "KisanSahay Guide",
        confidence_score=confidence_score,
        context=context,
        duration_ms=round(elapsed, 2),
        status=status_code,
        citations=citations,
        has_pending_updates=has_pending_updates,
        last_updated=last_updated,
        source_name=source_name,
        is_source_failing=is_source_failing,
        eligibility_result=eligibility_result,
    )


# ─────────────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    user_query: str = Field(
        default="",
        example="How much money is provided to farmer families under PM-KISAN?",
        description="The question or prompt submitted by the user."
    )
    state: Optional[str] = Field(
        default=None,
        description="User's state context, e.g. 'Madhya Pradesh' or 'Punjab'."
    )
    district: Optional[str] = Field(
        default=None,
        description="User's district context, e.g. 'Sehore', 'Dewas', 'Bhopal'."
    )
    top_k: Optional[int] = Field(
        default=6,
        ge=1,
        le=20,
        description="Number of relevant context chunks to retrieve from ChromaDB (default 6)."
    )
    include_context: Optional[bool] = Field(
        default=False,
        description="Whether to include the raw context chunks (local or web) in the JSON response."
    )
    force_web_search: Optional[bool] = Field(
        default=False,
        description="Optionally force a web search bypass of local documents."
    )
    language: Optional[str] = Field(
        default="en",
        description="UI language selected by the user ('en' for English, 'hi' for Hindi). The answer will be returned in this language."
    )
    lang: Optional[str] = Field(
        default=None,
        description="Optional alias for language parameter ('en' or 'hi')."
    )
    farmer_profile: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional structured farmer profile attributes for deterministic Python eligibility evaluation."
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
    citations: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="List of verified sources and portals cited in the response."
    )
    has_pending_updates: Optional[bool] = Field(
        default=False,
        description="Flag indicating if any cited record has pending updates undergoing review."
    )
    last_updated: Optional[str] = Field(
        default=None,
        description="Freshness date of the direct database records used."
    )
    source_name: Optional[str] = Field(
        default=None,
        description="Name of the official source authority, e.g. ICAR KVK Portal or Agmarknet."
    )
    is_source_failing: Optional[bool] = Field(
        default=False,
        description="Flag indicating if the underlying source adapter is currently failing sync."
    )
    eligibility_result: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Structured JSON result from the deterministic Python eligibility engine."
    )


class HealthResponse(BaseModel):
    status: str
    ollama_online: bool
    llm_model: str
    embed_model: str
    chroma_db_dir: str
    vector_count: int
    web_search_available: bool


# ─────────────────────────────────────────────────────────────────────────────
# 3b. High-Performance Runtime Translation Engine (25 Indian Languages)
# ─────────────────────────────────────────────────────────────────────────────

TRANSLATIONS_DICT: Dict[str, Dict[str, str]] = {}
TEXT_LOOKUP_DICT: Dict[str, Dict[str, str]] = {}
RUNTIME_TRANSLATION_CACHE: Dict[Tuple[str, str], str] = {}

CORE_OFFLINE_DICTIONARY: Dict[str, Dict[str, str]] = {
    "hi": {
        "Home": "होम",
        "Check Eligibility": "पात्रता जांचें",
        "Government Schemes": "सरकारी योजनाएं",
        "My Loans & EMIs": "मेरे ऋण और किस्तें",
        "Install App": "ऐप इंस्टॉल करें",
        "Schemes": "योजनाएं",
        "Active Loans": "सक्रिय ऋण",
        "Ended Loans": "समाप्त ऋण",
        "Document Vault": "दस्तावेज़ वॉल्ट",
        "KisanSahay": "किसानसहाय",
        "Empowering Indian Farmers": "भारतीय किसानों का सशक्तिकरण",
        "Check My Eligibility": "मेरी पात्रता जांचें",
        "Get Started": "शुरू करें",
        "How It Works": "यह कैसे काम करता है",
        "Apply Now": "अभी आवेदन करें",
        "Type of Crop": "फसल का प्रकार",
        "Annual Income": "वार्षिक आय",
        "Locality / District": "स्थान / ज़िला",
        "Land Ownership": "भूमि स्वामित्व",
        "Main Activity Type": "मुख्य गतिविधि प्रकार"
    }
}

def _init_translations():
    """Initializes the multi-language translation dictionaries and reverse text lookup."""
    global TRANSLATIONS_DICT, TEXT_LOOKUP_DICT
    js_paths = [
        BASE_DIR.parent / "frontend" / "different_languages.js",
        BASE_DIR / "frontend" / "different_languages.js",
        BASE_DIR / "public" / "different_languages.js",
    ]
    for p in js_paths:
        if p.exists():
            try:
                content = p.read_text(encoding="utf-8")
                m = re.search(r"const TRANSLATIONS = ({[\s\S]*?});\s*(\n|$|if)", content)
                if m:
                    clean_json = re.sub(r",\s*([\]}])", r"\1", m.group(1))
                    TRANSLATIONS_DICT = json.loads(clean_json)
                    en_map = TRANSLATIONS_DICT.get("en", {})
                    for lang, kvs in TRANSLATIONS_DICT.items():
                        if lang == "en":
                            continue
                        if lang not in TEXT_LOOKUP_DICT:
                            TEXT_LOOKUP_DICT[lang] = {}
                        for k, en_text in en_map.items():
                            if k in kvs and isinstance(en_text, str) and en_text.strip():
                                TEXT_LOOKUP_DICT[lang][en_text.strip().lower()] = kvs[k]
                    logger.info("Loaded %d languages with %d keys from %s", len(TRANSLATIONS_DICT), len(en_map), p.name)
                    break
            except Exception as e:
                logger.warning("Error parsing %s: %s", p, e)

    # Merge core offline dictionary
    for lang, kvs in CORE_OFFLINE_DICTIONARY.items():
        if lang not in TEXT_LOOKUP_DICT:
            TEXT_LOOKUP_DICT[lang] = {}
        for en_word, trans_word in kvs.items():
            TEXT_LOOKUP_DICT[lang][en_word.strip().lower()] = trans_word

_init_translations()


def extract_translation_request(body: Any, query_params: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
    """
    Flexibly extracts {key: text} pairs and target_lang from various JSON payloads or query params.
    """
    target_lang = ""
    # 1. Query parameters
    for q_key in ("target_lang", "targetLang", "target_language", "targetLanguage", "target", "to", "lang", "language", "code"):
        val = query_params.get(q_key)
        if val and isinstance(val, str) and val.strip():
            target_lang = val.strip()
            break

    if not isinstance(body, dict):
        return {}, (target_lang or "en").lower().strip()

    # 2. Body-level language parameter
    if not target_lang:
        for b_key in ("target_lang", "targetLang", "target_language", "targetLanguage", "target", "to", "lang", "language", "target_code", "code"):
            for k, v in body.items():
                if k.lower() == b_key.lower() and isinstance(v, str) and v.strip():
                    target_lang = v.strip()
                    break
            if target_lang:
                break

    # 3. Detect {key: text} fields container
    fields: Dict[str, Any] = {}
    for c_key in ("strings", "texts", "data", "fields", "payload", "items", "content", "dict", "translations"):
        if c_key in body and isinstance(body[c_key], dict):
            fields = body[c_key]
            break

    if not fields:
        reserved_keys = {
            "target_lang", "targetlang", "target_language", "targetlanguage",
            "target", "to", "lang", "language", "target_code", "code",
            "from", "source", "source_lang", "sourcelang", "isdynamic", "is_dynamic"
        }
        fields = {k: v for k, v in body.items() if k.lower() not in reserved_keys}

    return fields, (target_lang or "en").lower().strip()


async def _translate_single_text(client: httpx.AsyncClient, text: str, target_lang: str, sem: asyncio.Semaphore) -> str:
    """Translates a single string with timeout and fallback to original English text."""
    if not text or not isinstance(text, str) or not text.strip():
        return text

    clean_text = text.strip()
    cache_key = (clean_text.lower(), target_lang)
    if cache_key in RUNTIME_TRANSLATION_CACHE:
        return RUNTIME_TRANSLATION_CACHE[cache_key]

    async with sem:
        try:
            encoded_query = urllib.parse.quote(clean_text)
            url = f"https://api.mymemory.translated.net/get?q={encoded_query}&langpair=en|{target_lang}"
            resp = await client.get(url, timeout=3.0)
            if resp.status_code == 200:
                data = resp.json()
                t = data.get("responseData", {}).get("translatedText")
                if t and isinstance(t, str) and t.strip():
                    t_upper = t.strip().upper()
                    if not t_upper.startswith("MYMEMORY WARNING:") and "INVALID TARGET LANGUAGE" not in t_upper and "NO QUERY" not in t_upper:
                        result_text = t.strip()
                        RUNTIME_TRANSLATION_CACHE[cache_key] = result_text
                        return result_text
        except Exception:
            pass

    # Graceful fallback: return original English text
    return text


async def translate_fields_batch(fields: Dict[str, Any], target_lang: str) -> Dict[str, Any]:
    """
    Translates a dictionary of {key: text} pairs into target_lang in the exact same shape.
    Handles 50+ fields in a single call. If translation fails, returns original English text.
    """
    target = (target_lang or "en").lower().strip()
    if target in ("en", "english", ""):
        return dict(fields)

    # Validate target language code format
    if not re.match(r"^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,4})?$", target):
        logger.info("Target language '%s' is invalid/unsupported. Returning original text.", target)
        return dict(fields)

    results: Dict[str, Any] = {}
    misses: List[Tuple[str, str]] = []

    for k, v in fields.items():
        if not isinstance(v, str) or not v.strip():
            results[k] = v
            continue

        # 1. Direct Key Match in Pre-compiled Dictionary
        if target in TRANSLATIONS_DICT and k in TRANSLATIONS_DICT[target]:
            results[k] = TRANSLATIONS_DICT[target][k]
            continue

        # 2. Text Match in Pre-compiled Dictionary
        v_norm = v.strip().lower()
        if target in TEXT_LOOKUP_DICT and v_norm in TEXT_LOOKUP_DICT[target]:
            results[k] = TEXT_LOOKUP_DICT[target][v_norm]
            continue

        # 3. In-memory runtime cache
        cache_key = (v_norm, target)
        if cache_key in RUNTIME_TRANSLATION_CACHE:
            results[k] = RUNTIME_TRANSLATION_CACHE[cache_key]
            continue

        misses.append((k, v))

    # 4. Asynchronously translate any remaining misses in parallel with concurrency semaphore
    if misses:
        sem = asyncio.Semaphore(12)
        try:
            async with httpx.AsyncClient() as client:
                tasks = [_translate_single_text(client, text, target, sem) for _, text in misses]
                translated_list = await asyncio.gather(*tasks, return_exceptions=True)
                for (k, original_val), res in zip(misses, translated_list):
                    if isinstance(res, str) and res.strip():
                        results[k] = res
                    else:
                        results[k] = original_val
        except Exception as batch_err:
            logger.warning("Batch translation error: %s. Preserving original English text.", batch_err)
            for k, original_val in misses:
                if k not in results:
                    results[k] = original_val

    # Guarantee every single input key is preserved in the output dictionary
    for k, v in fields.items():
        if k not in results:
            results[k] = v

    return results


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
            "POST /api/translate": "Batch translation endpoint for 50+ fields returning {key: translatedText}",
            "GET /health": "Verify Ollama, ChromaDB, and Web Search status"
        }
    }


@app.post("/api/translate", tags=["Translation"])
@app.post("/translate", tags=["Translation"])
async def translate_endpoint(request: Request):
    """
    Runtime Batch Translation Endpoint:
    - Accepts a JSON object of {key: text} pairs plus a target language code.
    - Handles 50+ fields in a single call.
    - Returns {key: translatedText} in the same shape.
    - If translation fails, returns original English text for those keys without throwing an error.
    """
    fields: Dict[str, Any] = {}
    target_lang = "en"

    try:
        query_params = dict(request.query_params)
        body = {}
        try:
            body = await request.json()
        except Exception:
            raw_body = await request.body()
            if raw_body:
                body = json.loads(raw_body.decode("utf-8", errors="ignore"))

        fields, target_lang = extract_translation_request(body, query_params)
    except Exception as parse_err:
        logger.warning("Parsing error on /api/translate: %s", parse_err)
        return fields

    try:
        translated_map = await translate_fields_batch(fields, target_lang)
        return translated_map
    except Exception as e:
        logger.warning("Translation processing notice: %s. Returning original English text.", e)
        return fields


@app.get("/api/translate", tags=["Translation"])
@app.get("/translate", tags=["Translation"])
def translate_info():
    """Information on the /api/translate endpoint."""
    return {
        "endpoint": "/api/translate",
        "method": "POST",
        "description": "Batch translation endpoint supporting 50+ fields per call.",
        "supported_languages": list(TRANSLATIONS_DICT.keys()) if TRANSLATIONS_DICT else ["en", "hi", "pa", "bn", "mr", "te", "ta", "gu", "kn", "ml", "or", "as", "ur"],
        "example_request": {
            "target_lang": "hi",
            "navHome": "Home",
            "navEligibility": "Check Eligibility"
        },
        "example_response": {
            "navHome": "होम",
            "navEligibility": "पात्रता जांचें"
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


# ─────────────────────────────────────────────────────────────────────────────
# 4b. Exact Database Lookups Endpoints (Prompt 6)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/kvk", tags=["Exact Lookups"])
def kvk_directory_endpoint(
    district: Optional[str] = Query(None, description="District name, e.g. Sehore, Bhopal"),
    state: Optional[str] = Query("Madhya Pradesh", description="State name")
):
    """
    Returns KVK directory records loaded directly from the database (records table),
    not from a static file. Includes official phone, address, and soil testing facility info.
    """
    from src.data_layer import get_kvk_directory
    dl = get_admin_data_layer()
    return get_kvk_directory(district=district, state=state, data_layer=dl)


@app.get("/api/kvk/events", tags=["Exact Lookups"])
def kvk_events_endpoint(
    district: Optional[str] = Query(None, description="District name, e.g. Sehore, Bhopal"),
    state: Optional[str] = Query("Madhya Pradesh", description="State name")
):
    """
    Returns upcoming KVK vocational training and field demonstration schedules from the database.
    """
    from src.data_layer import get_kvk_events
    dl = get_admin_data_layer()
    return get_kvk_events(district=district, state=state, data_layer=dl)


@app.get("/api/advisories", tags=["Exact Lookups"])
def advisories_endpoint(
    crop: Optional[str] = Query(None, description="Crop name, e.g. Soybean, Wheat"),
    state: Optional[str] = Query("Madhya Pradesh", description="State name"),
    district: Optional[str] = Query(None, description="District name")
):
    """
    Returns current seasonal crop advisories and IMD weather advisories from the database.
    """
    from src.data_layer import get_crop_advisories
    dl = get_admin_data_layer()
    return get_crop_advisories(crop=crop, state=state, district=district, data_layer=dl)


@app.get("/api/mandi", tags=["Exact Lookups"])
def mandi_prices_endpoint(
    crop: Optional[str] = Query(None, description="Commodity name, e.g. Soybean, Gram, Wheat"),
    commodity: Optional[str] = Query(None, description="Alias for crop parameter"),
    district: Optional[str] = Query(None, description="District name, e.g. Dewas, Bhopal, Harda"),
    state: Optional[str] = Query("Madhya Pradesh", description="State name")
):
    """
    Returns latest mandi wholesale prices (min, max, modal) from the database.
    """
    from src.data_layer import get_mandi_prices
    dl = get_admin_data_layer()
    target_crop = crop or commodity
    return get_mandi_prices(crop=target_crop, district=district, state=state, data_layer=dl)


@app.exception_handler(RequestValidationError)
async def chat_validation_handler(request: Request, exc: RequestValidationError):
    if request.url.path.rstrip("/") == "/chat":
        logger.warning("⚠️ /chat validation error: %s", exc.errors())
        return JSONResponse(
            status_code=200,
            content={
                "answer": "Please enter a question about farmer loans, government schemes, or subsidies.",
                "user_query": "",
                "source_type": "KisanSahay Guide",
                "confidence_score": 1.0,
                "context": None,
                "duration_ms": 0,
                "status": "error",
            },
        )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.post("/chat", response_model=ChatResponse, tags=["Hybrid RAG"])
def chat_endpoint(request: ChatRequest):
    """
    Original chat pipeline (default path):
      moderation -> identity -> FAQ -> domain check -> RAG/Gemini
    Isolated KVK search runs only for explicit location/KVK questions, with timeout
    and fallback, and never blocks the main loan/scheme path.
    """
    start_time = time.time()
    lang = "en"
    query = ""
    try:
        query = (request.user_query or "").strip()
        lang = (request.lang or request.language or "en").strip().lower() or "en"
        logger.info("═" * 60)
        logger.info("📥 Incoming /chat query: '%s' (top_k=%d, lang=%s)", query, request.top_k, lang)
        return _chat_pipeline(request, query, lang, start_time)
    except Exception as err:
        logger.error("💥 Top-level /chat failure: %s", err, exc_info=True)
        traceback.print_exc()
        return _build_chat_response(
            answer=_friendly_chat_fallback(lang),
            query=query,
            source_type="KisanSahay Guide",
            start_time=start_time,
            status_code="error",
            confidence_score=0.0,
        )


def _chat_pipeline(request: ChatRequest, query: str, lang: str, start_time: float) -> ChatResponse:
    if not query:
        logger.info("ℹ️ Empty query received in /chat — returning friendly guidance")
        empty_msg = (
            "कृपया किसान ऋण, सरकारी योजनाओं या कृषि सहायता के बारे में अपना प्रश्न पूछें।"
            if lang == "hi"
            else "Please enter a question about farmer loans, government schemes, or subsidies."
        )
        return _build_chat_response(
            answer=empty_msg,
            query="",
            source_type="KisanSahay Guide",
            start_time=start_time,
            status_code="error",
            confidence_score=1.0,
        )

    if len(query) > MAX_CHAT_QUERY_CHARS:
        logger.info("ℹ️ Query too long (%d chars) — rejecting", len(query))
        too_long = (
            "कृपया अपना प्रश्न छोटा करें (अधिकतम 4000 अक्षर) और पुनः प्रयास करें।"
            if lang == "hi"
            else "Please shorten your question (max 4000 characters) and try again."
        )
        return _build_chat_response(
            answer=too_long,
            query=query[:200],
            source_type="KisanSahay Guide",
            start_time=start_time,
            status_code="error",
            confidence_score=1.0,
        )

    if lang == "hi":
        lang_instruction = "[STRICT INSTRUCTION: You MUST respond ONLY in Hindi (हिंदी). Do NOT use English in your answer.] "
    else:
        lang_instruction = "[STRICT INSTRUCTION: You MUST respond ONLY in English. Do NOT use Hindi or any other language.] "
    query_for_llm = lang_instruction + query

    # ── Step 1: Moderation ──────────────────────────────────────────────────
    logger.info("🛡️ Stage: moderation")
    is_unsafe, safety_msg = check_duckduckgo_safety(query, lang)
    if is_unsafe:
        logger.info("🚫 Safety limitation triggered for query: '%s'", query)
        return _build_chat_response(
            answer=safety_msg or get_off_topic_response(lang),
            query=query,
            source_type="Content Safety Filter (DuckDuckGo Rules)",
            start_time=start_time,
            status_code="blocked",
            confidence_score=0.0,
        )

    # ── Step 2: Identity ────────────────────────────────────────────────────
    logger.info("🛡️ Stage: identity")
    if is_identity_query(query):
        logger.info("🤖 Identity query → KisanSahay intro")
        return _build_chat_response(
            answer=get_identity_response(lang),
            query=query,
            source_type="KisanSahay App Info",
            start_time=start_time,
            confidence_score=1.0,
        )

    # ── Step 2b: Personal Document Vault from profile (no search) ───────────
    if is_vault_query(query):
        logger.info("🔒 Stage: vault documents (main path)")
        return _build_chat_response(
            answer=format_vault_answer(request.farmer_profile, lang),
            query=query,
            source_type="KisanSahay Document Vault",
            start_time=start_time,
            confidence_score=1.0,
        )

    # ── Step 3: FAQ (do NOT skip for the word "rate" — that broke KCC interest) ─
    logger.info("📚 Stage: FAQ match")
    elig_preview = {"is_eligibility_query": False}
    try:
        elig_preview = evaluate_eligibility(query, farmer_profile=request.farmer_profile) or elig_preview
    except Exception as elig_err:
        logger.warning("Eligibility preview failed: %s", elig_err, exc_info=True)
    is_elig_check = bool(elig_preview.get("is_eligibility_query"))

    is_direct_exact_query = bool(
        (extract_mentioned_location(query) or request.district)
        and (is_explicit_soil_query(query) or is_explicit_training_query(query) or is_explicit_mandi_query(query))
    )

    faq_match = None if (is_elig_check or is_direct_exact_query) else find_faq_match(query, lang)
    if faq_match:
        faq_answer, faq_id = faq_match
        logger.info("📚 FAQ match '%s' — returning curated answer (main path)", faq_id)
        return _build_chat_response(
            answer=faq_answer,
            query=query,
            source_type="KisanSahay FAQ Knowledge Base",
            start_time=start_time,
            confidence_score=1.0,
        )

    # ── Step 4: Domain check ────────────────────────────────────────────────
    logger.info("🌾 Stage: domain check")
    if not is_related_to_farmer_or_loans(query):
        logger.info("🚫 Off-topic query blocked: '%s'", query)
        return _build_chat_response(
            answer=get_off_topic_response(lang),
            query=query,
            source_type="Domain Restriction",
            start_time=start_time,
            confidence_score=0.0,
        )

    # ── Isolated exact lookups (after FAQ so they cannot steal loan questions)
    mentioned_loc = extract_mentioned_location(query)
    profile_district = (request.farmer_profile or {}).get("district") if request.farmer_profile else None
    profile_state = (request.farmer_profile or {}).get("state") if request.farmer_profile else None

    if is_explicit_soil_query(query) or is_explicit_training_query(query) or is_explicit_mandi_query(query):
        try:
            from src.data_layer import (
                get_kvk_directory,
                get_kvk_events,
                get_mandi_prices,
                format_soil_testing_direct_answer,
                format_events_direct_answer,
                format_mandi_direct_answer,
                extract_crop_from_text,
            )
            dl = get_admin_data_layer()
            detected_dist = mentioned_loc or request.district
            loc_key = _location_key(detected_dist)
            inferred_state = _PLACE_TO_STATE.get(loc_key) if loc_key else None
            target_state = inferred_state or request.state or profile_state
            if not detected_dist:
                logger.info("📍 Location-specific lookup without district — asking user")
                return _build_chat_response(
                    answer=_ask_district_for_kvk(lang),
                    query=query,
                    source_type="KisanSahay Guide",
                    start_time=start_time,
                    confidence_score=1.0,
                )

            if is_explicit_soil_query(query):
                logger.info("🧪 Soil testing lookup: district=%s state=%s", detected_dist, target_state)
                lookup_res = get_kvk_directory(district=detected_dist, state=target_state, data_layer=dl)
                lookup_res["records"] = _records_match_location(lookup_res.get("records") or [], detected_dist)
                lookup_res["district"] = detected_dist
                direct_ans = format_soil_testing_direct_answer(lookup_res, lang=lang)
                direct_source_type = "Direct Database Lookup (Soil Testing Lab)"
            elif is_explicit_training_query(query):
                logger.info("📅 KVK training lookup: district=%s state=%s", detected_dist, target_state)
                lookup_res = get_kvk_events(district=detected_dist, state=target_state, data_layer=dl)
                lookup_res["records"] = _records_match_location(lookup_res.get("records") or [], detected_dist)
                lookup_res["district"] = detected_dist
                direct_ans = format_events_direct_answer(lookup_res, lang=lang)
                direct_source_type = "Direct Database Lookup (KVK Training Calendar)"
            else:
                detected_crop = extract_crop_from_text(query)
                logger.info("🌾 Mandi lookup: crop=%s district=%s state=%s", detected_crop, detected_dist, target_state)
                lookup_res = get_mandi_prices(crop=detected_crop, district=detected_dist, state=target_state, data_layer=dl)
                lookup_res["records"] = _records_match_location(lookup_res.get("records") or [], detected_dist)
                lookup_res["district"] = detected_dist
                direct_ans = format_mandi_direct_answer(lookup_res, lang=lang)
                direct_source_type = "Direct Database Lookup (Agmarknet Mandi)"

            return _build_chat_response(
                answer=direct_ans,
                query=query,
                source_type=direct_source_type,
                start_time=start_time,
                confidence_score=1.0,
                last_updated=lookup_res.get("last_updated"),
                source_name=lookup_res.get("source_name"),
                is_source_failing=lookup_res.get("is_source_failing", False),
                citations=[{
                    "record_id": lookup_res.get("source_name", direct_source_type),
                    "source_url": lookup_res.get("source_url", "https://farmer.gov.in"),
                    "last_verified": lookup_res.get("last_updated", ""),
                }],
            )
        except Exception as lookup_err:
            logger.warning("Exact lookup failed; continuing original pipeline: %s", lookup_err, exc_info=True)

    # ── Isolated KVK search (never on the loan/FAQ path) ────────────────────
    if is_explicit_kvk_query(query):
        logger.info("🏛️ Stage: isolated KVK search")
        kvk_payload = search_kvk_info(
            query,
            lang=lang,
            requested_district=mentioned_loc or request.district,
            requested_state=(_PLACE_TO_STATE.get(_location_key(mentioned_loc)) if mentioned_loc else None) or request.state or profile_state,
        )
        if kvk_payload and kvk_payload.get("answer"):
            return _build_chat_response(
                answer=kvk_payload["answer"],
                query=query,
                source_type=kvk_payload.get("source_type") or "KisanSahay Guide",
                start_time=start_time,
                status_code=kvk_payload.get("status") or "success",
                confidence_score=1.0,
                last_updated=kvk_payload.get("last_updated"),
                source_name=kvk_payload.get("source_name"),
                is_source_failing=bool(kvk_payload.get("is_source_failing")),
                citations=kvk_payload.get("citations"),
            )
        logger.warning("🏛️ search_kvk_info returned nothing — falling back to RAG")

    # ── Step 5: ChromaDB RAG + Gemini (NO web search on this path) ──────────
    logger.info("🔍 Stage: RAG retrieval")
    source_type = None
    final_answer = None
    context_used = None
    best_distance = None
    citations = []
    has_pending_updates = False
    elig_result = elig_preview if isinstance(elig_preview, dict) else {"is_eligibility_query": False}

    vector_store = None
    try:
        vector_store = get_vector_store(
            chroma_dir=CHROMA_DIR,
            collection_name=COLLECTION_NAME,
            ollama_url=OLLAMA_URL,
            embed_model=EMBED_MODEL,
        )
    except Exception as store_err:
        logger.warning("⚠️ ChromaDB vector store init failed: %s", store_err, exc_info=True)

    if vector_store is not None:
        try:
            profile_with_ctx = dict(request.farmer_profile or {})
            if request.state and "state" not in profile_with_ctx:
                profile_with_ctx["state"] = request.state
            elig_result = evaluate_eligibility(query=query, farmer_profile=profile_with_ctx) or elig_result

            retrieval_res = retrieve(
                question=query,
                state=request.state,
                n=request.top_k or 6,
                data_layer=get_admin_data_layer(),
                vector_store=vector_store,
            )
            citations = retrieval_res.get("citations", []) or []
            has_pending_updates = retrieval_res.get("has_pending_updates", False)

            if retrieval_res.get("records") or elig_result.get("is_eligibility_query"):
                best_distance = min(r["best_score"] for r in retrieval_res["records"]) if retrieval_res.get("records") else 0.0
                logger.info("🔍 ChromaDB best distance: %.4f (threshold <= %.2f)", best_distance, SIMILARITY_DISTANCE_THRESHOLD)
                if best_distance <= SIMILARITY_DISTANCE_THRESHOLD or elig_result.get("is_eligibility_query"):
                    logger.info("✨ Stage: Gemini generation")
                    try:
                        gemini_output = generate_with_gemini(
                            query=query_for_llm,
                            retrieval_result=retrieval_res,
                            eligibility_result=elig_result,
                            lang=lang,
                        )
                        final_answer = (gemini_output or {}).get("answer")
                        citations = (gemini_output or {}).get("citations", citations)
                        has_pending_updates = (gemini_output or {}).get("has_pending_updates", has_pending_updates)
                        source_type = "Official Uploaded Documents"
                        context_used = retrieval_res.get("formatted_context")
                        logger.info("✅ Gemini/grounded answer ready")
                    except Exception as gem_err:
                        logger.error("Gemini generation failed: %s", gem_err, exc_info=True)
                else:
                    logger.info("⚠️ Low-confidence RAG match — not calling web search")
            else:
                logger.info("⚠️ ChromaDB returned 0 live records — staying on main path (no web search)")
        except Exception as rag_err:
            logger.error("RAG retrieve failed: %s", rag_err, exc_info=True)

    if not final_answer:
        logger.info("ℹ️ Using official-directives fallback (search did not run on this path)")
        final_answer = (
            "मुझे आधिकारिक निर्देशों में इसका विशिष्ट उत्तर नहीं मिल सका। कृपया इस विवरण को अपनी स्थानीय बैंक शाखा या कृषि विज्ञान केंद्र से सत्यापित करें।"
            if lang == "hi"
            else (
                "I cannot find the specific answer to this in the official directives. "
                "Please verify this detail with your local bank branch or Krishi Vigyan Kendra."
            )
        )
        source_type = source_type or "Official Uploaded Documents"

    logger.info("⏱️ /chat completed (Source: %s)", source_type)
    logger.info("═" * 60)
    return _build_chat_response(
        answer=final_answer,
        query=query,
        source_type=source_type,
        start_time=start_time,
        confidence_score=round(best_distance, 4) if best_distance is not None else None,
        context=context_used if request.include_context else None,
        citations=citations if citations else None,
        has_pending_updates=has_pending_updates,
        eligibility_result=elig_result.get("eligibility_json") if elig_result.get("is_eligibility_query") else None,
    )

# ─────────────────────────────────────────────────────────────────────────────
# 4. Admin Review, Data Scheduling & Health Alerting Engine
# ─────────────────────────────────────────────────────────────────────────────

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "kisansahay-admin-secret-2026")


def verify_admin_auth(
    request: Request,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """
    Validates admin credentials via either:
      - X-Admin-Key header
      - Authorization: Bearer <token>
    """
    provided_key = None
    if x_admin_key:
        provided_key = x_admin_key.strip()
    elif authorization:
        parts = authorization.strip().split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            provided_key = parts[1].strip()
        else:
            provided_key = parts[0].strip()

    if not provided_key or not hmac.compare_digest(provided_key, ADMIN_API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing admin credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return True


_data_layer_instance = None
_sync_engine_instance = None


def get_admin_data_layer():
    global _data_layer_instance
    if _data_layer_instance is None:
        from src.data_layer import KisanDataLayer
        _data_layer_instance = KisanDataLayer()
    return _data_layer_instance


def get_admin_sync_engine():
    global _sync_engine_instance
    if _sync_engine_instance is None:
        from sync_engine import SyncEngine
        _sync_engine_instance = SyncEngine(data_layer=get_admin_data_layer())
    return _sync_engine_instance


@app.get("/admin/pending", tags=["Admin Review"])
@app.get("/api/admin/pending", tags=["Admin Review"])
def list_pending_reviews(is_admin: bool = Depends(verify_admin_auth)):
    """
    Returns all records pending review with before and after diffs,
    metadata, and wait duration in days.
    """
    from src.admin import get_pending_changes
    dl = get_admin_data_layer()
    pending = get_pending_changes(dl)
    return {
        "success": True,
        "count": len(pending),
        "pending": pending
    }


@app.post("/admin/approve/{record_id:path}", tags=["Admin Review"])
@app.post("/api/admin/approve/{record_id:path}", tags=["Admin Review"])
def approve_pending_record(record_id: str, is_admin: bool = Depends(verify_admin_auth)):
    """
    Approves and publishes a pending change:
    - Moves status to 'live'
    - Updates SQLite record
    - Triggers ChromaDB vector indexing for the published record
    """
    from src.admin import approve_pending_change
    dl = get_admin_data_layer()
    se = get_admin_sync_engine()
    try:
        res = approve_pending_change(record_id, data_layer=dl, sync_engine=se)
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error("Error approving record '%s': %s", record_id, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve record '{record_id}': {str(e)}"
        )


@app.post("/admin/reject/{record_id:path}", tags=["Admin Review"])
@app.post("/api/admin/reject/{record_id:path}", tags=["Admin Review"])
def reject_pending_record(record_id: str, is_admin: bool = Depends(verify_admin_auth)):
    """
    Rejects and discards a pending change:
    - If draft (__pending), removes draft so previous live version remains active
    - If standalone pending record, marks as retired
    """
    from src.admin import reject_pending_change
    dl = get_admin_data_layer()
    try:
        res = reject_pending_change(record_id, data_layer=dl)
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error("Error rejecting record '%s': %s", record_id, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject record '{record_id}': {str(e)}"
        )


@app.get("/admin/health", tags=["Admin Health"])
@app.get("/api/admin/health", tags=["Admin Health"])
def admin_health_check(
    email_alert: bool = False,
    is_admin: bool = Depends(verify_admin_auth)
):
    """
    Daily health check endpoint:
    - Detects sources failing for >= 3 consecutive runs
    - Detects records past their TTL expiration
    - Detects pending changes waiting > 3 days
    - Logs alert and optionally triggers email dispatch
    """
    from src.admin import run_daily_health_check
    dl = get_admin_data_layer()
    se = get_admin_sync_engine()
    report = run_daily_health_check(dl, se.registry, email_alert=email_alert)
    return report


class TriggerSyncRequest(BaseModel):
    state: str = "Madhya Pradesh"
    force: bool = False
    fixtures: bool = False
    source_id: Optional[str] = None


@app.post("/admin/sync", tags=["Admin Scheduler"])
@app.post("/api/admin/sync", tags=["Admin Scheduler"])
def trigger_admin_sync(
    payload: TriggerSyncRequest = TriggerSyncRequest(),
    is_admin: bool = Depends(verify_admin_auth)
):
    """
    Admin-triggered synchronization run with lock protection and error isolation.
    Sync failures never crash the server or chat availability.
    """
    from run_sync import run_scheduled_sync, ProcessLock
    try:
        with ProcessLock():
            result = run_scheduled_sync(
                state=payload.state,
                force=payload.force,
                fixtures=payload.fixtures
            )
            return {"success": True, "result": result}
    except Exception as e:
        logger.error("Error executing admin-triggered sync: %s", e, exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "message": "Sync encountered an error or lock was held, but chat and server remain fully operational."
        }


# ─────────────────────────────────────────────────────────────────────────────
# 5. Entrypoint
# ─────────────────────────────────────────────────────────────────────────────


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("FASTAPI_PORT", "8000"))
    logger.info("Starting KisanSahay Hybrid RAG FastAPI server on http://0.0.0.0:%d", port)
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
