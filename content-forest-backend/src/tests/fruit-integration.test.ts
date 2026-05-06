import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import { LocalFruitMarkdownContentAccessAdapter } from "../content-access/adapters/local-fruit-markdown-content-access-adapter.js";
import { FruitService } from "../modules/fruit/application/fruit-service.js";
import { FRUIT_SELECTION_STATES } from "../modules/fruit/domain/fruit-types.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { SqliteFruitStorageAdapter } from "../storage/adapters/sqlite-fruit-storage-adapter.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-fruit-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Fruit module integration", () => {
  it("persists fruit facts in SQLite and markdown content in the runtime filesystem", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);

    const idGenerator: IdGenerator = {
      nextId(prefix: string): string {
        return `${prefix}_integration`;
      },
    };
    const storage = new SqliteFruitStorageAdapter(config.databasePath);
    const contentAccess = new LocalFruitMarkdownContentAccessAdapter(
      config.contentRootDir,
    );
    const service = new FruitService({
      storage,
      contentAccess,
      idGenerator,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });

    try {
      const fruit = await service.createFruitFromCandidate({
        markdown: "# 真实果实",
        parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
        geneTags: ["真实适配器"],
      });
      await service.selectFruit(fruit.id);
      const detail = await service.getFruit(fruit.id);
      const children = await service.listChildFruits({
        nodeType: "seed",
        nodeId: "seed-node_seed_1",
      });
      const storedMarkdown = await readFile(
        join(config.contentRootDir, fruit.contentLocation),
        "utf8",
      );

      expect(detail).toMatchObject({
        id: "fruit_integration",
        selectionState: FRUIT_SELECTION_STATES.selected,
        contentLocation: "fruits/fruit_integration.md",
        markdown: "# 真实果实",
        geneTags: ["真实适配器"],
      });
      expect(children).toHaveLength(1);
      expect(storedMarkdown).toBe("# 真实果实");
    } finally {
      storage.close();
    }
  });

  it("rejects unsafe local fruit content locations", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalFruitMarkdownContentAccessAdapter(
      config.contentRootDir,
    );

    await expect(adapter.readFruitMarkdown("../outside.md")).rejects.toBeInstanceOf(
      ApplicationError,
    );
    await expect(
      adapter.updateFruitMarkdown("fruits/../tmp/x.md", "x"),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});
