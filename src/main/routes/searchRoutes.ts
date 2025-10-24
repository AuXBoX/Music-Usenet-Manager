import { Router, Request, Response } from 'express';
import { ConfigService } from '../services/ConfigService';
import { IndexerService } from '../services/IndexerService';
import { QualityProfileService } from '../services/QualityProfileService';
import { ErrorResponse, SearchResult } from '../../shared/types';

export function createSearchRoutes(
  configService: ConfigService,
  qualityProfileService: QualityProfileService
): Router {
  const router = Router();

  // POST /api/search/album - Search for an album across all enabled indexers
  router.post('/album', async (req: Request, res: Response) => {
    try {
      const { artist, album, qualityProfileId } = req.body;

      // Validate required parameters
      if (!artist || !album) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Artist and album parameters are required',
          },
        } as ErrorResponse);
      }

      // Get enabled indexers
      const indexers = configService.getEnabledIndexers();

      if (indexers.length === 0) {
        return res.status(400).json({
          error: {
            code: 'NO_INDEXERS',
            message: 'No enabled indexers configured. Please configure at least one indexer.',
          },
        } as ErrorResponse);
      }

      // Get quality profile if specified
      let qualityProfile;
      if (qualityProfileId) {
        qualityProfile = qualityProfileService.getProfile(qualityProfileId);
        if (!qualityProfile) {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: `Quality profile with id ${qualityProfileId} not found`,
            },
          } as ErrorResponse);
        }
      } else {
        // Use default quality profile if not specified
        qualityProfile = qualityProfileService.getDefaultProfile();
      }

      // Create indexer service and search
      const indexerService = new IndexerService(indexers, qualityProfileService);
      const results: SearchResult[] = await indexerService.searchAlbum(
        artist,
        album,
        qualityProfile
      );

      res.json({
        artist,
        album,
        qualityProfile: qualityProfile?.name,
        resultCount: results.length,
        results,
      });
    } catch (error) {
      console.error('Error searching for album:', error);
      res.status(500).json({
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search for album',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  return router;
}
