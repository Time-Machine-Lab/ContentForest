import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import { LocalGeneratorSkillContentAccessAdapter } from "../content-access/adapters/local-generator-skill-content-access-adapter.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import { createZip } from "./generator-test-zip.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-generator-"));
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

describe("LocalGeneratorSkillContentAccessAdapter", () => {
  it("extracts a generator zip into a relative generator content location", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalGeneratorSkillContentAccessAdapter(
      config.contentRootDir,
    );

    const contentLocation = await adapter.saveGeneratorSkill({
      generatorId: "generator_1",
      zipBuffer: createZip([
        { path: "SKILL.md", content: "# Skill" },
        { path: "examples/demo.md", content: "demo", compression: "store" },
      ]),
    });

    expect(contentLocation).toBe("generators/generator_1");
    expect(contentLocation).not.toMatch(/^[a-zA-Z]:[\\/]/);
    await expect(
      readFile(join(config.contentRootDir, contentLocation, "SKILL.md"), "utf8"),
    ).resolves.toBe("# Skill");
    await expect(adapter.readGeneratorSkill(contentLocation)).resolves.toEqual({
      skillMarkdown: "# Skill",
      entries: ["SKILL.md", "examples/demo.md"],
    });
  });

  it("strips a single zip root directory before validating SKILL.md", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalGeneratorSkillContentAccessAdapter(
      config.contentRootDir,
    );

    const contentLocation = await adapter.saveGeneratorSkill({
      generatorId: "generator_wrapped",
      zipBuffer: createZip([
        { path: "wrapped/SKILL.md", content: "# Wrapped" },
        { path: "wrapped/assets/a.txt", content: "asset" },
      ]),
    });

    await expect(adapter.readGeneratorSkill(contentLocation)).resolves.toEqual({
      skillMarkdown: "# Wrapped",
      entries: ["SKILL.md", "assets/a.txt"],
    });
  });

  it("rejects invalid zip and zip without SKILL.md", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalGeneratorSkillContentAccessAdapter(
      config.contentRootDir,
    );

    await expect(
      adapter.saveGeneratorSkill({
        generatorId: "generator_bad_zip",
        zipBuffer: Buffer.from("not a zip"),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      adapter.saveGeneratorSkill({
        generatorId: "generator_missing_skill",
        zipBuffer: createZip([{ path: "README.md", content: "missing" }]),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it("rejects path traversal and absolute paths in zip entries", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalGeneratorSkillContentAccessAdapter(
      config.contentRootDir,
    );

    await expect(
      adapter.saveGeneratorSkill({
        generatorId: "generator_traversal",
        zipBuffer: createZip([
          { path: "SKILL.md", content: "# Skill" },
          { path: "../outside.md", content: "outside" },
        ]),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      adapter.saveGeneratorSkill({
        generatorId: "generator_absolute",
        zipBuffer: createZip([
          { path: "SKILL.md", content: "# Skill" },
          { path: "C:/outside.md", content: "outside" },
        ]),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(pathExists(join(config.contentRootDir, "outside.md"))).resolves.toBe(
      false,
    );
  });

  it("keeps the original skill readable when replacement validation fails", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);
    const adapter = new LocalGeneratorSkillContentAccessAdapter(
      config.contentRootDir,
    );

    const contentLocation = await adapter.saveGeneratorSkill({
      generatorId: "generator_replace",
      zipBuffer: createZip([{ path: "SKILL.md", content: "# Original" }]),
    });

    await expect(
      adapter.replaceGeneratorSkill({
        generatorId: "generator_replace",
        zipBuffer: createZip([{ path: "README.md", content: "missing" }]),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(adapter.readGeneratorSkill(contentLocation)).resolves.toMatchObject({
      skillMarkdown: "# Original",
    });
  });
});
