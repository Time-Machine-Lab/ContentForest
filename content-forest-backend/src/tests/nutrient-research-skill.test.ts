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
      "candidate_lead 只代表候选线索",
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
    expect(prompt).toContain("不得基于这些内容编造帖子、作者或互动数据");
  });

  it("passes requested Xiaohongshu result ranges through to network research", async () => {
    const skill = new NutrientResearchSkill();
    const tools = new FakeTools();
    const llm = new SequenceLlm([
      JSON.stringify({
        type: "nutrient_research_result",
        message: "已基于小红书实采结果整理。",
        depositableBlocks: [],
      }),
    ]);

    await skill.execute({
      context: {
        taskId: "agent-task_1",
        taskType: "nutrient_research",
        input: {
          seedId: "seed_1",
          message: "使用 “独立开发者AI项目\"关键词获取小红书10~15条帖子，并返回帖子原内容",
          recentMessages: [],
        },
        metadata: {},
        startedAt: "2026-01-01T00:00:00.000Z",
      },
      tools,
      llm,
      trace: new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z")),
    });

    expect(tools.calls[0]).toMatchObject({
      name: NETWORKED_RESEARCH_TOOL_NAME,
      input: {
        maxResults: 15,
      },
    });
  });

  it("preserves Xiaohongshu raw post cases instead of summarizing them", async () => {
    const skill = new NutrientResearchSkill();
    const tools: ToolCaller = {
      async callTool(name, input) {
        if (name !== NETWORKED_RESEARCH_TOOL_NAME) {
          throw new Error(`unknown tool: ${name}`);
        }
        expect(input).toMatchObject({ maxResults: 15 });
        return {
          content: {
            mode: "research",
            queryPlan: {
              contentObject: "独立开发者AI项目",
              queries: ["小红书 独立开发者AI项目"],
              siteSearchQueries: [],
            },
            results: [{
              platformItemId: "note_1",
              title: "独立开发六个月，1w+用户达成啦",
              url: "https://www.xiaohongshu.com/explore/note_1",
              author: { id: "user_1", name: "2kk" },
              coverUrl: "https://img.example.com/cover.jpg",
              rawExcerpt: "从0到10000，花了足足6个月的时间。\n原帖第二段。",
              snippet: "从0到10000，花了足足6个月的时间。",
              publishedAt: "2026-01-01T00:00:00.000Z",
              engagement: { likes: 1707, favorites: 1131, comments: 272, shares: 304 },
              providerName: "xiaohongshu_cli",
              resultQuality: "complete_observed_case",
            }],
            failures: [],
            restrictedStatuses: [],
            trace: {
              queryPlan: { queryCount: 1, siteSearchQueryCount: 0, targetPlatform: "小红书", intent: "platform_cases" },
              initialSearch: { providers: ["xiaohongshu_cli"], resultCount: 1, failureCount: 0 },
              deepExploration: { triggered: false, reason: null, providers: [], resultCount: 0, restrictedCount: 0 },
            },
          },
        };
      },
    };
    const llm = new SequenceLlm([
      JSON.stringify({
        type: "nutrient_research_result",
        message: "should not be used",
        depositableBlocks: [],
      }),
    ]);

    const output = await skill.execute({
      context: {
        taskId: "agent-task_1",
        taskType: "nutrient_research",
        input: {
          seedId: "seed_1",
          message: "使用 “独立开发者AI项目\"关键词获取小红书10~15条帖子，并返回帖子原内容，将这些数据作为营养数据",
          recentMessages: [],
        },
        metadata: {},
        startedAt: "2026-01-01T00:00:00.000Z",
      },
      tools,
      llm,
      trace: new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z")),
    });

    expect(llm.inputs).toHaveLength(0);
    const content = output.content as {
      depositableBlocks: Array<{ title: string; markdown: string }>;
    };
    expect(content.depositableBlocks).toHaveLength(1);
    expect(content.depositableBlocks[0]?.title).toContain("案例库");
    expect(content.depositableBlocks[0]?.markdown).toContain("note_1");
    expect(content.depositableBlocks[0]?.markdown).toContain("https://img.example.com/cover.jpg");
    expect(content.depositableBlocks[0]?.markdown).toContain("1707");
    expect(content.depositableBlocks[0]?.markdown).toContain("1131");
    expect(content.depositableBlocks[0]?.markdown).toContain("272");
    expect(content.depositableBlocks[0]?.markdown).toContain("304");
    expect(content.depositableBlocks[0]?.markdown).toContain("从0到10000，花了足足6个月的时间。");
  });

  it("splits requested raw cases and success factors into separate nutrient categories", async () => {
    const skill = new NutrientResearchSkill();
    const tools: ToolCaller = {
      async callTool(name) {
        if (name !== NETWORKED_RESEARCH_TOOL_NAME) {
          throw new Error(`unknown tool: ${name}`);
        }
        return {
          content: {
            mode: "research",
            queryPlan: {
              contentObject: "AI产品",
              queries: ["小红书 AI产品 爆款案例"],
              siteSearchQueries: [],
            },
            results: [
              {
                platformItemId: "note_1",
                title: "独立开发六个月，2w+用户达成",
                url: "https://www.xiaohongshu.com/explore/note_1",
                author: { id: "user_1", name: "2kk" },
                coverUrl: "https://img.example.com/cover-1.jpg",
                rawExcerpt: "从0到20000用户，记录用AI做产品的全过程，包含Cursor、Claude和推广复盘。",
                snippet: "从0到20000用户，记录用AI做产品的全过程。",
                engagement: { likes: 1707, favorites: 1131, comments: 272, shares: 304 },
                providerName: "xiaohongshu_cli",
                platform: "小红书",
                source: "小红书",
                resultQuality: "complete_observed_case",
              },
              {
                platformItemId: "note_2",
                title: "你们用 Vibe Coding 做出了什么项目？",
                url: "https://www.xiaohongshu.com/explore/note_2",
                author: { id: "user_2", name: "产品猫" },
                coverUrl: "https://img.example.com/cover-2.jpg",
                rawExcerpt: "大家用 Vibe Coding 都做出过什么项目？评论区分享一下真实案例。",
                snippet: "大家用 Vibe Coding 都做出过什么项目？",
                engagement: { likes: 3579, favorites: 4172, comments: 877, shares: 1153 },
                providerName: "xiaohongshu_cli",
                platform: "小红书",
                source: "小红书",
                resultQuality: "complete_observed_case",
              },
            ],
            failures: [],
            restrictedStatuses: [],
            trace: {
              queryPlan: { queryCount: 1, siteSearchQueryCount: 0, targetPlatform: "小红书", intent: "platform_cases" },
              initialSearch: { providers: ["xiaohongshu_cli"], resultCount: 2, failureCount: 0 },
              deepExploration: { triggered: false, reason: null, providers: [], resultCount: 0, restrictedCount: 0 },
            },
          },
        };
      },
    };
    const llm = new SequenceLlm([
      JSON.stringify({
        type: "nutrient_research_result",
        message: "should not be used",
        depositableBlocks: [],
      }),
    ]);

    const output = await skill.execute({
      context: {
        taskId: "agent-task_1",
        taskType: "nutrient_research",
        input: {
          seedId: "seed_1",
          message: "查看小红书10个爆款帖子，返回帖子原内容以及总结爆款条件",
          recentMessages: [],
        },
        metadata: {},
        startedAt: "2026-01-01T00:00:00.000Z",
      },
      tools,
      llm,
      trace: new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z")),
    });

    expect(llm.inputs).toHaveLength(0);
    const content = output.content as {
      depositableBlocks: Array<{ title: string; markdown: string }>;
    };
    expect(content.depositableBlocks).toHaveLength(2);
    expect(content.depositableBlocks[0]?.title).toContain("案例库");
    expect(content.depositableBlocks[1]?.title).toContain("爆款关键因素");
    expect(content.depositableBlocks[0]?.markdown).toContain("从0到20000用户");
    expect(content.depositableBlocks[0]?.markdown).toContain("https://img.example.com/cover-1.jpg");
    expect(content.depositableBlocks[1]?.markdown).toContain("note_1");
    expect(content.depositableBlocks[1]?.markdown).toContain("note_2");
    expect(content.depositableBlocks[1]?.markdown).toContain("具体结果先行");
  });

  it("keeps TikHub platform evidence distinct from Codex deep research in nutrient output", async () => {
    const skill = new NutrientResearchSkill();
    const tools: ToolCaller = {
      async callTool(name) {
        if (name !== NETWORKED_RESEARCH_TOOL_NAME) {
          throw new Error(`unknown tool: ${name}`);
        }
        return {
          content: {
            mode: "research",
            queryPlan: {
              contentObject: "AI product",
              queries: ["Twitter AI product"],
              siteSearchQueries: [],
            },
            results: [{
              platformItemId: "tweet_1",
              title: "Launching an AI product",
              url: "https://x.com/maker/status/tweet_1",
              author: { id: "user_1", name: "Maker" },
              rawExcerpt: "Launching an AI product for independent makers. Full details in the thread.",
              snippet: "Launching an AI product for independent makers.",
              engagement: { likes: 42, comments: 3, retweets: 5, quotes: 1, views: 900 },
              providerName: "tikhub_mcp_platform",
              platform: "Twitter/X",
              source: "Twitter/X",
              resultQuality: "complete_observed_case",
            }, {
              platformItemId: null,
              title: "Codex background",
              url: "https://example.com/background",
              author: {},
              rawExcerpt: "Market background only.",
              snippet: "Market background only.",
              engagement: {},
              providerName: "codex_external_research",
              platform: "Twitter/X",
              source: "Codex external research",
              resultQuality: "candidate_lead",
            }],
            failures: [],
            restrictedStatuses: [],
            trace: {
              queryPlan: { queryCount: 1, siteSearchQueryCount: 0, targetPlatform: "X", intent: "platform_cases" },
              initialSearch: { providers: ["tikhub_mcp_platform"], resultCount: 1, failureCount: 0 },
              deepExploration: { triggered: true, reason: "requested_deep_exploration", providers: ["codex_external_research"], resultCount: 1, restrictedCount: 0 },
            },
          },
        };
      },
    };
    const llm = new SequenceLlm([
      JSON.stringify({
        type: "nutrient_research_result",
        message: "should not be used",
        depositableBlocks: [],
      }),
    ]);

    const output = await skill.execute({
      context: {
        taskId: "agent-task_1",
        taskType: "nutrient_research",
        input: {
          seedId: "seed_1",
          message: "收集 Twitter AI product 帖子详情和帖子数据",
          recentMessages: [],
        },
        metadata: {},
        startedAt: "2026-01-01T00:00:00.000Z",
      },
      tools,
      llm,
      trace: new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z")),
    });

    expect(llm.inputs).toHaveLength(0);
    const content = output.content as {
      depositableBlocks: Array<{ title: string; markdown: string }>;
    };
    expect(content.depositableBlocks).toHaveLength(1);
    expect(content.depositableBlocks[0]?.title).toContain("Twitter/X原帖案例库");
    expect(content.depositableBlocks[0]?.markdown).toContain("tweet_1");
    expect(content.depositableBlocks[0]?.markdown).toContain("转发 5");
    expect(content.depositableBlocks[0]?.markdown).toContain("浏览 900");
    expect(content.depositableBlocks[0]?.markdown).not.toContain("Codex background");
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
