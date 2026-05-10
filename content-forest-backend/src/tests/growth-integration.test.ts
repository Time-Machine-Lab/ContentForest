import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentPort } from "../agent/ports/agent-port.js";
import type { AgentTask, AgentTaskResult } from "../agent/runtime/agent-task.js";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import { LocalFruitMarkdownContentAccessAdapter } from "../content-access/adapters/local-fruit-markdown-content-access-adapter.js";
import { GrowthController } from "../interface/http/growth-controller.js";
import { FruitService } from "../modules/fruit/application/fruit-service.js";
import { GrowthService } from "../modules/growth/application/growth-service.js";
import type { GrowthTaskExecutionScheduler } from "../modules/growth/application/growth-service.js";
import { GROWTH_TASK_STATUSES } from "../modules/growth/domain/growth-types.js";
import { SEED_ARCHIVE_STATES } from "../modules/seed/domain/seed-types.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { SqliteFruitStorageAdapter } from "../storage/adapters/sqlite-fruit-storage-adapter.js";
import { SqliteGeneratorStorageAdapter } from "../storage/adapters/sqlite-generator-storage-adapter.js";
import { SqliteGrowthStorageAdapter } from "../storage/adapters/sqlite-growth-storage-adapter.js";
import { SqliteSeedStorageAdapter } from "../storage/adapters/sqlite-seed-storage-adapter.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-growth-"));
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

function createManualGrowthScheduler(): {
  schedule: GrowthTaskExecutionScheduler;
  runAll(): Promise<void>;
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
  };
}

function successAgent(): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      return {
        ok: true,
        taskId: task.taskId ?? "agent_integration",
        output: {
          taskType: "growth",
          content: {
            candidate: {
              markdown: "# SQLite 生长果实",
              summary: "SQLite集成果实",
              geneTags: ["集成"],
            },
          },
        },
        trace: [],
      };
    },
  };
}

describe("Growth module integration", () => {
  it("persists growth task facts in SQLite and exposes controller methods", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);

    const seedStorage = new SqliteSeedStorageAdapter(config.databasePath);
    const generatorStorage = new SqliteGeneratorStorageAdapter(config.databasePath);
    const fruitStorage = new SqliteFruitStorageAdapter(config.databasePath);
    const growthStorage = new SqliteGrowthStorageAdapter(config.databasePath);
    const scheduler = createManualGrowthScheduler();
    const fruitService = new FruitService({
      storage: fruitStorage,
      contentAccess: new LocalFruitMarkdownContentAccessAdapter(
        config.contentRootDir,
      ),
      idGenerator: createIdGenerator(),
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });
    const service = new GrowthService({
      storage: growthStorage,
      seedStorage,
      fruitStorage,
      generatorStorage,
      fruitService,
      agentPort: successAgent(),
      idGenerator: createIdGenerator(),
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      scheduleTaskExecution: scheduler.schedule,
    });
    const controller = new GrowthController(service);

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
      await generatorStorage.createGenerator({
        id: "generator_integration",
        name: "集成生成器",
        description: "集成测试",
        enableState: "enabled",
        contentLocation: "generators/generator_integration",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        disabledAt: null,
      });

      const created = await controller.startGrowthTask({
        seedId: "seed_integration",
        sourceNodeRef: {
          nodeType: "seed",
          nodeId: "seed-node_seed_integration",
        },
        generatorId: "generator_integration",
        fruitCount: 1,
      });
      const task = (created.body as { task: { id: string } }).task;
      const running = await controller.getGrowthTask(task.id);
      const runningStatus = await controller.getSourceStatus({
        nodeType: "seed",
        nodeId: "seed-node_seed_integration",
      });
      await scheduler.runAll();
      const queried = await controller.getGrowthTask(task.id);
      const status = await controller.getSourceStatus({
        nodeType: "seed",
        nodeId: "seed-node_seed_integration",
      });

      expect(created.status).toBe(201);
      expect(running.body).toMatchObject({
        status: GROWTH_TASK_STATUSES.running,
        successfulFruitIds: [],
      });
      expect(runningStatus.body).toMatchObject({
        isGrowing: true,
        taskId: task.id,
      });
      expect(queried.body).toMatchObject({
        status: GROWTH_TASK_STATUSES.completed,
        successfulFruitIds: ["fruit_integration_1"],
      });
      expect(status.body).toMatchObject({
        isGrowing: false,
        taskId: null,
      });
      expect("listWorkspaceTree" in controller).toBe(false);
    } finally {
      seedStorage.close();
      generatorStorage.close();
      fruitStorage.close();
      growthStorage.close();
    }
  });
});
