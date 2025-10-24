import { Database } from '../Database';
import { QualityProfile, QualityProfileRow } from '../../../shared/types';
import { mapQualityProfileRow } from '../mappers';
import { v4 as uuidv4 } from 'uuid';

export class QualityProfileRepository {
  constructor(private db: Database) {}

  create(profile: Omit<QualityProfile, 'id' | 'createdAt'>): QualityProfile {
    const id = uuidv4();
    const now = new Date().toISOString();

    // If this is set as default, unset all other defaults
    if (profile.isDefault) {
      this.db.run('UPDATE quality_profiles SET is_default = 0');
    }

    this.db.run(
      `INSERT INTO quality_profiles (id, name, formats, min_bitrate, max_file_size, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        profile.name,
        JSON.stringify(profile.formats),
        profile.minBitrate ?? null,
        profile.maxFileSize ?? null,
        profile.isDefault ? 1 : 0,
        now,
      ]
    );

    return this.findById(id)!;
  }

  findById(id: string): QualityProfile | undefined {
    const row = this.db.get<QualityProfileRow>(
      'SELECT * FROM quality_profiles WHERE id = ?',
      [id]
    );
    return row ? mapQualityProfileRow(row) : undefined;
  }

  findByName(name: string): QualityProfile | undefined {
    const row = this.db.get<QualityProfileRow>(
      'SELECT * FROM quality_profiles WHERE name = ?',
      [name]
    );
    return row ? mapQualityProfileRow(row) : undefined;
  }

  findAll(): QualityProfile[] {
    const rows = this.db.all<QualityProfileRow>(
      'SELECT * FROM quality_profiles ORDER BY is_default DESC, name ASC'
    );
    return rows.map(mapQualityProfileRow);
  }

  findDefault(): QualityProfile | undefined {
    const row = this.db.get<QualityProfileRow>(
      'SELECT * FROM quality_profiles WHERE is_default = 1'
    );
    return row ? mapQualityProfileRow(row) : undefined;
  }

  update(id: string, updates: Partial<QualityProfile>): QualityProfile | undefined {
    const setClauses: string[] = [];
    const params: any[] = [];

    // If setting as default, unset all other defaults first
    if (updates.isDefault === true) {
      this.db.run('UPDATE quality_profiles SET is_default = 0');
    }

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }

    if (updates.formats !== undefined) {
      setClauses.push('formats = ?');
      params.push(JSON.stringify(updates.formats));
    }

    if (updates.minBitrate !== undefined) {
      setClauses.push('min_bitrate = ?');
      params.push(updates.minBitrate);
    }

    if (updates.maxFileSize !== undefined) {
      setClauses.push('max_file_size = ?');
      params.push(updates.maxFileSize);
    }

    if (updates.isDefault !== undefined) {
      setClauses.push('is_default = ?');
      params.push(updates.isDefault ? 1 : 0);
    }

    params.push(id);

    this.db.run(
      `UPDATE quality_profiles SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  delete(id: string): void {
    this.db.run('DELETE FROM quality_profiles WHERE id = ?', [id]);
  }

  setDefault(id: string): QualityProfile | undefined {
    this.db.run('UPDATE quality_profiles SET is_default = 0');
    this.db.run('UPDATE quality_profiles SET is_default = 1 WHERE id = ?', [id]);
    return this.findById(id);
  }
}
