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
          siteSearchQueries: ["壁纸 案例"],
        },
        results: [
          {
            title: "小红书壁纸案例",
            url: "https://example.com",
            snippet: "壁纸内容常用情绪化场景和封面前后对比。",
            resultQuality: "candidate_lead",
          },
        ],
        failures: [],
        restrictedStatuses: [],
        trace: {
          queryPlan: {
            queryCount: 1,
            siteSearchQueryCount: 1,
            targetPlatform: "小红书",
            intent: "platform_cases",
          },
          initialSearch: {
            providers: ["fake"],
            resultCount: 1,
            failureCount: 0,
          },
          deepExploration: {
            triggered: false,
            reason: null,
            providers: [],
            resultCount: 0,
            restrictedCount: 0,
          },
        },
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
    expect(llm.inputs[0]?.messages.map((message) => message.content).join("\n")).toContain(
      "candidate_lead 只代表搜索候选线索",
    );
  });

  it("keeps restricted network research limitations visible to the LLM", async () => {
    const skill = new NutrientResearchSkill();
    const tools: ToolCaller = {
      async callTool() {
        return {
          content: {
            mode: "research",
            queryPlan: {
              queries: ["小红书 AI 产品案例"],
              siteSearchQueries: ["AI 产品 案例"],
            },
            results: [],
            failures: [],
            restrictedStatuses: [{
              code: "restricted_by_captcha",
              reason: "页面触发验证码或真人验证，不能作为有效研究结果",
              phase: "deep_exploration",
              providerName: "xiaohongshu_browser_strategy",
              platform: "小红书",
            }],
            trace: {
              queryPlan: {
                queryCount: 1,
                siteSearchQueryCount: 1,
                targetPlatform: "小红书",
                intent: "platform_cases",
              },
              initialSearch: {
                providers: [],
                resultCount: 0,
                failureCount: 0,
              },
              deepExploration: {
                triggered: true,
                reason: "requested_deep_exploration",
                providers: ["agent_browser"],
                resultCount: 0,
                restrictedCount: 1,
              },
            },
          },
        };
      },
    };
    const llm = new SequenceLlm([
      JSON.stringify({
        type: "nutrient_research_result",
        message: "这次搜索被验证码限制，暂时不能确认真实案例。",
        depositableBlocks: [],
      }),
    ]);

    const output = await skill.execute({
      context: {
        taskId: "agent-task_1",
        taskType: "nutrient_research",
        input: {
          seedId: "seed_1",
          message: "找小红书 AI 产品真实案例",
        },
        metadata: {},
        startedAt: "2026-01-01T00:00:00.000Z",
      },
      tools,
      llm,
      trace: new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z")),
    });

    expect(output.content).toMatchObject({
      message: "这次搜索被验证码限制，暂时不能确认真实案例。",
    });
    const prompt = llm.inputs[0]?.messages.map((message) => message.content).join("\n") ?? "";
    expect(prompt).toContain("restrictedStatuses");
    expect(prompt).toContain("不得基于这些内容编造案例");
  });

  it("accepts plain conversational replies when no nutrient block is produced", async () => {
    const skill = new NutrientResearchSkill();
    const tools = new FakeTools();
    const llm = new SequenceLlm([
      "<think>Checking provider failures.</think>\nNo reliable platform cases were found this time. Please try a narrower keyword.",
    ]);

    const output = await skill.execute({
      context: {
        taskId: "agent-task_1",
        taskType: "nutrient_research",
        input: {
          seedId: "seed_1",
          message: "Find platform cases",
          recentMessages: [],
        },
        metadata: {},
        startedAt: "2026-01-01T00:00:00.000Z",
      },
      tools,
      llm,
      trace: new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z")),
    });

    expect(llm.inputs).toHaveLength(1);
    expect(output.content).toMatchObject({
      type: "nutrient_research_result",
      message: "No reliable platform cases were found this time. Please try a narrower keyword.",
      depositableBlocks: [],
    });
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
