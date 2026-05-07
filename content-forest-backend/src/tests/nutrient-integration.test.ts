import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import { LocalNutrientMarkdownContentAccessAdapter } from "../content-access/adapters/local-nutrient-markdown-content-access-adapter.js";
import { NutrientController } from "../interface/http/nutrient-controller.js";
import { NutrientService } from "../modules/nutrient/application/nutrient-service.js";
import {
  NUTRIENT_ARCHIVE_STATES,
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
});
