import { describe, expect, it } from "vitest";
import { InMemoryGeneratorSkillContentAccessAdapter } from "../content-access/adapters/in-memory-generator-skill-content-access-adapter.js";
import { GENERATOR_ENABLE_STATES } from "../modules/generator/domain/generator-types.js";
import { InMemoryGeneratorStorageAdapter } from "../storage/adapters/in-memory-generator-storage-adapter.js";
import { ReadGeneratorSkillTool } from "../agent/tools/read-generator-skill-tool.js";
import { ExecuteGeneratorScriptTool } from "../agent/tools/execute-generator-script-tool.js";
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
