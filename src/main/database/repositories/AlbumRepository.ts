import { Database } from '../Database';
import { Album, AlbumRow } from '../../../shared/types';
import { mapAlbumRow } from '../mappers';
import { v4 as uuidv4 } from 'uuid';

export class AlbumRepository {
  constructor(private db: Database) {}

  create(album: Omit<Album, 'id' | 'createdAt' | 'updatedAt'>): Album {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO albums (id, artist_id, title, release_year, track_count, artwork_url, local_path, is_owned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        album.artistId,
        album.title,
        album.releaseYear ?? null,
        album.trackCount ?? null,
        album.artworkUrl ?? null,
        album.localPath ?? null,
        album.isOwned ? 1 : 0,
        now,
        now,
      ]
    );

    return this.findById(id)!;
  }

  findById(id: string): Album | undefined {
    const row = this.db.get<AlbumRow>(
      'SELECT * FROM albums WHERE id = ?',
      [id]
    );
    return row ? mapAlbumRow(row) : undefined;
  }

  findByArtistId(artistId: string): Album[] {
    const rows = this.db.all<AlbumRow>(
      'SELECT * FROM albums WHERE artist_id = ? ORDER BY release_year DESC, title ASC',
      [artistId]
    );
    return rows.map(mapAlbumRow);
  }

  findByArtistAndTitle(artistId: string, title: string): Album | undefined {
    const row = this.db.get<AlbumRow>(
      'SELECT * FROM albums WHERE artist_id = ? AND title = ?',
      [artistId, title]
    );
    return row ? mapAlbumRow(row) : undefined;
  }

  findOwned(): Album[] {
    const rows = this.db.all<AlbumRow>(
      'SELECT * FROM albums WHERE is_owned = 1 ORDER BY created_at DESC'
    );
    return rows.map(mapAlbumRow);
  }

  findMissing(): Album[] {
    const rows = this.db.all<AlbumRow>(
      'SELECT * FROM albums WHERE is_owned = 0 ORDER BY release_year DESC'
    );
    return rows.map(mapAlbumRow);
  }

  update(id: string, updates: Partial<Album>): Album | undefined {
    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.title !== undefined) {
      setClauses.push('title = ?');
      params.push(updates.title);
    }

    if (updates.releaseYear !== undefined) {
      setClauses.push('release_year = ?');
      params.push(updates.releaseYear);
    }

    if (updates.trackCount !== undefined) {
      setClauses.push('track_count = ?');
      params.push(updates.trackCount);
    }

    if (updates.artworkUrl !== undefined) {
      setClauses.push('artwork_url = ?');
      params.push(updates.artworkUrl);
    }

    if (updates.localPath !== undefined) {
      setClauses.push('local_path = ?');
      params.push(updates.localPath);
    }

    if (updates.isOwned !== undefined) {
      setClauses.push('is_owned = ?');
      params.push(updates.isOwned ? 1 : 0);
    }

    setClauses.push('updated_at = ?');
    params.push(now);

    params.push(id);

    this.db.run(
      `UPDATE albums SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  delete(id: string): void {
    this.db.run('DELETE FROM albums WHERE id = ?', [id]);
  }

  markAsOwned(id: string, localPath: string): Album | undefined {
    return this.update(id, { isOwned: true, localPath });
  }

  markAsMissing(id: string): Album | undefined {
    return this.update(id, { isOwned: false, localPath: undefined });
  }
}
