import cron from 'node-cron';
import { MetadataService } from './MetadataService';
import { DownloadService } from './DownloadService';
import { ArtistRepository } from '../database/repositories/ArtistRepository';
import { AlbumRepository } from '../database/repositories/AlbumRepository';
import { Artist, AlbumMetadata } from '../../shared/types';

export interface MonitoringConfig {
  enabled: boolean;
  schedule: string; // cron expression, default: '0 */6 * * *' (every 6 hours)
}

export class MonitoringService {
  private task: cron.ScheduledTask | null = null;
  private isRunning = false;
  private config: MonitoringConfig;

  constructor(
    private metadataService: MetadataService,
    private downloadService: DownloadService,
    private artistRepo: ArtistRepository,
    private albumRepo: AlbumRepository,
    config?: Partial<MonitoringConfig>
  ) {
    this.config = {
      enabled: config?.enabled ?? true,
      schedule: config?.schedule ?? '0 */6 * * *', // Every 6 hours at minute 0
    };
  }

  /**
   * Start the monitoring scheduler
   */
  startScheduler(): void {
    if (this.task) {
      console.log('Monitoring scheduler is already running');
      return;
    }

    if (!this.config.enabled) {
      console.log('Monitoring is disabled');
      return;
    }

    // Validate cron expression
    if (!cron.validate(this.config.schedule)) {
      throw new Error(`Invalid cron schedule: ${this.config.schedule}`);
    }

    console.log(`Starting monitoring scheduler with schedule: ${this.config.schedule}`);

    this.task = cron.schedule(this.config.schedule, async () => {
      await this.checkForNewReleases();
    });

    console.log('Monitoring scheduler started');
  }

  /**
   * Stop the monitoring scheduler
   */
  stopScheduler(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('Monitoring scheduler stopped');
    }
  }

  /**
   * Check if the scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.task !== null;
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    const wasRunning = this.isSchedulerRunning();

    if (wasRunning) {
      this.stopScheduler();
    }

    this.config = {
      ...this.config,
      ...config,
    };

    if (wasRunning && this.config.enabled) {
      this.startScheduler();
    }
  }

  /**
   * Get current monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Check all monitored artists for new releases
   */
  async checkForNewReleases(): Promise<void> {
    if (this.isRunning) {
      console.log('Monitoring check already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('Starting monitoring check for new releases...');

    try {
      const monitoredArtists = this.artistRepo.getMonitored();
      console.log(`Found ${monitoredArtists.length} monitored artists`);

      for (const artist of monitoredArtists) {
        try {
          await this.checkArtistForNewReleases(artist);
        } catch (error: any) {
          console.error(`Error checking artist ${artist.name}:`, error.message);
          // Continue with other artists
        }
      }

      console.log('Monitoring check completed');
    } catch (error: any) {
      console.error('Error during monitoring check:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check a specific artist for new releases
   */
  private async checkArtistForNewReleases(artist: Artist): Promise<void> {
    console.log(`Checking ${artist.name} for new releases...`);

    // Skip if checked recently (within last 24 hours)
    if (artist.lastChecked) {
      const hoursSinceLastCheck = (Date.now() - artist.lastChecked.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastCheck < 24) {
        console.log(`Skipping ${artist.name} - checked ${hoursSinceLastCheck.toFixed(1)} hours ago`);
        return;
      }
    }

    try {
      // Fetch latest discography from metadata service
      const discography = await this.metadataService.getArtistDiscography(artist.name);

      // Get existing albums for this artist
      const existingAlbums = this.albumRepo.findByArtistId(artist.id);
      const existingTitles = new Set(
        existingAlbums.map(album => this.normalizeTitle(album.title))
      );

      // Find new albums
      const newAlbums = discography.albums.filter(
        album => !existingTitles.has(this.normalizeTitle(album.title))
      );

      if (newAlbums.length > 0) {
        console.log(`Found ${newAlbums.length} new album(s) for ${artist.name}`);

        for (const newAlbum of newAlbums) {
          await this.processNewRelease(artist, newAlbum);
        }
      } else {
        console.log(`No new releases found for ${artist.name}`);
      }

      // Update last checked timestamp
      this.artistRepo.update(artist.id, {
        lastChecked: new Date(),
      });
    } catch (error: any) {
      console.error(`Error checking ${artist.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Process a new release: add to database and trigger download
   */
  async processNewRelease(artist: Artist, albumMetadata: AlbumMetadata): Promise<void> {
    console.log(`Processing new release: ${artist.name} - ${albumMetadata.title}`);

    try {
      // Create album record in database
      const album = this.albumRepo.create({
        artistId: artist.id,
        title: albumMetadata.title,
        releaseYear: albumMetadata.releaseYear,
        trackCount: albumMetadata.trackCount,
        artworkUrl: albumMetadata.artworkUrl,
        isOwned: false,
      });

      // Update artist album count
      this.artistRepo.incrementAlbumCount(artist.id);

      // Trigger automatic download using default quality profile
      try {
        const result = await this.downloadService.initiateDownload({
          albumId: album.id,
          // qualityProfileId is optional - will use default profile
        });

        console.log(
          `Successfully initiated download for ${artist.name} - ${albumMetadata.title} ` +
          `(SABnzbd ID: ${result.download.sabnzbdId})`
        );
      } catch (downloadError: any) {
        console.error(
          `Failed to download ${artist.name} - ${albumMetadata.title}: ${downloadError.message}`
        );
        // Album is still added to database, just not downloaded
      }
    } catch (error: any) {
      console.error(`Error processing new release: ${error.message}`);
      throw error;
    }
  }

  /**
   * Normalize album title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Manually trigger a check for a specific artist
   */
  async checkArtist(artistId: string): Promise<void> {
    const artist = this.artistRepo.findById(artistId);
    
    if (!artist) {
      throw new Error(`Artist with id ${artistId} not found`);
    }

    if (!artist.monitored) {
      throw new Error(`Artist ${artist.name} is not monitored`);
    }

    await this.checkArtistForNewReleases(artist);
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    enabled: boolean;
    isRunning: boolean;
    isSchedulerActive: boolean;
    schedule: string;
  } {
    return {
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      isSchedulerActive: this.isSchedulerRunning(),
      schedule: this.config.schedule,
    };
  }
}
