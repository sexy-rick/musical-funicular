-- Run once in your Cloudflare D1 database, not in the Telegram database.
CREATE TABLE IF NOT EXISTS addons (
  uuid TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  creator TEXT,
  category TEXT,
  version TEXT,
  thumbnail_url TEXT,
  marketplace_url TEXT,
  file_size INTEGER,
  file_ext TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS addons_updated ON addons(deleted, updated_at DESC);
CREATE INDEX IF NOT EXISTS addons_category ON addons(category, deleted);
