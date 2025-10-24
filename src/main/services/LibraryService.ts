import * as fs from 'fs';
import * as path from 'path';
import { ArtistRepository } from '../database/repositories/ArtistRepository';
import { AlbumRepository } from '../database/repositories/AlbumRepository';
import { ScanResult } from '../../shared/types';

interface ScanProgress {
  filesProcessed: number;
  artistsFound: number;
  albumsFound: number;
  errors: string[];
  isScanning: boolean;
  currentFile?: string;
}

export class LibraryService {
  private scanProgress: ScanProgress = {
    filesProcessed: 0,
    artistsFound: 0,
    albumsFound: 0,
    errors: [],
    isScanning: false,
  };

  private supportedExtensions = ['.mp3', '.flac', '.m4a', '.aac', '.ogg', '.wav', '.wma'];

  constructor(
    private artistRepository: ArtistRepository,
    private albumRepository: AlbumRepository
  ) {}

  /**
   * Start scanning a library directory
   */
  async scanLibrary(libraryPath: string): Promise<ScanResult> {
    if (this.scanProgress.isScanning) {
      throw new Error('A scan is already in progress');
    }

    // Validate path exists
    if (!fs.existsSync(libraryPath)) {
      throw new Error(`Library path does not exist: ${libraryPath}`);
    }

    // Reset progress
    this.scanProgress = {
      filesProcessed: 0,
      artistsFound: 0,
      albumsFound: 0,
      errors: [],
      isScanning: true,
    };

    try {
      // Collect all music files
      const musicFiles = await this.collectMusicFiles(libraryPath);
      
      // Extract metadata from files
      const albumMap = await this.extractMetadata(musicFiles);
      
      // Store in database
      await this.storeInDatabase(albumMap);

      this.scanProgress.isScanning = false;

      return {
        artistsFound: this.scanProgress.artistsFound,
        albumsFound: this.scanProgress.albumsFound,
        filesProcessed: this.scanProgress.filesProcessed,
        errors: this.scanProgress.errors,
      };
    } catch (error) {
      this.scanProgress.isScanning = false;
      throw error;
    }
  }

  /**
   * Get current scan progress
   */
  getScanStatus(): ScanProgress {
    return { ...this.scanProgress };
  }

  /**
   * Recursively collect all music files from directory
   */
  private async collectMusicFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const processDirectory = (currentPath: string) => {
      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            processDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (this.supportedExtensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        this.scanProgress.errors.push(`Error reading directory ${currentPath}: ${error}`);
      }
    };

    processDirectory(dirPath);
    return files;
  }

  /**
   * Extract metadata from music files and organize by artist/album
   */
  private async extractMetadata(files: string[]): Promise<Map<string, Map<string, AlbumData>>> {
    const artistAlbumMap = new Map<string, Map<string, AlbumData>>();
    
    // Dynamic import for ES module - use require for CommonJS compatibility
    const mm = require('music-metadata');

    for (const filePath of files) {
      try {
        this.scanProgress.currentFile = filePath;
        
        const metadata = await mm.parseFile(filePath, { duration: false });
        
        // Extract artist and album info
        const artist = metadata.common.artist || metadata.common.albumartist || 'Unknown Artist';
        const album = metadata.common.album || 'Unknown Album';
        const year = metadata.common.year;

        // Normalize names
        const normalizedArtist = this.normalizeString(artist);
        const normalizedAlbum = this.normalizeString(album);

        // Get or create artist map
        if (!artistAlbumMap.has(normalizedArtist)) {
          artistAlbumMap.set(normalizedArtist, new Map());
        }

        const albumMap = artistAlbumMap.get(normalizedArtist)!;

        // Get or create album data
        if (!albumMap.has(normalizedAlbum)) {
          albumMap.set(normalizedAlbum, {
            title: album, // Use original casing
            artistName: artist, // Use original casing
            releaseYear: year,
            trackCount: 0,
            localPath: path.dirname(filePath),
          });
        }

        const albumData = albumMap.get(normalizedAlbum)!;
        albumData.trackCount++;

        // Update year if we found one and didn't have it
        if (year && !albumData.releaseYear) {
          albumData.releaseYear = year;
        }

        this.scanProgress.filesProcessed++;
      } catch (error) {
        this.scanProgress.errors.push(`Error processing ${filePath}: ${error}`);
      }
    }

    return artistAlbumMap;
  }

  /**
   * Store discovered artists and albums in database
   */
  private async storeInDatabase(
    artistAlbumMap: Map<string, Map<string, AlbumData>>
  ): Promise<void> {
    const artistsAdded = new Set<string>();
    const albumsAdded = new Set<string>();

    for (const [, albumMap] of artistAlbumMap.entries()) {
      // Get the original artist name from the first album
      const firstAlbum = albumMap.values().next().value as AlbumData;
      const artistName = firstAlbum.artistName;

      // Check if artist exists
      let artist = this.artistRepository.findByName(artistName);
      
      if (!artist) {
        // Create new artist
        artist = this.artistRepository.create({
          name: artistName,
          monitored: false,
          albumCount: 0,
        });
        artistsAdded.add(artist.id);
      }

      // Process albums for this artist
      for (const [, albumData] of albumMap.entries()) {
        // Check if album exists
        let album = this.albumRepository.findByArtistAndTitle(artist.id, albumData.title);

        if (!album) {
          // Create new album
          album = this.albumRepository.create({
            artistId: artist.id,
            title: albumData.title,
            releaseYear: albumData.releaseYear,
            trackCount: albumData.trackCount,
            localPath: albumData.localPath,
            isOwned: true,
          });
          albumsAdded.add(album.id);
          
          // Increment artist album count
          this.artistRepository.incrementAlbumCount(artist.id);
        } else if (!album.isOwned) {
          // Album exists but wasn't marked as owned - update it
          this.albumRepository.update(album.id, {
            isOwned: true,
            localPath: albumData.localPath,
            trackCount: albumData.trackCount,
          });
        }
      }
    }

    this.scanProgress.artistsFound = artistsAdded.size;
    this.scanProgress.albumsFound = albumsAdded.size;
  }

  /**
   * Normalize string for consistent matching
   * - Convert to lowercase
   * - Remove special characters
   * - Trim whitespace
   * - Remove common articles (the, a, an)
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}

interface AlbumData {
  title: string;
  artistName: string;
  releaseYear?: number;
  trackCount: number;
  localPath: string;
}
