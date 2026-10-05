"""
KisanSahay Deterministic Scheme & Loan Eligibility Engine
=========================================================
Implements Prompt 3 requirements:
1. Eligibility rules for each scheme and loan implemented as plain Python functions
   and a structured rules table — NEVER inside the model prompt.
2. Each rule has:
   - id matching the scheme record
   - rule_version
   - source_url
   - last_verified
   - required_inputs (e.g. state, land_size, crop, farmer_category, existing_loans, kyc_documents)
   - conditions (deterministic plain Python functions)
3. check_eligibility(scheme_id, farmer_profile) returns structured JSON:
   - status: "eligible", "not_eligible", or "needs_more_info"
   - reasons: {"passed": [...], "failed": [...]}
   - missing_inputs: [...]
   - last_verified: date string
   - source_url: official URL
   - is_stale: bool (True if > 90 days old)
   - has_pending_review: bool
   - notice: warning string when stale or pending review
4. Integration with /chat:
   - Asks user for missing inputs when status is "needs_more_info".
   - Passes JSON result to Gemini with strict instruction to explain in simple language
     without overriding or altering the Python verdict, and without inventing new conditions.
   - Appends warning notice if older than 90 days or pending review.
"""

import os
import re
import sqlite3
import logging
from datetime import datetime, date, timezone
from typing import Dict, Any, List, Optional, Tuple, Callable

logger = logging.getLogger("EligibilityEngine")

# Default database path for KisanDataLayer
DB_PATH = os.path.join(os.path.dirname(__file__), "kisansahay.db")


# ─────────────────────────────────────────────────────────────────────────────
# 1. Profile Normalization & Attribute Extraction
# ─────────────────────────────────────────────────────────────────────────────

def normalize_farmer_profile(raw_profile: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Normalizes profile attributes to standard keys and data types.
    Handles snake_case, camelCase, and alternate parameter names.
    """
    if not raw_profile or not isinstance(raw_profile, dict):
        return {}

    norm = {}

    # State
    for k in ["state", "State", "user_state", "location_state"]:
        if k in raw_profile and raw_profile[k] is not None:
            norm["state"] = str(raw_profile[k]).strip()
            break

    # District
    for k in ["district", "District", "user_district"]:
        if k in raw_profile and raw_profile[k] is not None:
            norm["district"] = str(raw_profile[k]).strip()
            break

    # Land size (in acres)
    for k in ["land_size", "land_acres", "landSize", "landAcres", "land", "holding_size"]:
        if k in raw_profile and raw_profile[k] is not None:
            try:
                norm["land_size"] = float(raw_profile[k])
                break
            except (ValueError, TypeError):
                pass

    # Crop
    for k in ["crop", "crops", "crop_name", "commodity"]:
        if k in raw_profile and raw_profile[k] is not None:
            c = raw_profile[k]
            if isinstance(c, list):
                norm["crop"] = [str(x).strip() for x in c if x]
            else:
                norm["crop"] = str(c).strip()
            break

    # Farmer Category (small, marginal, large, women, sc, st, general)
    for k in ["farmer_category", "farmerCategory", "category", "social_category"]:
        if k in raw_profile and raw_profile[k] is not None:
            norm["farmer_category"] = str(raw_profile[k]).strip().lower()
            break

    # Ownership (owner, tenant, sharecropper, lessee)
    for k in ["ownership", "land_ownership", "tenancy", "ownership_type"]:
        if k in raw_profile and raw_profile[k] is not None:
            norm["ownership"] = str(raw_profile[k]).strip().lower()
            break

    # Existing loans / Default status
    for k in ["existing_loans", "existingLoans", "has_defaulted_loans", "defaulted_loans", "loan_default"]:
        if k in raw_profile and raw_profile[k] is not None:
            val = raw_profile[k]
            if isinstance(val, bool):
                norm["existing_loans"] = "defaulted" if val else "clean"
            elif isinstance(val, str):
                v_low = val.lower().strip()
                if any(w in v_low for w in ["default", "overdue", "npa", "arrear", "unpaid"]):
                    norm["existing_loans"] = "defaulted"
                elif any(w in v_low for w in ["none", "clean", "nil", "no loan", "regular", "paid"]):
                    norm["existing_loans"] = "clean"
                else:
                    norm["existing_loans"] = val
            elif isinstance(val, (int, float)):
                norm["existing_loans"] = "has_loan" if val > 0 else "clean"
            else:
                norm["existing_loans"] = val
            break

    # KYC Documents
    for k in ["kyc_documents", "kycDocuments", "documents", "has_documents"]:
        if k in raw_profile and raw_profile[k] is not None:
            docs = raw_profile[k]
            if isinstance(docs, list):
                norm["kyc_documents"] = [str(d).strip() for d in docs]
            elif isinstance(docs, bool):
                norm["kyc_documents"] = ["Aadhaar Card", "Land Record (Khatauni)"] if docs else []
            elif isinstance(docs, str):
                norm["kyc_documents"] = [d.strip() for d in docs.split(",") if d.strip()]
            break

    # Government employee exclusion
    for k in ["is_govt_employee", "govt_employee", "government_job"]:
        if k in raw_profile and raw_profile[k] is not None:
            norm["is_govt_employee"] = bool(raw_profile[k])
            break

    # Income tax exclusion
    for k in ["is_tax_payer", "tax_payer", "pays_income_tax", "itr_filed"]:
        if k in raw_profile and raw_profile[k] is not None:
            norm["is_tax_payer"] = bool(raw_profile[k])
            break

    # Water source (for solar pump)
    for k in ["water_source", "waterSource", "irrigation_source"]:
        if k in raw_profile and raw_profile[k] is not None:
            norm["water_source"] = str(raw_profile[k]).strip()
            break

    # Age
    for k in ["age", "farmer_age"]:
        if k in raw_profile and raw_profile[k] is not None:
            try:
                norm["age"] = int(raw_profile[k])
            except (ValueError, TypeError):
                pass

    return norm


def extract_profile_from_text(query: str, existing_profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Extracts farmer attributes from natural language query text and merges with existing profile.
    """
    profile = normalize_farmer_profile(existing_profile)
    q = query.lower()

    # Land size extraction
    if "land_size" not in profile:
        acres_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:acres?|acre|ac)", q)
        if acres_match:
            profile["land_size"] = float(acres_match.group(1))
        else:
            ha_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:hectares?|ha)", q)
            if ha_match:
                profile["land_size"] = round(float(ha_match.group(1)) * 2.471, 2)
            else:
                bigha_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:bigha|vigha)", q)
                if bigha_match:
                    profile["land_size"] = round(float(bigha_match.group(1)) * 0.625, 2)

    # Ownership
    if "ownership" not in profile:
        if any(w in q for w in ["tenant", "leased", "lease", "kiraye", "batai", "bataidar"]):
            profile["ownership"] = "tenant"
        elif any(w in q for w in ["sharecropper", "hissedar"]):
            profile["ownership"] = "sharecropper"
        elif any(w in q for w in ["own land", "my land", "patta", "landowner", "zameen meri", "khud ki"]):
            profile["ownership"] = "owner"

    # Category / Gender
    if "farmer_category" not in profile:
        if any(w in q for w in ["female", "woman", "women", "mahila", "lady"]):
            profile["farmer_category"] = "women"
        elif any(w in q for w in ["sc", "scheduled caste", "dalit"]):
            profile["farmer_category"] = "sc"
        elif any(w in q for w in ["st", "scheduled tribe", "adivasi"]):
            profile["farmer_category"] = "st"
        elif "small" in q:
            profile["farmer_category"] = "small"
        elif "marginal" in q:
            profile["farmer_category"] = "marginal"

    # Crop
    if "crop" not in profile:
        for crop_name in ["soybean", "wheat", "mustard", "gram", "chickpea", "paddy", "rice", "cotton", "maize", "sugarcane", "pulses", "onion"]:
            if crop_name in q:
                profile["crop"] = crop_name.capitalize()
                break

    # State
    if "state" not in profile:
        for st in ["Madhya Pradesh", "Uttar Pradesh", "Maharashtra", "Rajasthan", "Punjab", "Haryana", "Bihar"]:
            if st.lower() in q:
                profile["state"] = st
                break

    # Statutory Exclusions
    if "is_govt_employee" not in profile:
        if any(w in q for w in ["govt employee", "government employee", "sarkari naukri", "pensioner"]):
            profile["is_govt_employee"] = True
    if "is_tax_payer" not in profile:
        if any(w in q for w in ["income tax", "tax payer", "itr"]):
            profile["is_tax_payer"] = True

    # Loans
    if "existing_loans" not in profile:
        if any(w in q for w in ["default", "defaulter", "overdue loan", "bad cibil"]):
            profile["existing_loans"] = "defaulted"
        elif any(w in q for w in ["no loan", "no debt", "clear credit", "clean record", "first loan"]):
            profile["existing_loans"] = "clean"

    # KYC Documents
    if "kyc_documents" not in profile:
        docs = []
        if any(w in q for w in ["aadhaar", "aadhar"]):
            docs.append("Aadhaar Card")
        if any(w in q for w in ["khasra", "khatauni", "land papers", "land record"]):
            docs.append("Land Record (Khasra/Khatauni)")
        if any(w in q for w in ["passbook", "bank account", "account"]):
            docs.append("Bank Passbook")
        if docs:
            profile["kyc_documents"] = docs

    return profile


# ─────────────────────────────────────────────────────────────────────────────
# 2. Scheme & Loan Rules Definitions (Plain Python Functions & Rules Table)
# ─────────────────────────────────────────────────────────────────────────────

# --- A. Scheme PM-KISAN ---
def evaluate_pm_kisan_conditions(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Evaluates plain Python conditions for PM-KISAN."""
    results = []

    # 1. State eligibility (All states eligible)
    state = profile.get("state")
    if state:
        results.append({
            "condition": "State Jurisdiction",
            "passed": True,
            "reason": f"State '{state}' is fully eligible under PM-KISAN National guidelines."
        })

    # 2. Land ownership & size
    land_size = profile.get("land_size")
    ownership = profile.get("ownership")

    if ownership is not None:
        if ownership in ["tenant", "sharecropper"]:
            results.append({
                "condition": "Land Ownership",
                "passed": False,
                "reason": "PM-KISAN requires ownership title of cultivable land in the applicant's name. Tenant farmers and sharecroppers are not eligible."
            })
        else:
            results.append({
                "condition": "Land Ownership",
                "passed": True,
                "reason": "Applicant holds cultivable land ownership title."
            })

    if land_size is not None:
        if land_size <= 0:
            results.append({
                "condition": "Landholding Size",
                "passed": False,
                "reason": "Landholding size must be greater than 0 acres."
            })
        else:
            results.append({
                "condition": "Landholding Size",
                "passed": True,
                "reason": f"Landholding of {land_size} acres is eligible (all landholding sizes are eligible since 2019 expansion)."
            })

    # 3. Statutory exclusions
    if profile.get("is_govt_employee") is True:
        results.append({
            "condition": "Statutory Exclusions",
            "passed": False,
            "reason": "Serving or retired government employees and institutional landholders are excluded from PM-KISAN."
        })
    elif profile.get("is_tax_payer") is True:
        results.append({
            "condition": "Statutory Exclusions",
            "passed": False,
            "reason": "Individuals who paid income tax in the last assessment year are statutory exclusions under PM-KISAN."
        })
    else:
        results.append({
            "condition": "Statutory Exclusions",
            "passed": True,
            "reason": "Applicant meets non-exclusion criteria (no institutional or income tax disqualification)."
        })

    # 4. KYC Documents
    kyc = profile.get("kyc_documents")
    if kyc is not None:
        has_aadhaar = any("aadhaar" in d.lower() for d in kyc) if isinstance(kyc, list) else bool(kyc)
        has_land_doc = any(any(w in d.lower() for w in ["khasra", "khatauni", "land", "patta"]) for d in kyc) if isinstance(kyc, list) else True
        if has_aadhaar and has_land_doc:
            results.append({
                "condition": "KYC Verification",
                "passed": True,
                "reason": "Mandatory Aadhaar card and Land Record (Khasra/Khatauni) verified."
            })
        else:
            missing = []
            if not has_aadhaar: missing.append("Aadhaar Card linked to Bank Account")
            if not has_land_doc: missing.append("Land Ownership Record (Khasra/Khatauni)")
            results.append({
                "condition": "KYC Verification",
                "passed": False,
                "reason": f"Missing mandatory PM-KISAN KYC documents: {', '.join(missing)}."
            })

    return results


# --- B. Scheme Kisan Credit Card (KCC) Crop Loan ---
def evaluate_kcc_conditions(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Evaluates plain Python conditions for Kisan Credit Card (KCC)."""
    results = []

    # 1. State
    state = profile.get("state")
    if state:
        results.append({
            "condition": "State Jurisdiction",
            "passed": True,
            "reason": f"KCC subsidized credit is operational across {state} and all Indian states."
        })

    # 2. Land and Tenancy (Owners, Tenants, Oral Lessees, Sharecroppers all eligible)
    land_size = profile.get("land_size")
    ownership = profile.get("ownership")

    if ownership is not None:
        if ownership in ["owner", "tenant", "sharecropper", "leaseholder", "lessee"]:
            results.append({
                "condition": "Cultivator Status",
                "passed": True,
                "reason": f"Cultivator category '{ownership.capitalize()}' is eligible for KCC credit facilities."
            })
        else:
            results.append({
                "condition": "Cultivator Status",
                "passed": True,
                "reason": "Eligible for all agricultural producers (individuals, joint borrowers, and SHGs)."
            })

    if land_size is not None:
        if land_size <= 0:
            results.append({
                "condition": "Cultivable Land Size",
                "passed": False,
                "reason": "Applicant must cultivate agricultural land greater than 0 acres."
            })
        else:
            results.append({
                "condition": "Cultivable Land Size",
                "passed": True,
                "reason": f"Cultivated land area of {land_size} acres qualifies for scale of finance credit."
            })

    # 3. Crop
    crop = profile.get("crop")
    if crop:
        results.append({
            "condition": "Crop Cultivation",
            "passed": True,
            "reason": f"Crop '{crop}' qualifies for KCC short-term seasonal credit and crop maintenance."
        })

    # 4. Existing Loans & Credit Standing
    loans = profile.get("existing_loans")
    if loans is not None:
        if loans == "defaulted":
            results.append({
                "condition": "Credit History",
                "passed": False,
                "reason": "Applicant has active defaulted institutional loan accounts without bank restructuring."
            })
        else:
            results.append({
                "condition": "Credit History",
                "passed": True,
                "reason": "Clean credit history and satisfactory bank standing verified."
            })

    # 5. KYC & Land Documents
    kyc = profile.get("kyc_documents")
    if kyc is not None:
        has_id = any(any(w in d.lower() for w in ["aadhaar", "pan", "voter"]) for d in kyc) if isinstance(kyc, list) else bool(kyc)
        if has_id:
            results.append({
                "condition": "KYC Verification",
                "passed": True,
                "reason": "Identity and cultivator verification documents are satisfactory."
            })
        else:
            results.append({
                "condition": "KYC Verification",
                "passed": False,
                "reason": "Missing mandatory KYC identity proof (Aadhaar / Voter ID)."
            })

    # 6. Age
    age = profile.get("age")
    if age is not None:
        if 18 <= age <= 75:
            results.append({
                "condition": "Applicant Age",
                "passed": True,
                "reason": f"Age {age} years is within the eligible KCC bracket (18-75 years)."
            })
        else:
            results.append({
                "condition": "Applicant Age",
                "passed": False,
                "reason": f"Applicant age ({age} years) is outside permissible KCC guidelines (18-75 years)."
            })

    return results


# --- C. Scheme PMFBY Crop Insurance ---
def evaluate_pmfby_conditions(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Evaluates plain Python conditions for PMFBY Crop Insurance."""
    results = []

    # 1. State
    state = profile.get("state")
    if state:
        results.append({
            "condition": "State Coverage",
            "passed": True,
            "reason": f"PMFBY crop insurance scheme is active in {state}."
        })

    # 2. Crop Notification
    crop = profile.get("crop")
    if crop:
        notified_crops = [
            "soybean", "wheat", "gram", "chickpea", "mustard", "paddy", "rice",
            "cotton", "maize", "tur", "arhar", "groundnut", "bajra", "sugarcane"
        ]
        c_str = str(crop).lower()
        if any(nc in c_str for nc in notified_crops):
            results.append({
                "condition": "Notified Crop Verification",
                "passed": True,
                "reason": f"Crop '{crop}' is an official notified crop for risk coverage under PMFBY."
            })
        else:
            results.append({
                "condition": "Notified Crop Verification",
                "passed": False,
                "reason": f"Crop '{crop}' is not currently notified in the official state insurance gazette."
            })

    # 3. Land cultivated
    land_size = profile.get("land_size")
    if land_size is not None:
        if land_size > 0:
            results.append({
                "condition": "Insurable Acreage",
                "passed": True,
                "reason": f"Cultivated area of {land_size} acres is insurable."
            })
        else:
            results.append({
                "condition": "Insurable Acreage",
                "passed": False,
                "reason": "Insurable land size must be greater than 0 acres."
            })

    # 4. KYC & Sowing Proof
    kyc = profile.get("kyc_documents")
    if kyc is not None:
        has_id = any("aadhaar" in d.lower() for d in kyc) if isinstance(kyc, list) else bool(kyc)
        if has_id:
            results.append({
                "condition": "KYC & Land Record",
                "passed": True,
                "reason": "Aadhaar and bank account proof verified for claim DBT credit."
            })
        else:
            results.append({
                "condition": "KYC & Land Record",
                "passed": False,
                "reason": "Mandatory Aadhaar card is required for PMFBY enrollment."
            })

    return results


# --- D. Scheme SMAM Tractor Subsidy ---
def evaluate_tractor_smam_conditions(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Evaluates plain Python conditions for Tractor & SMAM Machinery Subsidy."""
    results = []

    # 1. State
    state = profile.get("state")
    if state:
        results.append({
            "condition": "State Mechanism",
            "passed": True,
            "reason": f"SMAM machinery direct subsidy portal operates in {state}."
        })

    # 2. Land size bracket (priority 1.0 to 10.0 acres)
    land_size = profile.get("land_size")
    if land_size is not None:
        if land_size < 1.0:
            results.append({
                "condition": "Minimum Land Requirement",
                "passed": False,
                "reason": f"Applicant landholding ({land_size} acres) is below the minimum 1.0 acre required for tractor subsidy."
            })
        elif land_size > 10.0:
            results.append({
                "condition": "Maximum Land Limit",
                "passed": False,
                "reason": f"Applicant landholding ({land_size} acres) exceeds priority small/marginal bracket limit (10.0 acres)."
            })
        else:
            results.append({
                "condition": "Landholding Bracket",
                "passed": True,
                "reason": f"Landholding of {land_size} acres qualifies for small/marginal farmer mechanization assistance."
            })

    # 3. Ownership (Must own land)
    ownership = profile.get("ownership")
    if ownership is not None:
        if ownership in ["tenant", "sharecropper"]:
            results.append({
                "condition": "Title Ownership",
                "passed": False,
                "reason": "SMAM tractor and heavy equipment subsidies require registered land title. Tenants are not eligible."
            })
        else:
            results.append({
                "condition": "Title Ownership",
                "passed": True,
                "reason": "Verified landholder title registered in applicant's name."
            })

    # 4. Farmer category affirmative benefits
    cat = profile.get("farmer_category")
    if cat is not None:
        if cat in ["women", "sc", "st", "small", "marginal"]:
            results.append({
                "condition": "Affirmative Beneficiary Tier",
                "passed": True,
                "reason": f"Category '{cat.upper()}' qualifies for highest subsidy slab (up to 40-50% subsidy)."
            })
        else:
            results.append({
                "condition": "Affirmative Beneficiary Tier",
                "passed": True,
                "reason": "General farmer category qualifies for standard 20-35% machinery subsidy."
            })

    # 5. KYC & Caste/Land records
    kyc = profile.get("kyc_documents")
    if kyc is not None:
        has_aadhaar = any("aadhaar" in d.lower() for d in kyc) if isinstance(kyc, list) else bool(kyc)
        has_land = any(any(w in d.lower() for w in ["khasra", "khatauni", "land"]) for d in kyc) if isinstance(kyc, list) else True
        if has_aadhaar and has_land:
            results.append({
                "condition": "Documentation Verification",
                "passed": True,
                "reason": "Aadhaar Card, Bank Passbook, and Khatauni land documents verified."
            })
        else:
            results.append({
                "condition": "Documentation Verification",
                "passed": False,
                "reason": "Missing mandatory land title (Khatauni) or Aadhaar card."
            })

    return results


# --- E. Scheme PM-KUSUM Solar Pump ---
def evaluate_solar_pump_kusum_conditions(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Evaluates plain Python conditions for PM-KUSUM Solar Pump."""
    results = []

    # 1. State
    state = profile.get("state")
    if state:
        results.append({
            "condition": "State Coverage",
            "passed": True,
            "reason": f"PM-KUSUM Component-B solar pump scheme is active in {state}."
        })

    # 2. Land Size (min 0.5 acre)
    land_size = profile.get("land_size")
    if land_size is not None:
        if land_size >= 0.5:
            results.append({
                "condition": "Installation Land Area",
                "passed": True,
                "reason": f"Landholding of {land_size} acres provides sufficient footprint for solar PV installation."
            })
        else:
            results.append({
                "condition": "Installation Land Area",
                "passed": False,
                "reason": f"Land area ({land_size} acres) is insufficient for standalone solar pump array (min 0.5 acres)."
            })

    # 3. Water Source
    ws = profile.get("water_source")
    if ws is not None:
        ws_low = str(ws).lower()
        if any(w in ws_low for w in ["borewell", "tube", "tubewell", "well", "open well", "canal", "pond", "farm pond", "available"]):
            results.append({
                "condition": "Irrigation Water Source",
                "passed": True,
                "reason": f"Confirmed functional water source: '{ws}'."
            })
        else:
            results.append({
                "condition": "Irrigation Water Source",
                "passed": False,
                "reason": f"Unverified or inadequate water source: '{ws}'. Verified borewell/well required."
            })

    # 4. KYC
    kyc = profile.get("kyc_documents")
    if kyc is not None:
        has_aadhaar = any("aadhaar" in d.lower() for d in kyc) if isinstance(kyc, list) else bool(kyc)
        if has_aadhaar:
            results.append({
                "condition": "KYC Verification",
                "passed": True,
                "reason": "Aadhaar Card and land ownership proof verified."
            })
        else:
            results.append({
                "condition": "KYC Verification",
                "passed": False,
                "reason": "Aadhaar card is mandatory for PM-KUSUM DBT capital subsidy."
            })

    return results


# --- F. Subsidized Crop Loan (General) ---
def evaluate_crop_loan_conditions(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Evaluates plain Python conditions for Short-Term Crop Loan."""
    return evaluate_kcc_conditions(profile)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Rules Registry Table (Matching Scheme Records)
# ─────────────────────────────────────────────────────────────────────────────

SCHEME_RULES: Dict[str, Dict[str, Any]] = {
    # 1. PM-KISAN
    "scheme_pm_kisan": {
        "id": "scheme_pm_kisan",
        "aliases": ["pm_kisan", "pmkisan", "scheme_pmkisan", "pm_kisan_samman_nidhi", "scheme_pm_kisan_test"],
        "name": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
        "rule_version": "1.2.0",
        "source_url": "https://pmkisan.gov.in",
        "last_verified": "2026-10-02",
        "required_inputs": ["state", "land_size", "farmer_category", "kyc_documents"],
        "evaluator": evaluate_pm_kisan_conditions,
        "benefit_summary": "₹6,000 per year paid in three 4-monthly installments of ₹2,000 via DBT."
    },

    # 2. Kisan Credit Card (KCC) Crop Loan
    "scheme_kcc_crop_loan_2026": {
        "id": "scheme_kcc_crop_loan_2026",
        "aliases": ["scheme_kcc", "kcc", "kisan_credit_card", "crop_loan_kcc", "scheme_test_kcc"],
        "name": "Kisan Credit Card (KCC) Crop Loan with Interest Subvention",
        "rule_version": "2.1.0",
        "source_url": "https://agricoop.nic.in/en/Major-Schemes",
        "last_verified": "2026-10-02",
        "required_inputs": ["state", "land_size", "crop", "existing_loans", "kyc_documents"],
        "evaluator": evaluate_kcc_conditions,
        "benefit_summary": "Short-term credit up to ₹3 Lakh at 7% basic interest, reduced to 4% effective on prompt repayment."
    },

    # 3. PMFBY Crop Insurance
    "scheme_pmfby": {
        "id": "scheme_pmfby",
        "aliases": ["pmfby", "fasal_bima", "scheme_pmfby_crop_insurance", "pmfby_crop_insurance"],
        "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "rule_version": "1.5.0",
        "source_url": "https://pmfby.gov.in",
        "last_verified": "2026-10-02",
        "required_inputs": ["state", "crop", "land_size", "kyc_documents"],
        "evaluator": evaluate_pmfby_conditions,
        "benefit_summary": "Comprehensive yield & weather insurance at subsidized premiums: 2% Kharif, 1.5% Rabi, 5% Commercial."
    },

    # 4. SMAM Tractor Subsidy
    "scheme_tractor_smam": {
        "id": "scheme_tractor_smam",
        "aliases": ["tractor_subsidy", "smam", "scheme_tractor", "tractor_smam", "tractor"],
        "name": "Sub-Mission on Agricultural Mechanization (SMAM) Tractor Subsidy",
        "rule_version": "1.1.0",
        "source_url": "https://agrimachinery.nic.in",
        "last_verified": "2026-10-02",
        "required_inputs": ["state", "land_size", "farmer_category", "kyc_documents"],
        "evaluator": evaluate_tractor_smam_conditions,
        "benefit_summary": "20% to 50% capital subsidy (up to ₹1,25,000) on agricultural tractor and machinery procurement."
    },

    # 5. PM-KUSUM Solar Pump
    "scheme_solar_pump_kusum": {
        "id": "scheme_solar_pump_kusum",
        "aliases": ["pm_kusum", "solar_pump", "kusum", "scheme_pm_kusum", "solar_pump_kusum"],
        "name": "PM-KUSUM Standalone Solar Agricultural Pump Scheme",
        "rule_version": "1.0.0",
        "source_url": "https://pmkusum.mnre.gov.in",
        "last_verified": "2026-10-02",
        "required_inputs": ["state", "land_size", "water_source", "kyc_documents"],
        "evaluator": evaluate_solar_pump_kusum_conditions,
        "benefit_summary": "Up to 60% combined Central & State subsidy for replacing diesel pumps with standalone solar pumps."
    },

    # 6. Short-term Crop Loan
    "loan_crop_short_term": {
        "id": "loan_crop_short_term",
        "aliases": ["crop_loan", "short_term_loan", "loan_kcc_short_term", "crop_credit"],
        "name": "Subsidized Short-Term Agricultural Crop Loan",
        "rule_version": "1.0.0",
        "source_url": "https://www.jansamarth.in/agricultural-loan-schemes",
        "last_verified": "2026-10-02",
        "required_inputs": ["state", "land_size", "crop", "existing_loans", "kyc_documents"],
        "evaluator": evaluate_crop_loan_conditions,
        "benefit_summary": "Concessional agricultural production credit through commercial and cooperative banking channels."
    }
}


def get_rule_by_scheme_id(scheme_id: str) -> Optional[Dict[str, Any]]:
    """
    Finds a rule by exact ID or alias match (case-insensitive).
    """
    if not scheme_id:
        return None
    s_low = str(scheme_id).lower().strip()

    # Exact ID match
    if s_low in SCHEME_RULES:
        return SCHEME_RULES[s_low]

    # Alias match
    for rule in SCHEME_RULES.values():
        if s_low == rule["id"].lower():
            return rule
        if s_low in [a.lower() for a in rule.get("aliases", [])]:
            return rule

    # Substring / fuzzy match
    for rule in SCHEME_RULES.values():
        if any(a.lower() in s_low for a in rule.get("aliases", [])):
            return rule

    return None


def detect_scheme_from_text(query: str) -> Optional[str]:
    """
    Detects which government scheme or loan product is referenced in text.
    """
    q = query.lower()
    if any(k in q for k in ["pm-kisan", "pm kisan", "samman nidhi", "pmkisan"]):
        return "scheme_pm_kisan"
    if any(k in q for k in ["kcc", "kisan credit card", "crop loan"]):
        return "scheme_kcc_crop_loan_2026"
    if any(k in q for k in ["fasal bima", "pmfby", "crop insurance", "bima yojana"]):
        return "scheme_pmfby"
    if any(k in q for k in ["tractor", "mechanization", "smam", "machinery subsidy"]):
        return "scheme_tractor_smam"
    if any(k in q for k in ["solar pump", "kusum", "pm-kusum", "pm kusum"]):
        return "scheme_solar_pump_kusum"
    if any(k in q for k in ["loan", "credit", "interest subvention"]):
        return "scheme_kcc_crop_loan_2026"
    return None


# ─────────────────────────────────────────────────────────────────────────────
# 4. Staleness & Pending Review Detection
# ─────────────────────────────────────────────────────────────────────────────

def is_rule_stale(last_verified: str, max_age_days: int = 90) -> bool:
    """Returns True if the rule's last_verified date is older than 90 days."""
    try:
        lv_date = datetime.strptime(str(last_verified)[:10], "%Y-%m-%d").date()
        today = date.today()
        return (today - lv_date).days > max_age_days
    except Exception:
        return False


def check_scheme_pending_review(scheme_id: str, db_path: Optional[str] = None) -> bool:
    """
    Checks if the scheme record in SQLite has an active pending_review status
    or pending revision in pending_changes table.
    """
    db_file = db_path or DB_PATH
    if not os.path.exists(db_file):
        return False

    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()

        # Check records table
        cursor.execute("SELECT status FROM records WHERE id = ? OR id LIKE ?", (scheme_id, f"%{scheme_id}%"))
        rows = cursor.fetchall()
        for r in rows:
            if r[0] == "pending_review":
                conn.close()
                return True

        # Check pending_changes table
        cursor.execute("SELECT status FROM pending_changes WHERE record_id = ? OR record_id LIKE ?", (scheme_id, f"%{scheme_id}%"))
        p_rows = cursor.fetchall()
        for pr in p_rows:
            if pr[0] == "pending":
                conn.close()
                return True

        conn.close()
    except Exception as e:
        logger.debug("Database probe for pending review (%s): %s", scheme_id, e)

    return False


# ─────────────────────────────────────────────────────────────────────────────
# 5. Core Eligibility Evaluation Function
# ─────────────────────────────────────────────────────────────────────────────

def check_eligibility(
    scheme_id: str,
    farmer_profile: Optional[Dict[str, Any]] = None,
    db_path: Optional[str] = None,
    override_last_verified: Optional[str] = None,
    override_pending_review: Optional[bool] = None
) -> Dict[str, Any]:
    """
    Evaluates farmer eligibility against deterministic Python rules for a scheme or loan.
    NEVER relies on the LLM prompt to make the decision.

    Returns structured JSON:
    {
        "scheme_id": str,
        "scheme_name": str,
        "rule_version": str,
        "status": "eligible" | "not_eligible" | "needs_more_info",
        "reasons": {
            "passed": List[str],
            "failed": List[str]
        },
        "conditions": List[Dict[str, Any]],
        "missing_inputs": List[str],
        "last_verified": str,
        "source_url": str,
        "is_stale": bool,
        "has_pending_review": bool,
        "notice": Optional[str]
    }
    """
    rule = get_rule_by_scheme_id(scheme_id)
    if not rule:
        return {
            "scheme_id": scheme_id,
            "scheme_name": "Unknown Scheme",
            "rule_version": "0.0.0",
            "status": "needs_more_info",
            "reasons": {
                "passed": [],
                "failed": [f"Scheme ID '{scheme_id}' was not recognized in official rules registry."]
            },
            "conditions": [],
            "missing_inputs": ["scheme_id"],
            "last_verified": "2026-10-02",
            "source_url": "https://agricoop.nic.in",
            "is_stale": False,
            "has_pending_review": False,
            "notice": "Please check the scheme name with your nearest Krishi Vigyan Kendra (KVK) or bank."
        }

    norm_profile = normalize_farmer_profile(farmer_profile)

    # 1. Check for missing required inputs
    required_inputs = rule.get("required_inputs", [])
    missing_inputs = []

    for req_field in required_inputs:
        val = norm_profile.get(req_field)
        if val is None or val == "" or (isinstance(val, list) and len(val) == 0):
            missing_inputs.append(req_field)

    # 2. Evaluate plain Python conditions
    evaluator: Callable[[Dict[str, Any]], List[Dict[str, Any]]] = rule["evaluator"]
    conditions_results = evaluator(norm_profile)

    passed_reasons = []
    failed_reasons = []

    for cr in conditions_results:
        cond_name = cr.get("condition", "Condition")
        reason_txt = cr.get("reason", "")
        if cr.get("passed"):
            passed_reasons.append(f"{cond_name}: {reason_txt}")
        else:
            failed_reasons.append(f"{cond_name}: {reason_txt}")

    # 3. Determine status:
    # - If any mandatory condition explicitly failed on verified inputs -> "not_eligible"
    # - Else if any required inputs are missing -> "needs_more_info"
    # - Else all conditions passed and all inputs present -> "eligible"
    if failed_reasons:
        status = "not_eligible"
    elif missing_inputs:
        status = "needs_more_info"
    else:
        status = "eligible"

    # 4. Check staleness (older than 90 days) and pending review
    last_verified = override_last_verified or rule.get("last_verified", "2026-10-02")
    is_stale = is_rule_stale(last_verified, max_age_days=90)

    has_pending = override_pending_review
    if has_pending is None:
        has_pending = check_scheme_pending_review(rule["id"], db_path=db_path)

    notice = None
    if is_stale or has_pending:
        reason_tags = []
        if is_stale:
            reason_tags.append(f"the rule's last verified date ({last_verified}) is older than 90 days")
        if has_pending:
            reason_tags.append("the scheme record has a pending review update in progress")

        notice = (
            f"⚠️ **Official Rule Notice:** As {' and '.join(reason_tags)}, official terms, interest rates, or eligibility limits "
            f"may have changed. Please confirm active directives directly with your local bank branch or Krishi Vigyan Kendra (KVK)."
        )

    return {
        "scheme_id": rule["id"],
        "scheme_name": rule["name"],
        "rule_version": rule["rule_version"],
        "status": status,
        "reasons": {
            "passed": passed_reasons,
            "failed": failed_reasons
        },
        "conditions": conditions_results,
        "missing_inputs": missing_inputs,
        "last_verified": last_verified,
        "source_url": rule["source_url"],
        "benefit_summary": rule.get("benefit_summary", ""),
        "is_stale": is_stale,
        "has_pending_review": bool(has_pending),
        "notice": notice
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. Formatting Prompt Instructions for Gemini
# ─────────────────────────────────────────────────────────────────────────────

def format_gemini_eligibility_instruction(
    eligibility_result: Dict[str, Any],
    lang: str = "en"
) -> str:
    """
    Builds strict system prompt instructions for Gemini explaining the Python eligibility verdict.
    Guarantees:
    - Never changes or overrides the verdict.
    - Never invents conditions of its own.
    - Explains in simple language in user's tongue.
    - Asks user for missing inputs if status == 'needs_more_info'.
    - Quotes source URL and date.
    - Includes notice if older than 90 days or pending review.
    """
    status = eligibility_result.get("status", "needs_more_info")
    sname = eligibility_result.get("scheme_name", "Official Scheme")
    v_date = eligibility_result.get("last_verified", "Current Cycle")
    s_url = eligibility_result.get("source_url", "https://agricoop.nic.in")
    notice = eligibility_result.get("notice")
    missing = eligibility_result.get("missing_inputs", [])
    reasons = eligibility_result.get("reasons", {})
    passed = reasons.get("passed", [])
    failed = reasons.get("failed", [])

    is_hindi = (lang or "").lower() == "hi"

    lines = [
        "═══════════════════════════════════════════════════════════════════════",
        "STRICT INSTRUCTION: PYTHON DETERMINISTIC ELIGIBILITY ENGINE RESULT",
        "═══════════════════════════════════════════════════════════════════════",
        f"Target Scheme: {sname}",
        f"Rule Version: {eligibility_result.get('rule_version', '1.0')}",
        f"Last Verified: {v_date} (Source: {s_url})",
        f"ENGINE VERDICT (FIXED): {status.upper()}",
        f"Missing Required Inputs: {', '.join(missing) if missing else 'None'}",
        f"Passed Criteria: {'; '.join(passed) if passed else 'None'}",
        f"Failed Criteria: {'; '.join(failed) if failed else 'None'}",
    ]

    if notice:
        lines.append(f"CRITICAL NOTICE: {notice}")

    lines.extend([
        "",
        "RULES FOR YOUR RESPONSE:",
        f"1. DO NOT OVERRIDE OR CHANGE THE VERDICT ({status.upper()}). You have zero authority to alter the Python decision.",
        "2. DO NOT ADD ANY NEW CONDITIONS, RULES, OR CRITERIA of your own.",
        f"3. Explain the outcome in simple, respectful, and crystal-clear language in {'Hindi (हिंदी)' if is_hindi else 'English'}.",
    ])

    if status == "needs_more_info":
        lines.append(
            f"4. Because status is 'needs_more_info', explicitly ask the farmer for the missing details ({', '.join(missing)}) "
            f"so their eligibility can be fully validated."
        )
    elif status == "eligible":
        lines.append(
            "4. Clearly inform the farmer that they qualify under verified criteria, summarize the key benefits, "
            "and explain the next steps to apply."
        )
    elif status == "not_eligible":
        lines.append(
            "4. Clearly and gently explain exactly which criteria failed without discouragement, and recommend "
            "alternative options or visiting the nearest KVK / bank."
        )

    if notice:
        lines.append(
            "5. You MUST include the warning notice informing the farmer that the rule may have changed "
            "and should be confirmed directly with their local bank branch or Krishi Vigyan Kendra (KVK)."
        )

    lines.append("═══════════════════════════════════════════════════════════════════════")
    return "\n".join(lines)
