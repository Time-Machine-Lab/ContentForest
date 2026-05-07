import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentPort } from "../agent/ports/agent-port.js";
import type { AgentTask, AgentTaskResult } from "../agent/runtime/agent-task.js";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import { LocalFruitMarkdownContentAccessAdapter } from "../content-access/adapters/local-fruit-markdown-content-access-adapter.js";
import { LocalGeneMarkdownContentAccessAdapter } from "../content-access/adapters/local-gene-markdown-content-access-adapter.js";
import { LocalSeedMarkdownContentAccessAdapter } from "../content-access/adapters/local-seed-markdown-content-access-adapter.js";
import { GeneController } from "../interface/http/gene-controller.js";
import { FruitService } from "../modules/fruit/application/fruit-service.js";
import { GeneService } from "../modules/gene/application/gene-service.js";
import { GENE_INSIGHT_STATUSES } from "../modules/gene/domain/gene-types.js";
import { SeedService } from "../modules/seed/application/seed-service.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { SqliteFruitStorageAdapter } from "../storage/adapters/sqlite-fruit-storage-adapter.js";
import { SqliteGeneStorageAdapter } from "../storage/adapters/sqlite-gene-storage-adapter.js";
import { SqliteSeedStorageAdapter } from "../storage/adapters/sqlite-seed-storage-adapter.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-gene-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function agent(): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      return {
        ok: true,
        taskId: task.taskId ?? "agent-task_1",
        output: {
          taskType: "gene_extraction",
          content: {
            suggestions: [
              {
                title: "保留具体收益",
                bodyMarkdown: "标题和开头都应出现具体收益。",
                lineage: "收益表达",
                niche: "开头结构",
              },
            ],
          },
        },
        trace: [],
      };
    },
  };
}

describe("Gene module integration", () => {
  it("persists gene facts in SQLite and confirmed markdown in the runtime filesystem", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);
    const seedStorage = new SqliteSeedStorageAdapter(config.databasePath);
    const fruitStorage = new SqliteFruitStorageAdapter(config.databasePath);
    const geneStorage = new SqliteGeneStorageAdapter(config.databasePath);
    const idGenerator: IdGenerator = {
      nextId(prefix: string): string {
        return `${prefix}_integration`;
      },
    };
    const now = () => new Date("2026-01-01T00:00:00.000Z");
    const geneService = new GeneService({
      storage: geneStorage,
      contentAccess: new LocalGeneMarkdownContentAccessAdapter(
        config.contentRootDir,
      ),
      seedStorage,
      fruitStorage,
      agentPort: agent(),
      idGenerator,
      now,
    });
    const seedService = new SeedService({
      storage: seedStorage,
      contentAccess: new LocalSeedMarkdownContentAccessAdapter(
        config.contentRootDir,
      ),
      afterSeedCreated: (seedId) =>
        geneService.prepareSeedGeneLibrary(seedId).then(() => undefined),
      idGenerator,
      now,
    });
    const fruitService = new FruitService({
      storage: fruitStorage,
      contentAccess: new LocalFruitMarkdownContentAccessAdapter(
        config.contentRootDir,
      ),
      idGenerator,
      now,
    });
    const controller = new GeneController(geneService);

    try {
      const seed = await seedService.createSeed({
        title: "壁纸项目",
        markdown: "高清壁纸推广",
      });
      const fruit = await fruitService.createFruitFromCandidate({
        markdown: "有具体收益的版本",
        parentNodeRef: { nodeType: "seed", nodeId: seed.rootNodeId },
      });
      const reminder = await geneService.createReminderFromFruitEvidence(seed.id, {
        fruitId: fruit.id,
        action: "selected",
      });
      const taskResult = await controller.startExtractionTask(seed.id, {
        evidenceSources: reminder.evidenceSources,
      });
      const suggestion = (taskResult.body as {
        suggestions: Array<{ id: string }>;
      }).suggestions[0];
      const insightResult = await controller.confirmSuggestion(suggestion.id, {});
      const insight = insightResult.body as {
        id: string;
        status: string;
        contentLocation: string;
        bodyMarkdown: string;
      };

      expect(insight).toMatchObject({
        status: GENE_INSIGHT_STATUSES.active,
        contentLocation:
          "genes/seed-scoped/seed_integration/gene-insight_integration.md",
        bodyMarkdown: "标题和开头都应出现具体收益。",
      });
      await expect(controller.listReferableInsights(seed.id)).resolves.toMatchObject({
        body: [
          {
            id: insight.id,
          },
        ],
      });
    } finally {
      seedStorage.close();
      fruitStorage.close();
      geneStorage.close();
    }
  });
});
