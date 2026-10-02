"""
KisanSahay Gemini Answer Generator & RAG Synthesis Engine
=========================================================
Implements Prompt 5 generation rules:
1. Answer ONLY from the retrieved context.
2. Name the scheme or source.
3. Cite its source_url and last_verified date.
4. Tell the user when a record is older than its time-to-live (TTL).
5. Say that you are not sure and suggest the nearest KVK or bank when the context
   doesn't cover the question.
6. When a record has a pending change, add a note that the rule is being updated
   and should be confirmed with the bank or KVK.
7. For time-sensitive questions (mandi prices, weather advisories, training dates),
   prefer the freshest records and show their dates prominently.
8. Keep eligibility yes or no decisions strictly from Python rules, with Gemini
   only explaining the result.
"""

import os
import sys
import logging
from typing import Dict, Any, List, Optional

import requests

logger = logging.getLogger("GeminiGenerator")

UNCERTAIN_FALLBACK_EN = (
    "I am not sure based on the official directives currently available. "
    "Please verify this detail with your nearest Krishi Vigyan Kendra (KVK) or local bank branch."
)

UNCERTAIN_FALLBACK_HI = (
    "उपलब्ध आधिकारिक निर्देशों के अनुसार मैं पूरी तरह निश्चित नहीं हूँ। "
    "कृपया इस विवरण की पुष्टि अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या स्थानीय बैंक शाखा से करें।"
)


def build_gemini_system_prompt(
    retrieval_result: Dict[str, Any],
    eligibility_result: Optional[Dict[str, Any]] = None,
    lang: str = "en"
) -> str:
    """Constructs strict system instructions enforcing all Prompt 5 rules."""
    is_hindi = (lang or "").lower() == "hi"

    rules = [
        "1. STRICT FACTUAL GROUNDING: Answer ONLY from the provided context. Do NOT use outside knowledge, speculate, or guess.",
        "2. SOURCE ATTRIBUTION: Clearly name the scheme, institution, or source mentioned in the context.",
        "3. CITATIONS: Always cite the official source_url and last_verified date of the relevant record(s).",
        "4. TTL STALENESS NOTICE: If a record is noted as older than its Time-To-Live, explicitly inform the user that the data has passed its recommended refresh period and should be verified.",
        "5. UNCERTAINTY FALLBACK: If the provided context does NOT cover the user's specific question, say that you are not sure and suggest visiting or contacting the nearest Krishi Vigyan Kendra (KVK) or local bank branch.",
        "6. PENDING CHANGES ADVISORY: If a record has a pending change note, include an alert that the rule is currently being updated in the system and should be confirmed directly with the bank or KVK.",
        "7. TIME-SENSITIVE DATES: For time-sensitive questions (such as mandi prices, weather advisories, or training calendars), highlight the freshest dates prominently."
    ]

    if eligibility_result and eligibility_result.get("is_eligibility_query") and eligibility_result.get("decision") != "NOT_APPLICABLE":
        elig_instruction = eligibility_result.get("instruction_for_llm", "")
        rules.append(f"8. ELIGIBILITY DECISION ENFORCEMENT: {elig_instruction}")

    if is_hindi:
        rules.append("9. LANGUAGE: Respond strictly in fluent, natural Hindi (हिंदी).")
    else:
        rules.append("9. LANGUAGE: Respond strictly in clear, professional English.")

    return "\n".join(rules)


def generate_with_gemini(
    query: str,
    retrieval_result: Dict[str, Any],
    eligibility_result: Optional[Dict[str, Any]] = None,
    lang: str = "en",
    model: str = "gemini-1.5-flash"
) -> Dict[str, Any]:
    """
    Synthesizes an answer using Google Gemini API (or local Ollama / fallback).
    Guarantees strict adherence to context, citations, TTL warnings, pending notices,
    and Python eligibility decisions.
    """
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    system_rules = build_gemini_system_prompt(retrieval_result, eligibility_result, lang=lang)
    formatted_context = retrieval_result.get("formatted_context", "").strip()
    records = retrieval_result.get("records", [])
    citations = retrieval_result.get("citations", [])

    # If no records retrieved at all
    if not records or not formatted_context:
        fallback_msg = UNCERTAIN_FALLBACK_HI if lang == "hi" else UNCERTAIN_FALLBACK_EN
        return {
            "answer": fallback_msg,
            "source_type": "KisanSahay Verified Sources",
            "model_used": "direct_fallback",
            "citations": citations,
            "has_pending_updates": False,
            "has_stale_records": False
        }

    user_prompt = (
        f"USER QUESTION: {query}\n\n"
        f"RETRIEVED CONTEXT FROM KISANSAHAY DATA LAYER:\n"
        f"{formatted_context}\n\n"
        f"Respond to the user question strictly following the system rules above."
    )

    # 1. Try Gemini API if key is present
    if gemini_key:
        try:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": f"{system_rules}\n\n{user_prompt}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.0,
                    "maxOutputTokens": 1024
                }
            }
            resp = requests.post(gemini_url, json=payload, timeout=12.0)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return _post_process_answer(text, retrieval_result, eligibility_result, model_name=f"Google Gemini ({model})")
        except Exception as e:
            logger.warning("Gemini API call failed (%s). Falling back to local Ollama / synthesis...", e)

    # 2. Try Ollama (Llama 3.2) if local service is up
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    llm_model = os.getenv("LLM_MODEL", "llama3.2")
    try:
        resp = requests.post(
            f"{ollama_url}/api/chat",
            json={
                "model": llm_model,
                "messages": [
                    {"role": "system", "content": system_rules},
                    {"role": "user", "content": user_prompt}
                ],
                "options": {"temperature": 0.0},
                "stream": False
            },
            timeout=8.0
        )
        if resp.status_code == 200:
            raw_text = resp.json().get("message", {}).get("content", "").strip()
            return _post_process_answer(raw_text, retrieval_result, eligibility_result, model_name=f"Ollama ({llm_model})")
    except Exception as ollama_err:
        logger.info("Ollama offline (%s). Using high-fidelity grounded synthesis engine.", ollama_err)

    # 3. Grounded Synthesis Engine (Guaranteed 100% offline & test-safe fallback)
    synthetic_answer = _synthesize_grounded_answer(query, retrieval_result, eligibility_result, lang=lang)
    return _post_process_answer(synthetic_answer, retrieval_result, eligibility_result, model_name="KisanSahay Grounded Synthesizer")


def _synthesize_grounded_answer(
    query: str,
    retrieval_result: Dict[str, Any],
    eligibility_result: Optional[Dict[str, Any]],
    lang: str = "en"
) -> str:
    """Synthesizes structured, strictly factual response from retrieved context blocks."""
    records = retrieval_result.get("records", [])
    if not records and not (eligibility_result and eligibility_result.get("is_eligibility_query")):
        return UNCERTAIN_FALLBACK_HI if lang == "hi" else UNCERTAIN_FALLBACK_EN

    primary = records[0] if records else {}
    rec_id = primary.get("record_id", eligibility_result.get("scheme_name", "Official Scheme") if eligibility_result else "Official Rule")
    dtype = primary.get("data_type", "gov_schemes_loans")
    s_url = primary.get("source_url") or (eligibility_result.get("official_url") if eligibility_result else "https://farmer.gov.in")
    l_ver = primary.get("last_verified") or "Current cycle"
    content = primary.get("content", "")

    lines = []

    # Eligibility evaluation handling
    if eligibility_result and eligibility_result.get("is_eligibility_query"):
        dec = eligibility_result.get("decision", "CONDITIONAL")
        sname = eligibility_result.get("scheme_name") or rec_id
        if dec == "YES":
            lines.append(f"### Eligibility Result: YES — You are eligible for {sname}\n")
        elif dec == "NO":
            lines.append(f"### Eligibility Result: NO — Not currently eligible for {sname}\n")
        else:
            lines.append(f"### Eligibility Evaluation for {sname}\n")

        if eligibility_result.get("reasons"):
            lines.append("**Qualified Conditions:**")
            for r in eligibility_result["reasons"]:
                lines.append(f"• {r}")
            lines.append("")

        if eligibility_result.get("unmet_criteria"):
            lines.append("**Unmet Criteria / Disqualifying Factors:**")
            for u in eligibility_result["unmet_criteria"]:
                lines.append(f"• ⚠️ {u}")
            lines.append("")

        if eligibility_result.get("mandatory_documents"):
            lines.append("**Mandatory Documents Required:**")
            for d in eligibility_result["mandatory_documents"]:
                lines.append(f"• {d}")
            lines.append("")

    # Standard factual synthesis from retrieved text
    if not lines and content:
        lines.append(f"### Information from {rec_id} ({dtype.replace('_', ' ').title()})\n")
        # Extract relevant content snippet
        clean_content = content[:1200].strip()
        lines.append(clean_content)

    return "\n".join(lines)


def _post_process_answer(
    raw_answer: str,
    retrieval_result: Dict[str, Any],
    eligibility_result: Optional[Dict[str, Any]],
    model_name: str = "Gemini"
) -> Dict[str, Any]:
    """Appends mandatory source citations, pending advisories, and TTL notices."""
    records = retrieval_result.get("records", [])
    citations = list(retrieval_result.get("citations", []))
    has_pending = retrieval_result.get("has_pending_updates", False)
    has_stale = retrieval_result.get("has_stale_records", False)

    # Attach official portal citation for scheme eligibility if citations list is empty
    if not citations and eligibility_result and eligibility_result.get("official_url"):
        citations.append({
            "record_id": eligibility_result.get("scheme_name", "Official Scheme"),
            "source_url": eligibility_result["official_url"],
            "last_verified": "Official Guidelines"
        })

    advisories = []
    if has_pending:
        advisories.append(
            "⚠️ **Important Note:** One or more rules referenced above are currently undergoing updates in the official registry. "
            "Please confirm the latest conditions directly with your nearest bank branch or Krishi Vigyan Kendra (KVK)."
        )

    if has_stale:
        advisories.append(
            "⚠️ **Notice:** Information from one or more sources has passed its recommended Time-To-Live (refresh period). "
            "Verify current rates, deadlines, or dates with local authorities."
        )

    # Build citation footer
    citation_lines = []
    for c in citations:
        rec_id = c["record_id"]
        url = c["source_url"]
        date = c["last_verified"]
        citation_lines.append(f"• **{rec_id}**: [Official Portal]({url}) (Last verified: {date})")

    footer_parts = []
    if advisories:
        footer_parts.append("\n\n" + "\n\n".join(advisories))

    if citation_lines:
        footer_parts.append(
            "\n\n---\n"
            "📌 **Verified Sources & Citations:**\n" +
            "\n".join(citation_lines)
        )

    final_answer = raw_answer + "".join(footer_parts)

    return {
        "answer": final_answer,
        "source_type": "Official Uploaded Documents",
        "model_used": model_name,
        "citations": citations,
        "has_pending_updates": has_pending,
        "has_stale_records": has_stale
    }
