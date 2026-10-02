"""
Unit Tests for KisanSahay Fetchers & Parsers Package
====================================================
Tests all adapters against saved sample responses:
- KVKDirectoryParser
- KVKCalendarParser
- CropAdvisoryParser
- GovSchemeLoanParser
- AgmarknetMandiParser
- IMDAgrometParser
- Volume drop anomaly detection (< 70% threshold)
- State & District normalization
- Validation & rejection rules (phone format, HTTPS URL, date parsing)
"""

import os
import unittest
from pathlib import Path

from src.fetchers import (
    KVKDirectoryParser,
    KVKCalendarParser,
    CropAdvisoryParser,
    GovSchemeLoanParser,
    AgmarknetMandiParser,
    IMDAgrometParser,
    VolumeDropAnomalyError,
    normalize_state,
    normalize_district,
    validate_phone,
    validate_https_url,
    validate_date,
    get_fetcher_for_source,
)
from src.data_layer import SourceRegistry

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


class TestFetchersAndParsers(unittest.TestCase):

    def setUp(self):
        self.state = "Madhya Pradesh"
        self.registry = SourceRegistry(target_state=self.state)

    def _read_fixture(self, filename: str) -> str:
        fixture_path = FIXTURES_DIR / filename
        self.assertTrue(fixture_path.exists(), f"Missing fixture file: {fixture_path}")
        with open(fixture_path, "r", encoding="utf-8") as f:
            return f.read()

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Normalizers and Validators Unit Tests
    # -------------------------------------------------------------------------

    def test_state_and_district_normalization(self):
        """Verifies state and district alias resolution to canonical standard names."""
        self.assertEqual(normalize_state("mp"), "Madhya Pradesh")
        self.assertEqual(normalize_state("m.p."), "Madhya Pradesh")
        self.assertEqual(normalize_state("u.p."), "Uttar Pradesh")
        self.assertEqual(normalize_state("maharashtra"), "Maharashtra")
        self.assertEqual(normalize_state("raj"), "Rajasthan")

        # District aliases
        self.assertEqual(normalize_district("sehor"), "Sehore")
        self.assertEqual(normalize_district("ujjan"), "Ujjain")
        self.assertEqual(normalize_district("kanpur nagar"), "Kanpur")
        self.assertEqual(normalize_district("allahabad"), "Prayagraj")
        self.assertEqual(normalize_district("hoshangabad"), "Narmadapuram")
        self.assertEqual(normalize_district("Sehore District"), "Sehore")

    def test_phone_validation(self):
        """Tests validation of Indian landline, mobile, and toll-free numbers."""
        # Valid numbers
        self.assertTrue(validate_phone("07562-222456")[0])
        self.assertTrue(validate_phone("0755-2730985")[0])
        self.assertTrue(validate_phone("+91-9425012345")[0])
        self.assertTrue(validate_phone("1800-180-1551")[0])
        self.assertTrue(validate_phone("011-25841234")[0])

        # Invalid numbers
        self.assertFalse(validate_phone("")[0])
        self.assertFalse(validate_phone("INVALID-PHONE")[0])
        self.assertFalse(validate_phone("123")[0])  # Too short
        self.assertFalse(validate_phone("12345678901234567")[0])  # Too long

    def test_https_url_validation(self):
        """Tests strict HTTPS enforcement and URL validation."""
        self.assertTrue(validate_https_url("https://kvk.icar.gov.in/directory")[0])
        self.assertTrue(validate_https_url("https://farmer.gov.in/CropAdvisories.aspx?state=MP")[0])

        # Insecure HTTP or malformed
        is_ok, reason = validate_https_url("http://insecure.org/api")
        self.assertFalse(is_ok)
        self.assertIn("must be 'https'", reason)

        is_ok, _ = validate_https_url("ftp://server/file")
        self.assertFalse(is_ok)
        is_ok, _ = validate_https_url("not-a-url")
        self.assertFalse(is_ok)

    def test_date_validation(self):
        """Tests multi-format date normalization to YYYY-MM-DD."""
        norm, _ = validate_date("2026-10-02")
        self.assertEqual(norm, "2026-10-02")

        norm, _ = validate_date("02/10/2026")
        self.assertEqual(norm, "2026-10-02")

        norm, _ = validate_date("Fri, 02 Oct 2026 10:00:00 +0530")
        self.assertEqual(norm, "2026-10-02")

        # Invalid dates
        norm, err = validate_date("BAD-DATE")
        self.assertIsNone(norm)
        self.assertIn("Unparseable", err)

    # ─────────────────────────────────────────────────────────────────────────
    # 2. KVK Directory Adapter
    # -------------------------------------------------------------------------

    def test_kvk_directory_parser(self):
        """Tests KVKDirectoryParser with sample HTML, verifying phone validation and rejections."""
        src_cfg = self.registry.get_source(f"src_kvk_directory_{self.state}")
        self.assertIsNotNone(src_cfg)

        parser = get_fetcher_for_source(src_cfg)
        html = self._read_fixture("sample_kvk_directory.html")

        records = parser.fetch(html_override=html)

        # In sample HTML: 2 valid records (Sehore, Bhopal), 2 invalid (Ujjain bad phone, Dewas insecure HTTP)
        self.assertEqual(len(records), 2)
        self.assertEqual(len(parser.rejected_records), 2)

        # Check Sehore record structure
        sehore_rec = next(r for r in records if r["district"] == "Sehore")
        self.assertEqual(sehore_rec["type"], "kvk_directory")
        self.assertEqual(sehore_rec["state"], "Madhya Pradesh")
        self.assertEqual(sehore_rec["content"]["phone"], "07562-222456")
        self.assertTrue(sehore_rec["content"]["soil_testing_facility"])
        self.assertTrue(sehore_rec["source_url"].startswith("https://"))

        # Check rejection reasons
        rejection_reasons = [r.reason for r in parser.rejected_records]
        self.assertTrue(any("Phone validation failed" in r for r in rejection_reasons))
        self.assertTrue(any("Website URL validation failed" in r for r in rejection_reasons))

    # ─────────────────────────────────────────────────────────────────────────
    # 3. KVK Training Calendar Adapter
    # -------------------------------------------------------------------------

    def test_kvk_calendar_parser(self):
        """Tests KVKCalendarParser with sample schedule HTML."""
        src_cfg = self.registry.get_source(f"src_kvk_calendar_{self.state}")
        parser = get_fetcher_for_source(src_cfg)
        html = self._read_fixture("sample_kvk_calendar.html")

        records = parser.fetch(html_override=html)

        # 2 valid events, 1 rejected due to invalid start date
        self.assertEqual(len(records), 2)
        self.assertEqual(len(parser.rejected_records), 1)

        rec = records[0]
        self.assertEqual(rec["type"], "kvk_training_calendar")
        self.assertEqual(rec["content"]["start_date"], "2026-10-15")
        self.assertEqual(rec["content"]["end_date"], "2026-10-18")
        self.assertIn("Precision Drip", rec["content"]["training_topic"])

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Seasonal Crop Advisory Adapter (RSS)
    # -------------------------------------------------------------------------

    def test_crop_advisory_parser(self):
        """Tests CropAdvisoryParser against sample RSS feed."""
        src_cfg = self.registry.get_source(f"src_crop_advisories_{self.state}")
        parser = get_fetcher_for_source(src_cfg)
        rss = self._read_fixture("sample_crop_advisory.rss")

        records = parser.fetch(rss_override=rss)
        self.assertEqual(len(records), 2)

        soybean_rec = next(r for r in records if "Soybean" in r["content"]["crop_name"])
        self.assertIn("Harvest soybean crops", soybean_rec["content"]["advisory_text"])
        self.assertTrue(any("Caterpillar" in a for a in soybean_rec["content"]["pest_disease_alerts"]))
        self.assertEqual(soybean_rec["content"]["published_date"], "2026-10-02")

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Government Schemes & Loans Adapter (High Risk Safety Gate)
    # -------------------------------------------------------------------------

    def test_gov_schemes_loan_parser(self):
        """Tests GovSchemeLoanParser and verifies status is flagged as 'pending_review'."""
        src_cfg = self.registry.get_source(f"src_gov_schemes_loans_{self.state}")
        parser = get_fetcher_for_source(src_cfg)
        html = self._read_fixture("sample_gov_schemes.html")

        records = parser.fetch(content_override=html)
        self.assertEqual(len(records), 2)

        for r in records:
            # High risk items must always require human verification
            self.assertEqual(r["status"], "pending_review")
            self.assertGreaterEqual(len(r["content"]["eligibility"]), 1)
            self.assertGreaterEqual(len(r["content"]["documents"]), 1)
            self.assertTrue(len(r["content"]["benefits"]) > 10)

        pm_kisan = next(r for r in records if "PM-KISAN" in r["content"]["scheme_name"])
        self.assertEqual(pm_kisan["content"]["helpline"], "1800-11-5526")

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Agmarknet Mandi Prices Adapter (API / JSON)
    # -------------------------------------------------------------------------

    def test_mandi_prices_parser(self):
        """Tests AgmarknetMandiParser for daily prices, validating price parsing and rejections."""
        src_cfg = self.registry.get_source(f"src_mandi_prices_{self.state}")
        parser = get_fetcher_for_source(src_cfg)
        json_data = self._read_fixture("sample_mandi_prices.json")

        records = parser.fetch(data_override=json_data)

        # In fixture: 3 valid (Sehore, Ujjain, Bhopal), 2 rejected (Dewas bad date, Harda 0 price)
        self.assertEqual(len(records), 3)
        self.assertEqual(len(parser.rejected_records), 2)

        sehore_mandi = next(r for r in records if r["district"] == "Sehore")
        self.assertEqual(sehore_mandi["content"]["commodity"], "Soybean")
        self.assertEqual(sehore_mandi["content"]["modal_price"], 4750.0)
        self.assertEqual(sehore_mandi["content"]["arrival_date"], "2026-10-02")

    # ─────────────────────────────────────────────────────────────────────────
    # 7. IMD Agromet Weather Advisories Adapter (RSS / XML)
    # -------------------------------------------------------------------------

    def test_imd_agromet_parser(self):
        """Tests IMDAgrometParser against sample XML feed."""
        src_cfg = self.registry.get_source(f"src_imd_agromet_{self.state}")
        parser = get_fetcher_for_source(src_cfg)
        xml_data = self._read_fixture("sample_imd_agromet.xml")

        records = parser.fetch(feed_override=xml_data)
        self.assertEqual(len(records), 2)

        sehore_weather = next(r for r in records if r["district"] == "Sehore")
        self.assertEqual(sehore_weather["content"]["rainfall_forecast_mm"], 2.0)
        self.assertEqual(sehore_weather["content"]["temp_max_c"], 32.5)
        self.assertIn("spray", sehore_weather["content"]["spray_conditions"].lower())

    # ─────────────────────────────────────────────────────────────────────────
    # 8. Volume Drop Anomaly Rule (< 70% threshold raises error)
    # -------------------------------------------------------------------------

    def test_volume_drop_anomaly_safety(self):
        """Verifies VolumeDropAnomalyError is raised when harvested count drops under 70%."""
        src_cfg = self.registry.get_source(f"src_mandi_prices_{self.state}")
        parser = get_fetcher_for_source(src_cfg)
        json_data = self._read_fixture("sample_mandi_prices.json")

        # Previous harvest had 10 records; current fixture only yields 3 valid records (30% < 70%)
        with self.assertRaises(VolumeDropAnomalyError) as ctx:
            parser.fetch(previous_count=10, data_override=json_data)

        self.assertIn("Volume drop anomaly detected", str(ctx.exception))
        self.assertIn("below 70%", str(ctx.exception))

        # When previous harvest had 4 records, 3 valid is 75% >= 70% -> should succeed without error
        records = parser.fetch(previous_count=4, data_override=json_data)
        self.assertEqual(len(records), 3)


if __name__ == "__main__":
    unittest.main()
