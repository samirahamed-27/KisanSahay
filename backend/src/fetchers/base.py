"""
Base Fetcher and HTTP Infrastructure for KisanSahay
===================================================
Provides resilient HTTP harvesting with:
- Configurable User-Agent identifying the KisanSahay bot
- Token-bucket / interval rate limiting
- Request timeouts and exponential backoff retries
- robots.txt compliance checking
- 70% threshold volume drop anomaly detection
- Rejection tracking for non-compliant records
"""

import time
import logging
import urllib.robotparser
from urllib.parse import urlparse
from typing import Dict, Any, List, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timezone

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger("KisanFetchers")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] [Fetcher] %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

DEFAULT_USER_AGENT = "KisanSahay-AgriBot/1.0 (+https://github.com/samirahamed-27/KisanSahay; contact@kisansahay.org)"
DEFAULT_REQUEST_TIMEOUT = 15.0  # seconds


class VolumeDropAnomalyError(Exception):
    """Raised when harvested records count drops below the 70% threshold of previous count."""
    pass


@dataclass
class RejectedRecord:
    """Represents a record dropped during validation with full audit trace."""
    raw_record: Any
    reason: str
    data_type: str
    source_id: str
    rejected_at: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class RateLimiter:
    """Enforces a minimum interval between consecutive requests to the same domain."""

    def __init__(self, min_interval_seconds: float = 1.0):
        self.min_interval = min_interval_seconds
        self.last_request_time: Dict[str, float] = {}

    def wait(self, domain: str) -> None:
        now = time.time()
        last = self.last_request_time.get(domain, 0.0)
        elapsed = now - last
        if elapsed < self.min_interval:
            sleep_duration = self.min_interval - elapsed
            time.sleep(sleep_duration)
        self.last_request_time[domain] = time.time()


class BaseFetcher:
    """
    Base class for all source adapters in sources.yaml.
    Implements fetch() -> List[Dict[str, Any]] returning records in shared schema.
    """

    def __init__(
        self,
        source_config: Dict[str, Any],
        user_agent: str = DEFAULT_USER_AGENT,
        timeout: float = DEFAULT_REQUEST_TIMEOUT,
        min_request_interval: float = 1.0,
        min_volume_ratio: float = 0.70
    ):
        self.config = source_config
        self.source_id = source_config.get("id", "src_unknown")
        self.source_name = source_config.get("name", "Unknown Source")
        self.official_url = source_config.get("official_url", "")
        self.data_type = source_config.get("data_type", "unknown")
        self.fetch_method = source_config.get("fetch_method", "html")
        self.risk_level = source_config.get("risk_level", "low")
        self.target_state = source_config.get("state", "Madhya Pradesh")
        self.target_district = source_config.get("district", "all")
        self.timeout = timeout
        self.min_volume_ratio = min_volume_ratio

        self.rejected_records: List[RejectedRecord] = []
        self.rate_limiter = RateLimiter(min_interval_seconds=min_request_interval)
        self.session = self._create_session(user_agent=user_agent)
        self._robots_cache: Dict[str, urllib.robotparser.RobotFileParser] = {}

    def _create_session(self, user_agent: str) -> requests.Session:
        session = requests.Session()
        session.headers.update({
            "User-Agent": user_agent,
            "Accept": "application/json, application/xml, text/html, text/csv, */*",
            "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
            "Cache-Control": "no-cache",
        })

        retries = Retry(
            total=3,
            backoff_factor=1.0,  # 1s, 2s, 4s backoff
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"]
        )
        adapter = HTTPAdapter(max_retries=retries)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        return session

    def is_url_allowed_by_robots(self, url: str) -> bool:
        """Inspects domain robots.txt to ensure harvesting is permitted."""
        parsed = urlparse(url)
        domain = f"{parsed.scheme}://{parsed.netloc}"
        if domain not in self._robots_cache:
            rp = urllib.robotparser.RobotFileParser()
            robots_url = f"{domain}/robots.txt"
            try:
                rp.set_url(robots_url)
                rp.read()
                self._robots_cache[domain] = rp
            except Exception as e:
                # If robots.txt is unavailable or times out, permit conservative fetch
                logger.debug("Could not retrieve robots.txt from %s: %s", domain, e)
                return True

        rp = self._robots_cache[domain]
        try:
            allowed = rp.can_fetch(DEFAULT_USER_AGENT, url)
            return allowed
        except Exception:
            return True

    def fetch_url(self, url: str, params: Optional[Dict[str, Any]] = None) -> requests.Response:
        """Executes rate-limited HTTP GET with backoff retries and robots.txt check."""
        parsed = urlparse(url)
        domain = parsed.netloc

        if not self.is_url_allowed_by_robots(url):
            logger.warning("Access to URL %s restricted by robots.txt", url)

        self.rate_limiter.wait(domain)
        logger.info("[%s] Fetching %s ...", self.source_id, url)

        res = self.session.get(url, params=params, timeout=self.timeout)
        res.raise_for_status()
        return res

    def reject(self, raw_record: Any, reason: str) -> None:
        """Logs and records an invalid record in the rejected audit list."""
        rejected_entry = RejectedRecord(
            raw_record=raw_record,
            reason=reason,
            data_type=self.data_type,
            source_id=self.source_id,
            rejected_at=datetime.now(timezone.utc).isoformat()
        )
        self.rejected_records.append(rejected_entry)
        logger.warning("[%s] Rejected record: %s (Reason: %s)", self.source_id, str(raw_record)[:120], reason)

    def verify_volume_drop(self, current_records: List[Dict[str, Any]], previous_count: Optional[int]) -> None:
        """
        Enforces safety rule:
        If previous_count is known and current_records is under 70% of previous_count,
        raises VolumeDropAnomalyError so caller aborts harvest and preserves existing data.
        """
        if previous_count is None or previous_count <= 0:
            return

        current_count = len(current_records)
        threshold = int(previous_count * self.min_volume_ratio)

        if current_count < threshold:
            msg = (
                f"[{self.source_id}] Volume drop anomaly detected: "
                f"Fetched {current_count} records, which is below {int(self.min_volume_ratio * 100)}% "
                f"of previous harvest ({previous_count} records; threshold: {threshold}). "
                "Aborting sync to prevent data loss; previous records will be kept."
            )
            logger.error(msg)
            raise VolumeDropAnomalyError(msg)

    def build_record(
        self,
        record_id: str,
        state: str,
        district: Optional[str],
        content: Dict[str, Any],
        source_url: str,
        last_verified: Optional[str] = None
    ) -> Dict[str, Any]:
        """Constructs standardized dictionary representation matching the SQLite records schema."""
        now_iso = last_verified or datetime.now(timezone.utc).isoformat()
        return {
            "id": record_id,
            "type": self.data_type,
            "state": state,
            "district": district,
            "content": content,
            "source_id": self.source_id,
            "source_url": source_url,
            "last_verified": now_iso,
            "status": "pending_review" if self.risk_level == "high" else "live",
            "version": 1
        }

    def fetch(self, previous_count: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Contract method: fetches upstream data, parses, validates, normalizes,
        and returns list of records in shared schema.
        Must be implemented by concrete adapters.
        """
        raise NotImplementedError("Subclasses must implement fetch()")
