#!/usr/bin/env python3
"""
Llama 3.2 Generation Pipeline via Ollama
========================================
Implements a strict, hallucination-free generation pipeline using Llama 3.2 via Ollama.
Combines retrieved context from ChromaDB with the user query.
If the answer is not present in the context, responds strictly with:
"I'm sorry, but I couldn't find that information in the uploaded data."

Usage:
    # As a module:
    from scripts.generate_answer import generate_answer, ask_rag
    answer = ask_rag("How much money is given under PM-KISAN?")

    # From CLI:
    python scripts/generate_answer.py "What is the optimal sowing time for wheat?"
"""

import os
import sys
import logging
from pathlib import Path
from typing import Optional, Generator

# Ensure both workspace root and scripts dir are on sys.path
_CURRENT_DIR = Path(__file__).resolve().parent
_WORKSPACE_ROOT = _CURRENT_DIR.parent
if str(_WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(_WORKSPACE_ROOT))
if str(_CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(_CURRENT_DIR))

# LangChain Imports with fallback
try:
    from langchain_ollama import ChatOllama
except ImportError:
    try:
        from langchain_community.chat_models import ChatOllama
    except ImportError:
        ChatOllama = None

try:
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser
except ImportError:
    ChatPromptTemplate = None
    StrOutputParser = None

import requests

# Import retrieval function from previous step
try:
    from scripts.retrieve_context import get_relevant_context
except ImportError:
    try:
        from retrieve_context import get_relevant_context
    except ImportError:
        get_relevant_context = None

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("LlamaGenerator")

FALLBACK_MESSAGE = "I'm sorry, but I couldn't find that information in the uploaded data."

# ─────────────────────────────────────────────────────────────────────────────
# 1. Prompt Template
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = f"""You are a helpful and strictly grounded AI assistant.
Your task is to answer the user query based ONLY on the provided context below.

CRITICAL INSTRUCTIONS:
1. Answer the question using ONLY the facts explicitly mentioned in the provided context.
2. Do NOT extrapolate, assume, speculate, or bring in any outside knowledge.
3. If the answer cannot be directly and completely found in the provided context, you MUST respond with EXACTLY:
"{FALLBACK_MESSAGE}"
4. Do not offer partial guesses, apologies, or explanations beyond this exact sentence if the answer is missing."""

HUMAN_PROMPT = """Context:
{context}

User Query:
{query}

Answer:"""


def get_langchain_prompt_template() -> ChatPromptTemplate:
    """Returns the LangChain ChatPromptTemplate configured with system and human prompts."""
    return ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", HUMAN_PROMPT)
    ])


# ─────────────────────────────────────────────────────────────────────────────
# 2. Generation with LangChain & ChatOllama
# ─────────────────────────────────────────────────────────────────────────────

def generate_answer_langchain(
    query: str,
    context: str,
    model: str = "llama3.2",
    ollama_url: str = "http://localhost:11434",
    temperature: float = 0.0
) -> str:
    """
    Generates an answer using LangChain's ChatOllama model and LCEL chain.
    Temperature is set to 0.0 to ensure deterministic, hallucination-free generation.
    """
    if not context or not context.strip():
        return FALLBACK_MESSAGE

    prompt = get_langchain_prompt_template()
    llm = ChatOllama(
        model=model,
        base_url=ollama_url,
        temperature=temperature
    )
    chain = prompt | llm | StrOutputParser()

    response = chain.invoke({"context": context, "query": query})
    return response.strip()


# ─────────────────────────────────────────────────────────────────────────────
# 3. Direct Ollama API Generation (REST / requests)
# ─────────────────────────────────────────────────────────────────────────────

def generate_answer_api(
    query: str,
    context: str,
    model: str = "llama3.2",
    ollama_url: str = "http://localhost:11434",
    temperature: float = 0.0,
    timeout: int = 60
) -> str:
    """
    Direct HTTP call to Ollama's /api/chat endpoint without requiring LangChain.
    """
    if not context or not context.strip():
        return FALLBACK_MESSAGE

    endpoint = f"{ollama_url.rstrip('/')}/api/chat"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nUser Query:\n{query}\n\nAnswer:"}
        ],
        "options": {
            "temperature": temperature
        },
        "stream": False
    }

    try:
        res = requests.post(endpoint, json=payload, timeout=timeout)
        res.raise_for_status()
        data = res.json()
        message = data.get("message", {}).get("content", "").strip()
        return message or FALLBACK_MESSAGE
    except requests.exceptions.RequestException as err:
        logger.error("Failed to communicate with Ollama API at %s: %s", endpoint, err)
        raise


def stream_answer_api(
    query: str,
    context: str,
    model: str = "llama3.2",
    ollama_url: str = "http://localhost:11434",
    temperature: float = 0.0
) -> Generator[str, None, None]:
    """
    Streams response tokens in real-time from Ollama's /api/chat endpoint.
    """
    if not context or not context.strip():
        yield FALLBACK_MESSAGE
        return

    import json
    endpoint = f"{ollama_url.rstrip('/')}/api/chat"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nUser Query:\n{query}\n\nAnswer:"}
        ],
        "options": {"temperature": temperature},
        "stream": True
    }

    res = requests.post(endpoint, json=payload, stream=True, timeout=60)
    res.raise_for_status()
    for line in res.iter_lines():
        if line:
            chunk = json.loads(line.decode("utf-8"))
            content = chunk.get("message", {}).get("content", "")
            if content:
                yield content


# ─────────────────────────────────────────────────────────────────────────────
# 4. Full End-to-End Pipeline (Retrieve + Generate)
# ─────────────────────────────────────────────────────────────────────────────

def ask_rag(
    user_query: str,
    top_k: int = 3,
    chroma_dir: str = "./chroma_db",
    collection_name: str = "kisansahay_knowledge",
    ollama_url: str = "http://localhost:11434"
) -> str:
    """
    Complete end-to-end RAG pipeline:
    1. Retrieves top 3 chunks from ChromaDB using nomic-embed-text.
    2. Sends context + query to Llama 3.2 via Ollama using the strict prompt template.
    3. Returns the grounded answer or the required fallback message.
    """
    if get_relevant_context is None:
        raise ImportError("scripts.retrieve_context module could not be imported.")

    logger.info("Retrieving top %d context chunk(s) from ChromaDB for query: '%s'...", top_k, user_query)
    context = get_relevant_context(
        query=user_query,
        top_k=top_k,
        chroma_dir=chroma_dir,
        collection_name=collection_name,
        ollama_url=ollama_url
    )

    if not context:
        logger.info("No relevant context found in vector database.")
        return FALLBACK_MESSAGE

    logger.info("Context retrieved successfully (%d characters). Generating answer with Llama 3.2...", len(context))
    return generate_answer_langchain(
        query=user_query,
        context=context,
        model="llama3.2",
        ollama_url=ollama_url,
        temperature=0.0
    )


# ─────────────────────────────────────────────────────────────────────────────
# 5. CLI Execution
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    query_input = sys.argv[1] if len(sys.argv) > 1 else "How much financial support is given under PM-KISAN?"
    print("\n" + "=" * 65)
    print(f"🌾 USER QUERY: {query_input}")
    print("=" * 65)

    answer = ask_rag(query_input)

    print("\n🤖 LLAMA 3.2 RESPONSE:")
    print("=" * 65)
    print(answer)
    print("=" * 65 + "\n")
