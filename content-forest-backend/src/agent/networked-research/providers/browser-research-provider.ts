import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { ApplicationError } from "../../../shared/errors/application-error.js";
import { BrowserSessionPool } from "../browser-session-pool.js";
import type {
  NetworkObserveRequest,
  NetworkProvider,
  NetworkResearchRequest,
  RawNetworkResearchItem,
  ResearchQueryPlan,
} from "../types.js";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

export interface BrowserCli {
  run(args: string[], timeoutMs: number): Promise<string>;
}

export interface BrowserResearchProviderOptions {
  cli?: BrowserCli;
  allowedDomains?: string[];
  maxSteps?: number;
  timeoutMs?: number;
  maxExcerptChars?: number;
  pool?: BrowserSessionPool;
  enabled?: boolean;
}

export class AgentBrowserCli implements BrowserCli {
  public async run(args: string[], timeoutMs: number): Promise<string> {
    try {
      const command = resolveAgentBrowserCommand();
      const result = await execFileAsync(command.file, [...command.args, ...args], {
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      return [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : "agent-browser 执行失败";
      throw new ApplicationError(
        "AGENT_TOOL_ERROR",
        `agent-browser 不可用或执行失败：${message}`,
        502,
      );
    }
  }
}

function resolveAgentBrowserCommand(): { file: string; args: string[] } {
  try {
    return {
      file: process.execPath,
      args: [require.resolve("agent-browser/bin/agent-browser.js")],
    };
  } catch {
    return { file: "agent-browser", args: [] };
  }
}

export class BrowserResearchProvider implements NetworkProvider {
  public readonly name = "agent_browser";

  private readonly cli: BrowserCli;
  private readonly allowedDomains: string[];
  private readonly maxSteps: number;
  private readonly timeoutMs: number;
  private readonly maxExcerptChars: number;
  private readonly pool: BrowserSessionPool;
  private readonly enabled: boolean;

  public constructor(options: BrowserResearchProviderOptions = {}) {
    this.cli = options.cli ?? new AgentBrowserCli();
    this.allowedDomains = options.allowedDomains ?? [];
    this.maxSteps = options.maxSteps ?? 3;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxExcerptChars = options.maxExcerptChars ?? 1200;
    this.pool = options.pool ?? new BrowserSessionPool(2);
    this.enabled = options.enabled ?? true;
  }

  public canResearch(_request: NetworkResearchRequest): boolean {
    return this.enabled;
  }

  public async research(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    const targetUrl = buildSearchUrl(plan.queries[0] ?? request.request);
    this.assertAllowedDomain(targetUrl);
    const sessionId = sessionIdFor("research", request.request);
    const excerpt = await this.runSnapshot(sessionId, targetUrl);
    return [{
      title: `浏览器观察：${plan.queries[0] ?? request.request}`,
      url: targetUrl,
      snippet: excerpt,
      rawExcerpt: excerpt,
      source: "agent_browser",
      sourceDomain: domainOf(targetUrl),
      platform: plan.targetPlatform,
      providerName: this.name,
    }];
  }

  public canObserve(request: NetworkObserveRequest): boolean {
    if (!this.enabled) {
      return false;
    }
    return this.isAllowedDomain(request.url);
  }

  public async observe(request: NetworkObserveRequest) {
    this.assertAllowedDomain(request.url);
    const sessionId = sessionIdFor("observe", request.url);
    const excerpt = await this.runSnapshot(sessionId, request.url);
    return {
      url: request.url,
      sourceDomain: domainOf(request.url),
      platform: request.platform ?? null,
      accessStatus: excerpt.length > 0 ? "accessible" as const : "unknown" as const,
      metrics: extractVisibleMetrics(excerpt),
      missingMetrics: [],
      sourceMethod: "agent_browser_snapshot",
      rawExcerpt: excerpt,
      providerName: this.name,
    };
  }

  private async runSnapshot(sessionId: string, url: string): Promise<string> {
    if (this.maxSteps < 2) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "浏览器观察最大步骤数不足以打开并读取页面",
        400,
      );
    }
    return this.pool.runExclusive(sessionId, async () => {
      await this.cli.run(["--session", sessionId, "open", url], this.timeoutMs);
      const output = await this.cli.run(
        ["--session", sessionId, "snapshot"],
        this.timeoutMs,
      );
      return output.slice(0, this.maxExcerptChars);
    });
  }

  private assertAllowedDomain(url: string): void {
    if (!this.isAllowedDomain(url)) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "浏览器观察域名不在允许范围内",
        400,
      );
    }
  }

  private isAllowedDomain(url: string): boolean {
    const domain = domainOf(url);
    if (domain.length === 0) {
      return false;
    }
    if (this.allowedDomains.length === 0) {
      return true;
    }
    return this.allowedDomains.some((allowed) =>
      domain === allowed || domain.endsWith(`.${allowed}`),
    );
  }
}

function buildSearchUrl(query: string): string {
  const url = new URL("https://www.bing.com/search");
  url.searchParams.set("q", query);
  return url.toString();
}

function sessionIdFor(mode: "research" | "observe", value: string): string {
  const safe = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `network-${mode}-${safe.slice(0, 48) || "task"}`;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function extractVisibleMetrics(text: string): Record<string, number> {
  const metrics: Record<string, number> = {};
  for (const [key, pattern] of Object.entries({
    likes: /(?:点赞|likes?)\D{0,8}(\d+(?:\.\d+)?万?)/i,
    favorites: /(?:收藏|favorites?|saves?)\D{0,8}(\d+(?:\.\d+)?万?)/i,
    comments: /(?:评论|comments?)\D{0,8}(\d+(?:\.\d+)?万?)/i,
    views: /(?:观看|播放|views?)\D{0,8}(\d+(?:\.\d+)?万?)/i,
  })) {
    const match = text.match(pattern);
    const value = match?.[1];
    if (value !== undefined) {
      metrics[key] = parseCount(value);
    }
  }
  return metrics;
}

function parseCount(value: string): number {
  const normalized = value.trim();
  if (normalized.endsWith("万")) {
    return Math.round(Number.parseFloat(normalized.slice(0, -1)) * 10_000);
  }
  return Math.round(Number.parseFloat(normalized.replaceAll(",", "")));
}
