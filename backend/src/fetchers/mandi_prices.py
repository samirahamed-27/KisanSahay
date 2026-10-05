"""
Agmarknet / Data.gov.in Daily Mandi Prices Parser Adapter (API / CSV)
====================================================================
Harvester for official APMC wholesale mandi price arrivals and modal rates.
Supports both JSON Open Data APIs and daily CSV bulk dumps.
Extracts: market_center, district, commodity, variety, arrival_date, min_price, max_price, modal_price, arrivals_tonnes.
Validates: parseable arrival date, positive numeric modal price, valid HTTPS source URL.
"""

import csv
import json
from typing import Dict, Any, List, Optional

from .base import BaseFetcher
from .normalizers import (
    normalize_state,
    normalize_district,
    validate_date,
    validate_https_url,
)


class AgmarknetMandiParser(BaseFetcher):
    """Adapter for official daily mandi wholesale prices from Agmarknet or data.gov.in."""

    def parse_api_or_csv(self, raw_content: str) -> List[Dict[str, Any]]:
        """Parses either JSON response from data.gov.in API or Agmarknet CSV payload."""
        raw_items = []

        # 1. Try JSON (data.gov.in API response structure)
        try:
            data = json.loads(raw_content)
            records = []
            if isinstance(data, dict):
                records = data.get("records", []) or data.get("data", [])
            elif isinstance(data, list):
                records = data

            if records and isinstance(records, list):
                for r in records:
                    raw_items.append({
                        "market_center": r.get("market") or r.get("market_center") or r.get("market_name", ""),
                        "district": r.get("district", ""),
                        "commodity": r.get("commodity", ""),
                        "variety": r.get("variety", "Common"),
                        "arrival_date": r.get("arrival_date") or r.get("date", ""),
                        "min_price": r.get("min_price"),
                        "max_price": r.get("max_price"),
                        "modal_price": r.get("modal_price") or r.get("price"),
                        "arrivals_tonnes": r.get("arrivals_tonnes", 0.0)
                    })
                return raw_items
        except Exception:
            pass

        # 2. Try CSV parsing
        try:
            reader = csv.DictReader(raw_content.splitlines())
            for row in reader:
                clean_row = {k.strip().lower(): v.strip() for k, v in row.items() if k and v}
                market = clean_row.get("market") or clean_row.get("market center") or clean_row.get("market_center", "")
                dist = clean_row.get("district", "")
                comm = clean_row.get("commodity", "")
                var = clean_row.get("variety", "Common")
                arr_date = clean_row.get("arrival_date") or clean_row.get("date") or clean_row.get("arrival date", "")
                min_p = clean_row.get("min_price") or clean_row.get("min price", 0)
                max_p = clean_row.get("max_price") or clean_row.get("max price", 0)
                modal_p = clean_row.get("modal_price") or clean_row.get("modal price", 0)

                raw_items.append({
                    "market_center": market,
                    "district": dist,
                    "commodity": comm,
                    "variety": var,
                    "arrival_date": arr_date,
                    "min_price": min_p,
                    "max_price": max_p,
                    "modal_price": modal_p,
                    "arrivals_tonnes": clean_row.get("arrivals", 0)
                })
        except Exception:
            pass

        return raw_items

    def fetch(self, previous_count: Optional[int] = None, data_override: Optional[str] = None) -> List[Dict[str, Any]]:
        """Executes fetch, parsing, validation, and standard schema creation."""
        if data_override is not None:
            content = data_override
            source_url = self.official_url or "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
        else:
            source_url = self.official_url
            res = self.fetch_url(source_url)
            content = res.text

        raw_items = self.parse_api_or_csv(content)
        valid_records: List[Dict[str, Any]] = []

        is_valid_source, src_res = validate_https_url(source_url)
        if not is_valid_source:
            raise ValueError(f"Invalid official HTTPS source URL: {src_res}")

        state = normalize_state(self.target_state)

        for item in raw_items:
            market = item.get("market_center", "").strip()
            if not market:
                self.reject(item, "Missing APMC market_center name")
                continue

            commodity = item.get("commodity", "").strip()
            if not commodity:
                self.reject(item, "Missing crop commodity name")
                continue

            raw_dist = item.get("district", "")
            district = normalize_district(raw_dist) if raw_dist else normalize_district(market)

            # Date validation
            raw_date = str(item.get("arrival_date", ""))
            norm_date, err_date = validate_date(raw_date)
            if not norm_date:
                self.reject(item, f"Invalid mandi arrival date '{raw_date}': {err_date}")
                continue

            # Price validation
            try:
                modal_price = float(item.get("modal_price") or 0.0)
                min_price = float(item.get("min_price") or modal_price)
                max_price = float(item.get("max_price") or modal_price)
                if modal_price <= 0:
                    self.reject(item, f"Invalid non-positive modal price: {modal_price}")
                    continue
            except (ValueError, TypeError) as pe:
                self.reject(item, f"Unparseable price format ({pe}): {item.get('modal_price')}")
                continue

            try:
                arrivals_tonnes = float(item.get("arrivals_tonnes") or 0.0)
            except Exception:
                arrivals_tonnes = 0.0

            clean_content = {
                "market_center": market,
                "district": district,
                "commodity": commodity,
                "variety": item.get("variety", "Common"),
                "arrival_date": norm_date,
                "min_price": min_price,
                "max_price": max_price,
                "modal_price": modal_price,
                "arrivals_tonnes": arrivals_tonnes
            }

            market_slug = market.lower().replace(" ", "_")[:16]
            comm_slug = commodity.lower().replace(" ", "_")[:16]
            date_slug = norm_date.replace("-", "")
            record_id = f"mandi_{state.lower().replace(' ', '_')}_{market_slug}_{comm_slug}_{date_slug}"

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
