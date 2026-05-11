import { DatabaseSync } from "node:sqlite";
import {
  GENE_INSIGHT_STATUSES,
  type GeneEvidenceSource,
  type GeneExtractionTaskStatus,
  type GeneInsightStatus,
  type GeneReminderStatus,
  type GeneExtractionReasonContext,
  type GenePerformanceSummary,
  type GeneSuggestionStatus,
  type GeneSuggestionSemantics,
  type GeneUsageOutcome,
  type GeneUsageSourceType,
} from "../../modules/gene/domain/gene-types.js";
import type {
  GeneExtractionReminderRecord,
  GeneExtractionTaskRecord,
  GeneInsightRecord,
  GeneLibraryRecord,
  GenePerformanceSummaryRecord,
  GeneStoragePort,
  GeneSuggestionRecord,
  GeneUsageRecordRecord,
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
  semantics_json: string;
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

interface GeneUsageRecordRow {
  id: string;
  seed_id: string;
  insight_id: string;
  source_type: GeneUsageSourceType;
  source_id: string;
  outcome: GeneUsageOutcome;
  note: string;
  created_at: string;
}

interface GenePerformanceSummaryRow {
  insight_id: string;
  seed_id: string;
  usage_count: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  score: number;
  last_used_at: string | null;
  updated_at: string;
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
          semantics_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        JSON.stringify(record.semantics ?? {}),
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
              semantics_json = ?,
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
        JSON.stringify(record.semantics ?? {}),
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

  public async createUsageRecord(record: GeneUsageRecordRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO gene_usage_records (
          id,
          seed_id,
          insight_id,
          source_type,
          source_id,
          outcome,
          note,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.insightId,
        record.sourceType,
        record.sourceId,
        record.outcome,
        record.note,
        record.createdAt,
      );
  }

  public async findPerformanceSummaryByInsightId(
    insightId: string,
  ): Promise<GenePerformanceSummaryRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM gene_performance_summaries WHERE insight_id = ?")
      .get(insightId) as GenePerformanceSummaryRow | undefined;
    return row === undefined ? null : this.toPerformanceSummaryRecord(row);
  }

  public async upsertPerformanceSummary(
    record: GenePerformanceSummaryRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO gene_performance_summaries (
          insight_id,
          seed_id,
          usage_count,
          positive_count,
          neutral_count,
          negative_count,
          score,
          last_used_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(insight_id) DO UPDATE SET
          seed_id = excluded.seed_id,
          usage_count = excluded.usage_count,
          positive_count = excluded.positive_count,
          neutral_count = excluded.neutral_count,
          negative_count = excluded.negative_count,
          score = excluded.score,
          last_used_at = excluded.last_used_at,
          updated_at = excluded.updated_at`,
      )
      .run(
        record.insightId,
        record.seedId,
        record.usageCount,
        record.positiveCount,
        record.neutralCount,
        record.negativeCount,
        record.score,
        record.lastUsedAt,
        record.updatedAt,
      );
  }

  public async listPerformanceSummariesBySeed(
    seedId: string,
  ): Promise<GenePerformanceSummaryRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM gene_performance_summaries
          WHERE seed_id = ?
          ORDER BY score DESC, updated_at DESC`,
      )
      .all(seedId) as unknown as GenePerformanceSummaryRow[];
    return rows.map((row) => this.toPerformanceSummaryRecord(row));
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

      CREATE TABLE IF NOT EXISTS gene_usage_records (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        insight_id TEXT NOT NULL,
        source_type TEXT NOT NULL CHECK (source_type IN ('growth_task', 'manual', 'publication', 'feedback')),
        source_id TEXT NOT NULL,
        outcome TEXT NOT NULL CHECK (outcome IN ('positive', 'neutral', 'negative')),
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_gene_usage_records_seed_created_at
        ON gene_usage_records (seed_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_gene_usage_records_insight_created_at
        ON gene_usage_records (insight_id, created_at);

      CREATE TABLE IF NOT EXISTS gene_performance_summaries (
        insight_id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 0,
        positive_count INTEGER NOT NULL DEFAULT 0,
        neutral_count INTEGER NOT NULL DEFAULT 0,
        negative_count INTEGER NOT NULL DEFAULT 0,
        score REAL NOT NULL DEFAULT 0,
        last_used_at TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_gene_performance_summaries_seed_score
        ON gene_performance_summaries (seed_id, score);
    `);
    try {
      this.database.exec(`
        ALTER TABLE gene_suggestions
          ADD COLUMN semantics_json TEXT NOT NULL DEFAULT '{}';
      `);
    } catch {
      // Older databases may already have the column.
    }
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
    const agentInput = this.parseRecord(row.agent_input_json);
    return {
      id: row.id,
      seedId: row.seed_id,
      status: row.status,
      failureReason: row.failure_reason,
      evidenceSources: this.parseEvidenceSources(row.evidence_sources_json),
      reasonContext: this.parseReasonContext(agentInput),
      agentInput,
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
      semantics: this.parseSuggestionSemantics(row.semantics_json),
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

  private toPerformanceSummaryRecord(
    row: GenePerformanceSummaryRow,
  ): GenePerformanceSummary {
    return {
      insightId: row.insight_id,
      seedId: row.seed_id,
      usageCount: row.usage_count,
      positiveCount: row.positive_count,
      neutralCount: row.neutral_count,
      negativeCount: row.negative_count,
      score: row.score,
      lastUsedAt: row.last_used_at,
      updatedAt: row.updated_at,
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

  private parseReasonContext(
    agentInput: Record<string, unknown>,
  ): GeneExtractionReasonContext | undefined {
    const value = agentInput.reasonContext;
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value)
    ) {
      return undefined;
    }
    const record = value as Record<string, unknown>;
    if (
      typeof record.contextVersion !== "string" ||
      typeof record.userReason !== "string"
    ) {
      return undefined;
    }
    return {
      contextVersion: record.contextVersion as GeneExtractionReasonContext["contextVersion"],
      userReason: record.userReason,
    };
  }

  private parseSuggestionSemantics(
    value: string,
  ): GeneSuggestionSemantics | undefined {
    const record = this.parseRecord(value);
    if (Object.keys(record).length === 0) {
      return undefined;
    }
    const polarity =
      record.polarity === "positive" || record.polarity === "negative"
        ? record.polarity
        : undefined;
    if (polarity === undefined) {
      return undefined;
    }
    const similarityRelation =
      record.similarityRelation === "reinforces" ||
      record.similarityRelation === "branches" ||
      record.similarityRelation === "conflicts"
        ? record.similarityRelation
        : "new";
    return {
      polarity,
      evidenceInterpretation:
        typeof record.evidenceInterpretation === "string"
          ? record.evidenceInterpretation
          : "",
      nextRoundUsage:
        typeof record.nextRoundUsage === "string" ? record.nextRoundUsage : "",
      similarityRelation,
      relatedInsightIds: Array.isArray(record.relatedInsightIds)
        ? record.relatedInsightIds.filter((item): item is string => typeof item === "string")
        : [],
      warnings: Array.isArray(record.warnings)
        ? record.warnings.filter((item): item is string => typeof item === "string")
        : [],
    };
  }
}
