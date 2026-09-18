-- ==============================================================================
-- Migration: 001_create_land_rates.sql
-- Description: Unified storage for Government Circle Rates and Market Asking Rates
-- ==============================================================================

-- 1. Table Creation
CREATE TABLE IF NOT EXISTS land_rates (
  id SERIAL PRIMARY KEY,
  state VARCHAR(50) NOT NULL,
  district VARCHAR(100) NOT NULL,
  taluk VARCHAR(100),
  village_zone VARCHAR(150),
  rate_per_acre NUMERIC(12, 2) NOT NULL,
  rate_type VARCHAR(30) NOT NULL CHECK (rate_type IN ('circle_rate', 'market_rate_listing')),
  source_url TEXT,
  source_name VARCHAR(100) NOT NULL,
  effective_date DATE,
  scraped_at TIMESTAMP DEFAULT NOW(),
  raw_json JSONB
);

-- 2. Indexes for Fast Regional and Comparison Lookups
CREATE INDEX IF NOT EXISTS idx_land_rates_location 
  ON land_rates (state, district, taluk);

CREATE INDEX IF NOT EXISTS idx_land_rates_type_date 
  ON land_rates (rate_type, effective_date);

CREATE INDEX IF NOT EXISTS idx_land_rates_village 
  ON land_rates (village_zone);

-- 3. GIN index for JSONB payload queries (e.g. querying raw metadata or listing attributes)
CREATE INDEX IF NOT EXISTS idx_land_rates_raw_json 
  ON land_rates USING gin (raw_json);

-- 4. Documentation Comments
COMMENT ON TABLE land_rates IS 'Unified agricultural land valuation rates across Indian states, distinguishing authoritative government circle rates from supplementary market listings.';
COMMENT ON COLUMN land_rates.rate_type IS 'circle_rate: Authoritative stamp duty ready reckoner / guidance value; market_rate_listing: Supplementary asking price from real estate portals (99acres, MagicBricks).';
COMMENT ON COLUMN land_rates.effective_date IS 'Official gazetted effective date (typically April 1 of fiscal year for circle rates).';
COMMENT ON COLUMN land_rates.raw_json IS 'Preserved original scraper payload including local measurement units and source metadata.';
