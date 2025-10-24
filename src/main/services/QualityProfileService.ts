import { QualityProfileRepository } from '../database/repositories/QualityProfileRepository';
import { QualityProfile, SearchResult } from '../../shared/types';

export class QualityProfileService {
  constructor(private qualityProfileRepo: QualityProfileRepository) {}

  // CRUD Operations

  getAllProfiles(): QualityProfile[] {
    return this.qualityProfileRepo.findAll();
  }

  getProfile(id: string): QualityProfile | undefined {
    return this.qualityProfileRepo.findById(id);
  }

  getDefaultProfile(): QualityProfile | undefined {
    return this.qualityProfileRepo.findDefault();
  }

  createProfile(profile: Omit<QualityProfile, 'id' | 'createdAt'>): QualityProfile {
    // Validate profile
    if (!profile.name) {
      throw new Error('Quality profile name is required');
    }

    if (!profile.formats || profile.formats.length === 0) {
      throw new Error('At least one format must be specified');
    }

    // Check for duplicate name
    const existing = this.qualityProfileRepo.findByName(profile.name);
    if (existing) {
      throw new Error(`Quality profile with name "${profile.name}" already exists`);
    }

    // Validate formats
    const validFormats = ['FLAC', 'MP3', 'M4A', 'AAC', 'OGG', 'WAV', 'ALAC'];
    for (const format of profile.formats) {
      if (!validFormats.includes(format.toUpperCase())) {
        throw new Error(`Invalid format: ${format}. Valid formats are: ${validFormats.join(', ')}`);
      }
    }

    // Validate bitrate if provided
    if (profile.minBitrate !== undefined && profile.minBitrate < 0) {
      throw new Error('Minimum bitrate must be a positive number');
    }

    // Validate file size if provided
    if (profile.maxFileSize !== undefined && profile.maxFileSize < 0) {
      throw new Error('Maximum file size must be a positive number');
    }

    return this.qualityProfileRepo.create(profile);
  }

  updateProfile(id: string, updates: Partial<QualityProfile>): QualityProfile {
    const existing = this.qualityProfileRepo.findById(id);
    if (!existing) {
      throw new Error(`Quality profile with id ${id} not found`);
    }

    // Check for duplicate name if name is being updated
    if (updates.name && updates.name !== existing.name) {
      const duplicate = this.qualityProfileRepo.findByName(updates.name);
      if (duplicate) {
        throw new Error(`Quality profile with name "${updates.name}" already exists`);
      }
    }

    // Validate formats if provided
    if (updates.formats) {
      if (updates.formats.length === 0) {
        throw new Error('At least one format must be specified');
      }

      const validFormats = ['FLAC', 'MP3', 'M4A', 'AAC', 'OGG', 'WAV', 'ALAC'];
      for (const format of updates.formats) {
        if (!validFormats.includes(format.toUpperCase())) {
          throw new Error(`Invalid format: ${format}. Valid formats are: ${validFormats.join(', ')}`);
        }
      }
    }

    // Validate bitrate if provided
    if (updates.minBitrate !== undefined && updates.minBitrate < 0) {
      throw new Error('Minimum bitrate must be a positive number');
    }

    // Validate file size if provided
    if (updates.maxFileSize !== undefined && updates.maxFileSize < 0) {
      throw new Error('Maximum file size must be a positive number');
    }

    const updated = this.qualityProfileRepo.update(id, updates);
    if (!updated) {
      throw new Error(`Failed to update quality profile with id ${id}`);
    }

    return updated;
  }

  deleteProfile(id: string): void {
    const existing = this.qualityProfileRepo.findById(id);
    if (!existing) {
      throw new Error(`Quality profile with id ${id} not found`);
    }

    // Prevent deletion of default profile
    if (existing.isDefault) {
      throw new Error('Cannot delete the default quality profile. Set another profile as default first.');
    }

    this.qualityProfileRepo.delete(id);
  }

  setDefaultProfile(id: string): QualityProfile {
    const profile = this.qualityProfileRepo.findById(id);
    if (!profile) {
      throw new Error(`Quality profile with id ${id} not found`);
    }

    const updated = this.qualityProfileRepo.setDefault(id);
    if (!updated) {
      throw new Error(`Failed to set quality profile with id ${id} as default`);
    }

    return updated;
  }

  // Quality Filtering and Ranking

  /**
   * Filter search results based on quality profile criteria
   */
  filterResults(results: SearchResult[], profile: QualityProfile): SearchResult[] {
    return results.filter((result) => {
      // Check format
      const format = result.quality.format.toUpperCase();
      const acceptedFormats = profile.formats.map((f) => f.toUpperCase());
      if (!acceptedFormats.includes(format)) {
        return false;
      }

      // Check minimum bitrate
      if (profile.minBitrate && result.quality.bitrate) {
        if (result.quality.bitrate < profile.minBitrate) {
          return false;
        }
      }

      // Check maximum file size (convert MB to bytes)
      if (profile.maxFileSize) {
        const maxSizeBytes = profile.maxFileSize * 1024 * 1024;
        if (result.size > maxSizeBytes) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Rank search results based on quality criteria
   * Higher score = better quality
   */
  rankResults(results: SearchResult[], profile: QualityProfile): SearchResult[] {
    const scored = results.map((result) => {
      let score = 0;

      // Format preference based on profile order
      const format = result.quality.format.toUpperCase();
      const formatIndex = profile.formats.findIndex((f) => f.toUpperCase() === format);
      
      if (formatIndex !== -1) {
        // Higher score for formats earlier in the profile list
        score += (profile.formats.length - formatIndex) * 20;
      }

      // Bitrate score (higher is better, up to 320kbps for lossy, 1411kbps for lossless)
      if (result.quality.bitrate) {
        const isLossless = ['FLAC', 'ALAC', 'WAV'].includes(format);
        const maxBitrate = isLossless ? 1411 : 320;
        const bitrateScore = Math.min((result.quality.bitrate / maxBitrate) * 50, 50);
        score += bitrateScore;
      }

      // Age penalty (newer is better, penalize older releases)
      // Age is in days, penalize 1 point per day up to 30 days
      const agePenalty = Math.min(result.age, 30);
      score -= agePenalty;

      // Size preference (prefer reasonable sizes, penalize extremes)
      const sizeMB = result.size / (1024 * 1024);
      if (sizeMB < 10) {
        // Too small, likely low quality
        score -= 20;
      } else if (sizeMB > 500) {
        // Too large, might be unnecessary
        score -= 10;
      }

      return { result, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map((item) => item.result);
  }

  /**
   * Select the best result from filtered and ranked results
   */
  selectBestResult(results: SearchResult[], profile: QualityProfile): SearchResult | undefined {
    const filtered = this.filterResults(results, profile);
    if (filtered.length === 0) {
      return undefined;
    }

    const ranked = this.rankResults(filtered, profile);
    return ranked[0];
  }
}
