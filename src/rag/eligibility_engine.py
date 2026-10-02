"""
KisanSahay Deterministic Python Eligibility Engine
===================================================
Enforces the requirement:
"Keep eligibility yes or no decisions in my Python rules, with Gemini only explaining the result."

Evaluates farmer criteria against official scheme rules deterministically in Python:
- PM-KISAN (landholding ownership, exclusions)
- Kisan Credit Card (KCC) Crop Loan (ownership, tenancy, SHG/JLG)
- PM Fasal Bima Yojana (PMFBY) (notified crops, notified areas)
- Tractor & Farm Mechanization Subsidies (SMAM)
- Animal Husbandry & Allied Schemes
- State-specific subsidies

Outputs:
- decision: "YES" | "NO" | "CONDITIONAL" | "NEED_MORE_INFO"
- reasons: List of matching or failing rules
- explanation: Detailed breakdown for LLM synthesis
"""

import re
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("EligibilityEngine")

# Official Scheme Rules Dictionary
OFFICIAL_SCHEME_RULES = {
    "pm_kisan": {
        "name": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
        "official_url": "https://pmkisan.gov.in",
        "min_land_acres": 0.01,
        "max_land_acres": None,  # Open to all landholding farmers since 2019
        "allowed_ownership": ["owner"],
        "disallowed_ownership": ["tenant", "sharecropper", "leaseholder"],
        "exclusions": [
            "institutional landholder",
            "constitutional post holder",
            "government employee",
            "serving or retired officer",
            "income tax payer",
            "doctor",
            "engineer",
            "lawyer",
            "chartered accountant",
            "pensioner over 10000"
        ],
        "mandatory_documents": ["Aadhaar Card", "Land Record (Khasra/Khatauni)", "Bank Account (Aadhaar Seeded)"],
        "benefit_summary": "₹6,000 per year paid in three equal 4-monthly installments of ₹2,000 directly via DBT."
    },
    "kisan_credit_card": {
        "name": "Kisan Credit Card (KCC) Subsidized Crop Loan",
        "official_url": "https://myscheme.gov.in/schemes/kcc",
        "min_land_acres": 0.01,
        "max_land_acres": None,
        "allowed_ownership": ["owner", "tenant", "sharecropper", "leaseholder", "oral lessee"],
        "min_age": 18,
        "max_age": 75,
        "exclusions": ["defaulted loan without restructuring", "under 18 years"],
        "mandatory_documents": ["Aadhaar Card", "Land Record or Tenancy Agreement", "Bank Account Details", "Crop Details"],
        "benefit_summary": "Short term credit up to ₹3 Lakh at 7% basic interest, reduced to 4% effective interest upon prompt repayment (3% Prompt Repayment Incentive)."
    },
    "tractor_subsidy": {
        "name": "Sub-Mission on Agricultural Mechanization (SMAM) Tractor Subsidy",
        "official_url": "https://agrimachinery.nic.in",
        "min_land_acres": 1.0,
        "max_land_acres": 10.0,
        "allowed_ownership": ["owner"],
        "preferred_categories": ["women", "sc", "st", "small", "marginal"],
        "exclusions": ["purchased subsidized tractor within past 7 years"],
        "mandatory_documents": ["Aadhaar Card", "Land Ownership Record (Khatauni)", "Bank Passbook", "Caste Certificate (if SC/ST)"],
        "benefit_summary": "20% to 50% subsidy (up to ₹1,00,000 - ₹1,25,000 depending on category and horsepower) on tractor procurement."
    },
    "pmfby_crop_insurance": {
        "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "official_url": "https://pmfby.gov.in",
        "min_land_acres": 0.01,
        "max_land_acres": None,
        "allowed_ownership": ["owner", "tenant", "sharecropper"],
        "exclusions": ["unnotified crop or unnotified insurance unit area"],
        "mandatory_documents": ["Aadhaar Card", "Sowing Certificate / Land Record", "Bank Passbook"],
        "benefit_summary": "Comprehensive risk coverage from pre-sowing to post-harvest at ultra-low farmer premiums: 2% Kharif, 1.5% Rabi, 5% Commercial/Horticulture."
    }
}


def detect_scheme_from_query(query: str) -> Optional[str]:
    """Detects which government scheme is mentioned in the query."""
    q = query.lower()
    if any(k in q for k in ["pm-kisan", "pm kisan", "samman nidhi", "pmkisan"]):
        return "pm_kisan"
    if any(k in q for k in ["kcc", "kisan credit card", "crop loan", "interest subvention"]):
        return "kisan_credit_card"
    if any(k in q for k in ["tractor", "mechanization", "smam", "machinery subsidy"]):
        return "tractor_subsidy"
    if any(k in q for k in ["fasal bima", "pmfby", "crop insurance", "bima yojana"]):
        return "pmfby_crop_insurance"
    return None


def extract_farmer_attributes(query: str, profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Extracts farmer landholding, ownership status, category, income, and documents
    from query text and optional structured profile using eligibility.py.
    """
    from eligibility import extract_profile_from_text
    attrs = extract_profile_from_text(query, profile)

    # Maintain backward-compatible legacy keys for existing test assertions
    if "land_size" in attrs and attrs["land_size"] is not None:
        attrs["land_acres"] = attrs["land_size"]
    else:
        attrs["land_acres"] = None

    if "farmer_category" in attrs and attrs["farmer_category"] is not None:
        attrs["category"] = attrs["farmer_category"]
    else:
        attrs["category"] = None

    if "ownership" not in attrs:
        attrs["ownership"] = None

    if "is_govt_employee" not in attrs:
        attrs["is_govt_employee"] = False

    if "is_tax_payer" not in attrs:
        attrs["is_tax_payer"] = False

    if "kyc_documents" in attrs and attrs["kyc_documents"]:
        docs = attrs["kyc_documents"]
        attrs["has_aadhaar"] = any("aadhaar" in d.lower() for d in docs) if isinstance(docs, list) else bool(docs)
    elif "has_aadhaar" not in attrs:
        attrs["has_aadhaar"] = True

    if "age" not in attrs:
        attrs["age"] = None

    return attrs


def evaluate_eligibility(
    query: str,
    farmer_profile: Optional[Dict[str, Any]] = None,
    target_scheme_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes deterministic Python rule evaluation for farmer eligibility.
    Returns:
    {
        "is_eligibility_query": bool,
        "scheme_key": str,
        "scheme_name": str,
        "decision": "YES" | "NO" | "CONDITIONAL" | "NOT_APPLICABLE",
        "reasons": List[str],
        "unmet_criteria": List[str],
        "mandatory_documents": List[str],
        "instruction_for_llm": str
    }
    """
    q = query.lower()
    eligibility_keywords = [
        "eligible", "eligibility", "qualify", "qualification",
        "am i eligible", "can i", "can a", "can we", "could i",
        "apply", "applying", "application",
        "receive", "get", "avail", "claim",
        "paatra", "patrata", "patra", "mil sakta", "mil sakti", "milega", "milegi",
        "laabh", "fayda"
    ]
    is_eligibility = any(w in q for w in eligibility_keywords) or bool(target_scheme_id)

    scheme_key = target_scheme_id or detect_scheme_from_query(query)
    if not scheme_key or scheme_key not in OFFICIAL_SCHEME_RULES:
        # If no specific recognized scheme is being checked for eligibility
        return {
            "is_eligibility_query": is_eligibility,
            "scheme_key": None,
            "scheme_name": None,
            "decision": "NOT_APPLICABLE",
            "reasons": [],
            "unmet_criteria": [],
            "mandatory_documents": [],
            "instruction_for_llm": "No specific scheme eligibility rule triggered. Synthesize factual response from context."
        }

    rules = OFFICIAL_SCHEME_RULES[scheme_key]
    attrs = extract_farmer_attributes(query, farmer_profile)

    reasons: List[str] = []
    unmet_criteria: List[str] = []
    decision = "YES"

    # 1. PM-KISAN Evaluation
    if scheme_key == "pm_kisan":
        if attrs["is_govt_employee"]:
            decision = "NO"
            unmet_criteria.append("Institutional landholders, serving/retired government employees, and constitutional post holders are statutory exclusions under PM-KISAN guidelines.")
        if attrs["is_tax_payer"]:
            decision = "NO"
            unmet_criteria.append("Individuals who paid income tax in the last assessment year are excluded from PM-KISAN benefits.")
        if attrs["ownership"] in ["tenant", "sharecropper"]:
            decision = "NO"
            unmet_criteria.append("PM-KISAN requires ownership of cultivable agricultural land in the applicant's name. Tenant farmers and sharecroppers are not eligible.")
        elif attrs["ownership"] == "owner":
            reasons.append("Applicant holds ownership of cultivable agricultural land.")

        if attrs["land_acres"] is not None and attrs["land_acres"] > 0:
            reasons.append(f"Landholding size ({attrs['land_acres']} acres) is within eligible PM-KISAN scope (all landholding sizes eligible since 2019).")

        if not attrs["has_aadhaar"]:
            decision = "NO"
            unmet_criteria.append("Aadhaar card with bank account seeding is mandatory for PM-KISAN DBT benefit transfer.")

    # 2. Kisan Credit Card (KCC) Evaluation
    elif scheme_key == "kisan_credit_card":
        if attrs["age"] is not None and (attrs["age"] < 18 or attrs["age"] > 75):
            decision = "NO"
            unmet_criteria.append(f"Applicant age ({attrs['age']} years) is outside the permissible KCC range (18 to 75 years).")
        else:
            reasons.append("Applicant meets age qualification criteria (18-75 years).")

        if attrs["ownership"] in ["owner", "tenant", "sharecropper", "leaseholder"]:
            reasons.append(f"Ownership status '{attrs['ownership'].capitalize()}' is eligible for KCC (available to landholders, tenants, oral lessees, and sharecroppers).")
        else:
            reasons.append("Eligible for all agricultural producers (landowning farmers, tenant farmers, and sharecroppers).")

        if not attrs["has_aadhaar"]:
            decision = "NO"
            unmet_criteria.append("Valid KYC documents (Aadhaar/PAN) and active bank branch verification are mandatory for KCC issuance.")

    # 3. Tractor Subsidy (SMAM)
    elif scheme_key == "tractor_subsidy":
        if attrs["ownership"] in ["tenant", "sharecropper"]:
            decision = "NO"
            unmet_criteria.append("Tractor and machinery subsidies under SMAM require registered land ownership title (Khatauni/Khasra).")

        if attrs["land_acres"] is not None:
            if attrs["land_acres"] > 10.0:
                decision = "NO"
                unmet_criteria.append(f"Landholding of {attrs['land_acres']} acres exceeds priority small/marginal brackets (< 10 acres) for subsidized machinery.")
            else:
                reasons.append(f"Landholding size of {attrs['land_acres']} acres qualifies for priority mechanization brackets.")

        if attrs["category"] in ["women", "sc", "st"]:
            reasons.append(f"Applicant belongs to priority affirmative category ({attrs['category'].upper()}) eligible for maximum 50% subsidy tier.")

    # 4. PMFBY Crop Insurance
    elif scheme_key == "pmfby_crop_insurance":
        reasons.append("All farmers (landholders, loanee, non-loanee, and tenant cultivators) growing notified crops in notified insurance units qualify.")

    # Determine final decision
    if unmet_criteria:
        decision = "NO"
    elif not reasons and attrs["land_acres"] is None and attrs["ownership"] is None:
        decision = "CONDITIONAL"
        reasons.append("Eligible in principle if you own cultivable agricultural land, hold an Aadhaar-linked bank account, and do not fall under statutory exclusions.")

    # Call official eligibility.py engine for structured output and validation
    from eligibility import check_eligibility, format_gemini_eligibility_instruction
    elig_structured = check_eligibility(scheme_key, attrs)

    status = elig_structured.get("status", "eligible" if decision == "YES" else ("not_eligible" if decision == "NO" else "needs_more_info"))
    missing_inputs = elig_structured.get("missing_inputs", [])
    notice = elig_structured.get("notice")

    # Build prompt instruction for Gemini
    instruction = format_gemini_eligibility_instruction(elig_structured)

    return {
        "is_eligibility_query": is_eligibility,
        "scheme_key": scheme_key,
        "scheme_name": rules["name"],
        "decision": decision,
        "status": status,
        "reasons": reasons,
        "unmet_criteria": unmet_criteria,
        "missing_inputs": missing_inputs,
        "mandatory_documents": rules["mandatory_documents"],
        "benefit_summary": rules["benefit_summary"],
        "official_url": rules.get("official_url", "https://farmer.gov.in"),
        "last_verified": elig_structured.get("last_verified", "2026-10-02"),
        "notice": notice,
        "eligibility_json": elig_structured,
        "instruction_for_llm": instruction
    }
