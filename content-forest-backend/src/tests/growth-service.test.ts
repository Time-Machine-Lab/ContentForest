import { describe, expect, it } from "vitest";
import type { AgentPort } from "../agent/ports/agent-port.js";
import {
  attachCandidateMediaArtifacts,
  type CandidateMediaArtifactPayload,
} from "../agent/runtime/candidate-media-artifact.js";
import type { AgentTask, AgentTaskResult } from "../agent/runtime/agent-task.js";
import { InMemoryFruitMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-fruit-markdown-content-access-adapter.js";
import { InMemoryMediaContentAccessAdapter } from "../content-access/adapters/in-memory-media-content-access-adapter.js";
import { FruitService } from "../modules/fruit/application/fruit-service.js";
import {
  GENE_USAGE_OUTCOMES,
  GENE_USAGE_SOURCE_TYPES,
} from "../modules/gene/domain/gene-types.js";
import {
  GrowthService,
  type GeneUsageTrackingPort,
  type GrowthNutrientUsageTrackingPort,
  type GrowthReferenceAuthorizationPort,
  type GrowthTaskExecutionScheduler,
} from "../modules/growth/application/growth-service.js";
import {
  GROWTH_ATTEMPT_STATUSES,
  GROWTH_MUTATION_INTENSITIES,
  GROWTH_PATH_STEP_STATUSES,
  GROWTH_SEARCH_MODES,
  GROWTH_TASK_STATUSES,
  type GrowthAuthorizationScope,
  type GrowthMutationPlan,
} from "../modules/growth/domain/growth-types.js";
import { MediaService } from "../modules/media/application/media-service.js";
import { SEED_ARCHIVE_STATES } from "../modules/seed/domain/seed-types.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryFruitStorageAdapter } from "../storage/adapters/in-memory-fruit-storage-adapter.js";
import { InMemoryGeneratorStorageAdapter } from "../storage/adapters/in-memory-generator-storage-adapter.js";
import { InMemoryGrowthStorageAdapter } from "../storage/adapters/in-memory-growth-storage-adapter.js";
import { InMemoryMediaStorageAdapter } from "../storage/adapters/in-memory-media-storage-adapter.js";
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

function testMutationPlan(direction = "测试突变方向"): GrowthMutationPlan {
  return {
    direction,
    intent: "测试突变意图",
    intensity: GROWTH_MUTATION_INTENSITIES.balanced,
    hypothesis: "测试突变假设",
    inherit: [],
    avoid: [],
    evidenceSummary: "测试证据摘要",
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

function tracedAgent(capturedTasks: AgentTask[] = []): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      capturedTasks.push(task);
      return {
        ok: true,
        taskId: task.taskId ?? `agent_${capturedTasks.length}`,
        output: {
          taskType: "growth",
          content: {
            markdown: `# 路径图果实 ${capturedTasks.length}`,
          },
        },
        trace: [
          {
            type: "task_started",
            at: "2026-01-01T00:00:19.000Z",
            message: "Agent task started: growth",
            metadata: { taskType: "growth" },
          },
          {
            type: "skill_called",
            at: "2026-01-01T00:00:19.100Z",
            message: "Skill called: branch_growth",
            metadata: { skillName: "branch_growth" },
          },
          {
            type: "tool_called",
            at: "2026-01-01T00:00:19.200Z",
            message: "Tool called: read_growth_source_node",
            metadata: { toolName: "read_growth_source_node" },
          },
          {
            type: "llm_called",
            at: "2026-01-01T00:00:19.300Z",
            message: "LLM called",
            metadata: { provider: "test" },
          },
          {
            type: "skill_progress",
            at: "2026-01-01T00:00:20.000Z",
            message: "Branch growth context loaded",
            metadata: { stage: "context_loaded" },
          },
          {
            type: "skill_progress",
            at: "2026-01-01T00:00:21.000Z",
            message: "正在生成文案",
            metadata: {
              userVisible: true,
              stepId: "copywriting",
              label: "生成文案",
              status: "completed",
              detail: "使用生成器产出正文草稿",
            },
          },
          {
            type: "output_validated",
            at: "2026-01-01T00:00:22.000Z",
            message: "Candidate output validated",
            metadata: { stage: "candidate_validated" },
          },
        ],
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

function mediaUsingAgent(capturedTasks: AgentTask[] = []): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      capturedTasks.push(task);
      return {
        ok: true,
        taskId: task.taskId ?? "agent_media",
        output: {
          taskType: "growth",
          content: {
            type: "candidate_fruit",
            payload: {
              markdown: "# 媒体参考果实",
              rawGeneratorOutput: "# 媒体参考果实",
              attachments: [],
            },
            meta: {
              summary: "媒体候选摘要",
              geneTags: ["媒体参考"],
              usedResourceRefs: [
                { resourceType: "media", resourceId: "media_1" },
              ],
              mutationOperators: [],
              warnings: [],
              riskWarnings: [],
            },
          },
        },
        trace: [],
      };
    },
  };
}

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

function candidateMediaArtifact(
  overrides: Partial<CandidateMediaArtifactPayload> = {},
): CandidateMediaArtifactPayload {
  return {
    id: "candidate_cover",
    sourceToolName: "make_cover",
    mediaType: "image",
    mimeType: "image/png",
    fileName: "cover.png",
    sizeBytes: tinyPng.byteLength,
    displayRole: "primary",
    required: false,
    attachToFruit: true,
    purpose: "cover",
    temporaryResourceRef: null,
    warnings: [],
    content: tinyPng,
    ...overrides,
  };
}

function generatedMediaAgent(input: {
  artifact?: CandidateMediaArtifactPayload;
  attachments?: string[];
  usedResourceRefs?: unknown[];
} = {}): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      const output = attachCandidateMediaArtifacts(
        {
          taskType: "growth",
          content: {
            type: "candidate_fruit",
            payload: {
              markdown: "# 带图果实",
              rawGeneratorOutput: "# 带图果实",
              attachments: input.attachments ?? [],
            },
            meta: {
              summary: "带图候选果实",
              geneTags: ["封面"],
              usedResourceRefs: input.usedResourceRefs ?? [],
              mutationOperators: [],
              warnings: [],
              riskWarnings: [],
            },
          },
        },
        [input.artifact ?? candidateMediaArtifact()],
      );
      return {
        ok: true,
        taskId: task.taskId ?? "agent_generated_media",
        output,
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
    nutrientUsageTracking?: GrowthNutrientUsageTrackingPort;
    referenceAuthorization?: GrowthReferenceAuthorizationPort;
  } = {},
): Promise<{
  service: GrowthService;
  storage: InMemoryGrowthStorageAdapter;
  seedStorage: InMemorySeedStorageAdapter;
  fruitStorage: InMemoryFruitStorageAdapter;
  generatorStorage: InMemoryGeneratorStorageAdapter;
  mediaStorage: InMemoryMediaStorageAdapter;
  mediaService: MediaService;
  fruitService: FruitService;
  scheduler: ReturnType<typeof createManualGrowthScheduler>;
}> {
  const seedStorage = new InMemorySeedStorageAdapter();
  const fruitStorage = new InMemoryFruitStorageAdapter();
  const generatorStorage = new InMemoryGeneratorStorageAdapter();
  const mediaStorage = new InMemoryMediaStorageAdapter();
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
    mediaStorage,
    idGenerator: createIdGenerator(),
    now,
  });
  const mediaService = new MediaService({
    storage: mediaStorage,
    contentAccess: new InMemoryMediaContentAccessAdapter(),
    idGenerator: createIdGenerator(),
    now,
  });
  const service = new GrowthService({
    storage,
    seedStorage,
    fruitStorage,
    generatorStorage,
    fruitService,
    mediaService,
    agentPort,
    geneUsageTracking: options.geneUsageTracking,
    nutrientUsageTracking: options.nutrientUsageTracking,
    referenceAuthorization: options.referenceAuthorization,
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
    mediaStorage,
    mediaService,
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

  it("records formal and temporary nutrient usage after each successful fruit attempt", async () => {
    const usageCalls: Array<Parameters<GrowthNutrientUsageTrackingPort["recordNutrientUsage"]>[0]> = [];
    const nutrientUsageTracking: GrowthNutrientUsageTrackingPort = {
      async recordNutrientUsage(input) {
        usageCalls.push(input);
      },
    };
    const { service, scheduler } = await createFixture(successAgent(), {
      nutrientUsageTracking,
    });

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 2,
      nutrientRefs: [{ resourceType: "nutrient", resourceId: "nutrient_1" }],
      temporaryNutrientCardRefs: [
        { resourceType: "nutrient_card", resourceId: "card_1" },
      ],
    });

    await scheduler.runAll();

    expect(usageCalls).toHaveLength(2);
    for (const [index, call] of usageCalls.entries()) {
      expect(call).toMatchObject({
        seedId: "seed_1",
        growthTaskId: result.task.id,
        growthAttemptId: `growth-attempt_${index + 2}`,
        fruitId: `fruit_${index + 1}`,
      });
      expect(call.refs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            resourceType: "nutrient",
            resourceId: "nutrient_1",
            usageStatus: "provided",
          }),
          expect.objectContaining({
            resourceType: "nutrient_card",
            resourceId: "card_1",
            usageStatus: "provided",
          }),
          expect.objectContaining({
            resourceType: "nutrient",
            resourceId: "nutrient_1",
            usageStatus: "planned",
          }),
          expect.objectContaining({
            resourceType: "nutrient_card",
            resourceId: "card_1",
            usageStatus: "planned_not_used",
          }),
        ]),
      );
    }
  });

  it("assembles round growth briefs and degrades when the seed master brief is missing", async () => {
    const capturedTasks: AgentTask[] = [];
    const { service, seedStorage, scheduler } = await createFixture(
      successAgent(capturedTasks),
    );

    const first = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      userInput: "补充本轮创作想法",
      generatorId: "generator_1",
      fruitCount: 1,
    });
    expect(first.task.agentInput).toMatchObject({
      roundGrowthBrief: {
        seed: {
          hasMasterBrief: false,
          masterBriefContentLocation: null,
        },
        userInput: "补充本轮创作想法",
      },
    });
    await scheduler.runAll();
    expect(capturedTasks[0]?.input).toMatchObject({
      roundGrowthBrief: {
        seed: { hasMasterBrief: false },
        userInput: "补充本轮创作想法",
      },
    });

    await seedStorage.upsertSeedBrief({
      id: "seed-brief_1",
      seedId: "seed_1",
      contentLocation: "seeds/seed_1/brief.md",
      createdAt: "2026-01-01T00:01:00.000Z",
      updatedAt: "2026-01-01T00:01:00.000Z",
    });

    const second = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
    });
    expect(second.task.agentInput).toMatchObject({
      roundGrowthBrief: {
        seed: {
          hasMasterBrief: true,
          masterBriefContentLocation: "seeds/seed_1/brief.md",
        },
      },
    });
  });

  it("resolves explicit and recommended search mode and mutation intensity", async () => {
    const recommendedFixture = await createFixture();
    const recommended = await recommendedFixture.service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
    });
    expect(recommended.task.pipelineParams).toMatchObject({
      searchMode: GROWTH_SEARCH_MODES.broadExploration,
      mutationIntensity: GROWTH_MUTATION_INTENSITIES.aggressive,
    });
    expect(recommended.task.pipelineParams.recommendationReason).toContain("系统推荐");

    const explicitFixture = await createFixture();
    const explicit = await explicitFixture.service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
      searchMode: GROWTH_SEARCH_MODES.localVariation,
      mutationIntensity: GROWTH_MUTATION_INTENSITIES.conservative,
    });
    expect(explicit.task.pipelineParams).toMatchObject({
      searchMode: GROWTH_SEARCH_MODES.localVariation,
      mutationIntensity: GROWTH_MUTATION_INTENSITIES.conservative,
    });
  });

  it("creates differentiated dynamic mutation plans per attempt", async () => {
    const capturedTasks: AgentTask[] = [];
    const { service, scheduler } = await createFixture(successAgent(capturedTasks));

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      userInput: "做成真实经验分享",
      generatorId: "generator_1",
      fruitCount: 3,
      nutrientRefs: [{ resourceType: "nutrient", resourceId: "nutrient_1" }],
      geneRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
      mutationIntensity: GROWTH_MUTATION_INTENSITIES.balanced,
    });

    await scheduler.runAll();
    const completed = await service.getGrowthTask(result.task.id);
    const plans = completed.attempts.map((attempt) => attempt.mutationPlan);

    expect(new Set(plans.map((plan) => plan.direction)).size).toBe(3);
    expect(new Set(plans.map((plan) => plan.selectedRouteId)).size).toBe(3);
    expect(plans.every((plan) => plan.selectedRoute !== undefined)).toBe(true);
    expect(plans.every((plan) => plan.referencePlan !== undefined)).toBe(true);
    expect(plans.every((plan) => (plan.mutationOperators?.length ?? 0) > 0)).toBe(true);
    expect(plans[0]?.direction).toContain("真实经验分享");
    expect(plans.every((plan) => plan.intensity === GROWTH_MUTATION_INTENSITIES.balanced)).toBe(true);
    expect(capturedTasks[0]?.input).toMatchObject({
      mutationPlan: expect.objectContaining({
        selectedRouteId: plans[0]?.selectedRouteId,
        referencePlan: plans[0]?.referencePlan,
        plannedReferenceUsage: plans[0]?.plannedReferenceUsage,
      }),
      selectedRoute: plans[0]?.selectedRoute,
      referencePlan: plans[0]?.referencePlan,
      referenceAtoms: plans[0]?.referenceAtoms,
      plannedReferenceUsage: plans[0]?.plannedReferenceUsage,
      mutationOperators: plans[0]?.mutationOperators,
      searchMode: GROWTH_SEARCH_MODES.broadExploration,
    });
  });

  it("atomizes heterogeneous references and routes constraints before attention", async () => {
    const capturedTasks: AgentTask[] = [];
    const { service, scheduler } = await createFixture(successAgent(capturedTasks));

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      userInput: "美妆广告内容，注意功效表达边界",
      generatorId: "generator_1",
      fruitCount: 2,
      nutrientRefs: [
        { resourceType: "nutrient", resourceId: "brand_brief_nutrient" },
        { resourceType: "nutrient", resourceId: "paper_study_nutrient" },
        { resourceType: "nutrient", resourceId: "viral_case_nutrient" },
        { resourceType: "nutrient", resourceId: "comment_signal_nutrient" },
      ],
      temporaryNutrientCardRefs: [
        { resourceType: "nutrient_card", resourceId: "temporary_ad_brief_card" },
      ],
      geneRefs: [
        { resourceType: "gene", resourceId: "gene_positive" },
        { resourceType: "gene", resourceId: "gene_negative_fail" },
      ],
      searchMode: GROWTH_SEARCH_MODES.broadExploration,
    });

    await scheduler.runAll();
    const completed = await service.getGrowthTask(result.task.id);
    const plans = completed.attempts.map((attempt) => attempt.mutationPlan);
    const firstPlan = plans[0]?.referencePlan;
    const atoms = firstPlan?.atoms ?? [];
    const routes = firstPlan?.routes ?? [];

    expect(atoms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceType: "formal_nutrient", atomType: "brand_requirement" }),
        expect.objectContaining({ sourceType: "formal_nutrient", atomType: "conversion_asset" }),
        expect.objectContaining({ sourceType: "formal_nutrient", atomType: "claim_candidate" }),
        expect.objectContaining({ sourceType: "formal_nutrient", atomType: "risk_constraint" }),
        expect.objectContaining({ sourceType: "formal_nutrient", atomType: "case_pattern" }),
        expect.objectContaining({ sourceType: "formal_nutrient", atomType: "audience_signal" }),
        expect.objectContaining({ sourceType: "temporary_nutrient_card", atomType: "brand_requirement" }),
        expect.objectContaining({ sourceType: "gene", atomType: "performance_signal" }),
        expect.objectContaining({ sourceType: "gene", atomType: "counterexample" }),
      ]),
    );
    expect(routes[0]).toEqual(
      expect.objectContaining({
        priority: "must",
      }),
    );
    expect(["risk_review", "fact_check"]).toContain(routes[0]?.slot);
    expect(firstPlan?.riskCheckRequired).toBe(true);
    expect(firstPlan?.plannedUsage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceType: "nutrient",
          status: "planned",
          slots: expect.arrayContaining(["fact_check"]),
        }),
      ]),
    );
    expect(capturedTasks[0]?.input).toMatchObject({
      referenceAtoms: expect.any(Array),
      plannedReferenceUsage: expect.any(Array),
    });
    expect(plans[0]?.plannedReferenceUsage).not.toEqual(plans[1]?.plannedReferenceUsage);
  });

  it("authorizes mediaRefs and rejects inaccessible media before scheduling", async () => {
    const scopes: GrowthAuthorizationScope[] = [];
    const referenceAuthorization: GrowthReferenceAuthorizationPort = {
      async authorize(scope: GrowthAuthorizationScope): Promise<GrowthAuthorizationScope> {
        scopes.push(scope);
        if (scope.mediaRefs.some((ref) => ref.resourceId !== "media_1")) {
          throw new ApplicationError("VALIDATION_ERROR", "媒体资源不可访问", 400);
        }
        return {
          ...scope,
          sourceNodeRef: { ...scope.sourceNodeRef },
          nutrientRefs: scope.nutrientRefs.map((ref) => ({ ...ref })),
          temporaryNutrientCardRefs: scope.temporaryNutrientCardRefs.map((ref) => ({
            ...ref,
          })),
          mediaRefs: scope.mediaRefs.map((ref) => ({ ...ref })),
          geneRefs: scope.geneRefs.map((ref) => ({ ...ref })),
        };
      },
    };
    const fixture = await createFixture(successAgent(), { referenceAuthorization });

    const result = await fixture.service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      mediaRefs: [
        { resourceType: "media", resourceId: "media_1", usage: "参考封面视觉" },
      ],
    });

    expect(scopes[0]?.mediaRefs).toEqual([
      { resourceType: "media", resourceId: "media_1", usage: "参考封面视觉" },
    ]);
    expect(result.task.authorizationScope.mediaRefs).toEqual([
      { resourceType: "media", resourceId: "media_1", usage: "参考封面视觉" },
    ]);

    const rejectingFixture = await createFixture(successAgent(), {
      referenceAuthorization,
    });
    await expect(
      rejectingFixture.service.startGrowthTask({
        seedId: "seed_1",
        sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
        generatorId: "generator_1",
        mediaRefs: [
          { resourceType: "media", resourceId: "media_missing", usage: "不可访问" },
        ],
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    expect(rejectingFixture.scheduler.pendingCount()).toBe(0);
  });

  it("routes media references into ReferenceAtom, planned usage, and actual usage", async () => {
    const capturedTasks: AgentTask[] = [];
    const { service, scheduler } = await createFixture(mediaUsingAgent(capturedTasks));

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      userInput: "基于图片做一版封面文案",
      generatorId: "generator_1",
      fruitCount: 1,
      mediaRefs: [
        { resourceType: "media", resourceId: "media_1", usage: "参考封面视觉风格" },
      ],
    });

    await scheduler.runAll();
    const completed = await service.getGrowthTask(result.task.id);
    const attempt = completed.attempts[0];

    expect(capturedTasks[0]?.input).toMatchObject({
      authorizationScope: {
        mediaRefs: [
          {
            resourceType: "media",
            resourceId: "media_1",
            usage: "参考封面视觉风格",
          },
        ],
      },
    });
    expect(attempt?.referenceAtoms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "media",
          resourceType: "media",
          resourceId: "media_1",
          atomType: "visual_audio_asset",
        }),
      ]),
    );
    expect(attempt?.plannedReferenceUsage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "media",
          resourceType: "media",
          resourceId: "media_1",
          status: "planned",
        }),
      ]),
    );
    expect(attempt?.actualReferenceUsage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "media",
          resourceType: "media",
          resourceId: "media_1",
          status: "actual",
        }),
      ]),
    );
  });

  it("keeps pure text generator output working when no candidate media is returned", async () => {
    const { service, fruitService, scheduler } = await createFixture(successAgent());

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
    });

    await scheduler.runAll();
    const completed = await service.getGrowthTask(result.task.id);
    const fruit = await fruitService.getFruit(completed.successfulFruitIds[0] ?? "");

    expect(completed.status).toBe(GROWTH_TASK_STATUSES.completed);
    expect(fruit.media).toEqual([]);
  });

  it("takes over generated media candidates and attaches successful Media Assets to fruits", async () => {
    const { service, fruitService, scheduler } = await createFixture(generatedMediaAgent());

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
    });

    await scheduler.runAll();
    const completed = await service.getGrowthTask(result.task.id);
    const attempt = completed.attempts[0];
    const fruit = await fruitService.getFruit(completed.successfulFruitIds[0] ?? "");

    expect(completed.status).toBe(GROWTH_TASK_STATUSES.completed);
    expect(fruit.media).toEqual([
      expect.objectContaining({
        id: "media-asset_1",
        sourceType: "generated_output",
        sourceId: attempt?.id,
        displayRole: "primary",
        contentUrl: "/api/media-assets/media-asset_1/content",
      }),
    ]);
    expect(attempt?.agentOutput.metadata).toMatchObject({
      candidateMediaArtifacts: [
        expect.objectContaining({
          id: "candidate_cover",
          sourceToolName: "make_cover",
          fileName: "cover.png",
        }),
      ],
      mediaAttachments: [
        expect.objectContaining({
          mediaAssetId: "media-asset_1",
          displayRole: "primary",
        }),
      ],
    });
    expect(JSON.stringify(attempt?.agentOutput)).not.toContain("iVBOR");
    expect(attempt?.actualReferenceUsage ?? []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resourceType: "media" }),
      ]),
    );
  });

  it("warns for optional media takeover failures and fails attempts for required media", async () => {
    const optionalFixture = await createFixture(generatedMediaAgent({
      artifact: candidateMediaArtifact({
        content: undefined,
        sizeBytes: 0,
        required: false,
      }),
    }));
    const optional = await optionalFixture.service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
    });
    await optionalFixture.scheduler.runAll();
    const optionalCompleted = await optionalFixture.service.getGrowthTask(optional.task.id);
    const optionalFruit = await optionalFixture.fruitService.getFruit(
      optionalCompleted.successfulFruitIds[0] ?? "",
    );

    expect(optionalCompleted.status).toBe(GROWTH_TASK_STATUSES.completed);
    expect(optionalFruit.media).toEqual([]);
    expect(optionalCompleted.attempts[0]?.agentOutput.metadata).toMatchObject({
      mediaTakeoverWarnings: [
        expect.stringContaining("候选媒体 candidate_cover 接管失败"),
      ],
    });

    const requiredFixture = await createFixture(generatedMediaAgent({
      artifact: candidateMediaArtifact({
        content: undefined,
        sizeBytes: 0,
        required: true,
      }),
    }));
    const required = await requiredFixture.service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
    });
    await requiredFixture.scheduler.runAll();
    const requiredCompleted = await requiredFixture.service.getGrowthTask(required.task.id);

    expect(requiredCompleted.status).toBe(GROWTH_TASK_STATUSES.failed);
    expect(requiredCompleted.attempts[0]).toMatchObject({
      status: GROWTH_ATTEMPT_STATUSES.failed,
      failureReason: expect.stringContaining("候选媒体 candidate_cover 接管失败"),
    });
  });

  it("does not turn payload attachment paths into formal media assets or leaked output", async () => {
    const attachmentOnlyAgent: AgentPort = {
      async runTask(task: AgentTask): Promise<AgentTaskResult> {
        return {
          ok: true,
          taskId: task.taskId ?? "agent_attachment_only",
          output: {
            taskType: "growth",
            content: {
              type: "candidate_fruit",
              payload: {
                markdown: "# 附件兼容果实",
                rawGeneratorOutput: "# 附件兼容果实",
                attachments: ["D:\\secret\\generated-cover.png"],
              },
              meta: {
                summary: "附件兼容果实",
                geneTags: [],
                usedResourceRefs: [],
                mutationOperators: [],
                warnings: [],
                riskWarnings: [],
              },
            },
          },
          trace: [],
        };
      },
    };
    const { service, fruitService, scheduler } = await createFixture(attachmentOnlyAgent);

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
    });

    await scheduler.runAll();
    const completed = await service.getGrowthTask(result.task.id);
    const fruit = await fruitService.getFruit(completed.successfulFruitIds[0] ?? "");

    expect(completed.status).toBe(GROWTH_TASK_STATUSES.completed);
    expect(fruit.media).toEqual([]);
    expect(JSON.stringify(completed.attempts[0]?.agentOutput)).not.toContain("D:\\secret");
    expect(completed.attempts[0]?.agentOutput.content).toMatchObject({
      payload: {
        attachments: ["[local-path]"],
      },
    });
  });

  it("infers platform and content form by generator, user, system, then fallback priority", async () => {
    const generatorTasks: AgentTask[] = [];
    const generatorFixture = await createFixture(successAgent(generatorTasks));
    const generatorResult = await generatorFixture.service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      userInput: "请发到 Reddit",
      generatorId: "generator_1",
      fruitCount: 1,
    });
    await generatorFixture.scheduler.runAll();
    expect(generatorTasks[0]?.input).toMatchObject({
      platformInference: {
        source: "generator",
        platforms: ["小红书"],
        contentForms: ["图文笔记"],
      },
      selectedRoute: expect.objectContaining({
        platforms: ["小红书"],
      }),
    });
    await expect(generatorFixture.service.getGrowthTask(generatorResult.task.id)).resolves.toMatchObject({
      attempts: [
        expect.objectContaining({
          selectedRoute: expect.objectContaining({ platforms: ["小红书"] }),
          platformInference: expect.objectContaining({ source: "generator" }),
        }),
      ],
    });

    const userTasks: AgentTask[] = [];
    const userFixture = await createFixture(successAgent(userTasks));
    await userFixture.generatorStorage.createGenerator({
      id: "generator_generic",
      name: "通用生成器",
      description: "泛用内容创作",
      enableState: "enabled",
      contentLocation: "generators/generator_generic",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      disabledAt: null,
    });
    await userFixture.service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      userInput: "做成 Reddit 讨论帖",
      generatorId: "generator_generic",
      fruitCount: 1,
    });
    await userFixture.scheduler.runAll();
    expect(userTasks[0]?.input).toMatchObject({
      platformInference: {
        source: "user",
        platforms: ["Reddit"],
        contentForms: ["讨论帖"],
      },
    });

    const systemTasks: AgentTask[] = [];
    const systemFixture = await createFixture(successAgent(systemTasks));
    await systemFixture.generatorStorage.createGenerator({
      id: "generator_plain",
      name: "通用生成器",
      description: "泛用内容创作",
      enableState: "enabled",
      contentLocation: "generators/generator_plain",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      disabledAt: null,
    });
    await systemFixture.seedStorage.createSeed({
      id: "seed_bilibili",
      title: "B站AI教学账号",
      archiveState: SEED_ARCHIVE_STATES.active,
      contentLocation: "seeds/seed_bilibili.md",
      rootNodeId: "seed-node_seed_bilibili",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      archivedAt: null,
    });
    await systemFixture.service.startGrowthTask({
      seedId: "seed_bilibili",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_bilibili" },
      generatorId: "generator_plain",
      fruitCount: 1,
    });
    await systemFixture.scheduler.runAll();
    expect(systemTasks[0]?.input).toMatchObject({
      platformInference: {
        source: "system",
        platforms: ["B站"],
        contentForms: ["视频脚本"],
      },
    });

    const fallbackTasks: AgentTask[] = [];
    const fallbackFixture = await createFixture(successAgent(fallbackTasks));
    await fallbackFixture.generatorStorage.createGenerator({
      id: "generator_neutral",
      name: "通用生成器",
      description: "泛用内容创作",
      enableState: "enabled",
      contentLocation: "generators/generator_neutral",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      disabledAt: null,
    });
    await fallbackFixture.service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_neutral",
      fruitCount: 1,
    });
    await fallbackFixture.scheduler.runAll();
    expect(fallbackTasks[0]?.input).toMatchObject({
      platformInference: {
        source: "fallback",
        platforms: ["通用内容平台"],
      },
    });
  });

  it("returns user-readable path graph without leaking Agent trace events", async () => {
    const capturedTasks: AgentTask[] = [];
    const { service, scheduler } = await createFixture(tracedAgent(capturedTasks));

    const result = await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
    });

    expect(result.task.pathGraph).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "pipeline:input",
          label: "获取输入",
          status: GROWTH_PATH_STEP_STATUSES.completed,
        }),
        expect.objectContaining({
          id: "pipeline:generation",
          label: "使用生成器",
          status: GROWTH_PATH_STEP_STATUSES.running,
        }),
        expect.objectContaining({
          id: "pipeline:wrap",
          label: "封装候选果实",
          status: GROWTH_PATH_STEP_STATUSES.pending,
        }),
      ]),
    );

    await scheduler.runAll();
    const completed = await service.getGrowthTask(result.task.id);

    expect(completed.pathGraph).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "pipeline:wrap",
          status: GROWTH_PATH_STEP_STATUSES.completed,
        }),
        expect.objectContaining({
          parentId: "pipeline:generation",
          attemptId: completed.attempts[0]?.id,
          detail: expect.any(String),
        }),
      ]),
    );
    expect(completed.pathGraph).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.stringMatching(/^attempt:/) }),
        expect.objectContaining({ parentId: `attempt:${completed.attempts[0]?.id}` }),
      ]),
    );
    expect(completed.pathGraph).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Agent task started: growth" }),
        expect.objectContaining({ label: "Skill called: branch_growth" }),
        expect.objectContaining({ label: "Tool called: read_growth_source_node" }),
        expect.objectContaining({ label: "LLM called" }),
        expect.objectContaining({ label: "Branch growth context loaded" }),
        expect.objectContaining({ label: "Candidate output validated" }),
      ]),
    );
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
        if (
          input.temporaryNutrientCardRefs.some(
            (ref) => ref.resourceId === "blocked-card",
          )
        ) {
          throw new ApplicationError("VALIDATION_ERROR", "营养卡片不可访问", 400);
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
    await expect(
      service.startGrowthTask({
        seedId: "seed_1",
        sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
        generatorId: "generator_1",
        temporaryNutrientCardRefs: [
          { resourceType: "nutrient_card", resourceId: "blocked-card" },
        ],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await service.startGrowthTask({
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      generatorId: "generator_1",
      fruitCount: 1,
      nutrientRefs: [{ resourceType: "nutrient", resourceId: "nutrient_1" }],
      temporaryNutrientCardRefs: [
        { resourceType: "nutrient_card", resourceId: "card_1" },
      ],
      geneRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
    });
    await fixture.scheduler.runAll();

    expect(capturedTasks[0]?.input).toMatchObject({
      authorizationScope: {
        nutrientRefs: [{ resourceType: "nutrient", resourceId: "nutrient_1" }],
        temporaryNutrientCardRefs: [
          { resourceType: "nutrient_card", resourceId: "card_1" },
        ],
        geneRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
      },
      roundGrowthBrief: {
        references: {
          temporaryNutrientCardRefs: [
            { resourceType: "nutrient_card", resourceId: "card_1" },
          ],
        },
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
      mutationPlan: testMutationPlan("中断恢复成功方向"),
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
      mutationPlan: testMutationPlan("中断恢复运行方向"),
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
      mutationPlan: testMutationPlan("中断失败方向"),
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
