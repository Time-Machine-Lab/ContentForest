import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import type { AgentPort } from "../agent/ports/agent-port.js";
import type { AgentTask, AgentTaskResult } from "../agent/runtime/agent-task.js";
import { LocalNutrientMarkdownContentAccessAdapter } from "../content-access/adapters/local-nutrient-markdown-content-access-adapter.js";
import { NutrientController } from "../interface/http/nutrient-controller.js";
import { NutrientService } from "../modules/nutrient/application/nutrient-service.js";
import {
  NUTRIENT_ARCHIVE_STATES,
  NUTRIENT_CARD_STATUSES,
  NUTRIENT_LIBRARY_SCOPES,
} from "../modules/nutrient/domain/nutrient-types.js";
import { SEED_ARCHIVE_STATES } from "../modules/seed/domain/seed-types.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { SqliteNutrientStorageAdapter } from "../storage/adapters/sqlite-nutrient-storage-adapter.js";
import { SqliteSeedStorageAdapter } from "../storage/adapters/sqlite-seed-storage-adapter.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-nutrient-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function createIdGenerator(): IdGenerator {
  let counter = 0;
  return {
    nextId(prefix: string): string {
      counter += 1;
      return `${prefix}_integration_${counter}`;
    },
  };
}

describe("Nutrient module integration", () => {
  it("persists nutrient facts in SQLite, markdown in files, and exposes controller methods", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);

    const seedStorage = new SqliteSeedStorageAdapter(config.databasePath);
    const nutrientStorage = new SqliteNutrientStorageAdapter(config.databasePath);
    const service = new NutrientService({
      storage: nutrientStorage,
      seedStorage,
      contentAccess: new LocalNutrientMarkdownContentAccessAdapter(
        config.contentRootDir,
      ),
      idGenerator: createIdGenerator(),
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });
    const controller = new NutrientController(service);

    try {
      await seedStorage.createSeed({
        id: "seed_integration",
        title: "集成种子",
        archiveState: SEED_ARCHIVE_STATES.active,
        contentLocation: "seeds/seed_integration.md",
        rootNodeId: "seed-node_seed_integration",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        archivedAt: null,
      });

      const createdLibrary = await controller.createLibrary({
        name: "集成营养库",
        scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
        seedId: "seed_integration",
      });
      const library = createdLibrary.body as { id: string };
      const createdContent = await controller.createContent(library.id, {
        title: "集成营养",
        markdown: "# 集成正文",
      });
      const content = createdContent.body as {
        id: string;
        contentLocation: string;
      };
      const referable = await controller.listReferableContents("seed_integration");
      const archived = await controller.archiveContent(content.id);

      expect(createdLibrary.status).toBe(201);
      expect(createdContent.status).toBe(201);
      expect(referable.body).toMatchObject([
        {
          id: content.id,
          library: {
            id: library.id,
            scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
            seedId: "seed_integration",
          },
        },
      ]);
      expect(archived.body).toMatchObject({
        archiveState: NUTRIENT_ARCHIVE_STATES.archived,
      });
      await expect(
        readFile(join(config.contentRootDir, content.contentLocation), "utf8"),
      ).resolves.toBe("# 集成正文");
    } finally {
      seedStorage.close();
      nutrientStorage.close();
    }
  });

  it("ensures default seed nutrient library and deletes draft workbench content in SQLite", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);

    const seedStorage = new SqliteSeedStorageAdapter(config.databasePath);
    const nutrientStorage = new SqliteNutrientStorageAdapter(config.databasePath);
    const service = new NutrientService({
      storage: nutrientStorage,
      seedStorage,
      contentAccess: new LocalNutrientMarkdownContentAccessAdapter(
        config.contentRootDir,
      ),
      idGenerator: createIdGenerator(),
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });
    const controller = new NutrientController(service);

    try {
      await seedStorage.createSeed({
        id: "seed_integration",
        title: "integration seed",
        archiveState: SEED_ARCHIVE_STATES.active,
        contentLocation: "seeds/seed_integration.md",
        rootNodeId: "seed-node_seed_integration",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        archivedAt: null,
      });

      const ensured = await controller.ensureDefaultSeedScopedLibrary(
        "seed_integration",
      );
      const ensuredAgain = await controller.ensureDefaultSeedScopedLibrary(
        "seed_integration",
      );
      const draftResult = await controller.createCard("seed_integration", {
        title: "draft nutrient",
        markdown: "draft markdown",
      });
      const draft = draftResult.body as {
        id: string;
        contentLocation: string;
      };
      const deleted = await controller.deleteDraftCard(draft.id);
      const settledDraft = await controller.createCard("seed_integration", {
        title: "settled nutrient",
        markdown: "settled markdown",
      });
      const settled = await controller.settleCard(
        (settledDraft.body as { id: string }).id,
        {},
      );

      expect(ensured.status).toBe(200);
      expect(ensuredAgain.body).toMatchObject({
        id: (ensured.body as { id: string }).id,
      });
      expect(deleted.status).toBe(204);
      await expect(controller.getCard(draft.id)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      await expect(
        readFile(join(config.contentRootDir, draft.contentLocation), "utf8"),
      ).rejects.toThrow();
      expect(settled.body).toMatchObject({
        status: NUTRIENT_CARD_STATUSES.settled,
        settledContentId: expect.any(String),
      });
    } finally {
      seedStorage.close();
      nutrientStorage.close();
    }
  });

  it("persists nutrient research sessions, messages and depositable blocks without creating formal nutrients", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);

    const seedStorage = new SqliteSeedStorageAdapter(config.databasePath);
    const nutrientStorage = new SqliteNutrientStorageAdapter(config.databasePath);
    const capturedTasks: AgentTask[] = [];
    const service = new NutrientService({
      storage: nutrientStorage,
      seedStorage,
      contentAccess: new LocalNutrientMarkdownContentAccessAdapter(
        config.contentRootDir,
      ),
      agentPort: fakeResearchAgent(capturedTasks),
      idGenerator: createIdGenerator(),
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });
    const controller = new NutrientController(service);

    try {
      await seedStorage.createSeed({
        id: "seed_integration",
        title: "集成种子",
        archiveState: SEED_ARCHIVE_STATES.active,
        contentLocation: "seeds/seed_integration.md",
        rootNodeId: "seed-node_seed_integration",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        archivedAt: null,
      });

      const sessionResult = await controller.createResearchSession({
        seedId: "seed_integration",
        title: "平台研究",
      });
      const session = sessionResult.body as { id: string };
      const submitResult = await controller.submitResearchMessage(session.id, {
        message: "研究小红书壁纸内容",
      });
      const streamEvents = [];
      for await (const event of controller.streamResearchMessage(session.id, {
        message: "继续研究小红书封面",
      })) {
        streamEvents.push(event);
      }
      const messages = await controller.listResearchMessages(session.id);
      const blocks = await controller.listDepositableBlocks(session.id);
      const sessions = await controller.listResearchSessions({
        seedId: "seed_integration",
      });
      const referable = await controller.listReferableContents("seed_integration");
      const deletedSession = await controller.deleteResearchSession(session.id);

      expect(sessionResult.status).toBe(201);
      expect(submitResult.status).toBe(201);
      expect(streamEvents.map((event) => event.type)).toContain("done");
      expect(capturedTasks).toHaveLength(2);
      expect(capturedTasks[0]).toMatchObject({
        type: "nutrient_research",
        input: {
          seedId: "seed_integration",
          seedTitle: "集成种子",
          message: "研究小红书壁纸内容",
        },
      });
      expect(messages.body).toMatchObject([
        { role: "user", content: "研究小红书壁纸内容" },
        { role: "assistant", content: "找到一个可沉淀方向。" },
        { role: "user", content: "继续研究小红书封面" },
        { role: "assistant", content: "找到一个可沉淀方向。" },
      ]);
      expect(blocks.body).toMatchObject([
        {
          title: "小红书壁纸情绪钩子",
          markdown: "围绕情绪场景组织壁纸内容。",
        },
        {
          title: "小红书壁纸情绪钩子",
          markdown: "围绕情绪场景组织壁纸内容。",
        },
      ]);
      expect(sessions.body).toMatchObject([
        {
          id: session.id,
          seedId: "seed_integration",
        },
      ]);
      expect(referable.body).toEqual([]);
      expect(deletedSession.status).toBe(204);
      await expect(controller.getResearchSession(session.id)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    } finally {
      seedStorage.close();
      nutrientStorage.close();
    }
  });
});

function fakeResearchAgent(capturedTasks: AgentTask[]): AgentPort {
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
