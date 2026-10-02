"""
KisanSahay Ingestion & Validation Package
========================================
Modules for static document ingestion, volatile financial figure validation,
and two-tier chunking preservation.
"""

from .volatile_validator import (
    validate_record_volatile_figures,
    format_volatile_line,
    protect_volatile_notes,
    unprotect_volatile_notes,
    extract_volatile_figures_from_line,
    VolatileFigureValidator,
    ValidationError
)

__all__ = [
    "validate_record_volatile_figures",
    "format_volatile_line",
    "protect_volatile_notes",
    "unprotect_volatile_notes",
    "extract_volatile_figures_from_line",
    "VolatileFigureValidator",
    "ValidationError"
]
