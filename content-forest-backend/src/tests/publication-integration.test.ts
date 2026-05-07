import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import { InMemoryFruitMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-fruit-markdown-content-access-adapter.js";
import { PublicationController } from "../interface/http/publication-controller.js";
import { FruitService } from "../modules/fruit/application/fruit-service.js";
import { PublicationService } from "../modules/publication/application/publication-service.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryFruitStorageAdapter } from "../storage/adapters/in-memory-fruit-storage-adapter.js";
import { SqlitePublicationStorageAdapter } from "../storage/adapters/sqlite-publication-storage-adapter.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-publication-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Publication module integration", () => {
  it("persists manual publication records in SQLite and exposes controller operations", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);

    let idCounter = 0;
    let timeCounter = 0;
    const idGenerator: IdGenerator = {
      nextId(prefix: string): string {
        idCounter += 1;
        return `${prefix}_integration_${idCounter}`;
      },
    };
    const fruitService = new FruitService({
      storage: new InMemoryFruitStorageAdapter(),
      contentAccess: new InMemoryFruitMarkdownContentAccessAdapter(),
      idGenerator,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });
    const fruit = await fruitService.createFruitFromCandidate({
      markdown: "# Selected fruit",
      parentNodeRef: { nodeId: "seed-node_seed_1", nodeType: "seed" },
    });
    await fruitService.selectFruit(fruit.id);

    const publicationStorage = new SqlitePublicationStorageAdapter(
      config.databasePath,
    );
    const publicationService = new PublicationService({
      storage: publicationStorage,
      publishableFruitPort: fruitService,
      idGenerator,
      now: () => {
        timeCounter += 1;
        return new Date(`2026-01-01T00:00:0${timeCounter}.000Z`);
      },
    });
    const controller = new PublicationController(publicationService);

    try {
      const created = await controller.createPublicationRecord({
        fruitId: fruit.id,
        publicationTarget: "X post",
        publicationEvidence: "https://example.test/post/1",
        publicationNote: "first pass",
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        id: "publication_integration_2",
        fruitId: fruit.id,
        publishedAt: "2026-01-01T00:00:01.000Z",
      });

      const createdBody = created.body as { id: string };
      const edited = await controller.editPublicationRecord(createdBody.id, {
        publicationTarget: "X thread",
        publicationEvidence: "https://example.test/thread/1",
      });
      expect(edited.status).toBe(200);
      expect(edited.body).toMatchObject({
        id: createdBody.id,
        fruitId: fruit.id,
        publicationTarget: "X thread",
        publicationEvidence: "https://example.test/thread/1",
        publishedAt: "2026-01-01T00:00:01.000Z",
      });

      await expect(
        controller.getPublicationRecord(createdBody.id),
      ).resolves.toMatchObject({
        status: 200,
        body: { id: createdBody.id },
      });
      await expect(
        controller.listPublicationRecordsByFruit(fruit.id),
      ).resolves.toMatchObject({
        status: 200,
        body: [{ id: createdBody.id }],
      });
    } finally {
      publicationStorage.close();
    }
  });
});

