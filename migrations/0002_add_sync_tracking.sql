-- Migration to add sync tracking table
-- This tracks when we last synced with Notion to enable incremental syncs

CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_timestamp TEXT NOT NULL,
    last_sync_completed_at INTEGER NOT NULL,
    total_articles_synced INTEGER DEFAULT 0,
    sync_type TEXT DEFAULT 'incremental'
);

-- Insert initial record
INSERT OR IGNORE INTO sync_metadata (id, last_sync_timestamp, last_sync_completed_at, sync_type)
VALUES (1, '2000-01-01T00:00:00.000Z', 0, 'full');

-- Add last_edited_time to articles table for tracking
ALTER TABLE articles ADD COLUMN last_edited_time TEXT;

-- Create index for faster lookups on last_edited_time
CREATE INDEX IF NOT EXISTS idx_articles_last_edited ON articles(last_edited_time);
