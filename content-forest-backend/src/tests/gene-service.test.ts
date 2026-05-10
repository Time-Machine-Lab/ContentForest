import { describe, expect, it } from "vitest";
import type { AgentPort } from "../agent/ports/agent-port.js";
import type { AgentTask, AgentTaskResult } from "../agent/runtime/agent-task.js";
import { InMemoryFruitMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-fruit-markdown-content-access-adapter.js";
import { InMemoryGeneMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-gene-markdown-content-access-adapter.js";
import { InMemorySeedMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-seed-markdown-content-access-adapter.js";
import { FruitService } from "../modules/fruit/application/fruit-service.js";
import { GeneService } from "../modules/gene/application/gene-service.js";
import {
  GENE_EVIDENCE_SOURCE_TYPES,
  GENE_EXTRACTION_AGENT_INPUT_CONTRACT_VERSION,
  GENE_EXTRACTION_TASK_STATUSES,
  GENE_INSIGHT_STATUSES,
  GENE_REMINDER_STATUSES,
  GENE_SUGGESTION_STATUSES,
} from "../modules/gene/domain/gene-types.js";
import type { PublicationRecord } from "../modules/publication/domain/publication-types.js";
import { PublicationService } from "../modules/publication/application/publication-service.js";
import { SeedService } from "../modules/seed/application/seed-service.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryFruitStorageAdapter } from "../storage/adapters/in-memory-fruit-storage-adapter.js";
import { InMemoryGeneStorageAdapter } from "../storage/adapters/in-memory-gene-storage-adapter.js";
import { InMemoryPublicationStorageAdapter } from "../storage/adapters/in-memory-publication-storage-adapter.js";
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

function successAgent(capturedTasks: AgentTask[] = []): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      capturedTasks.push(task);
      return {
        ok: true,
        taskId: task.taskId ?? "agent-task_1",
        output: {
          taskType: "gene_extraction",
          content: {
            suggestions: [
              {
                title: "保留情绪价值表达",
                bodyMarkdown: "将用户情绪收益放在标题和开头。",
                lineage: "情绪价值",
                niche: "壁纸宣传",
              },
            ],
          },
        },
        trace: [],
      };
    },
  };
}

function failureAgent(): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      return {
        ok: false,
        taskId: task.taskId ?? "agent-task_1",
        error: {
          code: "AGENT_RUNTIME_ERROR",
          message: "Agent unavailable",
        },
        trace: [],
      };
    },
  };
}

function malformedSuccessAgent(capturedTasks: AgentTask[] = []): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      capturedTasks.push(task);
      return {
        ok: true,
        taskId: task.taskId ?? "agent-task_1",
        output: {
          taskType: "gene_extraction",
          content: {
            suggestions: [],
          },
        },
        trace: [],
      };
    },
  };
}

function createServices(agentPort: AgentPort = successAgent()): {
  geneService: GeneService;
  seedService: SeedService;
  fruitService: FruitService;
  geneStorage: InMemoryGeneStorageAdapter;
  geneContent: InMemoryGeneMarkdownContentAccessAdapter;
  publicationStorage: InMemoryPublicationStorageAdapter;
} {
  const seedStorage = new InMemorySeedStorageAdapter();
  const fruitStorage = new InMemoryFruitStorageAdapter();
  const geneStorage = new InMemoryGeneStorageAdapter();
  const publicationStorage = new InMemoryPublicationStorageAdapter();
  const geneContent = new InMemoryGeneMarkdownContentAccessAdapter();
  const idGenerator = createIdGenerator();
  const now = createNow();

  const geneService = new GeneService({
    storage: geneStorage,
    contentAccess: geneContent,
    seedStorage,
    fruitStorage,
    publicationStorage,
    agentPort,
    idGenerator,
    now,
  });
  const seedService = new SeedService({
    storage: seedStorage,
    contentAccess: new InMemorySeedMarkdownContentAccessAdapter(),
    afterSeedCreated: (seedId) =>
      geneService.prepareSeedGeneLibrary(seedId).then(() => undefined),
    idGenerator,
    now,
  });
  const fruitService = new FruitService({
    storage: fruitStorage,
    contentAccess: new InMemoryFruitMarkdownContentAccessAdapter(),
    onFruitSelectionChanged: ({ seedId, fruitId, selectionState }) =>
      geneService
        .createReminderFromFruitEvidence(seedId, {
          fruitId,
          action: selectionState === "selected" ? "selected" : "eliminated",
        })
        .then(() => undefined),
    idGenerator,
    now,
  });
  return {
    geneService,
    seedService,
    fruitService,
    geneStorage,
    geneContent,
    publicationStorage,
  };
}

function publicationRecord(
  id: string,
  fruitId: string,
): PublicationRecord {
  return {
    id,
    fruitId,
    publisherType: "manual",
    publicationTarget: "x",
    publicationEvidence: "https://example.com/post",
    publicationNote: "",
    publishedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("GeneService", () => {
  it("prepares a seed-scoped gene library when a seed is created", async () => {
    const { geneService, seedService } = createServices();
    const seed = await seedService.createSeed({
      title: "壁纸项目",
      markdown: "推广高清壁纸",
    });

    await expect(geneService.getSeedGeneLibrary(seed.id)).resolves.toMatchObject({
      seedId: seed.id,
      contentLocation: `genes/seed-scoped/${seed.id}`,
    });
  });

  it("creates lightweight reminders from fruit selection without running Agent", async () => {
    const capturedTasks: AgentTask[] = [];
    const { fruitService, seedService, geneService } = createServices(
      successAgent(capturedTasks),
    );
    const seed = await seedService.createSeed({
      title: "壁纸项目",
      markdown: "推广高清壁纸",
    });
    const fruit = await fruitService.createFruitFromCandidate({
      markdown: "选择这个表达",
      parentNodeRef: { nodeType: "seed", nodeId: seed.rootNodeId },
    });

    await fruitService.selectFruit(fruit.id);
    const reminders = await geneService.listPendingReminders(seed.id);

    expect(capturedTasks).toHaveLength(0);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      seedId: seed.id,
      status: GENE_REMINDER_STATUSES.pending,
      evidenceSources: [
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
          sourceId: fruit.id,
          strength: "weak",
        },
      ],
    });
  });

  it("starts extraction, builds Agent input, and persists pending suggestions only in database", async () => {
    const capturedTasks: AgentTask[] = [];
    const { fruitService, seedService, geneService, geneContent } = createServices(
      successAgent(capturedTasks),
    );
    const seed = await seedService.createSeed({
      title: "壁纸项目",
      markdown: "推广高清壁纸",
    });
    const fruit = await fruitService.createFruitFromCandidate({
      markdown: "用户想要被理解",
      parentNodeRef: { nodeType: "seed", nodeId: seed.rootNodeId },
      summary: "情绪角度",
      geneTags: ["情绪价值"],
    });
    await fruitService.selectFruit(fruit.id);
    const [reminder] = await geneService.listPendingReminders(seed.id);

    const result = await geneService.startExtractionTask(seed.id, {
      reminderId: reminder.id,
      evidenceSources: reminder.evidenceSources,
    });

    expect(result.task.status).toBe(GENE_EXTRACTION_TASK_STATUSES.completed);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      status: GENE_SUGGESTION_STATUSES.pending,
      title: "保留情绪价值表达",
    });
    expect(
      "polarity" in (result.suggestions[0] as unknown as Record<string, unknown>),
    ).toBe(false);
    expect(
      "similarityRelation" in
        (result.suggestions[0] as unknown as Record<string, unknown>),
    ).toBe(false);
    expect(capturedTasks[0]?.input).toMatchObject({
      contractVersion: GENE_EXTRACTION_AGENT_INPUT_CONTRACT_VERSION,
      seedId: seed.id,
      taskId: result.task.id,
      evidenceSources: reminder.evidenceSources,
      fruitEvidence: [
        {
          fruitId: fruit.id,
          contentLocation: fruit.contentLocation,
          summary: "情绪角度",
          geneTags: ["情绪价值"],
        },
      ],
    });
    await expect(
      geneContent.readGeneInsightMarkdown(
        `genes/seed-scoped/${seed.id}/gene-suggestion_1.md`,
      ),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it("rejects fruit evidence outside the requested seed", async () => {
    const capturedTasks: AgentTask[] = [];
    const { fruitService, seedService, geneService } = createServices(
      successAgent(capturedTasks),
    );
    const seedA = await seedService.createSeed({
      title: "Seed A",
      markdown: "Seed A body",
    });
    const seedB = await seedService.createSeed({
      title: "Seed B",
      markdown: "Seed B body",
    });
    const foreignFruit = await fruitService.createFruitFromCandidate({
      markdown: "Foreign fruit",
      parentNodeRef: { nodeType: "seed", nodeId: seedB.rootNodeId },
    });

    await expect(
      geneService.startExtractionTask(seedA.id, {
        evidenceSources: [
          {
            sourceType: GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
            sourceId: foreignFruit.id,
            strength: "weak",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(capturedTasks).toHaveLength(0);
  });

  it("authorizes publication evidence through its fruit seed", async () => {
    const capturedTasks: AgentTask[] = [];
    const {
      fruitService,
      seedService,
      geneService,
      publicationStorage,
    } = createServices(successAgent(capturedTasks));
    const seed = await seedService.createSeed({
      title: "Seed A",
      markdown: "Seed A body",
    });
    const fruit = await fruitService.createFruitFromCandidate({
      markdown: "Published fruit",
      parentNodeRef: { nodeType: "seed", nodeId: seed.rootNodeId },
    });
    await publicationStorage.createPublicationRecord(
      publicationRecord("publication_1", fruit.id),
    );

    const result = await geneService.startExtractionTask(seed.id, {
      evidenceSources: [
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.publication,
          sourceId: "publication_1",
          strength: "medium",
        },
      ],
    });

    expect(result.task.status).toBe(GENE_EXTRACTION_TASK_STATUSES.completed);
    expect(capturedTasks[0]?.input).toMatchObject({
      contractVersion: GENE_EXTRACTION_AGENT_INPUT_CONTRACT_VERSION,
      seedId: seed.id,
      evidenceSources: [
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.publication,
          sourceId: "publication_1",
          strength: "medium",
        },
      ],
      fruitEvidence: [],
    });
  });

  it("rejects publication evidence outside the requested seed", async () => {
    const capturedTasks: AgentTask[] = [];
    const {
      fruitService,
      seedService,
      geneService,
      publicationStorage,
    } = createServices(successAgent(capturedTasks));
    const seedA = await seedService.createSeed({
      title: "Seed A",
      markdown: "Seed A body",
    });
    const seedB = await seedService.createSeed({
      title: "Seed B",
      markdown: "Seed B body",
    });
    const foreignFruit = await fruitService.createFruitFromCandidate({
      markdown: "Foreign published fruit",
      parentNodeRef: { nodeType: "seed", nodeId: seedB.rootNodeId },
    });
    await publicationStorage.createPublicationRecord(
      publicationRecord("publication_2", foreignFruit.id),
    );

    await expect(
      geneService.startExtractionTask(seedA.id, {
        evidenceSources: [
          {
            sourceType: GENE_EVIDENCE_SOURCE_TYPES.publication,
            sourceId: "publication_2",
            strength: "medium",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(capturedTasks).toHaveLength(0);
  });

  it("rejects pure feedback evidence and allows mixed executable evidence", async () => {
    const capturedTasks: AgentTask[] = [];
    const { fruitService, seedService, geneService } = createServices(
      successAgent(capturedTasks),
    );
    const seed = await seedService.createSeed({
      title: "Seed A",
      markdown: "Seed A body",
    });
    const fruit = await fruitService.createFruitFromCandidate({
      markdown: "Executable fruit",
      parentNodeRef: { nodeType: "seed", nodeId: seed.rootNodeId },
    });

    await expect(
      geneService.startExtractionTask(seed.id, {
        evidenceSources: [
          {
            sourceType: GENE_EVIDENCE_SOURCE_TYPES.feedback,
            sourceId: "feedback_1",
            strength: "weak",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const result = await geneService.startExtractionTask(seed.id, {
      evidenceSources: [
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.feedback,
          sourceId: "feedback_1",
          strength: "weak",
        },
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
          sourceId: fruit.id,
          strength: "strong",
        },
      ],
    });

    expect(result.task.status).toBe(GENE_EXTRACTION_TASK_STATUSES.completed);
    expect(capturedTasks).toHaveLength(1);
    expect(capturedTasks[0]?.input).toMatchObject({
      evidenceSources: [
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.feedback,
          sourceId: "feedback_1",
          strength: "weak",
        },
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
          sourceId: fruit.id,
          strength: "strong",
        },
      ],
      fruitEvidence: [
        {
          fruitId: fruit.id,
        },
      ],
    });
  });

  it("marks the task failed when a successful Agent output has no usable suggestions", async () => {
    const capturedTasks: AgentTask[] = [];
    const { fruitService, seedService, geneService, geneStorage } = createServices(
      malformedSuccessAgent(capturedTasks),
    );
    const seed = await seedService.createSeed({
      title: "Seed A",
      markdown: "Seed A body",
    });
    const fruit = await fruitService.createFruitFromCandidate({
      markdown: "Candidate fruit",
      parentNodeRef: { nodeType: "seed", nodeId: seed.rootNodeId },
    });

    await expect(
      geneService.startExtractionTask(seed.id, {
        evidenceSources: [
          {
            sourceType: GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
            sourceId: fruit.id,
            strength: "weak",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "AGENT_TASK_FAILED" });
    const taskId = capturedTasks[0]?.taskId;
    expect(taskId).toBeDefined();
    const task = await geneStorage.findExtractionTaskById(taskId ?? "");
    expect(task).toMatchObject({
      status: GENE_EXTRACTION_TASK_STATUSES.failed,
    });
    expect(task?.failureReason).toContain("Agent");
  });

  it("allows editing, dismissing, and confirming only pending suggestions", async () => {
    const { fruitService, seedService, geneService } = createServices();
    const seed = await seedService.createSeed({
      title: "壁纸项目",
      markdown: "推广高清壁纸",
    });
    const fruit = await fruitService.createFruitFromCandidate({
      markdown: "候选",
      parentNodeRef: { nodeType: "seed", nodeId: seed.rootNodeId },
    });
    const reminder = await geneService.createReminderFromFruitEvidence(seed.id, {
      fruitId: fruit.id,
      action: "selected",
    });
    const result = await geneService.startExtractionTask(seed.id, {
      reminderId: reminder.id,
      evidenceSources: reminder.evidenceSources,
    });
    const suggestion = result.suggestions[0];

    const edited = await geneService.editSuggestion(suggestion.id, {
      title: "强化情绪价值",
      bodyMarkdown: "把情绪收益写得更具体。",
      lineage: "情绪",
      niche: "标题",
    });
    const insight = await geneService.confirmSuggestion(edited.id);

    expect(insight).toMatchObject({
      status: GENE_INSIGHT_STATUSES.active,
      title: "强化情绪价值",
      bodyMarkdown: "把情绪收益写得更具体。",
      lineage: "情绪",
      niche: "标题",
    });
    await expect(
      geneService.editSuggestion(edited.id, {
        title: "不能再改",
        bodyMarkdown: "不能再改",
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it("archives insights and excludes archived insights from referable queries", async () => {
    const { fruitService, seedService, geneService } = createServices();
    const seed = await seedService.createSeed({
      title: "壁纸项目",
      markdown: "推广高清壁纸",
    });
    const fruit = await fruitService.createFruitFromCandidate({
      markdown: "候选",
      parentNodeRef: { nodeType: "seed", nodeId: seed.rootNodeId },
    });
    const reminder = await geneService.createReminderFromFruitEvidence(seed.id, {
      fruitId: fruit.id,
      action: "eliminated",
    });
    const result = await geneService.startExtractionTask(seed.id, {
      evidenceSources: reminder.evidenceSources,
    });
    const insight = await geneService.confirmSuggestion(result.suggestions[0].id);

    await expect(geneService.listReferableInsights(seed.id)).resolves.toHaveLength(1);
    await geneService.archiveInsight(insight.id);
    await expect(geneService.listReferableInsights(seed.id)).resolves.toHaveLength(0);
  });

  it("marks extraction tasks as failed when Agent fails", async () => {
    const { fruitService, seedService, geneService, geneStorage } = createServices(
      failureAgent(),
    );
    const seed = await seedService.createSeed({
      title: "壁纸项目",
      markdown: "推广高清壁纸",
    });
    const fruit = await fruitService.createFruitFromCandidate({
      markdown: "候选",
      parentNodeRef: { nodeType: "seed", nodeId: seed.rootNodeId },
    });
    const reminder = await geneService.createReminderFromFruitEvidence(seed.id, {
      fruitId: fruit.id,
      action: "selected",
    });

    await expect(
      geneService.startExtractionTask(seed.id, {
        evidenceSources: reminder.evidenceSources,
      }),
    ).rejects.toMatchObject({
      code: "AGENT_TASK_FAILED",
    });
    const task = await geneStorage.findExtractionTaskById("gene-task_4");
    expect(task).toMatchObject({
      status: GENE_EXTRACTION_TASK_STATUSES.failed,
      failureReason: "Agent unavailable",
    });
  });

  it("creates lightweight reminders from fruit elimination without running Agent", async () => {
    const capturedTasks: AgentTask[] = [];
    const { fruitService, seedService, geneService } = createServices(
      successAgent(capturedTasks),
    );
    const seed = await seedService.createSeed({
      title: "Seed A",
      markdown: "Seed A body",
    });
    const fruit = await fruitService.createFruitFromCandidate({
      markdown: "Weak angle",
      parentNodeRef: { nodeType: "seed", nodeId: seed.rootNodeId },
    });

    await fruitService.eliminateFruit(fruit.id);
    const reminders = await geneService.listPendingReminders(seed.id);

    expect(capturedTasks).toHaveLength(0);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      seedId: seed.id,
      status: GENE_REMINDER_STATUSES.pending,
      evidenceSources: [
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.fruitEliminated,
          sourceId: fruit.id,
          strength: "weak",
        },
      ],
    });
  });

  it("does not create gene reminders or tasks from publication operations", async () => {
    const capturedTasks: AgentTask[] = [];
    const {
      fruitService,
      seedService,
      geneService,
      publicationStorage,
    } = createServices(successAgent(capturedTasks));
    const seed = await seedService.createSeed({
      title: "Seed A",
      markdown: "Seed A body",
    });
    const fruit = await fruitService.createFruitFromCandidate({
      markdown: "Published fruit",
      parentNodeRef: { nodeType: "seed", nodeId: seed.rootNodeId },
    });
    await fruitService.selectFruit(fruit.id);
    const remindersBeforePublish = await geneService.listPendingReminders(seed.id);
    const publicationService = new PublicationService({
      storage: publicationStorage,
      publishableFruitPort: fruitService,
      idGenerator: createIdGenerator(),
      now: createNow(),
    });

    const publication = await publicationService.createPublicationRecord({
      fruitId: fruit.id,
      publicationTarget: "X post",
      publicationEvidence: "https://example.test/post/1",
    });
    await publicationService.editPublicationRecord(publication.id, {
      publicationNote: "updated",
    });
    const remindersAfterPublish = await geneService.listPendingReminders(seed.id);

    expect(remindersAfterPublish).toHaveLength(remindersBeforePublish.length);
    expect(capturedTasks).toHaveLength(0);
  });

  it("does not expose hard delete capabilities", () => {
    const { geneService } = createServices();
    expect("deleteInsight" in geneService).toBe(false);
    expect("deleteSuggestion" in geneService).toBe(false);
  });
});
