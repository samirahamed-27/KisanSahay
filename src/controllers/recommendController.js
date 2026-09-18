/**
 * Recommendation Controller
 * Core engine matching farmer profiles to the optimal agricultural schemes.
 */

const fs = require('fs');
const path = require('path');
const { getLocationContext } = require('../services/locationContext');
const { getSoilFertilityProfile } = require('../services/soilFertilityEngine');
const { rankSchemes } = require('../services/scoringEngine');
const logger = require('../utils/logger');

const SCHEMES_FILE = path.join(__dirname, '..', 'data', 'schemesDatabase.json');

// In-memory schemes cache
let schemesCache = null;

function getSchemesDatabase() {
  if (!schemesCache) {
    if (fs.existsSync(SCHEMES_FILE)) {
      schemesCache = JSON.parse(fs.readFileSync(SCHEMES_FILE, 'utf8'));
    } else {
      schemesCache = [];
    }
  }
  return schemesCache;
}

// Function to reload cache on updates
function reloadSchemesCache() {
  if (fs.existsSync(SCHEMES_FILE)) {
    schemesCache = JSON.parse(fs.readFileSync(SCHEMES_FILE, 'utf8'));
  }
}

async function getRecommendations(req, res, next) {
  try {
    const {
      state,
      district,
      village,
      pincode,
      latitude,
      longitude,
      landSizeAcres,
      landSizeHectares,
      cropType,
      landOwnership,
      annualIncome,
      existingLoans,
      existingMonthlyEmi,
      category,
      hasKcc,
      hasAadhaar,
      requestedLoanAmount
    } = req.body;

    // Convert hectares to acres if hectares passed (1 ha = 2.471 acres)
    let acres = Number(landSizeAcres);
    if ((!acres || isNaN(acres)) && landSizeHectares) {
      acres = Number((Number(landSizeHectares) * 2.471).toFixed(2));
    }
    if (!acres || isNaN(acres)) acres = 2.5;

    const farmerProfile = {
      state: state || '',
      district: district || '',
      village: village || '',
      pincode: pincode || '',
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      landSizeAcres: acres,
      cropType: cropType || 'Mixed Cultivation',
      landOwnership: (landOwnership || 'owner').toLowerCase(),
      annualIncome: Number(annualIncome) || 120000,
      existingLoans: Number(existingLoans) || 0,
      existingMonthlyEmi: existingMonthlyEmi !== undefined ? Number(existingMonthlyEmi) : undefined,
      category: (category || 'general').toLowerCase(),
      hasKcc: hasKcc !== undefined ? hasKcc : true,
      hasAadhaar: hasAadhaar !== undefined ? hasAadhaar : true,
      requestedLoanAmount: requestedLoanAmount ? Number(requestedLoanAmount) : null
    };

    // 1. Fetch Location Intelligence (Soil, Land Price, Crop Trends)
    const locationContext = getLocationContext({
      state: farmerProfile.state,
      district: farmerProfile.district,
      pincode: farmerProfile.pincode,
      latitude: farmerProfile.latitude,
      longitude: farmerProfile.longitude
    });

    // 2. Compute dynamic soil fertility profile (300 km resolution)
    const dynamicSoil = getSoilFertilityProfile({
      state: farmerProfile.state || locationContext.resolvedLocation.state,
      district: farmerProfile.district || locationContext.resolvedLocation.district,
      latitude: farmerProfile.latitude,
      longitude: farmerProfile.longitude
    });

    // 3. Evaluate and Rank Schemes
    const schemesDatabase = getSchemesDatabase();
    const rankingResult = rankSchemes(schemesDatabase, farmerProfile, locationContext);

    // Formatted location string
    const locParts = [];
    if (farmerProfile.village) locParts.push(farmerProfile.village);
    if (locationContext.resolvedLocation.district && locationContext.resolvedLocation.district !== 'District Average') {
      locParts.push(locationContext.resolvedLocation.district);
    }
    locParts.push(locationContext.resolvedLocation.state);
    if (farmerProfile.pincode && farmerProfile.pincode !== 'N/A') locParts.push(`PIN: ${farmerProfile.pincode}`);
    const farmerLocationStr = locParts.join(', ');

    // Response shape matching specification
    res.json({
      success: true,
      farmer_location: farmerLocationStr,
      farmer_context: {
        soil_type: dynamicSoil?.soilType || locationContext.soilProfile.soilType,
        soil_texture: dynamicSoil?.texture || locationContext.soilProfile.texture,
        soil_ph: dynamicSoil?.pH || locationContext.soilProfile.pH,
        soil_advisory: dynamicSoil?.soilHealthAdvisory || locationContext.soilProfile.soilHealthAdvisory,
        nitrogen_rating: dynamicSoil?.nitrogenKgHa?.rating,
        phosphorus_rating: dynamicSoil?.phosphorusKgHa?.rating,
        potassium_rating: dynamicSoil?.potassiumKgHa?.rating,
        organic_carbon: dynamicSoil?.organicCarbon?.rating,
        dynamic_zone_badge: dynamicSoil?.dynamicBadge,
        reference_station: dynamicSoil?.referenceStation,
        distance_from_station_km: dynamicSoil?.distanceFromStationKm,
        estimated_land_value_per_acre: locationContext.landValuation.marketValuePerAcre,
        circle_rate_per_acre: locationContext.landValuation.circleRatePerAcre,
        irrigation_coverage: `${locationContext.landValuation.irrigationPercentage}%`,
        nearby_crop_trends: locationContext.cropTrends
      },
      debt_safety_assessment: {
        monthly_farm_income: rankingResult.debt_capacity.monthlyFarmIncome,
        existing_monthly_emi: rankingResult.debt_capacity.existingMonthlyEmi,
        max_safe_borrowing_limit: rankingResult.debt_capacity.maxSafeBorrowingLimit,
        max_safe_monthly_emi: rankingResult.debt_capacity.maxSafeMonthlyEmi,
        remaining_safe_emi_capacity: rankingResult.debt_capacity.remainingSafeEmiCapacity,
        baseline_dti_ratio: `${rankingResult.debt_capacity.baselineDTI}%`,
        debt_status: rankingResult.debt_capacity.baselineRiskStatus,
        advisory: rankingResult.debt_capacity.baselineRiskStatus === 'HIGH_DEBT'
          ? '⚠️ High existing debt detected. Non-repayable grants and interest-subvention schemes prioritized to protect against debt distress.'
          : '✓ Debt capacity is within comfortable limits.'
      },
      meta: rankingResult.meta,
      recommendations: rankingResult.recommendations
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRecommendations,
  reloadSchemesCache
};
