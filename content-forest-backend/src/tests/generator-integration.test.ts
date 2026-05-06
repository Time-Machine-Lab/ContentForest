import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import { LocalGeneratorSkillContentAccessAdapter } from "../content-access/adapters/local-generator-skill-content-access-adapter.js";
import { GeneratorController } from "../interface/http/generator-controller.js";
import { GeneratorService } from "../modules/generator/application/generator-service.js";
import { GENERATOR_ENABLE_STATES } from "../modules/generator/domain/generator-types.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { SqliteGeneratorStorageAdapter } from "../storage/adapters/sqlite-generator-storage-adapter.js";
import { createZip } from "./generator-test-zip.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-generator-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Generator module integration", () => {
  it("persists generator facts in SQLite and skill content in the runtime filesystem", async () => {
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
    const storage = new SqliteGeneratorStorageAdapter(config.databasePath);
    const service = new GeneratorService({
      storage,
      contentAccess: new LocalGeneratorSkillContentAccessAdapter(
        config.contentRootDir,
      ),
      idGenerator,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });

    try {
      const generator = await service.importGenerator({
        name: "真实生成器",
        description: "真实 Skill",
        zipBuffer: createZip([{ path: "SKILL.md", content: "# Real Skill" }]),
      });
      const detail = await service.getGenerator(generator.id);
      const storedSkill = await readFile(
        join(config.contentRootDir, generator.contentLocation, "SKILL.md"),
        "utf8",
      );

      expect(generator).toMatchObject({
        id: "generator_integration",
        enableState: GENERATOR_ENABLE_STATES.enabled,
        contentLocation: "generators/generator_integration",
      });
      expect(detail.skillMarkdown).toBe("# Real Skill");
      expect(storedSkill).toBe("# Real Skill");
    } finally {
      storage.close();
    }
  });

  it("keeps controller as a thin HTTP adapter over generator service", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);

    const storage = new SqliteGeneratorStorageAdapter(config.databasePath);
    const service = new GeneratorService({
      storage,
      contentAccess: new LocalGeneratorSkillContentAccessAdapter(
        config.contentRootDir,
      ),
      idGenerator: {
        nextId(prefix: string): string {
          return `${prefix}_controller`;
        },
      },
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });
    const controller = new GeneratorController(service);

    try {
      const imported = await controller.importGenerator({
        name: "Controller 生成器",
        description: "契约测试",
        zipBuffer: createZip([{ path: "SKILL.md", content: "# Controller Skill" }]),
      });
      const selectable = await controller.listSelectableGenerators();
      const disabled = await controller.disableGenerator("generator_controller");

      expect(imported.status).toBe(201);
      expect(selectable.body).toMatchObject([
        {
          id: "generator_controller",
          contentLocation: "generators/generator_controller",
        },
      ]);
      expect(disabled.body).toMatchObject({
        id: "generator_controller",
        enableState: GENERATOR_ENABLE_STATES.disabled,
      });
    } finally {
      storage.close();
    }
  });
});
