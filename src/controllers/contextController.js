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

const cropsData = require('../data/cropsData.json');

function getCrops(req, res, next) {
  try {
    const { category, season, search } = req.query;
    let list = cropsData;
    if (category) {
      list = list.filter(c => c.category && c.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (season) {
      list = list.filter(c => c.season && c.season.toLowerCase().includes(season.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => (c.name && c.name.toLowerCase().includes(q)) || (c.hindiName && c.hindiName.includes(q)));
    }
    res.json({
      success: true,
      total: list.length,
      data: list
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLocationIntelligence,
  getSoilFertility,
  getCrops
};

