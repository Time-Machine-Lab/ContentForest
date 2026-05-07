import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import { LocalNutrientMarkdownContentAccessAdapter } from "../content-access/adapters/local-nutrient-markdown-content-access-adapter.js";
import { NUTRIENT_LIBRARY_SCOPES } from "../modules/nutrient/domain/nutrient-types.js";
import { ApplicationError } from "../shared/errors/application-error.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-nutrient-content-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Nutrient markdown content access", () => {
  it("stores only markdown body content under public and seed-scoped runtime paths", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalNutrientMarkdownContentAccessAdapter(
      config.contentRootDir,
    );

    const publicLocation = await adapter.createNutrientMarkdown({
      contentId: "nutrient_1",
      libraryScope: NUTRIENT_LIBRARY_SCOPES.public,
      seedId: null,
      markdown: "# 公共正文",
    });
    const scopedLocation = await adapter.createNutrientMarkdown({
      contentId: "nutrient_2",
      libraryScope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
      markdown: "# 专属正文",
    });
    await adapter.updateNutrientMarkdown(scopedLocation, "新专属正文");

    expect(publicLocation).toBe("nutrients/public/nutrient_1.md");
    expect(scopedLocation).toBe("nutrients/seed-scoped/seed_1/nutrient_2.md");
    await expect(adapter.readNutrientMarkdown(scopedLocation)).resolves.toBe(
      "新专属正文",
    );
    await expect(
      readFile(join(config.contentRootDir, publicLocation), "utf8"),
    ).resolves.toBe("# 公共正文");
  });

  it("rejects unsafe content locations", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalNutrientMarkdownContentAccessAdapter(
      config.contentRootDir,
    );

    await expect(
      adapter.readNutrientMarkdown("../outside.md"),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      adapter.updateNutrientMarkdown("nutrients/../tmp/x.md", "x"),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});
