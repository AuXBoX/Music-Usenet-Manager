import { ConfigRepository } from '../database/repositories/ConfigRepository';
import { IndexerRepository } from '../database/repositories/IndexerRepository';
import { SabnzbdConfig, IndexerConfig } from '../../shared/types';

export class ConfigService {
  constructor(
    private configRepo: ConfigRepository,
    private indexerRepo: IndexerRepository
  ) {}

  // SABnzbd Configuration
  getSabnzbdConfig(): SabnzbdConfig | undefined {
    return this.configRepo.getSabnzbdConfig();
  }

  setSabnzbdConfig(config: SabnzbdConfig): void {
    // Validate config
    if (!config.url || !config.apiKey) {
      throw new Error('SABnzbd URL and API key are required');
    }

    // Ensure URL doesn't end with slash
    const url = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;

    this.configRepo.setSabnzbdConfig({
      url,
      apiKey: config.apiKey,
    });
  }

  // Indexer Configuration
  getIndexers(): IndexerConfig[] {
    return this.indexerRepo.findAll();
  }

  getIndexer(id: string): IndexerConfig | undefined {
    return this.indexerRepo.findById(id);
  }

  getEnabledIndexers(): IndexerConfig[] {
    return this.indexerRepo.findEnabled();
  }

  createIndexer(indexer: Omit<IndexerConfig, 'id' | 'createdAt'>): IndexerConfig {
    // Validate indexer
    if (!indexer.name || !indexer.url || !indexer.apiKey) {
      throw new Error('Indexer name, URL, and API key are required');
    }

    // Ensure URL doesn't end with slash
    const url = indexer.url.endsWith('/') ? indexer.url.slice(0, -1) : indexer.url;

    return this.indexerRepo.create({
      ...indexer,
      url,
    });
  }

  updateIndexer(id: string, updates: Partial<IndexerConfig>): IndexerConfig {
    const existing = this.indexerRepo.findById(id);
    if (!existing) {
      throw new Error(`Indexer with id ${id} not found`);
    }

    // Ensure URL doesn't end with slash if provided
    if (updates.url) {
      updates.url = updates.url.endsWith('/') ? updates.url.slice(0, -1) : updates.url;
    }

    const updated = this.indexerRepo.update(id, updates);
    if (!updated) {
      throw new Error(`Failed to update indexer with id ${id}`);
    }

    return updated;
  }

  deleteIndexer(id: string): void {
    const existing = this.indexerRepo.findById(id);
    if (!existing) {
      throw new Error(`Indexer with id ${id} not found`);
    }

    this.indexerRepo.delete(id);
  }

  enableIndexer(id: string): IndexerConfig {
    const updated = this.indexerRepo.enable(id);
    if (!updated) {
      throw new Error(`Indexer with id ${id} not found`);
    }
    return updated;
  }

  disableIndexer(id: string): IndexerConfig {
    const updated = this.indexerRepo.disable(id);
    if (!updated) {
      throw new Error(`Indexer with id ${id} not found`);
    }
    return updated;
  }

  // Library Path Configuration
  getLibraryPath(): string | undefined {
    return this.configRepo.getLibraryPath();
  }

  setLibraryPath(path: string): void {
    if (!path) {
      throw new Error('Library path is required');
    }
    this.configRepo.setLibraryPath(path);
  }

  // Monitoring Interval Configuration
  getMonitoringInterval(): number {
    return this.configRepo.getMonitoringInterval();
  }

  setMonitoringInterval(hours: number): void {
    if (hours < 1) {
      throw new Error('Monitoring interval must be at least 1 hour');
    }
    this.configRepo.setMonitoringInterval(hours);
  }
}
