"""
Unit & Integration Tests for KisanSahay Volatile Numbers & Validator (Prompt 2)
==============================================================================
Validates:
1. Formatting of volatile numbers (loan limits, interest rates, subsidies, premium rates)
   on single lines with '(as of YYYY-MM-DD, source: <url>)'.
2. ingest_static.py validator scanning every record and rejecting/flagging any
   volatile figure that lacks an 'as of' date and source, reporting record id and line.
3. Official link replacement when numbers cannot be verified.
4. Two-tier chunking (MarkdownHeaderTextSplitter + RecursiveCharacterTextSplitter)
   keeping number, date, and source in the same chunk and never splitting inside
   bracketed '(as of ...)' notes.
5. Gemini system prompt & post-processing rules enforcing dated rates/limits
   and suggesting confirmation with bank or KVK when older than 90 days or undated.
"""

import os
import json
import tempfile
import unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta

import sys
_backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from src.ingest.volatile_validator import (
    validate_record_volatile_figures,
    format_volatile_line,
    protect_volatile_notes,
    unprotect_volatile_notes,
    extract_volatile_figures_from_line,
    is_line_safely_attributed,
    VolatileFigureValidator,
    ValidationError
)
from ingest_static import chunk_record_two_tier, ingest_static_file, scan_and_validate_records
from sync_engine import format_record_to_markdown, format_scheme_benefits, SyncEngine, DeterministicFallbackEmbeddings
from src.rag.gemini_generator import build_gemini_system_prompt, generate_with_gemini


class TestVolatileFiguresValidator(unittest.TestCase):
    """Test suite for volatile figure detection, validation, chunking, and prompt rules."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.sample_jsonl = Path(self.temp_dir.name) / "test_records.jsonl"

    def tearDown(self):
        self.temp_dir.cleanup()

    # 1. Volatile Figure Line Attributions
    def test_properly_attributed_volatile_figures_pass_validation(self):
        valid_text = (
            "# Scheme: Kisan Credit Card\n"
            "## Benefits\n"
            "- Loan limit: ₹3,00,000 (as of 2026-10-02, source: https://agricoop.nic.in)\n"
            "- Interest rate: 7% basic (as of 2026-10-02, source: https://agricoop.nic.in)\n"
            "- Subsidy amount: ₹6,000 per year (as of 2026-10-02, source: https://pmkisan.gov.in)\n"
            "- Premium rate: 1.5% for Rabi (as of 2026-10-02, source: https://pmfby.gov.in)\n"
        )
        is_valid, errors = validate_record_volatile_figures("rec_valid_kcc", valid_text)
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)

    # 2. Rejection of Undated Volatile Figures with Record ID and Line Number
    def test_undated_interest_rate_rejected_with_line_number(self):
        invalid_text = (
            "# Scheme: Kisan Credit Card\n"
            "## Summary\n"
            "Official credit assistance for small farmers.\n"
            "## Benefits\n"
            "Interest rate: 7% per annum.\n"
            "## Notes\n"
            "Apply at local branch."
        )
        is_valid, errors = validate_record_volatile_figures("kcc_bad_interest", invalid_text)
        self.assertFalse(is_valid)
        self.assertEqual(len(errors), 1)
        err = errors[0]
        self.assertIn("kcc_bad_interest", err)
        self.assertIn("line 5", err)
        self.assertIn("Interest Rate", err)
        self.assertIn("7%", err)

    def test_undated_loan_limit_and_subsidy_rejected(self):
        invalid_text = (
            "# Scheme: Composite Scheme\n"
            "Line 2: Introduction\n"
            "Line 3: Loan limit: ₹5,00,000 without collateral\n"
            "Line 4: General terms\n"
            "Line 5: Subsidy amount: ₹50,000 directly deposited\n"
        )
        is_valid, errors = validate_record_volatile_figures("rec_multi_err", invalid_text)
        self.assertFalse(is_valid)
        self.assertEqual(len(errors), 2)
        self.assertIn("line 3", errors[0])
        self.assertIn("Loan Limit", errors[0])
        self.assertIn("line 5", errors[1])
        self.assertIn("Subsidy Amount", errors[1])

    # 3. Official Source Link Replacement
    def test_figure_replaced_with_link_passes_validation(self):
        text_with_links = (
            "# Scheme: State Credit Incentive\n"
            "## Benefits\n"
            "- Interest rate: Refer to current guidelines at [Official Portal](https://agricoop.nic.in)\n"
            "- Loan limit: Check active ceiling on [State Agriculture Dept](https://mpkrishi.mp.gov.in)\n"
        )
        is_valid, errors = validate_record_volatile_figures("rec_link_replaced", text_with_links)
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)

    # 4. format_volatile_line Helper
    def test_format_volatile_line(self):
        line1 = format_volatile_line(
            "Interest rate", "7% basic",
            as_of_date="2026-10-02",
            source_url="https://agricoop.nic.in"
        )
        self.assertEqual(line1, "Interest rate: 7% basic (as of 2026-10-02, source: https://agricoop.nic.in)")

        line2 = format_volatile_line(
            "Loan limit", "₹3,00,000",
            as_of_date=None,
            source_url="https://agricoop.nic.in"
        )
        self.assertIn("Refer to official source at [Official Portal](https://agricoop.nic.in)", line2)

    # 5. format_scheme_benefits in sync_engine
    def test_format_scheme_benefits_converts_kcc_text(self):
        raw_benefits = (
            "Short-term credit limit up to Rs. 3 Lakh at 7% basic interest rate, "
            "reduced to 4% effective interest upon prompt repayment. "
            "RuPay Debit card issued with Rs. 1 Lakh personal accident cover."
        )
        formatted = format_scheme_benefits(
            raw_benefits=raw_benefits,
            last_verified="2026-10-02",
            source_url="https://agricoop.nic.in/en/Major-Schemes"
        )
        self.assertIn("Loan limit: Credit limit up to 3 Lakh (₹3,00,000) (as of 2026-10-02, source: https://agricoop.nic.in/en/Major-Schemes)", formatted)
        self.assertIn("Interest rate: 7% basic, reduced to 4% effective upon prompt repayment (as of 2026-10-02, source: https://agricoop.nic.in/en/Major-Schemes)", formatted)
        self.assertIn("RuPay Debit Card accident cover: ₹1,00,000 (as of 2026-10-02, source: https://agricoop.nic.in/en/Major-Schemes)", formatted)

        # Validate that the formatted output passes validator cleanly
        is_valid, errors = validate_record_volatile_figures("scheme_kcc", formatted)
        self.assertTrue(is_valid)

    # 6. Two-Tier Chunking: Number, Date, and Source Stay on One Line & Never Split in (as of ...)
    def test_two_tier_chunking_preserves_bracketed_as_of_note(self):
        # Create a large markdown section (> 800 chars) that forces RecursiveCharacterTextSplitter
        header = "# Scheme: Large Multi-Tier Agricultural Loan\n## Benefits\n"
        filler_para = "This is detailed explanation of crop loan financing regulations for cultivators across all agro-climatic zones in the state. " * 6
        target_line = "- Interest rate: 7% basic, 4% effective upon prompt repayment (as of 2026-10-02, source: https://agricoop.nic.in/en/Major-Schemes)\n"
        after_para = "Additional repayment guidelines and banking Ombudsman grievance procedures apply to all borrowers. " * 6
        full_text = header + filler_para + "\n\n" + target_line + "\n\n" + after_para

        chunks = chunk_record_two_tier(
            record_id="scheme_large_01",
            text=full_text,
            metadata={"source": "test_portal"},
            chunk_size=400,
            chunk_overlap=50
        )

        self.assertGreater(len(chunks), 1)

        # Find the chunk containing the volatile figure
        found_chunks = [c for c in chunks if "Interest rate: 7%" in c["text"]]
        self.assertEqual(len(found_chunks), 1)
        target_chunk_text = found_chunks[0]["text"]

        # Ensure the entire bracketed "(as of ...)" note and its source stay in the exact same chunk
        self.assertIn("(as of 2026-10-02, source: https://agricoop.nic.in/en/Major-Schemes)", target_chunk_text)
        # Ensure it was never severed inside the note
        self.assertNotIn("(as of 2026-10-02,\n", target_chunk_text)
        self.assertNotIn("source: https://\n", target_chunk_text)

    # 7. Non-breaking space protection helpers
    def test_protect_and_unprotect_volatile_notes(self):
        line = "Interest rate: 7% (as of 2026-10-02, source: https://agricoop.nic.in)"
        protected = protect_volatile_notes(line)
        self.assertIn("\u00A0", protected)
        self.assertNotIn(" (as of", protected)
        unprotected = unprotect_volatile_notes(protected)
        self.assertEqual(line, unprotected)

    # 8. ingest_static.py file ingestion and validation
    def test_ingest_static_file_rejects_undated_records(self):
        records = [
            {
                "id": "rec_ok",
                "text": "# Valid Record\nInterest rate: 7% (as of 2026-10-02, source: https://agricoop.nic.in)"
            },
            {
                "id": "rec_bad",
                "text": "# Invalid Record\nLoan limit: Rs. 3 Lakh collateral free"
            }
        ]
        with open(self.sample_jsonl, "w", encoding="utf-8") as f:
            for r in records:
                f.write(json.dumps(r) + "\n")

        res = ingest_static_file(
            file_path=self.sample_jsonl,
            validate_only=True
        )

        self.assertEqual(res["total_scanned"], 2)
        self.assertEqual(res["valid_count"], 1)
        self.assertEqual(res["rejected_count"], 1)
        rejected = res["rejected_records"][0]
        self.assertEqual(rejected["record_id"], "rec_bad")
        self.assertIn("line 2", rejected["errors"][0])

    # 9. Gemini System Prompt in /chat Enforces Quoting Date with Figures
    def test_build_gemini_system_prompt_includes_volatile_rules(self):
        retrieval_res = {
            "records": [],
            "formatted_context": "",
            "citations": [],
            "has_pending_updates": False,
            "has_stale_records": False
        }
        prompt = build_gemini_system_prompt(retrieval_res, lang="en")
        self.assertIn("DATED VOLATILE NUMBERS", prompt)
        self.assertIn("quoted together with its 'as of' date", prompt)
        self.assertIn("older than 90 days", prompt)
        self.assertIn("confirm with the nearest Krishi Vigyan Kendra (KVK) or local bank branch", prompt)

    # 10. Gemini Generation Advises Confirmation for Figures Older than 90 Days
    def test_gemini_generation_advises_confirmation_for_aged_volatile_figures(self):
        old_verified_date = (datetime.now(timezone.utc) - timedelta(days=110)).isoformat()
        retrieval_res = {
            "records": [
                {
                    "record_id": "scheme_kcc_aged",
                    "data_type": "gov_schemes_loans",
                    "state": "Madhya Pradesh",
                    "district": "All",
                    "source_url": "https://agricoop.nic.in",
                    "last_verified": old_verified_date,
                    "content": "Interest rate: 7% basic (as of 2026-05-01, source: https://agricoop.nic.in)",
                    "best_score": 0.15,
                    "has_pending_change": False,
                    "is_stale": False
                }
            ],
            "formatted_context": f"=== RECORD 1: scheme_kcc_aged ===\nLast Verified: {old_verified_date}\nInterest rate: 7%",
            "citations": [
                {
                    "record_id": "scheme_kcc_aged",
                    "data_type": "gov_schemes_loans",
                    "source_url": "https://agricoop.nic.in",
                    "last_verified": old_verified_date
                }
            ],
            "has_pending_updates": False,
            "has_stale_records": False
        }

        output = generate_with_gemini(
            query="What is the KCC interest rate?",
            retrieval_result=retrieval_res,
            lang="en"
        )

        ans_text = output["answer"]
        self.assertIn("Financial Rate/Limit Notice", ans_text)
        self.assertIn("older than 90 days", ans_text)
        self.assertIn("nearest Krishi Vigyan Kendra (KVK) or local bank branch", ans_text)
        self.assertIn("https://agricoop.nic.in", ans_text)


if __name__ == "__main__":
    unittest.main()
