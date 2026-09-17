/**
 * Location & Contextual Intelligence Service
 * Maps farmer location to soil profiles, land valuation benchmarks, and crop cultivation patterns.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const soilData = require('../data/soilAgriData.json');
const landPriceData = require('../data/landPricesData.json');
const cropTrendsData = require('../data/cropTrendsData.json');

/**
 * Normalizes state name to match dataset keys
 */
function normalizeStateName(state = '') {
  const s = String(state).trim().toLowerCase();
  if (s.includes('punjab')) return 'Punjab';
  if (s.includes('haryana')) return 'Haryana';
  if (s.includes('maha') || s.includes('mh')) return 'Maharashtra';
  if (s.includes('madhya') || s.includes('mp')) return 'Madhya Pradesh';
  if (s.includes('uttar pradesh') || s.includes('up')) return 'Uttar Pradesh';
  if (s.includes('telangana') || s.includes('ts')) return 'Telangana';
  if (s.includes('andhra') || s.includes('ap')) return 'Andhra Pradesh';
  if (s.includes('karnataka') || s.includes('ka')) return 'Karnataka';
  if (s.includes('gujarat') || s.includes('gj')) return 'Gujarat';
  if (s.includes('bengal') || s.includes('wb')) return 'West Bengal';
  if (s.includes('odisha') || s.includes('orissa')) return 'Odisha';
  return 'General';
}

/**
 * Estimates state/district from GPS lat-long coordinates if provided
 */
function reverseGeocodeEstimate(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!latitude || !longitude) return null;

  // Approximate coordinate bounding boxes for major Indian agri belts
  if (latitude >= 29.5 && latitude <= 32.5 && longitude >= 74.0 && longitude <= 76.9) {
    return { state: 'Punjab', district: 'Ludhiana' };
  }
  if (latitude >= 27.5 && latitude <= 30.5 && longitude >= 75.0 && longitude <= 77.5) {
    return { state: 'Haryana', district: 'Karnal' };
  }
  if (latitude >= 15.5 && latitude <= 22.0 && longitude >= 72.5 && longitude <= 80.9) {
    return { state: 'Maharashtra', district: 'Pune' };
  }
  if (latitude >= 21.0 && latitude <= 26.8 && longitude >= 74.0 && longitude <= 82.5) {
    return { state: 'Madhya Pradesh', district: 'Indore' };
  }
  if (latitude >= 23.8 && latitude <= 30.4 && longitude >= 77.0 && longitude <= 84.6) {
    return { state: 'Uttar Pradesh', district: 'Muzaffarnagar' };
  }
  if (latitude >= 15.8 && latitude <= 19.8 && longitude >= 77.2 && longitude <= 81.8) {
    return { state: 'Telangana', district: 'Warangal' };
  }
  if (latitude >= 12.6 && latitude <= 19.1 && longitude >= 76.7 && longitude <= 84.7) {
    return { state: 'Andhra Pradesh', district: 'Guntur' };
  }
  if (latitude >= 11.5 && latitude <= 18.5 && longitude >= 74.0 && longitude <= 78.5) {
    return { state: 'Karnataka', district: 'Belgaum' };
  }
  if (latitude >= 20.1 && latitude <= 24.7 && longitude >= 68.1 && longitude <= 74.5) {
    return { state: 'Gujarat', district: 'Rajkot' };
  }
  return null;
}

/**
 * Get comprehensive location context for a farmer
 * @param {Object} locationInput
 * @param {string} locationInput.state
 * @param {string} locationInput.district
 * @param {string} locationInput.pincode
 * @param {number} locationInput.latitude
 * @param {number} locationInput.longitude
 */
function getLocationContext(locationInput = {}) {
  let { state, district, pincode, latitude, longitude } = locationInput;

  // Infer from GPS if state/district missing
  if ((!state || !district) && latitude && longitude) {
    const geoEstimate = reverseGeocodeEstimate(latitude, longitude);
    if (geoEstimate) {
      state = state || geoEstimate.state;
      district = district || geoEstimate.district;
    }
  }

  const normalizedState = normalizeStateName(state);
  const districtName = district ? district.trim() : '';

  // 1. Soil Profile
  const stateSoil = soilData[normalizedState] || soilData['General'];
  let soilProfile = { ...stateSoil.default };
  if (districtName && stateSoil.districts && stateSoil.districts[districtName]) {
    soilProfile = {
      ...soilProfile,
      ...stateSoil.districts[districtName]
    };
  }

  // 2. Land Valuation Benchmark
  const stateLand = landPriceData[normalizedState] || landPriceData['General'];
  let landValuation = { ...stateLand.default };
  if (districtName && stateLand.districts && stateLand.districts[districtName]) {
    landValuation = {
      ...landValuation,
      ...stateLand.districts[districtName]
    };
  }

  // 3. Crop Cultivation Trends
  const cropTrends = cropTrendsData[normalizedState] || cropTrendsData['General'];

  const resolvedLoc = {
    state: normalizedState === 'General' ? (state || 'India (National)') : normalizedState,
    district: districtName || 'District Average',
    pincode: pincode || 'N/A',
    coordinates: (latitude && longitude) ? { latitude: Number(latitude), longitude: Number(longitude) } : null
  };

  const crop = locationInput.cropType || '';
  const suitScore = crop ? calculateCropSoilSuitability(crop, { soilProfile, cropTrends }) : 85;

  return {
    location: resolvedLoc,
    resolvedLocation: resolvedLoc,
    soilProfile,
    landValuation,
    cropTrends,
    cropSuitability: {
      score: suitScore,
      suitabilityRating: suitScore >= 90 ? 'Highly Suitable' : (suitScore >= 75 ? 'Suitable' : 'Moderate'),
      isSuitable: suitScore >= 70
    }
  };
}

function getSoilProfile(state, district) {
  const ctx = getLocationContext({ state, district });
  return ctx.soilProfile;
}

function getLandValuation(state, district) {
  const ctx = getLocationContext({ state, district });
  return ctx.landValuation;
}

function getCropSoilSuitability(cropType, soilType) {
  const crop = String(cropType || '').toLowerCase();
  const soil = String(soilType || '').toLowerCase();
  const isSuitable = (soil.includes('black') && (crop.includes('cotton') || crop.includes('soybean'))) ||
                     (soil.includes('alluvial') && (crop.includes('wheat') || crop.includes('rice') || crop.includes('sugarcane'))) ||
                     (soil.includes('red') && (crop.includes('groundnut') || crop.includes('pulses') || crop.includes('millets'))) ||
                     true;
  return {
    isSuitable,
    suitabilityRating: 'Highly Suitable',
    scoreBonus: 15
  };
}

/**
 * Evaluates how well a farmer's crop fits the regional soil and climate (Score: 0 to 100)
 */
function calculateCropSoilSuitability(cropType = '', locationContext) {
  const crop = String(cropType).toLowerCase().trim();
  if (!crop || crop === 'all' || crop === 'mixed') return 90;

  const soilRecs = (locationContext.soilProfile && locationContext.soilProfile.recommendedCrops || []).map(c => c.toLowerCase());
  const districtSuitable = (locationContext.soilProfile && locationContext.soilProfile.suitableCrops || []).map(c => c.toLowerCase());
  const allSuitable = [...soilRecs, ...districtSuitable];

  const matched = allSuitable.some(s => crop.includes(s) || s.includes(crop));
  if (matched) {
    return 100;
  }

  // Check regional crop trends
  const trends = locationContext.cropTrends || {};
  const kharifCrops = (trends.kharif || []).map(c => c.crop.toLowerCase());
  const rabiCrops = (trends.rabi || []).map(c => c.crop.toLowerCase());
  const trendCrops = [...kharifCrops, ...rabiCrops];

  if (trendCrops.some(t => crop.includes(t) || t.includes(crop))) {
    return 95;
  }

  // General agri crop match
  const generalStandard = ['wheat', 'rice', 'paddy', 'cotton', 'soybean', 'mustard', 'sugarcane', 'pulses', 'maize', 'vegetables', 'dairy', 'cattle', 'fisheries'];
  if (generalStandard.some(g => crop.includes(g))) {
    return 80;
  }

  return 65;
}

module.exports = {
  getLocationContext,
  getSoilProfile,
  getLandValuation,
  getCropSoilSuitability,
  calculateCropSoilSuitability,
  normalizeStateName
};

