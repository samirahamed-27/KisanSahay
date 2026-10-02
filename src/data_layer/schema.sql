-- =============================================================================
-- KisanSahay Automated Data Layer SQLite Schema
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: records
-- Stores canonical, validated agricultural records harvested from official sources.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,                       -- Deterministic or UUID record identifier
    type TEXT NOT NULL,                        -- Data type (e.g., kvk_directory, mandi_prices)
    state TEXT NOT NULL,                       -- State name (e.g., Madhya Pradesh, Uttar Pradesh)
    district TEXT,                             -- District name (e.g., Sehore, Bhopal, Kanpur)
    content_json TEXT NOT NULL,                -- Canonical structured JSON payload
    content_hash TEXT NOT NULL,                -- SHA-256 checksum of content_json for change detection
    source_id TEXT NOT NULL,                   -- Foreign source ID from sources.yaml
    source_url TEXT NOT NULL,                  -- Exact upstream source URL harvested
    last_verified TEXT NOT NULL,               -- ISO-8601 UTC timestamp of last successful verification
    status TEXT NOT NULL CHECK (status IN ('live', 'pending_review', 'retired')) DEFAULT 'live',
    version INTEGER NOT NULL DEFAULT 1,        -- Monotonically increasing revision number
    created_at TEXT NOT NULL,                  -- ISO-8601 UTC timestamp when first inserted
    updated_at TEXT NOT NULL,                  -- ISO-8601 UTC timestamp when content was last updated
    expires_at TEXT NOT NULL,                  -- ISO-8601 UTC expiration timestamp (last_verified + TTL)
    is_stale INTEGER NOT NULL DEFAULT 0        -- 1 if current time > expires_at, 0 otherwise
);

-- Indices for rapid filtering and RAG extraction
CREATE INDEX IF NOT EXISTS idx_records_type_state ON records(type, state);
CREATE INDEX IF NOT EXISTS idx_records_type_state_district ON records(type, state, district);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_content_hash ON records(content_hash);
CREATE INDEX IF NOT EXISTS idx_records_expires_at ON records(expires_at);
CREATE INDEX IF NOT EXISTS idx_records_is_stale ON records(is_stale);
CREATE INDEX IF NOT EXISTS idx_records_source_id ON records(source_id);

-- -----------------------------------------------------------------------------
-- 2. Table: sync_log
-- Audit log recording harvest batches, changes, and errors per source.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,                   -- Source identifier being synchronized
    started_at TEXT NOT NULL,                  -- ISO-8601 UTC timestamp when sync initiated
    completed_at TEXT,                         -- ISO-8601 UTC timestamp when sync finished
    result TEXT NOT NULL CHECK (result IN ('running', 'success', 'failure', 'partial')) DEFAULT 'running',
    records_added INTEGER NOT NULL DEFAULT 0,  -- Count of brand-new records added
    records_updated INTEGER NOT NULL DEFAULT 0,-- Count of existing records with changed hash updated
    records_retired INTEGER NOT NULL DEFAULT 0,-- Count of missing/obsolete records marked retired
    error TEXT,                                -- Nullable error message or stack trace
    execution_seconds REAL DEFAULT 0.0         -- Total duration of synchronization in seconds
);

CREATE INDEX IF NOT EXISTS idx_sync_log_source ON sync_log(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_result ON sync_log(result);
