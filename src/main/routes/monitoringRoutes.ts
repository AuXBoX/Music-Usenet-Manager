import { Router, Request, Response } from 'express';
import { MonitoringService } from '../services/MonitoringService';

export function createMonitoringRoutes(monitoringService: MonitoringService): Router {
  const router = Router();

  /**
   * GET /api/monitoring/status
   * Get monitoring service status
   */
  router.get('/status', (_req: Request, res: Response) => {
    try {
      const status = monitoringService.getStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'MONITORING_STATUS_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * GET /api/monitoring/config
   * Get monitoring configuration
   */
  router.get('/config', (_req: Request, res: Response) => {
    try {
      const config = monitoringService.getConfig();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'MONITORING_CONFIG_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/monitoring/config
   * Update monitoring configuration
   */
  router.post('/config', (req: Request, res: Response) => {
    try {
      const { enabled, schedule } = req.body;

      monitoringService.updateConfig({
        enabled,
        schedule,
      });

      const updatedConfig = monitoringService.getConfig();
      res.json(updatedConfig);
    } catch (error: any) {
      res.status(400).json({
        error: {
          code: 'MONITORING_CONFIG_UPDATE_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/monitoring/check
   * Manually trigger a monitoring check for all monitored artists
   */
  router.post('/check', async (_req: Request, res: Response) => {
    try {
      // Start the check asynchronously
      monitoringService.checkForNewReleases().catch((error) => {
        console.error('Error during manual monitoring check:', error);
      });

      res.json({
        message: 'Monitoring check started',
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'MONITORING_CHECK_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/monitoring/check/:artistId
   * Manually trigger a monitoring check for a specific artist
   */
  router.post('/check/:artistId', async (req: Request, res: Response) => {
    try {
      const { artistId } = req.params;

      // Start the check asynchronously
      monitoringService.checkArtist(artistId).catch((error) => {
        console.error(`Error checking artist ${artistId}:`, error);
      });

      res.json({
        message: `Monitoring check started for artist ${artistId}`,
      });
    } catch (error: any) {
      res.status(400).json({
        error: {
          code: 'ARTIST_CHECK_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/monitoring/start
   * Start the monitoring scheduler
   */
  router.post('/start', (_req: Request, res: Response) => {
    try {
      monitoringService.startScheduler();
      res.json({
        message: 'Monitoring scheduler started',
      });
    } catch (error: any) {
      res.status(400).json({
        error: {
          code: 'MONITORING_START_ERROR',
          message: error.message,
        },
      });
    }
  });

  /**
   * POST /api/monitoring/stop
   * Stop the monitoring scheduler
   */
  router.post('/stop', (_req: Request, res: Response) => {
    try {
      monitoringService.stopScheduler();
      res.json({
        message: 'Monitoring scheduler stopped',
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'MONITORING_STOP_ERROR',
          message: error.message,
        },
      });
    }
  });

  return router;
}
