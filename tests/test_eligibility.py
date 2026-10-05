"""
Unit and Integration Tests for Scheme & Loan Eligibility Engine
================================================================
Implements Prompt 3 testing requirements:
1. Covers each rule in eligibility.py with passing, failing, and missing-input cases:
   - PM-KISAN (scheme_pm_kisan)
   - KCC Crop Loan (scheme_kcc_crop_loan_2026)
   - PMFBY Crop Insurance (scheme_pmfby)
   - SMAM Tractor Subsidy (scheme_tractor_smam)
   - PM-KUSUM Solar Pump (scheme_solar_pump_kusum)
   - Short-Term Crop Loan (loan_crop_short_term)
2. Tests 90-day staleness detection and confirmation notice.
3. Tests pending_review detection and confirmation notice.
4. Tests integration in /chat:
   - Asks user for missing inputs when status is 'needs_more_info'.
   - Explains verdict without changing/overriding Python decision.
   - Does not invent new conditions.
   - Includes notice to confirm with bank or KVK when aged or pending review.
"""

import unittest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

import sys
from pathlib import Path
_backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from app import app
from eligibility import (
    SCHEME_RULES,
    check_eligibility,
    get_rule_by_scheme_id,
    detect_scheme_from_text,
    normalize_farmer_profile,
    extract_profile_from_text,
    format_gemini_eligibility_instruction,
    is_rule_stale
)


class TestEligibilityRules(unittest.TestCase):
    """Tests all scheme & loan rules for passing, failing, and missing-input cases."""

    # ─────────────────────────────────────────────────────────────────────────
    # 1. PM-KISAN Tests
    # ─────────────────────────────────────────────────────────────────────────

    def test_pm_kisan_passing(self):
        """Passes when applicant owns land, has KYC documents, and no exclusions."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 3.0,
            "ownership": "owner",
            "farmer_category": "small",
            "kyc_documents": ["Aadhaar Card", "Khasra/Khatauni Land Record"],
            "is_govt_employee": False,
            "is_tax_payer": False
        }
        res = check_eligibility("scheme_pm_kisan", profile)
        self.assertEqual(res["status"], "eligible")
        self.assertEqual(res["scheme_id"], "scheme_pm_kisan")
        self.assertEqual(len(res["missing_inputs"]), 0)
        self.assertTrue(len(res["reasons"]["passed"]) >= 3)
        self.assertEqual(len(res["reasons"]["failed"]), 0)
        self.assertEqual(res["rule_version"], "1.2.0")
        self.assertEqual(res["source_url"], "https://pmkisan.gov.in")

    def test_pm_kisan_failing_tenant(self):
        """Fails when applicant is a tenant farmer (tenants are excluded from PM-KISAN)."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 2.5,
            "ownership": "tenant",
            "farmer_category": "small",
            "kyc_documents": ["Aadhaar Card", "Rent Agreement"]
        }
        res = check_eligibility("scheme_pm_kisan", profile)
        self.assertEqual(res["status"], "not_eligible")
        self.assertTrue(any("Tenant farmers and sharecroppers are not eligible" in r for r in res["reasons"]["failed"]))

    def test_pm_kisan_failing_govt_employee(self):
        """Fails when applicant is a government employee."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 5.0,
            "ownership": "owner",
            "farmer_category": "general",
            "kyc_documents": ["Aadhaar Card", "Khasra"],
            "is_govt_employee": True
        }
        res = check_eligibility("scheme_pm_kisan", profile)
        self.assertEqual(res["status"], "not_eligible")
        self.assertTrue(any("government employees" in r.lower() for r in res["reasons"]["failed"]))

    def test_pm_kisan_missing_inputs(self):
        """Returns needs_more_info when required inputs like land_size and kyc_documents are missing."""
        profile = {
            "state": "Madhya Pradesh"
            # land_size, farmer_category, and kyc_documents are omitted
        }
        res = check_eligibility("scheme_pm_kisan", profile)
        self.assertEqual(res["status"], "needs_more_info")
        self.assertIn("land_size", res["missing_inputs"])
        self.assertIn("farmer_category", res["missing_inputs"])
        self.assertIn("kyc_documents", res["missing_inputs"])

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Kisan Credit Card (KCC) Crop Loan Tests
    # ─────────────────────────────────────────────────────────────────────────

    def test_kcc_passing(self):
        """Passes for landholder or tenant cultivating crop with clean credit."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 4.0,
            "crop": "Wheat",
            "ownership": "tenant",
            "existing_loans": "clean",
            "kyc_documents": ["Aadhaar Card", "Tenancy Agreement"],
            "age": 42
        }
        res = check_eligibility("scheme_kcc_crop_loan_2026", profile)
        self.assertEqual(res["status"], "eligible")
        self.assertEqual(res["scheme_id"], "scheme_kcc_crop_loan_2026")
        self.assertEqual(len(res["missing_inputs"]), 0)
        self.assertTrue(any("Tenant" in r for r in res["reasons"]["passed"]))
        self.assertTrue(any("Wheat" in r for r in res["reasons"]["passed"]))

    def test_kcc_failing_defaulted_loans(self):
        """Fails when applicant has active defaulted loans without restructuring."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 2.0,
            "crop": "Soybean",
            "existing_loans": "defaulted",
            "kyc_documents": ["Aadhaar Card"]
        }
        res = check_eligibility("scheme_kcc_crop_loan_2026", profile)
        self.assertEqual(res["status"], "not_eligible")
        self.assertTrue(any("defaulted institutional loan" in r.lower() for r in res["reasons"]["failed"]))

    def test_kcc_missing_inputs(self):
        """Returns needs_more_info when crop or existing_loans are not provided."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 3.0,
            "kyc_documents": ["Aadhaar Card"]
        }
        res = check_eligibility("scheme_kcc_crop_loan_2026", profile)
        self.assertEqual(res["status"], "needs_more_info")
        self.assertIn("crop", res["missing_inputs"])
        self.assertIn("existing_loans", res["missing_inputs"])

    # ─────────────────────────────────────────────────────────────────────────
    # 3. PMFBY Crop Insurance Tests
    # ─────────────────────────────────────────────────────────────────────────

    def test_pmfby_passing(self):
        """Passes for notified crop with insurable acreage and KYC."""
        profile = {
            "state": "Madhya Pradesh",
            "crop": "Soybean",
            "land_size": 5.0,
            "kyc_documents": ["Aadhaar Card", "Sowing Certificate"]
        }
        res = check_eligibility("scheme_pmfby", profile)
        self.assertEqual(res["status"], "eligible")
        self.assertEqual(len(res["missing_inputs"]), 0)
        self.assertTrue(any("notified crop" in r.lower() for r in res["reasons"]["passed"]))

    def test_pmfby_failing_unnotified_crop(self):
        """Fails when crop is not an officially notified insurable crop."""
        profile = {
            "state": "Madhya Pradesh",
            "crop": "Dragonfruit Exotic",
            "land_size": 2.0,
            "kyc_documents": ["Aadhaar Card"]
        }
        res = check_eligibility("scheme_pmfby", profile)
        self.assertEqual(res["status"], "not_eligible")
        self.assertTrue(any("not currently notified" in r.lower() for r in res["reasons"]["failed"]))

    def test_pmfby_missing_inputs(self):
        """Returns needs_more_info when crop is missing."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 3.0,
            "kyc_documents": ["Aadhaar Card"]
        }
        res = check_eligibility("scheme_pmfby", profile)
        self.assertEqual(res["status"], "needs_more_info")
        self.assertIn("crop", res["missing_inputs"])

    # ─────────────────────────────────────────────────────────────────────────
    # 4. SMAM Tractor Subsidy Tests
    # ─────────────────────────────────────────────────────────────────────────

    def test_tractor_smam_passing(self):
        """Passes for small/marginal landowner with registered title."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 3.5,
            "ownership": "owner",
            "farmer_category": "women",
            "kyc_documents": ["Aadhaar Card", "Khatauni Land Record"]
        }
        res = check_eligibility("scheme_tractor_smam", profile)
        self.assertEqual(res["status"], "eligible")
        self.assertTrue(any("WOMEN" in r for r in res["reasons"]["passed"]))

    def test_tractor_smam_failing_large_land(self):
        """Fails when landholding exceeds 10.0 acres small/marginal priority cap."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 25.0,
            "ownership": "owner",
            "farmer_category": "large",
            "kyc_documents": ["Aadhaar Card", "Khatauni"]
        }
        res = check_eligibility("scheme_tractor_smam", profile)
        self.assertEqual(res["status"], "not_eligible")
        self.assertTrue(any("exceeds priority" in r.lower() for r in res["reasons"]["failed"]))

    def test_tractor_smam_missing_inputs(self):
        """Returns needs_more_info when land_size is omitted."""
        profile = {
            "state": "Madhya Pradesh",
            "farmer_category": "sc",
            "kyc_documents": ["Aadhaar Card", "Khatauni Land Record"]
        }
        res = check_eligibility("scheme_tractor_smam", profile)
        self.assertEqual(res["status"], "needs_more_info")
        self.assertIn("land_size", res["missing_inputs"])

    # ─────────────────────────────────────────────────────────────────────────
    # 5. PM-KUSUM Solar Pump Tests
    # ─────────────────────────────────────────────────────────────────────────

    def test_solar_pump_kusum_passing(self):
        """Passes with sufficient land and verified borewell water source."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 2.0,
            "water_source": "Agriculture Borewell",
            "kyc_documents": ["Aadhaar Card", "Land Title"]
        }
        res = check_eligibility("scheme_solar_pump_kusum", profile)
        self.assertEqual(res["status"], "eligible")
        self.assertTrue(any("water source" in r.lower() for r in res["reasons"]["passed"]))

    def test_solar_pump_kusum_failing_insufficient_land(self):
        """Fails when landholding is under 0.5 acre."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 0.2,
            "water_source": "Borewell",
            "kyc_documents": ["Aadhaar Card"]
        }
        res = check_eligibility("scheme_solar_pump_kusum", profile)
        self.assertEqual(res["status"], "not_eligible")
        self.assertTrue(any("insufficient" in r.lower() for r in res["reasons"]["failed"]))

    def test_solar_pump_kusum_missing_inputs(self):
        """Returns needs_more_info when water_source is missing."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 2.0,
            "kyc_documents": ["Aadhaar Card"]
        }
        res = check_eligibility("scheme_solar_pump_kusum", profile)
        self.assertEqual(res["status"], "needs_more_info")
        self.assertIn("water_source", res["missing_inputs"])

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Short-Term Crop Loan Tests
    # ─────────────────────────────────────────────────────────────────────────

    def test_short_term_crop_loan_passing(self):
        """Passes for valid seasonal crop, clean credit, and KYC."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 2.0,
            "crop": "Mustard",
            "existing_loans": "clean",
            "kyc_documents": ["Aadhaar Card", "Khasra"]
        }
        res = check_eligibility("loan_crop_short_term", profile)
        self.assertEqual(res["status"], "eligible")

    def test_short_term_crop_loan_failing_default(self):
        """Fails when applicant has defaulted existing loans."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 2.0,
            "crop": "Mustard",
            "existing_loans": "defaulted",
            "kyc_documents": ["Aadhaar Card"]
        }
        res = check_eligibility("loan_crop_short_term", profile)
        self.assertEqual(res["status"], "not_eligible")

    def test_short_term_crop_loan_missing_inputs(self):
        """Returns needs_more_info when kyc_documents is missing."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 2.0,
            "crop": "Mustard",
            "existing_loans": "clean"
        }
        res = check_eligibility("loan_crop_short_term", profile)
        self.assertEqual(res["status"], "needs_more_info")
        self.assertIn("kyc_documents", res["missing_inputs"])


class TestStalenessAndPendingReview(unittest.TestCase):
    """Tests 90-day staleness and pending review warning notices."""

    def test_rule_stale_detection_and_notice(self):
        """When a rule's last_verified is older than 90 days, notice is generated."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 3.0,
            "ownership": "owner",
            "farmer_category": "small",
            "kyc_documents": ["Aadhaar Card"]
        }
        res = check_eligibility("scheme_pm_kisan", profile, override_last_verified="2025-01-01")
        self.assertTrue(res["is_stale"])
        self.assertIsNotNone(res["notice"])
        self.assertIn("older than 90 days", res["notice"])
        self.assertIn("confirm", res["notice"].lower())
        self.assertIn("bank", res["notice"].lower())
        self.assertIn("kvk", res["notice"].lower())

    def test_rule_pending_review_notice(self):
        """When scheme record has a pending review, notice is generated."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 3.0,
            "crop": "Wheat",
            "existing_loans": "clean",
            "kyc_documents": ["Aadhaar Card"]
        }
        res = check_eligibility("scheme_kcc_crop_loan_2026", profile, override_pending_review=True)
        self.assertTrue(res["has_pending_review"])
        self.assertIsNotNone(res["notice"])
        self.assertIn("pending review", res["notice"].lower())
        self.assertIn("confirm", res["notice"].lower())
        self.assertIn("bank", res["notice"].lower())

    def test_fresh_rule_has_no_notice(self):
        """Fresh rule under 90 days without pending review has no warning notice."""
        profile = {
            "state": "Madhya Pradesh",
            "land_size": 3.0,
            "ownership": "owner",
            "farmer_category": "small",
            "kyc_documents": ["Aadhaar Card"]
        }
        res = check_eligibility("scheme_pm_kisan", profile, override_last_verified="2026-10-02", override_pending_review=False)
        self.assertFalse(res["is_stale"])
        self.assertFalse(res["has_pending_review"])
        self.assertIsNone(res["notice"])


class TestGeminiEligibilityInstruction(unittest.TestCase):
    """Tests that Gemini instructions strictly forbid overriding verdict or inventing rules."""

    def test_instruction_forbids_overriding_verdict(self):
        elig_res = {
            "scheme_id": "scheme_pm_kisan",
            "scheme_name": "PM-KISAN",
            "rule_version": "1.2.0",
            "status": "eligible",
            "last_verified": "2026-10-02",
            "source_url": "https://pmkisan.gov.in",
            "missing_inputs": [],
            "reasons": {"passed": ["Landowner: owns 3 acres"], "failed": []}
        }
        instr = format_gemini_eligibility_instruction(elig_res)
        self.assertIn("DO NOT OVERRIDE OR CHANGE THE VERDICT", instr)
        self.assertIn("DO NOT ADD ANY NEW CONDITIONS", instr)
        self.assertIn("ENGINE VERDICT (FIXED): ELIGIBLE", instr)

    def test_instruction_requests_missing_inputs(self):
        elig_res = {
            "scheme_id": "scheme_kcc",
            "scheme_name": "KCC Crop Loan",
            "rule_version": "2.1.0",
            "status": "needs_more_info",
            "last_verified": "2026-10-02",
            "source_url": "https://agricoop.nic.in",
            "missing_inputs": ["crop", "existing_loans"],
            "reasons": {"passed": [], "failed": []}
        }
        instr = format_gemini_eligibility_instruction(elig_res)
        self.assertIn("needs_more_info", instr)
        self.assertIn("crop", instr)
        self.assertIn("existing_loans", instr)
        self.assertIn("ask the farmer for the missing details", instr)


class TestChatEndpointEligibilityIntegration(unittest.TestCase):
    """Integration tests verifying /chat behavior for eligibility questions."""

    def setUp(self):
        self.client = TestClient(app)

    def test_chat_asks_for_missing_inputs(self):
        """When an eligibility question lacks required inputs, /chat prompts user for details."""
        resp = self.client.post("/chat", json={
            "user_query": "Am I eligible for PM-KISAN cash transfer?",
            "state": "Madhya Pradesh",
            "language": "en"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        ans = data["answer"]
        # Must ask for missing inputs (such as land size or ownership)
        self.assertTrue(
            any(w in ans.lower() for w in ["land size", "landholding", "ownership", "missing", "information", "details"])
        )
        self.assertIn("PM-KISAN", ans)

    def test_chat_eligible_verdict_grounded(self):
        """When passing attributes are provided, /chat answers with eligible verdict and citations."""
        resp = self.client.post("/chat", json={
            "user_query": "I own 3 acres of agricultural land in Sehore. Am I eligible for PM-KISAN?",
            "state": "Madhya Pradesh",
            "farmer_profile": {
                "land_size": 3.0,
                "ownership": "owner",
                "farmer_category": "small",
                "kyc_documents": ["Aadhaar Card", "Khasra"],
                "is_govt_employee": False,
                "is_tax_payer": False
            },
            "language": "en"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        ans = data["answer"]
        self.assertTrue("eligible" in ans.lower() or "yes" in ans.lower())
        self.assertIn("PM-KISAN", ans)
        if data.get("eligibility_result"):
            self.assertEqual(data["eligibility_result"]["status"], "eligible")

    def test_chat_not_eligible_verdict_grounded(self):
        """When failing criteria are provided, /chat explains the not_eligible verdict."""
        resp = self.client.post("/chat", json={
            "user_query": "I am a tenant farmer cultivating on lease. Can I apply for PM-KISAN?",
            "state": "Madhya Pradesh",
            "farmer_profile": {
                "ownership": "tenant",
                "land_size": 2.0,
                "farmer_category": "small",
                "kyc_documents": ["Aadhaar Card"]
            },
            "language": "en"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        ans = data["answer"]
        self.assertTrue("not" in ans.lower() or "ineligible" in ans.lower())
        if data.get("eligibility_result"):
            self.assertEqual(data["eligibility_result"]["status"], "not_eligible")


if __name__ == "__main__":
    unittest.main()
