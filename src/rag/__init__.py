"""
KisanSahay RAG Package
======================
Exports:
- retrieve: Fresh retrieval from ChromaDB with state and live status filters
- evaluate_eligibility: Deterministic Python rule evaluation
- generate_with_gemini: Grounded answer generation following Gemini rules
"""

from .retrieval import retrieve, build_chroma_where_filter
from .eligibility_engine import evaluate_eligibility, extract_farmer_attributes
from .gemini_generator import generate_with_gemini

__all__ = [
    "retrieve",
    "build_chroma_where_filter",
    "evaluate_eligibility",
    "extract_farmer_attributes",
    "generate_with_gemini",
]
