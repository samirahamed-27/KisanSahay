"""
KisanSahay Exact Database Lookups & Direct Direct Answering Engine
==================================================================
Loads KVK directories, training calendars, crop advisories, and mandi
wholesale prices directly from SQLite data layer records, with source
freshness and failure telemetry.
"""

import json
import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

logger = logging.getLogger("ExactLookups")

# Canonical Madhya Pradesh Districts for Normalization
MP_DISTRICTS = [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani",
    "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara",
    "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior",
    "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni",
    "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur",
    "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa",
    "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur",
    "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"
]

CROP_ALIASES = {
    "soybean": "Soybean",
    "soyabean": "Soybean",
    "wheat": "Wheat",
    "gehun": "Wheat",
    "gehu": "Wheat",
    "gram": "Gram (Chickpea)",
    "chickpea": "Gram (Chickpea)",
    "chana": "Gram (Chickpea)",
    "mustard": "Mustard",
    "sarson": "Mustard",
    "rai": "Mustard",
    "maize": "Maize",
    "corn": "Maize",
    "makka": "Maize",
    "paddy": "Paddy (Dhan)",
    "rice": "Paddy (Dhan)",
    "dhan": "Paddy (Dhan)",
    "cotton": "Cotton",
    "kapas": "Cotton",
    "onion": "Onion",
    "pyaz": "Onion",
    "garlic": "Garlic",
    "lahsun": "Garlic"
}


def extract_district_from_text(text: str) -> Optional[str]:
    """Finds district name in query text."""
    t = text.lower()
    for d in MP_DISTRICTS:
        if re.search(r"\b" + re.escape(d.lower()) + r"\b", t):
            return d
    return None


def extract_crop_from_text(text: str) -> Optional[str]:
    """Finds recognized crop commodity in query text."""
    t = text.lower()
    for alias, canonical in CROP_ALIASES.items():
        if re.search(r"\b" + re.escape(alias) + r"\b", t):
            return canonical
    return None


def check_source_health(
    source_id: str,
    data_layer: Any = None
) -> Dict[str, Any]:
    """
    Checks if a data source is currently failing in sync_log or has stale records.
    Returns: { "is_failing": bool, "last_result": str, "last_error": str, "last_sync": str }
    """
    if data_layer is None:
        from src.data_layer import KisanDataLayer
        data_layer = KisanDataLayer()

    with data_layer.get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT result, error, started_at, completed_at
            FROM sync_log
            WHERE source_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (source_id,)
        )
        row = cur.fetchone()

        # Check staleness on live records
        cur.execute(
            """
            SELECT COUNT(*) as total, SUM(is_stale) as stale_count
            FROM records
            WHERE source_id = ? AND status = 'live'
            """,
            (source_id,)
        )
        stale_row = cur.fetchone()

    is_failing = False
    last_result = "unknown"
    last_error = None
    last_sync = None

    if row:
        last_result = row["result"]
        last_error = row["error"]
        last_sync = row["completed_at"] or row["started_at"]
        if last_result == "failure":
            is_failing = True

    if stale_row and stale_row["total"] and stale_row["total"] > 0:
        if stale_row["stale_count"] == stale_row["total"]:
            is_failing = True

    return {
        "is_failing": is_failing,
        "last_result": last_result,
        "last_error": last_error,
        "last_sync": last_sync
    }


# ─────────────────────────────────────────────────────────────────────────────
# 1. Exact KVK Directory Lookup
# ─────────────────────────────────────────────────────────────────────────────

def get_kvk_directory(
    district: Optional[str] = None,
    state: Optional[str] = "Madhya Pradesh",
    data_layer: Any = None
) -> Dict[str, Any]:
    """
    Loads KVK directory records from SQLite records table (type='kvk_directory').
    Does NOT use static JSON files.
    """
    if data_layer is None:
        from src.data_layer import KisanDataLayer
        data_layer = KisanDataLayer()

    source_id = f"src_kvk_directory_{state or 'Madhya Pradesh'}"
    health = check_source_health(source_id, data_layer)

    query_sql = "SELECT * FROM records WHERE type = 'kvk_directory' AND status = 'live'"
    params: List[Any] = []

    if state:
        query_sql += " AND (LOWER(state) = LOWER(?) OR state IN ('ALL', 'All', 'India'))"
        params.append(state.strip())

    if district and district.strip() and district.lower() not in ["all", "any"]:
        query_sql += " AND (LOWER(district) = LOWER(?) OR district IN ('ALL', 'All'))"
        params.append(district.strip())

    query_sql += " ORDER BY last_verified DESC"

    with data_layer.get_connection() as conn:
        cur = conn.cursor()
        cur.execute(query_sql, tuple(params))
        rows = cur.fetchall()

    records = []
    latest_verified = ""
    for r in rows:
        row_dict = dict(r)
        content = {}
        try:
            content = json.loads(row_dict.get("content_json", "{}"))
        except Exception:
            pass

        rec_item = {
            "record_id": row_dict["id"],
            "name": content.get("name") or f"ICAR - Krishi Vigyan Kendra, {row_dict['district']}",
            "district": row_dict["district"],
            "state": row_dict["state"],
            "address": content.get("address", "KVK Campus"),
            "phone": content.get("phone", "Official Helpline"),
            "email": content.get("email", ""),
            "website": content.get("website", row_dict["source_url"]),
            "soil_testing_facility": bool(content.get("soil_testing_facility", False)),
            "host_organization": content.get("host_organization", "ICAR / SAU"),
            "last_verified": row_dict["last_verified"],
            "is_stale": bool(row_dict["is_stale"])
        }
        records.append(rec_item)
        if str(row_dict["last_verified"]) > latest_verified:
            latest_verified = str(row_dict["last_verified"])

    return {
        "status": "success",
        "data_type": "kvk_directory",
        "state": state or "Madhya Pradesh",
        "district": district,
        "count": len(records),
        "records": records,
        "last_updated": latest_verified[:10] if latest_verified else datetime.utcnow().strftime("%Y-%m-%d"),
        "source_name": "ICAR Krishi Vigyan Kendra (KVK) Portal",
        "source_url": "https://kvk.icar.gov.in",
        "is_source_failing": health["is_failing"]
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. Upcoming KVK Events & Trainings Lookup
# ─────────────────────────────────────────────────────────────────────────────

def get_kvk_events(
    district: Optional[str] = None,
    state: Optional[str] = "Madhya Pradesh",
    data_layer: Any = None
) -> Dict[str, Any]:
    """
    Loads upcoming trainings and demonstrations from SQLite (type='kvk_training_calendar').
    """
    if data_layer is None:
        from src.data_layer import KisanDataLayer
        data_layer = KisanDataLayer()

    source_id = f"src_kvk_calendar_{state or 'Madhya Pradesh'}"
    health = check_source_health(source_id, data_layer)

    query_sql = "SELECT * FROM records WHERE type = 'kvk_training_calendar' AND status = 'live'"
    params: List[Any] = []

    if state:
        query_sql += " AND (LOWER(state) = LOWER(?) OR state IN ('ALL', 'All', 'India'))"
        params.append(state.strip())

    if district and district.strip() and district.lower() not in ["all", "any"]:
        query_sql += " AND (LOWER(district) = LOWER(?) OR district IN ('ALL', 'All'))"
        params.append(district.strip())

    query_sql += " ORDER BY last_verified DESC"

    with data_layer.get_connection() as conn:
        cur = conn.cursor()
        cur.execute(query_sql, tuple(params))
        rows = cur.fetchall()

    events = []
    latest_verified = ""
    for r in rows:
        row_dict = dict(r)
        content = {}
        try:
            content = json.loads(row_dict.get("content_json", "{}"))
        except Exception:
            pass

        evt_item = {
            "record_id": row_dict["id"],
            "kvk_name": content.get("kvk_name") or f"ICAR - KVK {row_dict['district']}",
            "district": row_dict["district"],
            "training_topic": content.get("training_topic", "Agricultural Skill & Field Training"),
            "start_date": content.get("start_date", ""),
            "end_date": content.get("end_date", ""),
            "venue": content.get("venue", "KVK Campus / Demonstration Field"),
            "fees": content.get("fees", "Free of Cost"),
            "target_audience": content.get("target_audience", "Farmers & Rural Youth"),
            "coordinator_contact": content.get("coordinator_contact", "KVK Office"),
            "last_verified": row_dict["last_verified"],
            "is_stale": bool(row_dict["is_stale"])
        }
        events.append(evt_item)
        if str(row_dict["last_verified"]) > latest_verified:
            latest_verified = str(row_dict["last_verified"])

    # Sort events chronologically by start date
    events.sort(key=lambda x: x.get("start_date") or "9999-12-31")

    return {
        "status": "success",
        "data_type": "kvk_training_calendar",
        "state": state or "Madhya Pradesh",
        "district": district,
        "count": len(events),
        "records": events,
        "last_updated": latest_verified[:10] if latest_verified else datetime.utcnow().strftime("%Y-%m-%d"),
        "source_name": "KVK Seasonal Training & Demonstration Calendar",
        "source_url": "https://kvk.icar.gov.in",
        "is_source_failing": health["is_failing"]
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. Current Crop & Weather Advisories Lookup
# ─────────────────────────────────────────────────────────────────────────────

def get_crop_advisories(
    crop: Optional[str] = None,
    state: Optional[str] = "Madhya Pradesh",
    district: Optional[str] = None,
    data_layer: Any = None
) -> Dict[str, Any]:
    """
    Loads seasonal crop and IMD weather advisories from SQLite.
    """
    if data_layer is None:
        from src.data_layer import KisanDataLayer
        data_layer = KisanDataLayer()

    source_id = f"src_crop_advisories_{state or 'Madhya Pradesh'}"
    health = check_source_health(source_id, data_layer)

    query_sql = "SELECT * FROM records WHERE type IN ('crop_advisory', 'imd_weather_advisory') AND status = 'live'"
    params: List[Any] = []

    if state:
        query_sql += " AND (LOWER(state) = LOWER(?) OR state IN ('ALL', 'All', 'India'))"
        params.append(state.strip())

    if district and district.strip() and district.lower() not in ["all", "any"]:
        query_sql += " AND (LOWER(district) = LOWER(?) OR district IN ('ALL', 'All'))"
        params.append(district.strip())

    query_sql += " ORDER BY last_verified DESC"

    with data_layer.get_connection() as conn:
        cur = conn.cursor()
        cur.execute(query_sql, tuple(params))
        rows = cur.fetchall()

    advisories = []
    latest_verified = ""
    target_crop_norm = crop.strip().lower() if crop else None

    for r in rows:
        row_dict = dict(r)
        content = {}
        try:
            content = json.loads(row_dict.get("content_json", "{}"))
        except Exception:
            pass

        crop_name = content.get("crop_name", "")
        # Filter by crop if specified
        if target_crop_norm and row_dict["type"] == "crop_advisory":
            if target_crop_norm not in crop_name.lower() and crop_name.lower() not in target_crop_norm:
                continue

        item = {
            "record_id": row_dict["id"],
            "type": row_dict["type"],
            "state": row_dict["state"],
            "district": row_dict["district"],
            "crop_name": crop_name,
            "season": content.get("season", "Current Season"),
            "growth_stage": content.get("growth_stage", ""),
            "advisory_text": content.get("advisory_text") or content.get("agricultural_advisory") or "",
            "pest_disease_alerts": content.get("pest_disease_alerts", []),
            "fertilizer_guidance": content.get("fertilizer_guidance", ""),
            "irrigation_guidance": content.get("irrigation_guidance", ""),
            "forecast_summary": content.get("forecast_summary", ""),
            "rainfall_forecast_mm": content.get("rainfall_forecast_mm"),
            "spray_conditions": content.get("spray_conditions", ""),
            "last_verified": row_dict["last_verified"],
            "source_url": row_dict["source_url"]
        }
        advisories.append(item)
        if str(row_dict["last_verified"]) > latest_verified:
            latest_verified = str(row_dict["last_verified"])

    return {
        "status": "success",
        "data_type": "advisories",
        "state": state or "Madhya Pradesh",
        "crop": crop,
        "district": district,
        "count": len(advisories),
        "records": advisories,
        "last_updated": latest_verified[:10] if latest_verified else datetime.utcnow().strftime("%Y-%m-%d"),
        "source_name": "Farmer.gov.in / IMD Agromet Bulletin",
        "source_url": "https://farmer.gov.in/CropAdvisories.aspx",
        "is_source_failing": health["is_failing"]
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. Latest Mandi Wholesale Prices Lookup
# ─────────────────────────────────────────────────────────────────────────────

def get_mandi_prices(
    crop: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = "Madhya Pradesh",
    data_layer: Any = None
) -> Dict[str, Any]:
    """
    Loads latest mandi wholesale prices from SQLite (type='mandi_prices').
    """
    if data_layer is None:
        from src.data_layer import KisanDataLayer
        data_layer = KisanDataLayer()

    source_id = f"src_mandi_prices_{state or 'Madhya Pradesh'}"
    health = check_source_health(source_id, data_layer)

    query_sql = "SELECT * FROM records WHERE type = 'mandi_prices' AND status = 'live'"
    params: List[Any] = []

    if state:
        query_sql += " AND (LOWER(state) = LOWER(?) OR state IN ('ALL', 'All', 'India'))"
        params.append(state.strip())

    if district and district.strip() and district.lower() not in ["all", "any"]:
        query_sql += " AND (LOWER(district) = LOWER(?) OR district IN ('ALL', 'All'))"
        params.append(district.strip())

    query_sql += " ORDER BY last_verified DESC"

    with data_layer.get_connection() as conn:
        cur = conn.cursor()
        cur.execute(query_sql, tuple(params))
        rows = cur.fetchall()

    prices = []
    latest_verified = ""
    target_crop_norm = (CROP_ALIASES.get(crop.lower()) or crop).strip().lower() if crop else None

    for r in rows:
        row_dict = dict(r)
        content = {}
        try:
            content = json.loads(row_dict.get("content_json", "{}"))
        except Exception:
            pass

        comm = content.get("commodity", "")
        # Filter by commodity if supplied
        if target_crop_norm:
            comm_lower = comm.lower()
            if target_crop_norm not in comm_lower and comm_lower not in target_crop_norm:
                continue

        p_item = {
            "record_id": row_dict["id"],
            "market_center": content.get("market_center", row_dict["district"]),
            "district": row_dict["district"],
            "state": row_dict["state"],
            "commodity": comm,
            "variety": content.get("variety", "General"),
            "arrival_date": content.get("arrival_date", row_dict["last_verified"][:10]),
            "min_price": content.get("min_price", 0.0),
            "max_price": content.get("max_price", 0.0),
            "modal_price": content.get("modal_price", 0.0),
            "arrivals_tonnes": content.get("arrivals_tonnes", 0.0),
            "last_verified": row_dict["last_verified"]
        }
        prices.append(p_item)
        if str(row_dict["last_verified"]) > latest_verified:
            latest_verified = str(row_dict["last_verified"])

    return {
        "status": "success",
        "data_type": "mandi_prices",
        "state": state or "Madhya Pradesh",
        "district": district,
        "crop": crop,
        "count": len(prices),
        "records": prices,
        "last_updated": latest_verified[:10] if latest_verified else datetime.utcnow().strftime("%Y-%m-%d"),
        "source_name": "Agmarknet / e-NAM Mandi Network",
        "source_url": "https://agmarknet.gov.in",
        "is_source_failing": health["is_failing"]
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. Direct Zero-Model Chat Formatters
# ─────────────────────────────────────────────────────────────────────────────

def format_kvk_direct_answer(kvk_res: Dict[str, Any], lang: str = "en") -> str:
    """Formats exact KVK directory direct response without calling any LLM model."""
    records = kvk_res.get("records", [])
    district = kvk_res.get("district") or "your district"
    last_up = kvk_res.get("last_updated") or datetime.utcnow().strftime("%Y-%m-%d")
    src_name = kvk_res.get("source_name") or "ICAR Krishi Vigyan Kendra Portal"
    is_failing = kvk_res.get("is_source_failing", False)

    if not records:
        if lang == "hi":
            return (
                f"**कृषि विज्ञान केंद्र (KVK) संपर्क जानकारी**\n\n"
                f"वर्तमान में {district} के लिए KVK डेटाबेस में कोई सीधा रिकॉर्ड नहीं मिला। "
                f"कृपया मध्य प्रदेश के नजदीकी KVK या ICAR पोर्टल (https://kvk.icar.gov.in) पर संपर्क करें।\n\n"
                f"Updated on {last_up} – source: {src_name}"
            )
        return (
            f"**Krishi Vigyan Kendra (KVK) Directory**\n\n"
            f"No specific KVK record is currently indexed for {district}. "
            f"Please visit the official ICAR KVK portal at https://kvk.icar.gov.in to locate centers in adjacent districts.\n\n"
            f"Updated on {last_up} – source: {src_name}"
        )

    k = records[0]
    facility_str = "उपलब्ध है (सक्रिय लैब)" if k["soil_testing_facility"] else "परिसर में उपलब्ध नहीं"
    facility_str_en = "Available (Active On-Site Lab)" if k["soil_testing_facility"] else "Not Available on-site"

    if lang == "hi":
        ans = (
            f"**🏛️ कृषि विज्ञान केंद्र (KVK) विवरण: {k['name']}**\n\n"
            f"• **ज़िला:** {k['district']}, {k['state']}\n"
            f"• **पता:** {k['address']}\n"
            f"• **हेल्पलाइन / फ़ोन:** {k['phone']}\n"
            f"• **ईमेल:** {k['email'] or 'उपलब्ध नहीं'}\n"
            f"• **मृदा परीक्षण लैब (Soil Testing):** {facility_str}\n"
            f"• **संस्थान:** {k['host_organization']}\n"
            f"• **आधिकारिक वेबसाइट:** {k['website']}\n\n"
            f"Updated on {last_up} – source: {src_name}"
        )
    else:
        ans = (
            f"**🏛️ Krishi Vigyan Kendra (KVK) Contact Details: {k['name']}**\n\n"
            f"• **District:** {k['district']}, {k['state']}\n"
            f"• **Postal Address:** {k['address']}\n"
            f"• **Telephone Helpline:** {k['phone']}\n"
            f"• **Email:** {k['email'] or 'N/A'}\n"
            f"• **Soil Testing Facility:** {facility_str_en}\n"
            f"• **Host Organization:** {k['host_organization']}\n"
            f"• **Official Website:** {k['website']}\n\n"
            f"Updated on {last_up} – source: {src_name}"
        )

    if is_failing:
        ans += f"\n\n⚠️ **Notice:** This source is currently experiencing sync delays. Showing latest cached records as of {last_up}."

    return ans


def format_soil_testing_direct_answer(kvk_res: Dict[str, Any], lang: str = "en") -> str:
    """Formats exact Soil Testing direct answer from KVK record."""
    records = kvk_res.get("records", [])
    district = kvk_res.get("district") or "your area"
    last_up = kvk_res.get("last_updated") or datetime.utcnow().strftime("%Y-%m-%d")
    src_name = kvk_res.get("source_name") or "ICAR Krishi Vigyan Kendra Portal"
    is_failing = kvk_res.get("is_source_failing", False)

    if not records:
        if lang == "hi":
            return (
                f"**मृदा परीक्षण (Soil Testing) सुविधा**\n\n"
                f"आपके ज़िले के KVK या निकटतम प्रयोगशाला में मृदा परीक्षण उपलब्ध है। किसान अपने खेत से 8-10 स्थानों से मिट्टी का नमूना V-आकार में 15 सेमी गहराई से एकत्र कर निकटतम KVK या किसान सेवा केंद्र पर जमा कर सकते हैं।\n\n"
                f"Updated on {last_up} – source: {src_name}"
            )
        return (
            f"**Soil Testing Facilities at Krishi Vigyan Kendra (KVK)**\n\n"
            f"Soil and irrigation water testing is provided at authorized KVK laboratories. "
            f"Collect representative soil samples across 8–10 field spots (0–15 cm depth in a V-shape), dry under shade, and submit sample packets to your district KVK lab.\n\n"
            f"Updated on {last_up} – source: {src_name}"
        )

    k = records[0]
    has_facility = k["soil_testing_facility"]

    if lang == "hi":
        status_text = "✅ **मृदा एवं जल परीक्षण प्रयोगशाला उपलब्ध है**" if has_facility else "ℹ️ **ऑन-साइट लैब उपलब्ध नहीं है** (नमूने राज्य संभागीय लैब भेजे जाते हैं)"
        ans = (
            f"**🧪 मृदा परीक्षण सुविधा: {k['name']}**\n\n"
            f"{status_text}\n\n"
            f"• **ज़िला:** {k['district']}\n"
            f"• **प्रयोगशाला का पता:** {k['address']}\n"
            f"• **फ़ोन नंबर:** {k['phone']}\n"
            f"• **नमूना जमा करने की प्रक्रिया:** खेत से V-शेप में 15 सेमी गहरा नमूना लेकर 500 ग्राम सूखी मिट्टी KVK केंद्र में जमा करें।\n"
            f"• **जांच पैरामीटर:** 12 प्रमुख पोषक तत्व (नाइट्रोजन, फास्फोरस, पोटाश, पीएच, जैविक कार्बन, सूक्ष्म तत्व)।\n\n"
            f"Updated on {last_up} – source: {src_name}"
        )
    else:
        status_text = "✅ **Active Soil & Irrigation Water Testing Lab On-Site**" if has_facility else "ℹ️ **No On-Site Lab** (Intake samples are forwarded to divisional testing labs)"
        ans = (
            f"**🧪 Soil Testing Facility at {k['name']}**\n\n"
            f"{status_text}\n\n"
            f"• **District:** {k['district']}\n"
            f"• **Testing Lab Address:** {k['address']}\n"
            f"• **Helpline Contact:** {k['phone']}\n"
            f"• **Sample Intake Procedure:** Collect 500g composite soil sample from 15cm root zone depth across the field and submit at KVK intake counter.\n"
            f"• **Diagnostic Coverage:** Complete Soil Health Card profiling across 12 parameters (N, P, K, pH, EC, Organic Carbon, and Micronutrients).\n\n"
            f"Updated on {last_up} – source: {src_name}"
        )

    if is_failing:
        ans += f"\n\n⚠️ **Notice:** This source is currently experiencing sync delays. Showing latest cached records as of {last_up}."

    return ans


def format_events_direct_answer(events_res: Dict[str, Any], lang: str = "en") -> str:
    """Formats upcoming KVK trainings direct answer."""
    records = events_res.get("records", [])
    district = events_res.get("district") or "all districts"
    last_up = events_res.get("last_updated") or datetime.utcnow().strftime("%Y-%m-%d")
    src_name = events_res.get("source_name") or "KVK Seasonal Training & Demonstration Calendar"
    is_failing = events_res.get("is_source_failing", False)

    if not records:
        if lang == "hi":
            return (
                f"**कृषि विज्ञान केंद्र आगामी प्रशिक्षण एवं प्रदर्शन**\n\n"
                f"{district} के लिए वर्तमान कैलेंडर में कोई आगामी प्रशिक्षण सूचीबद्ध नहीं है। नए बैच की जानकारी के लिए सीधे अपने नजदीकी KVK से संपर्क करें।\n\n"
                f"Updated on {last_up} – source: {src_name}"
            )
        return (
            f"**Upcoming KVK Training & Demonstration Calendar**\n\n"
            f"No upcoming vocational training sessions are currently scheduled in the database for {district}. Please contact your local KVK for offline batch enrollments.\n\n"
            f"Updated on {last_up} – source: {src_name}"
        )

    lines = []
    if lang == "hi":
        lines.append(f"**📅 कृषि विज्ञान केंद्र आगामी प्रशिक्षण कार्यक्रम ({district})**\n")
        for i, ev in enumerate(records[:3], 1):
            lines.append(
                f"**{i}. {ev['training_topic']}**\n"
                f"• **आयोजक:** {ev['kvk_name']} ({ev['district']})\n"
                f"• **दिनांक:** {ev['start_date']} से {ev['end_date']}\n"
                f"• **स्थान:** {ev['venue']}\n"
                f"• **शुल्क:** {ev['fees']}\n"
                f"• **पात्रता / प्रतिभागी:** {ev['target_audience']}\n"
                f"• **संपर्क:** {ev['coordinator_contact']}\n"
            )
        lines.append(f"Updated on {last_up} – source: {src_name}")
    else:
        lines.append(f"**📅 Upcoming KVK Training & Demonstration Schedule ({district})**\n")
        for i, ev in enumerate(records[:3], 1):
            lines.append(
                f"**{i}. {ev['training_topic']}**\n"
                f"• **Organizing KVK:** {ev['kvk_name']} ({ev['district']})\n"
                f"• **Dates:** {ev['start_date']} to {ev['end_date']}\n"
                f"• **Venue:** {ev['venue']}\n"
                f"• **Fees:** {ev['fees']}\n"
                f"• **Target Audience:** {ev['target_audience']}\n"
                f"• **Coordinator:** {ev['coordinator_contact']}\n"
            )
        lines.append(f"Updated on {last_up} – source: {src_name}")

    ans = "\n".join(lines)
    if is_failing:
        ans += f"\n\n⚠️ **Notice:** This source is currently experiencing sync delays. Showing latest cached records as of {last_up}."

    return ans


def format_mandi_direct_answer(mandi_res: Dict[str, Any], lang: str = "en") -> str:
    """Formats exact mandi wholesale prices direct answer."""
    records = mandi_res.get("records", [])
    crop = mandi_res.get("crop") or "Crops"
    district = mandi_res.get("district") or "Mandi Yards"
    last_up = mandi_res.get("last_updated") or datetime.utcnow().strftime("%Y-%m-%d")
    src_name = mandi_res.get("source_name") or "Agmarknet / e-NAM Mandi Network"
    is_failing = mandi_res.get("is_source_failing", False)

    if not records:
        if lang == "hi":
            return (
                f"**मंडी भाव रिपोर्ट**\n\n"
                f"{district} के लिए {crop} के आज के मंडी भाव का डेटाबेस रिकॉर्ड उपलब्ध नहीं है। कृपया Agmarknet या स्थानीय कृषि उपज मंडी समिति से संपर्क करें।\n\n"
                f"Updated on {last_up} – source: {src_name}"
            )
        return (
            f"**Daily Mandi Price Bulletin**\n\n"
            f"No recorded wholesale transactions found for {crop} in {district} today. Please check local APMC mandi bulletin board or Agmarknet.\n\n"
            f"Updated on {last_up} – source: {src_name}"
        )

    lines = []
    if lang == "hi":
        lines.append(f"**🌾 दैनिक कृषि उपज मंडी भाव ({records[0]['market_center']} / {records[0]['district']})**\n")
        for p in records[:3]:
            lines.append(
                f"• **फसल:** {p['commodity']} ({p['variety']})\n"
                f"  - **मॉडल भाव (औसत):** ₹{p['modal_price']:,.0f} / क्विंटल\n"
                f"  - **न्यूनतम - अधिकतम भाव:** ₹{p['min_price']:,.0f} - ₹{p['max_price']:,.0f} / क्विंटल\n"
                f"  - **आवक दिनांक:** {p['arrival_date']}\n"
                f"  - **मंडी केंद्र:** {p['market_center']}\n"
            )
        lines.append(f"Updated on {last_up} – source: {src_name}")
    else:
        lines.append(f"**🌾 Daily Mandi Wholesale Prices ({records[0]['market_center']} / {records[0]['district']})**\n")
        for p in records[:3]:
            lines.append(
                f"• **Commodity:** {p['commodity']} ({p['variety']})\n"
                f"  - **Modal Price:** ₹{p['modal_price']:,.0f} / Quintal\n"
                f"  - **Min - Max Range:** ₹{p['min_price']:,.0f} - ₹{p['max_price']:,.0f} / Quintal\n"
                f"  - **Arrival Date:** {p['arrival_date']}\n"
                f"  - **APMC Market:** {p['market_center']}\n"
            )
        lines.append(f"Updated on {last_up} – source: {src_name}")

    ans = "\n".join(lines)
    if is_failing:
        ans += f"\n\n⚠️ **Notice:** This source is currently experiencing sync delays. Showing latest cached records as of {last_up}."

    return ans
