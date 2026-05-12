import { DatabaseSync } from "node:sqlite";
import type {
  NutrientArchiveState,
  NutrientCardStatus,
  NutrientGapSuggestionSourceType,
  NutrientGapSuggestionStatus,
  NutrientLibraryScope,
  NutrientUsageResourceType,
} from "../../modules/nutrient/domain/nutrient-types.js";
import { NUTRIENT_ARCHIVE_STATES } from "../../modules/nutrient/domain/nutrient-types.js";
import type {
  NutrientCardListFilter,
  NutrientCardRecord,
  NutrientDepositableBlockRecord,
  NutrientContentListFilter,
  NutrientContentRecord,
  NutrientGapSuggestionListFilter,
  NutrientGapSuggestionRecord,
  NutrientCardMergeRecord,
  NutrientLibraryListFilter,
  NutrientLibraryRecord,
  NutrientResearchMessageRecord,
  NutrientResearchSessionRecord,
  NutrientStoragePort,
  NutrientUsageRecord,
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
  last_researched_at: string | null;
  last_referenced_at: string | null;
  created_at: string;
  updated_at: string;
  settled_at: string | null;
  archived_at: string | null;
}

interface NutrientUsageRow {
  id: string;
  seed_id: string;
  resource_type: NutrientUsageResourceType;
  resource_id: string;
  growth_task_id: string;
  growth_attempt_id: string;
  fruit_id: string;
  used_at: string;
  created_at: string;
}

interface NutrientCardMergeRow {
  id: string;
  seed_id: string;
  source_card_id: string | null;
  target_card_id: string;
  source_title: string;
  source_content_location: string | null;
  merge_note: string;
  merged_at: string;
  created_at: string;
}

interface NutrientResearchSessionRow {
  id: string;
  seed_id: string;
  nutrient_card_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

interface NutrientResearchMessageRow {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  agent_task_id: string | null;
  trace_json: string;
  failure_reason: string | null;
  created_at: string;
}

interface NutrientDepositableBlockRow {
  id: string;
  session_id: string;
  message_id: string;
  title: string;
  markdown: string;
  created_at: string;
}

interface NutrientGapSuggestionRow {
  id: string;
  seed_id: string;
  status: NutrientGapSuggestionStatus;
  source_type: NutrientGapSuggestionSourceType;
  source_id: string | null;
  title: string;
  body_markdown: string;
  dedupe_key: string;
  adopted_card_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
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
          last_researched_at,
          last_referenced_at,
          created_at,
          updated_at,
          settled_at,
          archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        record.lastResearchedAt,
        record.lastReferencedAt,
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
              last_researched_at = ?,
              last_referenced_at = ?,
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
        record.lastResearchedAt,
        record.lastReferencedAt,
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

  public async createResearchSession(
    record: NutrientResearchSessionRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO nutrient_research_sessions (
          id,
          seed_id,
          nutrient_card_id,
          title,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.nutrientCardId,
        record.title,
        record.createdAt,
        record.updatedAt,
      );
  }

  public async findResearchSessionById(
    sessionId: string,
  ): Promise<NutrientResearchSessionRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM nutrient_research_sessions WHERE id = ?")
      .get(sessionId) as NutrientResearchSessionRow | undefined;
    return row === undefined ? null : this.toResearchSessionRecord(row);
  }

  public async saveResearchSession(
    record: NutrientResearchSessionRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `UPDATE nutrient_research_sessions
          SET seed_id = ?,
              nutrient_card_id = ?,
              title = ?,
              updated_at = ?
          WHERE id = ?`,
      )
      .run(
        record.seedId,
        record.nutrientCardId,
        record.title,
        record.updatedAt,
        record.id,
      );
  }

  public async findResearchSessionByCardId(
    cardId: string,
  ): Promise<NutrientResearchSessionRecord | null> {
    const row = this.database
      .prepare(
        `SELECT * FROM nutrient_research_sessions
          WHERE nutrient_card_id = ?
          ORDER BY updated_at DESC
          LIMIT 1`,
      )
      .get(cardId) as NutrientResearchSessionRow | undefined;
    return row === undefined ? null : this.toResearchSessionRecord(row);
  }

  public async createResearchMessage(
    record: NutrientResearchMessageRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO nutrient_research_messages (
          id,
          session_id,
          role,
          content,
          agent_task_id,
          trace_json,
          failure_reason,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.sessionId,
        record.role,
        record.content,
        record.agentTaskId,
        JSON.stringify(record.trace),
        record.failureReason,
        record.createdAt,
      );
  }

  public async listResearchMessagesBySession(
    sessionId: string,
  ): Promise<NutrientResearchMessageRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM nutrient_research_messages
          WHERE session_id = ?
          ORDER BY created_at ASC`,
      )
      .all(sessionId) as unknown as NutrientResearchMessageRow[];
    return rows.map((row) => this.toResearchMessageRecord(row));
  }

  public async createDepositableBlock(
    record: NutrientDepositableBlockRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO nutrient_depositable_blocks (
          id,
          session_id,
          message_id,
          title,
          markdown,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.sessionId,
        record.messageId,
        record.title,
        record.markdown,
        record.createdAt,
      );
  }

  public async listDepositableBlocksBySession(
    sessionId: string,
  ): Promise<NutrientDepositableBlockRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM nutrient_depositable_blocks
          WHERE session_id = ?
          ORDER BY created_at ASC`,
      )
      .all(sessionId) as unknown as NutrientDepositableBlockRow[];
    return rows.map((row) => this.toDepositableBlockRecord(row));
  }

  public async createGapSuggestion(
    record: NutrientGapSuggestionRecord,
  ): Promise<boolean> {
    const result = this.database
      .prepare(
        `INSERT OR IGNORE INTO nutrient_gap_suggestions (
          id,
          seed_id,
          status,
          source_type,
          source_id,
          title,
          body_markdown,
          dedupe_key,
          adopted_card_id,
          created_at,
          updated_at,
          resolved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.status,
        record.sourceType,
        record.sourceId,
        record.title,
        record.bodyMarkdown,
        record.dedupeKey,
        record.adoptedCardId,
        record.createdAt,
        record.updatedAt,
        record.resolvedAt,
      );
    return result.changes > 0;
  }

  public async findGapSuggestionById(
    suggestionId: string,
  ): Promise<NutrientGapSuggestionRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM nutrient_gap_suggestions WHERE id = ?")
      .get(suggestionId) as NutrientGapSuggestionRow | undefined;
    return row === undefined ? null : this.toGapSuggestionRecord(row);
  }

  public async saveGapSuggestion(
    record: NutrientGapSuggestionRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `UPDATE nutrient_gap_suggestions
          SET status = ?,
              title = ?,
              body_markdown = ?,
              adopted_card_id = ?,
              updated_at = ?,
              resolved_at = ?
          WHERE id = ?`,
      )
      .run(
        record.status,
        record.title,
        record.bodyMarkdown,
        record.adoptedCardId,
        record.updatedAt,
        record.resolvedAt,
        record.id,
      );
  }

  public async listGapSuggestionsBySeed(
    seedId: string,
    filter: NutrientGapSuggestionListFilter = {},
  ): Promise<NutrientGapSuggestionRecord[]> {
    const clauses = ["seed_id = ?"];
    const params = [seedId];
    if (filter.status !== undefined) {
      clauses.push("status = ?");
      params.push(filter.status);
    }
    const rows = this.database
      .prepare(
        `SELECT * FROM nutrient_gap_suggestions
          WHERE ${clauses.join(" AND ")}
          ORDER BY updated_at DESC`,
      )
      .all(...params) as unknown as NutrientGapSuggestionRow[];
    return rows.map((row) => this.toGapSuggestionRecord(row));
  }

  public async countGapSuggestionsBySeed(
    seedId: string,
    filter: NutrientGapSuggestionListFilter = {},
  ): Promise<number> {
    const clauses = ["seed_id = ?"];
    const params = [seedId];
    if (filter.status !== undefined) {
      clauses.push("status = ?");
      params.push(filter.status);
    }
    const row = this.database
      .prepare(
        `SELECT COUNT(*) AS count FROM nutrient_gap_suggestions
          WHERE ${clauses.join(" AND ")}`,
      )
      .get(...params) as { count: number } | undefined;
    return row?.count ?? 0;
  }

  public async createUsageRecord(record: NutrientUsageRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO nutrient_usage_records (
          id,
          seed_id,
          resource_type,
          resource_id,
          growth_task_id,
          growth_attempt_id,
          fruit_id,
          used_at,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.resourceType,
        record.resourceId,
        record.growthTaskId,
        record.growthAttemptId,
        record.fruitId,
        record.usedAt,
        record.createdAt,
      );
  }

  public async listUsageRecordsByResource(
    resourceType: NutrientUsageResourceType,
    resourceId: string,
  ): Promise<NutrientUsageRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM nutrient_usage_records
          WHERE resource_type = ? AND resource_id = ?
          ORDER BY used_at DESC`,
      )
      .all(resourceType, resourceId) as unknown as NutrientUsageRow[];
    return rows.map((row) => this.toUsageRecord(row));
  }

  public async createCardMergeRecord(
    record: NutrientCardMergeRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO nutrient_card_merge_records (
          id,
          seed_id,
          source_card_id,
          target_card_id,
          source_title,
          source_content_location,
          merge_note,
          merged_at,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.sourceCardId,
        record.targetCardId,
        record.sourceTitle,
        record.sourceContentLocation,
        record.mergeNote,
        record.mergedAt,
        record.createdAt,
      );
  }

  public async listCardMergeRecordsByTarget(
    cardId: string,
  ): Promise<NutrientCardMergeRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM nutrient_card_merge_records
          WHERE target_card_id = ?
          ORDER BY created_at DESC`,
      )
      .all(cardId) as unknown as NutrientCardMergeRow[];
    return rows.map((row) => this.toCardMergeRecord(row));
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
        last_researched_at TEXT,
        last_referenced_at TEXT,
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

      CREATE TABLE IF NOT EXISTS nutrient_research_sessions (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        nutrient_card_id TEXT,
        title TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_nutrient_research_sessions_seed_updated_at
        ON nutrient_research_sessions (seed_id, updated_at);

      CREATE INDEX IF NOT EXISTS idx_nutrient_research_sessions_card_updated_at
        ON nutrient_research_sessions (nutrient_card_id, updated_at);

      CREATE TABLE IF NOT EXISTS nutrient_research_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        agent_task_id TEXT,
        trace_json TEXT NOT NULL DEFAULT '[]',
        failure_reason TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_nutrient_research_messages_session_created_at
        ON nutrient_research_messages (session_id, created_at);

      CREATE TABLE IF NOT EXISTS nutrient_depositable_blocks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        title TEXT NOT NULL,
        markdown TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_nutrient_depositable_blocks_session_created_at
        ON nutrient_depositable_blocks (session_id, created_at);

      CREATE TABLE IF NOT EXISTS nutrient_gap_suggestions (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'adopted', 'ignored')),
        source_type TEXT NOT NULL CHECK (source_type IN ('seed_brief_gap', 'growth_input_gap', 'fruit_elimination', 'growth_failure', 'manual')),
        source_id TEXT,
        title TEXT NOT NULL,
        body_markdown TEXT NOT NULL,
        dedupe_key TEXT NOT NULL,
        adopted_card_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        resolved_at TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrient_gap_suggestions_seed_dedupe
        ON nutrient_gap_suggestions (seed_id, dedupe_key);

      CREATE INDEX IF NOT EXISTS idx_nutrient_gap_suggestions_seed_status_updated_at
        ON nutrient_gap_suggestions (seed_id, status, updated_at);

      CREATE TABLE IF NOT EXISTS nutrient_usage_records (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        resource_type TEXT NOT NULL CHECK (resource_type IN ('nutrient', 'nutrient_card')),
        resource_id TEXT NOT NULL,
        growth_task_id TEXT NOT NULL,
        growth_attempt_id TEXT NOT NULL,
        fruit_id TEXT NOT NULL,
        used_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_nutrient_usage_resource_used_at
        ON nutrient_usage_records (resource_type, resource_id, used_at);

      CREATE INDEX IF NOT EXISTS idx_nutrient_usage_seed_used_at
        ON nutrient_usage_records (seed_id, used_at);

      CREATE INDEX IF NOT EXISTS idx_nutrient_usage_fruit_id
        ON nutrient_usage_records (fruit_id);

      CREATE TABLE IF NOT EXISTS nutrient_card_merge_records (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        source_card_id TEXT,
        target_card_id TEXT NOT NULL,
        source_title TEXT NOT NULL,
        source_content_location TEXT,
        merge_note TEXT NOT NULL DEFAULT '',
        merged_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_nutrient_card_merge_target_created_at
        ON nutrient_card_merge_records (target_card_id, created_at);
    `);
    this.ensureColumn("nutrient_cards", "last_researched_at", "TEXT");
    this.ensureColumn("nutrient_cards", "last_referenced_at", "TEXT");
  }

  private ensureColumn(
    tableName: string,
    columnName: string,
    definition: string,
  ): void {
    const rows = this.database
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as unknown as Array<{ name: string }>;
    if (rows.some((row) => row.name === columnName)) {
      return;
    }
    this.database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
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
      lastResearchedAt: row.last_researched_at,
      lastReferencedAt: row.last_referenced_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      settledAt: row.settled_at,
      archivedAt: row.archived_at,
    };
  }

  private toUsageRecord(row: NutrientUsageRow): NutrientUsageRecord {
    return {
      id: row.id,
      seedId: row.seed_id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      growthTaskId: row.growth_task_id,
      growthAttemptId: row.growth_attempt_id,
      fruitId: row.fruit_id,
      usedAt: row.used_at,
      createdAt: row.created_at,
    };
  }

  private toCardMergeRecord(
    row: NutrientCardMergeRow,
  ): NutrientCardMergeRecord {
    return {
      id: row.id,
      seedId: row.seed_id,
      sourceCardId: row.source_card_id,
      targetCardId: row.target_card_id,
      sourceTitle: row.source_title,
      sourceContentLocation: row.source_content_location,
      mergeNote: row.merge_note,
      mergedAt: row.merged_at,
      createdAt: row.created_at,
    };
  }

  private toResearchSessionRecord(
    row: NutrientResearchSessionRow,
  ): NutrientResearchSessionRecord {
    return {
      id: row.id,
      seedId: row.seed_id,
      nutrientCardId: row.nutrient_card_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toResearchMessageRecord(
    row: NutrientResearchMessageRow,
  ): NutrientResearchMessageRecord {
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      agentTaskId: row.agent_task_id,
      trace: this.parseTrace(row.trace_json),
      failureReason: row.failure_reason,
      createdAt: row.created_at,
    };
  }

  private toDepositableBlockRecord(
    row: NutrientDepositableBlockRow,
  ): NutrientDepositableBlockRecord {
    return {
      id: row.id,
      sessionId: row.session_id,
      messageId: row.message_id,
      title: row.title,
      markdown: row.markdown,
      createdAt: row.created_at,
    };
  }

  private toGapSuggestionRecord(
    row: NutrientGapSuggestionRow,
  ): NutrientGapSuggestionRecord {
    return {
      id: row.id,
      seedId: row.seed_id,
      status: row.status,
      sourceType: row.source_type,
      sourceId: row.source_id,
      title: row.title,
      bodyMarkdown: row.body_markdown,
      dedupeKey: row.dedupe_key,
      adoptedCardId: row.adopted_card_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
    };
  }

  private parseTrace(value: string): Record<string, unknown>[] {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter(
            (item): item is Record<string, unknown> =>
              typeof item === "object" && item !== null && !Array.isArray(item),
          )
        : [];
    } catch {
      return [];
    }
  }
}
