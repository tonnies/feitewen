-- Create articles table
-- This table stores all published articles synced from Notion
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,                    -- Notion page ID
    title TEXT NOT NULL,                    -- Article title
    slug TEXT UNIQUE NOT NULL,              -- URL slug (must be unique)
    excerpt TEXT,                           -- Short description/excerpt
    content TEXT,                           -- Full Notion blocks as JSON
    publish_date TEXT,                      -- ISO 8601 date string
    author TEXT,                            -- Author names as JSON array
    topics TEXT,                            -- Topics as JSON array
    why_it_matters TEXT,                    -- Why it matters section
    status TEXT DEFAULT 'Published',        -- Article status
    cover_image TEXT,                       -- Cover image URL
    created_at INTEGER NOT NULL,            -- Unix timestamp (ms)
    updated_at INTEGER NOT NULL,            -- Unix timestamp (ms)
    synced_at INTEGER NOT NULL              -- Last sync timestamp (ms)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_publish_date ON articles(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_synced_at ON articles(synced_at);

-- Full-text search virtual table for searching articles
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
    title,
    excerpt,
    why_it_matters,
    content=articles,
    content_rowid=rowid
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS articles_fts_insert AFTER INSERT ON articles BEGIN
    INSERT INTO articles_fts(rowid, title, excerpt, why_it_matters)
    VALUES (new.rowid, new.title, new.excerpt, new.why_it_matters);
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_update AFTER UPDATE ON articles BEGIN
    UPDATE articles_fts
    SET title = new.title,
        excerpt = new.excerpt,
        why_it_matters = new.why_it_matters
    WHERE rowid = new.rowid;
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_delete AFTER DELETE ON articles BEGIN
    DELETE FROM articles_fts WHERE rowid = old.rowid;
END;
