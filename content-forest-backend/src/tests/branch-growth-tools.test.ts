import { describe, expect, it } from "vitest";
import { InMemoryGeneratorSkillContentAccessAdapter } from "../content-access/adapters/in-memory-generator-skill-content-access-adapter.js";
import { InMemoryGeneMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-gene-markdown-content-access-adapter.js";
import { InMemoryNutrientMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-nutrient-markdown-content-access-adapter.js";
import { GENERATOR_ENABLE_STATES } from "../modules/generator/domain/generator-types.js";
import { GENE_INSIGHT_STATUSES } from "../modules/gene/domain/gene-types.js";
import {
  NUTRIENT_ARCHIVE_STATES,
  NUTRIENT_LIBRARY_SCOPES,
} from "../modules/nutrient/domain/nutrient-types.js";
import { InMemoryGeneStorageAdapter } from "../storage/adapters/in-memory-gene-storage-adapter.js";
import { InMemoryGeneratorStorageAdapter } from "../storage/adapters/in-memory-generator-storage-adapter.js";
import { InMemoryNutrientStorageAdapter } from "../storage/adapters/in-memory-nutrient-storage-adapter.js";
import { ReadGeneratorSkillTool } from "../agent/tools/read-generator-skill-tool.js";
import { ExecuteGeneratorScriptTool } from "../agent/tools/execute-generator-script-tool.js";
import { ReadGrowthResourcesTool } from "../agent/tools/read-growth-context-tool.js";
import type { AgentTaskContext } from "../agent/runtime/agent-task.js";

const context: AgentTaskContext = {
  taskId: "agent-task_1",
  taskType: "growth",
  input: {
    authorizationScope: {
      generatorId: "generator_1",
      nutrientRefs: [],
      geneRefs: [],
    },
  },
  metadata: {},
  startedAt: "2026-01-01T00:00:00.000Z",
};

function resourceContext(
  nutrientRefs: Array<{ resourceType: "nutrient"; resourceId: string }>,
  geneRefs: Array<{ resourceType: "gene"; resourceId: string }> = [],
): AgentTaskContext {
  return {
    ...context,
    input: {
      seedId: "seed_1",
      authorizationScope: {
        seedId: "seed_1",
        generatorId: "generator_1",
        nutrientRefs,
        geneRefs,
      },
    },
  };
}

async function createFixture(): Promise<{
  storage: InMemoryGeneratorStorageAdapter;
  contentAccess: InMemoryGeneratorSkillContentAccessAdapter;
}> {
  const storage = new InMemoryGeneratorStorageAdapter();
  const contentAccess = new InMemoryGeneratorSkillContentAccessAdapter();
  await storage.createGenerator({
    id: "generator_1",
    name: "小红书生成器",
    description: "生成文案",
    enableState: GENERATOR_ENABLE_STATES.enabled,
    contentLocation: "generators/generator_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    disabledAt: null,
  });
  contentAccess.setGeneratorSkill("generators/generator_1", {
    "SKILL.md": "# Skill",
    "scripts/main.mjs": "export default (input) => `payload:${input.topic}`;",
  });
  return { storage, contentAccess };
}

describe("Branch growth generator tools", () => {
  it("reads authorized generator skill content without absolute paths", async () => {
    const { storage, contentAccess } = await createFixture();
    const tool = new ReadGeneratorSkillTool({ generatorStorage: storage, contentAccess });

    const output = await tool.execute({ generatorId: "generator_1" }, context);

    expect(output.content).toMatchObject({
      generatorId: "generator_1",
      skillMarkdown: "# Skill",
      entries: ["SKILL.md", "scripts/main.mjs"],
    });
    expect(JSON.stringify(output.content)).not.toContain(":\\");
  });

  it("rejects unauthorized, disabled and missing SKILL.md generators", async () => {
    const { storage, contentAccess } = await createFixture();
    await storage.createGenerator({
      id: "generator_disabled",
      name: "停用",
      description: "停用",
      enableState: GENERATOR_ENABLE_STATES.disabled,
      contentLocation: "generators/generator_disabled",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      disabledAt: "2026-01-01T00:00:00.000Z",
    });
    contentAccess.setGeneratorSkill("generators/generator_disabled", {
      "SKILL.md": "# Disabled",
    });
    await storage.createGenerator({
      id: "generator_missing_skill",
      name: "坏",
      description: "坏",
      enableState: GENERATOR_ENABLE_STATES.enabled,
      contentLocation: "generators/generator_missing_skill",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      disabledAt: null,
    });
    contentAccess.setGeneratorSkill("generators/generator_missing_skill", {
      "script.mjs": "export default () => 'x';",
    });
    const tool = new ReadGeneratorSkillTool({ generatorStorage: storage, contentAccess });

    await expect(tool.execute({ generatorId: "generator_2" }, context)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(
      tool.execute({ generatorId: "generator_disabled" }, {
        ...context,
        input: { authorizationScope: { generatorId: "generator_disabled" } },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      tool.execute({ generatorId: "generator_missing_skill" }, {
        ...context,
        input: { authorizationScope: { generatorId: "generator_missing_skill" } },
      }),
    ).rejects.toMatchObject({ code: "CONTENT_ACCESS_ERROR" });
  });

  it("executes authorized generator scripts and rejects unsafe paths", async () => {
    const { storage, contentAccess } = await createFixture();
    const tool = new ExecuteGeneratorScriptTool({
      generatorStorage: storage,
      contentAccess,
      timeoutMs: 1_000,
    });

    await expect(
      tool.execute(
        {
          generatorId: "generator_1",
          scriptPath: "scripts/main.mjs",
          input: { topic: "壁纸" },
        },
        context,
      ),
    ).resolves.toMatchObject({
      content: { payload: "payload:壁纸" },
    });
    await expect(
      tool.execute(
        {
          generatorId: "generator_1",
          scriptPath: "../outside.mjs",
        },
        context,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("wraps script timeout, abnormal exit and oversized output", async () => {
    const { storage, contentAccess } = await createFixture();
    contentAccess.setGeneratorSkill("generators/generator_1", {
      "SKILL.md": "# Skill",
      "timeout.mjs": "export default () => { while (true) {} };",
      "throw.mjs": "export default () => { throw new Error('boom') };",
      "large.mjs": "export default () => 'x'.repeat(1000);",
    });
    const tool = new ExecuteGeneratorScriptTool({
      generatorStorage: storage,
      contentAccess,
      timeoutMs: 50,
      maxOutputBytes: 100,
    });

    await expect(
      tool.execute({ generatorId: "generator_1", scriptPath: "timeout.mjs" }, context),
    ).rejects.toMatchObject({ code: "AGENT_TOOL_ERROR" });
    await expect(
      tool.execute({ generatorId: "generator_1", scriptPath: "throw.mjs" }, context),
    ).rejects.toMatchObject({ code: "AGENT_TOOL_ERROR" });
    await expect(
      tool.execute({ generatorId: "generator_1", scriptPath: "large.mjs" }, context),
    ).rejects.toMatchObject({ code: "AGENT_TOOL_ERROR" });
  });
});

describe("Branch growth resource tool", () => {
  it("reads authorized public and seed-scoped nutrient markdown without absolute paths", async () => {
    const fixture = await createResourceFixture();
    const tool = new ReadGrowthResourcesTool(fixture);

    const output = await tool.execute(
      { nutrientRefs: [{ resourceType: "nutrient", resourceId: "nutrient_other" }] },
      resourceContext([
        { resourceType: "nutrient", resourceId: "nutrient_public" },
        { resourceType: "nutrient", resourceId: "nutrient_seed" },
      ]),
    );

    const content = output.content as { nutrients: unknown[] };
    expect(content.nutrients).toEqual(
      expect.arrayContaining([
        {
          resourceType: "nutrient",
          resourceId: "nutrient_seed",
          title: "Seed scoped guide",
          library: {
            id: "library_seed",
            name: "Seed library",
            scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
            seedId: "seed_1",
          },
          markdown: "Seed scoped nutrient markdown",
        },
        {
          resourceType: "nutrient",
          resourceId: "nutrient_public",
          title: "Public guide",
          library: {
            id: "library_public",
            name: "Public library",
            scope: NUTRIENT_LIBRARY_SCOPES.public,
            seedId: null,
          },
          markdown: "Public nutrient markdown",
        },
      ]),
    );
    expect(JSON.stringify(output.content)).not.toContain(":\\");
    expect(JSON.stringify(output.content)).not.toContain("contentLocation");
    expect(JSON.stringify(output.content)).not.toContain("archiveState");
    expect(JSON.stringify(output.content)).not.toContain("nutrient_other");
  });

  it("does not return other-seed, archived, or unreferenced nutrient content", async () => {
    const fixture = await createResourceFixture();
    const tool = new ReadGrowthResourcesTool(fixture);

    const output = await tool.execute(
      {},
      resourceContext([
        { resourceType: "nutrient", resourceId: "nutrient_other" },
        { resourceType: "nutrient", resourceId: "nutrient_archived_content" },
        { resourceType: "nutrient", resourceId: "nutrient_archived_library" },
        { resourceType: "nutrient", resourceId: "nutrient_public" },
      ]),
    );
    const content = output.content as {
      nutrients: Array<{ resourceId: string; markdown: string }>;
    };

    expect(content.nutrients.map((item) => item.resourceId)).toEqual([
      "nutrient_public",
    ]);
    expect(JSON.stringify(output.content)).not.toContain("Other seed markdown");
    expect(JSON.stringify(output.content)).not.toContain("Archived content markdown");
    expect(JSON.stringify(output.content)).not.toContain("Archived library markdown");
  });

  it("returns authorized nutrients and genes together and keeps the tool read-only", async () => {
    const fixture = await createResourceFixture();
    const tool = new ReadGrowthResourcesTool(fixture);

    const beforeNutrients = await fixture.nutrientStorage.listReferableContents(
      "seed_1",
    );
    const beforeInsights = await fixture.geneStorage.listInsightsBySeed("seed_1");
    const output = await tool.execute(
      {},
      resourceContext(
        [{ resourceType: "nutrient", resourceId: "nutrient_public" }],
        [{ resourceType: "gene", resourceId: "gene_1" }],
      ),
    );

    expect(output.content).toMatchObject({
      nutrients: [{ resourceId: "nutrient_public" }],
      genes: [{ resourceId: "gene_1", markdown: "Gene markdown" }],
    });
    await expect(
      fixture.nutrientStorage.listReferableContents("seed_1"),
    ).resolves.toEqual(beforeNutrients);
    await expect(fixture.geneStorage.listInsightsBySeed("seed_1")).resolves.toEqual(
      beforeInsights,
    );
  });
});

async function createResourceFixture(): Promise<{
  geneStorage: InMemoryGeneStorageAdapter;
  geneContentAccess: InMemoryGeneMarkdownContentAccessAdapter;
  nutrientStorage: InMemoryNutrientStorageAdapter;
  nutrientContentAccess: InMemoryNutrientMarkdownContentAccessAdapter;
}> {
  const geneStorage = new InMemoryGeneStorageAdapter();
  const geneContentAccess = new InMemoryGeneMarkdownContentAccessAdapter();
  const nutrientStorage = new InMemoryNutrientStorageAdapter();
  const nutrientContentAccess = new InMemoryNutrientMarkdownContentAccessAdapter();
  const timestamp = "2026-01-01T00:00:00.000Z";

  await createNutrientLibrary(nutrientStorage, {
    id: "library_public",
    name: "Public library",
    scope: NUTRIENT_LIBRARY_SCOPES.public,
    seedId: null,
  });
  await createNutrientLibrary(nutrientStorage, {
    id: "library_seed",
    name: "Seed library",
    scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
    seedId: "seed_1",
  });
  await createNutrientLibrary(nutrientStorage, {
    id: "library_other",
    name: "Other seed library",
    scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
    seedId: "seed_2",
  });
  await createNutrientLibrary(nutrientStorage, {
    id: "library_archived",
    name: "Archived library",
    scope: NUTRIENT_LIBRARY_SCOPES.public,
    seedId: null,
    archiveState: NUTRIENT_ARCHIVE_STATES.archived,
  });

  await createNutrientContent({
    nutrientStorage,
    nutrientContentAccess,
    contentId: "nutrient_public",
    libraryId: "library_public",
    libraryScope: NUTRIENT_LIBRARY_SCOPES.public,
    seedId: null,
    title: "Public guide",
    markdown: "Public nutrient markdown",
  });
  await createNutrientContent({
    nutrientStorage,
    nutrientContentAccess,
    contentId: "nutrient_seed",
    libraryId: "library_seed",
    libraryScope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
    seedId: "seed_1",
    title: "Seed scoped guide",
    markdown: "Seed scoped nutrient markdown",
  });
  await createNutrientContent({
    nutrientStorage,
    nutrientContentAccess,
    contentId: "nutrient_other",
    libraryId: "library_other",
    libraryScope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
    seedId: "seed_2",
    title: "Other seed guide",
    markdown: "Other seed markdown",
  });
  await createNutrientContent({
    nutrientStorage,
    nutrientContentAccess,
    contentId: "nutrient_archived_content",
    libraryId: "library_public",
    libraryScope: NUTRIENT_LIBRARY_SCOPES.public,
    seedId: null,
    title: "Archived content",
    markdown: "Archived content markdown",
    archiveState: NUTRIENT_ARCHIVE_STATES.archived,
  });
  await createNutrientContent({
    nutrientStorage,
    nutrientContentAccess,
    contentId: "nutrient_archived_library",
    libraryId: "library_archived",
    libraryScope: NUTRIENT_LIBRARY_SCOPES.public,
    seedId: null,
    title: "Archived library content",
    markdown: "Archived library markdown",
  });

  const geneLocation = await geneContentAccess.createGeneInsightMarkdown({
    seedId: "seed_1",
    insightId: "gene_1",
    markdown: "Gene markdown",
  });
  await geneStorage.createInsight({
    id: "gene_1",
    seedId: "seed_1",
    suggestionId: null,
    status: GENE_INSIGHT_STATUSES.active,
    title: "Gene guide",
    lineage: "lineage",
    niche: "niche",
    contentLocation: geneLocation,
    evidenceSources: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
  });

  return {
    geneStorage,
    geneContentAccess,
    nutrientStorage,
    nutrientContentAccess,
  };
}

async function createNutrientLibrary(
  storage: InMemoryNutrientStorageAdapter,
  input: {
    id: string;
    name: string;
    scope: (typeof NUTRIENT_LIBRARY_SCOPES)[keyof typeof NUTRIENT_LIBRARY_SCOPES];
    seedId: string | null;
    archiveState?: (typeof NUTRIENT_ARCHIVE_STATES)[keyof typeof NUTRIENT_ARCHIVE_STATES];
  },
): Promise<void> {
  await storage.createLibrary({
    id: input.id,
    name: input.name,
    description: "",
    scope: input.scope,
    seedId: input.seedId,
    archiveState: input.archiveState ?? NUTRIENT_ARCHIVE_STATES.active,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt:
      input.archiveState === NUTRIENT_ARCHIVE_STATES.archived
        ? "2026-01-01T00:00:00.000Z"
        : null,
  });
}

async function createNutrientContent(input: {
  nutrientStorage: InMemoryNutrientStorageAdapter;
  nutrientContentAccess: InMemoryNutrientMarkdownContentAccessAdapter;
  contentId: string;
  libraryId: string;
  libraryScope: (typeof NUTRIENT_LIBRARY_SCOPES)[keyof typeof NUTRIENT_LIBRARY_SCOPES];
  seedId: string | null;
  title: string;
  markdown: string;
  archiveState?: (typeof NUTRIENT_ARCHIVE_STATES)[keyof typeof NUTRIENT_ARCHIVE_STATES];
}): Promise<void> {
  const contentLocation =
    await input.nutrientContentAccess.createNutrientMarkdown({
      contentId: input.contentId,
      libraryScope: input.libraryScope,
      seedId: input.seedId,
      markdown: input.markdown,
    });
  await input.nutrientStorage.createContent({
    id: input.contentId,
    libraryId: input.libraryId,
    title: input.title,
    archiveState: input.archiveState ?? NUTRIENT_ARCHIVE_STATES.active,
    contentLocation,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt:
      input.archiveState === NUTRIENT_ARCHIVE_STATES.archived
        ? "2026-01-01T00:00:00.000Z"
        : null,
  });
}
