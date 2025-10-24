import {
  Artist,
  ArtistRow,
  Album,
  AlbumRow,
  Download,
  DownloadRow,
  QualityProfile,
  QualityProfileRow,
  IndexerConfig,
  IndexerRow,
} from '../../shared/types';

// Convert database rows to application types

export function mapArtistRow(row: ArtistRow): Artist {
  return {
    id: row.id,
    name: row.name,
    monitored: row.monitored === 1,
    albumCount: row.album_count,
    lastChecked: row.last_checked ? new Date(row.last_checked) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapAlbumRow(row: AlbumRow): Album {
  return {
    id: row.id,
    artistId: row.artist_id,
    title: row.title,
    releaseYear: row.release_year ?? undefined,
    trackCount: row.track_count ?? undefined,
    artworkUrl: row.artwork_url ?? undefined,
    localPath: row.local_path ?? undefined,
    isOwned: row.is_owned === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapDownloadRow(row: DownloadRow): Download {
  return {
    id: row.id,
    albumId: row.album_id,
    sabnzbdId: row.sabnzbd_id ?? undefined,
    indexerName: row.indexer_name ?? undefined,
    status: row.status as 'queued' | 'downloading' | 'completed' | 'failed',
    progress: row.progress,
    qualityProfileId: row.quality_profile_id ?? undefined,
    initiatedAt: new Date(row.initiated_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    errorMessage: row.error_message ?? undefined,
  };
}

export function mapQualityProfileRow(row: QualityProfileRow): QualityProfile {
  return {
    id: row.id,
    name: row.name,
    formats: JSON.parse(row.formats),
    minBitrate: row.min_bitrate ?? undefined,
    maxFileSize: row.max_file_size ?? undefined,
    isDefault: row.is_default === 1,
    createdAt: new Date(row.created_at),
  };
}

export function mapIndexerRow(row: IndexerRow): IndexerConfig {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    apiKey: row.api_key,
    enabled: row.enabled === 1,
    createdAt: new Date(row.created_at),
  };
}

// Convert application types to database parameters

export function artistToParams(artist: Partial<Artist>): any[] {
  return [
    artist.id,
    artist.name,
    artist.monitored ? 1 : 0,
    artist.albumCount ?? 0,
    artist.lastChecked?.toISOString() ?? null,
  ];
}

export function albumToParams(album: Partial<Album>): any[] {
  return [
    album.id,
    album.artistId,
    album.title,
    album.releaseYear ?? null,
    album.trackCount ?? null,
    album.artworkUrl ?? null,
    album.localPath ?? null,
    album.isOwned ? 1 : 0,
  ];
}

export function downloadToParams(download: Partial<Download>): any[] {
  return [
    download.id,
    download.albumId,
    download.sabnzbdId ?? null,
    download.indexerName ?? null,
    download.status,
    download.progress ?? 0,
    download.qualityProfileId ?? null,
    download.initiatedAt?.toISOString() ?? new Date().toISOString(),
    download.completedAt?.toISOString() ?? null,
    download.errorMessage ?? null,
  ];
}

export function qualityProfileToParams(profile: Partial<QualityProfile>): any[] {
  return [
    profile.id,
    profile.name,
    JSON.stringify(profile.formats ?? []),
    profile.minBitrate ?? null,
    profile.maxFileSize ?? null,
    profile.isDefault ? 1 : 0,
  ];
}

export function indexerToParams(indexer: Partial<IndexerConfig>): any[] {
  return [
    indexer.id,
    indexer.name,
    indexer.url,
    indexer.apiKey,
    indexer.enabled ? 1 : 0,
  ];
}
