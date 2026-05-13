import { describe, expect, it } from "vitest";
import {
  BrowserResearchProvider,
  ConfiguredSearchApiProvider,
  NetworkProviderRouter,
  PublicWebSearchProvider,
  planNetworkResearch,
  type BrowserCli,
  type NetworkProvider,
} from "../agent/networked-research/index.js";
import { NetworkedResearchTool } from "../agent/tools/networked-research-tool.js";
import type { AgentTaskContext } from "../agent/runtime/agent-task.js";

const context: AgentTaskContext = {
  taskId: "agent-task_1",
  taskType: "nutrient_research",
  input: {},
  metadata: {},
  startedAt: "2026-01-01T00:00:00.000Z",
};

describe("networked research module", () => {
  it("plans platform research without blindly prefixing seed title", () => {
    const plan = planNetworkResearch({
      mode: "research",
      request: "搜索关于小红书爆款的AI产品宣传的帖子，5~10篇",
      seedTitle: "OpenPlane / 创境",
    });

    expect(plan.targetPlatform).toBe("小红书");
    expect(plan.queries).toHaveLength(4);
    expect(plan.siteSearchQueries.length).toBeGreaterThan(0);
    expect(plan.queries.join("\n")).toContain("AI产品宣传");
    expect(plan.queries.join("\n")).not.toContain("找几篇");
    expect(plan.queries.join("\n")).not.toContain("OpenPlane");
  });

  it("cleans task noise from Xiaohongshu case research queries", () => {
    const plan = planNetworkResearch({
      mode: "research",
      request: "找几篇小红书AI产品相关的爆款文章案例 5~10篇，保留案例，并梳理出爆款核心",
    });

    expect(plan.targetPlatform).toBe("小红书");
    expect(plan.expectedResultCount).toBe(10);
    expect(plan.requestedDeepExploration).toBe(true);
    expect(plan.queries.join("\n")).toContain("AI产品");
    expect(plan.queries.join("\n")).toContain("爆款");
    expect(plan.queries.join("\n")).not.toContain("找几篇");
    expect(plan.queries.join("\n")).not.toContain("保留案例");
    expect(plan.queries.join("\n")).not.toContain("梳理");
  });

  it("keeps platform and topic when cleaning longer Xiaohongshu research instructions", () => {
    const plan = planNetworkResearch({
      mode: "research",
      request: "搜索小红书关于AI产品宣传的爆款文章，从各种方向考察，挑选5~10篇。作为爆款文章案例并总结出相应的规则",
    });

    expect(plan.targetPlatform).toBe("小红书");
    expect(plan.intent).toBe("platform_cases");
    expect(plan.expectedResultCount).toBe(10);
    expect(plan.contentObject).toContain("AI产品宣传");
    expect(plan.contentObject).toContain("爆款文章");
    expect(plan.contentObject).not.toContain("各种方向考察");
    expect(plan.contentObject).not.toMatch(/\s并\s|^并$|^并\s|\s并$/u);
    expect(plan.queries.join("\n")).toContain("小红书");
  });

  it("routes research, normalizes, dedupes, and sorts results", async () => {
    const provider: NetworkProvider = {
      name: "fake_platform",
      canResearch: () => true,
      async research() {
        return [
          {
            title: "高互动案例",
            url: "https://example.com/a",
            snippet: "真实场景和可收藏清单",
            engagement: { likes: 2000, favorites: 300 },
            providerName: "fake_platform",
          },
          {
            title: "重复案例",
            url: "https://example.com/a",
            snippet: "较弱摘要",
            engagement: { likes: 1 },
            providerName: "fake_platform",
          },
        ];
      },
      canObserve: () => false,
    };
    const router = new NetworkProviderRouter({
      providers: [provider],
      now: () => new Date("2026-05-13T00:00:00.000Z"),
    });

    const result = await router.run({
      mode: "research",
      request: "小红书 AI 产品宣传 爆款",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      title: "高互动案例",
      url: "https://example.com/a",
      providerName: "fake_platform",
      resultQuality: "candidate_lead",
      phase: "initial_search",
    });
  });

  it("normalizes configured search API results as candidate leads", async () => {
    const provider = new ConfiguredSearchApiProvider({
      provider: "brave",
      apiKey: "test-key",
      fetchImpl: async () => new Response(JSON.stringify({
        web: {
          results: [{
            title: "小红书 AI 产品案例",
            url: "https://www.xiaohongshu.com/explore/abc",
            description: "一个候选搜索结果摘要",
          }],
        },
      }), { status: 200 }),
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "小红书 AI 产品爆款案例",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.results[0]).toMatchObject({
      title: "小红书 AI 产品案例",
      resultQuality: "candidate_lead",
      phase: "initial_search",
    });
  });

  it("uses public web search as a no-key initial search fallback", async () => {
    const provider = new PublicWebSearchProvider({
      fetchImpl: async () => new Response(`
        <div class="result">
          <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fxhs-ai">小红书 AI 产品爆款案例</a>
          <a class="result__snippet">拆解 AI 产品在小红书的标题、封面和种草表达。</a>
        </div>
      `, { status: 200 }),
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "搜索小红书关于AI产品宣传的爆款文章",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.results[0]).toMatchObject({
      title: "小红书 AI 产品爆款案例",
      url: "https://example.com/xhs-ai",
      providerName: "public_web_search",
      resultQuality: "candidate_lead",
    });
  });

  it("falls back to Sogou when DuckDuckGo public search fails", async () => {
    const provider = new PublicWebSearchProvider({
      fetchImpl: async (url) => {
        if (String(url).includes("duckduckgo")) {
          throw new Error("fetch failed");
        }
        return new Response(`
          <div class="vrwrap">
            <h3 class="vr-title"><a href="/link?url=abc"><em><!--red_beg-->AI<!--red_end--></em>生成小红书爆款种草文案</a></h3>
            <div class="fz-mid space-txt">用AI写出爆款种草文案，提高工作效率。</div>
          </div>
        `, { status: 200 });
      },
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "小红书 AI 产品爆款案例",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.results[0]).toMatchObject({
      providerName: "public_web_search",
      source: "Sogou Web",
    });
    expect(result.results[0]?.title).toContain("小红书爆款种草文案");
  });

  it("returns a structured missing key failure for configured search providers", async () => {
    const provider = new ConfiguredSearchApiProvider({
      provider: "brave",
      apiKey: "",
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "研究 AI 产品内容",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerName: "search_api_brave",
          code: "missing_api_key",
          phase: "initial_search",
        }),
      ]),
    );
  });

  it("routes research using the platform inferred by the query planner", async () => {
    let routedPlatform: string | undefined;
    const provider: NetworkProvider = {
      name: "platform_sensitive",
      canResearch: (request) => request.targetPlatform === "TikTok",
      async research(request, plan) {
        routedPlatform = request.targetPlatform;
        return [{
          title: "TikTok AI product case",
          url: "https://example.com/tiktok-ai",
          snippet: `plan:${plan.targetPlatform}`,
          providerName: "platform_sensitive",
        }];
      },
      canObserve: () => false,
    };
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "Find TikTok AI product promotion viral cases",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(routedPlatform).toBe("TikTok");
    expect(result.results).toHaveLength(1);
  });

  it("uses agent-browser sessions and extracts visible observation metrics", async () => {
    const cli = new RecordingCli("点赞 1.2万 收藏 300 评论 42 播放 8万");
    const provider = new BrowserResearchProvider({
      cli,
      allowedDomains: ["xiaohongshu.com"],
      pool: undefined,
    });

    const observation = await provider.observe?.({
      mode: "observe",
      url: "https://www.xiaohongshu.com/explore/abc",
      platform: "小红书",
    });

    expect(cli.calls[0]?.args).toContain("--session");
    expect(cli.calls[0]?.args.join(" ")).toContain("network-observe");
    expect(observation).toMatchObject({
      accessStatus: "accessible",
      metrics: {
        likes: 12000,
        favorites: 300,
        comments: 42,
        views: 80000,
      },
    });
  });

  it("uses Xiaohongshu browser strategy for deep exploration instead of Bing search UI", async () => {
    const cli = new RecordingCli("小红书 搜索 AI产品 爆款 笔记 点赞 1万 收藏 200 评论 50");
    const provider = new BrowserResearchProvider({
      cli,
      allowedDomains: ["xiaohongshu.com"],
    });
    const router = new NetworkProviderRouter({
      providers: [provider],
      now: () => new Date("2026-05-13T00:00:00.000Z"),
    });

    const result = await router.run({
      mode: "research",
      request: "找几篇小红书AI产品相关的爆款文章案例 5~10篇，保留案例，并梳理出爆款核心",
    });

    const openCall = cli.calls.find((call) => call.args.includes("open"));
    expect(openCall?.args.join(" ")).toContain("xiaohongshu.com");
    expect(openCall?.args.join(" ")).not.toContain("bing.com");
    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.results[0]).toMatchObject({
      source: "小红书站内观察",
      resultQuality: "observed_case",
      phase: "deep_exploration",
    });
  });

  it("reports captcha pages as restricted statuses instead of research results", async () => {
    const cli = new RecordingCli("请解决以下难题以继续 Cloudflare 请验证您是真人");
    const provider = new BrowserResearchProvider({
      cli,
      allowedDomains: ["xiaohongshu.com"],
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "小红书 AI 产品真实案例",
      deepExploration: true,
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.results).toHaveLength(0);
    expect(result.restrictedStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "restricted_by_captcha",
          phase: "deep_exploration",
        }),
      ]),
    );
  });

  it("reports Xiaohongshu safety limit pages as restricted statuses", async () => {
    const cli = new RecordingCli("安全限制 IP存在风险，请切换可靠网络环境后重试 300012");
    const provider = new BrowserResearchProvider({
      cli,
      allowedDomains: ["xiaohongshu.com", "*.xiaohongshu.com"],
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "小红书 AI 产品真实案例",
      deepExploration: true,
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.restrictedStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "access_denied",
          phase: "deep_exploration",
        }),
      ]),
    );
  });

  it("falls back to snapshot when browser open times out after partial navigation", async () => {
    const cli = new OpenFailsSnapshotSucceedsCli("安全限制 IP存在风险，请切换可靠网络环境后重试 300012");
    const provider = new BrowserResearchProvider({
      cli,
      allowedDomains: ["xiaohongshu.com", "*.xiaohongshu.com"],
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "小红书 AI 产品真实案例",
      deepExploration: true,
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.failures).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phase: "deep_exploration" }),
      ]),
    );
    expect(result.restrictedStatuses[0]).toMatchObject({
      code: "access_denied",
      providerName: "xiaohongshu_browser_strategy",
    });
  });

  it("rejects browser access outside allowed domains", async () => {
    const provider = new BrowserResearchProvider({
      cli: new RecordingCli(""),
      allowedDomains: ["xiaohongshu.com"],
    });

    await expect(
      provider.observe?.({
        mode: "observe",
        url: "https://example.com/post",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("returns readable browser provider failures when CLI is unavailable", async () => {
    const provider = new BrowserResearchProvider({
      cli: {
        async run() {
          throw new Error("agent-browser command not found");
        },
      },
      allowedDomains: ["xiaohongshu.com"],
    });

    await expect(
      provider.observe?.({
        mode: "observe",
        url: "https://www.xiaohongshu.com/explore/abc",
      }),
    ).rejects.toThrow("agent-browser command not found");
  });

  it("returns readable provider failures through the networked research tool", async () => {
    const provider: NetworkProvider = {
      name: "broken",
      canResearch: () => true,
      async research() {
        throw new Error("missing api key");
      },
      canObserve: () => false,
    };
    const tool = new NetworkedResearchTool(
      new NetworkProviderRouter({ providers: [provider] }),
    );

    const output = await tool.execute(
      { mode: "research", request: "研究小红书 AI 产品内容" },
      context,
    );

    expect(output.content).toMatchObject({ mode: "research" });
    expect((output.content as { failures: unknown[] }).failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerName: "broken", reason: "missing api key" }),
      ]),
    );
  });
});

class RecordingCli implements BrowserCli {
  public readonly calls: Array<{ args: string[]; timeoutMs: number }> = [];

  public constructor(private readonly snapshot: string) {}

  public async run(args: string[], timeoutMs: number): Promise<string> {
    this.calls.push({ args, timeoutMs });
    return args.includes("snapshot") ? this.snapshot : "";
  }
}

class OpenFailsSnapshotSucceedsCli implements BrowserCli {
  public constructor(private readonly snapshot: string) {}

  public async run(args: string[], _timeoutMs: number): Promise<string> {
    if (args.includes("open")) {
      throw new Error("Command timed out after 30000ms");
    }
    return this.snapshot;
  }
}
