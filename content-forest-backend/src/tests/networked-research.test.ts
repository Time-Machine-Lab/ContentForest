import { describe, expect, it } from "vitest";
import {
  BrowserResearchProvider,
  CodexExternalResearchProvider,
  ConfiguredSearchApiProvider,
  NetworkProviderRouter,
  OpenClawExternalResearchProvider,
  PublicWebSearchProvider,
  planNetworkResearch,
  type BrowserCli,
  type NetworkProvider,
  type OpenClawGatewayClient,
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

  it("delegates research to the Codex external research provider", async () => {
    let requestBody: Record<string, unknown> | null = null;
    const provider = new CodexExternalResearchProvider({
      baseUrl: "http://codex-provider.example/v1",
      apiKey: "sk-test-secret",
      model: "gpt-5.5",
      reasoningEffort: "high",
      searchContextSize: "low",
      fetchImpl: async (_url, init) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return jsonResponse({
          status: "completed",
          tool_usage: { web_search: { num_requests: 1 } },
          output: [{
            type: "message",
            content: [{
              type: "output_text",
              text: JSON.stringify({
                summary: "找到小红书 AI 产品宣传候选资料。",
                items: [{
                  title: "AI 产品种草案例",
                  url: "https://www.xiaohongshu.com/explore/abc",
                  snippet: "真实场景先行，产品后置露出。",
                  source: "小红书",
                  platform: "小红书",
                  publishedAt: null,
                  observedEvidence: "",
                  engagement: { likes: 1200 },
                }],
                depositableBlocks: [{
                  title: "小红书 AI 产品宣传营养",
                  markdown: "先给方法，再给产品；产品露出后置。",
                }],
                limitations: [],
              }),
            }],
          }],
        });
      },
      now: () => new Date("2026-05-13T00:00:00.000Z"),
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "搜索小红书 AI 产品宣传爆款文章",
      targetPlatform: "小红书",
    });

    expect(requestBody).toMatchObject({
      model: "gpt-5.5",
      reasoning: { effort: "high" },
      tool_choice: "required",
    });
    expect(JSON.stringify(requestBody)).toContain("web_search");
    expect(JSON.stringify(requestBody)).toContain("engagementJson");
    expect(JSON.stringify(requestBody)).not.toContain("\"type\":[\"string\",\"null\"]");
    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "AI 产品种草案例",
          url: "https://www.xiaohongshu.com/explore/abc",
          providerName: "codex_external_research",
          resultQuality: "candidate_lead",
        }),
        expect.objectContaining({
          title: "小红书 AI 产品宣传营养",
          providerName: "codex_external_research",
        }),
      ]),
    );
  });

  it("delegates research to OpenClaw and normalizes successful results", async () => {
    const client = new FakeOpenClawClient({
      output: externalResearchPackage({
        summary: "OpenClaw found useful AI product promotion examples.",
        items: [{
          title: "OpenClaw Xiaohongshu AI case",
          url: "https://www.xiaohongshu.com/explore/openclaw-case",
          snippet: "A real scene first, product mention later.",
          source: "Xiaohongshu",
          platform: "Xiaohongshu",
          publishedAt: "",
          observedEvidence: "Visible post detail with saves and likes.",
          engagementJson: "{\"likes\":1800,\"favorites\":460}",
        }],
      }),
    });
    const provider = new OpenClawExternalResearchProvider({
      gatewayUrl: "ws://openclaw.example",
      authToken: "sk-openclaw-secret",
      sessionPrefix: "content-forest-test",
      client,
      now: () => new Date("2026-05-13T00:00:00.000Z"),
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "Find Xiaohongshu AI product promotion cases",
      targetPlatform: "Xiaohongshu",
    });

    expect(client.runCalls).toHaveLength(1);
    expect(client.deleteCalls).toHaveLength(1);
    expect(client.runCalls[0]?.message).toContain("Return only the JSON research package");
    expect(client.runCalls[0]?.message).toContain("prioritize using the browser extension");
    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "OpenClaw Xiaohongshu AI case",
          providerName: "openclaw_external_research",
          resultQuality: "observed_case",
        }),
      ]),
    );
    expect(result.trace.initialSearch.providers).toEqual(["openclaw_external_research"]);
  });

  it("falls back to Codex when OpenClaw fails", async () => {
    const openClaw = new OpenClawExternalResearchProvider({
      gatewayUrl: "ws://openclaw.example",
      authToken: "sk-openclaw-secret",
      client: new FakeOpenClawClient({
        error: new Error("OpenClaw provider failed"),
      }),
    });
    const codex = new CodexExternalResearchProvider({
      baseUrl: "http://codex-provider.example/v1",
      apiKey: "sk-codex-secret",
      fetchImpl: async () => jsonResponse(codexResearchResponse({
        summary: "Codex fallback worked.",
        items: [{
          title: "Codex fallback case",
          url: "https://example.com/fallback",
          snippet: "Fallback result",
          source: "Web",
          platform: "",
          publishedAt: "",
          observedEvidence: "",
          engagementJson: "",
        }],
      })),
    });
    const router = new NetworkProviderRouter({ providers: [openClaw, codex] });

    const result = await router.run({
      mode: "research",
      request: "Research AI product promotion cases",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerName: "openclaw_external_research",
          code: "provider_error",
        }),
      ]),
    );
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Codex fallback case",
          providerName: "codex_external_research",
        }),
      ]),
    );
    expect(result.trace.initialSearch.providers).toEqual([
      "openclaw_external_research",
      "codex_external_research",
    ]);
    expect(result.trace.initialSearch.providerRuns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerName: "openclaw_external_research",
          status: "failure",
          failureCode: "provider_error",
        }),
        expect.objectContaining({
          providerName: "codex_external_research",
          status: "success",
        }),
      ]),
    );
  });

  it("falls back to Codex when OpenClaw times out", async () => {
    const openClaw = new OpenClawExternalResearchProvider({
      gatewayUrl: "ws://openclaw.example",
      authToken: "sk-openclaw-secret",
      client: new FakeOpenClawClient({
        error: new Error("OpenClaw Gateway request timed out"),
      }),
    });
    const codex = new CodexExternalResearchProvider({
      baseUrl: "http://codex-provider.example/v1",
      apiKey: "sk-codex-secret",
      fetchImpl: async () => jsonResponse(codexResearchResponse({
        summary: "Codex fallback after timeout.",
      })),
    });
    const router = new NetworkProviderRouter({ providers: [openClaw, codex] });

    const result = await router.run({
      mode: "research",
      request: "Research AI product promotion cases",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.failures[0]).toMatchObject({
      providerName: "openclaw_external_research",
      code: "timeout",
    });
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerName: "codex_external_research" }),
      ]),
    );
  });

  it("reports empty OpenClaw output with an OpenClaw-specific failure reason", async () => {
    const openClaw = new OpenClawExternalResearchProvider({
      gatewayUrl: "ws://openclaw.example",
      authToken: "sk-openclaw-secret",
      client: new FakeOpenClawClient({
        output: externalResearchPackage({}),
      }),
    });
    const router = new NetworkProviderRouter({ providers: [openClaw] });

    const result = await router.run({
      mode: "research",
      request: "Research AI product promotion cases",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.failures[0]).toMatchObject({
      providerName: "openclaw_external_research",
      code: "empty_result",
      reason: "OpenClaw external research provider returned no usable research content",
    });
  });

  it("deletes the OpenClaw session after success and after failure", async () => {
    const successClient = new FakeOpenClawClient({
      output: externalResearchPackage({ summary: "success" }),
    });
    const failureClient = new FakeOpenClawClient({
      error: new Error("OpenClaw failed"),
    });

    await new NetworkProviderRouter({
      providers: [
        new OpenClawExternalResearchProvider({
          gatewayUrl: "ws://openclaw.example",
          authToken: "sk-openclaw-secret",
          client: successClient,
        }),
      ],
    }).run({ mode: "research", request: "research success" });
    await new NetworkProviderRouter({
      providers: [
        new OpenClawExternalResearchProvider({
          gatewayUrl: "ws://openclaw.example",
          authToken: "sk-openclaw-secret",
          client: failureClient,
        }),
      ],
    }).run({ mode: "research", request: "research failure" });

    expect(successClient.deleteCalls).toHaveLength(1);
    expect(failureClient.deleteCalls).toHaveLength(1);
  });

  it("records OpenClaw session deletion failure without discarding results", async () => {
    const provider = new OpenClawExternalResearchProvider({
      gatewayUrl: "ws://openclaw.example",
      authToken: "sk-openclaw-secret",
      client: new FakeOpenClawClient({
        output: externalResearchPackage({ summary: "usable result" }),
        deleteError: new Error("cleanup failed with Bearer sk-openclaw-secret"),
      }),
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "Research AI product promotion cases",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "OpenClaw 外部研究摘要",
          providerName: "openclaw_external_research",
        }),
      ]),
    );
    expect(result.restrictedStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unknown",
          providerName: "openclaw_external_research",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("sk-openclaw-secret");
  });

  it("does not leak OpenClaw auth token in failures or config warnings", () => {
    const provider = new OpenClawExternalResearchProvider({
      gatewayUrl: "ws://openclaw.example",
      authToken: "sk-openclaw-secret-value",
      client: new FakeOpenClawClient({
        error: new Error("Authorization failed for Bearer sk-openclaw-secret-value"),
      }),
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    return router.run({
      mode: "research",
      request: "Research AI product promotion cases",
    }).then((result) => {
      expect(JSON.stringify(result)).not.toContain("sk-openclaw-secret-value");
      expect(JSON.stringify(result)).toContain("[redacted-secret]");
    });
  });

  it("maps Codex external research limitations to restricted statuses", async () => {
    const provider = new CodexExternalResearchProvider({
      baseUrl: "http://codex-provider.example/v1",
      apiKey: "sk-test-secret",
      fetchImpl: async () => jsonResponse({
        status: "completed",
        output: [{
          type: "message",
          content: [{
            type: "output_text",
            text: JSON.stringify({
              summary: "",
              items: [],
              depositableBlocks: [],
              limitations: [{
                code: "access_denied",
                reason: "小红书页面提示 IP 存在风险。",
                url: "https://www.xiaohongshu.com/search_result",
              }],
            }),
          }],
        }],
      }),
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "搜索小红书 AI 产品宣传爆款文章",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.restrictedStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "access_denied",
          providerName: "codex_external_research",
          phase: "initial_search",
        }),
      ]),
    );
  });

  it("returns structured Codex provider failures without leaking secrets", async () => {
    const provider = new CodexExternalResearchProvider({
      baseUrl: "http://codex-provider.example/v1",
      apiKey: "sk-test-secret-value",
      fetchImpl: async () => {
        throw new Error("network failed with Authorization: Bearer sk-test-secret-value");
      },
    });
    const router = new NetworkProviderRouter({ providers: [provider] });

    const result = await router.run({
      mode: "research",
      request: "研究 AI 产品宣传",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.failures[0]).toMatchObject({
      providerName: "codex_external_research",
      code: "network_error",
      phase: "initial_search",
    });
    expect(JSON.stringify(result.failures)).not.toContain("sk-test-secret-value");
    expect(JSON.stringify(result.failures)).not.toContain("Bearer sk-test");
  });

  it("fails Codex external research when config is missing", async () => {
    const router = new NetworkProviderRouter({
      providers: [new CodexExternalResearchProvider()],
    });

    const result = await router.run({
      mode: "research",
      request: "研究 AI 产品宣传",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerName: "codex_external_research",
          code: "provider_unavailable",
        }),
      ]),
    );
  });

  it("fails Codex external research on invalid structured JSON", async () => {
    const router = new NetworkProviderRouter({
      providers: [
        new CodexExternalResearchProvider({
          baseUrl: "http://codex-provider.example/v1",
          apiKey: "sk-test-secret",
          fetchImpl: async () => jsonResponse({
            status: "completed",
            output: [{
              type: "message",
              content: [{ type: "output_text", text: "not json" }],
            }],
          }),
        }),
      ],
    });

    const result = await router.run({
      mode: "research",
      request: "研究 AI 产品宣传",
    });

    expect(result.mode).toBe("research");
    if (result.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerName: "codex_external_research",
          code: "provider_error",
        }),
      ]),
    );
  });

  it("maps Codex external research HTTP and timeout failures", async () => {
    const httpRouter = new NetworkProviderRouter({
      providers: [
        new CodexExternalResearchProvider({
          baseUrl: "http://codex-provider.example/v1",
          apiKey: "sk-test-secret",
          fetchImpl: async () => jsonResponse({}, 403),
        }),
      ],
    });
    const httpResult = await httpRouter.run({
      mode: "research",
      request: "研究 AI 产品宣传",
    });

    expect(httpResult.mode).toBe("research");
    if (httpResult.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(httpResult.failures[0]).toMatchObject({
      providerName: "codex_external_research",
      code: "missing_api_key",
    });

    const timeoutRouter = new NetworkProviderRouter({
      providers: [
        new CodexExternalResearchProvider({
          baseUrl: "http://codex-provider.example/v1",
          apiKey: "sk-test-secret",
          timeoutMs: 1,
          fetchImpl: (_url, init) =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                reject(new DOMException("Aborted", "AbortError"));
              });
            }),
        }),
      ],
    });
    const timeoutResult = await timeoutRouter.run({
      mode: "research",
      request: "研究 AI 产品宣传",
    });

    expect(timeoutResult.mode).toBe("research");
    if (timeoutResult.mode !== "research") {
      throw new Error("expected research result");
    }
    expect(timeoutResult.failures[0]).toMatchObject({
      providerName: "codex_external_research",
      code: "timeout",
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

  it("uses only Codex external research by default while keeping legacy providers constructable", async () => {
    const tool = new NetworkedResearchTool(undefined, {
      CONTENT_FOREST_RESEARCH_PROVIDER: "codex-external-agent",
      CONTENT_FOREST_CODEX_RESEARCH_BASE_URL: "",
      CONTENT_FOREST_CODEX_RESEARCH_API_KEY: "",
    });

    const output = await tool.execute(
      { mode: "research", request: "研究 AI 产品宣传" },
      context,
    );

    const content = output.content as {
      failures: Array<{ providerName: string }>;
      trace: {
        initialSearch: { providers: string[] };
        deepExploration: { triggered: boolean; providers: string[] };
      };
    };
    expect(content.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerName: "codex_external_research" }),
      ]),
    );
    expect(JSON.stringify(content)).not.toContain("public_web_search");
    expect(JSON.stringify(content)).not.toContain("browser_research");
    expect(JSON.stringify(content.failures)).not.toContain("provider_router");
    expect(new PublicWebSearchProvider()).toBeInstanceOf(PublicWebSearchProvider);
    expect(new BrowserResearchProvider({ allowedDomains: ["example.com"] })).toBeInstanceOf(
      BrowserResearchProvider,
    );
    expect(content.trace.initialSearch.providers).toEqual(["codex_external_research"]);
    expect(content.trace.deepExploration).toMatchObject({
      triggered: false,
      providers: [],
    });
  });

  it("prioritizes OpenClaw when it is configured even if Codex is selected", async () => {
    const tool = new NetworkedResearchTool(undefined, {
      CONTENT_FOREST_RESEARCH_PROVIDER: "codex-external-agent",
      CONTENT_FOREST_CODEX_RESEARCH_BASE_URL: "",
      CONTENT_FOREST_CODEX_RESEARCH_API_KEY: "",
      CONTENT_FOREST_OPENCLAW_GATEWAY_URL: "ws://openclaw.example",
      CONTENT_FOREST_OPENCLAW_AUTH_TOKEN: "sk-openclaw-secret",
    });

    const output = await tool.execute(
      { mode: "research", request: "Research AI product promotion" },
      context,
    );

    const content = output.content as {
      failures: Array<{ providerName: string }>;
      trace: { initialSearch: { providers: string[] } };
    };
    expect(content.trace.initialSearch.providers[0]).toBe("openclaw_external_research");
    expect(JSON.stringify(content)).toContain("openclaw_external_research");
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

class FakeOpenClawClient implements OpenClawGatewayClient {
  public readonly runCalls: Array<{
    message: string;
    sessionKey: string;
    runId: string;
    timeoutMs: number;
  }> = [];
  public readonly deleteCalls: string[] = [];

  public constructor(private readonly options: {
    output?: unknown;
    error?: Error;
    deleteError?: Error;
  }) {}

  public async runAgent(input: {
    message: string;
    sessionKey: string;
    runId: string;
    timeoutMs: number;
  }): Promise<unknown> {
    this.runCalls.push(input);
    if (this.options.error !== undefined) {
      throw this.options.error;
    }
    return this.options.output ?? externalResearchPackage({ summary: "fake openclaw output" });
  }

  public async deleteSession(sessionKey: string): Promise<void> {
    this.deleteCalls.push(sessionKey);
    if (this.options.deleteError !== undefined) {
      throw this.options.deleteError;
    }
  }
}

function externalResearchPackage(input: {
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
}): string {
  return JSON.stringify({
    summary: input.summary ?? "",
    items: input.items ?? [],
    depositableBlocks: input.depositableBlocks ?? [],
    limitations: input.limitations ?? [],
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
        text: externalResearchPackage(input),
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
