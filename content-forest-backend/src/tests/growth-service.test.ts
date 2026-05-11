import { describe, expect, it } from "vitest";
import type { AgentPort } from "../agent/ports/agent-port.js";
import type { AgentTask, AgentTaskResult } from "../agent/runtime/agent-task.js";
import { InMemoryFruitMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-fruit-markdown-content-access-adapter.js";
import { FruitService } from "../modules/fruit/application/fruit-service.js";
import {
  GENE_USAGE_OUTCOMES,
  GENE_USAGE_SOURCE_TYPES,
} from "../modules/gene/domain/gene-types.js";
import {
  GrowthService,
  type GeneUsageTrackingPort,
  type GrowthReferenceAuthorizationPort,
  type GrowthTaskExecutionScheduler,
} from "../modules/growth/application/growth-service.js";
import {
  GROWTH_ATTEMPT_STATUSES,
  GROWTH_TASK_STATUSES,
  type GrowthAuthorizationScope,
} from "../modules/growth/domain/growth-types.js";
import { SEED_ARCHIVE_STATES } from "../modules/seed/domain/seed-types.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryFruitStorageAdapter } from "../storage/adapters/in-memory-fruit-storage-adapter.js";
import { InMemoryGeneratorStorageAdapter } from "../storage/adapters/in-memory-generator-storage-adapter.js";
import { InMemoryGrowthStorageAdapter } from "../storage/adapters/in-memory-growth-storage-adapter.js";
import { InMemorySeedStorageAdapter } from "../storage/adapters/in-memory-seed-storage-adapter.js";

function createIdGenerator(): IdGenerator {
  let counter = 0;
  return {
    nextId(prefix: string): string {
      counter += 1;
      return `${prefix}_${counter}`;
    },
  };
}

function createNow(): () => Date {
  let counter = 0;
  return () => {
    counter += 1;
    return new Date(`2026-01-01T00:00:${String(counter).padStart(2, "0")}.000Z`);
  };
}

function createManualGrowthScheduler(): {
  schedule: GrowthTaskExecutionScheduler;
  runAll(): Promise<void>;
  pendingCount(): number;
} {
  const pending: Array<() => Promise<void>> = [];
  return {
    schedule(execute: () => Promise<void>): void {
      pending.push(execute);
    },
    async runAll(): Promise<void> {
      while (pending.length > 0) {
        const execute = pending.shift();
        if (execute !== undefined) {
          await execute();
        }
      }
    },
    pendingCount(): number {
      return pending.length;
    },
  };
}

function successAgent(capturedTasks: AgentTask[] = []): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      capturedTasks.push(task);
      return {
        ok: true,
        taskId: task.taskId ?? `agent_${capturedTasks.length}`,
        output: {
          taskType: "growth",
          content: {
            candidate: {
              markdown: `# 果实 ${capturedTasks.length}`,
              summary: "情绪生长摘要",
              geneTags: ["情绪价值"],
            },
          },
        },
        trace: [],
      };
    },
  };
}

function partialAgent(capturedTasks: AgentTask[] = []): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      capturedTasks.push(task);
      if (capturedTasks.length === 2) {
        return {
          ok: false,
          taskId: task.taskId ?? "agent_failed",
          error: {
            code: "AGENT_RUNTIME_ERROR",
            message: "second attempt failed",
          },
          trace: [],
        };
      }
      return {
        ok: true,
        taskId: task.taskId ?? "agent_ok",
        output: {
          taskType: "growth",
          content: {
            markdown: `# 成功果实 ${capturedTasks.length}`,
          },
        },
        trace: [],
      };
    },
  };
}

function invalidOutputAgent(): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      return {
        ok: true,
        taskId: task.taskId ?? "agent_invalid",
        output: {
          taskType: "growth",
          content: {
            candidate: {
              markdown: " ",
            },
          },
        },
        trace: [],
      };
    },
  };
}

function structuredCandidateAgent(): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      return {
        ok: true,
        taskId: task.taskId ?? "agent_structured",
        output: {
          taskType: "growth",
          content: {
            type: "candidate_fruit",
            payload: {
              markdown: "# 结构化果实",
              rawGeneratorOutput: "# 结构化果实",
              attachments: [],
            },
            meta: {
              summary: "结构化候选摘要",
              geneTags: ["结构化"],
              usedResourceRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
              warnings: [],
            },
          },
        },
        trace: [],
      };
    },
  };
}

function concurrentSuccessAgent(input: {
  capturedTasks: AgentTask[];
  metrics: { active: number; maxActive: number };
}): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      input.capturedTasks.push(task);
      input.metrics.active += 1;
      input.metrics.maxActive = Math.max(
        input.metrics.maxActive,
        input.metrics.active,
      );
      await Promise.resolve();
      input.metrics.active -= 1;
      return {
        ok: true,
        taskId: task.taskId ?? `agent_${input.capturedTasks.length}`,
        output: {
          taskType: "growth",
          content: {
            markdown: `# 并发果实 ${String(task.input.attemptIndex)}`,
          },
        },
        trace: [],
      };
    },
  };
}

async function createFixture(
  agentPort: AgentPort = successAgent(),
  options: {
    attemptConcurrency?: number;
    geneUsageTracking?: GeneUsageTrackingPort;
  } = {},
): Promise<{
  service: GrowthService;
  storage: InMemoryGrowthStorageAdapter;
  seedStorage: InMemorySeedStorageAdapter;
  fruitStorage: InMemoryFruitStorageAdapter;
  generatorStorage: InMemoryGeneratorStorageAdapter;
  fruitService: FruitService;
  scheduler: ReturnType<typeof createManualGrowthScheduler>;
}> {
  const seedStorage = new InMemorySeedStorageAdapter();
  const fruitStorage = new InMemoryFruitStorageAdapter();
  const generatorStorage = new InMemoryGeneratorStorageAdapter();
  const storage = new InMemoryGrowthStorageAdapter();
  const now = createNow();
  const scheduler = createManualGrowthScheduler();

  await seedStorage.createSeed({
    id: "seed_1",
    title: "壁纸项目",
    archiveState: SEED_ARCHIVE_STATES.active,
    contentLocation: "seeds/seed_1.md",
    rootNodeId: "seed-node_seed_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
  });
  await seedStorage.createSeed({
    id: "seed_archived",
    title: "归档项目",
    archiveState: SEED_ARCHIVE_STATES.archived,
    contentLocation: "seeds/seed_archived.md",
    rootNodeId: "seed-node_seed_archived",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: "2026-01-01T00:00:00.000Z",
  });
  await generatorStorage.createGenerator({
    id: "generator_1",
    name: "小红书生成器",
    description: "生成传播内容",
    enableState: "enabled",
    contentLocation: "generators/generator_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    disabledAt: null,
  });
  await generatorStorage.createGenerator({
    id: "generator_disabled",
    name: "停用生成器",
    description: "不可用",
    enableState: "disabled",
    contentLocation: "generators/generator_disabled",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    disabledAt: "2026-01-01T00:00:00.000Z",
  });

  const fruitService = new FruitService({
    storage: fruitStorage,
    contentAccess: new InMemoryFruitMarkdownContentAccessAdapter(),
    idGenerator: createIdGenerator(),
    now,
  });
  const service = new GrowthService({
    storage,
    seedStorage,
    fruitStorage,
    generatorStorage,
    fruitService,
    agentPort,
    geneUsageTracking: options.geneUsageTracking,
    idGenerator: createIdGenerator(),
    now,
    scheduleTaskExecution: scheduler.schedule,
    attemptConcurrency: options.attemptConcurrency,
  });
  return {
    service,
    storage,
    seedStorage,
    fruitStorage,
    generatorStorage,
    fruitService,
    scheduler,
  };
}

describe("GrowthService", () => {
  it("starts growth from a seed and delivers candidate fruits to the fruit module", async () => {
    const capturedTasks: AgentTask[] = [];
    const { service, scheduler } = await createFixture(successAgent(capturedTasks));

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      userInput: "更强调情绪价值",
      generatorId: "generator_1",
      fruitCount: 2,
    });

    expect(result.task).toMatchObject({
      status: GROWTH_TASK_STATUSES.running,
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      successfulFruitIds: [],
    });
    expect(result.task.attempts).toHaveLength(0);
    expect(capturedTasks).toHaveLength(0);
    await expect(
      service.getSourceStatus({ nodeType: "seed", nodeId: "seed-node_seed_1" }),
    ).resolves.toMatchObject({
      isGrowing: true,
      taskId: result.task.id,
    });

    await scheduler.runAll();
    const completed = await service.getGrowthTask(result.task.id);
    expect(completed).toMatchObject({
      status: GROWTH_TASK_STATUSES.completed,
      successfulFruitIds: ["fruit_1", "fruit_2"],
    });
    expect(completed.attempts).toHaveLength(2);
    expect(capturedTasks).toHaveLength(2);
    expect(capturedTasks[0]?.type).toBe("growth");
    await expect(
      service.getSourceStatus({ nodeType: "seed", nodeId: "seed-node_seed_1" }),
    ).resolves.toMatchObject({
      isGrowing: false,
      taskId: null,
    });
  });

  it("lands structured candidate_fruit output through FruitService", async () => {
    const { service, fruitStorage, scheduler } = await createFixture(structuredCandidateAgent());

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
      geneRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
    });

    expect(result.task.status).toBe(GROWTH_TASK_STATUSES.running);
    await scheduler.runAll();
    const completed = await service.getGrowthTask(result.task.id);
    const fruit = await fruitStorage.findFruitById(completed.successfulFruitIds[0] ?? "");
    expect(completed.status).toBe(GROWTH_TASK_STATUSES.completed);
    expect(fruit).toMatchObject({
      generatorId: "generator_1",
      summary: "结构化候选摘要",
      geneTags: ["结构化"],
    });
  });

  it("records positive gene usage when referenced gene growth completes", async () => {
    const usages: Array<{
      seedId: string;
      insightId: string;
      sourceType: string;
      sourceId: string;
      outcome: string;
    }> = [];
    const { service, scheduler } = await createFixture(structuredCandidateAgent(), {
      geneUsageTracking: {
        async recordGeneUsage(seedId, input): Promise<void> {
          usages.push({ seedId, ...input });
        },
      },
    });

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
      geneRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
    });
    await scheduler.runAll();

    expect(usages).toMatchObject([
      {
        seedId: "seed_1",
        insightId: "gene_1",
        sourceType: GENE_USAGE_SOURCE_TYPES.growthTask,
        sourceId: result.task.id,
        outcome: GENE_USAGE_OUTCOMES.positive,
      },
    ]);
  });

  it("starts growth from a fruit that belongs to the current seed", async () => {
    const { service, fruitService, scheduler } = await createFixture();
    const parent = await fruitService.createFruitFromCandidate({
      markdown: "父果实",
      parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
    });

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "fruit", nodeId: parent.id },
      generatorId: "generator_1",
      fruitCount: 1,
    });

    expect(result.task.status).toBe(GROWTH_TASK_STATUSES.running);
    await scheduler.runAll();
    await expect(service.getGrowthTask(result.task.id)).resolves.toMatchObject({
      status: GROWTH_TASK_STATUSES.completed,
      sourceNodeRef: { nodeType: "fruit", nodeId: parent.id },
    });
  });

  it("rejects invalid sources, archived seeds, unavailable generators, and invalid counts", async () => {
    const { service } = await createFixture();

    await expect(
      service.startGrowthTask({
        seedId: "missing",
        sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_missing" },
        generatorId: "generator_1",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.startGrowthTask({
        seedId: "seed_archived",
        sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_archived" },
        generatorId: "generator_1",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.startGrowthTask({
        seedId: "seed_1",
        sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
        generatorId: "generator_disabled",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.startGrowthTask({
        seedId: "seed_1",
        sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
        generatorId: "generator_1",
        fruitCount: 7,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("authorizes references before passing an authorization scope to Agent", async () => {
    const capturedTasks: AgentTask[] = [];
    const authorizer: GrowthReferenceAuthorizationPort = {
      async authorize(input: GrowthAuthorizationScope): Promise<GrowthAuthorizationScope> {
        if (input.nutrientRefs.some((ref) => ref.resourceId === "blocked")) {
          throw new ApplicationError("VALIDATION_ERROR", "引用资源不可访问", 400);
        }
        return input;
      },
    };
    const fixture = await createFixture(successAgent(capturedTasks));
    const service = new GrowthService({
      storage: fixture.storage,
      seedStorage: fixture.seedStorage,
      fruitStorage: fixture.fruitStorage,
      generatorStorage: fixture.generatorStorage,
      fruitService: fixture.fruitService,
      agentPort: successAgent(capturedTasks),
      referenceAuthorization: authorizer,
      idGenerator: createIdGenerator(),
      now: createNow(),
      scheduleTaskExecution: fixture.scheduler.schedule,
    });

    await expect(
      service.startGrowthTask({
        seedId: "seed_1",
        sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
        generatorId: "generator_1",
        nutrientRefs: [{ resourceType: "nutrient", resourceId: "blocked" }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
      nutrientRefs: [{ resourceType: "nutrient", resourceId: "nutrient_1" }],
      geneRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
    });
    await fixture.scheduler.runAll();

    expect(capturedTasks[0]?.input).toMatchObject({
      authorizationScope: {
        nutrientRefs: [{ resourceType: "nutrient", resourceId: "nutrient_1" }],
        geneRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
      },
    });
    expect(JSON.stringify(capturedTasks[0]?.input)).not.toContain(":\\");
  });

  it("uses growth locks per source node and leaves other nodes available", async () => {
    const { service, storage } = await createFixture();
    await storage.acquireLock({
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      taskId: "existing_task",
      lockedAt: "2026-01-01T00:00:00.000Z",
    });

    await expect(
      service.startGrowthTask({
        seedId: "seed_1",
        sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
        generatorId: "generator_1",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.getSourceStatus({ nodeType: "seed", nodeId: "seed-node_seed_1" }),
    ).resolves.toMatchObject({
      isGrowing: true,
      taskId: "existing_task",
    });
  });

  it("runs five Agent attempts with bounded concurrency when fruit count is five", async () => {
    const capturedTasks: AgentTask[] = [];
    const metrics = { active: 0, maxActive: 0 };
    const { service, scheduler } = await createFixture(
      concurrentSuccessAgent({ capturedTasks, metrics }),
      { attemptConcurrency: 2 },
    );

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 5,
    });

    expect(result.task.status).toBe(GROWTH_TASK_STATUSES.running);
    expect(capturedTasks).toHaveLength(0);
    await scheduler.runAll();
    expect(capturedTasks).toHaveLength(5);
    expect(metrics.maxActive).toBe(2);
    expect(capturedTasks.map((task) => task.input.attemptIndex)).toEqual([
      1,
      2,
      3,
      4,
      5,
    ]);
    expect(capturedTasks.map((task) => task.input.target)).toEqual([
      { fruitCount: 1, totalFruitCount: 5 },
      { fruitCount: 1, totalFruitCount: 5 },
      { fruitCount: 1, totalFruitCount: 5 },
      { fruitCount: 1, totalFruitCount: 5 },
      { fruitCount: 1, totalFruitCount: 5 },
    ]);
  });

  it("caps attempt concurrency at three and keeps consuming remaining attempts", async () => {
    const capturedTasks: AgentTask[] = [];
    const metrics = { active: 0, maxActive: 0 };
    const { service, scheduler } = await createFixture(
      concurrentSuccessAgent({ capturedTasks, metrics }),
      { attemptConcurrency: 5 },
    );

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 6,
    });

    await scheduler.runAll();
    const completed = await service.getGrowthTask(result.task.id);
    expect(capturedTasks).toHaveLength(6);
    expect(metrics.maxActive).toBe(3);
    expect(completed.successfulFruitIds).toHaveLength(6);
  });

  it("completes partial success without rolling back created fruits", async () => {
    const capturedTasks: AgentTask[] = [];
    const { service, scheduler } = await createFixture(partialAgent(capturedTasks));

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 3,
    });

    expect(result.task.status).toBe(GROWTH_TASK_STATUSES.running);
    await scheduler.runAll();
    const completed = await service.getGrowthTask(result.task.id);
    expect(completed.status).toBe(GROWTH_TASK_STATUSES.completed);
    expect(completed.successfulFruitIds).toEqual(["fruit_1", "fruit_2"]);
    expect(completed.attempts.map((attempt) => attempt.status)).toEqual([
      GROWTH_ATTEMPT_STATUSES.succeeded,
      GROWTH_ATTEMPT_STATUSES.failed,
      GROWTH_ATTEMPT_STATUSES.succeeded,
    ]);
  });

  it("marks zero-success tasks as failed, saves latest failed input, and supports retry", async () => {
    const { service, scheduler } = await createFixture(invalidOutputAgent());

    const started = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      userInput: "失败输入",
      generatorId: "generator_1",
      fruitCount: 2,
    });

    expect(started.task.status).toBe(GROWTH_TASK_STATUSES.running);
    await scheduler.runAll();
    const failed = await service.getGrowthTask(started.task.id);
    expect(failed.status).toBe(GROWTH_TASK_STATUSES.failed);
    await expect(
      service.getLatestFailedInput({
        nodeType: "seed",
        nodeId: "seed-node_seed_1",
      }),
    ).resolves.toMatchObject({
      userInput: "失败输入",
      generatorId: "generator_1",
    });

    const retried = await service.retryLatestFailedTask({
      nodeType: "seed",
      nodeId: "seed-node_seed_1",
    });
    expect(retried.task.status).toBe(GROWTH_TASK_STATUSES.running);
    await scheduler.runAll();
    await expect(service.getGrowthTask(retried.task.id)).resolves.toMatchObject({
      status: GROWTH_TASK_STATUSES.failed,
    });
  });

  it("recovers interrupted running tasks with successful attempts as completed and releases the lock", async () => {
    const { service, storage } = await createFixture();
    const started = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 2,
    });
    await storage.createAttempt({
      id: "growth-attempt_orphan_success",
      taskId: started.task.id,
      attemptIndex: 1,
      status: GROWTH_ATTEMPT_STATUSES.succeeded,
      agentTaskId: "agent_orphan_success",
      fruitId: "fruit_orphan_1",
      failureReason: null,
      agentOutput: {},
      createdAt: "2026-01-01T00:00:10.000Z",
      updatedAt: "2026-01-01T00:00:11.000Z",
    });
    await storage.createAttempt({
      id: "growth-attempt_orphan_running",
      taskId: started.task.id,
      attemptIndex: 2,
      status: GROWTH_ATTEMPT_STATUSES.running,
      agentTaskId: null,
      fruitId: null,
      failureReason: null,
      agentOutput: {},
      createdAt: "2026-01-01T00:00:12.000Z",
      updatedAt: "2026-01-01T00:00:12.000Z",
    });

    await service.recoverInterruptedGrowthTasks();

    const recovered = await service.getGrowthTask(started.task.id);
    expect(recovered.status).toBe(GROWTH_TASK_STATUSES.completed);
    expect(recovered.successfulFruitIds).toEqual(["fruit_orphan_1"]);
    expect(recovered.attempts.map((attempt) => attempt.status)).toEqual([
      GROWTH_ATTEMPT_STATUSES.succeeded,
      GROWTH_ATTEMPT_STATUSES.failed,
    ]);
    await expect(
      service.getSourceStatus({ nodeType: "seed", nodeId: "seed-node_seed_1" }),
    ).resolves.toMatchObject({ isGrowing: false, taskId: null });
  });

  it("recovers interrupted running tasks without successful attempts as failed input and releases the lock", async () => {
    const { service, storage } = await createFixture();
    const started = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      userInput: "中断前输入",
      generatorId: "generator_1",
      fruitCount: 1,
    });
    await storage.createAttempt({
      id: "growth-attempt_orphan_failed",
      taskId: started.task.id,
      attemptIndex: 1,
      status: GROWTH_ATTEMPT_STATUSES.running,
      agentTaskId: null,
      fruitId: null,
      failureReason: null,
      agentOutput: {},
      createdAt: "2026-01-01T00:00:10.000Z",
      updatedAt: "2026-01-01T00:00:10.000Z",
    });

    await service.recoverInterruptedGrowthTasks();

    const recovered = await service.getGrowthTask(started.task.id);
    expect(recovered.status).toBe(GROWTH_TASK_STATUSES.failed);
    expect(recovered.failureReason).toBe("枝化生长任务因服务中断而停止");
    await expect(
      service.getLatestFailedInput({
        nodeType: "seed",
        nodeId: "seed-node_seed_1",
      }),
    ).resolves.toMatchObject({
      userInput: "中断前输入",
      failureReason: "枝化生长任务因服务中断而停止",
    });
    await expect(
      service.getSourceStatus({ nodeType: "seed", nodeId: "seed-node_seed_1" }),
    ).resolves.toMatchObject({ isGrowing: false, taskId: null });
  });

  it("rejects retry when there is no latest failed input", async () => {
    const { service } = await createFixture();

    await expect(
      service.retryLatestFailedTask({
        nodeType: "seed",
        nodeId: "seed-node_seed_1",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
