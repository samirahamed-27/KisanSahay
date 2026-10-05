/**
 * Structured Logging Utility for KisanSahay
 */

const levels = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG'
};

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

const logger = {
  info: (msg, meta) => console.log(formatMessage(levels.INFO, msg, meta)),
  warn: (msg, meta) => console.warn(formatMessage(levels.WARN, msg, meta)),
  error: (msg, meta) => console.error(formatMessage(levels.ERROR, msg, meta)),
  debug: (msg, meta) => {
    if (process.env.DEBUG === 'true') {
      console.log(formatMessage(levels.DEBUG, msg, meta));
    }
  }
};

module.exports = logger;
