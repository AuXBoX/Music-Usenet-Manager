import { IndexerService } from './IndexerService';
import { SabnzbdService } from './SabnzbdService';
import { QualityProfileService } from './QualityProfileService';
import { ConfigService } from './ConfigService';
import { DownloadRepository } from '../database/repositories/DownloadRepository';
import { AlbumRepository } from '../database/repositories/AlbumRepository';
import { Download, SearchResult, Album } from '../../shared/types';

export interface DownloadRequest {
  albumId: string;
  qualityProfileId?: string;
}

export interface DownloadResult {
  download: Download;
  searchResults: SearchResult[];
  selectedResult?: SearchResult;
}

export class DownloadService {
  constructor(
    private configService: ConfigService,
    private qualityProfileService: QualityProfileService,
    private downloadRepo: DownloadRepository,
    private albumRepo: AlbumRepository
  ) {}

  /**
   * Orchestrate the complete download flow:
   * 1. Get album details
   * 2. Search indexers for the album
   * 3. Select best result based on quality profile
   * 4. Send to SABnzbd
   * 5. Create download record
   */
  async initiateDownload(request: DownloadRequest): Promise<DownloadResult> {
    // Get album details
    const album = this.albumRepo.findById(request.albumId);
    if (!album) {
      throw new Error(`Album with id ${request.albumId} not found`);
    }

    // Get artist details for search
    const artist = await this.getArtistForAlbum(album);

    // Get quality profile
    const qualityProfile = request.qualityProfileId
      ? this.qualityProfileService.getProfile(request.qualityProfileId)
      : this.qualityProfileService.getDefaultProfile();

    if (!qualityProfile) {
      throw new Error('No quality profile specified and no default profile configured');
    }

    // Search for the album
    const searchResults = await this.searchAlbum(artist, album.title, qualityProfile.id);

    if (searchResults.length === 0) {
      throw new Error(`No results found for ${artist} - ${album.title}`);
    }

    // Select the best result (first one after filtering and ranking)
    const selectedResult = searchResults[0];

    // Send to SABnzbd
    const sabnzbdConfig = this.configService.getSabnzbdConfig();
    if (!sabnzbdConfig) {
      throw new Error('SABnzbd is not configured');
    }

    const sabnzbdService = new SabnzbdService(sabnzbdConfig);
    const sabnzbdId = await sabnzbdService.sendNzbUrl(selectedResult.nzbUrl, 'music');

    // Create download record
    const download = this.downloadRepo.create({
      albumId: request.albumId,
      sabnzbdId,
      indexerName: selectedResult.indexer,
      status: 'queued',
      progress: 0,
      qualityProfileId: qualityProfile.id,
    });

    return {
      download,
      searchResults,
      selectedResult,
    };
  }

  /**
   * Search for an album using configured indexers
   */
  private async searchAlbum(
    artist: string,
    album: string,
    qualityProfileId: string
  ): Promise<SearchResult[]> {
    const indexers = this.configService.getEnabledIndexers();

    if (indexers.length === 0) {
      throw new Error('No enabled indexers configured');
    }

    const qualityProfile = this.qualityProfileService.getProfile(qualityProfileId);
    if (!qualityProfile) {
      throw new Error(`Quality profile with id ${qualityProfileId} not found`);
    }

    const indexerService = new IndexerService(indexers, this.qualityProfileService);
    return await indexerService.searchAlbum(artist, album, qualityProfile);
  }

  /**
   * Get artist name for an album
   */
  private async getArtistForAlbum(album: Album): Promise<string> {
    // Import getDatabaseService to get artist repository
    const { getDatabaseService } = await import('../database');
    
    const dbService = getDatabaseService();
    const artist = dbService.artists.findById(album.artistId);
    
    if (!artist) {
      throw new Error(`Artist with id ${album.artistId} not found`);
    }

    return artist.name;
  }

  /**
   * Update download status by polling SABnzbd
   */
  async updateDownloadStatus(downloadId: string): Promise<Download> {
    const download = this.downloadRepo.findById(downloadId);
    if (!download) {
      throw new Error(`Download with id ${downloadId} not found`);
    }

    // If already completed or failed, return cached status
    if (download.status === 'completed' || download.status === 'failed') {
      return download;
    }

    // Query SABnzbd for current status
    if (!download.sabnzbdId) {
      throw new Error('Download does not have a SABnzbd ID');
    }

    const sabnzbdConfig = this.configService.getSabnzbdConfig();
    if (!sabnzbdConfig) {
      throw new Error('SABnzbd is not configured');
    }

    const sabnzbdService = new SabnzbdService(sabnzbdConfig);
    const status = await sabnzbdService.getDownloadStatus(download.sabnzbdId);

    // Update database with latest status
    const updatedDownload = this.downloadRepo.updateStatus(
      downloadId,
      status.status,
      status.progress
    );

    if (!updatedDownload) {
      throw new Error(`Failed to update download ${downloadId}`);
    }

    // Update error message if failed
    if (status.status === 'failed' && status.errorMessage) {
      return this.downloadRepo.update(downloadId, {
        errorMessage: status.errorMessage,
      })!;
    }

    return updatedDownload;
  }

  /**
   * Poll status for all active downloads
   */
  async updateAllActiveDownloads(): Promise<Download[]> {
    const activeDownloads = this.downloadRepo.findActive();
    const updatedDownloads: Download[] = [];

    for (const download of activeDownloads) {
      try {
        const updated = await this.updateDownloadStatus(download.id);
        updatedDownloads.push(updated);
      } catch (error) {
        console.error(`Error updating download ${download.id}:`, error);
        // Continue with other downloads
      }
    }

    return updatedDownloads;
  }

  /**
   * Get download history with optional filters
   */
  getDownloadHistory(filters?: {
    status?: 'queued' | 'downloading' | 'completed' | 'failed';
    startDate?: Date;
    endDate?: Date;
  }): Download[] {
    return this.downloadRepo.findAll(filters);
  }

  /**
   * Get active downloads
   */
  getActiveDownloads(): Download[] {
    return this.downloadRepo.findActive();
  }
}
