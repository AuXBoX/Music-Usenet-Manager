import { Router, Request, Response } from 'express';
import { MetadataService } from '../services/MetadataService';
import { ErrorResponse } from '../../shared/types';

export function createMetadataRoutes(metadataService: MetadataService): Router {
  const router = Router();

  /**
   * GET /api/metadata/artist/:name/discography
   * Get complete discography for an artist
   */
  router.get('/artist/:name/discography', async (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      if (!name || typeof name !== 'string') {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Artist name is required',
          },
        };
        return res.status(400).json(errorResponse);
      }

      const discography = await metadataService.getArtistDiscography(name);
      res.json(discography);
    } catch (error: any) {
      console.error('Error fetching discography:', error);
      
      const errorResponse: ErrorResponse = {
        error: {
          code: 'METADATA_ERROR',
          message: error.message || 'Failed to fetch artist discography',
          details: error,
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  /**
   * GET /api/metadata/artwork/:releaseGroupId
   * Get album artwork URL
   */
  router.get('/artwork/:releaseGroupId', async (req: Request, res: Response) => {
    try {
      const { releaseGroupId } = req.params;

      if (!releaseGroupId || typeof releaseGroupId !== 'string') {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Release group ID is required',
          },
        };
        return res.status(400).json(errorResponse);
      }

      const artworkUrl = await metadataService.getAlbumArtwork(releaseGroupId);
      
      if (!artworkUrl) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'NOT_FOUND',
            message: 'Artwork not found for this release',
          },
        };
        return res.status(404).json(errorResponse);
      }

      res.json({ artworkUrl });
    } catch (error: any) {
      console.error('Error fetching artwork:', error);
      
      const errorResponse: ErrorResponse = {
        error: {
          code: 'METADATA_ERROR',
          message: error.message || 'Failed to fetch album artwork',
          details: error,
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  return router;
}
