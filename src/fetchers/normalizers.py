"""
Normalizers and Validators for KisanSahay Fetchers
==================================================
Provides standardized cleanup and strict validation across all adapters:
- State and District canonical name normalization
- KVK and helpline phone number format validation
- Strict HTTPS source_url verification
- Robust date parsing and standardization to YYYY-MM-DD
"""

import re
from datetime import datetime
from urllib.parse import urlparse
from typing import Tuple, Optional, Dict

# Canonical mapping for Indian States and Union Territories
STATE_CANONICAL_MAP: Dict[str, str] = {
    "mp": "Madhya Pradesh",
    "m.p.": "Madhya Pradesh",
    "madhya pradesh": "Madhya Pradesh",
    "madhyapradesh": "Madhya Pradesh",
    "up": "Uttar Pradesh",
    "u.p.": "Uttar Pradesh",
    "uttar pradesh": "Uttar Pradesh",
    "uttarpradesh": "Uttar Pradesh",
    "mh": "Maharashtra",
    "maharashtra": "Maharashtra",
    "rj": "Rajasthan",
    "raj": "Rajasthan",
    "rajasthan": "Rajasthan",
    "pb": "Punjab",
    "punjab": "Punjab",
    "hr": "Haryana",
    "haryana": "Haryana",
    "bihar": "Bihar",
    "br": "Bihar",
    "gujarat": "Gujarat",
    "gj": "Gujarat",
    "chhattisgarh": "Chhattisgarh",
    "cg": "Chhattisgarh",
    "west bengal": "West Bengal",
    "wb": "West Bengal",
    "karnataka": "Karnataka",
    "tamil nadu": "Tamil Nadu",
    "tn": "Tamil Nadu",
    "telangana": "Telangana",
    "andhra pradesh": "Andhra Pradesh",
    "ap": "Andhra Pradesh",
    "odisha": "Odisha",
    "orissa": "Odisha",
    "kerala": "Kerala",
    "jharkhand": "Jharkhand",
    "assam": "Assam",
    "himachal pradesh": "Himachal Pradesh",
    "hp": "Himachal Pradesh",
    "uttarakhand": "Uttarakhand",
    "all-india": "All India",
    "all india": "All India",
    "central": "All India",
}

# Common spelling variations and district aliases for key agricultural states
DISTRICT_CANONICAL_MAP: Dict[str, str] = {
    # Madhya Pradesh
    "sehor": "Sehore",
    "sehore": "Sehore",
    "bhopal": "Bhopal",
    "indore": "Indore",
    "indor": "Indore",
    "ujjain": "Ujjain",
    "ujjan": "Ujjain",
    "dewas": "Dewas",
    "dhar": "Dhar",
    "jabalpur": "Jabalpur",
    "gwalior": "Gwalior",
    "vidisha": "Vidisha",
    "raisen": "Raisen",
    "hoshangabad": "Narmadapuram",
    "narmadapuram": "Narmadapuram",
    "khargone": "Khargone",
    "khandwa": "Khandwa",
    "harda": "Harda",
    "sagar": "Sagar",
    "chhindwara": "Chhindwara",
    "rewan": "Rewa",
    "rewa": "Rewa",
    "satna": "Satna",
    "morena": "Morena",
    "bhind": "Bhind",
    "sheopur": "Sheopur",
    "mandsaur": "Mandsaur",
    "neemuch": "Neemuch",
    "ratlam": "Ratlam",
    "shajapur": "Shajapur",
    "agar malwa": "Agar Malwa",

    # Uttar Pradesh
    "kanpur": "Kanpur",
    "kanpur nagar": "Kanpur",
    "kanpur dehat": "Kanpur Dehat",
    "lucknow": "Lucknow",
    "varanasi": "Varanasi",
    "benaras": "Varanasi",
    "allahabad": "Prayagraj",
    "prayagraj": "Prayagraj",
    "barabanki": "Barabanki",
    "faizabad": "Ayodhya",
    "ayodhya": "Ayodhya",
    "gorakhpur": "Gorakhpur",
    "agra": "Agra",
    "aligarh": "Aligarh",
    "mathura": "Mathura",
    "meerut": "Meerut",
    "bareilly": "Bareilly",
    "moradabad": "Moradabad",
    "jhansi": "Jhansi",
    "mirzapur": "Mirzapur",
    "basti": "Basti",
    "hapur": "Hapur",

    # Generic / All
    "all": "All",
    "all districts": "All",
    "statewide": "All",
}

# Regex for standard Indian landline numbers, STD codes, mobile, and toll-free numbers
PHONE_REGEX = re.compile(
    r"^(?:"
    r"1800[-\s]?\d{2,4}[-\s]?\d{3,5}|"       # Toll-free: 1800-11-5526, 1800-180-1551
    r"0\d{2,4}[-\s]?\d{6,8}|"                 # STD Landline: 07562-222456, 011-25841234
    r"(?:\+91|91)?[-\s]?[6-9]\d{9}|"          # Mobile: +91-9425012345, 9876543210
    r"\d{3,5}[-\s]\d{6,8}"                    # Generic spaced landline
    r")$"
)


def normalize_state(raw_state: Optional[str]) -> str:
    """Normalizes state string to canonical title-cased Indian state name."""
    if not raw_state:
        return "All India"
    cleaned = raw_state.strip().lower()
    cleaned = re.sub(r"[_\-]+", " ", cleaned)
    return STATE_CANONICAL_MAP.get(cleaned, raw_state.strip().title())


def normalize_district(raw_district: Optional[str]) -> str:
    """Normalizes district string to canonical standard spelling."""
    if not raw_district:
        return "All"
    cleaned = raw_district.strip().lower()
    cleaned = re.sub(r"[_\-]+", " ", cleaned)
    cleaned = re.sub(r"\s+district$", "", cleaned)
    return DISTRICT_CANONICAL_MAP.get(cleaned, raw_district.strip().title())


def validate_phone(phone_str: Optional[str]) -> Tuple[bool, str]:
    """
    Validates Indian contact telephone format (STD landlines, mobile, toll-free).
    Returns (is_valid, normalized_phone_or_error_reason).
    """
    if not phone_str:
        return False, "Phone number is missing or empty"

    cleaned = phone_str.strip()
    # Normalize internal dashes and spaces
    cleaned = re.sub(r"[^\d\+\-\s]", "", cleaned)

    # Check against regex pattern
    if not PHONE_REGEX.match(cleaned):
        return False, f"Invalid phone format: '{phone_str}'. Must be standard Indian STD landline, mobile (+91), or 1800 toll-free."

    # Minimum digit count check (excluding country code)
    digits_only = re.sub(r"\D", "", cleaned)
    if len(digits_only) < 8 or len(digits_only) > 13:
        return False, f"Phone digit count anomaly: {len(digits_only)} digits in '{phone_str}'."

    return True, cleaned


def validate_https_url(url: Optional[str]) -> Tuple[bool, str]:
    """
    Validates that a URL is a well-formed, secure HTTPS resource.
    Returns (is_valid, validated_url_or_reason).
    """
    if not url:
        return False, "URL is missing or empty"

    cleaned = url.strip()
    try:
        parsed = urlparse(cleaned)
        if parsed.scheme.lower() != "https":
            return False, f"URL scheme must be 'https' (got '{parsed.scheme}://'): '{url}'"
        if not parsed.netloc or "." not in parsed.netloc:
            return False, f"URL missing valid domain/netloc: '{url}'"
        return True, cleaned
    except Exception as e:
        return False, f"Malformed URL '{url}': {e}"


def validate_date(date_str: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Parses and standardizes any calendar date to ISO YYYY-MM-DD.
    Returns (normalized_date_str, error_message).
    """
    if not date_str:
        return None, "Date string is missing or empty"

    cleaned = date_str.strip()
    # Remove ordinal suffixes like 1st, 2nd, 3rd, 4th
    cleaned = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", cleaned)

    candidate_formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d.%m.%Y",
        "%Y/%m/%d",
        "%d %B %Y",
        "%d %b %Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%SZ",
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
    ]

    for fmt in candidate_formats:
        try:
            dt = datetime.strptime(cleaned, fmt)
            return dt.strftime("%Y-%m-%d"), None
        except ValueError:
            continue

    # Attempt regex extraction of YYYY-MM-DD
    match = re.search(r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})", cleaned)
    if match:
        y, m, d = match.groups()
        try:
            dt = datetime(int(y), int(m), int(d))
            return dt.strftime("%Y-%m-%d"), None
        except ValueError:
            pass

    return None, f"Unparseable date format: '{date_str}'"
