-- Artists table
CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  monitored INTEGER DEFAULT 0,
  album_count INTEGER DEFAULT 0,
  last_checked TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_monitored ON artists(monitored);

-- Albums table
CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL,
  title TEXT NOT NULL,
  release_year INTEGER,
  track_count INTEGER,
  artwork_url TEXT,
  local_path TEXT,
  is_owned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_albums_title ON albums(title);
CREATE INDEX IF NOT EXISTS idx_albums_is_owned ON albums(is_owned);

-- Downloads table
CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL,
  sabnzbd_id TEXT,
  indexer_name TEXT,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  quality_profile_id TEXT,
  initiated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  error_message TEXT,
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  FOREIGN KEY (quality_profile_id) REFERENCES quality_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
CREATE INDEX IF NOT EXISTS idx_downloads_album_id ON downloads(album_id);
CREATE INDEX IF NOT EXISTS idx_downloads_initiated_at ON downloads(initiated_at);

-- Quality Profiles table
CREATE TABLE IF NOT EXISTS quality_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  formats TEXT NOT NULL,
  min_bitrate INTEGER,
  max_file_size INTEGER,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quality_profiles_is_default ON quality_profiles(is_default);

-- Configuration table (key-value store)
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexers table
CREATE TABLE IF NOT EXISTS indexers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_indexers_enabled ON indexers(enabled);
