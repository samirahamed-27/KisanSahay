"""
KVK Training & Demonstration Calendar Parser Adapter
====================================================
Harvester for monthly KVK vocational training and field demonstration schedules.
Extracts: kvk_name, district, training_topic, start_date, end_date, target_audience, venue, fees, coordinator_contact.
Validates: parseable dates (start/end), valid HTTPS source URL, normalized district/state.
"""

import re
from typing import Dict, Any, List, Optional

from .base import BaseFetcher
from .normalizers import (
    normalize_state,
    normalize_district,
    validate_date,
    validate_https_url,
)


class KVKCalendarParser(BaseFetcher):
    """Adapter for official KVK training and demonstration schedules."""

    def parse_calendar_html(self, html_content: str) -> List[Dict[str, Any]]:
        """Parses HTML schedule tables into raw training calendar entries."""
        raw_items = []
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html_content, flags=re.DOTALL | re.IGNORECASE)

        for row in rows:
            cells = re.findall(r"<td[^>]*>(.*?)</td>", row, flags=re.DOTALL | re.IGNORECASE)
            if len(cells) < 6:
                continue

            clean_cells = [re.sub(r"<[^>]+>", " ", c).strip() for c in cells]

            # Typical table format: [KVK Name, District, Topic, Start Date, End Date, Audience, Venue, Fees, Coordinator]
            raw_items.append({
                "kvk_name": clean_cells[0],
                "district": clean_cells[1],
                "training_topic": clean_cells[2],
                "start_date": clean_cells[3],
                "end_date": clean_cells[4] if len(clean_cells) > 4 else clean_cells[3],
                "target_audience": clean_cells[5] if len(clean_cells) > 5 else "Farmers",
                "venue": clean_cells[6] if len(clean_cells) > 6 else "KVK Campus",
                "fees": clean_cells[7] if len(clean_cells) > 7 else "Free of Cost",
                "coordinator_contact": clean_cells[8] if len(clean_cells) > 8 else "KVK Training Coordinator",
            })

        return raw_items

    def fetch(self, previous_count: Optional[int] = None, html_override: Optional[str] = None) -> List[Dict[str, Any]]:
        """Executes fetch, parsing, validation, and standard schema creation."""
        if html_override is not None:
            content = html_override
            source_url = self.official_url or "https://kvk.icar.gov.in/training_schedule.aspx"
        else:
            source_url = self.official_url
            res = self.fetch_url(source_url)
            content = res.text

        raw_items = self.parse_calendar_html(content)
        valid_records: List[Dict[str, Any]] = []

        is_valid_source, src_res = validate_https_url(source_url)
        if not is_valid_source:
            raise ValueError(f"Invalid official HTTPS source URL: {src_res}")

        state = normalize_state(self.target_state)

        for item in raw_items:
            topic = item.get("training_topic", "").strip()
            if not topic:
                self.reject(item, "Missing training course topic")
                continue

            raw_dist = item.get("district", "")
            district = normalize_district(raw_dist)

            # Date validations
            raw_start = item.get("start_date", "")
            norm_start, err_start = validate_date(raw_start)
            if not norm_start:
                self.reject(item, f"Invalid start date '{raw_start}': {err_start}")
                continue

            raw_end = item.get("end_date", "")
            norm_end, err_end = validate_date(raw_end)
            if not norm_end:
                norm_end = norm_start  # Fallback to single day event if end date unparseable

            clean_content = {
                "kvk_name": item.get("kvk_name", f"KVK {district}"),
                "district": district,
                "training_topic": topic,
                "start_date": norm_start,
                "end_date": norm_end,
                "target_audience": item.get("target_audience", "Farmers and Rural Youth"),
                "venue": item.get("venue", "KVK Demonstration Field"),
                "fees": item.get("fees", "Free of Cost"),
                "coordinator_contact": item.get("coordinator_contact", "Training In-charge")
            }

            topic_slug = re.sub(r"[^\w]+", "_", topic.lower())[:24].strip("_")
            dist_slug = district.lower().replace(" ", "_")
            record_id = f"cal_{dist_slug}_{topic_slug}_{norm_start.replace('-', '')}"

            record = self.build_record(
                record_id=record_id,
                state=state,
                district=district,
                content=clean_content,
                source_url=src_res
            )
            valid_records.append(record)

        self.verify_volume_drop(valid_records, previous_count)
        return valid_records
