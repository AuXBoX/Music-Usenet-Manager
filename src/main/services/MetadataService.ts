import axios, { AxiosInstance } from 'axios';
import { Discography, AlbumMetadata } from '../../shared/types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface MusicBrainzArtist {
  id: string;
  name: string;
  'sort-name': string;
}

interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  'first-release-date'?: string;
  'primary-type'?: string;
}

export class MetadataService {
  private client: AxiosInstance;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly USER_AGENT = 'MusicUsenetManager/1.0.0 (https://github.com/yourusername/music-usenet-manager)';
  private readonly BASE_URL = 'https://musicbrainz.org/ws/2';
  private readonly COVER_ART_BASE_URL = 'https://coverartarchive.org';

  constructor() {
    this.client = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        'User-Agent': this.USER_AGENT,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    // Add rate limiting - MusicBrainz allows 1 request per second
    this.client.interceptors.request.use(async (config) => {
      await this.rateLimit();
      return config;
    });
  }

  /**
   * Rate limiting to respect MusicBrainz API limits (1 request per second)
   */
  private lastRequestTime = 0;
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000; // 1 second

    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get complete discography for an artist
   */
  async getArtistDiscography(artistName: string): Promise<Discography> {
    const cacheKey = `discography:${artistName.toLowerCase()}`;
    
    // Check cache
    const cached = this.getFromCache<Discography>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Search for artist
      const artist = await this.searchArtist(artistName);
      
      if (!artist) {
        return {
          artistName,
          albums: [],
        };
      }

      // Fetch release groups (albums) for the artist
      const releaseGroups = await this.fetchReleaseGroups(artist.id);
      
      // Convert to AlbumMetadata format
      const albums: AlbumMetadata[] = releaseGroups.map(rg => ({
        id: rg.id,
        title: rg.title,
        releaseYear: rg['first-release-date'] ? parseInt(rg['first-release-date'].substring(0, 4)) : undefined,
        mbid: rg.id,
      }));

      // Fetch artwork URLs for albums (in parallel, but limited)
      await this.fetchArtworkForAlbums(albums);

      const discography: Discography = {
        artistName: artist.name,
        albums,
        mbid: artist.id,
      };

      // Cache the result
      this.setCache(cacheKey, discography);

      return discography;
    } catch (error: any) {
      console.error('Error fetching discography:', error);
      throw new Error(`Failed to fetch discography for ${artistName}: ${error.message}`);
    }
  }

  /**
   * Search for an artist by name
   */
  private async searchArtist(artistName: string): Promise<MusicBrainzArtist | null> {
    try {
      const response = await this.client.get('/artist', {
        params: {
          query: `artist:"${artistName}"`,
          limit: 1,
          fmt: 'json',
        },
      });

      const artists = response.data.artists || [];
      
      if (artists.length === 0) {
        return null;
      }

      return artists[0];
    } catch (error: any) {
      console.error('Error searching artist:', error);
      throw error;
    }
  }

  /**
   * Fetch release groups (albums) for an artist
   */
  private async fetchReleaseGroups(artistId: string): Promise<MusicBrainzReleaseGroup[]> {
    try {
      const allReleaseGroups: MusicBrainzReleaseGroup[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get('/release-group', {
          params: {
            artist: artistId,
            type: 'album|ep', // Only albums and EPs
            limit,
            offset,
            fmt: 'json',
          },
        });

        const releaseGroups = response.data['release-groups'] || [];
        allReleaseGroups.push(...releaseGroups);

        // Check if there are more results
        const count = response.data['release-group-count'] || 0;
        offset += limit;
        hasMore = offset < count;
      }

      // Filter to only include albums and EPs, remove duplicates
      const filtered = allReleaseGroups.filter(rg => 
        rg['primary-type'] === 'Album' || rg['primary-type'] === 'EP'
      );

      // Remove duplicates by title (keep the earliest release)
      const uniqueMap = new Map<string, MusicBrainzReleaseGroup>();
      
      for (const rg of filtered) {
        const normalizedTitle = rg.title.toLowerCase().trim();
        const existing = uniqueMap.get(normalizedTitle);
        
        if (!existing) {
          uniqueMap.set(normalizedTitle, rg);
        } else {
          // Keep the one with the earlier release date
          const existingDate = existing['first-release-date'] || '9999';
          const currentDate = rg['first-release-date'] || '9999';
          
          if (currentDate < existingDate) {
            uniqueMap.set(normalizedTitle, rg);
          }
        }
      }

      return Array.from(uniqueMap.values());
    } catch (error: any) {
      console.error('Error fetching release groups:', error);
      throw error;
    }
  }

  /**
   * Fetch album artwork URLs for multiple albums
   */
  private async fetchArtworkForAlbums(albums: AlbumMetadata[]): Promise<void> {
    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    
    for (let i = 0; i < albums.length; i += batchSize) {
      const batch = albums.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (album) => {
          try {
            const artworkUrl = await this.getAlbumArtwork(album.mbid!);
            album.artworkUrl = artworkUrl;
          } catch (error) {
            // Artwork not available, skip
            album.artworkUrl = undefined;
          }
        })
      );
    }
  }

  /**
   * Get album artwork URL from Cover Art Archive
   */
  async getAlbumArtwork(releaseGroupId: string): Promise<string | undefined> {
    const cacheKey = `artwork:${releaseGroupId}`;
    
    // Check cache
    const cached = this.getFromCache<string>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Cover Art Archive uses release-group IDs
      const response = await axios.get(
        `${this.COVER_ART_BASE_URL}/release-group/${releaseGroupId}`,
        {
          timeout: 5000,
          headers: {
            'User-Agent': this.USER_AGENT,
          },
        }
      );

      const images = response.data.images || [];
      
      if (images.length === 0) {
        return undefined;
      }

      // Get the front cover or the first image
      const frontCover = images.find((img: any) => img.front === true) || images[0];
      const artworkUrl = frontCover.thumbnails?.large || frontCover.image;

      // Cache the result
      this.setCache(cacheKey, artworkUrl);

      return artworkUrl;
    } catch (error: any) {
      // 404 means no artwork available
      if (error.response?.status === 404) {
        return undefined;
      }
      
      console.error('Error fetching artwork:', error.message);
      return undefined;
    }
  }

  /**
   * Get data from cache if not expired
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > this.CACHE_TTL) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      
      if (age > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}
