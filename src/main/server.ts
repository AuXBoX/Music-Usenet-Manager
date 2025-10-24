import express, { Express } from 'express';
import { getDatabaseService } from './database';
import { ConfigService } from './services/ConfigService';
import { QualityProfileService } from './services/QualityProfileService';
import { MetadataService } from './services/MetadataService';
import { DownloadService } from './services/DownloadService';
import { MonitoringService } from './services/MonitoringService';
import { createConfigRoutes } from './routes/configRoutes';
import { createDownloadRoutes } from './routes/downloadRoutes';
import { createSearchRoutes } from './routes/searchRoutes';
import { createQualityProfileRoutes } from './routes/qualityProfileRoutes';
import { createLibraryRoutes } from './routes/libraryRoutes';
import { createMetadataRoutes } from './routes/metadataRoutes';
import { createMonitoringRoutes } from './routes/monitoringRoutes';

let server: Express | null = null;
let monitoringService: MonitoringService | null = null;
const PORT = 3001;

export async function startServer(): Promise<void> {
  if (server) {
    console.log('Server already running');
    return;
  }

  server = express();

  // Middleware
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  // Initialize services
  const dbService = getDatabaseService();
  const configService = new ConfigService(dbService.config, dbService.indexers);
  const qualityProfileService = new QualityProfileService(dbService.qualityProfiles);
  const metadataService = new MetadataService();
  const downloadService = new DownloadService(
    configService,
    qualityProfileService,
    dbService.downloads,
    dbService.albums
  );

  // Initialize monitoring service
  monitoringService = new MonitoringService(
    metadataService,
    downloadService,
    dbService.artists,
    dbService.albums
  );

  // Start the monitoring scheduler
  monitoringService.startScheduler();
  console.log('Monitoring service started');

  // API routes
  server.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Configuration routes
  server.use('/api/config', createConfigRoutes(configService));

  // Quality profile routes
  server.use('/api/quality-profiles', createQualityProfileRoutes(qualityProfileService));

  // Download routes
  server.use('/api/download', createDownloadRoutes(downloadService));
  server.use('/api/downloads', createDownloadRoutes(downloadService));

  // Search routes
  server.use('/api/search', createSearchRoutes(configService, qualityProfileService));

  // Library routes
  server.use('/api/library', createLibraryRoutes(dbService.artists, dbService.albums));

  // Metadata routes
  server.use('/api/metadata', createMetadataRoutes(metadataService));

  // Monitoring routes
  server.use('/api/monitoring', createMonitoringRoutes(monitoringService));

  // Start server
  return new Promise((resolve) => {
    server!.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
      resolve();
    });
  });
}

export function stopMonitoringService(): void {
  if (monitoringService) {
    monitoringService.stopScheduler();
    console.log('Monitoring service stopped');
  }
}

export function getMonitoringService(): MonitoringService | null {
  return monitoringService;
}
