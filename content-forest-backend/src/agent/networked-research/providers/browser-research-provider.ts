import { ApplicationError } from "../../../shared/errors/application-error.js";
import {
  AgentBrowserActionRuntime,
  domainOf,
  isAllowedDomain,
  sessionIdFor,
  type BrowserActionRuntime,
  type BrowserCli,
} from "../browser-action-runtime.js";
import type { BrowserSessionPool } from "../browser-session-pool.js";
import { XiaohongshuBrowserStrategy } from "../browser-strategies/xiaohongshu-strategy.js";
import { NetworkProviderError } from "../provider-failure.js";
import { detectRestrictedStatus } from "../restricted-status.js";
import type { PlatformBrowserStrategy } from "../platform-browser-strategy.js";
import type {
  NetworkEngagement,
  NetworkExplorationProvider,
  NetworkObservationResult,
  NetworkObserveRequest,
  NetworkProvider,
  NetworkResearchRequest,
  NetworkResearchResult,
  RawNetworkResearchItem,
  ResearchQueryPlan,
} from "../types.js";

export interface BrowserResearchProviderOptions {
  runtime?: BrowserActionRuntime;
  cli?: BrowserCli;
  pool?: BrowserSessionPool;
  allowedDomains?: string[];
  maxSteps?: number;
  timeoutMs?: number;
  maxExcerptChars?: number;
  strategies?: PlatformBrowserStrategy[];
  enabled?: boolean;
}

export class BrowserResearchProvider implements NetworkProvider, NetworkExplorationProvider {
  public readonly name = "agent_browser";

  private readonly runtime: BrowserActionRuntime;
  private readonly allowedDomains: string[];
  private readonly maxSteps: number;
  private readonly timeoutMs: number;
  private readonly maxExcerptChars: number;
  private readonly strategies: PlatformBrowserStrategy[];
  private readonly enabled: boolean;

  public constructor(options: BrowserResearchProviderOptions = {}) {
    this.runtime = options.runtime ?? new AgentBrowserActionRuntime({
      cli: options.cli,
      pool: options.pool,
    });
    this.allowedDomains = options.allowedDomains ?? [];
    this.maxSteps = options.maxSteps ?? 3;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxExcerptChars = options.maxExcerptChars ?? 1200;
    this.strategies = options.strategies ?? [new XiaohongshuBrowserStrategy()];
    this.enabled = options.enabled ?? true;
  }

  public canResearch(_request: NetworkResearchRequest): boolean {
    return false;
  }

  public canExplore(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
    candidates: NetworkResearchResult[],
  ): boolean {
    return this.enabled && this.selectStrategy(request, plan, candidates) !== null;
  }

  public async explore(input: {
    request: NetworkResearchRequest;
    plan: ResearchQueryPlan;
    candidates: NetworkResearchResult[];
  }): Promise<RawNetworkResearchItem[]> {
    const strategy = this.selectStrategy(input.request, input.plan, input.candidates);
    if (strategy === null) {
      throw new NetworkProviderError(
        "strategy_unavailable",
        "No browser platform strategy is available for this research request",
      );
    }
    const items = await strategy.explore({
      ...input,
      runtime: this.runtime,
      allowedDomains: this.allowedDomains,
      timeoutMs: this.timeoutMs,
      maxSteps: this.maxSteps,
      maxExcerptChars: this.maxExcerptChars,
    });
    return items.map((item) => ({
      ...item,
      providerName: item.providerName ?? this.name,
      phase: "deep_exploration",
    }));
  }

  public canObserve(request: NetworkObserveRequest): boolean {
    if (!this.enabled) {
      return false;
    }
    return isAllowedDomain(request.url, this.allowedDomains);
  }

  public async observe(request: NetworkObserveRequest): Promise<Partial<NetworkObservationResult>> {
    if (!isAllowedDomain(request.url, this.allowedDomains)) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "浏览器观察域名不在允许范围内",
        400,
      );
    }
    const sessionId = sessionIdFor("observe", request.url);
    const snapshot = await this.runtime.openAndSnapshot({
      sessionId,
      url: request.url,
      allowedDomains: this.allowedDomains,
      timeoutMs: this.timeoutMs,
      maxSteps: this.maxSteps,
      maxExcerptChars: this.maxExcerptChars,
    });
    const restricted = detectRestrictedStatus({
      text: snapshot.excerpt,
      phase: "deep_exploration",
      providerName: this.name,
      platform: request.platform ?? null,
      url: request.url,
      sourceDomain: domainOf(request.url),
    });
    return {
      url: request.url,
      sourceDomain: domainOf(request.url),
      platform: request.platform ?? null,
      accessStatus: restricted === null ? "accessible" as const : "restricted" as const,
      metrics: restricted === null ? extractVisibleMetrics(snapshot.excerpt) : {},
      missingMetrics: [],
      sourceMethod: "agent_browser_snapshot",
      rawExcerpt: snapshot.excerpt,
      providerName: this.name,
    };
  }

  private selectStrategy(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
    candidates: NetworkResearchResult[],
  ): PlatformBrowserStrategy | null {
    return this.strategies.find((strategy) =>
      strategy.canExplore(request, plan, candidates),
    ) ?? null;
  }
}

function extractVisibleMetrics(text: string): NetworkEngagement {
  const metrics: NetworkEngagement = {};
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

export { AgentBrowserCli, type BrowserCli } from "../browser-action-runtime.js";
