"""
KVK Directory Parser Adapter (HTML / Table / Card Parser)
=========================================================
Harvesters for ICAR Krishi Vigyan Kendra directories.
Extracts: name, district, address, phone, website, soil-testing facility.
Validates: KVK phone format, https source URL, canonical district/state.
"""

import html
import re
from typing import Dict, Any, List, Optional

from .base import BaseFetcher
from .normalizers import (
    normalize_state,
    normalize_district,
    validate_phone,
    validate_https_url,
)

# Pre-compiled regular expressions for high-performance HTML parsing
RE_ROW = re.compile(r"<tr[^>]*>(.*?)</tr>", flags=re.DOTALL | re.IGNORECASE)
RE_CELL = re.compile(r"<td[^>]*>(.*?)</td>", flags=re.DOTALL | re.IGNORECASE)
RE_TAG = re.compile(r"<[^>]+>")
RE_WHITESPACE = re.compile(r"\s+")
RE_HREF = re.compile(r'href=["\']([^"\']+)["\']', flags=re.IGNORECASE)
RE_PHONE_SPLIT = re.compile(r"[,/;\n\r]+")

# Soil lab positive keywords in English and Hindi
SOIL_FACILITY_KEYWORDS = {
    "yes", "available", "functional", "true", "active", "lab", "laboratory",
    "उपलब्ध", "हाँ", "सक्रिय"
}


class KVKDirectoryParser(BaseFetcher):
    """Adapter for official ICAR KVK directory web portals."""

    def parse_html_table(self, html_content: str) -> List[Dict[str, Any]]:
        """Parses KVK HTML directory table or cards into structured raw dictionaries."""
        if not html_content or not isinstance(html_content, str):
            return []

        raw_items: List[Dict[str, Any]] = []

        # Find <tr> rows using regex / string extraction for robustness without bs4
        rows = RE_ROW.findall(html_content)

        for row in rows:
            cells = RE_CELL.findall(row)
            if len(cells) < 4:
                continue

            # Strip inner HTML tags, unescape HTML entities, and normalize whitespace
            clean_cells = [
                RE_WHITESPACE.sub(" ", RE_TAG.sub(" ", html.unescape(c))).strip()
                for c in cells
            ]

            # Skip header rows that mistakenly use <td> instead of <th>
            if (
                clean_cells[0].lower() in ("s.no", "sl.no", "sr.no", "#")
                or (len(clean_cells) > 1 and clean_cells[1].lower() in ("district", "district name"))
            ):
                continue

            # Expect columns: [S.No, District, KVK Name, Address, Phone, Website, Soil Lab]
            district_raw = clean_cells[1] if len(clean_cells) > 1 else ""
            name_raw = clean_cells[2] if len(clean_cells) > 2 else ""
            address_raw = clean_cells[3] if len(clean_cells) > 3 else ""
            phone_raw = clean_cells[4] if len(clean_cells) > 4 else ""
            website_raw = ""
            soil_lab_raw = False

            if len(clean_cells) > 5:
                # Extract link href if present, preserving raw link for HTTPS validation
                href_match = RE_HREF.search(cells[5])
                website_raw = href_match.group(1).strip() if href_match else clean_cells[5]

            if len(clean_cells) > 6:
                soil_str = clean_cells[6].lower()
                soil_lab_raw = any(w in soil_str for w in SOIL_FACILITY_KEYWORDS) or (
                    "soil" in soil_str and "not" not in soil_str and "nil" not in soil_str
                )

            raw_items.append({
                "name": name_raw,
                "district": district_raw,
                "address": address_raw,
                "phone": phone_raw,
                "website": website_raw or "https://kvk.icar.gov.in",
                "soil_testing_facility": soil_lab_raw,
            })

        return raw_items

    def fetch(
        self,
        previous_count: Optional[int] = None,
        html_override: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes fetch, parsing, validation, and standard schema creation.
        Supports html_override for offline testing and unit tests.
        """
        if html_override is not None:
            content = html_override
            source_url = self.official_url or "https://kvk.icar.gov.in/directory"
        else:
            source_url = self.official_url or "https://kvk.icar.gov.in"
            res = self.fetch_url(source_url)
            content = res.text

        raw_items = self.parse_html_table(content)
        valid_records: List[Dict[str, Any]] = []
        seen_record_ids: Dict[str, int] = {}

        for item in raw_items:
            # 1. Validate required fields
            name = item.get("name", "").strip()
            if not name:
                self.reject(item, "Missing required KVK name")
                continue

            raw_dist = item.get("district", "").strip()
            district = normalize_district(raw_dist)
            state = normalize_state(item.get("state") or self.target_state)

            address = item.get("address", "").strip()
            if not address:
                self.reject(item, "Missing postal address for KVK")
                continue

            # 2. Validate KVK phone number format
            raw_phone = item.get("phone", "").strip()
            is_valid_phone, phone_res = validate_phone(raw_phone)
            # If multiple numbers are in the cell, attempt to validate individual parts
            if not is_valid_phone and any(sep in raw_phone for sep in (",", "/", ";", "\n")):
                for candidate in RE_PHONE_SPLIT.split(raw_phone):
                    cand_clean = candidate.strip()
                    if cand_clean:
                        valid_cand, parsed_cand = validate_phone(cand_clean)
                        if valid_cand:
                            is_valid_phone, phone_res = valid_cand, parsed_cand
                            break

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
                "host_organization": item.get("host_organization", "ICAR / State Agricultural University"),
            }

            state_slug = state.lower().replace(" ", "_")
            dist_slug = district.lower().replace(" ", "_")
            base_record_id = f"kvk_{state_slug}_{dist_slug}"

            # Avoid ID collisions when multiple KVKs exist in the same district
            count = seen_record_ids.get(base_record_id, 0)
            if count == 0:
                record_id = base_record_id
            else:
                record_id = f"{base_record_id}_{count + 1}"
            seen_record_ids[base_record_id] = count + 1

            record = self.build_record(
                record_id=record_id,
                state=state,
                district=district,
                content=clean_content,
                source_url=src_res,
            )
            valid_records.append(record)

        # 4. Enforce 70% volume drop anomaly check
        self.verify_volume_drop(valid_records, previous_count)
        return valid_records
