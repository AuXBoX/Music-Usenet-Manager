// Shared types between main and renderer processes

// Database row types (as stored in SQLite)
export interface ArtistRow {
  id: string;
  name: string;
  monitored: number; // SQLite stores boolean as 0/1
  album_count: number;
  last_checked: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlbumRow {
  id: string;
  artist_id: string;
  title: string;
  release_year: number | null;
  track_count: number | null;
  artwork_url: string | null;
  local_path: string | null;
  is_owned: number; // SQLite stores boolean as 0/1
  created_at: string;
  updated_at: string;
}

export interface DownloadRow {
  id: string;
  album_id: string;
  sabnzbd_id: string | null;
  indexer_name: string | null;
  status: string;
  progress: number;
  quality_profile_id: string | null;
  initiated_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface QualityProfileRow {
  id: string;
  name: string;
  formats: string; // JSON string
  min_bitrate: number | null;
  max_file_size: number | null;
  is_default: number; // SQLite stores boolean as 0/1
  created_at: string;
}

export interface IndexerRow {
  id: string;
  name: string;
  url: string;
  api_key: string;
  enabled: number; // SQLite stores boolean as 0/1
  created_at: string;
}

export interface ConfigRow {
  key: string;
  value: string;
  updated_at: string;
}

// Application types (used in business logic)
export interface Artist {
  id: string;
  name: string;
  monitored: boolean;
  albumCount: number;
  lastChecked?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Album {
  id: string;
  artistId: string;
  title: string;
  releaseYear?: number;
  trackCount?: number;
  artworkUrl?: string;
  localPath?: string;
  isOwned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Download {
  id: string;
  albumId: string;
  sabnzbdId?: string;
  indexerName?: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress: number;
  qualityProfileId?: string;
  initiatedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface QualityProfile {
  id: string;
  name: string;
  formats: string[];
  minBitrate?: number;
  maxFileSize?: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface SabnzbdConfig {
  url: string;
  apiKey: string;
}

export interface IndexerConfig {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
  createdAt: Date;
}

export interface SearchResult {
  title: string;
  nzbUrl: string;
  size: number;
  age: number;
  indexer: string;
  quality: {
    format: string;
    bitrate?: number;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// Utility types for API requests
export interface ArtistFilters {
  search?: string;
  monitored?: boolean;
  sortBy?: 'name' | 'albumCount';
  sortOrder?: 'asc' | 'desc';
}

export interface DownloadFilters {
  status?: 'queued' | 'downloading' | 'completed' | 'failed';
  startDate?: Date;
  endDate?: Date;
}

export interface ScanResult {
  artistsFound: number;
  albumsFound: number;
  filesProcessed: number;
  errors: string[];
}

export interface ScanProgress {
  filesProcessed: number;
  artistsFound: number;
  albumsFound: number;
  errors: string[];
  isScanning: boolean;
  currentFile?: string;
}

export interface DownloadStatus {
  id: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
}

// Metadata types
export interface AlbumMetadata {
  id: string;
  title: string;
  releaseYear?: number;
  trackCount?: number;
  artworkUrl?: string;
  mbid?: string; // MusicBrainz ID
}

export interface Discography {
  artistName: string;
  albums: AlbumMetadata[];
  mbid?: string; // MusicBrainz artist ID
}
