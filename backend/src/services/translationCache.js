/**
 * KisanSahay Minimal-Storage Hash Cache
 *
 * Requirements (Part 3):
 * - Key: {16-hex hash of source string + target language}
 * - TTL: 30 days (default)
 * - LRU eviction cap (default 5,000 entries)
 * - Excludes dynamic content
 * - Compact file-backed persistence
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days
const DEFAULT_MAX_SIZE = 5000;
const CACHE_FILE_PATH = path.join(__dirname, '../data/translationCache.json');

class TranslationCache {
  constructor(options = {}) {
    this.ttlMs = options.ttlMs || DEFAULT_TTL_MS;
    this.maxSize = options.maxSize || DEFAULT_MAX_SIZE;
    this.filePath = options.filePath || CACHE_FILE_PATH;

    // In-memory Map: key -> { value, expiresAt, lastAccessed }
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalWrites: 0
    };

    this._saveTimer = null;
    this._loadFromDisk();
  }

  /**
   * Generates a compact hash-based cache key
   * e.g. "a3f91b2c4d8e5f60:hi"
   */
  hashKey(sourceText, targetLang) {
    if (!sourceText || typeof sourceText !== 'string') return null;
    const normalized = sourceText.trim();
    const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
    return `${hash}:${String(targetLang).toLowerCase().trim()}`;
  }

  /**
   * Retrieve translated string from cache if present and unexpired
   */
  get(sourceText, targetLang) {
    const key = this.hashKey(sourceText, targetLang);
    if (!key || !this.cache.has(key)) {
      this.stats.misses++;
      return null;
    }

    const entry = this.cache.get(key);
    const now = Date.now();

    // Check expiration
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Refresh LRU order: delete and re-insert
    entry.lastAccessed = now;
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Store a translated string in cache with TTL and LRU eviction
   */
  set(sourceText, targetLang, translatedText, customTtlMs) {
    if (!sourceText || !translatedText || !targetLang) return false;

    const key = this.hashKey(sourceText, targetLang);
    if (!key) return false;

    const now = Date.now();
    const expiresAt = now + (customTtlMs || this.ttlMs);

    // Evict least-recently-used item if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    // If key already exists, delete first to refresh position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, {
      value: String(translatedText),
      expiresAt,
      lastAccessed: now
    });

    this.stats.totalWrites++;
    this._scheduleSave();
    return true;
  }

  /**
   * Batch get translations for a map or array of strings
   * Returns: { hits: { [indexOrKey]: translatedText }, misses: [ { id, sourceText } ] }
   */
  getBatch(items, targetLang) {
    const hits = {};
    const misses = [];

    // items can be an object { key: text } or array of strings / objects
    if (Array.isArray(items)) {
      items.forEach((text, index) => {
        const cached = this.get(text, targetLang);
        if (cached !== null) {
          hits[index] = cached;
        } else {
          misses.push({ index, text });
        }
      });
    } else if (typeof items === 'object' && items !== null) {
      Object.keys(items).forEach(key => {
        const text = items[key];
        const cached = this.get(text, targetLang);
        if (cached !== null) {
          hits[key] = cached;
        } else {
          misses.push({ key, text });
        }
      });
    }

    return { hits, misses };
  }

  /**
   * Returns cache metrics and capacity stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlDays: Math.round(this.ttlMs / (24 * 60 * 60 * 1000)),
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      totalWrites: this.stats.totalWrites,
      hitRatio: (this.stats.hits + this.stats.misses > 0)
        ? Number((this.stats.hits / (this.stats.hits + this.stats.misses)).toFixed(4))
        : 0
    };
  }

  /**
   * Remove all expired entries
   */
  pruneExpired() {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }
    if (pruned > 0) this._scheduleSave();
    return pruned;
  }

  /**
   * Clear all cached translations
   */
  clear() {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    this.stats.totalWrites = 0;
    this._scheduleSave();
  }

  /**
   * Load existing cache from disk
   */
  _loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        const now = Date.now();
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item.key && item.value && item.expiresAt && item.expiresAt > now) {
              this.cache.set(item.key, {
                value: item.value,
                expiresAt: item.expiresAt,
                lastAccessed: item.lastAccessed || now
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[TranslationCache] Warning loading cache from disk:', err.message);
    }
  }

  /**
   * Debounced save to disk to avoid disk thrashing on batch translations
   */
  _scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._flushToDisk();
    }, 1000);
  }

  /**
   * Flush in-memory cache to disk
   */
  _flushToDisk() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const entries = [];
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt > now) {
          entries.push({
            key,
            value: entry.value,
            expiresAt: entry.expiresAt,
            lastAccessed: entry.lastAccessed
          });
        }
      }
      fs.writeFileSync(this.filePath, JSON.stringify(entries), 'utf8');
    } catch (err) {
      console.warn('[TranslationCache] Warning saving cache to disk:', err.message);
    }
  }
}

// Singleton instance
const defaultCache = new TranslationCache();

module.exports = {
  TranslationCache,
  translationCache: defaultCache
};
