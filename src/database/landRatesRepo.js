/**
 * Repository layer for `land_rates` data model.
 * Matches PostgreSQL schema:
 *   id SERIAL PRIMARY KEY,
 *   state VARCHAR(50),
 *   district VARCHAR(100),
 *   taluk VARCHAR(100),
 *   village_zone VARCHAR(150),
 *   rate_per_acre NUMERIC(12, 2),
 *   rate_type VARCHAR(30),        -- 'circle_rate' | 'market_rate_listing'
 *   source_url TEXT,
 *   source_name VARCHAR(100),     -- 'IGR Maharashtra' | '99acres' etc
 *   effective_date DATE,
 *   scraped_at TIMESTAMP DEFAULT NOW(),
 *   raw_json JSONB                -- preserve original scraped payload
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const PRIMARY_DATA_PATH = path.join(__dirname, '../../Data/Data/land_rates.json');
const MIRROR_DATA_PATH = path.join(__dirname, '../data/landRatesDatabase.json');

const VALID_RATE_TYPES = ['circle_rate', 'market_rate_listing'];

class LandRatesRepo {
  constructor() {
    this.records = [];
    this.nextId = 1;
    this.init();
  }

  init() {
    try {
      let loaded = false;
      if (fs.existsSync(PRIMARY_DATA_PATH)) {
        const raw = fs.readFileSync(PRIMARY_DATA_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.records = parsed;
          loaded = true;
        }
      }

      if (!loaded && fs.existsSync(MIRROR_DATA_PATH)) {
        const raw = fs.readFileSync(MIRROR_DATA_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.records = parsed;
          loaded = true;
        }
      }

      if (this.records.length > 0) {
        const maxId = this.records.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);
        this.nextId = maxId + 1;
      }
    } catch (err) {
      logger.error('Failed to initialize LandRatesRepo from disk', { error: err.message });
      this.records = [];
      this.nextId = 1;
    }
  }

  saveToDisk() {
    try {
      const dataStr = JSON.stringify(this.records, null, 2);

      // Ensure directory exists for primary
      const primaryDir = path.dirname(PRIMARY_DATA_PATH);
      if (!fs.existsSync(primaryDir)) fs.mkdirSync(primaryDir, { recursive: true });
      fs.writeFileSync(PRIMARY_DATA_PATH, dataStr, 'utf-8');

      // Ensure directory exists for mirror
      const mirrorDir = path.dirname(MIRROR_DATA_PATH);
      if (!fs.existsSync(mirrorDir)) fs.mkdirSync(mirrorDir, { recursive: true });
      fs.writeFileSync(MIRROR_DATA_PATH, dataStr, 'utf-8');

      return true;
    } catch (err) {
      logger.error('Failed to save land rates database to disk', { error: err.message });
      return false;
    }
  }

  /**
   * Insert a single land rate record
   * @param {Object} item 
   * @returns {Object} saved record
   */
  insertRecord(item) {
    if (!item.state || !item.district) {
      throw new Error('Land rate record requires state and district');
    }

    const rateType = String(item.rate_type || '').trim().toLowerCase();
    if (!VALID_RATE_TYPES.includes(rateType)) {
      throw new Error(`Invalid rate_type "${item.rate_type}". Must be one of: ${VALID_RATE_TYPES.join(', ')}`);
    }

    const ratePerAcre = parseFloat(Number(item.rate_per_acre || 0).toFixed(2));
    if (isNaN(ratePerAcre) || ratePerAcre <= 0) {
      throw new Error('Valid rate_per_acre is required');
    }

    const record = {
      id: this.nextId++,
      state: String(item.state).trim(),
      district: String(item.district).trim(),
      taluk: item.taluk ? String(item.taluk).trim() : null,
      village_zone: item.village_zone ? String(item.village_zone).trim() : null,
      rate_per_acre: ratePerAcre,
      rate_type: rateType,
      source_url: item.source_url ? String(item.source_url).trim() : null,
      source_name: String(item.source_name || (rateType === 'circle_rate' ? 'Government Portal' : 'Market Portal')).trim(),
      effective_date: item.effective_date || (rateType === 'circle_rate' ? `${new Date().getFullYear()}-04-01` : null),
      scraped_at: item.scraped_at || new Date().toISOString(),
      raw_json: item.raw_json ? (typeof item.raw_json === 'object' ? item.raw_json : JSON.parse(item.raw_json)) : {}
    };

    this.records.push(record);
    return record;
  }

  /**
   * Bulk insert with deduplication
   * Deduplication key: state + district + taluk + village_zone + rate_type + source_name + (effective_date || '')
   */
  insertBatch(items = []) {
    let inserted = 0;
    const existingKeys = new Set(
      this.records.map(r => 
        `${(r.state||'').toLowerCase()}|${(r.district||'').toLowerCase()}|${(r.taluk||'').toLowerCase()}|${(r.village_zone||'').toLowerCase()}|${r.rate_type}|${(r.source_name||'').toLowerCase()}|${r.effective_date||''}`
      )
    );

    for (const item of items) {
      try {
        const s = (item.state || '').toLowerCase();
        const d = (item.district || '').toLowerCase();
        const t = (item.taluk || '').toLowerCase();
        const v = (item.village_zone || '').toLowerCase();
        const rt = (item.rate_type || '').toLowerCase();
        const sn = (item.source_name || '').toLowerCase();
        const ed = item.effective_date || '';
        const key = `${s}|${d}|${t}|${v}|${rt}|${sn}|${ed}`;

        if (!existingKeys.has(key)) {
          this.insertRecord(item);
          existingKeys.add(key);
          inserted++;
        }
      } catch (err) {
        logger.warn('Skipping invalid land rate record in batch', { error: err.message, item });
      }
    }

    if (inserted > 0) {
      this.saveToDisk();
    }
    return inserted;
  }

  /**
   * Query records matching search criteria
   */
  findRates(query = {}) {
    let list = [...this.records];

    if (query.state) {
      const s = String(query.state).toLowerCase().trim();
      list = list.filter(r => (r.state || '').toLowerCase().includes(s));
    }

    if (query.district) {
      const d = String(query.district).toLowerCase().trim();
      list = list.filter(r => (r.district || '').toLowerCase().includes(d));
    }

    if (query.taluk) {
      const t = String(query.taluk).toLowerCase().trim();
      list = list.filter(r => (r.taluk || '').toLowerCase().includes(t));
    }

    if (query.village_zone) {
      const vz = String(query.village_zone).toLowerCase().trim();
      list = list.filter(r => (r.village_zone || '').toLowerCase().includes(vz));
    }

    if (query.rate_type) {
      const rt = String(query.rate_type).toLowerCase().trim();
      list = list.filter(r => r.rate_type === rt);
    }

    if (query.source_name) {
      const sn = String(query.source_name).toLowerCase().trim();
      list = list.filter(r => (r.source_name || '').toLowerCase().includes(sn));
    }

    // Sort order: default by id DESC or rate_per_acre
    if (query.sort === 'rate_asc') {
      list.sort((a, b) => a.rate_per_acre - b.rate_per_acre);
    } else if (query.sort === 'rate_desc') {
      list.sort((a, b) => b.rate_per_acre - a.rate_per_acre);
    } else {
      list.sort((a, b) => b.id - a.id);
    }

    const total = list.length;
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 500);
    const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
    const paginated = list.slice(offset, offset + limit);

    return {
      total,
      limit,
      offset,
      records: paginated
    };
  }

  /**
   * Computes Side-by-Side Comparison between Government Circle Rate and Market Asking Rate
   * for a given state/district/taluk
   */
  getComparisonStats({ state, district, taluk } = {}) {
    if (!state) {
      throw new Error('State is required for land rate comparison');
    }

    const s = String(state).toLowerCase().trim();
    const d = district ? String(district).toLowerCase().trim() : null;
    const t = taluk ? String(taluk).toLowerCase().trim() : null;

    let matched = this.records.filter(r => (r.state || '').toLowerCase().includes(s));
    if (d) {
      const distMatches = matched.filter(r => (r.district || '').toLowerCase().includes(d));
      if (distMatches.length > 0) matched = distMatches;
    }
    if (t) {
      const talukMatches = matched.filter(r => (r.taluk || '').toLowerCase().includes(t));
      if (talukMatches.length > 0) matched = talukMatches;
    }

    const circleRecords = matched.filter(r => r.rate_type === 'circle_rate');
    const marketRecords = matched.filter(r => r.rate_type === 'market_rate_listing');

    const calcStats = (recs) => {
      if (!recs.length) return null;
      const values = recs.map(r => r.rate_per_acre).sort((a, b) => a - b);
      const sum = values.reduce((acc, v) => acc + v, 0);
      const avg = Math.round(sum / values.length);
      const min = values[0];
      const max = values[values.length - 1];
      const mid = Math.floor(values.length / 2);
      const median = values.length % 2 === 0 ? Math.round((values[mid - 1] + values[mid]) / 2) : values[mid];
      const sources = [...new Set(recs.map(r => r.source_name))];
      const latestEffectiveDate = recs.map(r => r.effective_date).filter(Boolean).sort().reverse()[0] || null;

      return {
        count: recs.length,
        avgRatePerAcre: avg,
        medianRatePerAcre: median,
        minRatePerAcre: min,
        maxRatePerAcre: max,
        sources,
        latestEffectiveDate
      };
    };

    const circleStats = calcStats(circleRecords);
    const marketStats = calcStats(marketRecords);

    let premiumPercent = null;
    let spreadPerAcre = null;
    if (circleStats && marketStats && circleStats.avgRatePerAcre > 0) {
      spreadPerAcre = marketStats.avgRatePerAcre - circleStats.avgRatePerAcre;
      premiumPercent = parseFloat(((spreadPerAcre / circleStats.avgRatePerAcre) * 100).toFixed(1));
    }

    return {
      query: { state, district: district || 'All Districts', taluk: taluk || 'All Taluks' },
      circleRate: circleStats ? {
        label: 'Circle Rate (Authoritative Government Ready Reckoner / Guidance Value)',
        ...circleStats
      } : null,
      marketRate: marketStats ? {
        label: 'Market Rate (Listing - Supplementary Seller Asking Price)',
        ...marketStats
      } : null,
      comparison: {
        premiumPercent,
        spreadPerAcre,
        spreadDescription: premiumPercent !== null 
          ? `Market asking rates are ${premiumPercent > 0 ? '+' : ''}${premiumPercent}% ${premiumPercent >= 0 ? 'above' : 'below'} government circle rate.`
          : 'Insufficient data for complete spread comparison.',
        stampDutyGuidance: circleStats 
          ? `Minimum stamp duty registration valuation is ₹${circleStats.avgRatePerAcre.toLocaleString('en-IN')}/acre (Effective: ${circleStats.latestEffectiveDate || 'April 1 Fiscal Year'}).`
          : 'Official circle rate valuation data pending.',
        lendingPrudenceNote: 'Banks and NBFCs typically evaluate agricultural loan collateral (LTV) at 70% of the circle rate or discounted market listing rate.'
      }
    };
  }

  /**
   * Overview statistics across states
   */
  getStatsOverview() {
    const statesMap = {};

    for (const r of this.records) {
      const s = r.state;
      if (!statesMap[s]) {
        statesMap[s] = {
          state: s,
          totalRecords: 0,
          circleRateCount: 0,
          marketRateCount: 0,
          circleSum: 0,
          marketSum: 0,
          districts: new Set()
        };
      }
      statesMap[s].totalRecords++;
      if (r.district) statesMap[s].districts.add(r.district);

      if (r.rate_type === 'circle_rate') {
        statesMap[s].circleRateCount++;
        statesMap[s].circleSum += r.rate_per_acre;
      } else if (r.rate_type === 'market_rate_listing') {
        statesMap[s].marketRateCount++;
        statesMap[s].marketSum += r.rate_per_acre;
      }
    }

    const stateSummaries = Object.values(statesMap).map(st => {
      const avgCircle = st.circleRateCount > 0 ? Math.round(st.circleSum / st.circleRateCount) : null;
      const avgMarket = st.marketRateCount > 0 ? Math.round(st.marketSum / st.marketRateCount) : null;
      const premium = (avgCircle && avgMarket) 
        ? parseFloat((((avgMarket - avgCircle) / avgCircle) * 100).toFixed(1))
        : null;

      return {
        state: st.state,
        totalRecords: st.totalRecords,
        districtsCovered: st.districts.size,
        circleRateCount: st.circleRateCount,
        marketRateCount: st.marketRateCount,
        avgCircleRatePerAcre: avgCircle,
        avgMarketRatePerAcre: avgMarket,
        marketPremiumPercent: premium
      };
    });

    return {
      totalRecords: this.records.length,
      statesCovered: stateSummaries.length,
      circleRatesTotal: this.records.filter(r => r.rate_type === 'circle_rate').length,
      marketRatesTotal: this.records.filter(r => r.rate_type === 'market_rate_listing').length,
      stateSummaries
    };
  }

  count() {
    return this.records.length;
  }
}

// Export singleton instance
const landRatesRepo = new LandRatesRepo();
module.exports = landRatesRepo;
