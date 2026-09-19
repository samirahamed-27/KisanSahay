/**
 * Indian Agricultural Land Measurement & Price Unit Normalizer
 * Standardizes regional area units (Guntha, Bigha, Cent, Hectare, SqFt) to Acre
 * and parses Indian currency strings (Lakh, Crore, K, etc.)
 */

// Regional Bigha to Acre multipliers by state
const BIGHA_ACRE_FACTORS = {
  'uttar pradesh': 0.625,   // Pucca Bigha (1 Acre = 1.6 Bigha)
  'up': 0.625,
  'madhya pradesh': 0.5,    // Standard MP Bigha (1 Acre = 2 Bighas)
  'mp': 0.5,
  'bihar': 0.62,            // Bihar Bigha (1 Acre = 1.6129 Bighas)
  'punjab': 0.2,            // Kacha Bigha in parts of Punjab/Haryana (5 Bighas/Acre)
  'haryana': 0.2,
  'rajasthan': 0.625,       // Pucca Bigha
  'west bengal': 0.33,      // Standard Bengal Bigha (3 Bighas/Acre)
  'default': 0.625
};

/**
 * Normalizes state name to a standardized key
 */
function cleanStateKey(state = '') {
  return String(state).trim().toLowerCase();
}

/**
 * Returns how many acres 1 unit of a given measurement equals
 * @param {string} unit - Unit name ('guntha', 'bigha', 'cent', 'hectare', 'sqft', 'sqyard', 'acre')
 * @param {string} state - Optional state name for regional variations (e.g. bigha)
 * @returns {number} Fraction of an acre
 */
function getUnitAcreFactor(unit = 'acre', state = '') {
  const u = String(unit).trim().toLowerCase().replace(/[-_\s]/g, '');
  const sKey = cleanStateKey(state);

  if (u === 'acre' || u === 'acres') {
    return 1.0;
  }
  if (u === 'guntha' || u === 'gunthas' || u === 'gunte' || u === 'gunta') {
    // 1 Acre = 40 Gunthas (Maharashtra, Karnataka, Telangana standard)
    return 0.025;
  }
  if (u === 'bigha' || u === 'bighas' || u === 'beegah') {
    const factor = BIGHA_ACRE_FACTORS[sKey] || BIGHA_ACRE_FACTORS['default'];
    return factor;
  }
  if (u === 'biswa' || u === 'biswas') {
    // 1 Bigha = 20 Biswa
    const bighaFactor = BIGHA_ACRE_FACTORS[sKey] || BIGHA_ACRE_FACTORS['default'];
    return bighaFactor / 20.0;
  }
  if (u === 'cent' || u === 'cents') {
    // 1 Acre = 100 Cents (South India standard)
    return 0.01;
  }
  if (u === 'hectare' || u === 'hectares' || u === 'ha') {
    // 1 Hectare = 2.47105 Acres
    return 2.47105;
  }
  if (u === 'sqft' || u === 'squarefeet' || u === 'squarefoot' || u === 'sqfeet') {
    // 1 Acre = 43,560 sq ft
    return 1 / 43560;
  }
  if (u === 'sqyard' || u === 'sqyards' || u === 'squareyard' || u === 'gaj' || u === 'gaz') {
    // 1 Acre = 4,840 sq yards
    return 1 / 4840;
  }
  if (u === 'kanal' || u === 'kanals') {
    // 1 Acre = 8 Kanals (Punjab/Haryana/HP/J&K)
    return 0.125;
  }
  if (u === 'marla' || u === 'marlas') {
    // 1 Kanal = 20 Marlas, 1 Acre = 160 Marlas
    return 1 / 160;
  }
  return 1.0;
}

/**
 * Converts a rate quoted in any regional unit to Rate Per Acre
 * @param {number} rate - The price in rupees
 * @param {string} unit - The unit of area ('guntha', 'bigha', 'cent', etc.)
 * @param {string} state - Optional state name for state-specific unit sizes
 * @returns {number} Standardized rate per acre (rounded to 2 decimal places)
 */
function convertToRatePerAcre(rate, unit = 'acre', state = '') {
  const numRate = Number(rate);
  if (isNaN(numRate) || numRate <= 0) return 0;

  const acreFactor = getUnitAcreFactor(unit, state);
  // Rate per acre = Price per unit / acreFactor (since 1 unit = acreFactor acres)
  const ratePerAcre = numRate / acreFactor;
  return Math.round(ratePerAcre * 100) / 100;
}

/**
 * Parses Indian currency notation from text into absolute numeric rupees
 * Handles: "45 Lakh", "1.2 Cr", "1.5 Crore", "75,000", "50 K", "₹ 80 L"
 * @param {string|number} priceStr 
 * @returns {number|null} Parsed rupee amount
 */
function parseIndianCurrency(priceStr) {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return null;

  const clean = String(priceStr)
    .replace(/[₹,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Pattern: "1.25 cr" or "1.25 crore" or "1.25 crores"
  const crMatch = clean.match(/([\d.]+)\s*(?:cr|crore|crores)/);
  if (crMatch) {
    return Math.round(parseFloat(crMatch[1]) * 10000000);
  }

  // Pattern: "45 lakh" or "45 lakhs" or "45 l" or "45 lac"
  const lakhMatch = clean.match(/([\d.]+)\s*(?:lakh|lakhs|lac|lacs|\bl\b)/);
  if (lakhMatch) {
    return Math.round(parseFloat(lakhMatch[1]) * 100000);
  }

  // Pattern: "75 k" or "75 thousand"
  const kMatch = clean.match(/([\d.]+)\s*(?:k|thousand|thousands)/);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }


  // Plain numeric string
  const plainNumMatch = clean.match(/[\d.]+/);
  if (plainNumMatch) {
    const val = parseFloat(plainNumMatch[0]);
    return isNaN(val) ? null : val;
  }

  return null;
}

/**
 * Extracts rate and unit from listing text or title
 * Examples:
 *   "₹45 Lakh/Acre" -> { ratePerAcre: 4500000, rawUnit: 'acre', parsedAmount: 4500000 }
 *   "Rs 75,000 per Guntha" -> { ratePerAcre: 3000000, rawUnit: 'guntha', parsedAmount: 75000 }
 *   "12 Lakh per Bigha" in "UP" -> { ratePerAcre: 1920000, rawUnit: 'bigha', parsedAmount: 1200000 }
 * @param {string} text - Listing headline, snippet or price string
 * @param {string} state - State context
 * @returns {Object} { ratePerAcre, rawUnit, parsedAmount }
 */
function extractRateFromListingText(text = '', state = '') {
  if (!text) return { ratePerAcre: 0, rawUnit: 'acre', parsedAmount: 0 };

  const str = String(text).toLowerCase();

  // Detect Unit
  let rawUnit = 'acre';
  if (str.includes('guntha') || str.includes('gunta') || str.includes('gunte')) {
    rawUnit = 'guntha';
  } else if (str.includes('bigha') || str.includes('beegah')) {
    rawUnit = 'bigha';
  } else if (str.includes('cent')) {
    rawUnit = 'cent';
  } else if (str.includes('hectare') || str.includes('ha.')) {
    rawUnit = 'hectare';
  } else if (str.includes('sq.ft') || str.includes('sq ft') || str.includes('sqft')) {
    rawUnit = 'sqft';
  } else if (str.includes('sq.yd') || str.includes('sq yard') || str.includes('gaj')) {
    rawUnit = 'sqyard';
  } else if (str.includes('kanal')) {
    rawUnit = 'kanal';
  }

  const parsedAmount = parseIndianCurrency(text);
  if (!parsedAmount) {
    return { ratePerAcre: 0, rawUnit, parsedAmount: 0 };
  }

  const ratePerAcre = convertToRatePerAcre(parsedAmount, rawUnit, state);
  return { ratePerAcre, rawUnit, parsedAmount };
}

module.exports = {
  BIGHA_ACRE_FACTORS,
  getUnitAcreFactor,
  convertToRatePerAcre,
  parseIndianCurrency,
  extractRateFromListingText
};
