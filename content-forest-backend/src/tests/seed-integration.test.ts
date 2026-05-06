import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import { LocalSeedMarkdownContentAccessAdapter } from "../content-access/adapters/local-seed-markdown-content-access-adapter.js";
import { SeedService } from "../modules/seed/application/seed-service.js";
import { SEED_ARCHIVE_STATES } from "../modules/seed/domain/seed-types.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { SqliteSeedStorageAdapter } from "../storage/adapters/sqlite-seed-storage-adapter.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-seed-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Seed module integration", () => {
  it("persists seed facts in SQLite and markdown content in the runtime filesystem", async () => {
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
    const storage = new SqliteSeedStorageAdapter(config.databasePath);
    const service = new SeedService({
      storage,
      contentAccess: new LocalSeedMarkdownContentAccessAdapter(config.contentRootDir),
      idGenerator,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });

    try {
      const seed = await service.createSeed({
        title: "真实适配器种子",
        markdown: "# 真实 Markdown",
      });
      const detail = await service.getSeed(seed.id);
      const storedMarkdown = await readFile(
        join(config.contentRootDir, seed.contentLocation),
        "utf8",
      );

      expect(seed).toMatchObject({
        id: "seed_integration",
        archiveState: SEED_ARCHIVE_STATES.active,
        contentLocation: "seeds/seed_integration.md",
      });
      expect(detail.markdown).toBe("# 真实 Markdown");
      expect(storedMarkdown).toBe("# 真实 Markdown");
    } finally {
      storage.close();
    }
  });
});

