import { describe, expect, it } from "vitest";
import {
  BrowserResearchProvider,
  CodexExternalResearchProvider,
  NetworkProviderRouter,
  XiaohongshuCliProcessError,
  XiaohongshuCliResearchProvider,
  sanitizeXiaohongshuCliDiagnostic,
  planNetworkResearch,
  type BrowserCli,
  type NetworkProvider,
  type XiaohongshuCliRunOptions,
  type XiaohongshuCliRunResult,
  type XiaohongshuCliRunner,
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
  it("plans platform research and recognizes Xiaohongshu aliases", () => {
    const plan = planNetworkResearch({
      mode: "research",
      request: "用 xhs 搜索 AI产品 5~10条帖子，保留案例并梳理核心",
      seedTitle: "OpenPlane / 创境",
    });

    expect(plan.targetPlatform).toBe("小红书");
    expect(plan.expectedResultCount).toBe(10);
    expect(plan.queries.join("\n")).toContain("AI产品");
    expect(plan.queries.join("\n")).not.toContain("OpenPlane");
    expect(plan.queries.join("\n")).not.toContain("保留案例");
  });

  it("keeps quoted Xiaohongshu keywords clean and honors requested ranges", () => {
    const plan = planNetworkResearch({
      mode: "research",
      request: "使用 “独立开发者AI项目\"关键词获取小红书10~15条帖子，并返回帖子原内容",
    });

    expect(plan.targetPlatform).toBe("小红书");
    expect(plan.contentObject).toBe("独立开发者AI项目");
    expect(plan.expectedResultCount).toBe(15);
    expect(plan.queries[0]).toContain("独立开发者AI项目");
    expect(plan.queries[0]).not.toContain("帖子原内容");
  });

  it("routes research, normalizes evidence fields, dedupes, and sorts results", async () => {
    const provider: NetworkProvider = {
      name: "fake_platform",
      canResearch: () => true,
      async research() {
        return [
          {
            platformItemId: "note_a",
            title: "高互动案例",
            url: "https://example.com/a",
            author: { name: "作者 A" },
            coverUrl: "https://example.com/a.jpg",
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
      platformItemId: "note_a",
      title: "高互动案例",
      author: { name: "作者 A" },
      coverUrl: "https://example.com/a.jpg",
      providerName: "fake_platform",
      resultQuality: "candidate_lead",
      phase: "initial_search",
    });
  });

  it("collects Xiaohongshu search candidates and enriches note details", async () => {
    const runner = new FakeXiaohongshuRunner([
      {
        expectArgs: ["status", "--json"],
        result: envelope({ authenticated: true }),
      },
      {
        expectArgs: ["search", "AI产品", "--json", "--sort", "popular", "--page", "1"],
        result: envelope({
          items: [{
            note_id: "note_1",
            title: "AI 产品试用一天后",
            desc: "搜索列表摘要",
            user: { nickname: "产品体验官" },
            liked_count: "1.2万",
          }],
        }),
      },
      {
        expectArgs: ["read", "note_1", "--json"],
        result: envelope({
          note_id: "note_1",
          title: "AI 产品试用一天后",
          desc: "先写真实使用场景，再给出工具选择理由。",
          user: { user_id: "user_1", nickname: "产品体验官" },
          cover_url: "https://img.example.com/cover.jpg",
          liked_count: "1.2万",
          comment_count: "34",
          collected_count: "560",
          time: "2026-05-01T08:00:00.000Z",
        }),
      },
    ]);
    const provider = new XiaohongshuCliResearchProvider({
      runner,
      defaultSort: "popular",
      maxResults: 5,
      now: () => new Date("2026-05-20T00:00:00.000Z"),
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "搜索小红书 AI产品 1条帖子",
      targetPlatform: "小红书",
      maxResults: 1,
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(runner.calls.map((call) => call.args)).toEqual([
      ["status", "--json"],
      ["search", "AI产品", "--json", "--sort", "popular", "--page", "1"],
      ["read", "note_1", "--json"],
    ]);
    expect(result.results[0]).toMatchObject({
      platformItemId: "note_1",
      title: "AI 产品试用一天后",
      url: "https://www.xiaohongshu.com/explore/note_1",
      author: { id: "user_1", name: "产品体验官" },
      coverUrl: "https://img.example.com/cover.jpg",
      engagement: {
        likes: 12000,
        comments: 34,
        favorites: 560,
      },
      providerName: "xiaohongshu_cli",
      resultQuality: "complete_observed_case",
      evidenceCompleteness: {
        hasPlatformIdOrUrl: true,
        hasTitle: true,
        hasAuthor: true,
        hasBodyOrExcerpt: true,
        hasEngagement: true,
      },
    });
    expect(result.trace.qualityGate).toMatchObject({
      targetResultCount: 1,
      completeObservedCaseCount: 1,
      codexTriggered: false,
    });
  });

  it("reads nested Xiaohongshu note_card details from search ids", async () => {
    const runner = new FakeXiaohongshuRunner([
      {
        expectArgs: ["status", "--json"],
        result: envelope({ authenticated: true }),
      },
      {
        expectArgs: ["search", "独立开发者AI项目", "--json", "--sort", "general", "--page", "1"],
        result: envelope({
          items: [{
            id: "note_nested",
            model_type: "note",
            xsec_token: "search-token",
            note_card: {
              display_title: "独立开发者 AI 项目复盘",
              user: { user_id: "user_nested", nickname: "产品作者" },
              interact_info: {
                liked_count: "1707",
                comment_count: "272",
                collected_count: "1131",
                shared_count: "304",
              },
              cover: { url_default: "https://img.example.com/search-cover.jpg" },
            },
          }],
        }),
      },
      {
        expectArgs: ["read", "note_nested", "--json"],
        result: envelope({
          items: [{
            id: "note_nested",
            note_card: {
              note_id: "note_nested",
              title: "独立开发者 AI 项目复盘",
              desc: "从 0 到 1 做 AI 产品的完整原帖正文。",
              user: { user_id: "user_nested", nickname: "产品作者" },
              interact_info: {
                liked_count: "1707",
                comment_count: "272",
                collected_count: "1131",
                share_count: "304",
              },
              image_list: [{
                info_list: [{ url: "https://img.example.com/detail-cover.jpg" }],
              }],
            },
          }],
        }),
      },
    ]);
    const provider = new XiaohongshuCliResearchProvider({
      runner,
      maxResults: 15,
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "使用 “独立开发者AI项目\"关键词获取小红书10~15条帖子",
      targetPlatform: "小红书",
      maxResults: 1,
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(runner.calls.map((call) => call.args)).toEqual([
      ["status", "--json"],
      ["search", "独立开发者AI项目", "--json", "--sort", "general", "--page", "1"],
      ["read", "note_nested", "--json"],
    ]);
    expect(result.results[0]).toMatchObject({
      platformItemId: "note_nested",
      title: "独立开发者 AI 项目复盘",
      url: "https://www.xiaohongshu.com/explore/note_nested",
      author: { id: "user_nested", name: "产品作者" },
      coverUrl: "https://img.example.com/detail-cover.jpg",
      snippet: "从 0 到 1 做 AI 产品的完整原帖正文。",
      engagement: {
        likes: 1707,
        comments: 272,
        favorites: 1131,
        shares: 304,
      },
      providerName: "xiaohongshu_cli",
      resultQuality: "complete_observed_case",
    });
    expect(result.trace.qualityGate).toMatchObject({
      completeObservedCaseCount: 1,
      codexTriggered: false,
    });
  });

  it("expands Xiaohongshu searches when the exact keyword is too narrow", async () => {
    const runner = new FakeXiaohongshuRunner([
      {
        expectArgs: ["status", "--json"],
        result: envelope({ authenticated: true }),
      },
      {
        expectArgs: ["search", "独立开发者AI项目", "--json", "--sort", "general", "--page", "1"],
        result: envelope({ items: [] }),
      },
      {
        expectArgs: ["search", "独立开发者AI项目 案例", "--json", "--sort", "general", "--page", "1"],
        result: envelope({
          items: [{
            id: "expanded_note",
            note_card: {
              display_title: "AI 产品独立开发案例",
              user: { nickname: "作者A" },
              interact_info: { liked_count: "10", collected_count: "20", comment_count: "3" },
            },
          }],
        }),
      },
      {
        expectArgs: ["read", "expanded_note", "--json"],
        result: envelope({
          items: [{
            id: "expanded_note",
            note_card: {
              title: "AI 产品独立开发案例",
              desc: "保留原帖正文。",
              user: { nickname: "作者A" },
              interact_info: { liked_count: "10", collected_count: "20", comment_count: "3" },
            },
          }],
        }),
      },
    ]);
    const provider = new XiaohongshuCliResearchProvider({ runner, maxResults: 15 });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "使用 “独立开发者AI项目\"关键词获取小红书10~15条帖子",
      targetPlatform: "小红书",
      maxResults: 1,
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.results[0]).toMatchObject({
      platformItemId: "expanded_note",
      title: "AI 产品独立开发案例",
      providerName: "xiaohongshu_cli",
    });
  });

  it("maps Xiaohongshu login restrictions without triggering interactive login", async () => {
    const runner = new FakeXiaohongshuRunner([
      {
        expectArgs: ["status", "--json"],
        result: JSON.stringify({
          ok: false,
          error: {
            code: "not_authenticated",
            message: "cookie expired at C:\\Users\\alice\\.xiaohongshu-cli\\cookies.json",
          },
        }),
      },
    ]);
    const provider = new XiaohongshuCliResearchProvider({ runner });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "小红书 AI 产品案例",
      targetPlatform: "小红书",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.results).toHaveLength(0);
    expect(result.restrictedStatuses[0]).toMatchObject({
      code: "restricted_by_login",
      providerName: "xiaohongshu_cli",
      phase: "initial_search",
    });
    expect(JSON.stringify(result)).not.toContain("alice");
    expect(JSON.stringify(result)).toContain("[redacted-local-path]");
  });

  it("runs Codex only after the coverage gate when Xiaohongshu evidence is insufficient", async () => {
    const xhs = new XiaohongshuCliResearchProvider({
      runner: new FakeXiaohongshuRunner([
        {
          expectArgs: ["status", "--json"],
          result: envelope({ authenticated: true }),
        },
        {
          expectArgs: ["search", "AI产品", "--json", "--sort", "general", "--page", "1"],
          result: envelope({
            items: [{
              note_id: "candidate_1",
              title: "只有搜索列表",
              desc: "没有详情互动",
              user: { nickname: "作者" },
            }],
          }),
        },
        {
          expectArgs: ["read", "candidate_1", "--json"],
          error: new XiaohongshuCliProcessError({
            message: "read failed",
            stdout: JSON.stringify({
              ok: false,
              error: { code: "verification_required", message: "NeedVerify" },
            }),
          }),
        },
      ]),
    });
    const codex = new CodexExternalResearchProvider({
      baseUrl: "http://codex-provider.example/v1",
      apiKey: "sk-codex-secret",
      fetchImpl: async () => jsonResponse(codexResearchResponse({
        summary: "Codex deep research补充了背景和候选方向。",
        items: [{
          title: "Codex candidate",
          url: "https://example.com/candidate",
          snippet: "只能作为候选线索。",
          source: "Web",
          platform: "小红书",
          publishedAt: "",
          observedEvidence: "",
          engagementJson: "",
        }],
      })),
    });
    const router = new NetworkProviderRouter({ providers: [xhs, codex] });

    const result = await router.run({
      mode: "research",
      request: "小红书 AI产品 5条帖子",
      targetPlatform: "小红书",
      maxResults: 5,
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.trace.initialSearch.providers).toEqual(["xiaohongshu_cli"]);
    expect(result.trace.deepExploration).toMatchObject({
      triggered: true,
      reason: "insufficient_complete_observed_cases",
      providers: ["codex_external_research"],
    });
    expect(result.trace.qualityGate).toMatchObject({
      codexTriggered: true,
      codexTriggerReason: "insufficient_complete_observed_cases",
    });
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Codex candidate",
          providerName: "codex_external_research",
          phase: "deep_exploration",
          resultQuality: "candidate_lead",
        }),
      ]),
    );
  });

  it("uses Xiaohongshu CLI and Codex by default without OpenClaw or legacy search providers", async () => {
    const tool = new NetworkedResearchTool(undefined, {
      xiaohongshu: {
        enabled: false,
      },
      CONTENT_FOREST_RESEARCH_PROVIDER: "codex-external-agent",
      CONTENT_FOREST_CODEX_RESEARCH_BASE_URL: "",
      CONTENT_FOREST_CODEX_RESEARCH_API_KEY: "",
    });

    const output = await tool.execute(
      { mode: "research", request: "研究小红书 AI 产品宣传", targetPlatform: "小红书" },
      context,
    );
    const content = output.content as {
      restrictedStatuses: Array<{ providerName: string }>;
      failures: Array<{ providerName: string }>;
      trace: {
        initialSearch: { providers: string[] };
        deepExploration: { providers: string[] };
      };
    };

    expect(content.trace.initialSearch.providers).toEqual(["xiaohongshu_cli"]);
    expect(content.restrictedStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerName: "xiaohongshu_cli" }),
      ]),
    );
    expect(content.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerName: "codex_external_research" }),
      ]),
    );
    expect(JSON.stringify(content)).not.toContain("openclaw");
    expect(JSON.stringify(content)).not.toContain("public_web_search");
    expect(JSON.stringify(content)).not.toContain("search_api");
  });

  it("does not throw when the Xiaohongshu CLI executable is missing", async () => {
    const tool = new NetworkedResearchTool(undefined, {
      xiaohongshu: {
        enabled: true,
        cliPath: "D:\\Code\\Project\\Github\\missing-xiaohongshu-cli\\xhs.exe",
      },
      CONTENT_FOREST_RESEARCH_PROVIDER: "codex-external-agent",
      CONTENT_FOREST_CODEX_RESEARCH_BASE_URL: "",
      CONTENT_FOREST_CODEX_RESEARCH_API_KEY: "",
    });

    const output = await tool.execute(
      {
        mode: "research",
        request: "xiaohongshu AI product examples",
        targetPlatform: "xiaohongshu",
        maxResults: 5,
      },
      context,
    );
    const content = output.content as {
      failures: Array<{ providerName: string; code: string }>;
      trace: {
        qualityGate: { providerUnavailable: boolean };
      };
    };

    expect(content.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerName: "xiaohongshu_cli",
          code: "provider_unavailable",
        }),
      ]),
    );
    expect(content.trace.qualityGate.providerUnavailable).toBe(true);
  });

  it("sanitizes Xiaohongshu CLI diagnostics", () => {
    const sanitized = sanitizeXiaohongshuCliDiagnostic(
      "Cookie: a_very_long_secret_value C:\\Users\\alice\\.xiaohongshu-cli\\cookies.json Bearer sk-test-secret-value",
    );

    expect(sanitized).not.toContain("alice");
    expect(sanitized).not.toContain("sk-test-secret-value");
    expect(sanitized).toContain("[redacted-local-path]");
    expect(sanitized).toContain("[redacted-secret]");
  });

  it("returns structured Xiaohongshu failures for non-JSON output", async () => {
    const provider = new XiaohongshuCliResearchProvider({
      runner: new FakeXiaohongshuRunner([
        {
          expectArgs: ["status", "--json"],
          result: "not json",
        },
      ]),
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "小红书 AI 产品案例",
      targetPlatform: "小红书",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.failures[0]).toMatchObject({
      providerName: "xiaohongshu_cli",
      code: "provider_error",
      phase: "initial_search",
    });
  });

  it("redacts Xiaohongshu process failures and timeout failures", async () => {
    const failureRouter = new NetworkProviderRouter({
      providers: [
        new XiaohongshuCliResearchProvider({
          runner: new FakeXiaohongshuRunner([
            {
              expectArgs: ["status", "--json"],
              error: new XiaohongshuCliProcessError({
                message: "failed with Bearer sk-secret-value",
                stderr: "cookie=very-long-cookie-value C:\\Users\\alice\\.xiaohongshu-cli\\cookies.json",
                failureCode: "provider_error",
              }),
            },
          ]),
        }),
      ],
    });
    const failureResult = await failureRouter.run({
      mode: "research",
      request: "小红书 AI 产品案例",
      targetPlatform: "小红书",
    });

    expect(failureResult.mode).toBe("research");
    if (failureResult.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(JSON.stringify(failureResult)).not.toContain("sk-secret-value");
    expect(JSON.stringify(failureResult)).not.toContain("alice");

    const timeoutRouter = new NetworkProviderRouter({
      providers: [
        new XiaohongshuCliResearchProvider({
          runner: new FakeXiaohongshuRunner([
            {
              expectArgs: ["status", "--json"],
              error: new XiaohongshuCliProcessError({
                message: "xiaohongshu-cli command timed out",
                failureCode: "timeout",
              }),
            },
          ]),
        }),
      ],
    });
    const timeoutResult = await timeoutRouter.run({
      mode: "research",
      request: "小红书 AI 产品案例",
      targetPlatform: "小红书",
    });

    expect(timeoutResult.mode).toBe("research");
    if (timeoutResult.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(timeoutResult.failures[0]).toMatchObject({
      providerName: "xiaohongshu_cli",
      code: "timeout",
    });
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
});

class FakeXiaohongshuRunner implements XiaohongshuCliRunner {
  public readonly calls: Array<{ args: string[]; options: XiaohongshuCliRunOptions }> = [];

  public constructor(private readonly script: Array<{
    expectArgs: string[];
    result?: string;
    error?: Error;
  }>) {}

  public async run(
    args: string[],
    options: XiaohongshuCliRunOptions,
  ): Promise<XiaohongshuCliRunResult> {
    this.calls.push({ args, options });
    const next = this.script.shift();
    if (next === undefined) {
      throw new Error(`unexpected xhs call: ${args.join(" ")}`);
    }
    expect(args).toEqual(next.expectArgs);
    if (next.error !== undefined) {
      throw next.error;
    }
    return {
      stdout: next.result ?? envelope({}),
      stderr: "",
      exitCode: 0,
    };
  }
}

class RecordingCli implements BrowserCli {
  public readonly calls: Array<{ args: string[]; timeoutMs: number }> = [];

  public constructor(private readonly snapshot: string) {}

  public async run(args: string[], timeoutMs: number): Promise<string> {
    this.calls.push({ args, timeoutMs });
    return args.includes("snapshot") ? this.snapshot : "";
  }
}

function envelope(data: unknown): string {
  return JSON.stringify({
    ok: true,
    schema_version: "1.0",
    data,
  });
}

function codexResearchResponse(input: {
  summary?: string;
  items?: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
    platform: string;
    publishedAt: string;
    observedEvidence: string;
    engagementJson: string;
  }>;
  depositableBlocks?: Array<{ title: string; markdown: string }>;
  limitations?: Array<{ code: string; reason: string; url: string }>;
}): unknown {
  return {
    status: "completed",
    output: [{
      type: "message",
      content: [{
        type: "output_text",
        text: JSON.stringify({
          summary: input.summary ?? "",
          items: input.items ?? [],
          depositableBlocks: input.depositableBlocks ?? [],
          limitations: input.limitations ?? [],
        }),
      }],
    }],
  };
}

function jsonResponse(value: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}
