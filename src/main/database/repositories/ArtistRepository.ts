import { Database } from '../Database';
import { Artist, ArtistRow, ArtistFilters } from '../../../shared/types';
import { mapArtistRow } from '../mappers';
import { v4 as uuidv4 } from 'uuid';

export class ArtistRepository {
  constructor(private db: Database) {}

  create(artist: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>): Artist {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO artists (id, name, monitored, album_count, last_checked, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        artist.name,
        artist.monitored ? 1 : 0,
        artist.albumCount,
        artist.lastChecked?.toISOString() ?? null,
        now,
        now,
      ]
    );

    return this.findById(id)!;
  }

  findById(id: string): Artist | undefined {
    const row = this.db.get<ArtistRow>(
      'SELECT * FROM artists WHERE id = ?',
      [id]
    );
    return row ? mapArtistRow(row) : undefined;
  }

  findByName(name: string): Artist | undefined {
    const row = this.db.get<ArtistRow>(
      'SELECT * FROM artists WHERE name = ?',
      [name]
    );
    return row ? mapArtistRow(row) : undefined;
  }

  findAll(filters?: ArtistFilters): Artist[] {
    let sql = 'SELECT * FROM artists WHERE 1=1';
    const params: any[] = [];

    if (filters?.search) {
      sql += ' AND name LIKE ?';
      params.push(`%${filters.search}%`);
    }

    if (filters?.monitored !== undefined) {
      sql += ' AND monitored = ?';
      params.push(filters.monitored ? 1 : 0);
    }

    // Sorting
    const sortBy = filters?.sortBy ?? 'name';
    const sortOrder = filters?.sortOrder ?? 'asc';
    
    if (sortBy === 'name') {
      sql += ` ORDER BY name ${sortOrder.toUpperCase()}`;
    } else if (sortBy === 'albumCount') {
      sql += ` ORDER BY album_count ${sortOrder.toUpperCase()}`;
    }

    const rows = this.db.all<ArtistRow>(sql, params);
    return rows.map(mapArtistRow);
  }

  update(id: string, updates: Partial<Artist>): Artist | undefined {
    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }

    if (updates.monitored !== undefined) {
      setClauses.push('monitored = ?');
      params.push(updates.monitored ? 1 : 0);
    }

    if (updates.albumCount !== undefined) {
      setClauses.push('album_count = ?');
      params.push(updates.albumCount);
    }

    if (updates.lastChecked !== undefined) {
      setClauses.push('last_checked = ?');
      params.push(updates.lastChecked.toISOString());
    }

    setClauses.push('updated_at = ?');
    params.push(now);

    params.push(id);

    this.db.run(
      `UPDATE artists SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  delete(id: string): void {
    this.db.run('DELETE FROM artists WHERE id = ?', [id]);
  }

  getMonitored(): Artist[] {
    const rows = this.db.all<ArtistRow>(
      'SELECT * FROM artists WHERE monitored = 1'
    );
    return rows.map(mapArtistRow);
  }

  incrementAlbumCount(artistId: string): void {
    this.db.run(
      'UPDATE artists SET album_count = album_count + 1, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), artistId]
    );
  }

  decrementAlbumCount(artistId: string): void {
    this.db.run(
      'UPDATE artists SET album_count = CASE WHEN album_count > 0 THEN album_count - 1 ELSE 0 END, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), artistId]
    );
  }
}
