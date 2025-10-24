import { Database } from '../Database';
import { Download, DownloadRow, DownloadFilters } from '../../../shared/types';
import { mapDownloadRow } from '../mappers';
import { v4 as uuidv4 } from 'uuid';

export class DownloadRepository {
  constructor(private db: Database) {}

  create(download: Omit<Download, 'id' | 'initiatedAt'>): Download {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO downloads (id, album_id, sabnzbd_id, indexer_name, status, progress, quality_profile_id, initiated_at, completed_at, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        download.albumId,
        download.sabnzbdId ?? null,
        download.indexerName ?? null,
        download.status,
        download.progress,
        download.qualityProfileId ?? null,
        now,
        download.completedAt?.toISOString() ?? null,
        download.errorMessage ?? null,
      ]
    );

    return this.findById(id)!;
  }

  findById(id: string): Download | undefined {
    const row = this.db.get<DownloadRow>(
      'SELECT * FROM downloads WHERE id = ?',
      [id]
    );
    return row ? mapDownloadRow(row) : undefined;
  }

  findBySabnzbdId(sabnzbdId: string): Download | undefined {
    const row = this.db.get<DownloadRow>(
      'SELECT * FROM downloads WHERE sabnzbd_id = ?',
      [sabnzbdId]
    );
    return row ? mapDownloadRow(row) : undefined;
  }

  findByAlbumId(albumId: string): Download[] {
    const rows = this.db.all<DownloadRow>(
      'SELECT * FROM downloads WHERE album_id = ? ORDER BY initiated_at DESC',
      [albumId]
    );
    return rows.map(mapDownloadRow);
  }

  findAll(filters?: DownloadFilters): Download[] {
    let sql = 'SELECT * FROM downloads WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.startDate) {
      sql += ' AND initiated_at >= ?';
      params.push(filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      sql += ' AND initiated_at <= ?';
      params.push(filters.endDate.toISOString());
    }

    sql += ' ORDER BY initiated_at DESC';

    const rows = this.db.all<DownloadRow>(sql, params);
    return rows.map(mapDownloadRow);
  }

  findActive(): Download[] {
    const rows = this.db.all<DownloadRow>(
      "SELECT * FROM downloads WHERE status IN ('queued', 'downloading') ORDER BY initiated_at DESC"
    );
    return rows.map(mapDownloadRow);
  }

  update(id: string, updates: Partial<Download>): Download | undefined {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.sabnzbdId !== undefined) {
      setClauses.push('sabnzbd_id = ?');
      params.push(updates.sabnzbdId);
    }

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }

    if (updates.progress !== undefined) {
      setClauses.push('progress = ?');
      params.push(updates.progress);
    }

    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = ?');
      params.push(updates.completedAt.toISOString());
    }

    if (updates.errorMessage !== undefined) {
      setClauses.push('error_message = ?');
      params.push(updates.errorMessage);
    }

    params.push(id);

    this.db.run(
      `UPDATE downloads SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  updateStatus(id: string, status: Download['status'], progress: number = 0): Download | undefined {
    const updates: Partial<Download> = { status, progress };
    
    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date();
    }

    return this.update(id, updates);
  }

  delete(id: string): void {
    this.db.run('DELETE FROM downloads WHERE id = ?', [id]);
  }
}
