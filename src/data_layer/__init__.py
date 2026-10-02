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
]

DataLayer = KisanDataLayer

