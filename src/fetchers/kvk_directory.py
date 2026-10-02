"""
KVK Directory Parser Adapter (HTML / Table / Card Parser)
=========================================================
Harvesters for ICAR Krishi Vigyan Kendra directories.
Extracts: name, district, address, phone, website, soil-testing facility.
Validates: KVK phone format, https source URL, canonical district/state.
"""

import re
from typing import Dict, Any, List, Optional
from xml.etree import ElementTree as ET

from .base import BaseFetcher
from .normalizers import (
    normalize_state,
    normalize_district,
    validate_phone,
    validate_https_url,
)


class KVKDirectoryParser(BaseFetcher):
    """Adapter for official ICAR KVK directory web portals."""

    def parse_html_table(self, html_content: str) -> List[Dict[str, Any]]:
        """Parses KVK HTML directory table or cards into structured raw dictionaries."""
        raw_items = []

        # Find <tr> rows using regex / string extraction for robustness without bs4
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html_content, flags=re.DOTALL | re.IGNORECASE)

        for row in rows:
            cells = re.findall(r"<td[^>]*>(.*?)</td>", row, flags=re.DOTALL | re.IGNORECASE)
            if len(cells) < 4:
                continue

            # Strip inner HTML tags
            clean_cells = [re.sub(r"<[^>]+>", " ", c).strip() for c in cells]

            # Expect columns: [S.No, District, KVK Name, Address, Phone, Website, Soil Lab]
            district_raw = clean_cells[1] if len(clean_cells) > 1 else ""
            name_raw = clean_cells[2] if len(clean_cells) > 2 else ""
            address_raw = clean_cells[3] if len(clean_cells) > 3 else ""
            phone_raw = clean_cells[4] if len(clean_cells) > 4 else ""
            website_raw = ""
            soil_lab_raw = False

            if len(clean_cells) > 5:
                # Extract link href if present
                href_match = re.search(r'href=["\'](https?://[^"\']+)["\']', cells[5], flags=re.IGNORECASE)
                website_raw = href_match.group(1) if href_match else clean_cells[5]

            if len(clean_cells) > 6:
                soil_str = clean_cells[6].lower()
                soil_lab_raw = any(w in soil_str for w in ["yes", "available", "functional", "true", "active"])

            raw_items.append({
                "name": name_raw,
                "district": district_raw,
                "address": address_raw,
                "phone": phone_raw,
                "website": website_raw or "https://kvk.icar.gov.in",
                "soil_testing_facility": soil_lab_raw,
            })

        return raw_items

    def fetch(self, previous_count: Optional[int] = None, html_override: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Executes fetch, parsing, validation, and standard schema creation.
        Supports html_override for offline testing and unit tests.
        """
        if html_override is not None:
            content = html_override
            source_url = self.official_url or "https://kvk.icar.gov.in/directory"
        else:
            source_url = self.official_url
            res = self.fetch_url(source_url)
            content = res.text

        raw_items = self.parse_html_table(content)
        valid_records: List[Dict[str, Any]] = []

        for item in raw_items:
            # 1. Validate required fields
            name = item.get("name", "").strip()
            if not name:
                self.reject(item, "Missing required KVK name")
                continue

            raw_dist = item.get("district", "").strip()
            district = normalize_district(raw_dist)
            state = normalize_state(self.target_state)

            address = item.get("address", "").strip()
            if not address:
                self.reject(item, "Missing postal address for KVK")
                continue

            # 2. Validate KVK phone number format
            raw_phone = item.get("phone", "")
            is_valid_phone, phone_res = validate_phone(raw_phone)
            if not is_valid_phone:
                self.reject(item, f"Phone validation failed: {phone_res}")
                continue

            # 3. Validate HTTPS source URL & website
            raw_website = item.get("website", "")
            is_valid_web, web_res = validate_https_url(raw_website)
            if not is_valid_web:
                self.reject(item, f"Website URL validation failed: {web_res}")
                continue

            is_valid_source, src_res = validate_https_url(source_url)
            if not is_valid_source:
                self.reject(item, f"Source URL validation failed: {src_res}")
                continue

            soil_facility = bool(item.get("soil_testing_facility", False))

            # Build canonical content dict
            clean_content = {
                "name": name,
                "district": district,
                "address": address,
                "phone": phone_res,
                "website": web_res,
                "soil_testing_facility": soil_facility,
                "host_organization": item.get("host_organization", "ICAR / State Agricultural University")
            }

            state_slug = state.lower().replace(" ", "_")
            dist_slug = district.lower().replace(" ", "_")
            record_id = f"kvk_{state_slug}_{dist_slug}"

            record = self.build_record(
                record_id=record_id,
                state=state,
                district=district,
                content=clean_content,
                source_url=src_res
            )
            valid_records.append(record)

        # 4. Enforce 70% volume drop anomaly check
        self.verify_volume_drop(valid_records, previous_count)
        return valid_records
