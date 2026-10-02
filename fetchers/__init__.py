"""
Root alias for KisanSahay fetchers package.
Re-exports everything from src.fetchers.
"""

from src.fetchers import (
    BaseFetcher,
    RejectedRecord,
    VolumeDropAnomalyError,
    RateLimiter,
    normalize_state,
    normalize_district,
    validate_phone,
    validate_https_url,
    validate_date,
    KVKDirectoryParser,
    KVKCalendarParser,
    CropAdvisoryParser,
    GovSchemeLoanParser,
    AgmarknetMandiParser,
    IMDAgrometParser,
    PARSER_REGISTRY,
    get_fetcher_for_source,
)

__all__ = [
    "BaseFetcher",
    "RejectedRecord",
    "VolumeDropAnomalyError",
    "RateLimiter",
    "normalize_state",
    "normalize_district",
    "validate_phone",
    "validate_https_url",
    "validate_date",
    "KVKDirectoryParser",
    "KVKCalendarParser",
    "CropAdvisoryParser",
    "GovSchemeLoanParser",
    "AgmarknetMandiParser",
    "IMDAgrometParser",
    "PARSER_REGISTRY",
    "get_fetcher_for_source",
]
