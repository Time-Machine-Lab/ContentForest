import { describe, expect, it } from "vitest";
import {
  BrowserResearchProvider,
  NetworkProviderRouter,
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
    expect(plan.queries.join("\n")).toContain("AI产品宣传");
    expect(plan.queries.join("\n")).not.toContain("OpenPlane");
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
    });
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

    expect(output.content).toMatchObject({
      mode: "research",
      failures: [{ providerName: "broken", reason: "missing api key" }],
    });
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
