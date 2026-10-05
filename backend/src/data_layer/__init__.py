"""
KisanSahay Data Layer Package
=============================
Exposes the automated source registry, SQLite data layer, and data models.
"""

from .data_layer import (
    KisanDataLayer,
    SourceRegistry,
    DEFAULT_TTL_POLICIES,
    DEFAULT_STALE_ACTION,
    canonicalize_json,
    get_utc_now,
    to_iso_utc,
    parse_iso_utc,
)
from .models import (
    KVKDirectoryRecord,
    KVKCalendarRecord,
    CropAdvisoryRecord,
    GovSchemeLoanRecord,
    MandiPriceRecord,
    IMDAgrometRecord,
)

from .exact_lookups import (
    get_kvk_directory,
    get_kvk_events,
    get_crop_advisories,
    get_mandi_prices,
    check_source_health,
    format_kvk_direct_answer,
    format_soil_testing_direct_answer,
    format_events_direct_answer,
    format_mandi_direct_answer,
    extract_district_from_text,
    extract_crop_from_text,
)

__all__ = [
    "KisanDataLayer",
    "SourceRegistry",
    "DEFAULT_TTL_POLICIES",
    "DEFAULT_STALE_ACTION",
    "canonicalize_json",
    "get_utc_now",
    "to_iso_utc",
    "parse_iso_utc",
    "KVKDirectoryRecord",
    "KVKCalendarRecord",
    "CropAdvisoryRecord",
    "GovSchemeLoanRecord",
    "IMDAgrometRecord",
    "DataLayer",
    "get_kvk_directory",
    "get_kvk_events",
    "get_crop_advisories",
    "get_mandi_prices",
    "check_source_health",
    "format_kvk_direct_answer",
    "format_soil_testing_direct_answer",
    "format_events_direct_answer",
    "format_mandi_direct_answer",
    "extract_district_from_text",
    "extract_crop_from_text",
]

DataLayer = KisanDataLayer

