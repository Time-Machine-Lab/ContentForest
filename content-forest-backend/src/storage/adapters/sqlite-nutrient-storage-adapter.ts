import { DatabaseSync } from "node:sqlite";
import type {
  NutrientArchiveState,
  NutrientCardStatus,
  NutrientLibraryScope,
} from "../../modules/nutrient/domain/nutrient-types.js";
import { NUTRIENT_ARCHIVE_STATES } from "../../modules/nutrient/domain/nutrient-types.js";
import type {
  NutrientCardListFilter,
  NutrientCardRecord,
  NutrientContentListFilter,
  NutrientContentRecord,
  NutrientLibraryListFilter,
  NutrientLibraryRecord,
  NutrientStoragePort,
  ReferableNutrientContentRecord,
} from "../ports/nutrient-storage-port.js";

interface NutrientLibraryRow {
  id: string;
  name: string;
  description: string;
  scope: NutrientLibraryScope;
  seed_id: string | null;
  archive_state: NutrientArchiveState;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface NutrientContentRow {
  id: string;
  library_id: string;
  title: string;
  archive_state: NutrientArchiveState;
  content_location: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface NutrientCardRow {
  id: string;
  seed_id: string;
  title: string;
  status: NutrientCardStatus;
  content_location: string;
  settled_content_id: string | null;
  default_for_growth: number;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
  settled_at: string | null;
  archived_at: string | null;
}

interface ReferableRow extends NutrientContentRow {
  library_name: string;
  library_description: string;
  library_scope: NutrientLibraryScope;
  library_seed_id: string | null;
  library_archive_state: NutrientArchiveState;
  library_created_at: string;
  library_updated_at: string;
  library_archived_at: string | null;
  default_for_growth: number;
}

export class SqliteNutrientStorageAdapter implements NutrientStoragePort {
  private readonly database: DatabaseSync;

  public constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath);
    this.ensureSchema();
  }

  public async createLibrary(record: NutrientLibraryRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO nutrient_libraries (
          id,
          name,
          description,
          scope,
          seed_id,
          archive_state,
          created_at,
          updated_at,
          archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.name,
        record.description,
        record.scope,
        record.seedId,
        record.archiveState,
        record.createdAt,
        record.updatedAt,
        record.archivedAt,
      );
  }

  public async findLibraryById(
    libraryId: string,
  ): Promise<NutrientLibraryRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM nutrient_libraries WHERE id = ?")
      .get(libraryId) as NutrientLibraryRow | undefined;
    return row === undefined ? null : this.toLibraryRecord(row);
  }

  public async saveLibrary(record: NutrientLibraryRecord): Promise<void> {
    this.database
      .prepare(
        `UPDATE nutrient_libraries
          SET name = ?,
              description = ?,
              scope = ?,
              seed_id = ?,
              archive_state = ?,
              updated_at = ?,
              archived_at = ?
          WHERE id = ?`,
      )
      .run(
        record.name,
        record.description,
        record.scope,
        record.seedId,
        record.archiveState,
        record.updatedAt,
        record.archivedAt,
        record.id,
      );
  }

  public async listLibraries(
    filter: NutrientLibraryListFilter = {},
  ): Promise<NutrientLibraryRecord[]> {
    const clauses: string[] = [];
    const params: string[] = [];
    if (filter.scope !== undefined) {
      clauses.push("scope = ?");
      params.push(filter.scope);
    }
    if (filter.archiveState !== undefined) {
      clauses.push("archive_state = ?");
      params.push(filter.archiveState);
    }
    if (filter.seedId !== undefined) {
      clauses.push("seed_id = ?");
      params.push(filter.seedId);
    }

    const where = clauses.length === 0 ? "" : ` WHERE ${clauses.join(" AND ")}`;
    const rows = this.database
      .prepare(`SELECT * FROM nutrient_libraries${where} ORDER BY updated_at DESC`)
      .all(...params) as unknown as NutrientLibraryRow[];
    return rows.map((row) => this.toLibraryRecord(row));
  }

  public async countContentsByLibrary(libraryId: string): Promise<number> {
    const row = this.database
      .prepare("SELECT COUNT(*) AS count FROM nutrient_contents WHERE library_id = ?")
      .get(libraryId) as { count: number } | undefined;
    return row?.count ?? 0;
  }

  public async createContent(record: NutrientContentRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO nutrient_contents (
          id,
          library_id,
          title,
          archive_state,
          content_location,
          created_at,
          updated_at,
          archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.libraryId,
        record.title,
        record.archiveState,
        record.contentLocation,
        record.createdAt,
        record.updatedAt,
        record.archivedAt,
      );
  }

  public async findContentById(
    contentId: string,
  ): Promise<NutrientContentRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM nutrient_contents WHERE id = ?")
      .get(contentId) as NutrientContentRow | undefined;
    return row === undefined ? null : this.toContentRecord(row);
  }

  public async saveContent(record: NutrientContentRecord): Promise<void> {
    this.database
      .prepare(
        `UPDATE nutrient_contents
          SET title = ?,
              archive_state = ?,
              content_location = ?,
              updated_at = ?,
              archived_at = ?
          WHERE id = ?`,
      )
      .run(
        record.title,
        record.archiveState,
        record.contentLocation,
        record.updatedAt,
        record.archivedAt,
        record.id,
      );
  }

  public async listContentsByLibrary(
    libraryId: string,
    filter: NutrientContentListFilter = {},
  ): Promise<NutrientContentRecord[]> {
    const clauses = ["library_id = ?"];
    const params = [libraryId];
    if (filter.archiveState !== undefined) {
      clauses.push("archive_state = ?");
      params.push(filter.archiveState);
    }

    const rows = this.database
      .prepare(
        `SELECT * FROM nutrient_contents
          WHERE ${clauses.join(" AND ")}
          ORDER BY updated_at DESC`,
      )
      .all(...params) as unknown as NutrientContentRow[];
    return rows.map((row) => this.toContentRecord(row));
  }

  public async listReferableContents(
    seedId: string,
  ): Promise<ReferableNutrientContentRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT
            c.*,
            l.name AS library_name,
            l.description AS library_description,
            l.scope AS library_scope,
            l.seed_id AS library_seed_id,
            l.archive_state AS library_archive_state,
            l.created_at AS library_created_at,
            l.updated_at AS library_updated_at,
            l.archived_at AS library_archived_at,
            CASE
              WHEN EXISTS (
                SELECT 1 FROM nutrient_cards default_card
                WHERE default_card.settled_content_id = c.id
                  AND default_card.status = 'settled'
                  AND default_card.default_for_growth = 1
              )
              THEN 1
              ELSE 0
            END AS default_for_growth
          FROM nutrient_contents c
          INNER JOIN nutrient_libraries l ON l.id = c.library_id
          WHERE c.archive_state = ?
            AND l.archive_state = ?
            AND (l.scope = 'public' OR l.seed_id = ?)
            AND NOT EXISTS (
              SELECT 1 FROM nutrient_cards card
              WHERE card.settled_content_id = c.id
                AND card.status = 'archived'
            )
          ORDER BY c.updated_at DESC`,
      )
      .all(
        NUTRIENT_ARCHIVE_STATES.active,
        NUTRIENT_ARCHIVE_STATES.active,
        seedId,
      ) as unknown as ReferableRow[];
    return rows.map((row) => ({
      content: this.toContentRecord(row),
      library: {
        id: row.library_id,
        name: row.library_name,
        description: row.library_description,
        scope: row.library_scope,
        seedId: row.library_seed_id,
        archiveState: row.library_archive_state,
        createdAt: row.library_created_at,
        updatedAt: row.library_updated_at,
        archivedAt: row.library_archived_at,
      },
      defaultForGrowth: row.default_for_growth === 1,
    }));
  }

  public async createCard(record: NutrientCardRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO nutrient_cards (
          id,
          seed_id,
          title,
          status,
          content_location,
          settled_content_id,
          default_for_growth,
          conversation_id,
          created_at,
          updated_at,
          settled_at,
          archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.title,
        record.status,
        record.contentLocation,
        record.settledContentId,
        record.defaultForGrowth ? 1 : 0,
        record.conversationId,
        record.createdAt,
        record.updatedAt,
        record.settledAt,
        record.archivedAt,
      );
  }

  public async findCardById(cardId: string): Promise<NutrientCardRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM nutrient_cards WHERE id = ?")
      .get(cardId) as NutrientCardRow | undefined;
    return row === undefined ? null : this.toCardRecord(row);
  }

  public async saveCard(record: NutrientCardRecord): Promise<void> {
    this.database
      .prepare(
        `UPDATE nutrient_cards
          SET title = ?,
              status = ?,
              content_location = ?,
              settled_content_id = ?,
              default_for_growth = ?,
              conversation_id = ?,
              updated_at = ?,
              settled_at = ?,
              archived_at = ?
          WHERE id = ?`,
      )
      .run(
        record.title,
        record.status,
        record.contentLocation,
        record.settledContentId,
        record.defaultForGrowth ? 1 : 0,
        record.conversationId,
        record.updatedAt,
        record.settledAt,
        record.archivedAt,
        record.id,
      );
  }

  public async listCardsBySeed(
    seedId: string,
    filter: NutrientCardListFilter = {},
  ): Promise<NutrientCardRecord[]> {
    const clauses = ["seed_id = ?"];
    const params = [seedId];
    if (filter.status !== undefined) {
      clauses.push("status = ?");
      params.push(filter.status);
    }
    const rows = this.database
      .prepare(
        `SELECT * FROM nutrient_cards
          WHERE ${clauses.join(" AND ")}
          ORDER BY updated_at DESC`,
      )
      .all(...params) as unknown as NutrientCardRow[];
    return rows.map((row) => this.toCardRecord(row));
  }

  public async findCardsBySettledContentIds(
    contentIds: string[],
  ): Promise<NutrientCardRecord[]> {
    if (contentIds.length === 0) {
      return [];
    }
    const placeholders = contentIds.map(() => "?").join(", ");
    const rows = this.database
      .prepare(
        `SELECT * FROM nutrient_cards
          WHERE settled_content_id IN (${placeholders})`,
      )
      .all(...contentIds) as unknown as NutrientCardRow[];
    return rows.map((row) => this.toCardRecord(row));
  }

  public close(): void {
    this.database.close();
  }

  private ensureSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS nutrient_libraries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        scope TEXT NOT NULL CHECK (scope IN ('public', 'seed_scoped')),
        seed_id TEXT,
        archive_state TEXT NOT NULL DEFAULT 'active' CHECK (archive_state IN ('active', 'archived')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT,
        CHECK (
          (scope = 'public' AND seed_id IS NULL)
          OR
          (scope = 'seed_scoped' AND seed_id IS NOT NULL)
        )
      );

      CREATE INDEX IF NOT EXISTS idx_nutrient_libraries_scope_archive_updated_at
        ON nutrient_libraries (scope, archive_state, updated_at);

      CREATE INDEX IF NOT EXISTS idx_nutrient_libraries_seed_archive_updated_at
        ON nutrient_libraries (seed_id, archive_state, updated_at);

      CREATE TABLE IF NOT EXISTS nutrient_contents (
        id TEXT PRIMARY KEY,
        library_id TEXT NOT NULL,
        title TEXT NOT NULL,
        archive_state TEXT NOT NULL DEFAULT 'active' CHECK (archive_state IN ('active', 'archived')),
        content_location TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_nutrient_contents_library_archive_updated_at
        ON nutrient_contents (library_id, archive_state, updated_at);

      CREATE TABLE IF NOT EXISTS nutrient_cards (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'unsettled' CHECK (status IN ('unsettled', 'settled', 'archived')),
        content_location TEXT NOT NULL,
        settled_content_id TEXT,
        default_for_growth INTEGER NOT NULL DEFAULT 0 CHECK (default_for_growth IN (0, 1)),
        conversation_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        settled_at TEXT,
        archived_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_nutrient_cards_seed_status_updated_at
        ON nutrient_cards (seed_id, status, updated_at);

      CREATE INDEX IF NOT EXISTS idx_nutrient_cards_settled_content_id
        ON nutrient_cards (settled_content_id);

      CREATE INDEX IF NOT EXISTS idx_nutrient_cards_seed_default_for_growth
        ON nutrient_cards (seed_id, default_for_growth);
    `);
  }

  private toLibraryRecord(row: NutrientLibraryRow): NutrientLibraryRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      scope: row.scope,
      seedId: row.seed_id,
      archiveState: row.archive_state,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    };
  }

  private toContentRecord(row: NutrientContentRow): NutrientContentRecord {
    return {
      id: row.id,
      libraryId: row.library_id,
      title: row.title,
      archiveState: row.archive_state,
      contentLocation: row.content_location,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    };
  }

  private toCardRecord(row: NutrientCardRow): NutrientCardRecord {
    return {
      id: row.id,
      seedId: row.seed_id,
      title: row.title,
      status: row.status,
      contentLocation: row.content_location,
      settledContentId: row.settled_content_id,
      defaultForGrowth: row.default_for_growth === 1,
      conversationId: row.conversation_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      settledAt: row.settled_at,
      archivedAt: row.archived_at,
    };
  }
}
