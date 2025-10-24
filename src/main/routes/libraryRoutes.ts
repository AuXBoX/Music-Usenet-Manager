import { Router, Request, Response } from 'express';
import { LibraryService } from '../services/LibraryService';
import { ArtistRepository } from '../database/repositories/ArtistRepository';
import { AlbumRepository } from '../database/repositories/AlbumRepository';
import { ErrorResponse } from '../../shared/types';

export function createLibraryRoutes(
  artistRepository: ArtistRepository,
  albumRepository: AlbumRepository
): Router {
  const router = Router();
  const libraryService = new LibraryService(artistRepository, albumRepository);

  /**
   * POST /api/library/scan
   * Start a library scan
   */
  router.post('/scan', async (req: Request, res: Response) => {
    try {
      const { path } = req.body;

      if (!path || typeof path !== 'string') {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Library path is required',
          },
        };
        return res.status(400).json(errorResponse);
      }

      const result = await libraryService.scanLibrary(path);
      res.json(result);
    } catch (error: any) {
      console.error('Library scan error:', error);
      
      const errorResponse: ErrorResponse = {
        error: {
          code: 'SCAN_FAILED',
          message: error.message || 'Failed to scan library',
          details: error,
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  /**
   * GET /api/library/scan/status
   * Get current scan progress
   */
  router.get('/scan/status', (_req: Request, res: Response) => {
    try {
      const status = libraryService.getScanStatus();
      res.json(status);
    } catch (error: any) {
      console.error('Error getting scan status:', error);
      
      const errorResponse: ErrorResponse = {
        error: {
          code: 'STATUS_ERROR',
          message: 'Failed to get scan status',
          details: error,
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  /**
   * GET /api/library/artists
   * Get all artists with optional filtering and sorting
   */
  router.get('/artists', (req: Request, res: Response) => {
    try {
      const { search, monitored, sortBy, sortOrder } = req.query;

      const filters: any = {};
      
      if (search) {
        filters.search = search as string;
      }
      
      if (monitored !== undefined) {
        filters.monitored = monitored === 'true';
      }
      
      if (sortBy) {
        filters.sortBy = sortBy as 'name' | 'albumCount';
      }
      
      if (sortOrder) {
        filters.sortOrder = sortOrder as 'asc' | 'desc';
      }

      const artists = artistRepository.findAll(filters);
      res.json(artists);
    } catch (error: any) {
      console.error('Error fetching artists:', error);
      
      const errorResponse: ErrorResponse = {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch artists',
          details: error,
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  /**
   * GET /api/library/artists/:id
   * Get artist details by ID
   */
  router.get('/artists/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const artist = artistRepository.findById(id);

      if (!artist) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'NOT_FOUND',
            message: 'Artist not found',
          },
        };
        return res.status(404).json(errorResponse);
      }

      res.json(artist);
    } catch (error: any) {
      console.error('Error fetching artist:', error);
      
      const errorResponse: ErrorResponse = {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch artist',
          details: error,
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  /**
   * GET /api/library/albums/:id
   * Get album details by ID
   */
  router.get('/albums/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const album = albumRepository.findById(id);

      if (!album) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'NOT_FOUND',
            message: 'Album not found',
          },
        };
        return res.status(404).json(errorResponse);
      }

      res.json(album);
    } catch (error: any) {
      console.error('Error fetching album:', error);
      
      const errorResponse: ErrorResponse = {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch album',
          details: error,
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  /**
   * GET /api/library/artists/:id/albums
   * Get all albums for a specific artist
   */
  router.get('/artists/:id/albums', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Verify artist exists
      const artist = artistRepository.findById(id);
      if (!artist) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'NOT_FOUND',
            message: 'Artist not found',
          },
        };
        return res.status(404).json(errorResponse);
      }

      const albums = albumRepository.findByArtistId(id);
      res.json(albums);
    } catch (error: any) {
      console.error('Error fetching albums:', error);
      
      const errorResponse: ErrorResponse = {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch albums',
          details: error,
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  /**
   * PUT /api/library/artists/:id/monitor
   * Update artist monitoring status
   */
  router.put('/artists/:id/monitor', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { monitored } = req.body;

      if (typeof monitored !== 'boolean') {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Monitored status must be a boolean',
          },
        };
        return res.status(400).json(errorResponse);
      }

      const artist = artistRepository.update(id, { monitored });

      if (!artist) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'NOT_FOUND',
            message: 'Artist not found',
          },
        };
        return res.status(404).json(errorResponse);
      }

      res.json(artist);
    } catch (error: any) {
      console.error('Error updating artist:', error);
      
      const errorResponse: ErrorResponse = {
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update artist',
          details: error,
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  return router;
}
