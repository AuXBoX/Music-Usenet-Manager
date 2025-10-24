import { Router, Request, Response } from 'express';
import { DownloadService } from '../services/DownloadService';
import { ErrorResponse, DownloadFilters } from '../../shared/types';

export function createDownloadRoutes(downloadService: DownloadService): Router {
  const router = Router();

  // POST /api/download/album - Initiate download for an album (orchestrated flow)
  router.post('/album', async (req: Request, res: Response) => {
    try {
      const { albumId, qualityProfileId } = req.body;

      // Validate required fields
      if (!albumId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Album ID is required',
          },
        } as ErrorResponse);
      }

      // Initiate download through orchestration service
      const result = await downloadService.initiateDownload({
        albumId,
        qualityProfileId,
      });

      res.status(201).json({
        download: result.download,
        selectedResult: result.selectedResult,
        totalResults: result.searchResults.length,
      });
    } catch (error) {
      console.error('Error initiating download:', error);

      if (error instanceof Error) {
        if (error.message.includes('not configured')) {
          return res.status(503).json({
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: error.message,
            },
          } as ErrorResponse);
        }

        if (error.message.includes('not found')) {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          } as ErrorResponse);
        }

        if (error.message.includes('No results found')) {
          return res.status(404).json({
            error: {
              code: 'NO_RESULTS',
              message: error.message,
            },
          } as ErrorResponse);
        }
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to initiate download',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // GET /api/downloads/:id/status - Get download status
  router.get('/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Update and get latest status
      const download = await downloadService.updateDownloadStatus(id);

      res.json({
        id: download.id,
        status: download.status,
        progress: download.progress,
        errorMessage: download.errorMessage,
      });
    } catch (error) {
      console.error('Error getting download status:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        } as ErrorResponse);
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get download status',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // GET /api/downloads - Get all downloads with optional filters
  router.get('/', (req: Request, res: Response) => {
    try {
      const { status, startDate, endDate } = req.query;

      const filters: DownloadFilters = {};

      if (status && typeof status === 'string') {
        if (['queued', 'downloading', 'completed', 'failed'].includes(status)) {
          filters.status = status as 'queued' | 'downloading' | 'completed' | 'failed';
        }
      }

      if (startDate && typeof startDate === 'string') {
        filters.startDate = new Date(startDate);
      }

      if (endDate && typeof endDate === 'string') {
        filters.endDate = new Date(endDate);
      }

      const downloads = downloadService.getDownloadHistory(filters);
      res.json(downloads);
    } catch (error) {
      console.error('Error getting downloads:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve downloads',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // GET /api/downloads/active - Get all active downloads
  router.get('/active', (_req: Request, res: Response) => {
    try {
      const downloads = downloadService.getActiveDownloads();
      res.json(downloads);
    } catch (error) {
      console.error('Error getting active downloads:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve active downloads',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // POST /api/downloads/update-all - Update status for all active downloads
  router.post('/update-all', async (_req: Request, res: Response) => {
    try {
      const downloads = await downloadService.updateAllActiveDownloads();
      res.json({
        updated: downloads.length,
        downloads,
      });
    } catch (error) {
      console.error('Error updating active downloads:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update active downloads',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  return router;
}
