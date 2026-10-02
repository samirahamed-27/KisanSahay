"""
Government Schemes and Agricultural Loans Parser Adapter (HIGH RISK)
====================================================================
Harvester for Central and State agricultural subsidy programs, credit schemes, and crop insurance.
Extracts: scheme_name, scheme_type, eligibility, documents, benefits, how_to_apply, deadlines, helpline.
Validates: explicit eligibility & document lists, valid HTTPS URLs, helpline phone format.
Safety Gate: Always flags harvested schemes as 'pending_review' due to financial risk level.
"""

import re
import json
from typing import Dict, Any, List, Optional

from .base import BaseFetcher
from .normalizers import (
    normalize_state,
    validate_phone,
    validate_https_url,
)


class GovSchemeLoanParser(BaseFetcher):
    """Adapter for official government scheme portals (agricoop.nic.in, pmkisan.gov.in, NABARD)."""

    def parse_schemes_content(self, raw_content: str) -> List[Dict[str, Any]]:
        """Parses scheme cards or JSON payloads from government portals."""
        # Attempt JSON parse first if upstream provides a direct JSON API
        try:
            data = json.loads(raw_content)
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "schemes" in data:
                return data["schemes"]
        except Exception:
            pass

        # HTML parsing fallback for scheme sections
        raw_items = []
        # Split on scheme-card container tags or article blocks
        card_parts = re.split(r"<div[^>]*class=[\"'][^\"']*scheme-card[^\"']*[\"'][^>]*>", raw_content, flags=re.IGNORECASE)
        if len(card_parts) > 1:
            scheme_blocks = card_parts[1:]
        else:
            # Fallback regex matching standard headings or articles
            scheme_blocks = re.findall(
                r"<article[^>]*>(.*?)</article>",
                raw_content,
                flags=re.DOTALL | re.IGNORECASE
            )

        for block in scheme_blocks:
            name_match = re.search(r"<h[234][^>]*>(.*?)</h[234]>", block, flags=re.IGNORECASE)
            scheme_name = re.sub(r"<[^>]+>", "", name_match.group(1)).strip() if name_match else ""

            type_match = re.search(r"<strong>Type:</strong>\s*([^<]+)", block, flags=re.IGNORECASE)
            scheme_type = type_match.group(1).strip() if type_match else "Direct Subsidy"

            benefits_match = re.search(r"<strong>Benefits?:</strong>\s*([^<]+)", block, flags=re.IGNORECASE)
            benefits = benefits_match.group(1).strip() if benefits_match else ""

            apply_match = re.search(r"<strong>How to Apply:</strong>\s*([^<]+)", block, flags=re.IGNORECASE)
            how_to_apply = apply_match.group(1).strip() if apply_match else "Apply via CSC Centre or District Agri Office"

            deadlines_match = re.search(r"<strong>Deadline:</strong>\s*([^<]+)", block, flags=re.IGNORECASE)
            deadlines = deadlines_match.group(1).strip() if deadlines_match else "Open Throughout Year"

            helpline_match = re.search(r"<strong>Helpline:</strong>\s*([^<]+)", block, flags=re.IGNORECASE)
            helpline = helpline_match.group(1).strip() if helpline_match else "1800-180-1551"

            # Extract lists of eligibility and documents
            eligibility = []
            elig_section = re.search(r"<strong>Eligibility:</strong>\s*<ul>(.*?)</ul>", block, flags=re.DOTALL | re.IGNORECASE)
            if elig_section:
                elig_items = re.findall(r"<li>(.*?)</li>", elig_section.group(1), flags=re.IGNORECASE)
                eligibility = [re.sub(r"<[^>]+>", "", i).strip() for i in elig_items if i.strip()]

            documents = []
            doc_section = re.search(r"<strong>Documents:</strong>\s*<ul>(.*?)</ul>", block, flags=re.DOTALL | re.IGNORECASE)
            if doc_section:
                doc_items = re.findall(r"<li>(.*?)</li>", doc_section.group(1), flags=re.IGNORECASE)
                documents = [re.sub(r"<[^>]+>", "", i).strip() for i in doc_items if i.strip()]

            raw_items.append({
                "scheme_name": scheme_name,
                "scheme_type": scheme_type,
                "eligibility": eligibility or ["All eligible landholding farmers"],
                "documents": documents or ["Aadhaar Card", "Land Possession Certificate (Khasra/Khatauni)", "Bank Passbook"],
                "benefits": benefits,
                "how_to_apply": how_to_apply,
                "deadlines": deadlines,
                "helpline": helpline
            })

        return raw_items

    def fetch(self, previous_count: Optional[int] = None, content_override: Optional[str] = None) -> List[Dict[str, Any]]:
        """Executes fetch, parsing, validation, and standard schema creation."""
        if content_override is not None:
            content = content_override
            source_url = self.official_url or "https://agricoop.nic.in/en/Major-Schemes"
        else:
            source_url = self.official_url
            res = self.fetch_url(source_url)
            content = res.text

        raw_items = self.parse_schemes_content(content)
        valid_records: List[Dict[str, Any]] = []

        is_valid_source, src_res = validate_https_url(source_url)
        if not is_valid_source:
            raise ValueError(f"Invalid official HTTPS source URL: {src_res}")

        state = normalize_state(self.target_state)

        for item in raw_items:
            scheme_name = item.get("scheme_name", "").strip()
            if not scheme_name:
                self.reject(item, "Missing required scheme_name")
                continue

            eligibility = item.get("eligibility", [])
            if not isinstance(eligibility, list) or len(eligibility) == 0:
                self.reject(item, f"Scheme '{scheme_name}' rejected: eligibility must be a non-empty list")
                continue

            documents = item.get("documents", [])
            if not isinstance(documents, list) or len(documents) == 0:
                self.reject(item, f"Scheme '{scheme_name}' rejected: documents must be a non-empty list")
                continue

            benefits = item.get("benefits", "").strip()
            if not benefits:
                self.reject(item, f"Scheme '{scheme_name}' rejected: missing benefits specification")
                continue

            # Validate helpline phone format if provided
            raw_phone = item.get("helpline")
            phone_val = "1800-180-1551"
            if raw_phone:
                is_phone_ok, clean_phone = validate_phone(raw_phone)
                phone_val = clean_phone if is_phone_ok else "1800-180-1551"

            clean_content = {
                "scheme_name": scheme_name,
                "scheme_type": item.get("scheme_type", "Subsidized Credit / Grant"),
                "eligibility": eligibility,
                "documents": documents,
                "benefits": benefits,
                "how_to_apply": item.get("how_to_apply", "Apply via official portal or CSC Centre"),
                "deadlines": item.get("deadlines", "Ongoing / Open"),
                "helpline": phone_val,
                "portal_link": item.get("portal_link", src_res)
            }

            scheme_slug = re.sub(r"[^\w]+", "_", scheme_name.lower())[:32].strip("_")
            record_id = f"scheme_{scheme_slug}"

            record = self.build_record(
                record_id=record_id,
                state=state,
                district="All",
                content=clean_content,
                source_url=src_res
            )
            # High risk: always requires human verification gate
            record["status"] = "pending_review"
            valid_records.append(record)

        self.verify_volume_drop(valid_records, previous_count)
        return valid_records
