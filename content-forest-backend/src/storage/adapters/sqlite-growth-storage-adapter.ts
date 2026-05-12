import { DatabaseSync } from "node:sqlite";
import {
  GROWTH_MUTATION_INTENSITIES,
  GROWTH_SEARCH_MODES,
} from "../../modules/growth/domain/growth-types.js";
import type {
  GrowthAttemptStatus,
  GrowthAuthorizationScope,
  GrowthMutationIntensity,
  GrowthMutationPlan,
  GrowthResourceRef,
  GrowthSearchMode,
  GrowthSourceNodeRef,
  GrowthTaskStatus,
  GrowthTemporaryNutrientCardRef,
} from "../../modules/growth/domain/growth-types.js";
import type {
  GrowthAttemptRecord,
  GrowthFailedInputRecord,
  GrowthLockRecord,
  GrowthStoragePort,
  GrowthTaskRecord,
} from "../ports/growth-storage-port.js";

interface GrowthTaskRow {
  id: string;
  seed_id: string;
  source_node_id: string;
  source_node_type: GrowthSourceNodeRef["nodeType"];
  status: GrowthTaskStatus;
  user_input: string;
  generator_id: string;
  fruit_count: number;
  nutrient_refs_json: string;
  temporary_nutrient_card_refs_json: string;
  gene_refs_json: string;
  detail_params_json: string;
  search_mode: GrowthSearchMode;
  mutation_intensity: GrowthMutationIntensity;
  pipeline_recommendation_reason: string;
  authorization_refs_json: string;
  agent_input_json: string;
  successful_fruit_ids_json: string;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

interface GrowthAttemptRow {
  id: string;
  task_id: string;
  attempt_index: number;
  status: GrowthAttemptStatus;
  agent_task_id: string | null;
  fruit_id: string | null;
  failure_reason: string | null;
  agent_output_json: string;
  mutation_plan_json: string;
  created_at: string;
  updated_at: string;
}

interface GrowthLockRow {
  source_node_id: string;
  source_node_type: GrowthSourceNodeRef["nodeType"];
  task_id: string;
  locked_at: string;
}

interface GrowthFailedInputRow {
  source_node_id: string;
  source_node_type: GrowthSourceNodeRef["nodeType"];
  task_id: string;
  seed_id: string;
  user_input: string;
  generator_id: string;
  fruit_count: number;
  nutrient_refs_json: string;
  temporary_nutrient_card_refs_json: string;
  gene_refs_json: string;
  detail_params_json: string;
  search_mode: GrowthSearchMode;
  mutation_intensity: GrowthMutationIntensity;
  failure_reason: string;
  updated_at: string;
}

export class SqliteGrowthStorageAdapter implements GrowthStoragePort {
  private readonly database: DatabaseSync;

  public constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath);
    this.ensureSchema();
  }

  public async createTask(record: GrowthTaskRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO growth_tasks (
          id,
          seed_id,
          source_node_id,
          source_node_type,
          status,
          user_input,
          generator_id,
          fruit_count,
          nutrient_refs_json,
          temporary_nutrient_card_refs_json,
          gene_refs_json,
          detail_params_json,
          search_mode,
          mutation_intensity,
          pipeline_recommendation_reason,
          authorization_refs_json,
          agent_input_json,
          successful_fruit_ids_json,
          failure_reason,
          created_at,
          updated_at,
          finished_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.seedId,
        record.sourceNodeRef.nodeId,
        record.sourceNodeRef.nodeType,
        record.status,
        record.userInput,
        record.generatorId,
        record.fruitCount,
        JSON.stringify(record.nutrientRefs),
        JSON.stringify(record.temporaryNutrientCardRefs),
        JSON.stringify(record.geneRefs),
        JSON.stringify(record.detailParams),
        record.pipelineParams.searchMode,
        record.pipelineParams.mutationIntensity,
        record.pipelineParams.recommendationReason,
        JSON.stringify(record.authorizationScope),
        JSON.stringify(record.agentInput),
        JSON.stringify(record.successfulFruitIds),
        record.failureReason,
        record.createdAt,
        record.updatedAt,
        record.finishedAt,
      );
  }

  public async findTaskById(taskId: string): Promise<GrowthTaskRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM growth_tasks WHERE id = ?")
      .get(taskId) as GrowthTaskRow | undefined;
    return row === undefined ? null : this.toTaskRecord(row);
  }

  public async listRunningTasks(): Promise<GrowthTaskRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM growth_tasks
          WHERE status = 'running'
          ORDER BY created_at ASC`,
      )
      .all() as unknown as GrowthTaskRow[];
    return rows.map((row) => this.toTaskRecord(row));
  }

  public async saveTask(record: GrowthTaskRecord): Promise<void> {
    this.database
      .prepare(
        `UPDATE growth_tasks
          SET status = ?,
              user_input = ?,
              generator_id = ?,
              fruit_count = ?,
              nutrient_refs_json = ?,
              temporary_nutrient_card_refs_json = ?,
              gene_refs_json = ?,
              detail_params_json = ?,
              search_mode = ?,
              mutation_intensity = ?,
              pipeline_recommendation_reason = ?,
              authorization_refs_json = ?,
              agent_input_json = ?,
              successful_fruit_ids_json = ?,
              failure_reason = ?,
              updated_at = ?,
              finished_at = ?
          WHERE id = ?`,
      )
      .run(
        record.status,
        record.userInput,
        record.generatorId,
        record.fruitCount,
        JSON.stringify(record.nutrientRefs),
        JSON.stringify(record.temporaryNutrientCardRefs),
        JSON.stringify(record.geneRefs),
        JSON.stringify(record.detailParams),
        record.pipelineParams.searchMode,
        record.pipelineParams.mutationIntensity,
        record.pipelineParams.recommendationReason,
        JSON.stringify(record.authorizationScope),
        JSON.stringify(record.agentInput),
        JSON.stringify(record.successfulFruitIds),
        record.failureReason,
        record.updatedAt,
        record.finishedAt,
        record.id,
      );
  }

  public async createAttempt(record: GrowthAttemptRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO growth_attempts (
          id,
          task_id,
          attempt_index,
          status,
          agent_task_id,
          fruit_id,
          failure_reason,
          agent_output_json,
          mutation_plan_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.taskId,
        record.attemptIndex,
        record.status,
        record.agentTaskId,
        record.fruitId,
        record.failureReason,
        JSON.stringify(record.agentOutput),
        JSON.stringify(record.mutationPlan),
        record.createdAt,
        record.updatedAt,
      );
  }

  public async saveAttempt(record: GrowthAttemptRecord): Promise<void> {
    this.database
      .prepare(
        `UPDATE growth_attempts
          SET status = ?,
              agent_task_id = ?,
              fruit_id = ?,
              failure_reason = ?,
              agent_output_json = ?,
              mutation_plan_json = ?,
              updated_at = ?
          WHERE id = ?`,
      )
      .run(
        record.status,
        record.agentTaskId,
        record.fruitId,
        record.failureReason,
        JSON.stringify(record.agentOutput),
        JSON.stringify(record.mutationPlan),
        record.updatedAt,
        record.id,
      );
  }

  public async listAttemptsByTaskId(
    taskId: string,
  ): Promise<GrowthAttemptRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM growth_attempts
          WHERE task_id = ?
          ORDER BY attempt_index ASC`,
      )
      .all(taskId) as unknown as GrowthAttemptRow[];
    return rows.map((row) => this.toAttemptRecord(row));
  }

  public async acquireLock(record: GrowthLockRecord): Promise<boolean> {
    const result = this.database
      .prepare(
        `INSERT OR IGNORE INTO growth_locks (
          source_node_id,
          source_node_type,
          task_id,
          locked_at
        ) VALUES (?, ?, ?, ?)`,
      )
      .run(
        record.sourceNodeRef.nodeId,
        record.sourceNodeRef.nodeType,
        record.taskId,
        record.lockedAt,
      );
    return result.changes > 0;
  }

  public async releaseLock(
    sourceNodeRef: GrowthSourceNodeRef,
    taskId?: string,
  ): Promise<void> {
    if (taskId === undefined) {
      this.database
        .prepare(
          `DELETE FROM growth_locks
            WHERE source_node_type = ? AND source_node_id = ?`,
        )
        .run(sourceNodeRef.nodeType, sourceNodeRef.nodeId);
      return;
    }

    this.database
      .prepare(
        `DELETE FROM growth_locks
          WHERE source_node_type = ? AND source_node_id = ? AND task_id = ?`,
      )
      .run(sourceNodeRef.nodeType, sourceNodeRef.nodeId, taskId);
  }

  public async findLockBySource(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<GrowthLockRecord | null> {
    const row = this.database
      .prepare(
        `SELECT * FROM growth_locks
          WHERE source_node_type = ? AND source_node_id = ?`,
      )
      .get(sourceNodeRef.nodeType, sourceNodeRef.nodeId) as
      | GrowthLockRow
      | undefined;
    return row === undefined ? null : this.toLockRecord(row);
  }

  public async listLocks(): Promise<GrowthLockRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM growth_locks
          ORDER BY locked_at ASC`,
      )
      .all() as unknown as GrowthLockRow[];
    return rows.map((row) => this.toLockRecord(row));
  }

  public async upsertFailedInput(record: GrowthFailedInputRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO growth_failed_inputs (
          source_node_id,
          source_node_type,
          task_id,
          seed_id,
          user_input,
          generator_id,
          fruit_count,
          nutrient_refs_json,
          temporary_nutrient_card_refs_json,
          gene_refs_json,
          detail_params_json,
          search_mode,
          mutation_intensity,
          failure_reason,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_node_type, source_node_id) DO UPDATE SET
          task_id = excluded.task_id,
          seed_id = excluded.seed_id,
          user_input = excluded.user_input,
          generator_id = excluded.generator_id,
          fruit_count = excluded.fruit_count,
          nutrient_refs_json = excluded.nutrient_refs_json,
          temporary_nutrient_card_refs_json = excluded.temporary_nutrient_card_refs_json,
          gene_refs_json = excluded.gene_refs_json,
          detail_params_json = excluded.detail_params_json,
          search_mode = excluded.search_mode,
          mutation_intensity = excluded.mutation_intensity,
          failure_reason = excluded.failure_reason,
          updated_at = excluded.updated_at`,
      )
      .run(
        record.sourceNodeRef.nodeId,
        record.sourceNodeRef.nodeType,
        record.taskId,
        record.seedId,
        record.userInput,
        record.generatorId,
        record.fruitCount,
        JSON.stringify(record.nutrientRefs),
        JSON.stringify(record.temporaryNutrientCardRefs),
        JSON.stringify(record.geneRefs),
        JSON.stringify(record.detailParams),
        record.pipelineParams.searchMode,
        record.pipelineParams.mutationIntensity,
        record.failureReason,
        record.updatedAt,
      );
  }

  public async findFailedInputBySource(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<GrowthFailedInputRecord | null> {
    const row = this.database
      .prepare(
        `SELECT * FROM growth_failed_inputs
          WHERE source_node_type = ? AND source_node_id = ?`,
      )
      .get(sourceNodeRef.nodeType, sourceNodeRef.nodeId) as
      | GrowthFailedInputRow
      | undefined;
    return row === undefined ? null : this.toFailedInputRecord(row);
  }

  public async clearFailedInput(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<void> {
    this.database
      .prepare(
        `DELETE FROM growth_failed_inputs
          WHERE source_node_type = ? AND source_node_id = ?`,
      )
      .run(sourceNodeRef.nodeType, sourceNodeRef.nodeId);
  }

  public close(): void {
    this.database.close();
  }

  private ensureSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS growth_tasks (
        id TEXT PRIMARY KEY,
        seed_id TEXT NOT NULL,
        source_node_id TEXT NOT NULL,
        source_node_type TEXT NOT NULL CHECK (source_node_type IN ('seed', 'fruit')),
        status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
        user_input TEXT NOT NULL DEFAULT '',
        generator_id TEXT NOT NULL,
        fruit_count INTEGER NOT NULL CHECK (fruit_count >= 1 AND fruit_count <= 6),
        nutrient_refs_json TEXT NOT NULL DEFAULT '[]',
        temporary_nutrient_card_refs_json TEXT NOT NULL DEFAULT '[]',
        gene_refs_json TEXT NOT NULL DEFAULT '[]',
        detail_params_json TEXT NOT NULL DEFAULT '{}',
        search_mode TEXT NOT NULL DEFAULT 'broad_exploration' CHECK (search_mode IN ('broad_exploration', 'directional_strengthening', 'local_variation', 'negative_feedback_avoidance')),
        mutation_intensity TEXT NOT NULL DEFAULT 'balanced' CHECK (mutation_intensity IN ('conservative', 'balanced', 'aggressive')),
        pipeline_recommendation_reason TEXT NOT NULL DEFAULT '',
        authorization_refs_json TEXT NOT NULL DEFAULT '[]',
        agent_input_json TEXT NOT NULL DEFAULT '{}',
        successful_fruit_ids_json TEXT NOT NULL DEFAULT '[]',
        failure_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        finished_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_growth_tasks_source_status_updated_at
        ON growth_tasks (source_node_type, source_node_id, status, updated_at);

      CREATE INDEX IF NOT EXISTS idx_growth_tasks_seed_updated_at
        ON growth_tasks (seed_id, updated_at);

      CREATE TABLE IF NOT EXISTS growth_attempts (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        attempt_index INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
        agent_task_id TEXT,
        fruit_id TEXT,
        failure_reason TEXT,
        agent_output_json TEXT NOT NULL DEFAULT '{}',
        mutation_plan_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (task_id, attempt_index)
      );

      CREATE INDEX IF NOT EXISTS idx_growth_attempts_task_attempt_index
        ON growth_attempts (task_id, attempt_index);

      CREATE TABLE IF NOT EXISTS growth_locks (
        source_node_id TEXT NOT NULL,
        source_node_type TEXT NOT NULL CHECK (source_node_type IN ('seed', 'fruit')),
        task_id TEXT NOT NULL,
        locked_at TEXT NOT NULL,
        PRIMARY KEY (source_node_type, source_node_id)
      );

      CREATE INDEX IF NOT EXISTS idx_growth_locks_task_id
        ON growth_locks (task_id);

      CREATE TABLE IF NOT EXISTS growth_failed_inputs (
        source_node_id TEXT NOT NULL,
        source_node_type TEXT NOT NULL CHECK (source_node_type IN ('seed', 'fruit')),
        task_id TEXT NOT NULL,
        seed_id TEXT NOT NULL,
        user_input TEXT NOT NULL DEFAULT '',
        generator_id TEXT NOT NULL,
        fruit_count INTEGER NOT NULL CHECK (fruit_count >= 1 AND fruit_count <= 6),
        nutrient_refs_json TEXT NOT NULL DEFAULT '[]',
        temporary_nutrient_card_refs_json TEXT NOT NULL DEFAULT '[]',
        gene_refs_json TEXT NOT NULL DEFAULT '[]',
        detail_params_json TEXT NOT NULL DEFAULT '{}',
        search_mode TEXT NOT NULL DEFAULT 'broad_exploration',
        mutation_intensity TEXT NOT NULL DEFAULT 'balanced',
        failure_reason TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (source_node_type, source_node_id)
      );

      CREATE INDEX IF NOT EXISTS idx_growth_failed_inputs_seed_updated_at
        ON growth_failed_inputs (seed_id, updated_at);
    `);
    this.ensureColumn(
      "growth_tasks",
      "temporary_nutrient_card_refs_json",
      "TEXT NOT NULL DEFAULT '[]'",
    );
    this.ensureColumn(
      "growth_tasks",
      "search_mode",
      "TEXT NOT NULL DEFAULT 'broad_exploration'",
    );
    this.ensureColumn(
      "growth_tasks",
      "mutation_intensity",
      "TEXT NOT NULL DEFAULT 'balanced'",
    );
    this.ensureColumn(
      "growth_tasks",
      "pipeline_recommendation_reason",
      "TEXT NOT NULL DEFAULT ''",
    );
    this.ensureColumn(
      "growth_attempts",
      "mutation_plan_json",
      "TEXT NOT NULL DEFAULT '{}'",
    );
    this.ensureColumn(
      "growth_failed_inputs",
      "temporary_nutrient_card_refs_json",
      "TEXT NOT NULL DEFAULT '[]'",
    );
    this.ensureColumn(
      "growth_failed_inputs",
      "search_mode",
      "TEXT NOT NULL DEFAULT 'broad_exploration'",
    );
    this.ensureColumn(
      "growth_failed_inputs",
      "mutation_intensity",
      "TEXT NOT NULL DEFAULT 'balanced'",
    );
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

  private toTaskRecord(row: GrowthTaskRow): GrowthTaskRecord {
    const sourceNodeRef = {
      nodeId: row.source_node_id,
      nodeType: row.source_node_type,
    };
    return {
      id: row.id,
      seedId: row.seed_id,
      sourceNodeRef,
      status: row.status,
      userInput: row.user_input,
      generatorId: row.generator_id,
      fruitCount: row.fruit_count,
      nutrientRefs: this.parseResourceRefs(row.nutrient_refs_json),
      temporaryNutrientCardRefs: this.parseTemporaryNutrientCardRefs(
        row.temporary_nutrient_card_refs_json,
      ),
      geneRefs: this.parseResourceRefs(row.gene_refs_json),
      detailParams: this.parseRecord(row.detail_params_json),
      pipelineParams: {
        searchMode: this.parseSearchMode(row.search_mode),
        mutationIntensity: this.parseMutationIntensity(row.mutation_intensity),
        recommendationReason: row.pipeline_recommendation_reason,
      },
      authorizationScope: this.parseAuthorizationScope(
        row.authorization_refs_json,
        row.seed_id,
        sourceNodeRef,
        row.generator_id,
      ),
      agentInput: this.parseRecord(row.agent_input_json),
      successfulFruitIds: this.parseStringArray(row.successful_fruit_ids_json),
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      finishedAt: row.finished_at,
    };
  }

  private toAttemptRecord(row: GrowthAttemptRow): GrowthAttemptRecord {
    return {
      id: row.id,
      taskId: row.task_id,
      attemptIndex: row.attempt_index,
      status: row.status,
      agentTaskId: row.agent_task_id,
      fruitId: row.fruit_id,
      failureReason: row.failure_reason,
      agentOutput: this.parseRecord(row.agent_output_json),
      mutationPlan: this.parseMutationPlan(row.mutation_plan_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toLockRecord(row: GrowthLockRow): GrowthLockRecord {
    return {
      sourceNodeRef: {
        nodeId: row.source_node_id,
        nodeType: row.source_node_type,
      },
      taskId: row.task_id,
      lockedAt: row.locked_at,
    };
  }

  private toFailedInputRecord(row: GrowthFailedInputRow): GrowthFailedInputRecord {
    return {
      taskId: row.task_id,
      seedId: row.seed_id,
      sourceNodeRef: {
        nodeId: row.source_node_id,
        nodeType: row.source_node_type,
      },
      userInput: row.user_input,
      generatorId: row.generator_id,
      fruitCount: row.fruit_count,
      nutrientRefs: this.parseResourceRefs(row.nutrient_refs_json),
      temporaryNutrientCardRefs: this.parseTemporaryNutrientCardRefs(
        row.temporary_nutrient_card_refs_json,
      ),
      geneRefs: this.parseResourceRefs(row.gene_refs_json),
      detailParams: this.parseRecord(row.detail_params_json),
      pipelineParams: {
        searchMode: this.parseSearchMode(row.search_mode),
        mutationIntensity: this.parseMutationIntensity(row.mutation_intensity),
        recommendationReason: "Recovered from latest failed growth input.",
      },
      failureReason: row.failure_reason,
      updatedAt: row.updated_at,
    };
  }

  private parseAuthorizationScope(
    value: string,
    seedId: string,
    sourceNodeRef: GrowthSourceNodeRef,
    generatorId: string,
  ): GrowthAuthorizationScope {
    const parsed = this.parseRecord(value);
    return {
      seedId,
      sourceNodeRef:
        this.isSourceNodeRef(parsed.sourceNodeRef) ? parsed.sourceNodeRef : sourceNodeRef,
      generatorId:
        typeof parsed.generatorId === "string" ? parsed.generatorId : generatorId,
      nutrientRefs: this.parseResourceRefsFromUnknown(parsed.nutrientRefs),
      temporaryNutrientCardRefs: this.parseTemporaryNutrientCardRefsFromUnknown(
        parsed.temporaryNutrientCardRefs,
      ),
      geneRefs: this.parseResourceRefsFromUnknown(parsed.geneRefs),
    };
  }

  private parseResourceRefs(value: string): GrowthResourceRef[] {
    try {
      return this.parseResourceRefsFromUnknown(JSON.parse(value) as unknown);
    } catch {
      return [];
    }
  }

  private parseResourceRefsFromUnknown(value: unknown): GrowthResourceRef[] {
    return Array.isArray(value)
      ? value.filter(
          (item): item is GrowthResourceRef =>
            typeof item === "object" &&
            item !== null &&
            ((item as GrowthResourceRef).resourceType === "nutrient" ||
              (item as GrowthResourceRef).resourceType === "gene") &&
            typeof (item as GrowthResourceRef).resourceId === "string",
        )
      : [];
  }

  private parseTemporaryNutrientCardRefs(
    value: string,
  ): GrowthTemporaryNutrientCardRef[] {
    try {
      return this.parseTemporaryNutrientCardRefsFromUnknown(
        JSON.parse(value) as unknown,
      );
    } catch {
      return [];
    }
  }

  private parseTemporaryNutrientCardRefsFromUnknown(
    value: unknown,
  ): GrowthTemporaryNutrientCardRef[] {
    return Array.isArray(value)
      ? value.filter(
          (item): item is GrowthTemporaryNutrientCardRef =>
            typeof item === "object" &&
            item !== null &&
            (item as GrowthTemporaryNutrientCardRef).resourceType ===
              "nutrient_card" &&
            typeof (item as GrowthTemporaryNutrientCardRef).resourceId ===
              "string",
        )
      : [];
  }

  private parseStringArray(value: string): string[] {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
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

  private parseSearchMode(value: string): GrowthSearchMode {
    return Object.values(GROWTH_SEARCH_MODES).includes(value as GrowthSearchMode)
      ? value as GrowthSearchMode
      : GROWTH_SEARCH_MODES.broadExploration;
  }

  private parseMutationIntensity(value: string): GrowthMutationIntensity {
    return Object.values(GROWTH_MUTATION_INTENSITIES).includes(
      value as GrowthMutationIntensity,
    )
      ? value as GrowthMutationIntensity
      : GROWTH_MUTATION_INTENSITIES.balanced;
  }

  private parseMutationPlan(value: string): GrowthMutationPlan {
    const parsed = this.parseRecord(value);
    const inherit = Array.isArray(parsed.inherit)
      ? parsed.inherit.filter((item): item is string => typeof item === "string")
      : [];
    const avoid = Array.isArray(parsed.avoid)
      ? parsed.avoid.filter((item): item is string => typeof item === "string")
      : [];
    return {
      direction:
        typeof parsed.direction === "string" ? parsed.direction : "默认延展方向",
      intent:
        typeof parsed.intent === "string" ? parsed.intent : "延续来源节点并生成可验证内容",
      intensity: this.parseMutationIntensity(
        typeof parsed.intensity === "string" ? parsed.intensity : "",
      ),
      hypothesis:
        typeof parsed.hypothesis === "string" ? parsed.hypothesis : "验证新的表达路线",
      inherit,
      avoid,
      evidenceSummary:
        typeof parsed.evidenceSummary === "string" ? parsed.evidenceSummary : "",
    };
  }

  private isSourceNodeRef(value: unknown): value is GrowthSourceNodeRef {
    return (
      typeof value === "object" &&
      value !== null &&
      ((value as GrowthSourceNodeRef).nodeType === "seed" ||
        (value as GrowthSourceNodeRef).nodeType === "fruit") &&
      typeof (value as GrowthSourceNodeRef).nodeId === "string"
    );
  }
}
