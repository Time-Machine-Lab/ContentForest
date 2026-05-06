import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bootstrapApp } from "../app/bootstrap/app-bootstrap.js";
import {
  initializeRuntimeFilesystem,
  STANDARD_CONTENT_DIRECTORIES,
} from "../app/bootstrap/runtime-filesystem.js";
import { loadAppConfig } from "../app/config/app-config.js";
import { LocalSeedMarkdownContentAccessAdapter } from "../content-access/adapters/local-seed-markdown-content-access-adapter.js";
import { ApplicationError } from "../shared/errors/application-error.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-"));
  tempRoots.push(root);
  return root;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("runtime filesystem bootstrap", () => {
  it("loads default runtime filesystem config from the project cwd", () => {
    const config = loadAppConfig({}, "D:/project/content-forest-backend");

    expect(config.contentRootDir.replaceAll("\\", "/")).toBe(
      "D:/project/content-forest-backend/data/content",
    );
    expect(config.databasePath.replaceAll("\\", "/")).toBe(
      "D:/project/content-forest-backend/data/app.sqlite",
    );
  });

  it("creates the content root and standard content directories", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "db", "app.sqlite"),
      port: 3001,
    };

    await initializeRuntimeFilesystem(config);

    await expect(pathExists(config.contentRootDir)).resolves.toBe(true);
    await expect(pathExists(join(root, "db"))).resolves.toBe(true);
    await Promise.all(
      STANDARD_CONTENT_DIRECTORIES.map(async (directory) => {
        await expect(pathExists(join(config.contentRootDir, directory))).resolves.toBe(
          true,
        );
      }),
    );
  });

  it("keeps bootstrap idempotent and does not overwrite existing content", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };

    await initializeRuntimeFilesystem(config);
    const existingFile = join(config.contentRootDir, "seeds", "existing.md");
    await writeFile(existingFile, "keep me", "utf8");
    await initializeRuntimeFilesystem(config);

    await expect(readFile(existingFile, "utf8")).resolves.toBe("keep me");
  });

  it("bootstraps the app runtime and creates the sqlite database file", async () => {
    const root = await createTempRoot();
    const contentRootDir = join(root, "content");
    const databasePath = join(root, "app.sqlite");

    const app = await bootstrapApp(
      {
        CONTENT_FOREST_CONTENT_ROOT: contentRootDir,
        CONTENT_FOREST_DATABASE_PATH: databasePath,
      },
      root,
    );

    try {
      await expect(pathExists(contentRootDir)).resolves.toBe(true);
      await expect(pathExists(join(contentRootDir, "seeds"))).resolves.toBe(true);
      await expect(pathExists(databasePath)).resolves.toBe(true);
    } finally {
      app.close();
    }
  });
});

describe("LocalSeedMarkdownContentAccessAdapter", () => {
  it("stores seed markdown with a relative seeds content location", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalSeedMarkdownContentAccessAdapter(config.contentRootDir);

    const contentLocation = await adapter.createSeedMarkdown({
      seedId: "seed_1",
      markdown: "# Seed",
    });

    expect(contentLocation).toBe("seeds/seed_1.md");
    expect(contentLocation).not.toMatch(/^[a-zA-Z]:[\\/]/);
    await expect(adapter.readSeedMarkdown(contentLocation)).resolves.toBe("# Seed");
  });

  it("rejects absolute content locations", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalSeedMarkdownContentAccessAdapter(config.contentRootDir);

    await expect(
      adapter.readSeedMarkdown(join(config.contentRootDir, "seeds", "seed_1.md")),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it("rejects content locations that attempt to traverse outside the content root", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalSeedMarkdownContentAccessAdapter(config.contentRootDir);

    await expect(adapter.readSeedMarkdown("../outside.md")).rejects.toBeInstanceOf(
      ApplicationError,
    );
    await expect(adapter.updateSeedMarkdown("seeds/../tmp/x.md", "x")).rejects.toBeInstanceOf(
      ApplicationError,
    );
  });
});
