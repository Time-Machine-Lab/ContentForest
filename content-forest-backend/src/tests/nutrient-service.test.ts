import { describe, expect, it } from "vitest";
import type { AgentPort } from "../agent/ports/agent-port.js";
import type { AgentTask, AgentTaskResult, AgentTaskStreamEvent } from "../agent/runtime/agent-task.js";
import { InMemoryNutrientMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-nutrient-markdown-content-access-adapter.js";
import { NutrientService } from "../modules/nutrient/application/nutrient-service.js";
import { FEEDBACK_MONITOR_TYPES } from "../modules/feedback/domain/feedback-types.js";
import { FRUIT_SELECTION_STATES } from "../modules/fruit/domain/fruit-types.js";
import {
  NUTRIENT_ARCHIVE_STATES,
  NUTRIENT_CARD_STATUSES,
  NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES,
  NUTRIENT_GAP_SUGGESTION_STATUSES,
  NUTRIENT_LIBRARY_SCOPES,
} from "../modules/nutrient/domain/nutrient-types.js";
import { PUBLICATION_PUBLISHER_TYPES } from "../modules/publication/domain/publication-types.js";
import { SEED_ARCHIVE_STATES } from "../modules/seed/domain/seed-types.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryFeedbackStorageAdapter } from "../storage/adapters/in-memory-feedback-storage-adapter.js";
import { InMemoryFruitStorageAdapter } from "../storage/adapters/in-memory-fruit-storage-adapter.js";
import { InMemoryNutrientStorageAdapter } from "../storage/adapters/in-memory-nutrient-storage-adapter.js";
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

function successResearchAgent(capturedTasks: AgentTask[] = []): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      capturedTasks.push(task);
      return {
        ok: true,
        taskId: "agent-task_research",
        output: {
          taskType: "nutrient_research",
          content: {
            type: "nutrient_research_result",
            message: "找到一个可沉淀方向。",
            depositableBlocks: [
              {
                title: "小红书壁纸情绪钩子",
                markdown: "围绕情绪场景组织壁纸内容。",
              },
            ],
          },
        },
        trace: [
          {
            type: "task_started",
            at: "2026-01-01T00:00:00.000Z",
            message: "started",
          },
        ],
      };
    },
  };
}

function failingResearchAgent(): AgentPort {
  return {
    async runTask(): Promise<AgentTaskResult> {
      return {
        ok: false,
        taskId: "agent-task_failed",
        error: {
          code: "AGENT_TASK_FAILED",
          message: "研究失败",
        },
        trace: [
          {
            type: "task_failed",
            at: "2026-01-01T00:00:00.000Z",
            message: "failed",
          },
        ],
      };
    },
  };
}

function streamingResearchAgent(capturedTasks: AgentTask[] = []): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      capturedTasks.push(task);
      return successfulStreamingResearchResult();
    },
    async *streamTask(task: AgentTask): AsyncGenerator<AgentTaskStreamEvent, AgentTaskResult> {
      capturedTasks.push(task);
      yield {
        type: "thought_delta",
        delta: "comparing research material",
      };
      yield {
        type: "message_delta",
        delta: "found one direction: ",
      };
      yield {
        type: "message_delta",
        delta: "emotional scenes.",
      };
      yield {
        type: "nutrient_block_delta",
        title: "XHS wallpaper emotional hook",
        delta: "package around emotions",
      };
      yield {
        type: "nutrient_block_delta",
        title: "XHS wallpaper emotional hook",
        delta: " and scenes.",
      };
      return successfulStreamingResearchResult();
    },
  };
}

function blockingStreamingResearchAgent(release: Promise<void>): AgentPort {
  return {
    async runTask(): Promise<AgentTaskResult> {
      await release;
      return successfulStreamingResearchResult();
    },
    async *streamTask(task: AgentTask): AsyncGenerator<AgentTaskStreamEvent, AgentTaskResult> {
      yield {
        type: "thought_delta",
        delta: `researching ${task.metadata?.sessionId ?? ""}`,
      };
      await release;
      return successfulStreamingResearchResult();
    },
  };
}

function toolStreamingResearchAgent(capturedTasks: AgentTask[] = []): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      capturedTasks.push(task);
      return successfulStreamingResearchResult();
    },
    async *streamTask(task: AgentTask): AsyncGenerator<AgentTaskStreamEvent, AgentTaskResult> {
      capturedTasks.push(task);
      yield {
        type: "tool_call_started",
        toolName: "networked_research",
        message: "正在调用工具：networked_research",
        metadata: { mode: "research" },
      };
      yield {
        type: "tool_call_completed",
        toolName: "networked_research",
        message: "工具调用完成：networked_research",
        metadata: { resultCount: 3 },
      };
      return successfulStreamingResearchResult();
    },
  };
}

function successfulStreamingResearchResult(): AgentTaskResult {
  return {
    ok: true,
    taskId: "agent-task_streaming_research",
    output: {
      taskType: "nutrient_research",
      content: {
        type: "nutrient_research_result",
        message: "found one direction: emotional scenes.",
        depositableBlocks: [
          {
            title: "XHS wallpaper emotional hook",
            markdown: "package wallpaper content around emotions and scenes.",
          },
        ],
      },
    },
    trace: [
      {
        type: "task_started",
        at: "2026-01-01T00:00:00.000Z",
        message: "started",
      },
    ],
  };
}

async function createFixture(agentPort?: AgentPort): Promise<{
  service: NutrientService;
  storage: InMemoryNutrientStorageAdapter;
  contentAccess: InMemoryNutrientMarkdownContentAccessAdapter;
  seedStorage: InMemorySeedStorageAdapter;
  fruitStorage: InMemoryFruitStorageAdapter;
  publicationStorage: InMemoryPublicationStorageAdapter;
  feedbackStorage: InMemoryFeedbackStorageAdapter;
}> {
  const storage = new InMemoryNutrientStorageAdapter();
  const contentAccess = new InMemoryNutrientMarkdownContentAccessAdapter();
  const seedStorage = new InMemorySeedStorageAdapter();
  const fruitStorage = new InMemoryFruitStorageAdapter();
  const publicationStorage = new InMemoryPublicationStorageAdapter();
  const feedbackStorage = new InMemoryFeedbackStorageAdapter();
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
    id: "seed_2",
    title: "脚本项目",
    archiveState: SEED_ARCHIVE_STATES.active,
    contentLocation: "seeds/seed_2.md",
    rootNodeId: "seed-node_seed_2",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
  });
  const service = new NutrientService({
    storage,
    contentAccess,
    seedStorage,
    fruitStorage,
    publicationStorage,
    feedbackStorage,
    agentPort,
    idGenerator: createIdGenerator(),
    now: createNow(),
  });
  return {
    service,
    storage,
    contentAccess,
    seedStorage,
    fruitStorage,
    publicationStorage,
    feedbackStorage,
  };
}

describe("NutrientService", () => {
  it("creates public and seed-scoped libraries with optional descriptions", async () => {
    const { service } = await createFixture();

    const publicLibrary = await service.createLibrary({
      name: "小红书平台营养库",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
    });
    const seedScopedLibrary = await service.createLibrary({
      name: "壁纸专属营养库",
      description: "壁纸项目资料",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });

    expect(publicLibrary).toMatchObject({
      id: "nutrient-library_1",
      description: "",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
      seedId: null,
      archiveState: NUTRIENT_ARCHIVE_STATES.active,
    });
    expect(seedScopedLibrary).toMatchObject({
      id: "nutrient-library_2",
      description: "壁纸项目资料",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });
  });

  it("rejects missing names, missing seed ownership, invalid seeds and public seed binding", async () => {
    const { service } = await createFixture();

    await expect(
      service.createLibrary({ name: " ", scope: NUTRIENT_LIBRARY_SCOPES.public }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      service.createLibrary({
        name: "专属",
        scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.createLibrary({
        name: "专属",
        scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
        seedId: "missing",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.createLibrary({
        name: "公共",
        scope: NUTRIENT_LIBRARY_SCOPES.public,
        seedId: "seed_1",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("edits only library name and description and archives/restores without delete", async () => {
    const { service } = await createFixture();
    const library = await service.createLibrary({
      name: "旧名称",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });

    const edited = await service.updateLibrary(library.id, {
      name: "新名称",
      description: "新描述",
    });
    const archived = await service.archiveLibrary(library.id);
    const restored = await service.restoreLibrary(library.id);

    expect(edited).toMatchObject({
      id: library.id,
      name: "新名称",
      description: "新描述",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });
    expect(archived.archiveState).toBe(NUTRIENT_ARCHIVE_STATES.archived);
    expect(restored.archiveState).toBe(NUTRIENT_ARCHIVE_STATES.active);
    expect("deleteLibrary" in service).toBe(false);
  });

  it("creates, reads, edits, archives and restores markdown nutrient content", async () => {
    const { service } = await createFixture();
    const library = await service.createLibrary({
      name: "公共营养",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
    });

    const content = await service.createContent(library.id, {
      title: "标题方法",
      markdown: "# 标题方法\n\n只保存正文。",
    });
    const edited = await service.updateContent(content.id, {
      title: "新标题方法",
      markdown: "新正文",
    });
    const archived = await service.archiveContent(content.id);
    const restored = await service.restoreContent(content.id);

    expect(content).toMatchObject({
      id: "nutrient-content_2",
      libraryId: library.id,
      contentLocation: "nutrients/public/nutrient-content_2.md",
      markdown: "# 标题方法\n\n只保存正文。",
    });
    expect(edited).toMatchObject({
      title: "新标题方法",
      markdown: "新正文",
    });
    expect(archived.archiveState).toBe(NUTRIENT_ARCHIVE_STATES.archived);
    expect(restored.archiveState).toBe(NUTRIENT_ARCHIVE_STATES.active);
    expect("deleteContent" in service).toBe(false);
  });

  it("rejects creating or editing content under archived libraries", async () => {
    const { service } = await createFixture();
    const library = await service.createLibrary({
      name: "公共营养",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
    });
    const content = await service.createContent(library.id, {
      title: "资料",
      markdown: "正文",
    });
    await service.archiveLibrary(library.id);

    await expect(
      service.createContent(library.id, { title: "新资料", markdown: "正文" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.updateContent(content.id, { markdown: "不能改" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("filters referable nutrients by public scope, seed ownership and archive state", async () => {
    const { service } = await createFixture();
    const publicLibrary = await service.createLibrary({
      name: "公共",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
    });
    const scopedLibrary = await service.createLibrary({
      name: "seed1 专属",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });
    const otherLibrary = await service.createLibrary({
      name: "seed2 专属",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_2",
    });
    const archivedLibrary = await service.createLibrary({
      name: "归档库",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
    });

    const publicContent = await service.createContent(publicLibrary.id, {
      title: "公共资料",
      markdown: "公共正文",
    });
    const scopedContent = await service.createContent(scopedLibrary.id, {
      title: "专属资料",
      markdown: "专属正文",
    });
    await service.createContent(otherLibrary.id, {
      title: "其他种子资料",
      markdown: "其他正文",
    });
    const archivedContent = await service.createContent(publicLibrary.id, {
      title: "归档资料",
      markdown: "归档正文",
    });
    await service.createContent(archivedLibrary.id, {
      title: "归档库资料",
      markdown: "归档库正文",
    });
    await service.archiveContent(archivedContent.id);
    await service.archiveLibrary(archivedLibrary.id);

    const referable = await service.listReferableContents("seed_1");

    expect(referable.map((content) => content.id)).toEqual([
      scopedContent.id,
      publicContent.id,
    ]);
    await expect(
      service.assertNutrientRefsReferable("seed_1", [
        { resourceType: "nutrient", resourceId: publicContent.id },
      ]),
    ).resolves.toBeUndefined();
    await expect(
      service.assertNutrientRefsReferable("seed_1", [
        { resourceType: "nutrient", resourceId: archivedContent.id },
      ]),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("manages nutrient card lifecycle from unsettled to settled and archived", async () => {
    const { service } = await createFixture();
    const library = await service.createLibrary({
      name: "壁纸专属营养",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });

    const card = await service.createCard("seed_1", {
      title: "小红书壁纸案例",
      markdown: "未沉淀资料",
    });
    const edited = await service.updateCard(card.id, {
      title: "小红书壁纸爆款案例",
      markdown: "更新后的候选资料",
    });
    const settled = await service.settleCard(card.id, { libraryId: library.id });
    const archived = await service.archiveCard(card.id);

    expect(card).toMatchObject({
      id: "nutrient-card_2",
      seedId: "seed_1",
      status: NUTRIENT_CARD_STATUSES.unsettled,
      contentLocation: "nutrients/seed-scoped/seed_1/nutrient-card_2.md",
    });
    expect(edited).toMatchObject({
      title: "小红书壁纸爆款案例",
      markdown: "更新后的候选资料",
    });
    expect(settled).toMatchObject({
      status: NUTRIENT_CARD_STATUSES.settled,
      settledContentId: "nutrient-content_3",
      markdown: "更新后的候选资料",
    });
    expect(archived).toMatchObject({
      status: NUTRIENT_CARD_STATUSES.archived,
      defaultForGrowth: false,
    });
    expect((await service.listReferableContents("seed_1")).map((item) => item.id))
      .toEqual([]);
  });

  it("ensures a default seed-scoped nutrient library idempotently", async () => {
    const { service } = await createFixture();

    const first = await service.ensureDefaultSeedScopedLibrary("seed_1");
    const second = await service.ensureDefaultSeedScopedLibrary("seed_1");
    const libraries = await service.listLibraries({
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });

    expect(second.id).toBe(first.id);
    expect(first).toMatchObject({
      name: "默认专属营养库",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
      archiveState: NUTRIENT_ARCHIVE_STATES.active,
    });
    expect(libraries).toHaveLength(1);
  });

  it("settles draft nutrient content into the default seed-scoped library", async () => {
    const { service } = await createFixture();
    const card = await service.createCard("seed_1", {
      title: "draft nutrient",
      markdown: "draft markdown",
    });

    const settled = await service.settleCard(card.id, {});
    const referable = await service.listReferableContents("seed_1");

    expect(settled).toMatchObject({
      status: NUTRIENT_CARD_STATUSES.settled,
      title: "draft nutrient",
      markdown: "draft markdown",
    });
    expect(settled.settledContentId).not.toBeNull();
    expect(referable).toEqual([
      expect.objectContaining({
        id: settled.settledContentId,
        title: "draft nutrient",
        library: expect.objectContaining({
          name: "默认专属营养库",
          scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
          seedId: "seed_1",
        }),
      }),
    ]);
  });

  it("deletes only draft nutrient content", async () => {
    const { service, contentAccess } = await createFixture();
    const draft = await service.createCard("seed_1", {
      title: "draft nutrient",
      markdown: "draft markdown",
    });

    await service.deleteDraftCard(draft.id);

    await expect(service.getCard(draft.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      contentAccess.readNutrientMarkdown(draft.contentLocation),
    ).rejects.toMatchObject({ code: "CONTENT_ACCESS_ERROR" });

    const settledDraft = await service.createCard("seed_1", {
      title: "settled nutrient",
      markdown: "settled markdown",
    });
    const settled = await service.settleCard(settledDraft.id, {});
    await expect(service.deleteDraftCard(settled.id)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(service.getCard(settled.id)).resolves.toMatchObject({
      status: NUTRIENT_CARD_STATUSES.settled,
    });
  });

  it("marks settled nutrient cards as default for growth and exposes the flag", async () => {
    const { service } = await createFixture();
    const library = await service.createLibrary({
      name: "壁纸专属营养",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });
    const card = await service.createCard("seed_1", {
      title: "常驻资料",
      markdown: "每次都要参考",
    });

    await expect(
      service.setDefaultForGrowth(card.id),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const settled = await service.settleCard(card.id, { libraryId: library.id });
    const marked = await service.setDefaultForGrowth(card.id);
    const referable = await service.listReferableContents("seed_1");
    const cleared = await service.clearDefaultForGrowth(card.id);

    expect(settled.settledContentId).toBe("nutrient-content_3");
    expect(marked.defaultForGrowth).toBe(true);
    expect(referable).toEqual([
      expect.objectContaining({
        id: "nutrient-content_3",
        defaultForGrowth: true,
      }),
    ]);
    expect(cleared.defaultForGrowth).toBe(false);
  });

  it("validates temporary references only for current seed unsettled nutrient cards", async () => {
    const { service } = await createFixture();
    const library = await service.createLibrary({
      name: "壁纸专属营养",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });
    const card = await service.createCard("seed_1", {
      title: "候选资料",
      markdown: "候选正文",
    });
    const otherSeedCard = await service.createCard("seed_2", {
      title: "其他种子候选",
      markdown: "其他正文",
    });

    await expect(
      service.assertTemporaryNutrientCardRefsReferable("seed_1", [
        { resourceType: "nutrient_card", resourceId: card.id },
      ]),
    ).resolves.toBeUndefined();
    await expect(
      service.assertTemporaryNutrientCardRefsReferable("seed_1", [
        { resourceType: "nutrient_card", resourceId: otherSeedCard.id },
      ]),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await service.settleCard(card.id, { libraryId: library.id });
    await expect(
      service.assertTemporaryNutrientCardRefsReferable("seed_1", [
        { resourceType: "nutrient_card", resourceId: card.id },
      ]),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("creates, dedupes, lists, adopts and ignores nutrient gap suggestions", async () => {
    const { service } = await createFixture();

    const first = await service.createGapSuggestion({
      seedId: "seed_1",
      sourceType: NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.manual,
      sourceId: "manual_1",
      title: "补充小红书案例",
      bodyMarkdown: "研究小红书壁纸爆款案例",
    });
    const duplicate = await service.createGapSuggestion({
      seedId: "seed_1",
      sourceType: NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.manual,
      sourceId: "manual_1",
      title: "补充小红书案例",
      bodyMarkdown: "重复内容不会新建",
    });
    const second = await service.createGapSuggestion({
      seedId: "seed_1",
      sourceType: NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.growthInputGap,
      sourceId: "growth-task_1",
      title: "补充抖音资料",
      bodyMarkdown: "研究抖音同类内容",
    });

    expect(first).toMatchObject({
      status: NUTRIENT_GAP_SUGGESTION_STATUSES.pending,
      title: "补充小红书案例",
    });
    expect(duplicate.id).toBe(first.id);
    expect(await service.countPendingGapSuggestions("seed_1")).toBe(2);

    const adopted = await service.adoptGapSuggestion(first.id);
    const ignored = await service.ignoreGapSuggestion(second.id);

    expect(adopted.suggestion).toMatchObject({
      status: NUTRIENT_GAP_SUGGESTION_STATUSES.adopted,
      adoptedCardId: adopted.nutrientCard.id,
    });
    expect(adopted.nutrientCard).toMatchObject({
      seedId: "seed_1",
      status: NUTRIENT_CARD_STATUSES.unsettled,
      title: "补充小红书案例",
      markdown: "研究小红书壁纸爆款案例",
    });
    expect(ignored.status).toBe(NUTRIENT_GAP_SUGGESTION_STATUSES.ignored);
    expect(await service.listGapSuggestions("seed_1", {
      status: NUTRIENT_GAP_SUGGESTION_STATUSES.pending,
    })).toEqual([]);
  });

  it("creates lightweight suggestions from seed brief and growth signals", async () => {
    const { service } = await createFixture();

    const seedBriefSuggestions = await service.createSuggestionsFromSeedBrief(
      "seed_1",
      [
        "# 简报",
        "- 证据缺口：需要补充小红书壁纸账号案例",
        "- 资料缺口：需要补充爆款封面结构",
      ].join("\n"),
    );
    const growthSuggestion = await service.createSuggestionFromGrowthInput({
      seedId: "seed_1",
      userInput: "这次想做小红书情绪价值方向",
      nutrientRefCount: 0,
      temporaryNutrientCardRefCount: 0,
      sourceId: "growth-task_1",
    });
    const ignoredBecauseNutrientExists =
      await service.createSuggestionFromGrowthInput({
        seedId: "seed_1",
        userInput: "继续做小红书",
        nutrientRefCount: 1,
        temporaryNutrientCardRefCount: 0,
        sourceId: "growth-task_2",
      });

    expect(seedBriefSuggestions).toHaveLength(2);
    expect(growthSuggestion).toMatchObject({
      sourceType: NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.growthInputGap,
      title: "补充小红书资料",
    });
    expect(ignoredBecauseNutrientExists).toBeNull();
  });

  it("records formal and unsettled nutrient usage with growth and fruit anchors", async () => {
    const { service, storage } = await createFixture();
    const card = await service.createCard("seed_1", {
      title: "Xiaohongshu cases",
      markdown: "fresh platform cases",
    });

    await service.recordNutrientUsage({
      seedId: "seed_1",
      growthTaskId: "growth-task_1",
      growthAttemptId: "growth-attempt_1",
      fruitId: "fruit_1",
      refs: [
        { resourceType: "nutrient", resourceId: "nutrient-content_1" },
        { resourceType: "nutrient_card", resourceId: card.id },
        { resourceType: "nutrient_card", resourceId: card.id },
      ],
    });

    await expect(
      storage.listUsageRecordsByResource("nutrient", "nutrient-content_1"),
    ).resolves.toEqual([
      expect.objectContaining({
        seedId: "seed_1",
        growthTaskId: "growth-task_1",
        growthAttemptId: "growth-attempt_1",
        fruitId: "fruit_1",
      }),
    ]);
    await expect(
      storage.listUsageRecordsByResource("nutrient_card", card.id),
    ).resolves.toHaveLength(1);
    await expect(service.getCard(card.id)).resolves.toMatchObject({
      lastReferencedAt: "2026-01-01T00:00:02.000Z",
    });
  });

  it("summarizes nutrient card usage through fruit, publication and feedback facts", async () => {
    const {
      service,
      fruitStorage,
      publicationStorage,
      feedbackStorage,
    } = await createFixture();
    const library = await service.createLibrary({
      name: "seed library",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });
    const card = await service.createCard("seed_1", {
      title: "settled card",
      markdown: "settled markdown",
    });
    const settled = await service.settleCard(card.id, { libraryId: library.id });
    await fruitStorage.createFruit({
      id: "fruit_1",
      selectionState: FRUIT_SELECTION_STATES.selected,
      parentNodeRef: { nodeType: "seed", nodeId: "seed_1" },
      contentLocation: "fruits/fruit_1.md",
      generatorId: "generator_1",
      summary: "selected fruit",
      geneTags: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await publicationStorage.createPublicationRecord({
      id: "publication_1",
      fruitId: "fruit_1",
      publisherType: PUBLICATION_PUBLISHER_TYPES.manual,
      publicationTarget: "xiaohongshu",
      publicationEvidence: "url",
      publicationNote: "",
      publishedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await feedbackStorage.createMonitorAttachment({
      id: "monitor_1",
      publicationRecordId: "publication_1",
      monitorType: FEEDBACK_MONITOR_TYPES.manual,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await feedbackStorage.createFeedbackSnapshot({
      id: "snapshot_1",
      publicationRecordId: "publication_1",
      monitorAttachmentId: "monitor_1",
      performanceData: { likes: 10 },
      userObservation: "good",
      capturedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await service.recordNutrientUsage({
      seedId: "seed_1",
      growthTaskId: "growth-task_1",
      growthAttemptId: "growth-attempt_1",
      fruitId: "fruit_1",
      refs: [{ resourceType: "nutrient", resourceId: settled.settledContentId ?? "" }],
    });

    await expect(service.getCardUsageSummary(card.id)).resolves.toMatchObject({
      resourceType: "nutrient_card",
      resourceId: card.id,
      usageCount: 1,
      fruitCount: 1,
      selectedFruitCount: 1,
      eliminatedFruitCount: 0,
      publicationRecordCount: 1,
      feedbackSnapshotCount: 1,
      fruits: [
        expect.objectContaining({
          fruitId: "fruit_1",
          summary: "selected fruit",
          selectionState: FRUIT_SELECTION_STATES.selected,
          publicationRecordCount: 1,
          feedbackSnapshotCount: 1,
        }),
      ],
    });
  });

  it("returns freshness reminders for stale or unused nutrient cards", async () => {
    const { service, storage } = await createFixture();
    const card = await service.createCard("seed_1", {
      title: "old card",
      markdown: "old markdown",
    });
    const record = await storage.findCardById(card.id);
    expect(record).not.toBeNull();
    await storage.saveCard({
      ...(record as NonNullable<typeof record>),
      updatedAt: "2025-01-01T00:00:00.000Z",
      lastReferencedAt: null,
    });

    await expect(service.listFreshnessReminders("seed_1")).resolves.toEqual([
      expect.objectContaining({
        cardId: card.id,
        title: "old card",
        lastUpdatedAt: "2025-01-01T00:00:00.000Z",
        lastReferencedAt: null,
        reasons: expect.arrayContaining([
          expect.any(String),
          expect.any(String),
        ]),
      }),
    ]);
  });

  it("suggests similar nutrient cards and merges content into an existing card", async () => {
    const { service, storage } = await createFixture();
    const card = await service.createCard("seed_1", {
      title: "xiaohongshu wallpaper hooks",
      markdown: "existing hooks",
    });
    await service.createCard("seed_1", {
      title: "twitter launch notes",
      markdown: "other notes",
    });
    const sourceCard = await service.createCard("seed_1", {
      title: "source card",
      markdown: "source markdown",
    });

    await expect(
      service.findSimilarCards("seed_1", {
        title: "xiaohongshu wallpaper examples",
        markdown: "hook examples",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        cardId: card.id,
        title: "xiaohongshu wallpaper hooks",
      }),
    ]);

    const merged = await service.mergeIntoCard(card.id, {
      title: "new hook",
      markdown: "new hook markdown",
      sourceCardId: sourceCard.id,
      mergeNote: "user confirmed",
    });
    const mergeRecords = await storage.listCardMergeRecordsByTarget(card.id);

    expect(merged.markdown).toContain("new hook markdown");
    expect(mergeRecords).toEqual([
      expect.objectContaining({
        sourceCardId: sourceCard.id,
        targetCardId: card.id,
        sourceTitle: "new hook",
        mergeNote: "user confirmed",
      }),
    ]);
  });

  it("streams research message facts, progress, assistant content and depositable blocks", async () => {
    const capturedTasks: AgentTask[] = [];
    const { service } = await createFixture(successResearchAgent(capturedTasks));
    const session = await service.createResearchSession({
      seedId: "seed_1",
      title: "平台研究",
    });

    const events = [];
    for await (const event of service.streamResearchMessage(session.id, {
      message: "研究小红书壁纸内容",
    })) {
      events.push(event);
    }
    const messages = await service.listResearchMessages(session.id);
    const blocks = await service.listDepositableBlocks(session.id);

    expect(events.map((event) => event.type)).toEqual([
      "user_message",
      "progress",
      "progress",
      "progress",
      "progress",
      "assistant_message_delta",
      "depositable_block",
      "done",
    ]);
    expect(events[0]).toMatchObject({
      type: "user_message",
      message: {
        role: "user",
        content: "研究小红书壁纸内容",
      },
    });
    expect(events[5]).toMatchObject({
      type: "assistant_message_delta",
      delta: "找到一个可沉淀方向。",
      done: true,
    });
    expect(events[6]).toMatchObject({
      type: "depositable_block",
      block: {
        title: "小红书壁纸情绪钩子",
        markdown: "围绕情绪场景组织壁纸内容。",
      },
    });
    expect(messages).toMatchObject([
      { role: "user", content: "研究小红书壁纸内容" },
      { role: "assistant", content: "找到一个可沉淀方向。" },
    ]);
    expect(blocks).toHaveLength(1);
    expect(capturedTasks).toHaveLength(1);
  });

  it("streams AI generated thought, message and nutrient deltas before final persistence", async () => {
    const capturedTasks: AgentTask[] = [];
    const { service } = await createFixture(streamingResearchAgent(capturedTasks));
    const session = await service.createResearchSession({
      seedId: "seed_1",
      title: "platform research",
    });

    const events = [];
    for await (const event of service.streamResearchMessage(session.id, {
      message: "research XHS wallpaper content",
    })) {
      events.push(event);
    }
    const messages = await service.listResearchMessages(session.id);
    const blocks = await service.listDepositableBlocks(session.id);

    expect(events.map((event) => event.type)).toEqual([
      "user_message",
      "progress",
      "progress",
      "thought_delta",
      "message_delta",
      "message_delta",
      "nutrient_block_delta",
      "nutrient_block_delta",
      "progress",
      "progress",
      "assistant_message_delta",
      "depositable_block",
      "done",
    ]);
    expect(events[3]).toMatchObject({
      type: "thought_delta",
      delta: "comparing research material",
    });
    expect(events[4]).toMatchObject({
      type: "message_delta",
      delta: "found one direction: ",
    });
    expect(events[6]).toMatchObject({
      type: "nutrient_block_delta",
      title: "XHS wallpaper emotional hook",
      delta: "package around emotions",
    });
    expect(messages).toMatchObject([
      { role: "user" },
      { role: "assistant", content: "found one direction: emotional scenes." },
    ]);
    expect(blocks).toMatchObject([
      {
        title: "XHS wallpaper emotional hook",
        markdown: "package wallpaper content around emotions and scenes.",
      },
    ]);
    expect(capturedTasks).toHaveLength(1);
  });

  it("streams tool lifecycle events from the Agent", async () => {
    const capturedTasks: AgentTask[] = [];
    const { service } = await createFixture(toolStreamingResearchAgent(capturedTasks));
    const session = await service.createResearchSession({
      seedId: "seed_1",
      title: "tool research",
    });

    const events = [];
    for await (const event of service.streamResearchMessage(session.id, {
      message: "research platform examples",
    })) {
      events.push(event);
    }

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tool_call_started",
          toolName: "networked_research",
          metadata: { mode: "research" },
        }),
        expect.objectContaining({
          type: "tool_call_completed",
          toolName: "networked_research",
          metadata: { resultCount: 3 },
        }),
      ]),
    );
    expect(capturedTasks).toHaveLength(1);
  });

  it("streams research errors while keeping saved user facts recoverable", async () => {
    const { service } = await createFixture(failingResearchAgent());
    const session = await service.createResearchSession({
      seedId: "seed_1",
      title: "平台研究",
    });

    const events = [];
    for await (const event of service.streamResearchMessage(session.id, {
      message: "研究失败案例",
    })) {
      events.push(event);
    }
    const messages = await service.listResearchMessages(session.id);

    expect(events.at(-1)).toMatchObject({
      type: "error",
      code: "AGENT_TASK_FAILED",
      message: "研究失败",
      assistantMessage: {
        role: "assistant",
        failureReason: "研究失败",
      },
    });
    expect(messages).toMatchObject([
      { role: "user", content: "研究失败案例" },
      { role: "assistant", content: "研究失败", failureReason: "研究失败" },
    ]);
  });

  it("streams cancellation while keeping saved user facts recoverable", async () => {
    const abortController = new AbortController();
    abortController.abort();
    const { service } = await createFixture(streamingResearchAgent());
    const session = await service.createResearchSession({
      seedId: "seed_1",
      title: "平台研究",
    });

    const events = [];
    for await (const event of service.streamResearchMessage(
      session.id,
      { message: "研究后取消" },
      { signal: abortController.signal },
    )) {
      events.push(event);
    }
    const messages = await service.listResearchMessages(session.id);

    expect(events.at(-1)).toMatchObject({
      type: "cancelled",
      message: "营养研究已暂停。",
      assistantMessage: {
        role: "assistant",
        failureReason: "营养研究已暂停。",
      },
    });
    expect(messages).toMatchObject([
      { role: "user", content: "研究后取消" },
      { role: "assistant", content: "营养研究已暂停。", failureReason: "营养研究已暂停。" },
    ]);
  });

  it("rejects deleting a research session while streaming and allows it after stop", async () => {
    let release!: () => void;
    const releasePromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { service } = await createFixture(blockingStreamingResearchAgent(releasePromise));
    const session = await service.createResearchSession({
      seedId: "seed_1",
      title: "running session",
    });
    const iterator = service.streamResearchMessage(session.id, {
      message: "start long research",
    });

    await iterator.next();
    await iterator.next();
    await iterator.next();
    await iterator.next();

    await expect(service.deleteResearchSession(session.id)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 409,
    });

    release();
    await iterator.return(undefined);
    await expect(service.deleteResearchSession(session.id)).resolves.toBeUndefined();
  });

  it("lists and deletes independent seed research sessions", async () => {
    const { service } = await createFixture(successResearchAgent());
    const firstSession = await service.createResearchSession({
      seedId: "seed_1",
      title: "first session",
    });
    const card = await service.createCard("seed_1", {
      title: "draft nutrient",
      markdown: "draft markdown",
    });
    const secondSession = await service.createResearchSession({
      seedId: "seed_1",
      title: "second session",
    });

    await service.submitResearchMessage(firstSession.id, {
      message: "refresh first session",
    });
    await service.submitResearchMessage(secondSession.id, {
      message: "refresh second session",
    });

    await expect(
      service.listResearchSessions({ seedId: "seed_1" }),
    ).resolves.toMatchObject([
      { id: secondSession.id },
      { id: firstSession.id },
    ]);

    await service.deleteResearchSession(firstSession.id);

    await expect(service.getResearchSession(firstSession.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.listResearchMessages(firstSession.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.getCard(card.id)).resolves.toMatchObject({
      id: card.id,
      title: "draft nutrient",
    });
  });
});
