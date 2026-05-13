import { describe, expect, it } from "vitest";
import { NutrientResearchSkill } from "../agent/skills/nutrient-research-skill.js";
import { NETWORKED_RESEARCH_TOOL_NAME } from "../agent/tools/networked-research-tool.js";
import { AgentTrace } from "../agent/runtime/agent-trace.js";
import type {
  LlmAdapter,
  LlmCompletionInput,
  LlmCompletionResult,
} from "../agent/runtime/llm-adapter.js";
import type { ToolCaller, ToolInput, ToolOutput } from "../agent/runtime/tool-contract.js";

class SequenceLlm implements LlmAdapter {
  public readonly inputs: LlmCompletionInput[] = [];

  public constructor(private readonly responses: string[]) {}

  public async complete(input: LlmCompletionInput): Promise<LlmCompletionResult> {
    this.inputs.push(input);
    return {
      content: this.responses.shift() ?? "{}",
    };
  }
}

class FakeTools implements ToolCaller {
  public readonly calls: Array<{ name: string; input: ToolInput }> = [];

  public async callTool(name: string, input: ToolInput): Promise<ToolOutput> {
    this.calls.push({ name, input });
    if (name !== NETWORKED_RESEARCH_TOOL_NAME) {
      throw new Error(`unknown tool: ${name}`);
    }
    return {
      content: {
        mode: "research",
        queryPlan: {
          queries: ["小红书壁纸案例"],
        },
        results: [
          {
            title: "小红书壁纸案例",
            url: "https://example.com",
            snippet: "壁纸内容常用情绪化场景和封面前后对比。",
          },
        ],
        failures: [],
      },
    };
  }
}

describe("NutrientResearchSkill", () => {
  it("searches the web and returns structured research output", async () => {
    const skill = new NutrientResearchSkill();
    const tools = new FakeTools();
    const trace = new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z"));
    const llm = new SequenceLlm([
      JSON.stringify({
        type: "nutrient_research_result",
        message: "我找到了壁纸号可以沉淀的两个方向。",
        depositableBlocks: [
          {
            title: "壁纸号情绪场景",
            markdown: "用晚安、通勤、独处等场景包装壁纸价值。",
          },
        ],
      }),
    ]);

    const output = await skill.execute({
      context: {
        taskId: "agent-task_1",
        taskType: "nutrient_research",
        input: {
          seedId: "seed_1",
          seedTitle: "壁纸项目",
          message: "小红书壁纸内容怎么做",
          recentMessages: [],
        },
        metadata: {},
        startedAt: "2026-01-01T00:00:00.000Z",
      },
      tools,
      llm,
      trace,
    });

    expect(tools.calls[0]).toMatchObject({
      name: NETWORKED_RESEARCH_TOOL_NAME,
      input: {
        mode: "research",
        request: "小红书壁纸内容怎么做",
        seedTitle: "壁纸项目",
      },
    });
    expect(output).toMatchObject({
      taskType: "nutrient_research",
      content: {
        type: "nutrient_research_result",
        message: "我找到了壁纸号可以沉淀的两个方向。",
        depositableBlocks: [
          {
            title: "壁纸号情绪场景",
            markdown: "用晚安、通勤、独处等场景包装壁纸价值。",
          },
        ],
      },
    });
    expect(trace.list().map((event) => event.type)).toContain("skill_progress");
  });

  it("repairs invalid structured output once", async () => {
    const skill = new NutrientResearchSkill();
    const tools = new FakeTools();
    const llm = new SequenceLlm([
      JSON.stringify({ message: "" }),
      JSON.stringify({
        type: "nutrient_research_result",
        message: "已修复。",
        depositableBlocks: [],
      }),
    ]);

    const output = await skill.execute({
      context: {
        taskId: "agent-task_1",
        taskType: "nutrient_research",
        input: {
          seedId: "seed_1",
          message: "研究一下",
        },
        metadata: {},
        startedAt: "2026-01-01T00:00:00.000Z",
      },
      tools,
      llm,
      trace: new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z")),
    });

    expect(llm.inputs).toHaveLength(2);
    expect(output.content).toMatchObject({ message: "已修复。" });
  });
});
