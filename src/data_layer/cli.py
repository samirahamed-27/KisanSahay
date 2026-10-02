"""
KisanSahay Data Layer CLI Utility
=================================
Command line tool to inspect sources.yaml, initialize SQLite database,
flag stale records, run demo syncs, and export records for RAG ingestion.

Usage:
    python -m src.data_layer.cli validate-sources
    python -m src.data_layer.cli init-db
    python -m src.data_layer.cli demo-seed --state "Madhya Pradesh"
    python -m src.data_layer.cli flag-stale
    python -m src.data_layer.cli status
    python -m src.data_layer.cli export-rag --output src/data/fresh_agri_records.jsonl
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone, timedelta

from .data_layer import KisanDataLayer, SourceRegistry, to_iso_utc, get_utc_now
from .models import (
    KVKDirectoryRecord,
    KVKCalendarRecord,
    CropAdvisoryRecord,
    GovSchemeLoanRecord,
    MandiPriceRecord,
    IMDAgrometRecord,
)


def cmd_validate_sources(args: argparse.Namespace) -> None:
    print("\n🔍 Validating sources.yaml registry...")
    target_state = getattr(args, "state", "Madhya Pradesh")
    registry = SourceRegistry(target_state=target_state)

    print(f" • Registry Name : {registry.metadata.get('registry_name')}")
    print(f" • Target State  : {registry.target_state}")
    print(f" • Sources Found : {len(registry.sources)}\n")

    print(f"{'Source ID':<30} | {'Type':<22} | {'Risk':<6} | {'Fetch':<6} | {'Refresh':<7} | {'Parser'}")
    print("-" * 105)
    for s in registry.sources:
        print(f"{s['id']:<30} | {s['data_type']:<22} | {s['risk_level']:<6} | {s['fetch_method']:<6} | {s['refresh_interval']:<7} | {s['parser_name']}")

    print("\n⏱️ Time-To-Live (TTL) Policies:")
    for dtype, ttl in registry.ttl_policies.items():
        stale_act = registry.get_stale_action(dtype)
        print(f" • {dtype:<22} : {ttl.days} days ({ttl.total_seconds()/3600:.0f} hrs) -> Action: {stale_act}")
    print("\n✅ sources.yaml is valid!\n")


def cmd_init_db(args: argparse.Namespace) -> None:
    print("\n📦 Initializing KisanSahay SQLite Data Layer...")
    db_path = getattr(args, "db", None)
    dl = KisanDataLayer(db_path=db_path)
    print(f"✅ Schema successfully initialized at: {dl.db_path}\n")


def cmd_demo_seed(args: argparse.Namespace) -> None:
    state = getattr(args, "state", "Madhya Pradesh")
    print(f"\n🌱 Seeding realistic test records for state '{state}' across all 6 core data types...")

    registry = SourceRegistry(target_state=state)
    dl = KisanDataLayer(registry=registry)

    # 1. KVK Directory Record
    kvk_rec = KVKDirectoryRecord(
        name="ICAR - Krishi Vigyan Kendra, Sehore",
        district="Sehore",
        address="Near RAK College of Agriculture, Sehore, Madhya Pradesh - 466001",
        phone="07562-222456",
        website="https://kvksehore.icar.gov.in",
        soil_testing_facility=True,
        host_organization="RVSKVV Gwalior",
        email="kvksehore@rediffmail.com"
    )
    r1 = dl.upsert_record(
        record_id=f"kvk_{state.lower().replace(' ', '_')}_sehore",
        data_type="kvk_directory",
        state=state,
        district="Sehore",
        content=kvk_rec.to_dict(),
        source_id=f"src_kvk_directory_{state}",
        source_url="https://kvk.icar.gov.in/directory/mp"
    )
    print(f" • [kvk_directory] {r1['action']} -> id: {r1['id']} (v{r1['version']})")

    # 2. KVK Training Calendar
    cal_rec = KVKCalendarRecord(
        kvk_name="ICAR - KVK Sehore",
        district="Sehore",
        training_topic="Precision Drip Irrigation and Fertigation for Soybean & Pulses",
        start_date="2026-10-15",
        end_date="2026-10-18",
        target_audience="Small and Marginal Farmers, Rural Youth",
        venue="Demonstration Plot 3, KVK Campus, Sehore",
        fees="Free of Cost (Govt Sponsored under ATMA)",
        coordinator_contact="Dr. S. K. Sharma (SMS Agronomy) - +91-9425012345"
    )
    r2 = dl.upsert_record(
        record_id=f"cal_{state.lower().replace(' ', '_')}_sehore_drip_2026",
        data_type="kvk_training_calendar",
        state=state,
        district="Sehore",
        content=cal_rec.to_dict(),
        source_id=f"src_kvk_calendar_{state}",
        source_url="https://kvk.icar.gov.in/training_schedule.aspx?state=MP"
    )
    print(f" • [kvk_training_calendar] {r2['action']} -> id: {r2['id']} (v{r2['version']})")

    # 3. Seasonal Crop Advisories
    crop_rec = CropAdvisoryRecord(
        crop_name="Soybean / Chickpea (Gram)",
        season="Kharif-Rabi Transition",
        growth_stage="Pod Maturity (Soybean) / Pre-sowing Seed Treatment (Gram)",
        advisory_text="Harvest soybean when 90% of pods turn golden brown to prevent pod shattering. For incoming Rabi Chickpea, treat seeds with Trichoderma viride @ 5g/kg seed followed by Rhizobium culture to prevent wilt.",
        pest_disease_alerts=["Spodoptera litura (Tobacco Caterpillar) in late maturity soybean", "Dry root rot in chickpea"],
        irrigation_guidance="Give pre-sowing light irrigation (Palewa) for seed bed preparation for Rabi chickpea and mustard.",
        fertilizer_guidance="Apply basal dose of DAP @ 40 kg/acre + Sulphur 10 kg/acre at chickpea sowing time."
    )
    r3 = dl.upsert_record(
        record_id=f"crop_{state.lower().replace(' ', '_')}_soybean_gram_oct26",
        data_type="crop_advisory",
        state=state,
        district="Sehore",
        content=crop_rec.to_dict(),
        source_id=f"src_crop_advisories_{state}",
        source_url="https://farmer.gov.in/CropAdvisories.aspx?state=MP"
    )
    print(f" • [crop_advisory] {r3['action']} -> id: {r3['id']} (v{r3['version']})")

    # 4. Government Schemes & Loans (HIGH RISK)
    scheme_rec = GovSchemeLoanRecord(
        scheme_name="Kisan Credit Card (KCC) Crop Loan with Interest Subvention",
        scheme_type="Subsidized Credit",
        eligibility=[
            "All farmers - individuals/joint borrowers who are owner cultivators",
            "Tenant farmers, oral lessees & share croppers",
            "SHGs or Joint Liability Groups of farmers"
        ],
        documents=[
            "Duly completed KCC Application Form",
            "Identity Proof: Aadhaar Card / Voter ID",
            "Land ownership papers: Latest Khasra and Khatauni certified copy",
            "No Dues Certificate or affidavit of existing loans from local banks"
        ],
        benefits="Short-term credit limit up to Rs. 3 Lakh at 7% basic interest rate, reduced to 4% effective interest upon prompt repayment (3% Prompt Repayment Incentive by Central Govt). RuPay Debit card issued with Rs. 1 Lakh personal accident cover.",
        how_to_apply="Submit one-page simplified KCC form at nearest Commercial Bank, RRB, or District Central Cooperative Bank (DCCB) branch, or apply online through Jan Samarth portal.",
        deadlines="Open year-round; credit limit validity is 5 years with annual renewal.",
        helpline="KCC Toll Free Helpline: 1800-11-5526 / Kisan Call Centre: 1800-180-1551"
    )
    r4 = dl.upsert_record(
        record_id="scheme_kcc_crop_loan_2026",
        data_type="gov_schemes_loans",
        state=state,
        district="all",
        content=scheme_rec.to_dict(),
        source_id=f"src_gov_schemes_loans_{state}",
        source_url="https://agricoop.nic.in/en/Major-Schemes",
        status="live"  # Pre-verified official baseline
    )
    print(f" • [gov_schemes_loans] {r4['action']} -> id: {r4['id']} (v{r4['version']}) [Risk: HIGH, Status: {r4['status']}]")

    # 5. Mandi Prices
    mandi_rec = MandiPriceRecord(
        market_center="Sehore Mandi (APMC)",
        district="Sehore",
        commodity="Soybean",
        variety="Yellow (JS 9560)",
        arrival_date="2026-10-02",
        min_price=4450.0,
        max_price=4980.0,
        modal_price=4750.0,
        arrivals_tonnes=185.5
    )
    r5 = dl.upsert_record(
        record_id=f"mandi_{state.lower().replace(' ', '_')}_sehore_soybean_20261002",
        data_type="mandi_prices",
        state=state,
        district="Sehore",
        content=mandi_rec.to_dict(),
        source_id=f"src_mandi_prices_{state}",
        source_url="https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
    )
    print(f" • [mandi_prices] {r5['action']} -> id: {r5['id']} (v{r5['version']})")

    # 6. IMD Agromet Weather Advisories
    imd_rec = IMDAgrometRecord(
        district="Sehore",
        bulletin_date="2026-10-02",
        valid_until="2026-10-05",
        forecast_summary="Clear to partly cloudy skies expected. Low probability of scattered light rain. Moderate morning relative humidity.",
        rainfall_forecast_mm=2.5,
        temp_max_c=32.0,
        temp_min_c=21.5,
        agricultural_advisory="Weather is highly favorable for harvesting mature Kharif crops and sun-drying produce. Maintain grain moisture below 12% before storage.",
        spray_conditions="Favorable for spray operations during morning hours (08:00 AM to 11:00 AM); avoid spraying during hot midday hours."
    )
    r6 = dl.upsert_record(
        record_id=f"imd_agromet_{state.lower().replace(' ', '_')}_sehore_20261002",
        data_type="imd_weather_advisory",
        state=state,
        district="Sehore",
        content=imd_rec.to_dict(),
        source_id=f"src_imd_agromet_{state}",
        source_url="https://imdagrimet.gov.in/bulletin"
    )
    print(f" • [imd_weather_advisory] {r6['action']} -> id: {r6['id']} (v{r6['version']})")

    # Also log a successful sync entry in sync_log
    log_id = dl.start_sync_log(f"src_mandi_prices_{state}")
    dl.finish_sync_log(log_id, result="success", records_added=1, records_updated=0, records_retired=0)
    print(f"\n✅ Seed completed! Created sync audit log #{log_id} in sync_log.\n")


def cmd_flag_stale(args: argparse.Namespace) -> None:
    print("\n⏰ Evaluating record freshness against TTL policies...")
    dl = KisanDataLayer()
    report = dl.flag_stale_records()

    print(f" • Evaluation Time          : {report['check_timestamp']}")
    print(f" • Newly Flagged Stale       : {report['newly_flagged']}")
    print(f" • High-Risk Moved to Review : {report['high_risk_moved_to_review']}")
    print(f" • Total Stale Records       : {report['total_stale_active']} / {report['total_records']}\n")

    print(f"{'Data Type':<25} | {'Total':<6} | {'Fresh (Live)':<13} | {'Stale':<6} | {'Pending Review'}")
    print("-" * 75)
    for row in report["type_breakdown"]:
        print(f"{row['type']:<25} | {row['total']:<6} | {row.get('live_fresh_count', 0):<13} | {row.get('stale_count', 0):<6} | {row.get('pending_review_count', 0)}")
    print("\n")


def cmd_status(args: argparse.Namespace) -> None:
    print("\n📊 KisanSahay Data Layer Status Report:")
    dl = KisanDataLayer()

    with dl.get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as cnt FROM records")
        total_rec = cur.fetchone()["cnt"]

        cur.execute("SELECT status, COUNT(*) as cnt FROM records GROUP BY status")
        status_counts = {r["status"]: r["cnt"] for r in cur.fetchall()}

        cur.execute("SELECT COUNT(*) as cnt FROM records WHERE is_stale = 1")
        stale_rec = cur.fetchone()["cnt"]

        cur.execute("SELECT * FROM sync_log ORDER BY id DESC LIMIT 5")
        recent_syncs = [dict(r) for r in cur.fetchall()]

    print(f" • Database File       : {dl.db_path}")
    print(f" • Total Records       : {total_rec}")
    print(f" • Live Records        : {status_counts.get('live', 0)}")
    print(f" • Pending Review      : {status_counts.get('pending_review', 0)}")
    print(f" • Retired Records     : {status_counts.get('retired', 0)}")
    print(f" • Stale Flagged       : {stale_rec}\n")

    if recent_syncs:
        print("🕒 Recent Sync Log History:")
        print(f"{'ID':<4} | {'Source ID':<30} | {'Started At':<20} | {'Result':<8} | {'Added':<5} | {'Updated':<7} | {'Duration'}")
        print("-" * 95)
        for s in recent_syncs:
            print(f"{s['id']:<4} | {s['source_id']:<30} | {s['started_at'][:19]:<20} | {s['result']:<8} | {s['records_added']:<5} | {s['records_updated']:<7} | {s['execution_seconds']:.2f}s")
    print("\n")


def cmd_export_rag(args: argparse.Namespace) -> None:
    out_path = Path(getattr(args, "output", "src/data/fresh_agri_records.jsonl"))
    print(f"\n📤 Exporting live, fresh records for ChromaDB RAG ingest -> {out_path}...")
    dl = KisanDataLayer()
    docs = dl.export_for_rag(out_path)
    print(f"✅ Successfully exported {len(docs)} documents for RAG indexing!\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="KisanSahay Automated Data Layer CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # validate-sources
    sub_val = subparsers.add_parser("validate-sources", help="Validate sources.yaml registry")
    sub_val.add_argument("--state", default="Madhya Pradesh", help="Target Indian State")
    sub_val.set_defaults(func=cmd_validate_sources)

    # init-db
    sub_init = subparsers.add_parser("init-db", help="Initialize SQLite tables")
    sub_init.add_argument("--db", default=None, help="Database path override")
    sub_init.set_defaults(func=cmd_init_db)

    # demo-seed
    sub_seed = subparsers.add_parser("demo-seed", help="Seed sample records across all 6 data types")
    sub_seed.add_argument("--state", default="Madhya Pradesh", help="Target Indian State")
    sub_seed.set_defaults(func=cmd_demo_seed)

    # flag-stale
    sub_stale = subparsers.add_parser("flag-stale", help="Evaluate and flag stale records")
    sub_stale.set_defaults(func=cmd_flag_stale)

    # status
    sub_stat = subparsers.add_parser("status", help="Print database and sync status")
    sub_stat.set_defaults(func=cmd_status)

    # export-rag
    sub_rag = subparsers.add_parser("export-rag", help="Export fresh records for RAG vector ingestion")
    sub_rag.add_argument("--output", default="src/data/fresh_agri_records.jsonl", help="Output JSONL path")
    sub_rag.set_defaults(func=cmd_export_rag)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
