/**
 * Context Controller
 * Exposes location intelligence (soil health, land price benchmarks, nearby crop trends).
 */

const { getLocationContext } = require('../services/locationContext');

function getLocationIntelligence(req, res, next) {
  try {
    const { state, district, pincode, latitude, longitude } = req.query;

    const context = getLocationContext({
      state,
      district,
      pincode,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    });

    res.json({
      success: true,
      data: context
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLocationIntelligence
};
