import { Database } from './Database';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database) => void;
  down: (db: Database) => void;
}

export class MigrationManager {
  private migrations: Migration[] = [];

  constructor(private db: Database) {
    this.registerMigrations();
  }

  private registerMigrations(): void {
    // Migration 1: Initial schema (already applied via schema.sql)
    this.migrations.push({
      version: 1,
      name: 'initial_schema',
      up: () => {
        // Schema is already created in Database.initialize()
        console.log('Initial schema already applied');
      },
      down: (db: Database) => {
        // Drop all tables
        db.run('DROP TABLE IF EXISTS downloads');
        db.run('DROP TABLE IF EXISTS albums');
        db.run('DROP TABLE IF EXISTS artists');
        db.run('DROP TABLE IF EXISTS quality_profiles');
        db.run('DROP TABLE IF EXISTS indexers');
        db.run('DROP TABLE IF EXISTS config');
      },
    });

    // Future migrations can be added here
    // Example:
    // this.migrations.push({
    //   version: 2,
    //   name: 'add_user_preferences',
    //   up: (db: Database) => {
    //     db.run('ALTER TABLE config ADD COLUMN category TEXT');
    //   },
    //   down: (db: Database) => {
    //     // SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
    //   },
    // });
  }

  getCurrentVersion(): number {
    try {
      const result = this.db.get<{ value: string }>(
        "SELECT value FROM config WHERE key = 'schema_version'"
      );
      return result ? parseInt(result.value, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  setCurrentVersion(version: number): void {
    const existing = this.db.get<{ value: string }>(
      "SELECT value FROM config WHERE key = 'schema_version'"
    );

    if (existing) {
      this.db.run(
        "UPDATE config SET value = ?, updated_at = ? WHERE key = 'schema_version'",
        [version.toString(), new Date().toISOString()]
      );
    } else {
      this.db.run(
        "INSERT INTO config (key, value, updated_at) VALUES ('schema_version', ?, ?)",
        [version.toString(), new Date().toISOString()]
      );
    }
  }

  migrate(): void {
    const currentVersion = this.getCurrentVersion();
    const targetVersion = this.migrations.length;

    if (currentVersion === targetVersion) {
      console.log(`Database is up to date (version ${currentVersion})`);
      return;
    }

    console.log(`Migrating database from version ${currentVersion} to ${targetVersion}`);

    for (let i = currentVersion; i < targetVersion; i++) {
      const migration = this.migrations[i];
      console.log(`Applying migration ${migration.version}: ${migration.name}`);
      
      try {
        migration.up(this.db);
        this.setCurrentVersion(migration.version);
        console.log(`Migration ${migration.version} applied successfully`);
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('All migrations applied successfully');
  }

  rollback(targetVersion: number = 0): void {
    const currentVersion = this.getCurrentVersion();

    if (currentVersion <= targetVersion) {
      console.log('Nothing to rollback');
      return;
    }

    console.log(`Rolling back database from version ${currentVersion} to ${targetVersion}`);

    for (let i = currentVersion - 1; i >= targetVersion; i--) {
      const migration = this.migrations[i];
      console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
      
      try {
        migration.down(this.db);
        this.setCurrentVersion(i);
        console.log(`Migration ${migration.version} rolled back successfully`);
      } catch (error) {
        console.error(`Rollback of migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('Rollback completed successfully');
  }
}
