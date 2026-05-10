import { describe, expect, it } from "vitest";
import { InMemoryFruitMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-fruit-markdown-content-access-adapter.js";
import { InMemorySeedMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-seed-markdown-content-access-adapter.js";
import { FruitService } from "../modules/fruit/application/fruit-service.js";
import { GeneService } from "../modules/gene/application/gene-service.js";
import { GeneratorService } from "../modules/generator/application/generator-service.js";
import { GrowthService } from "../modules/growth/application/growth-service.js";
import { NutrientService } from "../modules/nutrient/application/nutrient-service.js";
import { SeedService } from "../modules/seed/application/seed-service.js";
import { WorkspaceService } from "../modules/workspace/application/workspace-service.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryGeneMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-gene-markdown-content-access-adapter.js";
import { InMemoryGeneratorSkillContentAccessAdapter } from "../content-access/adapters/in-memory-generator-skill-content-access-adapter.js";
import { InMemoryNutrientMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-nutrient-markdown-content-access-adapter.js";
import { InMemoryFruitStorageAdapter } from "../storage/adapters/in-memory-fruit-storage-adapter.js";
import { InMemoryGeneStorageAdapter } from "../storage/adapters/in-memory-gene-storage-adapter.js";
import { InMemoryGeneratorStorageAdapter } from "../storage/adapters/in-memory-generator-storage-adapter.js";
import { InMemoryGrowthStorageAdapter } from "../storage/adapters/in-memory-growth-storage-adapter.js";
import { InMemoryNutrientStorageAdapter } from "../storage/adapters/in-memory-nutrient-storage-adapter.js";
import { InMemorySeedStorageAdapter } from "../storage/adapters/in-memory-seed-storage-adapter.js";

function idGenerator(): IdGenerator {
  const counters = new Map<string, number>();
  return {
    nextId(prefix: string): string {
      const next = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, next);
      return `${prefix}_${next}`;
    },
  };
}

function nowFactory(): () => Date {
  let counter = 0;
  return () => {
    counter += 1;
    return new Date(`2026-01-01T00:00:${String(counter).padStart(2, "0")}.000Z`);
  };
}

async function createFixture(): Promise<{
  workspaceService: WorkspaceService;
  seedService: SeedService;
  fruitService: FruitService;
  geneService: GeneService;
  growthStorage: InMemoryGrowthStorageAdapter;
  geneStorage: InMemoryGeneStorageAdapter;
  generatorStorage: InMemoryGeneratorStorageAdapter;
}> {
  const seedStorage = new InMemorySeedStorageAdapter();
  const fruitStorage = new InMemoryFruitStorageAdapter();
  const growthStorage = new InMemoryGrowthStorageAdapter();
  const generatorStorage = new InMemoryGeneratorStorageAdapter();
  const nutrientStorage = new InMemoryNutrientStorageAdapter();
  const geneStorage = new InMemoryGeneStorageAdapter();
  const now = nowFactory();

  const seedService = new SeedService({
    storage: seedStorage,
    contentAccess: new InMemorySeedMarkdownContentAccessAdapter(),
    idGenerator: idGenerator(),
    now,
  });
  const fruitService = new FruitService({
    storage: fruitStorage,
    contentAccess: new InMemoryFruitMarkdownContentAccessAdapter(),
    idGenerator: idGenerator(),
    now,
  });
  const generatorService = new GeneratorService({
    storage: generatorStorage,
    contentAccess: new InMemoryGeneratorSkillContentAccessAdapter(),
    idGenerator: idGenerator(),
    now,
  });
  const nutrientService = new NutrientService({
    storage: nutrientStorage,
    contentAccess: new InMemoryNutrientMarkdownContentAccessAdapter(),
    seedStorage,
    idGenerator: idGenerator(),
    now,
  });
  const geneService = new GeneService({
    storage: geneStorage,
    contentAccess: new InMemoryGeneMarkdownContentAccessAdapter(),
    seedStorage,
    fruitStorage,
    idGenerator: idGenerator(),
    now,
  });
  const growthService = new GrowthService({
    storage: growthStorage,
    seedStorage,
    fruitStorage,
    generatorStorage,
    fruitService,
    scheduleTaskExecution: () => undefined,
  });

  const seed = await seedService.createSeed({
    title: "壁纸项目",
    markdown: "# 灵感种子",
  });
  await geneService.prepareSeedGeneLibrary(seed.id);
  await generatorStorage.createGenerator({
    id: "generator_1",
    name: "小红书生成器",
    description: "生成内容",
    enableState: "enabled",
    contentLocation: "generators/generator_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    disabledAt: null,
  });
  await generatorStorage.createGenerator({
    id: "generator_disabled",
    name: "停用生成器",
    description: "不可选",
    enableState: "disabled",
    contentLocation: "generators/generator_disabled",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    disabledAt: "2026-01-01T00:00:00.000Z",
  });
  const library = await nutrientService.createLibrary({
    name: "小红书营养库",
    scope: "public",
  });
  await nutrientService.createContent(library.id, {
    title: "标题方法",
    markdown: "# 标题方法",
  });
  await geneStorage.createInsight({
    id: "gene_1",
    seedId: seed.id,
    suggestionId: null,
    status: "active",
    title: "情绪价值",
    lineage: "情绪方向",
    niche: "壁纸内容",
    contentLocation: "genes/seed-scoped/seed_1/gene_1.md",
    evidenceSources: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
  });

  return {
    workspaceService: new WorkspaceService({
      seedService,
      fruitService,
      growthService,
      generatorService,
      nutrientService,
      geneService,
    }),
    seedService,
    fruitService,
    geneService,
    growthStorage,
    geneStorage,
    generatorStorage,
  };
}

describe("WorkspaceService", () => {
  it("returns an active seed workspace snapshot without markdown bodies", async () => {
    const { workspaceService } = await createFixture();

    const snapshot = await workspaceService.getWorkspaceSnapshot("seed_1");

    expect(snapshot.workspaceReadOnly).toBe(false);
    expect(snapshot.seed).toMatchObject({
      id: "seed_1",
      title: "壁纸项目",
      rootNodeId: "seed-node_seed_1",
    });
    expect("markdown" in snapshot.seed).toBe(false);
    expect(snapshot.nodes).toHaveLength(1);
    expect(snapshot.nodes[0]).toMatchObject({
      nodeType: "seed",
      nodeId: "seed-node_seed_1",
      growth: {
        isGrowing: false,
        taskId: null,
      },
      failedInput: {
        hasFailedInput: false,
      },
    });
    expect(snapshot.edges).toHaveLength(0);
  });

  it("marks archived seed workspaces as read-only", async () => {
    const { workspaceService, seedService } = await createFixture();
    await seedService.archiveSeed("seed_1");

    const snapshot = await workspaceService.getWorkspaceSnapshot("seed_1");

    expect(snapshot.workspaceReadOnly).toBe(true);
    expect(snapshot.seed.archiveState).toBe("archived");
    expect(snapshot.nodes[0]).toMatchObject({
      nodeType: "seed",
      archiveState: "archived",
    });
  });

  it("aggregates multi-level fruit nodes and tree edges", async () => {
    const { workspaceService, fruitService } = await createFixture();
    const parent = await fruitService.createFruitFromCandidate({
      markdown: "# 父果实",
      parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      summary: "父摘要",
      geneTags: ["情绪价值"],
    });
    const child = await fruitService.createFruitFromCandidate({
      markdown: "# 子果实",
      parentNodeRef: { nodeType: "fruit", nodeId: parent.id },
      summary: "子摘要",
    });

    const snapshot = await workspaceService.getWorkspaceSnapshot("seed_1");

    expect(snapshot.nodes.map((node) => node.nodeId).sort()).toEqual([
      child.id,
      parent.id,
      "seed-node_seed_1",
    ].sort());
    expect(snapshot.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
          childNodeRef: { nodeType: "fruit", nodeId: parent.id },
        }),
        expect.objectContaining({
          parentNodeRef: { nodeType: "fruit", nodeId: parent.id },
          childNodeRef: { nodeType: "fruit", nodeId: child.id },
        }),
      ]),
    );
    const fruitNode = snapshot.nodes.find((node) => node.nodeId === parent.id);
    expect(fruitNode).toMatchObject({
      nodeType: "fruit",
      contentLocation: parent.contentLocation,
      summary: "父摘要",
      geneTags: ["情绪价值"],
    });
    expect(JSON.stringify(snapshot)).not.toContain("# 父果实");
  });

  it("aggregates node growth status and latest failed input hints", async () => {
    const { workspaceService, growthStorage } = await createFixture();
    await growthStorage.acquireLock({
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      taskId: "growth-task_running",
      lockedAt: "2026-01-01T00:00:00.000Z",
    });
    await growthStorage.upsertFailedInput({
      taskId: "growth-task_failed",
      seedId: "seed_1",
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      userInput: "失败输入",
      generatorId: "generator_1",
      fruitCount: 3,
      nutrientRefs: [],
      geneRefs: [],
      detailParams: {},
      failureReason: "Agent 输出不可用",
      updatedAt: "2026-01-01T00:01:00.000Z",
    });

    const snapshot = await workspaceService.getWorkspaceSnapshot("seed_1");

    expect(snapshot.nodes[0]).toMatchObject({
      growth: {
        isGrowing: true,
        taskId: "growth-task_running",
      },
      failedInput: {
        hasFailedInput: true,
        taskId: "growth-task_failed",
        failureReason: "Agent 输出不可用",
      },
    });
    expect(JSON.stringify(snapshot)).not.toContain("失败输入");
  });

  it("aggregates selectable generators, referable nutrients, and referable gene insights", async () => {
    const { workspaceService } = await createFixture();

    const snapshot = await workspaceService.getWorkspaceSnapshot("seed_1");

    expect(snapshot.resources.generators).toEqual([
      expect.objectContaining({
        id: "generator_1",
        name: "小红书生成器",
      }),
    ]);
    expect(snapshot.resources.nutrients).toEqual([
      expect.objectContaining({
        title: "标题方法",
        library: expect.objectContaining({
          scope: "public",
        }),
      }),
    ]);
    expect(snapshot.resources.geneInsights).toEqual([
      expect.objectContaining({
        id: "gene_1",
        title: "情绪价值",
      }),
    ]);
  });
  it("aggregates gene extraction hub summaries without markdown bodies", async () => {
    const { workspaceService, geneStorage } = await createFixture();
    await geneStorage.createReminder({
      id: "gene-reminder_1",
      seedId: "seed_1",
      status: "pending",
      evidenceSources: [
        {
          sourceType: "fruit_selected",
          sourceId: "fruit_1",
          strength: "weak",
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await geneStorage.createSuggestion({
      id: "gene-suggestion_1",
      seedId: "seed_1",
      taskId: "gene-task_1",
      status: "pending",
      title: "Reusable angle",
      bodyMarkdown: "This markdown body must not be in the workspace snapshot.",
      lineage: "emotion",
      niche: "wallpaper",
      evidenceSources: [
        {
          sourceType: "fruit_selected",
          sourceId: "fruit_1",
          strength: "weak",
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const snapshot = await workspaceService.getWorkspaceSnapshot("seed_1");

    expect(snapshot.geneExtractionHub).toMatchObject({
      seedId: "seed_1",
      geneLibrary: {
        seedId: "seed_1",
        contentLocation: "genes/seed-scoped/seed_1",
        insightCount: 1,
        referableInsightCount: 1,
      },
      stats: {
        pendingReminderCount: 1,
        pendingSuggestionCount: 1,
        insightCount: 1,
        referableInsightCount: 1,
      },
      actions: {
        canStartExtraction: true,
        canReviewSuggestions: true,
        canOpenGeneLibrary: true,
      },
    });
    expect(snapshot.geneExtractionHub.pendingReminders).toEqual([
      expect.objectContaining({
        id: "gene-reminder_1",
      }),
    ]);
    expect(snapshot.geneExtractionHub.pendingSuggestions).toEqual([
      expect.objectContaining({
        id: "gene-suggestion_1",
        title: "Reusable angle",
      }),
    ]);
    expect(JSON.stringify(snapshot.geneExtractionHub)).not.toContain("bodyMarkdown");
    expect(JSON.stringify(snapshot.geneExtractionHub)).not.toContain(
      "This markdown body must not be in the workspace snapshot.",
    );
  });

  it("returns a stable empty gene extraction hub state", async () => {
    const { workspaceService } = await createFixture();

    const snapshot = await workspaceService.getWorkspaceSnapshot("seed_1");

    expect(snapshot.geneExtractionHub.pendingReminders).toEqual([]);
    expect(snapshot.geneExtractionHub.pendingSuggestions).toEqual([]);
    expect(snapshot.geneExtractionHub.stats).toMatchObject({
      pendingReminderCount: 0,
      pendingSuggestionCount: 0,
      insightCount: 1,
      referableInsightCount: 1,
    });
    expect(snapshot.geneExtractionHub.actions).toMatchObject({
      canStartExtraction: false,
      canReviewSuggestions: false,
      canOpenGeneLibrary: true,
    });
  });
});
