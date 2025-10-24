import { Database, getDatabase, closeDatabase } from './Database';
import { ArtistRepository } from './repositories/ArtistRepository';
import { AlbumRepository } from './repositories/AlbumRepository';
import { DownloadRepository } from './repositories/DownloadRepository';
import { QualityProfileRepository } from './repositories/QualityProfileRepository';
import { IndexerRepository } from './repositories/IndexerRepository';
import { ConfigRepository } from './repositories/ConfigRepository';
import { MigrationManager } from './migrations';

export class DatabaseService {
  private db: Database;
  public artists: ArtistRepository;
  public albums: AlbumRepository;
  public downloads: DownloadRepository;
  public qualityProfiles: QualityProfileRepository;
  public indexers: IndexerRepository;
  public config: ConfigRepository;

  constructor(db: Database) {
    this.db = db;
    this.artists = new ArtistRepository(db);
    this.albums = new AlbumRepository(db);
    this.downloads = new DownloadRepository(db);
    this.qualityProfiles = new QualityProfileRepository(db);
    this.indexers = new IndexerRepository(db);
    this.config = new ConfigRepository(db);
  }

  async runMigrations(): Promise<void> {
    const migrationManager = new MigrationManager(this.db);
    migrationManager.migrate();
  }

  close(): void {
    this.db.close();
  }
}

let dbServiceInstance: DatabaseService | null = null;

export async function initializeDatabase(): Promise<DatabaseService> {
  if (!dbServiceInstance) {
    const db = await getDatabase();
    dbServiceInstance = new DatabaseService(db);
    await dbServiceInstance.runMigrations();
  }
  return dbServiceInstance;
}

export function getDatabaseService(): DatabaseService {
  if (!dbServiceInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbServiceInstance;
}

export function closeDatabaseService(): void {
  if (dbServiceInstance) {
    dbServiceInstance.close();
    dbServiceInstance = null;
  }
  closeDatabase();
}

export * from './Database';
export * from './repositories/ArtistRepository';
export * from './repositories/AlbumRepository';
export * from './repositories/DownloadRepository';
export * from './repositories/QualityProfileRepository';
export * from './repositories/IndexerRepository';
export * from './repositories/ConfigRepository';
export * from './migrations';
export * from './mappers';
