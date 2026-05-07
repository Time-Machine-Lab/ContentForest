import { DatabaseSync } from "node:sqlite";
import type {
  PublicationPublisherType,
  PublicationRecord,
} from "../../modules/publication/domain/publication-types.js";
import type { PublicationStoragePort } from "../ports/publication-storage-port.js";

interface PublicationRecordRow {
  id: string;
  fruit_id: string;
  publisher_type: PublicationPublisherType;
  publication_target: string;
  publication_evidence: string;
  publication_note: string;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export class SqlitePublicationStorageAdapter implements PublicationStoragePort {
  private readonly database: DatabaseSync;

  public constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath);
    this.ensureSchema();
  }

  public async createPublicationRecord(
    record: PublicationRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO publication_records (
          id,
          fruit_id,
          publisher_type,
          publication_target,
          publication_evidence,
          publication_note,
          published_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.fruitId,
        record.publisherType,
        record.publicationTarget,
        record.publicationEvidence,
        record.publicationNote,
        record.publishedAt,
        record.createdAt,
        record.updatedAt,
      );
  }

  public async savePublicationRecord(record: PublicationRecord): Promise<void> {
    this.database
      .prepare(
        `UPDATE publication_records
          SET publication_target = ?,
              publication_evidence = ?,
              publication_note = ?,
              updated_at = ?
          WHERE id = ?`,
      )
      .run(
        record.publicationTarget,
        record.publicationEvidence,
        record.publicationNote,
        record.updatedAt,
        record.id,
      );
  }

  public async findPublicationRecordById(
    publicationRecordId: string,
  ): Promise<PublicationRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM publication_records WHERE id = ?")
      .get(publicationRecordId) as PublicationRecordRow | undefined;
    return row === undefined ? null : this.toRecord(row);
  }

  public async listPublicationRecordsByFruit(
    fruitId: string,
  ): Promise<PublicationRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM publication_records
          WHERE fruit_id = ?
          ORDER BY published_at DESC`,
      )
      .all(fruitId) as unknown as PublicationRecordRow[];
    return rows.map((row) => this.toRecord(row));
  }

  public async hasPublicationRecord(
    publicationRecordId: string,
  ): Promise<boolean> {
    const row = this.database
      .prepare("SELECT 1 AS exists_flag FROM publication_records WHERE id = ?")
      .get(publicationRecordId) as { exists_flag: number } | undefined;
    return row !== undefined;
  }

  public close(): void {
    this.database.close();
  }

  private ensureSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS publication_records (
        id TEXT PRIMARY KEY,
        fruit_id TEXT NOT NULL,
        publisher_type TEXT NOT NULL DEFAULT 'manual' CHECK (publisher_type = 'manual'),
        publication_target TEXT NOT NULL,
        publication_evidence TEXT NOT NULL,
        publication_note TEXT NOT NULL DEFAULT '',
        published_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_publication_records_fruit_published_at
        ON publication_records (fruit_id, published_at);
    `);
  }

  private toRecord(row: PublicationRecordRow): PublicationRecord {
    return {
      id: row.id,
      fruitId: row.fruit_id,
      publisherType: row.publisher_type,
      publicationTarget: row.publication_target,
      publicationEvidence: row.publication_evidence,
      publicationNote: row.publication_note,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

