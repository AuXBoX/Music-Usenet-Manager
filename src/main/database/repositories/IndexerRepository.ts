import { Database } from '../Database';
import { IndexerConfig, IndexerRow } from '../../../shared/types';
import { mapIndexerRow } from '../mappers';
import { v4 as uuidv4 } from 'uuid';

export class IndexerRepository {
  constructor(private db: Database) {}

  create(indexer: Omit<IndexerConfig, 'id' | 'createdAt'>): IndexerConfig {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO indexers (id, name, url, api_key, enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        indexer.name,
        indexer.url,
        indexer.apiKey,
        indexer.enabled ? 1 : 0,
        now,
      ]
    );

    return this.findById(id)!;
  }

  findById(id: string): IndexerConfig | undefined {
    const row = this.db.get<IndexerRow>(
      'SELECT * FROM indexers WHERE id = ?',
      [id]
    );
    return row ? mapIndexerRow(row) : undefined;
  }

  findAll(): IndexerConfig[] {
    const rows = this.db.all<IndexerRow>(
      'SELECT * FROM indexers ORDER BY name ASC'
    );
    return rows.map(mapIndexerRow);
  }

  findEnabled(): IndexerConfig[] {
    const rows = this.db.all<IndexerRow>(
      'SELECT * FROM indexers WHERE enabled = 1 ORDER BY name ASC'
    );
    return rows.map(mapIndexerRow);
  }

  update(id: string, updates: Partial<IndexerConfig>): IndexerConfig | undefined {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }

    if (updates.url !== undefined) {
      setClauses.push('url = ?');
      params.push(updates.url);
    }

    if (updates.apiKey !== undefined) {
      setClauses.push('api_key = ?');
      params.push(updates.apiKey);
    }

    if (updates.enabled !== undefined) {
      setClauses.push('enabled = ?');
      params.push(updates.enabled ? 1 : 0);
    }

    params.push(id);

    this.db.run(
      `UPDATE indexers SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  delete(id: string): void {
    this.db.run('DELETE FROM indexers WHERE id = ?', [id]);
  }

  enable(id: string): IndexerConfig | undefined {
    return this.update(id, { enabled: true });
  }

  disable(id: string): IndexerConfig | undefined {
    return this.update(id, { enabled: false });
  }
}
