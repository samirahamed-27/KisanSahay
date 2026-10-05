"""
KisanSahay Volatile Figures Validator & Two-Tier Chunking Protector
==================================================================
Handles volatile financial figures (loan limits, interest rates, subsidy amounts,
premium rates) so they never appear without a date and source attribution.

Prompt 2 Requirements:
1. Volatile figures in Markdown source files must be formatted on a single line:
   `Interest rate: X% (as of YYYY-MM-DD, source: <url>)`
   or replaced with a link to the official source where the figure cannot be verified.
2. Scans every record line-by-line before embedding.
3. Rejects or flags any volatile figure lacking an 'as of' date and source,
   reporting the record ID and line number in the error message.
4. Two-tier chunking protection: guarantees number, date, and source stay in the
   same chunk by keeping them on one line and never splitting inside a bracketed
   "(as of ...)" note.
"""

import re
import logging
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger("VolatileValidator")

# Mandatory dated source pattern: (as of YYYY-MM-DD, source: <url>)
AS_OF_PATTERN = re.compile(
    r'\(\s*as\s+of\s+\d{4}-\d{2}-\d{2}\s*,\s*source\s*:\s*https?://[^\s)]+\s*\)',
    re.IGNORECASE
)

# Date extraction regex for post-processing and age verification
EXTRACT_DATE_PATTERN = re.compile(
    r'\bas\s+of\s+(\d{4}-\d{2}-\d{2})\b',
    re.IGNORECASE
)

# Allowed official link replacement without stating bare unverified numbers
OFFICIAL_LINK_PATTERN = re.compile(
    r'(?i)(?:refer\s+to|see|check|verify|available\s+at)?\s*(?:\[[^\]]+\]\(https?://[^\)]+\)|https?://\S+)'
)

# ─────────────────────────────────────────────────────────────────────────────
# Volatile Figure Detection Regexes
# ─────────────────────────────────────────────────────────────────────────────

# 1. Interest Rates
INTEREST_PATTERNS = [
    re.compile(r'(?i)\binterest\s+rate\s*:\s*\d+(\.\d+)?%'),
    re.compile(r'(?i)\b(?:effective|basic|concessional)?\s*interest\s+(?:rate|subvention)?\s*(?:of|is|at|up to)?\s*\d+(\.\d+)?%'),
    re.compile(r'(?i)\b\d+(\.\d+)?%\s*(?:interest\s+subvention|interest\s+rate|annual\s+interest|p\.a\.)\b'),
    re.compile(r'(?i)\bsubvention\s+(?:of|at)?\s*\d+(\.\d+)?%'),
    re.compile(r'(?i)\broi\s*:\s*\d+(\.\d+)?%')
]

# 2. Loan Limits
LOAN_LIMIT_PATTERNS = [
    re.compile(r'(?i)\b(?:loan|credit|borrowing)\s+limit\s*:\s*(?:₹|rs\.?|inr)?\s*[\d,]+'),
    re.compile(r'(?i)\b(?:credit|loan|borrowing)\s+limit\s+(?:up\s+to|of|is)\s*(?:₹|rs\.?|inr)?\s*[\d,]+'),
    re.compile(r'(?i)\b(?:limit\s+up\s+to|limit\s+of)\s*(?:₹|rs\.?|inr)\s*[\d,]+'),
    re.compile(r'(?i)\bcollateral[- ]free\s+(?:loan\s+)?limit\s*(?:of|is|up to|:)?\s*(?:₹|rs\.?|inr)?\s*[\d,]+'),
    re.compile(r'(?i)\b(?:₹|rs\.?|inr)\s*[\d,]+\s*(?:lakh|crore)?\s*(?:loan\s+limit|credit\s+limit|collateral[- ]free\s+limit)\b')
]

# 3. Subsidy Amounts
SUBSIDY_PATTERNS = [
    re.compile(r'(?i)\bsubsidy\s+amount\s*:\s*(?:₹|rs\.?|inr)?\s*[\d,]+'),
    re.compile(r'(?i)\bsubsidy\s+(?:of|is|up to)\s*(?:₹|rs\.?|inr)\s*[\d,]+'),
    re.compile(r'(?i)\b(?:capital|financial|investment)\s+subsidy\s+(?:of|is|up to)\s*(?:₹|rs\.?|inr|\d+(\.\d+)?%)'),
    re.compile(r'(?i)\bfinancial\s+assistance\s+(?:of|is|up to)\s*(?:₹|rs\.?|inr)\s*[\d,]+'),
    re.compile(r'(?i)\bincome\s+support\s+of\s+(?:₹|rs\.?|inr)\s*[\d,]+'),
    re.compile(r'(?i)\b(?:dbt|installment|instalment)\s+of\s*(?:₹|rs\.?|inr)\s*[\d,]+')
]

# 4. Premium Rates
PREMIUM_PATTERNS = [
    re.compile(r'(?i)\bpremium\s+rate\s*:\s*\d+(\.\d+)?%'),
    re.compile(r'(?i)\b(?:crop\s+insurance\s+)?premium\s+(?:rate|share)?\s*(?:of|is|at|up to)?\s*\d+(\.\d+)?%'),
    re.compile(r'(?i)\b\d+(\.\d+)?%\s*(?:premium|insurance\s+premium)\b'),
    re.compile(r'(?i)\bfarmer\s+(?:share\s+of\s+)?premium\s*(?:of|is|at|:)?\s*\d+(\.\d+)?%')
]

ALL_VOLATILE_CATEGORIES = {
    "Interest Rate": INTEREST_PATTERNS,
    "Loan Limit": LOAN_LIMIT_PATTERNS,
    "Subsidy Amount": SUBSIDY_PATTERNS,
    "Premium Rate": PREMIUM_PATTERNS
}


class ValidationError(ValueError):
    """Raised when a record fails volatile figure validation."""
    def __init__(self, message: str, record_id: str, line_no: int, snippet: str):
        super().__init__(message)
        self.record_id = record_id
        self.line_no = line_no
        self.snippet = snippet


def extract_volatile_figures_from_line(line: str) -> List[Tuple[str, str]]:
    """
    Checks if a line contains any volatile numbers (loan limits, interest rates,
    subsidy amounts, premium rates).
    Returns list of tuples: [(category, matched_text), ...]
    """
    matches = []
    # If the line explicitly replaces figures with a link and has no raw percentage or limit number
    stripped = line.strip()
    if not stripped:
        return []

    for category, pattern_list in ALL_VOLATILE_CATEGORIES.items():
        for pat in pattern_list:
            m = pat.search(line)
            if m:
                matched_snippet = m.group(0)
                matches.append((category, matched_snippet))
                break  # one match per category is enough for this line

    return matches


def is_line_safely_attributed(line: str) -> bool:
    """
    A line containing a volatile figure is valid IF:
    1. It contains a valid '(as of YYYY-MM-DD, source: <url>)' attribution.
    2. OR it contains an official source link and no unverified raw numbers.
    """
    if AS_OF_PATTERN.search(line):
        return True

    # If the line contains an official link and does not assert a bare volatile figure
    # (e.g. "Interest rate: Refer to official portal at [PM-Kisan](https://pmkisan.gov.in)")
    has_link = OFFICIAL_LINK_PATTERN.search(line)
    if has_link:
        # Check if any digits/percentages are stated
        has_numbers = bool(re.search(r'\d+%', line) or re.search(r'(?:₹|rs\.?|inr)\s*[\d,]+', line, re.IGNORECASE))
        if not has_numbers:
            return True

    return False


def validate_record_volatile_figures(record_id: str, text: str) -> Tuple[bool, List[str]]:
    """
    Scans a record line-by-line (1-indexed) before embedding.
    Rejects or flags any volatile figure (loan limit, interest rate, subsidy amount, premium rate)
    that has no 'as of' date and source.

    Returns:
        (is_valid: bool, errors: List[str])
    """
    errors = []
    lines = text.splitlines()

    for line_idx, line in enumerate(lines, 1):
        volatile_matches = extract_volatile_figures_from_line(line)
        if volatile_matches:
            # Line contains volatile figure; verify attribution
            if not is_line_safely_attributed(line):
                for category, snippet in volatile_matches:
                    err_msg = (
                        f"Validation error in record '{record_id}' at line {line_idx}: "
                        f"Volatile figure '{snippet}' ({category}) lacks mandatory "
                        f"'(as of YYYY-MM-DD, source: <url>)' attribution. "
                        f"Line {line_idx}: '{line.strip()}'"
                    )
                    errors.append(err_msg)

    is_valid = len(errors) == 0
    return is_valid, errors


class VolatileFigureValidator:
    """Class wrapper for volatile figure validation across pipelines."""

    def __init__(self, raise_on_error: bool = False):
        self.raise_on_error = raise_on_error

    def validate(self, record_id: str, text: str) -> Tuple[bool, List[str]]:
        is_valid, errors = validate_record_volatile_figures(record_id, text)
        if not is_valid and self.raise_on_error:
            raise ValidationError(errors[0], record_id=record_id, line_no=1, snippet=errors[0])
        return is_valid, errors


# ─────────────────────────────────────────────────────────────────────────────
# 3. Formatting Helpers for Markdown Sources
# ─────────────────────────────────────────────────────────────────────────────

def format_volatile_line(
    figure_label: str,
    value: str,
    as_of_date: Optional[str] = None,
    source_url: Optional[str] = None
) -> str:
    """
    Formats a volatile financial figure into the required single-line form:
        Interest rate: 7% (as of 2026-10-02, source: https://agricoop.nic.in)
    or replaces with a link to official source if unverified:
        Interest rate: Refer to official portal: https://agricoop.nic.in
    """
    clean_label = figure_label.strip().rstrip(":")
    clean_val = value.strip()

    if as_of_date and source_url:
        # Standardize date to YYYY-MM-DD
        date_str = str(as_of_date)[:10]
        return f"{clean_label}: {clean_val} (as of {date_str}, source: {source_url})"
    elif source_url:
        return f"{clean_label}: Refer to official source at [Official Portal]({source_url})"
    else:
        return f"{clean_label}: Refer to local bank branch or KVK for current directives."


# ─────────────────────────────────────────────────────────────────────────────
# 4. Two-Tier Chunking Protection
# ─────────────────────────────────────────────────────────────────────────────

def protect_volatile_notes(text: str) -> str:
    """
    Protects bracketed '(as of ...)' notes from being severed by RecursiveCharacterTextSplitter.
    Replaces spaces inside '(as of YYYY-MM-DD, source: ...)' and the space preceding the note
    with non-breaking spaces (\u00A0) so that splitters that split on ASCII space (' ') will
    never break inside the bracketed attribution note.
    """
    def _replace_spaces_in_note(match: re.Match) -> str:
        note_str = match.group(0)
        # Replace all spaces with non-breaking spaces
        return note_str.replace(" ", "\u00A0")

    # Match '(as of ...)' and replace spaces inside it
    protected = AS_OF_PATTERN.sub(_replace_spaces_in_note, text)
    # Also attach the preceding space to ensure figure and note stay on same line
    protected = re.sub(r' (\(as\u00A0of\u00A0)', lambda m: "\u00A0" + m.group(1), protected)
    return protected


def unprotect_volatile_notes(text: str) -> str:
    """
    Restores non-breaking spaces (\u00A0) to standard ASCII spaces (' ')
    after chunking completes.
    """
    return text.replace("\u00A0", " ")
