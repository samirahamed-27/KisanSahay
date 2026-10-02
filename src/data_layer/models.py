"""
Data Models for KisanSahay Records
==================================
Defines validated data structures for the 6 core agricultural data streams:
1. KVK Directory (name, district, address, phone, website, soil-testing facility)
2. KVK Training & Demonstration Calendar
3. Seasonal Crop Advisories
4. Government Schemes & Loan Products (eligibility, documents, benefits, how to apply, deadlines)
5. Mandi Prices from Agmarknet / data.gov.in
6. IMD Agromet Weather Advisories
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass, asdict


@dataclass
class KVKDirectoryRecord:
    name: str
    district: str
    address: str
    phone: str
    website: str
    soil_testing_facility: bool
    host_organization: Optional[str] = None
    email: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class KVKCalendarRecord:
    kvk_name: str
    district: str
    training_topic: str
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    target_audience: str
    venue: str
    fees: str
    coordinator_contact: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CropAdvisoryRecord:
    crop_name: str
    season: str      # Kharif, Rabi, Zaid
    growth_stage: str
    advisory_text: str
    pest_disease_alerts: List[str]
    irrigation_guidance: str
    fertilizer_guidance: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class GovSchemeLoanRecord:
    scheme_name: str
    scheme_type: str     # 'Direct Subsidy', 'Subsidized Credit', 'Crop Insurance', 'Asset Mechanization'
    eligibility: List[str]
    documents: List[str]
    benefits: str
    how_to_apply: str
    deadlines: str
    helpline: Optional[str] = None
    portal_link: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class MandiPriceRecord:
    market_center: str
    district: str
    commodity: str
    variety: str
    arrival_date: str     # YYYY-MM-DD
    min_price: float      # INR per quintal
    max_price: float      # INR per quintal
    modal_price: float    # INR per quintal
    arrivals_tonnes: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class IMDAgrometRecord:
    district: str
    bulletin_date: str          # YYYY-MM-DD
    valid_until: str            # YYYY-MM-DD
    forecast_summary: str
    rainfall_forecast_mm: float
    temp_max_c: float
    temp_min_c: float
    agricultural_advisory: str
    spray_conditions: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
