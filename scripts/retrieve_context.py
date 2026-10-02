#!/usr/bin/env python3
"""
Context Retrieval Service for KisanSahay
========================================
Connects to the local ChromaDB vector store, embeds the user's incoming query
via Ollama's nomic-embed-text model, and retrieves the top 3 most relevant
context chunks as a concatenated string for RAG generation.

Usage:
    # As a module:
    from scripts.retrieve_context import get_relevant_context
    context = get_relevant_context("How much financial assistance under PM-KISAN?")

    # From CLI:
    python scripts/retrieve_context.py "What are the soil requirements for Wheat?"
"""

import sys
import logging
from typing import Optional

try:
    from langchain_chroma import Chroma
except ImportError:
    try:
        from langchain_community.vectorstores import Chroma
    except ImportError:
        print("Error: 'langchain-chroma' or 'langchain-community' is required.")
        sys.exit(1)

try:
    from langchain_ollama import OllamaEmbeddings
except ImportError:
    try:
        from langchain_community.embeddings import OllamaEmbeddings
    except ImportError:
        print("Error: 'langchain-ollama' or 'langchain-community' is required.")
        sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("RAGRetrieval")

# In-memory vector store cache for high-throughput calls
_VECTOR_STORE_CACHE: Optional[Chroma] = None


def get_vector_store(
    chroma_dir: str = "./chroma_db",
    collection_name: str = "kisansahay_knowledge",
    ollama_url: str = "http://localhost:11434",
    embed_model: str = "nomic-embed-text"
) -> Chroma:
    """
    Returns a cached ChromaDB instance to prevent re-initializing
    connections on repeated queries.
    """
    global _VECTOR_STORE_CACHE
    if _VECTOR_STORE_CACHE is None:
        logger.info("Initializing vector store from '%s' (collection: '%s')...", chroma_dir, collection_name)
        embeddings = OllamaEmbeddings(
            model=embed_model,
            base_url=ollama_url
        )
        _VECTOR_STORE_CACHE = Chroma(
            collection_name=collection_name,
            embedding_function=embeddings,
            persist_directory=chroma_dir
        )
    return _VECTOR_STORE_CACHE


def get_relevant_context(
    query: str,
    top_k: int = 3,
    chroma_dir: str = "./chroma_db",
    collection_name: str = "kisansahay_knowledge",
    ollama_url: str = "http://localhost:11434",
    embed_model: str = "nomic-embed-text",
    separator: str = "\n\n---\n\n"
) -> str:
    """
    Embeds the user query using the nomic-embed-text model via Ollama and
    performs a similarity search against the local ChromaDB vector store.
    
    Args:
        query (str): The user query / prompt.
        top_k (int): Number of top relevant chunks to retrieve (default: 3).
        chroma_dir (str): Persistence directory of the local Chroma database (default: './chroma_db').
        collection_name (str): Collection name in Chroma (default: 'kisansahay_knowledge').
        ollama_url (str): Local Ollama endpoint (default: 'http://localhost:11434').
        embed_model (str): Ollama embedding model name (default: 'nomic-embed-text').
        separator (str): Separator between concatenated chunks (default: '\\n\\n---\\n\\n').

    Returns:
        str: A concatenated string of the top 3 most relevant context chunks.
             Returns an empty string if no query is provided or no results found.
    """
    if not query or not query.strip():
        logger.warning("Empty query provided to get_relevant_context.")
        return ""

    try:
        # Load or retrieve cached vector store
        vector_store = get_vector_store(
            chroma_dir=chroma_dir,
            collection_name=collection_name,
            ollama_url=ollama_url,
            embed_model=embed_model
        )

        # Perform similarity search
        # LangChain automatically embeds the query using Ollama nomic-embed-text under the hood
        relevant_docs = vector_store.similarity_search(query.strip(), k=top_k)

        if not relevant_docs:
            logger.info("No matching chunks found for query: '%s'", query)
            return ""

        # Extract page_content from each Document and strip extra whitespace
        chunks = [doc.page_content.strip() for doc in relevant_docs if doc.page_content]

        # Return concatenated string
        return separator.join(chunks)

    except Exception as err:
        logger.error("Error retrieving context for query '%s': %s", query, err)
        raise


def retrieve(question: str, state: Optional[str] = None, n: int = 6, **kwargs):
    """Convenience alias exposing src.rag.retrieve."""
    from src.rag.retrieval import retrieve as _retrieve
    return _retrieve(question=question, state=state, n=n, **kwargs)


if __name__ == "__main__":
    test_query = sys.argv[1] if len(sys.argv) > 1 else "How much financial assistance is provided under PM-KISAN?"
    print(f"\n🔎 Query: '{test_query}'\n")
    context_output = get_relevant_context(test_query, top_k=3)
    print("=" * 60)
    print("📄 RETRIEVED CONTEXT CHUNKS:")
    print("=" * 60)
    print(context_output)
    print("=" * 60)

