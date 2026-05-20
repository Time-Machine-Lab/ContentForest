import { DatabaseSync } from "node:sqlite";
import type {
  FruitMediaDisplayRole,
  MediaAssetSourceType,
  MediaType,
} from "../../modules/media/domain/media-types.js";
import type {
  FruitMediaAttachmentRecord,
  FruitMediaAttachmentWithAssetRecord,
  MediaAssetRecord,
  MediaStoragePort,
} from "../ports/media-storage-port.js";

interface MediaAssetRow {
  id: string;
  seed_id: string;
  media_type: MediaType;
  mime_type: string;
  file_name: string;
  size_bytes: number;
  content_location: string;
  source_type: MediaAssetSourceType;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

interface FruitMediaAttachmentRow {
  attachment_id: string;
  fruit_id: string;
  media_asset_id: string;
  display_role: FruitMediaDisplayRole;
  sort_order: number;
  attached_at: string;
  id: string;
  seed_id: string;
  media_type: MediaType;
  mime_type: string;
  file_name: string;
  size_bytes: number;
  content_location: string;
  source_type: MediaAssetSourceType;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteMediaStorageAdapter implements MediaStoragePort {
  private readonly database: DatabaseSync;

  public constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath);
    this.ensureSchema();
  }

  public async createMediaAsset(record: MediaAssetRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO media_assets (
          id,
          seed_id,
          media_type,
          mime_type,
          file_name,
          size_bytes,
          content_location,
          source_type,
          source_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.mediaType,
        record.mimeType,
        record.fileName,
        record.sizeBytes,
        record.contentLocation,
        record.sourceType,
        record.sourceId,
        record.createdAt,
        record.updatedAt,
      );
  }

  public async findMediaAssetById(
    mediaAssetId: string,
  ): Promise<MediaAssetRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM media_assets WHERE id = ?")
      .get(mediaAssetId) as MediaAssetRow | undefined;
    return row === undefined ? null : this.toAssetRecord(row);
  }

  public async listMediaAssetsBySeedId(
    seedId: string,
  ): Promise<MediaAssetRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM media_assets
          WHERE seed_id = ?
          ORDER BY updated_at DESC`,
      )
      .all(seedId) as unknown as MediaAssetRow[];
    return rows.map((row) => this.toAssetRecord(row));
  }

  public async replaceFruitMediaAttachments(
    fruitId: string,
    records: FruitMediaAttachmentRecord[],
  ): Promise<void> {
    this.database.exec("BEGIN");
    try {
      this.database
        .prepare("DELETE FROM fruit_media_assets WHERE fruit_id = ?")
        .run(fruitId);
      const insert = this.database.prepare(
        `INSERT INTO fruit_media_assets (
          id,
          fruit_id,
          media_asset_id,
          display_role,
          sort_order,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      );
      for (const record of records) {
        insert.run(
          record.id,
          record.fruitId,
          record.mediaAssetId,
          record.displayRole,
          record.sortOrder,
          record.createdAt,
        );
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  public async listFruitMediaAttachments(
    fruitId: string,
  ): Promise<FruitMediaAttachmentWithAssetRecord[]> {
    return this.queryAttachments(
      "WHERE fma.fruit_id = ? ORDER BY fma.sort_order ASC, fma.created_at ASC",
      [fruitId],
    );
  }

  public async listFruitMediaAttachmentsByFruitIds(
    fruitIds: string[],
  ): Promise<FruitMediaAttachmentWithAssetRecord[]> {
    if (fruitIds.length === 0) {
      return [];
    }
    const placeholders = fruitIds.map(() => "?").join(", ");
    return this.queryAttachments(
      `WHERE fma.fruit_id IN (${placeholders}) ORDER BY fma.fruit_id ASC, fma.sort_order ASC, fma.created_at ASC`,
      fruitIds,
    );
  }

  public close(): void {
    this.database.close();
  }

  private queryAttachments(
    whereClause: string,
    params: string[],
  ): FruitMediaAttachmentWithAssetRecord[] {
    const rows = this.database
      .prepare(
        `SELECT
          fma.id AS attachment_id,
          fma.fruit_id,
          fma.media_asset_id,
          fma.display_role,
          fma.sort_order,
          fma.created_at AS attached_at,
          ma.*
        FROM fruit_media_assets fma
        INNER JOIN media_assets ma ON ma.id = fma.media_asset_id
        ${whereClause}`,
      )
      .all(...params) as unknown as FruitMediaAttachmentRow[];
    return rows.map((row) => ({
      id: row.attachment_id,
      fruitId: row.fruit_id,
      mediaAssetId: row.media_asset_id,
      displayRole: row.display_role,
      sortOrder: row.sort_order,
      createdAt: row.attached_at,
      mediaAsset: this.toAssetRecord(row),
    }));
  }

  private ensureSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
        mime_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
        content_location TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'user_upload' CHECK (source_type IN ('user_upload', 'generated_output', 'imported')),
        source_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_media_assets_seed_updated_at
        ON media_assets (seed_id, updated_at);

      CREATE INDEX IF NOT EXISTS idx_media_assets_media_type_updated_at
        ON media_assets (media_type, updated_at);

      CREATE TABLE IF NOT EXISTS fruit_media_assets (
        id TEXT PRIMARY KEY,
        fruit_id TEXT NOT NULL,
        media_asset_id TEXT NOT NULL,
        display_role TEXT NOT NULL DEFAULT 'attachment' CHECK (display_role IN ('primary', 'inline', 'reference', 'attachment')),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE (fruit_id, media_asset_id)
      );

      CREATE INDEX IF NOT EXISTS idx_fruit_media_assets_fruit_order
        ON fruit_media_assets (fruit_id, sort_order, created_at);

      CREATE INDEX IF NOT EXISTS idx_fruit_media_assets_media_asset
        ON fruit_media_assets (media_asset_id);
    `);
  }

  private toAssetRecord(row: MediaAssetRow): MediaAssetRecord {
    return {
      id: row.id,
      seedId: row.seed_id,
      mediaType: row.media_type,
      mimeType: row.mime_type,
      fileName: row.file_name,
      sizeBytes: row.size_bytes,
      contentLocation: row.content_location,
      sourceType: row.source_type,
      sourceId: row.source_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
