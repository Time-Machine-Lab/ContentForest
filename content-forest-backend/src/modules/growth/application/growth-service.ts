import type { AgentPort } from "../../../agent/ports/agent-port.js";
import type { AgentTaskResult } from "../../../agent/runtime/agent-task.js";
import { candidateToGrowthFruitInput } from "../../../agent/skills/branch-growth-candidate.js";
import type { FruitService } from "../../fruit/application/fruit-service.js";
import type { ParentNodeRef } from "../../fruit/domain/fruit-types.js";
import { GENERATOR_ENABLE_STATES } from "../../generator/domain/generator-types.js";
import {
  GENE_USAGE_OUTCOMES,
  GENE_USAGE_SOURCE_TYPES,
  type GeneUsageOutcome,
} from "../../gene/domain/gene-types.js";
import { SEED_ARCHIVE_STATES } from "../../seed/domain/seed-types.js";
import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type { FruitRecord, FruitStoragePort } from "../../../storage/ports/fruit-storage-port.js";
import type { GeneratorStoragePort } from "../../../storage/ports/generator-storage-port.js";
import type {
  GrowthAttemptRecord,
  GrowthFailedInputRecord,
  GrowthStoragePort,
  GrowthTaskRecord,
} from "../../../storage/ports/growth-storage-port.js";
import type { SeedRecord, SeedStoragePort } from "../../../storage/ports/seed-storage-port.js";
import {
  GROWTH_ATTEMPT_STATUSES,
  GROWTH_MUTATION_INTENSITIES,
  GROWTH_PATH_STEP_STATUSES,
  GROWTH_SEARCH_MODES,
  GROWTH_TASK_STATUSES,
  type BranchGrowthAgentCandidate,
  type BranchGrowthAgentInput,
  type GrowthAuthorizationScope,
  type GrowthFailedInput,
  type GrowthMutationIntensity,
  type GrowthMutationPlan,
  type GrowthPathStep,
  type GrowthResourceRef,
  type GrowthSearchMode,
  type GrowthSourceNodeRef,
  type GrowthSourceStatus,
  type GrowthTaskDetail,
  type GrowthTaskInput,
  type GrowthTaskResult,
  type GrowthTemporaryNutrientCardRef,
} from "../domain/growth-types.js";

export interface StartGrowthTaskInput {
  seedId: string;
  sourceNodeRef: GrowthSourceNodeRef;
  userInput?: string;
  generatorId: string;
  fruitCount?: number;
  nutrientRefs?: GrowthResourceRef[];
  temporaryNutrientCardRefs?: GrowthTemporaryNutrientCardRef[];
  geneRefs?: GrowthResourceRef[];
  detailParams?: Record<string, unknown>;
  searchMode?: GrowthSearchMode;
  mutationIntensity?: GrowthMutationIntensity;
}

export interface GrowthReferenceAuthorizationPort {
  authorize(input: GrowthAuthorizationScope): Promise<GrowthAuthorizationScope>;
}

export type GrowthTaskExecutionScheduler = (
  execute: () => Promise<void>,
) => void;

export interface GeneUsageTrackingPort {
  recordGeneUsage(
    seedId: string,
    input: {
      insightId: string;
      sourceType: "growth_task";
      sourceId: string;
      outcome: GeneUsageOutcome;
      note?: string;
    },
  ): Promise<unknown>;
}

export interface GrowthServiceDependencies {
  storage: GrowthStoragePort;
  seedStorage: SeedStoragePort;
  fruitStorage: FruitStoragePort;
  generatorStorage: GeneratorStoragePort;
  fruitService: FruitService;
  agentPort?: AgentPort;
  referenceAuthorization?: GrowthReferenceAuthorizationPort;
  geneUsageTracking?: GeneUsageTrackingPort;
  idGenerator?: IdGenerator;
  now?: () => Date;
  scheduleTaskExecution?: GrowthTaskExecutionScheduler;
  attemptConcurrency?: number;
}

export class GrowthService {
  private static readonly defaultAttemptConcurrency = 2;
  private static readonly maxAttemptConcurrency = 3;
  private readonly storage: GrowthStoragePort;
  private readonly seedStorage: SeedStoragePort;
  private readonly fruitStorage: FruitStoragePort;
  private readonly generatorStorage: GeneratorStoragePort;
  private readonly fruitService: FruitService;
  private readonly agentPort: AgentPort | undefined;
  private readonly referenceAuthorization: GrowthReferenceAuthorizationPort;
  private readonly geneUsageTracking: GeneUsageTrackingPort | undefined;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;
  private readonly scheduleTaskExecution: GrowthTaskExecutionScheduler;
  private readonly attemptConcurrency: number;
  private readonly activeGrowthTaskIds = new Set<string>();

  public constructor(dependencies: GrowthServiceDependencies) {
    this.storage = dependencies.storage;
    this.seedStorage = dependencies.seedStorage;
    this.fruitStorage = dependencies.fruitStorage;
    this.generatorStorage = dependencies.generatorStorage;
    this.fruitService = dependencies.fruitService;
    this.agentPort = dependencies.agentPort;
    this.referenceAuthorization =
      dependencies.referenceAuthorization ?? new PassThroughGrowthReferenceAuthorization();
    this.geneUsageTracking = dependencies.geneUsageTracking;
    this.idGenerator = dependencies.idGenerator ?? new RandomIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
    this.scheduleTaskExecution =
      dependencies.scheduleTaskExecution ?? scheduleAsyncGrowthTaskExecution;
    this.attemptConcurrency = this.normalizeAttemptConcurrency(
      dependencies.attemptConcurrency ?? GrowthService.defaultAttemptConcurrency,
      Number.POSITIVE_INFINITY,
    );
  }

  public async startGrowthTask(
    input: StartGrowthTaskInput,
  ): Promise<GrowthTaskResult> {
    const normalized = await this.normalizeStartInput(input);
    const taskId = this.idGenerator.nextId("growth-task");
    const timestamp = this.timestamp();
    const baseAgentInput = await this.buildBaseAgentInput(taskId, normalized);
    const task: GrowthTaskRecord = {
      id: taskId,
      ...normalized,
      status: GROWTH_TASK_STATUSES.running,
      authorizationScope: {
        seedId: normalized.seedId,
        sourceNodeRef: normalized.sourceNodeRef,
        generatorId: normalized.generatorId,
        nutrientRefs: normalized.nutrientRefs,
        temporaryNutrientCardRefs: normalized.temporaryNutrientCardRefs,
        geneRefs: normalized.geneRefs,
      },
      agentInput: baseAgentInput,
      successfulFruitIds: [],
      failureReason: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      finishedAt: null,
    };

    const locked = await this.storage.acquireLock({
      sourceNodeRef: task.sourceNodeRef,
      taskId: task.id,
      lockedAt: timestamp,
    });
    if (!locked) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "该节点正在生长，不能重复发起枝化生长",
        400,
      );
    }

    try {
      await this.storage.createTask(task);
    } catch (error) {
      await this.storage.releaseLock(task.sourceNodeRef, task.id);
      throw error;
    }

    this.scheduleGrowthTaskExecution(task.id);
    return {
      task: await this.getGrowthTask(task.id),
    };
  }

  public async retryLatestFailedTask(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<GrowthTaskResult> {
    const normalizedSource = this.normalizeSourceNodeRef(sourceNodeRef);
    const failedInput = await this.storage.findFailedInputBySource(normalizedSource);
    if (failedInput === null) {
      throw new ApplicationError("NOT_FOUND", "该节点没有可重试的失败任务", 404);
    }
    return this.startGrowthTask({
      seedId: failedInput.seedId,
      sourceNodeRef: failedInput.sourceNodeRef,
      userInput: failedInput.userInput,
      generatorId: failedInput.generatorId,
      fruitCount: failedInput.fruitCount,
      nutrientRefs: failedInput.nutrientRefs,
      temporaryNutrientCardRefs: failedInput.temporaryNutrientCardRefs,
      geneRefs: failedInput.geneRefs,
      detailParams: failedInput.detailParams,
      searchMode: failedInput.pipelineParams.searchMode,
      mutationIntensity: failedInput.pipelineParams.mutationIntensity,
    });
  }

  public async getGrowthTask(taskId: string): Promise<GrowthTaskDetail> {
    const task = await this.storage.findTaskById(
      this.requireNonBlank(taskId, "生长任务不能为空"),
    );
    if (task === null) {
      throw new ApplicationError("NOT_FOUND", "生长任务不存在", 404);
    }
    const attempts = await this.storage.listAttemptsByTaskId(task.id);
    return {
      ...task,
      attempts,
      pathGraph: this.buildPathGraph(task, attempts),
    };
  }

  public async recoverInterruptedGrowthTasks(): Promise<void> {
    const runningTasks = await this.storage.listRunningTasks();
    for (const task of runningTasks) {
      if (this.activeGrowthTaskIds.has(task.id)) {
        continue;
      }
      await this.settleInterruptedTask(task);
    }

    const activeRunningTaskIds = new Set(
      (await this.storage.listRunningTasks()).map((task) => task.id),
    );
    const locks = await this.storage.listLocks();
    for (const lock of locks) {
      if (
        !this.activeGrowthTaskIds.has(lock.taskId) &&
        !activeRunningTaskIds.has(lock.taskId)
      ) {
        await this.storage.releaseLock(lock.sourceNodeRef, lock.taskId);
      }
    }
  }

  public async getSourceStatus(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<GrowthSourceStatus> {
    const normalized = this.normalizeSourceNodeRef(sourceNodeRef);
    const lock = await this.storage.findLockBySource(normalized);
    return {
      sourceNodeRef: normalized,
      isGrowing: lock !== null,
      taskId: lock?.taskId ?? null,
    };
  }

  public async getLatestFailedInput(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<GrowthFailedInput | null> {
    return this.storage.findFailedInputBySource(
      this.normalizeSourceNodeRef(sourceNodeRef),
    );
  }

  private scheduleGrowthTaskExecution(taskId: string): void {
    this.scheduleTaskExecution(() => this.executeGrowthTask(taskId));
  }

  private async executeGrowthTask(taskId: string): Promise<void> {
    const task = await this.storage.findTaskById(taskId);
    if (task === null) {
      return;
    }
    if (task.status !== GROWTH_TASK_STATUSES.running) {
      await this.storage.releaseLock(task.sourceNodeRef, task.id);
      return;
    }

    this.activeGrowthTaskIds.add(task.id);
    try {
      await this.executeTaskAttempts(task);
    } catch (error) {
      await this.failTaskFromUnexpectedError(task, error);
    } finally {
      this.activeGrowthTaskIds.delete(task.id);
      await this.storage.releaseLock(task.sourceNodeRef, task.id);
    }
  }

  private async executeTaskAttempts(
    task: GrowthTaskRecord,
  ): Promise<GrowthTaskRecord> {
    let nextAttemptIndex = 1;
    const workerCount = this.normalizeAttemptConcurrency(
      this.attemptConcurrency,
      task.fruitCount,
    );
    const runWorker = async (): Promise<void> => {
      while (true) {
        const attemptIndex = nextAttemptIndex;
        nextAttemptIndex += 1;
        if (attemptIndex > task.fruitCount) {
          return;
        }
        const attempt = await this.createRunningAttempt(task, attemptIndex);
        await this.runSingleAttempt(task, attempt);
      }
    };

    await Promise.all(
      Array.from({ length: workerCount }, async () => runWorker()),
    );

    return this.finalizeTaskFromAttempts(
      task,
      "枝化生长没有生成任何果实",
    );
  }

  private async createRunningAttempt(
    task: GrowthTaskRecord,
    attemptIndex: number,
  ): Promise<GrowthAttemptRecord> {
    const timestamp = this.timestamp();
    const attempt: GrowthAttemptRecord = {
      id: this.idGenerator.nextId("growth-attempt"),
      taskId: task.id,
      attemptIndex,
      status: GROWTH_ATTEMPT_STATUSES.running,
      agentTaskId: null,
      fruitId: null,
      failureReason: null,
      agentOutput: {},
      mutationPlan: this.buildAttemptMutationPlan(task, attemptIndex),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.storage.createAttempt(attempt);
    return attempt;
  }

  private async runSingleAttempt(
    task: GrowthTaskRecord,
    attempt: GrowthAttemptRecord,
  ): Promise<GrowthAttemptRecord> {
    try {
      const agent = this.requireAgentPort();
      const agentInput = this.buildAttemptAgentInput(task, attempt);
      const result = await agent.runTask({
        taskId: attempt.id,
        type: "growth",
        input: agentInput as unknown as Record<string, unknown>,
        metadata: {
          growthTaskId: task.id,
          seedId: task.seedId,
          sourceNodeRef: task.sourceNodeRef,
        },
      });
      if (!result.ok) {
        return this.failAttempt(attempt, result.error.message, {
          error: result.error,
          trace: result.trace,
        });
      }

      const candidate = this.extractAgentCandidate(result, task);
      const fruit = await this.fruitService.createFruitFromCandidate({
        markdown: candidate.markdown,
        parentNodeRef: task.sourceNodeRef,
        generatorId: task.generatorId,
        summary: candidate.summary,
        geneTags: candidate.geneTags,
      });
      return this.succeedAttempt(attempt, result.taskId, fruit.id, {
        content: result.output.content,
        metadata: result.output.metadata ?? {},
        trace: result.trace,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "果实生成尝试失败";
      return this.failAttempt(attempt, message, {});
    }
  }

  private async succeedAttempt(
    attempt: GrowthAttemptRecord,
    agentTaskId: string,
    fruitId: string,
    agentOutput: unknown,
  ): Promise<GrowthAttemptRecord> {
    const updated: GrowthAttemptRecord = {
      ...attempt,
      status: GROWTH_ATTEMPT_STATUSES.succeeded,
      agentTaskId,
      fruitId,
      failureReason: null,
      agentOutput: this.toRecord(agentOutput),
      updatedAt: this.timestamp(),
    };
    await this.storage.saveAttempt(updated);
    return updated;
  }

  private async failAttempt(
    attempt: GrowthAttemptRecord,
    failureReason: string,
    agentOutput: Record<string, unknown>,
  ): Promise<GrowthAttemptRecord> {
    const updated: GrowthAttemptRecord = {
      ...attempt,
      status: GROWTH_ATTEMPT_STATUSES.failed,
      failureReason,
      agentOutput,
      updatedAt: this.timestamp(),
    };
    await this.storage.saveAttempt(updated);
    return updated;
  }

  private async failTaskFromUnexpectedError(
    task: GrowthTaskRecord,
    error: unknown,
  ): Promise<void> {
    const existing = await this.storage.findTaskById(task.id);
    if (existing === null) {
      return;
    }
    const message = error instanceof Error ? error.message : "枝化生长失败";
    const timestamp = this.timestamp();
    const failedTask: GrowthTaskRecord = {
      ...existing,
      status: GROWTH_TASK_STATUSES.failed,
      failureReason: message,
      updatedAt: timestamp,
      finishedAt: timestamp,
    };
    await this.storage.saveTask(failedTask);
    await this.storage.upsertFailedInput(this.toFailedInput(failedTask, message));
  }

  private async settleInterruptedTask(task: GrowthTaskRecord): Promise<void> {
    await this.failRunningAttemptsForInterruptedTask(task);
    const settled = await this.finalizeTaskFromAttempts(
      task,
      "枝化生长任务因服务中断而停止",
    );
    await this.storage.releaseLock(settled.sourceNodeRef, settled.id);
  }

  private async failRunningAttemptsForInterruptedTask(
    task: GrowthTaskRecord,
  ): Promise<void> {
    const attempts = await this.storage.listAttemptsByTaskId(task.id);
    for (const attempt of attempts) {
      if (attempt.status !== GROWTH_ATTEMPT_STATUSES.running) {
        continue;
      }
      await this.storage.saveAttempt({
        ...attempt,
        status: GROWTH_ATTEMPT_STATUSES.failed,
        failureReason: "枝化生长任务因服务中断而停止",
        updatedAt: this.timestamp(),
      });
    }
  }

  private async finalizeTaskFromAttempts(
    task: GrowthTaskRecord,
    fallbackFailureReason: string,
  ): Promise<GrowthTaskRecord> {
    const attempts = await this.storage.listAttemptsByTaskId(task.id);
    const successfulFruitIds = attempts
      .filter((attempt) =>
        attempt.status === GROWTH_ATTEMPT_STATUSES.succeeded &&
        attempt.fruitId !== null,
      )
      .map((attempt) => attempt.fruitId as string);
    const failureReasons = attempts
      .filter((attempt) => attempt.failureReason !== null)
      .map((attempt) => attempt.failureReason as string);

    const timestamp = this.timestamp();
    const completed = successfulFruitIds.length > 0;
    const finishedTask: GrowthTaskRecord = {
      ...task,
      successfulFruitIds,
      status: completed
        ? GROWTH_TASK_STATUSES.completed
        : GROWTH_TASK_STATUSES.failed,
      failureReason: completed
        ? null
        : this.firstFailureReason(failureReasons, fallbackFailureReason),
      updatedAt: timestamp,
      finishedAt: timestamp,
    };
    await this.storage.saveTask(finishedTask);
    await this.recordGeneUsagesForTask(finishedTask);

    if (completed) {
      await this.storage.clearFailedInput(task.sourceNodeRef);
    } else {
      await this.storage.upsertFailedInput(
        this.toFailedInput(finishedTask, finishedTask.failureReason ?? fallbackFailureReason),
      );
    }
    return finishedTask;
  }

  private async recordGeneUsagesForTask(task: GrowthTaskRecord): Promise<void> {
    if (
      this.geneUsageTracking === undefined ||
      task.authorizationScope.geneRefs.length === 0
    ) {
      return;
    }
    const outcome =
      task.status === GROWTH_TASK_STATUSES.completed
        ? GENE_USAGE_OUTCOMES.positive
        : GENE_USAGE_OUTCOMES.negative;
    await Promise.all(
      task.authorizationScope.geneRefs.map(async (ref) => {
        try {
          await this.geneUsageTracking?.recordGeneUsage(task.seedId, {
            insightId: ref.resourceId,
            sourceType: GENE_USAGE_SOURCE_TYPES.growthTask,
            sourceId: task.id,
            outcome,
            note:
              outcome === GENE_USAGE_OUTCOMES.positive
                ? "枝化生长引用该基因并至少生成一个果实"
                : "枝化生长引用该基因但没有生成果实",
          });
        } catch {
          // Gene tracking is evolutionary telemetry; it must not break growth settlement.
        }
      }),
    );
  }

  private async normalizeStartInput(
    input: StartGrowthTaskInput,
  ): Promise<GrowthTaskInput> {
    const seedId = this.requireNonBlank(input.seedId, "种子不能为空");
    const seed = await this.requireActiveSeed(seedId);
    const sourceNodeRef = await this.resolveSourceNode(seed, input.sourceNodeRef);
    const generatorId = await this.requireEnabledGenerator(input.generatorId);
    const fruitCount = this.normalizeFruitCount(input.fruitCount);
    const nutrientRefs = this.normalizeResourceRefs(
      input.nutrientRefs,
      "nutrient",
    );
    const temporaryNutrientCardRefs = this.normalizeTemporaryNutrientCardRefs(
      input.temporaryNutrientCardRefs,
    );
    const geneRefs = this.normalizeResourceRefs(input.geneRefs, "gene");
    const detailParams = this.normalizeDetailParams(input.detailParams);
    const pipelineParams = this.resolvePipelineParams(input, {
      sourceNodeRef,
      nutrientRefs,
      temporaryNutrientCardRefs,
      geneRefs,
    });
    const authorizationScope = await this.referenceAuthorization.authorize({
      seedId: seed.id,
      sourceNodeRef,
      generatorId,
      nutrientRefs,
      temporaryNutrientCardRefs,
      geneRefs,
    });

    return {
      seedId: seed.id,
      sourceNodeRef,
      userInput: input.userInput?.trim() ?? "",
      generatorId,
      fruitCount,
      nutrientRefs: authorizationScope.nutrientRefs,
      temporaryNutrientCardRefs: authorizationScope.temporaryNutrientCardRefs,
      geneRefs: authorizationScope.geneRefs,
      detailParams,
      pipelineParams,
    };
  }

  private async requireActiveSeed(seedId: string): Promise<SeedRecord> {
    const seed = await this.seedStorage.findSeedById(seedId);
    if (seed === null) {
      throw new ApplicationError("NOT_FOUND", "种子不存在", 404);
    }
    if (seed.archiveState === SEED_ARCHIVE_STATES.archived) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "种子已归档，不能发起新的枝化生长",
        400,
      );
    }
    return seed;
  }

  private async resolveSourceNode(
    seed: SeedRecord,
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<GrowthSourceNodeRef> {
    const source = this.normalizeSourceNodeRef(sourceNodeRef);
    if (source.nodeType === "seed") {
      if (source.nodeId !== seed.id && source.nodeId !== seed.rootNodeId) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "来源种子不属于当前种子范围",
          400,
        );
      }
      return {
        nodeType: "seed",
        nodeId: seed.rootNodeId,
      };
    }

    const fruit = await this.fruitStorage.findFruitById(source.nodeId);
    if (fruit === null) {
      throw new ApplicationError("NOT_FOUND", "来源果实不存在", 404);
    }
    const resolvedSeedId = await this.resolveSeedIdFromFruit(fruit);
    if (resolvedSeedId !== seed.id) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "来源果实不属于当前种子范围",
        400,
      );
    }
    return {
      nodeType: "fruit",
      nodeId: fruit.id,
    };
  }

  private async resolveSeedIdFromFruit(fruit: FruitRecord): Promise<string | null> {
    return this.resolveSeedIdFromParent(fruit.parentNodeRef, new Set([fruit.id]));
  }

  private async resolveSeedIdFromParent(
    parentNodeRef: ParentNodeRef,
    visitedFruitIds: Set<string>,
  ): Promise<string | null> {
    if (parentNodeRef.nodeType === "seed") {
      return parentNodeRef.nodeId.startsWith("seed-node_")
        ? parentNodeRef.nodeId.slice("seed-node_".length)
        : parentNodeRef.nodeId;
    }
    if (visitedFruitIds.has(parentNodeRef.nodeId)) {
      return null;
    }
    visitedFruitIds.add(parentNodeRef.nodeId);
    const parentFruit = await this.fruitStorage.findFruitById(parentNodeRef.nodeId);
    if (parentFruit === null) {
      return null;
    }
    return this.resolveSeedIdFromParent(parentFruit.parentNodeRef, visitedFruitIds);
  }

  private async requireEnabledGenerator(generatorIdInput: string): Promise<string> {
    const generatorId = this.requireNonBlank(generatorIdInput, "生成器不能为空");
    const generator = await this.generatorStorage.findGeneratorById(generatorId);
    if (generator === null) {
      throw new ApplicationError("NOT_FOUND", "生成器不存在", 404);
    }
    if (generator.enableState !== GENERATOR_ENABLE_STATES.enabled) {
      throw new ApplicationError("VALIDATION_ERROR", "生成器已停用", 400);
    }
    return generator.id;
  }

  private normalizeFruitCount(value: number | undefined): number {
    if (value === undefined) {
      return 3;
    }
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "果实数量必须在 1 到 6 之间",
        400,
      );
    }
    return value;
  }

  private normalizeAttemptConcurrency(value: number, fruitCount: number): number {
    const integer = Number.isInteger(value)
      ? value
      : GrowthService.defaultAttemptConcurrency;
    const bounded = Math.min(
      Math.max(integer, 1),
      GrowthService.maxAttemptConcurrency,
      fruitCount,
    );
    return Math.max(1, bounded);
  }

  private normalizeResourceRefs(
    refs: GrowthResourceRef[] | undefined,
    expectedType: GrowthResourceRef["resourceType"],
  ): GrowthResourceRef[] {
    if (refs === undefined) {
      return [];
    }
    if (!Array.isArray(refs)) {
      throw new ApplicationError("VALIDATION_ERROR", "引用资源格式不正确", 400);
    }

    const seen = new Set<string>();
    return refs.map((ref) => {
      if (ref.resourceType !== expectedType) {
        throw new ApplicationError("VALIDATION_ERROR", "引用资源类型不正确", 400);
      }
      const resourceId = this.requireNonBlank(ref.resourceId, "引用资源不能为空");
      const key = `${expectedType}:${resourceId}`;
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);
      return {
        resourceType: expectedType,
        resourceId,
      };
    }).filter((ref): ref is GrowthResourceRef => ref !== null);
  }

  private normalizeTemporaryNutrientCardRefs(
    refs: GrowthTemporaryNutrientCardRef[] | undefined,
  ): GrowthTemporaryNutrientCardRef[] {
    if (refs === undefined) {
      return [];
    }
    if (!Array.isArray(refs)) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "临时营养卡片引用格式不正确",
        400,
      );
    }

    const seen = new Set<string>();
    return refs.map((ref) => {
      if (ref.resourceType !== "nutrient_card") {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "临时营养卡片引用类型不正确",
          400,
        );
      }
      const resourceId = this.requireNonBlank(
        ref.resourceId,
        "临时营养卡片不能为空",
      );
      if (seen.has(resourceId)) {
        return null;
      }
      seen.add(resourceId);
      return {
        resourceType: "nutrient_card" as const,
        resourceId,
      };
    }).filter((ref): ref is GrowthTemporaryNutrientCardRef => ref !== null);
  }

  private normalizeDetailParams(
    value: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    return value === undefined ? {} : { ...value };
  }

  private resolvePipelineParams(
    input: StartGrowthTaskInput,
    normalized: {
      sourceNodeRef: GrowthSourceNodeRef;
      nutrientRefs: GrowthResourceRef[];
      temporaryNutrientCardRefs: GrowthTemporaryNutrientCardRef[];
      geneRefs: GrowthResourceRef[];
    },
  ): {
    searchMode: GrowthSearchMode;
    mutationIntensity: GrowthMutationIntensity;
    recommendationReason: string;
  } {
    const searchMode = input.searchMode === undefined
      ? this.recommendSearchMode(input, normalized)
      : this.normalizeSearchMode(input.searchMode);
    const mutationIntensity = input.mutationIntensity === undefined
      ? this.recommendMutationIntensity(input, normalized, searchMode)
      : this.normalizeMutationIntensity(input.mutationIntensity);
    const recommendationReason =
      input.searchMode !== undefined && input.mutationIntensity !== undefined
        ? "用户显式选择搜索模式和突变激进程度。"
        : this.buildPipelineRecommendationReason(
            input,
            normalized,
            searchMode,
            mutationIntensity,
          );
    return {
      searchMode,
      mutationIntensity,
      recommendationReason,
    };
  }

  private recommendSearchMode(
    input: StartGrowthTaskInput,
    normalized: {
      sourceNodeRef: GrowthSourceNodeRef;
      nutrientRefs: GrowthResourceRef[];
      temporaryNutrientCardRefs: GrowthTemporaryNutrientCardRef[];
      geneRefs: GrowthResourceRef[];
    },
  ): GrowthSearchMode {
    const userInput = input.userInput?.toLowerCase() ?? "";
    if (/avoid|negative|fail|广告|失败|淘汰|不要|规避/.test(userInput)) {
      return GROWTH_SEARCH_MODES.negativeFeedbackAvoidance;
    }
    if (
      normalized.sourceNodeRef.nodeType === "fruit" &&
      normalized.geneRefs.length > 0
    ) {
      return GROWTH_SEARCH_MODES.directionalStrengthening;
    }
    if (normalized.sourceNodeRef.nodeType === "fruit") {
      return GROWTH_SEARCH_MODES.localVariation;
    }
    return GROWTH_SEARCH_MODES.broadExploration;
  }

  private recommendMutationIntensity(
    input: StartGrowthTaskInput,
    normalized: {
      sourceNodeRef: GrowthSourceNodeRef;
      nutrientRefs: GrowthResourceRef[];
      temporaryNutrientCardRefs: GrowthTemporaryNutrientCardRef[];
      geneRefs: GrowthResourceRef[];
    },
    searchMode: GrowthSearchMode,
  ): GrowthMutationIntensity {
    if (searchMode === GROWTH_SEARCH_MODES.negativeFeedbackAvoidance) {
      return GROWTH_MUTATION_INTENSITIES.aggressive;
    }
    if (
      normalized.sourceNodeRef.nodeType === "fruit" &&
      normalized.geneRefs.length > 0
    ) {
      return GROWTH_MUTATION_INTENSITIES.conservative;
    }
    if (
      normalized.nutrientRefs.length === 0 &&
      normalized.temporaryNutrientCardRefs.length === 0 &&
      normalized.geneRefs.length === 0 &&
      input.userInput === undefined
    ) {
      return GROWTH_MUTATION_INTENSITIES.aggressive;
    }
    return GROWTH_MUTATION_INTENSITIES.balanced;
  }

  private buildPipelineRecommendationReason(
    input: StartGrowthTaskInput,
    normalized: {
      sourceNodeRef: GrowthSourceNodeRef;
      nutrientRefs: GrowthResourceRef[];
      temporaryNutrientCardRefs: GrowthTemporaryNutrientCardRef[];
      geneRefs: GrowthResourceRef[];
    },
    searchMode: GrowthSearchMode,
    mutationIntensity: GrowthMutationIntensity,
  ): string {
    const signals = [
      `来源节点：${normalized.sourceNodeRef.nodeType}`,
      `营养引用：${normalized.nutrientRefs.length}`,
      `未沉淀营养卡片引用：${normalized.temporaryNutrientCardRefs.length}`,
      `基因引用：${normalized.geneRefs.length}`,
      `用户输入：${input.userInput?.trim() ? "有" : "无"}`,
    ];
    return `系统推荐 ${searchMode} / ${mutationIntensity}，依据：${signals.join("；")}。`;
  }

  private normalizeSearchMode(value: GrowthSearchMode): GrowthSearchMode {
    if (Object.values(GROWTH_SEARCH_MODES).includes(value)) {
      return value;
    }
    throw new ApplicationError("VALIDATION_ERROR", "搜索模式不正确", 400);
  }

  private normalizeMutationIntensity(
    value: GrowthMutationIntensity,
  ): GrowthMutationIntensity {
    if (Object.values(GROWTH_MUTATION_INTENSITIES).includes(value)) {
      return value;
    }
    throw new ApplicationError("VALIDATION_ERROR", "突变激进程度不正确", 400);
  }

  private normalizeSourceNodeRef(
    sourceNodeRef: GrowthSourceNodeRef,
  ): GrowthSourceNodeRef {
    if (sourceNodeRef === undefined || sourceNodeRef === null) {
      throw new ApplicationError("VALIDATION_ERROR", "来源节点不能为空", 400);
    }
    const nodeId = this.requireNonBlank(sourceNodeRef.nodeId, "来源节点不能为空");
    if (sourceNodeRef.nodeType !== "seed" && sourceNodeRef.nodeType !== "fruit") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "来源节点类型必须是 seed 或 fruit",
        400,
      );
    }
    return {
      nodeType: sourceNodeRef.nodeType,
      nodeId,
    };
  }

  private async buildBaseAgentInput(
    taskId: string,
    input: GrowthTaskInput,
  ): Promise<Record<string, unknown>> {
    const roundGrowthBrief = await this.buildRoundGrowthBrief(input);
    return {
      seedId: input.seedId,
      growthTaskId: taskId,
      sourceNodeRef: input.sourceNodeRef,
      userInput: input.userInput,
      roundGrowthBrief,
      searchMode: input.pipelineParams.searchMode,
      mutationIntensity: input.pipelineParams.mutationIntensity,
      pipelineParams: input.pipelineParams,
      generatorRef: {
        generatorId: input.generatorId,
      },
      authorizationScope: {
        seedId: input.seedId,
        sourceNodeRef: input.sourceNodeRef,
        generatorId: input.generatorId,
        nutrientRefs: input.nutrientRefs,
        temporaryNutrientCardRefs: input.temporaryNutrientCardRefs,
        geneRefs: input.geneRefs,
      },
      detailParams: input.detailParams,
      fruitCount: input.fruitCount,
    };
  }

  private async buildRoundGrowthBrief(
    input: GrowthTaskInput,
  ): Promise<Record<string, unknown>> {
    const seed = await this.seedStorage.findSeedById(input.seedId);
    const seedBrief = await this.seedStorage.findSeedBriefBySeedId(input.seedId);
    return {
      purpose: "本轮生长简报是一次枝化生长的临时任务上下文，不替代种子主简报。",
      seed: {
        id: input.seedId,
        title: seed?.title ?? "",
        contentLocation: seed?.contentLocation ?? null,
        hasMasterBrief: seedBrief !== null,
        masterBriefContentLocation: seedBrief?.contentLocation ?? null,
        masterBriefUpdatedAt: seedBrief?.updatedAt ?? null,
      },
      sourceNodeRef: input.sourceNodeRef,
      userInput: input.userInput,
      generatorId: input.generatorId,
      fruitCount: input.fruitCount,
      references: {
        nutrientRefs: input.nutrientRefs,
        temporaryNutrientCardRefs: input.temporaryNutrientCardRefs,
        geneRefs: input.geneRefs,
      },
      pipeline: input.pipelineParams,
      executionHint:
        seedBrief === null
          ? "种子主简报不存在，本轮降级为基于种子正文、来源节点、用户输入和授权资源生长。"
          : "种子主简报可用，Agent 可在授权工具返回的上下文中参考主简报。",
    };
  }

  private buildAttemptAgentInput(
    task: GrowthTaskRecord,
    attempt: GrowthAttemptRecord,
  ): BranchGrowthAgentInput {
    return {
      seedId: task.seedId,
      growthTaskId: task.id,
      attemptId: attempt.id,
      attemptIndex: attempt.attemptIndex,
      sourceNodeRef: task.sourceNodeRef,
      userInput: task.userInput,
      generatorRef: {
        generatorId: task.generatorId,
      },
      authorizationScope: task.authorizationScope,
      detailParams: task.detailParams,
      roundGrowthBrief: this.toRecord(task.agentInput.roundGrowthBrief),
      searchMode: task.pipelineParams.searchMode,
      mutationIntensity: task.pipelineParams.mutationIntensity,
      mutationPlan: attempt.mutationPlan,
      target: {
        fruitCount: 1,
        totalFruitCount: task.fruitCount,
      },
    };
  }

  private buildAttemptMutationPlan(
    task: GrowthTaskRecord,
    attemptIndex: number,
  ): GrowthMutationPlan {
    const directions = this.discoverMutationDirections(task);
    const directionIndex = (attemptIndex - 1) % directions.length;
    const baseDirection = directions[directionIndex] ?? "冷启动探索新的内容表达路线";
    const direction =
      directions.length >= task.fruitCount
        ? baseDirection
        : `${baseDirection}（第 ${attemptIndex} 条差异化路线）`;
    const intent = this.buildMutationIntent(
      task.pipelineParams.searchMode,
      task.pipelineParams.mutationIntensity,
    );

    return {
      direction,
      intent,
      intensity: task.pipelineParams.mutationIntensity,
      hypothesis: `以「${direction}」作为第 ${attemptIndex}/${task.fruitCount} 个果实的表达路线，验证其是否更接近种子目标。`,
      inherit: this.buildMutationInherit(task),
      avoid: this.buildMutationAvoid(task),
      evidenceSummary: this.buildMutationEvidenceSummary(task, attemptIndex),
    };
  }

  private discoverMutationDirections(task: GrowthTaskRecord): string[] {
    const directions: string[] = [];
    const userInput = task.userInput.trim();
    const roundGrowthBrief = this.toRecord(task.agentInput.roundGrowthBrief);
    const seedBrief = this.toRecord(roundGrowthBrief.seed);

    if (userInput.length > 0) {
      directions.push(`围绕用户补充「${this.shortText(userInput)}」展开表达`);
    }
    if (seedBrief.hasMasterBrief === true) {
      directions.push("结合种子主简报扩展新的候选传播路线");
    }
    if (task.sourceNodeRef.nodeType === "fruit") {
      directions.push("继承来源果实核心主题，改变叙事切入点");
    }
    if (task.geneRefs.length > 0) {
      directions.push(`组合 ${task.geneRefs.length} 条授权基因经验，形成可验证表达`);
    }
    if (task.nutrientRefs.length > 0) {
      directions.push(`从 ${task.nutrientRefs.length} 条营养资料中提取平台或案例路线`);
    }
    if (task.temporaryNutrientCardRefs.length > 0) {
      directions.push(
        `试用 ${task.temporaryNutrientCardRefs.length} 条未沉淀营养卡片，验证候选资料价值`,
      );
    }
    if (task.pipelineParams.searchMode === GROWTH_SEARCH_MODES.negativeFeedbackAvoidance) {
      directions.push("规避近期无效表达，重构更像真实分享的内容入口");
    }
    if (task.pipelineParams.searchMode === GROWTH_SEARCH_MODES.directionalStrengthening) {
      directions.push("强化已被选择方向，放大其中最有效的表达特征");
    }
    if (task.pipelineParams.searchMode === GROWTH_SEARCH_MODES.localVariation) {
      directions.push("保留当前路线，只变换角度、结构或受众假设");
    }
    if (task.pipelineParams.searchMode === GROWTH_SEARCH_MODES.broadExploration) {
      directions.push("围绕种子核心做广泛探索，寻找尚未验证的内容形态");
    }

    return directions.length > 0
      ? directions
      : ["冷启动探索新的内容表达路线"];
  }

  private buildMutationIntent(
    searchMode: GrowthSearchMode,
    intensity: GrowthMutationIntensity,
  ): string {
    const radius =
      intensity === GROWTH_MUTATION_INTENSITIES.conservative
        ? "小步变异"
        : intensity === GROWTH_MUTATION_INTENSITIES.aggressive
          ? "大步探索"
          : "均衡探索";
    switch (searchMode) {
      case GROWTH_SEARCH_MODES.directionalStrengthening:
        return `${radius}：优先继承已出现正向信号的表达路线，并寻找更强版本。`;
      case GROWTH_SEARCH_MODES.localVariation:
        return `${radius}：保留来源节点核心，只改动少量表达变量。`;
      case GROWTH_SEARCH_MODES.negativeFeedbackAvoidance:
        return `${radius}：主动规避失败或淘汰信号，探索替代表达。`;
      case GROWTH_SEARCH_MODES.broadExploration:
      default:
        return `${radius}：在不偏离种子事实的前提下扩展解空间。`;
    }
  }

  private buildMutationInherit(task: GrowthTaskRecord): string[] {
    const inherit = [
      "保留种子事实、用户明确要求和生成器目标格式。",
    ];
    if (task.sourceNodeRef.nodeType === "fruit") {
      inherit.push("继承来源果实中仍有效的主题、受众和表达资产。");
    }
    if (task.geneRefs.length > 0) {
      inherit.push(
        `优先参考授权基因：${task.geneRefs.map((ref) => ref.resourceId).join(", ")}。`,
      );
    }
    return inherit;
  }

  private buildMutationAvoid(task: GrowthTaskRecord): string[] {
    const avoid = [
      "不要为了新奇而偏离种子核心。",
      "不要编造种子、营养或基因中不存在的系统事实。",
    ];
    if (task.pipelineParams.searchMode === GROWTH_SEARCH_MODES.negativeFeedbackAvoidance) {
      avoid.push("重点规避广告感、空泛表达和已失败的内容承诺。");
    }
    if (task.pipelineParams.mutationIntensity === GROWTH_MUTATION_INTENSITIES.aggressive) {
      avoid.push("激进探索仍必须保留用户明确约束和生成器交付格式。");
    }
    return avoid;
  }

  private buildMutationEvidenceSummary(
    task: GrowthTaskRecord,
    attemptIndex: number,
  ): string {
    return [
      `attempt ${attemptIndex}/${task.fruitCount}`,
      `搜索模式=${task.pipelineParams.searchMode}`,
      `突变激进程度=${task.pipelineParams.mutationIntensity}`,
      `营养引用=${task.nutrientRefs.length}`,
      `未沉淀营养卡片引用=${task.temporaryNutrientCardRefs.length}`,
      `基因引用=${task.geneRefs.length}`,
      `来源=${task.sourceNodeRef.nodeType}`,
    ].join("；");
  }

  private buildPathGraph(
    task: GrowthTaskRecord,
    attempts: GrowthAttemptRecord[],
  ): GrowthPathStep[] {
    const generationStatus = this.resolveGenerationStageStatus(task, attempts);
    const wrapStatus = this.resolveWrapStageStatus(task);
    const baseSteps: GrowthPathStep[] = [
      this.createPathStep("pipeline:input", "获取输入", GROWTH_PATH_STEP_STATUSES.completed, task.createdAt),
      this.createPathStep("pipeline:context", "补全上下文", GROWTH_PATH_STEP_STATUSES.completed, task.createdAt),
      this.createPathStep("pipeline:search", "发现创作方向", GROWTH_PATH_STEP_STATUSES.completed, task.createdAt),
      this.createPathStep("pipeline:attention", "编排参考重点", GROWTH_PATH_STEP_STATUSES.completed, task.createdAt),
      this.createPathStep("pipeline:generation", "使用生成器", generationStatus, task.updatedAt),
      this.createPathStep("pipeline:wrap", "封装候选果实", wrapStatus, task.finishedAt ?? task.updatedAt),
    ];
    const attemptSteps = attempts.flatMap((attempt) =>
      this.extractAttemptUserProgressSteps(attempt, "pipeline:generation"),
    );
    return [...baseSteps, ...attemptSteps];
  }

  private createPathStep(
    id: string,
    label: string,
    status: GrowthPathStep["status"],
    updatedAt: string | null,
    parentId: string | null = null,
    attemptId: string | null = null,
    detail: string | null = null,
  ): GrowthPathStep {
    return {
      id,
      parentId,
      attemptId,
      label,
      status,
      detail,
      updatedAt,
    };
  }

  private resolveGenerationStageStatus(
    task: GrowthTaskRecord,
    attempts: GrowthAttemptRecord[],
  ): GrowthPathStep["status"] {
    if (task.status === GROWTH_TASK_STATUSES.completed) {
      return GROWTH_PATH_STEP_STATUSES.completed;
    }
    if (task.status === GROWTH_TASK_STATUSES.failed) {
      return GROWTH_PATH_STEP_STATUSES.failed;
    }
    return attempts.some((attempt) => attempt.status === GROWTH_ATTEMPT_STATUSES.running) ||
      attempts.length === 0
      ? GROWTH_PATH_STEP_STATUSES.running
      : GROWTH_PATH_STEP_STATUSES.completed;
  }

  private resolveWrapStageStatus(task: GrowthTaskRecord): GrowthPathStep["status"] {
    if (task.status === GROWTH_TASK_STATUSES.completed) {
      return GROWTH_PATH_STEP_STATUSES.completed;
    }
    if (task.status === GROWTH_TASK_STATUSES.failed) {
      return GROWTH_PATH_STEP_STATUSES.failed;
    }
    return GROWTH_PATH_STEP_STATUSES.pending;
  }

  private extractAttemptUserProgressSteps(
    attempt: GrowthAttemptRecord,
    fallbackParentId: string,
  ): GrowthPathStep[] {
    const trace = Array.isArray(attempt.agentOutput.trace)
      ? attempt.agentOutput.trace
      : [];
    return trace
      .filter((event): event is Record<string, unknown> =>
        this.isRecord(event) && this.isUserProgressTraceEvent(event),
      )
      .map((event, index) => {
        const metadata = this.toRecord(event.metadata);
        const stepId = this.readOptionalString(metadata.stepId) ??
          this.readOptionalString(metadata.stage) ??
          `user-progress-${index + 1}`;
        const label = this.readOptionalString(metadata.label) ??
          this.readOptionalString(event.message) ??
          "更新生成进度";
        const at = typeof event.at === "string" ? event.at : attempt.updatedAt;
        const requestedParentId = this.readOptionalString(metadata.parentStepId);
        const parentId = requestedParentId?.startsWith("attempt:")
          ? fallbackParentId
          : requestedParentId ?? fallbackParentId;
        return this.createPathStep(
          `progress:${attempt.id}:${stepId}`,
          label,
          this.normalizeUserProgressStatus(metadata.status),
          at,
          parentId,
          attempt.id,
          this.readOptionalString(metadata.detail),
        );
      });
  }

  private isUserProgressTraceEvent(event: Record<string, unknown>): boolean {
    const metadata = this.toRecord(event.metadata);
    return metadata.userVisible === true ||
      metadata.visibility === "user" ||
      event.type === "user_progress";
  }

  private normalizeUserProgressStatus(value: unknown): GrowthPathStep["status"] {
    if (
      typeof value === "string" &&
      Object.values(GROWTH_PATH_STEP_STATUSES).includes(
        value as GrowthPathStep["status"],
      )
    ) {
      return value as GrowthPathStep["status"];
    }
    return GROWTH_PATH_STEP_STATUSES.completed;
  }

  private extractAgentCandidate(
    result: AgentTaskResult & { ok: true },
    task: GrowthTaskRecord,
  ): BranchGrowthAgentCandidate {
    try {
      return candidateToGrowthFruitInput(result.output.content, {
        authorizedResourceRefs: [
          ...task.authorizationScope.nutrientRefs,
          ...task.authorizationScope.temporaryNutrientCardRefs,
          ...task.authorizationScope.geneRefs,
        ],
      });
    } catch (error) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        error instanceof Error ? error.message : "Agent 未返回可落地的果实候选",
        502,
      );
    }
  }

  private toFailedInput(
    task: GrowthTaskRecord,
    failureReason: string,
  ): GrowthFailedInputRecord {
    return {
      taskId: task.id,
      seedId: task.seedId,
      sourceNodeRef: task.sourceNodeRef,
      userInput: task.userInput,
      generatorId: task.generatorId,
      fruitCount: task.fruitCount,
      nutrientRefs: task.nutrientRefs,
      temporaryNutrientCardRefs: task.temporaryNutrientCardRefs,
      geneRefs: task.geneRefs,
      detailParams: task.detailParams,
      pipelineParams: task.pipelineParams,
      failureReason,
      updatedAt: task.updatedAt,
    };
  }

  private firstFailureReason(
    reasons: string[],
    fallback: string,
  ): string {
    return reasons.find((reason) => reason.trim().length > 0) ?? fallback;
  }

  private requireAgentPort(): AgentPort {
    if (this.agentPort === undefined) {
      throw new ApplicationError(
        "AGENT_TASK_FAILED",
        "枝化生长 Agent 入口尚未装配",
        502,
      );
    }
    return this.agentPort;
  }

  private requireNonBlank(value: string, message: string): string {
    const normalized = value.trim();
    if (normalized.length === 0) {
      throw new ApplicationError("VALIDATION_ERROR", message, 400);
    }
    return normalized;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return this.isRecord(value) ? value : {};
  }

  private readOptionalString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private shortText(value: string, maxLength = 28): string {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length <= maxLength
      ? normalized
      : `${normalized.slice(0, maxLength)}...`;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

function scheduleAsyncGrowthTaskExecution(
  execute: () => Promise<void>,
): void {
  setTimeout(() => {
    void execute().catch(() => undefined);
  }, 0);
}

class PassThroughGrowthReferenceAuthorization
  implements GrowthReferenceAuthorizationPort
{
  public async authorize(
    input: GrowthAuthorizationScope,
  ): Promise<GrowthAuthorizationScope> {
    return {
      ...input,
      sourceNodeRef: { ...input.sourceNodeRef },
      nutrientRefs: input.nutrientRefs.map((ref) => ({ ...ref })),
      temporaryNutrientCardRefs: input.temporaryNutrientCardRefs.map((ref) => ({
        ...ref,
      })),
      geneRefs: input.geneRefs.map((ref) => ({ ...ref })),
    };
  }
}
