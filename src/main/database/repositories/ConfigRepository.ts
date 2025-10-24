import { Database } from '../Database';
import { ConfigRow, SabnzbdConfig } from '../../../shared/types';

export class ConfigRepository {
  constructor(private db: Database) {}

  get(key: string): string | undefined {
    const row = this.db.get<ConfigRow>(
      'SELECT value FROM config WHERE key = ?',
      [key]
    );
    return row?.value;
  }

  set(key: string, value: string): void {
    const existing = this.get(key);
    const now = new Date().toISOString();

    if (existing) {
      this.db.run(
        'UPDATE config SET value = ?, updated_at = ? WHERE key = ?',
        [value, now, key]
      );
    } else {
      this.db.run(
        'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)',
        [key, value, now]
      );
    }
  }

  delete(key: string): void {
    this.db.run('DELETE FROM config WHERE key = ?', [key]);
  }

  getAll(): Record<string, string> {
    const rows = this.db.all<ConfigRow>('SELECT key, value FROM config');
    const config: Record<string, string> = {};
    
    for (const row of rows) {
      config[row.key] = row.value;
    }
    
    return config;
  }

  // Convenience methods for specific configs

  getSabnzbdConfig(): SabnzbdConfig | undefined {
    const url = this.get('sabnzbd_url');
    const apiKey = this.get('sabnzbd_api_key');

    if (!url || !apiKey) {
      return undefined;
    }

    return { url, apiKey };
  }

  setSabnzbdConfig(config: SabnzbdConfig): void {
    this.set('sabnzbd_url', config.url);
    this.set('sabnzbd_api_key', config.apiKey);
  }

  getLibraryPath(): string | undefined {
    return this.get('library_path');
  }

  setLibraryPath(path: string): void {
    this.set('library_path', path);
  }

  getMonitoringInterval(): number {
    const value = this.get('monitoring_interval');
    return value ? parseInt(value, 10) : 6; // Default 6 hours
  }

  setMonitoringInterval(hours: number): void {
    this.set('monitoring_interval', hours.toString());
  }
}
