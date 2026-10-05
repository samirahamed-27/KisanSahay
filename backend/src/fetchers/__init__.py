"""
KisanSahay Fetchers Package
===========================
Exports all source adapters matching sources.yaml:
- KVKDirectoryParser (kvk_directory)
- KVKCalendarParser (kvk_training_calendar)
- CropAdvisoryParser (crop_advisory)
- GovSchemeLoanParser (gov_schemes_loans)
- AgmarknetMandiParser (mandi_prices)
- IMDAgrometParser (imd_weather_advisory)
"""

from typing import Dict, Any, Type

from .base import (
    BaseFetcher,
    RejectedRecord,
    VolumeDropAnomalyError,
    RateLimiter,
)
from .normalizers import (
    normalize_state,
    normalize_district,
    validate_phone,
    validate_https_url,
    validate_date,
)
from .kvk_directory import KVKDirectoryParser
from .kvk_calendar import KVKCalendarParser
from .crop_advisory import CropAdvisoryParser
from .gov_schemes import GovSchemeLoanParser
from .mandi_prices import AgmarknetMandiParser
from .imd_agromet import IMDAgrometParser

PARSER_REGISTRY: Dict[str, Type[BaseFetcher]] = {
    "KVKDirectoryParser": KVKDirectoryParser,
    "KVKCalendarParser": KVKCalendarParser,
    "CropAdvisoryParser": CropAdvisoryParser,
    "GovSchemeLoanParser": GovSchemeLoanParser,
    "AgmarknetMandiParser": AgmarknetMandiParser,
    "IMDAgrometParser": IMDAgrometParser,
}


def get_fetcher_for_source(source_config: Dict[str, Any], **kwargs: Any) -> BaseFetcher:
    """Factory creating the appropriate adapter instance based on parser_name in source_config."""
    parser_name = source_config.get("parser_name", "")
    cls = PARSER_REGISTRY.get(parser_name)
    if not cls:
        raise ValueError(f"Unknown parser_name '{parser_name}'. Registered: {list(PARSER_REGISTRY.keys())}")
    return cls(source_config=source_config, **kwargs)


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
