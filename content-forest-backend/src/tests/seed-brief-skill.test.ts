import { describe, expect, it } from "vitest";
import { AgentTrace } from "../agent/runtime/agent-trace.js";
import { FakeLlmAdapter } from "../agent/runtime/fake-llm-adapter.js";
import { SeedBriefSkill } from "../agent/skills/seed-brief-skill.js";

describe("SeedBriefSkill", () => {
  it("removes think blocks from generated markdown", async () => {
    const skill = new SeedBriefSkill();

    const output = await skill.execute({
      context: {
        taskId: "agent-task_1",
        taskType: "seed_brief",
        input: {
          seedId: "seed_1",
          seedTitle: "测试种子",
          seedMarkdown: "# 种子正文",
        },
        metadata: {},
        startedAt: "2026-01-01T00:00:00.000Z",
      },
      tools: {
        async callTool() {
          throw new Error("no tools expected");
        },
      },
      llm: new FakeLlmAdapter("<think>内部分析</think>\n# 种子简报\n\n正文"),
      trace: new AgentTrace(() => new Date("2026-01-01T00:00:01.000Z")),
    });

    expect(output).toMatchObject({
      taskType: "seed_brief",
      content: {
        markdown: "# 种子简报\n\n正文",
      },
    });
    expect(JSON.stringify(output)).not.toContain("<think>");
  });
});
