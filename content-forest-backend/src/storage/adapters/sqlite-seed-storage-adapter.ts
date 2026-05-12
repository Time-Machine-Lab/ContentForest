import { DatabaseSync } from "node:sqlite";
import type {
  SeedBriefRecord,
  SeedRecord,
  SeedStoragePort,
} from "../ports/seed-storage-port.js";
import type { SeedArchiveState } from "../../modules/seed/domain/seed-types.js";

interface SeedRow {
  id: string;
  title: string;
  archive_state: SeedArchiveState;
  content_location: string;
  root_node_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface SeedBriefRow {
  id: string;
  seed_id: string;
  content_location: string;
  created_at: string;
  updated_at: string;
}

export class SqliteSeedStorageAdapter implements SeedStoragePort {
  private readonly database: DatabaseSync;

  public constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath);
    this.ensureSchema();
  }

  public async createSeed(record: SeedRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO seeds (
          id,
          title,
          archive_state,
          content_location,
          root_node_id,
          root_node_type,
          created_at,
          updated_at,
          archived_at
        ) VALUES (?, ?, ?, ?, ?, 'seed', ?, ?, ?)`,
      )
      .run(
        record.id,
        record.title,
        record.archiveState,
        record.contentLocation,
        record.rootNodeId,
        record.createdAt,
        record.updatedAt,
        record.archivedAt,
      );
  }

  public async findSeedById(seedId: string): Promise<SeedRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM seeds WHERE id = ?")
      .get(seedId) as SeedRow | undefined;
    return row === undefined ? null : this.toRecord(row);
  }

  public async listSeedsByArchiveState(
    archiveState: SeedArchiveState,
  ): Promise<SeedRecord[]> {
    const rows = this.database
      .prepare(
        "SELECT * FROM seeds WHERE archive_state = ? ORDER BY updated_at DESC",
      )
      .all(archiveState) as unknown as SeedRow[];
    return rows.map((row) => this.toRecord(row));
  }

  public async saveSeed(record: SeedRecord): Promise<void> {
    this.database
      .prepare(
        `UPDATE seeds
          SET title = ?,
              archive_state = ?,
              content_location = ?,
              root_node_id = ?,
              updated_at = ?,
              archived_at = ?
          WHERE id = ?`,
      )
      .run(
        record.title,
        record.archiveState,
        record.contentLocation,
        record.rootNodeId,
        record.updatedAt,
        record.archivedAt,
        record.id,
      );
  }

  public async upsertSeedBrief(record: SeedBriefRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO seed_briefs (
          id,
          seed_id,
          content_location,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(seed_id) DO UPDATE SET
          content_location = excluded.content_location,
          updated_at = excluded.updated_at`,
      )
      .run(
        record.id,
        record.seedId,
        record.contentLocation,
        record.createdAt,
        record.updatedAt,
      );
  }

  public async findSeedBriefBySeedId(
    seedId: string,
  ): Promise<SeedBriefRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM seed_briefs WHERE seed_id = ?")
      .get(seedId) as SeedBriefRow | undefined;
    return row === undefined ? null : this.toBriefRecord(row);
  }

  public close(): void {
    this.database.close();
  }

  private ensureSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS seeds (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        archive_state TEXT NOT NULL DEFAULT 'active' CHECK (archive_state IN ('active', 'archived')),
        content_location TEXT NOT NULL,
        root_node_id TEXT NOT NULL UNIQUE,
        root_node_type TEXT NOT NULL DEFAULT 'seed' CHECK (root_node_type = 'seed'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_seeds_archive_state_updated_at
        ON seeds (archive_state, updated_at);

      CREATE TABLE IF NOT EXISTS seed_briefs (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL UNIQUE,
        content_location TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_seed_briefs_seed_id_updated_at
        ON seed_briefs (seed_id, updated_at);
    `);
  }

  private toRecord(row: SeedRow): SeedRecord {
    return {
      id: row.id,
      title: row.title,
      archiveState: row.archive_state,
      contentLocation: row.content_location,
      rootNodeId: row.root_node_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    };
  }

  private toBriefRecord(row: SeedBriefRow): SeedBriefRecord {
    return {
      id: row.id,
      seedId: row.seed_id,
      contentLocation: row.content_location,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
