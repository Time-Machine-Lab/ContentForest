import { describe, expect, it } from "vitest";
import { InMemoryNutrientMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-nutrient-markdown-content-access-adapter.js";
import { NutrientService } from "../modules/nutrient/application/nutrient-service.js";
import {
  NUTRIENT_ARCHIVE_STATES,
  NUTRIENT_LIBRARY_SCOPES,
} from "../modules/nutrient/domain/nutrient-types.js";
import { SEED_ARCHIVE_STATES } from "../modules/seed/domain/seed-types.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryNutrientStorageAdapter } from "../storage/adapters/in-memory-nutrient-storage-adapter.js";
import { InMemorySeedStorageAdapter } from "../storage/adapters/in-memory-seed-storage-adapter.js";

function createIdGenerator(): IdGenerator {
  let counter = 0;
  return {
    nextId(prefix: string): string {
      counter += 1;
      return `${prefix}_${counter}`;
    },
  };
}

function createNow(): () => Date {
  let counter = 0;
  return () => {
    counter += 1;
    return new Date(`2026-01-01T00:00:${String(counter).padStart(2, "0")}.000Z`);
  };
}

async function createFixture(): Promise<{
  service: NutrientService;
  storage: InMemoryNutrientStorageAdapter;
  contentAccess: InMemoryNutrientMarkdownContentAccessAdapter;
  seedStorage: InMemorySeedStorageAdapter;
}> {
  const storage = new InMemoryNutrientStorageAdapter();
  const contentAccess = new InMemoryNutrientMarkdownContentAccessAdapter();
  const seedStorage = new InMemorySeedStorageAdapter();
  await seedStorage.createSeed({
    id: "seed_1",
    title: "壁纸项目",
    archiveState: SEED_ARCHIVE_STATES.active,
    contentLocation: "seeds/seed_1.md",
    rootNodeId: "seed-node_seed_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
  });
  await seedStorage.createSeed({
    id: "seed_2",
    title: "脚本项目",
    archiveState: SEED_ARCHIVE_STATES.active,
    contentLocation: "seeds/seed_2.md",
    rootNodeId: "seed-node_seed_2",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
  });
  const service = new NutrientService({
    storage,
    contentAccess,
    seedStorage,
    idGenerator: createIdGenerator(),
    now: createNow(),
  });
  return {
    service,
    storage,
    contentAccess,
    seedStorage,
  };
}

describe("NutrientService", () => {
  it("creates public and seed-scoped libraries with optional descriptions", async () => {
    const { service } = await createFixture();

    const publicLibrary = await service.createLibrary({
      name: "小红书平台营养库",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
    });
    const seedScopedLibrary = await service.createLibrary({
      name: "壁纸专属营养库",
      description: "壁纸项目资料",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });

    expect(publicLibrary).toMatchObject({
      id: "nutrient-library_1",
      description: "",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
      seedId: null,
      archiveState: NUTRIENT_ARCHIVE_STATES.active,
    });
    expect(seedScopedLibrary).toMatchObject({
      id: "nutrient-library_2",
      description: "壁纸项目资料",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });
  });

  it("rejects missing names, missing seed ownership, invalid seeds and public seed binding", async () => {
    const { service } = await createFixture();

    await expect(
      service.createLibrary({ name: " ", scope: NUTRIENT_LIBRARY_SCOPES.public }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      service.createLibrary({
        name: "专属",
        scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.createLibrary({
        name: "专属",
        scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
        seedId: "missing",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.createLibrary({
        name: "公共",
        scope: NUTRIENT_LIBRARY_SCOPES.public,
        seedId: "seed_1",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("edits only library name and description and archives/restores without delete", async () => {
    const { service } = await createFixture();
    const library = await service.createLibrary({
      name: "旧名称",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });

    const edited = await service.updateLibrary(library.id, {
      name: "新名称",
      description: "新描述",
    });
    const archived = await service.archiveLibrary(library.id);
    const restored = await service.restoreLibrary(library.id);

    expect(edited).toMatchObject({
      id: library.id,
      name: "新名称",
      description: "新描述",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });
    expect(archived.archiveState).toBe(NUTRIENT_ARCHIVE_STATES.archived);
    expect(restored.archiveState).toBe(NUTRIENT_ARCHIVE_STATES.active);
    expect("deleteLibrary" in service).toBe(false);
  });

  it("creates, reads, edits, archives and restores markdown nutrient content", async () => {
    const { service } = await createFixture();
    const library = await service.createLibrary({
      name: "公共营养",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
    });

    const content = await service.createContent(library.id, {
      title: "标题方法",
      markdown: "# 标题方法\n\n只保存正文。",
    });
    const edited = await service.updateContent(content.id, {
      title: "新标题方法",
      markdown: "新正文",
    });
    const archived = await service.archiveContent(content.id);
    const restored = await service.restoreContent(content.id);

    expect(content).toMatchObject({
      id: "nutrient-content_2",
      libraryId: library.id,
      contentLocation: "nutrients/public/nutrient-content_2.md",
      markdown: "# 标题方法\n\n只保存正文。",
    });
    expect(edited).toMatchObject({
      title: "新标题方法",
      markdown: "新正文",
    });
    expect(archived.archiveState).toBe(NUTRIENT_ARCHIVE_STATES.archived);
    expect(restored.archiveState).toBe(NUTRIENT_ARCHIVE_STATES.active);
    expect("deleteContent" in service).toBe(false);
  });

  it("rejects creating or editing content under archived libraries", async () => {
    const { service } = await createFixture();
    const library = await service.createLibrary({
      name: "公共营养",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
    });
    const content = await service.createContent(library.id, {
      title: "资料",
      markdown: "正文",
    });
    await service.archiveLibrary(library.id);

    await expect(
      service.createContent(library.id, { title: "新资料", markdown: "正文" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.updateContent(content.id, { markdown: "不能改" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("filters referable nutrients by public scope, seed ownership and archive state", async () => {
    const { service } = await createFixture();
    const publicLibrary = await service.createLibrary({
      name: "公共",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
    });
    const scopedLibrary = await service.createLibrary({
      name: "seed1 专属",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_1",
    });
    const otherLibrary = await service.createLibrary({
      name: "seed2 专属",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: "seed_2",
    });
    const archivedLibrary = await service.createLibrary({
      name: "归档库",
      scope: NUTRIENT_LIBRARY_SCOPES.public,
    });

    const publicContent = await service.createContent(publicLibrary.id, {
      title: "公共资料",
      markdown: "公共正文",
    });
    const scopedContent = await service.createContent(scopedLibrary.id, {
      title: "专属资料",
      markdown: "专属正文",
    });
    await service.createContent(otherLibrary.id, {
      title: "其他种子资料",
      markdown: "其他正文",
    });
    const archivedContent = await service.createContent(publicLibrary.id, {
      title: "归档资料",
      markdown: "归档正文",
    });
    await service.createContent(archivedLibrary.id, {
      title: "归档库资料",
      markdown: "归档库正文",
    });
    await service.archiveContent(archivedContent.id);
    await service.archiveLibrary(archivedLibrary.id);

    const referable = await service.listReferableContents("seed_1");

    expect(referable.map((content) => content.id)).toEqual([
      scopedContent.id,
      publicContent.id,
    ]);
    await expect(
      service.assertNutrientRefsReferable("seed_1", [
        { resourceType: "nutrient", resourceId: publicContent.id },
      ]),
    ).resolves.toBeUndefined();
    await expect(
      service.assertNutrientRefsReferable("seed_1", [
        { resourceType: "nutrient", resourceId: archivedContent.id },
      ]),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
