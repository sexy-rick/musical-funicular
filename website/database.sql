-- Step 3: Notebook (MySQL) for Minecraft Add-on Website
-- Paste this whole file in phpMyAdmin > SQL tab > Go
-- Site: https://marketplacetrader.great-site.net
-- Mirrors bot's `files` table fields so future sync is a straight copy.

CREATE TABLE IF NOT EXISTS addons (
  uuid            VARCHAR(36) PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  creator         VARCHAR(255),
  category        VARCHAR(64),
  version         VARCHAR(32),
  thumbnail_url   VARCHAR(512),
  marketplace_url VARCHAR(512),
  file_url        VARCHAR(512) NOT NULL,
  file_name       VARCHAR(255),
  file_size       BIGINT,
  file_ext        VARCHAR(16),
  message_link    VARCHAR(512),
  updated_at      INT NOT NULL,
  INDEX idx_category (category),
  INDEX idx_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Test row (delete after Step 6 when real files are added)
-- INSERT INTO addons (uuid, title, creator, category, version, file_url, file_name, file_size, file_ext, updated_at)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Test Add-on', 'Marketplace Trader', 'ADD-ON', '1.0', 'https://example.com/test.mcaddon', 'test.mcaddon', 1048576, 'mcaddon', UNIX_TIMESTAMP());
