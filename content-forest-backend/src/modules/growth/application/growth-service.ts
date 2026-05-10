import type { AgentPort } from "../../../agent/ports/agent-port.js";
import type { AgentTaskResult } from "../../../agent/runtime/agent-task.js";
import { candidateToGrowthFruitInput } from "../../../agent/skills/branch-growth-candidate.js";
import type { FruitService } from "../../fruit/application/fruit-service.js";
import type { ParentNodeRef } from "../../fruit/domain/fruit-types.js";
import { GENERATOR_ENABLE_STATES } from "../../generator/domain/generator-types.js";
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
  GROWTH_TASK_STATUSES,
  type BranchGrowthAgentCandidate,
  type BranchGrowthAgentInput,
  type GrowthAuthorizationScope,
  type GrowthFailedInput,
  type GrowthResourceRef,
  type GrowthSourceNodeRef,
  type GrowthSourceStatus,
  type GrowthTaskDetail,
  type GrowthTaskInput,
  type GrowthTaskResult,
} from "../domain/growth-types.js";

export interface StartGrowthTaskInput {
  seedId: string;
  sourceNodeRef: GrowthSourceNodeRef;
  userInput?: string;
  generatorId: string;
  fruitCount?: number;
  nutrientRefs?: GrowthResourceRef[];
  geneRefs?: GrowthResourceRef[];
  detailParams?: Record<string, unknown>;
}

export interface GrowthReferenceAuthorizationPort {
  authorize(input: GrowthAuthorizationScope): Promise<GrowthAuthorizationScope>;
}

export type GrowthTaskExecutionScheduler = (
  execute: () => Promise<void>,
) => void;

export interface GrowthServiceDependencies {
  storage: GrowthStoragePort;
  seedStorage: SeedStoragePort;
  fruitStorage: FruitStoragePort;
  generatorStorage: GeneratorStoragePort;
  fruitService: FruitService;
  agentPort?: AgentPort;
  referenceAuthorization?: GrowthReferenceAuthorizationPort;
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
    const baseAgentInput = this.buildBaseAgentInput(taskId, normalized);
    const task: GrowthTaskRecord = {
      id: taskId,
      ...normalized,
      status: GROWTH_TASK_STATUSES.running,
      authorizationScope: {
        seedId: normalized.seedId,
        sourceNodeRef: normalized.sourceNodeRef,
        generatorId: normalized.generatorId,
        nutrientRefs: normalized.nutrientRefs,
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
      geneRefs: failedInput.geneRefs,
      detailParams: failedInput.detailParams,
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
      return this.succeedAttempt(attempt, result.taskId, fruit.id, result.output.content);
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

    if (completed) {
      await this.storage.clearFailedInput(task.sourceNodeRef);
    } else {
      await this.storage.upsertFailedInput(
        this.toFailedInput(finishedTask, finishedTask.failureReason ?? fallbackFailureReason),
      );
    }
    return finishedTask;
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
    const geneRefs = this.normalizeResourceRefs(input.geneRefs, "gene");
    const detailParams = this.normalizeDetailParams(input.detailParams);
    const authorizationScope = await this.referenceAuthorization.authorize({
      seedId: seed.id,
      sourceNodeRef,
      generatorId,
      nutrientRefs,
      geneRefs,
    });

    return {
      seedId: seed.id,
      sourceNodeRef,
      userInput: input.userInput?.trim() ?? "",
      generatorId,
      fruitCount,
      nutrientRefs: authorizationScope.nutrientRefs,
      geneRefs: authorizationScope.geneRefs,
      detailParams,
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

  private normalizeDetailParams(
    value: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    return value === undefined ? {} : { ...value };
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

  private buildBaseAgentInput(
    taskId: string,
    input: GrowthTaskInput,
  ): Record<string, unknown> {
    return {
      seedId: input.seedId,
      growthTaskId: taskId,
      sourceNodeRef: input.sourceNodeRef,
      userInput: input.userInput,
      generatorRef: {
        generatorId: input.generatorId,
      },
      authorizationScope: {
        seedId: input.seedId,
        sourceNodeRef: input.sourceNodeRef,
        generatorId: input.generatorId,
        nutrientRefs: input.nutrientRefs,
        geneRefs: input.geneRefs,
      },
      detailParams: input.detailParams,
      fruitCount: input.fruitCount,
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
      target: {
        fruitCount: 1,
        totalFruitCount: task.fruitCount,
      },
    };
  }

  private extractAgentCandidate(
    result: AgentTaskResult & { ok: true },
    task: GrowthTaskRecord,
  ): BranchGrowthAgentCandidate {
    try {
      return candidateToGrowthFruitInput(result.output.content, {
        authorizedResourceRefs: [
          ...task.authorizationScope.nutrientRefs,
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
      geneRefs: task.geneRefs,
      detailParams: task.detailParams,
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

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
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
      geneRefs: input.geneRefs.map((ref) => ({ ...ref })),
    };
  }
}
