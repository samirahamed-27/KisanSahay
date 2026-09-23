/**
 * Human Review Gate Controller for Ingested Agricultural Schemes
 * Ensures no scraped updates go live automatically without explicit approval/publishing.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const STAGED_FILE = path.join(__dirname, '..', 'data', 'stagedSchemes.json');
const STAGED_ALT_FILE = path.join(__dirname, '..', '..', 'Data', 'Data', 'staged_schemes.json');
const SCHEMES_FILE = path.join(__dirname, '..', 'data', 'schemesDatabase.json');
const SCHEMES_ALT_FILE = path.join(__dirname, '..', '..', 'Data', 'Data', 'schemes.json');

function loadStaged() {
  if (fs.existsSync(STAGED_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STAGED_FILE, 'utf8'));
    } catch (e) {
      logger.error('Failed to parse staged schemes:', e);
      return [];
    }
  }
  return [];
}

function saveStaged(records) {
  const content = JSON.stringify(records, null, 2);
  fs.writeFileSync(STAGED_FILE, content, 'utf8');
  if (fs.existsSync(path.dirname(STAGED_ALT_FILE))) {
    try {
      fs.writeFileSync(STAGED_ALT_FILE, content, 'utf8');
    } catch (e) {
      // Non-blocking mirror write
    }
  }
}

/**
 * GET /api/schemes/review-queue
 * Returns all pending staged updates awaiting human review.
 */
function getReviewQueue(req, res) {
  try {
    const filterStatus = req.query.status || 'staged';
    const allStaged = loadStaged();
    const filtered = filterStatus === 'all' 
      ? allStaged 
      : allStaged.filter(item => item.status === filterStatus);

    return res.status(200).json({
      success: true,
      count: filtered.length,
      statusFilter: filterStatus,
      items: filtered
    });
  } catch (err) {
    logger.error('Error fetching review queue:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve staged schemes review queue'
    });
  }
}

/**
 * POST /api/schemes/review-action
 * Approves or rejects a staged scheme update.
 * Body: { id: string, action: 'approve' | 'reject', notes?: string }
 */
function processReviewAction(req, res) {
  try {
    const { id, action, notes } = req.body || {};

    if (!id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload. "id" and "action" ("approve" or "reject") are required.'
      });
    }

    const staged = loadStaged();
    const targetIdx = staged.findIndex(item => item.id === id);

    if (targetIdx === -1) {
      return res.status(404).json({
        success: false,
        error: `Staged scheme with ID "${id}" not found.`
      });
    }

    const item = staged[targetIdx];

    if (action === 'approve') {
      item.status = 'approved';
      item.reviewedAt = new Date().toISOString();
      item.reviewerNotes = notes || 'Approved for live publication';

      // Publish into live database
      if (item.structuredScheme && fs.existsSync(SCHEMES_FILE)) {
        try {
          const liveRaw = fs.readFileSync(SCHEMES_FILE, 'utf8');
          const liveSchemes = JSON.parse(liveRaw);
          const schemeIdx = liveSchemes.findIndex(s => s.id === item.structuredScheme.id);

          const publishedItem = {
            ...item.structuredScheme,
            lastVerifiedAt: item.lastVerifiedAt || new Date().toISOString(),
            publishedAt: new Date().toISOString()
          };

          if (schemeIdx >= 0) {
            liveSchemes[schemeIdx] = publishedItem;
          } else {
            liveSchemes.push(publishedItem);
          }

          const liveContent = JSON.stringify(liveSchemes, null, 2);
          fs.writeFileSync(SCHEMES_FILE, liveContent, 'utf8');

          if (fs.existsSync(SCHEMES_ALT_FILE)) {
            try {
              fs.writeFileSync(SCHEMES_ALT_FILE, liveContent, 'utf8');
            } catch (e) {
              // Non-blocking mirror
            }
          }

          logger.info(`Scheme "${item.structuredScheme.id}" published to live database after human approval.`);
        } catch (dbErr) {
          logger.error('Failed to commit approved scheme to live database:', dbErr);
          return res.status(500).json({
            success: false,
            error: 'Database commit failed during publishing'
          });
        }
      }
    } else {
      item.status = 'rejected';
      item.reviewedAt = new Date().toISOString();
      item.reviewerNotes = notes || 'Rejected by reviewer';
      logger.info(`Staged scheme "${id}" was rejected by human reviewer.`);
    }

    saveStaged(staged);

    return res.status(200).json({
      success: true,
      message: `Scheme ${id} successfully ${item.status}.`,
      item
    });
  } catch (err) {
    logger.error('Error processing review action:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process review action'
    });
  }
}

module.exports = {
  getReviewQueue,
  processReviewAction
};
