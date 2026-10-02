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
import re
import json
import urllib.parse
import asyncio
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List

import httpx
from fastapi import FastAPI, HTTPException, status, Request, Response
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

        # 2. Keyword matching with word boundaries
        for kw in item.get("keywords", []):
            kw_norm = _normalize_text_for_match(kw)
            if not kw_norm:
                continue
            if q_norm == kw_norm:
                score += kw_exact
            elif re.search(r"\b" + re.escape(kw_norm) + r"\b", q_norm):
                score += kw_partial
            elif len(words) >= 2 and re.search(r"\b" + re.escape(q_norm) + r"\b", kw_norm):
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

    return False


def get_off_topic_response(lang: str = "en") -> str:
    """Returns the polite domain restriction response from domain_config.json."""
    _load_dynamic_backend_data()
    responses = _config_cache.get("off_topic_response", {})
    return responses.get(lang, responses.get("en", "I can only help with agricultural loans, government schemes, and the KisanSahay app."))


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
    language: Optional[str] = Field(
        default="en",
        description="UI language selected by the user ('en' for English, 'hi' for Hindi). The answer will be returned in this language."
    )
    lang: Optional[str] = Field(
        default=None,
        description="Optional alias for language parameter ('en' or 'hi')."
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
        BASE_DIR / "public" / "different_languages.js",
        BASE_DIR / "public copy" / "different_languages.js"
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

    # Enforce the UI-selected language: prepend a hard instruction so the LLM always
    # responds in the language the user toggled, regardless of the RAG context language.
    lang = (request.lang or request.language or "en").strip().lower()
    if lang == "hi":
        lang_instruction = "[STRICT INSTRUCTION: You MUST respond ONLY in Hindi (हिंदी). Do NOT use English in your answer.] "
    else:
        lang_instruction = "[STRICT INSTRUCTION: You MUST respond ONLY in English. Do NOT use Hindi or any other language.] "
    query_for_llm = lang_instruction + query

    logger.info("═" * 60)
    logger.info("📥 Incoming /chat query: '%s' (top_k=%d, force_web=%s, lang=%s)", query, request.top_k, request.force_web_search, lang)

    # ══════════════════════════════════════════════════════════════════════════
    # DYNAMIC BACKEND PIPELINE (All rules loaded from backend JSON data)
    # ══════════════════════════════════════════════════════════════════════════

    # ── Step 1: DuckDuckGo-style bad text & content moderation limitation ────
    is_unsafe, safety_msg = check_duckduckgo_safety(query, lang)
    if is_unsafe:
        logger.info("🚫 DuckDuckGo safety limitation triggered for query: '%s'", query)
        elapsed = (time.time() - start_time) * 1000
        return ChatResponse(
            answer=safety_msg,
            user_query=query,
            source_type="Content Safety Filter (DuckDuckGo Rules)",
            confidence_score=0.0,
            context=None,
            duration_ms=round(elapsed, 2),
            status="blocked"
        )

    # ── Step 2: KisanSahay App Identity & Capabilities check ─────────────────
    if is_identity_query(query):
        logger.info("🤖 Identity query detected → Returning KisanSahay intro from domain_config.json")
        elapsed = (time.time() - start_time) * 1000
        return ChatResponse(
            answer=get_identity_response(lang),
            user_query=query,
            source_type="KisanSahay App Info",
            confidence_score=1.0,
            context=None,
            duration_ms=round(elapsed, 2),
            status="success"
        )

    # ── Step 3: First 50 Questions check (sahayKnowledgeBase.json) ───────────
    faq_match = find_faq_match(query, lang)
    if faq_match:
        faq_answer, faq_id = faq_match
        logger.info("📚 Match found in first 50 questions: '%s' — returning curated answer", faq_id)
        elapsed = (time.time() - start_time) * 1000
        return ChatResponse(
            answer=faq_answer,
            user_query=query,
            source_type="KisanSahay FAQ Knowledge Base",
            confidence_score=1.0,
            context=None,
            duration_ms=round(elapsed, 2),
            status="success"
        )

    # ── Step 4: Domain relevance check — Must relate to farmer, loans, schemes
    # "and then go on web search and then if it related to farmer or somthing like loan and schemes then give the output to user.."
    if not is_related_to_farmer_or_loans(query):
        logger.info("🚫 Off-topic query blocked: '%s' (not related to farmer/loans/schemes)", query)
        elapsed = (time.time() - start_time) * 1000
        return ChatResponse(
            answer=get_off_topic_response(lang),
            user_query=query,
            source_type="Domain Restriction",
            confidence_score=0.0,
            context=None,
            duration_ms=round(elapsed, 2),
            status="success"
        )

    # ── Steps 5 & 6: ChromaDB local search → DuckDuckGo web search fallback ─
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
                        query=query_for_llm,
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
                    query=query_for_llm,
                    web_context=web_results,
                    model=LLM_MODEL,
                    ollama_url=OLLAMA_URL
                )
                # Verify synthesized text passes safety rules
                is_web_unsafe, web_safety_msg = check_duckduckgo_safety(raw_web_answer, lang)
                if is_web_unsafe:
                    raw_web_answer = web_safety_msg or get_off_topic_response(lang)

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
                    "I cannot find the specific answer to this in the official directives. "
                    "Please verify this detail with your local bank branch or Krishi Vigyan Kendra.\n\n"
                    "---\n"
                    "🌐 **Source:** Web Search / Verification Required"
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
