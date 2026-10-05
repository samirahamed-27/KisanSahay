/**
 * Input Validation Middleware for Farmer Profiles
 */

function validateRecommendationInput(req, res, next) {
  const body = req.body || {};
  const errors = [];

  // 1. Land size
  if (body.landSizeAcres !== undefined && body.landSizeAcres !== null && body.landSizeAcres !== '') {
    const acres = Number(body.landSizeAcres);
    if (isNaN(acres) || acres < 0) {
      errors.push('landSizeAcres must be a non-negative number');
    }
  }

  // 2. Annual income
  if (body.annualIncome !== undefined && body.annualIncome !== null && body.annualIncome !== '') {
    const income = Number(body.annualIncome);
    if (isNaN(income) || income < 0) {
      errors.push('annualIncome must be a valid positive number');
    }
  }

  // 3. Category
  if (body.category) {
    const validCategories = ['general', 'sc', 'st', 'obc', 'women'];
    if (!validCategories.includes(String(body.category).toLowerCase().trim())) {
      errors.push(`category must be one of: ${validCategories.join(', ')}`);
    }
  }

  // 4. Land ownership
  if (body.landOwnership) {
    let ownership = String(body.landOwnership).toLowerCase().trim();
    if (ownership === 'owned') ownership = 'owner';
    body.landOwnership = ownership;

    const validOwnerships = ['owner', 'tenant', 'sharecropper', 'leaseholder', 'landless', 'fpo'];
    if (!validOwnerships.includes(ownership)) {
      errors.push(`landOwnership must be one of: ${validOwnerships.join(', ')} (or 'owned')`);
    }
  }

  // 5. GPS Coordinates if provided
  if (body.latitude !== undefined && body.latitude !== null && body.latitude !== '') {
    const lat = Number(body.latitude);
    if (isNaN(lat) || lat < 6.0 || lat > 38.0) {
      errors.push('latitude must be a valid coordinate within India (6°N to 38°N)');
    }
  }

  if (body.longitude !== undefined && body.longitude !== null && body.longitude !== '') {
    const lon = Number(body.longitude);
    if (isNaN(lon) || lon < 68.0 || lon > 98.0) {
      errors.push('longitude must be a valid coordinate within India (68°E to 98°E)');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input parameters',
      errors
    });
  }

  next();
}

module.exports = {
  validateRecommendationInput
};
