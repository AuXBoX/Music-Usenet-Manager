import { Router, Request, Response } from 'express';
import { ConfigService } from '../services/ConfigService';
import { SabnzbdService } from '../services/SabnzbdService';
import { IndexerService } from '../services/IndexerService';
import { SabnzbdConfig, IndexerConfig, ErrorResponse } from '../../shared/types';

export function createConfigRoutes(configService: ConfigService): Router {
  const router = Router();

  // SABnzbd Configuration Routes

  // GET /api/config/sabnzbd - Get SABnzbd configuration
  router.get('/sabnzbd', (_req: Request, res: Response) => {
    try {
      const config = configService.getSabnzbdConfig();
      
      if (!config) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'SABnzbd configuration not found',
          },
        } as ErrorResponse);
      }

      res.json(config);
    } catch (error) {
      console.error('Error getting SABnzbd config:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve SABnzbd configuration',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // POST /api/config/sabnzbd - Set SABnzbd configuration
  router.post('/sabnzbd', (req: Request, res: Response) => {
    try {
      const config: SabnzbdConfig = req.body;

      if (!config.url || !config.apiKey) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'SABnzbd URL and API key are required',
          },
        } as ErrorResponse);
      }

      configService.setSabnzbdConfig(config);
      
      const savedConfig = configService.getSabnzbdConfig();
      res.json(savedConfig);
    } catch (error) {
      console.error('Error setting SABnzbd config:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save SABnzbd configuration',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // POST /api/config/sabnzbd/test - Test SABnzbd connection
  router.post('/sabnzbd/test', async (req: Request, res: Response) => {
    try {
      const config: SabnzbdConfig = req.body;

      if (!config.url || !config.apiKey) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'SABnzbd URL and API key are required',
          },
        } as ErrorResponse);
      }

      const sabnzbdService = new SabnzbdService(config);
      const isConnected = await sabnzbdService.testConnection();

      if (isConnected) {
        res.json({ success: true, message: 'Successfully connected to SABnzbd' });
      } else {
        res.status(503).json({
          error: {
            code: 'CONNECTION_FAILED',
            message: 'Failed to connect to SABnzbd',
          },
        } as ErrorResponse);
      }
    } catch (error) {
      console.error('Error testing SABnzbd connection:', error);
      res.status(503).json({
        error: {
          code: 'CONNECTION_FAILED',
          message: 'Failed to connect to SABnzbd',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // Indexer Configuration Routes

  // GET /api/config/indexers - Get all indexers
  router.get('/indexers', (_req: Request, res: Response) => {
    try {
      const indexers = configService.getIndexers();
      res.json(indexers);
    } catch (error) {
      console.error('Error getting indexers:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve indexers',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // GET /api/config/indexers/:id - Get specific indexer
  router.get('/indexers/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const indexer = configService.getIndexer(id);

      if (!indexer) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Indexer with id ${id} not found`,
          },
        } as ErrorResponse);
      }

      res.json(indexer);
    } catch (error) {
      console.error('Error getting indexer:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve indexer',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // POST /api/config/indexers - Create new indexer
  router.post('/indexers', (req: Request, res: Response) => {
    try {
      const indexerData: Omit<IndexerConfig, 'id' | 'createdAt'> = req.body;

      if (!indexerData.name || !indexerData.url || !indexerData.apiKey) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Indexer name, URL, and API key are required',
          },
        } as ErrorResponse);
      }

      const indexer = configService.createIndexer(indexerData);
      res.status(201).json(indexer);
    } catch (error) {
      console.error('Error creating indexer:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create indexer',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // PUT /api/config/indexers/:id - Update indexer
  router.put('/indexers/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: Partial<IndexerConfig> = req.body;

      const indexer = configService.updateIndexer(id, updates);
      res.json(indexer);
    } catch (error) {
      console.error('Error updating indexer:', error);
      
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
          message: 'Failed to update indexer',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // DELETE /api/config/indexers/:id - Delete indexer
  router.delete('/indexers/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      configService.deleteIndexer(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting indexer:', error);
      
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
          message: 'Failed to delete indexer',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // PATCH /api/config/indexers/:id/enable - Enable indexer
  router.patch('/indexers/:id/enable', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const indexer = configService.enableIndexer(id);
      res.json(indexer);
    } catch (error) {
      console.error('Error enabling indexer:', error);
      
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
          message: 'Failed to enable indexer',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // PATCH /api/config/indexers/:id/disable - Disable indexer
  router.patch('/indexers/:id/disable', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const indexer = configService.disableIndexer(id);
      res.json(indexer);
    } catch (error) {
      console.error('Error disabling indexer:', error);
      
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
          message: 'Failed to disable indexer',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // POST /api/config/indexers/:id/test - Test indexer connection
  router.post('/indexers/:id/test', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const indexer = configService.getIndexer(id);

      if (!indexer) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Indexer with id ${id} not found`,
          },
        } as ErrorResponse);
      }

      if (!indexer.url || !indexer.apiKey) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Indexer URL and API key are required',
          },
        } as ErrorResponse);
      }

      // Test the indexer connection
      const indexerService = new IndexerService([indexer]);
      const isConnected = await indexerService.testConnection(indexer);

      if (isConnected) {
        res.json({ success: true, message: 'Successfully connected to indexer' });
      } else {
        res.status(503).json({
          error: {
            code: 'CONNECTION_FAILED',
            message: 'Failed to connect to indexer',
          },
        } as ErrorResponse);
      }
    } catch (error) {
      console.error('Error testing indexer connection:', error);
      res.status(503).json({
        error: {
          code: 'CONNECTION_FAILED',
          message: 'Failed to test indexer connection',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // POST /api/config/indexers/test - Test indexer connection (without saving)
  router.post('/indexers/test', async (req: Request, res: Response) => {
    try {
      const indexerData: Omit<IndexerConfig, 'id' | 'createdAt'> = req.body;

      if (!indexerData.url || !indexerData.apiKey) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Indexer URL and API key are required',
          },
        } as ErrorResponse);
      }

      // Create a temporary indexer config for testing
      const tempIndexer: IndexerConfig = {
        id: 'temp',
        name: indexerData.name || 'Test',
        url: indexerData.url,
        apiKey: indexerData.apiKey,
        enabled: true,
        createdAt: new Date(),
      };

      const indexerService = new IndexerService([tempIndexer]);
      const isConnected = await indexerService.testConnection(tempIndexer);

      if (isConnected) {
        res.json({ success: true, message: 'Successfully connected to indexer' });
      } else {
        res.status(503).json({
          error: {
            code: 'CONNECTION_FAILED',
            message: 'Failed to connect to indexer',
          },
        } as ErrorResponse);
      }
    } catch (error) {
      console.error('Error testing indexer connection:', error);
      res.status(503).json({
        error: {
          code: 'CONNECTION_FAILED',
          message: 'Failed to test indexer connection',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // Library Path Configuration Routes

  // GET /api/config/library-path - Get library path
  router.get('/library-path', (_req: Request, res: Response) => {
    try {
      const path = configService.getLibraryPath();
      res.json({ path: path || '' });
    } catch (error) {
      console.error('Error getting library path:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve library path',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // POST /api/config/library-path - Set library path
  router.post('/library-path', (req: Request, res: Response) => {
    try {
      const { path } = req.body;

      if (!path || typeof path !== 'string') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Library path is required',
          },
        } as ErrorResponse);
      }

      configService.setLibraryPath(path);
      res.json({ path, success: true });
    } catch (error) {
      console.error('Error setting library path:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save library path',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  return router;
}
