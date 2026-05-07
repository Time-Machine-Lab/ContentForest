import { DatabaseSync } from "node:sqlite";
import {
  GENE_INSIGHT_STATUSES,
  type GeneEvidenceSource,
  type GeneExtractionTaskStatus,
  type GeneInsightStatus,
  type GeneReminderStatus,
  type GeneSuggestionStatus,
} from "../../modules/gene/domain/gene-types.js";
import type {
  GeneExtractionReminderRecord,
  GeneExtractionTaskRecord,
  GeneInsightRecord,
  GeneLibraryRecord,
  GeneStoragePort,
  GeneSuggestionRecord,
} from "../ports/gene-storage-port.js";

interface GeneLibraryRow {
  seed_id: string;
  content_location: string;
  created_at: string;
  updated_at: string;
}

interface GeneReminderRow {
  id: string;
  seed_id: string;
  status: GeneReminderStatus;
  evidence_sources_json: string;
  created_at: string;
  updated_at: string;
}

interface GeneTaskRow {
  id: string;
  seed_id: string;
  status: GeneExtractionTaskStatus;
  failure_reason: string | null;
  evidence_sources_json: string;
  agent_input_json: string;
  created_at: string;
  updated_at: string;
}

interface GeneSuggestionRow {
  id: string;
  seed_id: string;
  task_id: string;
  status: GeneSuggestionStatus;
  title: string;
  body_markdown: string;
  lineage: string;
  niche: string;
  evidence_sources_json: string;
  created_at: string;
  updated_at: string;
}

interface GeneInsightRow {
  id: string;
  seed_id: string;
  suggestion_id: string | null;
  status: GeneInsightStatus;
  title: string;
  lineage: string;
  niche: string;
  content_location: string;
  evidence_sources_json: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export class SqliteGeneStorageAdapter implements GeneStoragePort {
  private readonly database: DatabaseSync;

  public constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath);
    this.ensureSchema();
  }

  public async upsertGeneLibrary(record: GeneLibraryRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO gene_libraries (
          seed_id,
          content_location,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(seed_id) DO UPDATE SET
          content_location = excluded.content_location,
          updated_at = excluded.updated_at`,
      )
      .run(record.seedId, record.contentLocation, record.createdAt, record.updatedAt);
  }

  public async findGeneLibraryBySeedId(
    seedId: string,
  ): Promise<GeneLibraryRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM gene_libraries WHERE seed_id = ?")
      .get(seedId) as GeneLibraryRow | undefined;
    return row === undefined ? null : this.toLibraryRecord(row);
  }

  public async createReminder(
    record: GeneExtractionReminderRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO gene_extraction_reminders (
          id,
          seed_id,
          status,
          evidence_sources_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.status,
        JSON.stringify(record.evidenceSources),
        record.createdAt,
        record.updatedAt,
      );
  }

  public async findReminderById(
    reminderId: string,
  ): Promise<GeneExtractionReminderRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM gene_extraction_reminders WHERE id = ?")
      .get(reminderId) as GeneReminderRow | undefined;
    return row === undefined ? null : this.toReminderRecord(row);
  }

  public async saveReminder(
    record: GeneExtractionReminderRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `UPDATE gene_extraction_reminders
          SET status = ?,
              evidence_sources_json = ?,
              updated_at = ?
          WHERE id = ?`,
      )
      .run(
        record.status,
        JSON.stringify(record.evidenceSources),
        record.updatedAt,
        record.id,
      );
  }

  public async listRemindersBySeedAndStatus(
    seedId: string,
    status: GeneReminderStatus,
  ): Promise<GeneExtractionReminderRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM gene_extraction_reminders
          WHERE seed_id = ? AND status = ?
          ORDER BY updated_at DESC`,
      )
      .all(seedId, status) as unknown as GeneReminderRow[];
    return rows.map((row) => this.toReminderRecord(row));
  }

  public async createExtractionTask(
    record: GeneExtractionTaskRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO gene_extraction_tasks (
          id,
          seed_id,
          status,
          failure_reason,
          evidence_sources_json,
          agent_input_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.status,
        record.failureReason,
        JSON.stringify(record.evidenceSources),
        JSON.stringify(record.agentInput),
        record.createdAt,
        record.updatedAt,
      );
  }

  public async findExtractionTaskById(
    taskId: string,
  ): Promise<GeneExtractionTaskRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM gene_extraction_tasks WHERE id = ?")
      .get(taskId) as GeneTaskRow | undefined;
    return row === undefined ? null : this.toTaskRecord(row);
  }

  public async saveExtractionTask(
    record: GeneExtractionTaskRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `UPDATE gene_extraction_tasks
          SET status = ?,
              failure_reason = ?,
              evidence_sources_json = ?,
              agent_input_json = ?,
              updated_at = ?
          WHERE id = ?`,
      )
      .run(
        record.status,
        record.failureReason,
        JSON.stringify(record.evidenceSources),
        JSON.stringify(record.agentInput),
        record.updatedAt,
        record.id,
      );
  }

  public async createSuggestion(record: GeneSuggestionRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO gene_suggestions (
          id,
          seed_id,
          task_id,
          status,
          title,
          body_markdown,
          lineage,
          niche,
          evidence_sources_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.taskId,
        record.status,
        record.title,
        record.bodyMarkdown,
        record.lineage,
        record.niche,
        JSON.stringify(record.evidenceSources),
        record.createdAt,
        record.updatedAt,
      );
  }

  public async findSuggestionById(
    suggestionId: string,
  ): Promise<GeneSuggestionRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM gene_suggestions WHERE id = ?")
      .get(suggestionId) as GeneSuggestionRow | undefined;
    return row === undefined ? null : this.toSuggestionRecord(row);
  }

  public async saveSuggestion(record: GeneSuggestionRecord): Promise<void> {
    this.database
      .prepare(
        `UPDATE gene_suggestions
          SET status = ?,
              title = ?,
              body_markdown = ?,
              lineage = ?,
              niche = ?,
              evidence_sources_json = ?,
              updated_at = ?
          WHERE id = ?`,
      )
      .run(
        record.status,
        record.title,
        record.bodyMarkdown,
        record.lineage,
        record.niche,
        JSON.stringify(record.evidenceSources),
        record.updatedAt,
        record.id,
      );
  }

  public async listSuggestionsBySeed(
    seedId: string,
  ): Promise<GeneSuggestionRecord[]> {
    const rows = this.database
      .prepare(
        "SELECT * FROM gene_suggestions WHERE seed_id = ? ORDER BY updated_at DESC",
      )
      .all(seedId) as unknown as GeneSuggestionRow[];
    return rows.map((row) => this.toSuggestionRecord(row));
  }

  public async listSuggestionsBySeedAndStatus(
    seedId: string,
    status: GeneSuggestionStatus,
  ): Promise<GeneSuggestionRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM gene_suggestions
          WHERE seed_id = ? AND status = ?
          ORDER BY updated_at DESC`,
      )
      .all(seedId, status) as unknown as GeneSuggestionRow[];
    return rows.map((row) => this.toSuggestionRecord(row));
  }

  public async createInsight(record: GeneInsightRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO gene_insights (
          id,
          seed_id,
          suggestion_id,
          status,
          title,
          lineage,
          niche,
          content_location,
          evidence_sources_json,
          created_at,
          updated_at,
          archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.suggestionId,
        record.status,
        record.title,
        record.lineage,
        record.niche,
        record.contentLocation,
        JSON.stringify(record.evidenceSources),
        record.createdAt,
        record.updatedAt,
        record.archivedAt,
      );
  }

  public async findInsightById(
    insightId: string,
  ): Promise<GeneInsightRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM gene_insights WHERE id = ?")
      .get(insightId) as GeneInsightRow | undefined;
    return row === undefined ? null : this.toInsightRecord(row);
  }

  public async saveInsight(record: GeneInsightRecord): Promise<void> {
    this.database
      .prepare(
        `UPDATE gene_insights
          SET status = ?,
              title = ?,
              lineage = ?,
              niche = ?,
              content_location = ?,
              evidence_sources_json = ?,
              updated_at = ?,
              archived_at = ?
          WHERE id = ?`,
      )
      .run(
        record.status,
        record.title,
        record.lineage,
        record.niche,
        record.contentLocation,
        JSON.stringify(record.evidenceSources),
        record.updatedAt,
        record.archivedAt,
        record.id,
      );
  }

  public async listInsightsBySeed(seedId: string): Promise<GeneInsightRecord[]> {
    const rows = this.database
      .prepare(
        "SELECT * FROM gene_insights WHERE seed_id = ? ORDER BY updated_at DESC",
      )
      .all(seedId) as unknown as GeneInsightRow[];
    return rows.map((row) => this.toInsightRecord(row));
  }

  public async listReferableInsightsBySeed(
    seedId: string,
  ): Promise<GeneInsightRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM gene_insights
          WHERE seed_id = ? AND status = ?
          ORDER BY updated_at DESC`,
      )
      .all(seedId, GENE_INSIGHT_STATUSES.active) as unknown as GeneInsightRow[];
    return rows.map((row) => this.toInsightRecord(row));
  }

  public close(): void {
    this.database.close();
  }

  private ensureSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS gene_libraries (
        seed_id TEXT PRIMARY KEY,
        content_location TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gene_extraction_reminders (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'handled', 'ignored')),
        evidence_sources_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_gene_extraction_reminders_seed_status_updated_at
        ON gene_extraction_reminders (seed_id, status, updated_at);

      CREATE TABLE IF NOT EXISTS gene_extraction_tasks (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
        failure_reason TEXT,
        evidence_sources_json TEXT NOT NULL DEFAULT '[]',
        agent_input_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_gene_extraction_tasks_seed_updated_at
        ON gene_extraction_tasks (seed_id, updated_at);

      CREATE TABLE IF NOT EXISTS gene_suggestions (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'dismissed')),
        title TEXT NOT NULL,
        body_markdown TEXT NOT NULL,
        lineage TEXT NOT NULL DEFAULT '',
        niche TEXT NOT NULL DEFAULT '',
        evidence_sources_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_gene_suggestions_seed_status_updated_at
        ON gene_suggestions (seed_id, status, updated_at);

      CREATE INDEX IF NOT EXISTS idx_gene_suggestions_task_id
        ON gene_suggestions (task_id);

      CREATE TABLE IF NOT EXISTS gene_insights (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        suggestion_id TEXT,
        status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
        title TEXT NOT NULL,
        lineage TEXT NOT NULL DEFAULT '',
        niche TEXT NOT NULL DEFAULT '',
        content_location TEXT NOT NULL,
        evidence_sources_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_gene_insights_seed_status_updated_at
        ON gene_insights (seed_id, status, updated_at);

      CREATE INDEX IF NOT EXISTS idx_gene_insights_suggestion_id
        ON gene_insights (suggestion_id);
    `);
  }

  private toLibraryRecord(row: GeneLibraryRow): GeneLibraryRecord {
    return {
      seedId: row.seed_id,
      contentLocation: row.content_location,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toReminderRecord(row: GeneReminderRow): GeneExtractionReminderRecord {
    return {
      id: row.id,
      seedId: row.seed_id,
      status: row.status,
      evidenceSources: this.parseEvidenceSources(row.evidence_sources_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toTaskRecord(row: GeneTaskRow): GeneExtractionTaskRecord {
    return {
      id: row.id,
      seedId: row.seed_id,
      status: row.status,
      failureReason: row.failure_reason,
      evidenceSources: this.parseEvidenceSources(row.evidence_sources_json),
      agentInput: this.parseRecord(row.agent_input_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toSuggestionRecord(row: GeneSuggestionRow): GeneSuggestionRecord {
    return {
      id: row.id,
      seedId: row.seed_id,
      taskId: row.task_id,
      status: row.status,
      title: row.title,
      bodyMarkdown: row.body_markdown,
      lineage: row.lineage,
      niche: row.niche,
      evidenceSources: this.parseEvidenceSources(row.evidence_sources_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toInsightRecord(row: GeneInsightRow): GeneInsightRecord {
    return {
      id: row.id,
      seedId: row.seed_id,
      suggestionId: row.suggestion_id,
      status: row.status,
      title: row.title,
      lineage: row.lineage,
      niche: row.niche,
      contentLocation: row.content_location,
      evidenceSources: this.parseEvidenceSources(row.evidence_sources_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    };
  }

  private parseEvidenceSources(value: string): GeneEvidenceSource[] {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (item): item is GeneEvidenceSource =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as GeneEvidenceSource).sourceType === "string" &&
          typeof (item as GeneEvidenceSource).sourceId === "string" &&
          typeof (item as GeneEvidenceSource).strength === "string",
      );
    } catch {
      return [];
    }
  }

  private parseRecord(value: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(value) as unknown;
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
}
