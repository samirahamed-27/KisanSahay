/**
 * Context Controller
 * Exposes location intelligence (soil health, land price benchmarks, nearby crop trends).
 */

const { getLocationContext } = require('../services/locationContext');
const { getSoilFertilityProfile } = require('../services/soilFertilityEngine');

function getLocationIntelligence(req, res, next) {
  try {
    const { state, district, pincode, latitude, longitude, cropType } = req.query;

    const context = getLocationContext({
      state,
      district,
      pincode,
      cropType,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    });

    const dynamicSoil = getSoilFertilityProfile({
      state: context.location?.state || state,
      district: context.location?.district || district,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    });

    res.json({
      success: true,
      data: {
        ...context,
        dynamicSoilFertility: dynamicSoil,
        soilProfile: dynamicSoil ? {
          ...context.soilProfile,
          soilType: dynamicSoil.soilType,
          texture: dynamicSoil.texture,
          pH: dynamicSoil.pH,
          acidityRating: dynamicSoil.acidityRating,
          organicCarbon: dynamicSoil.organicCarbon.rating,
          nitrogen: dynamicSoil.nitrogenKgHa.rating,
          phosphorus: dynamicSoil.phosphorusKgHa.rating,
          potassium: dynamicSoil.potassiumKgHa.rating,
          micronutrients: dynamicSoil.micronutrients,
          soilHealthAdvisory: dynamicSoil.soilHealthAdvisory,
          zoneBadge: dynamicSoil.dynamicBadge,
          distanceKm: dynamicSoil.distanceFromStationKm,
          referenceStation: dynamicSoil.referenceStation
        } : context.soilProfile
      }
    });
  } catch (err) {
    next(err);
  }
}

function getSoilFertility(req, res, next) {
  try {
    const { state, district, latitude, longitude } = req.query;
    const soil = getSoilFertilityProfile({
      state,
      district,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    });
    res.json({ success: true, data: soil });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLocationIntelligence,
  getSoilFertility
};

