import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import { LocalGeneMarkdownContentAccessAdapter } from "../content-access/adapters/local-gene-markdown-content-access-adapter.js";
import { ApplicationError } from "../shared/errors/application-error.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-gene-content-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Gene markdown content access", () => {
  it("prepares seed libraries and stores only markdown body content", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalGeneMarkdownContentAccessAdapter(
      config.contentRootDir,
    );

    const libraryLocation = await adapter.prepareSeedGeneLibrary("seed_1");
    const insightLocation = await adapter.createGeneInsightMarkdown({
      seedId: "seed_1",
      insightId: "gene_1",
      markdown: "# 经验正文\n\n只保存正文。",
    });
    await adapter.updateGeneInsightMarkdown(insightLocation, "新正文");

    expect(libraryLocation).toBe("genes/seed-scoped/seed_1");
    expect(insightLocation).toBe("genes/seed-scoped/seed_1/gene_1.md");
    await expect(adapter.readGeneInsightMarkdown(insightLocation)).resolves.toBe(
      "新正文",
    );
  });

  it("rejects unsafe content locations", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalGeneMarkdownContentAccessAdapter(
      config.contentRootDir,
    );

    await expect(
      adapter.readGeneInsightMarkdown("../outside.md"),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      adapter.updateGeneInsightMarkdown("genes/../tmp/x.md", "x"),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});

