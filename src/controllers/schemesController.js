/**
 * Schemes Catalog Controller
 * RESTful management and querying of all agricultural schemes.
 */

const fs = require('fs');
const path = require('path');

const SCHEMES_FILE = path.join(__dirname, '..', 'data', 'schemesDatabase.json');

function readSchemes() {
  if (fs.existsSync(SCHEMES_FILE)) {
    return JSON.parse(fs.readFileSync(SCHEMES_FILE, 'utf8'));
  }
  return [];
}

/**
 * GET /api/schemes
 * Query parameters: category, subCategory, provider, state, crop, maxInterestRate, search
 */
function getAllSchemes(req, res, next) {
  try {
    const { category, subCategory, provider, state, crop, maxRate, search, limit, offset } = req.query;
    let schemes = readSchemes();

    if (category) {
      const cat = category.toLowerCase().trim();
      schemes = schemes.filter(s => s.category.toLowerCase().includes(cat));
    }

    if (subCategory) {
      const sub = subCategory.toLowerCase().trim();
      schemes = schemes.filter(s => s.subCategory.toLowerCase().includes(sub));
    }

    if (provider) {
      const prov = provider.toLowerCase().trim();
      schemes = schemes.filter(s => s.provider.toLowerCase().includes(prov));
    }

    if (state) {
      const st = state.toLowerCase().trim();
      schemes = schemes.filter(s => {
        const applicable = (s.eligibilityCriteria && s.eligibilityCriteria.statesApplicable) || ['all'];
        return applicable.includes('all') || applicable.some(a => a.toLowerCase().includes(st));
      });
    }

    if (crop) {
      const cr = crop.toLowerCase().trim();
      schemes = schemes.filter(s => {
        const crops = (s.eligibilityCriteria && s.eligibilityCriteria.cropsSupported) || ['all'];
        return crops.includes('all') || crops.some(c => c.toLowerCase().includes(cr) || cr.includes(c.toLowerCase()));
      });
    }

    if (maxRate) {
      const rate = Number(maxRate);
      if (!isNaN(rate)) {
        schemes = schemes.filter(s => (s.subsidizedInterestRate || s.baseInterestRate) <= rate);
      }
    }

    if (search) {
      const q = search.toLowerCase().trim();
      schemes = schemes.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.shortName.toLowerCase().includes(q) ||
        (s.tagline && s.tagline.toLowerCase().includes(q)) ||
        (s.whatItIs && s.whatItIs.toLowerCase().includes(q))
      );
    }

    const total = schemes.length;
    const off = Math.max(0, Number(offset) || 0);
    const lim = limit ? Math.min(100, Math.max(1, Number(limit))) : 100;
    const paginated = schemes.slice(off, off + lim);

    res.json({
      success: true,
      total,
      limit: lim,
      offset: off,
      count: paginated.length,
      data: paginated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/schemes/:id
 */
function getSchemeById(req, res, next) {
  try {
    const { id } = req.params;
    const schemes = readSchemes();
    const scheme = schemes.find(s => s.id === id || s.shortName.toLowerCase() === id.toLowerCase());

    if (!scheme) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Scheme with identifier '${id}' was not found.`
      });
    }

    res.json({
      success: true,
      data: scheme
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllSchemes,
  getSchemeById
};
