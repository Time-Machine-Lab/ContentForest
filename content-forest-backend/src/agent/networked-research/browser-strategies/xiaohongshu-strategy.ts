import { domainOf, sessionIdFor } from "../browser-action-runtime.js";
import { detectRestrictedStatus } from "../restricted-status.js";
import type {
  PlatformBrowserStrategy,
  PlatformBrowserStrategyInput,
} from "../platform-browser-strategy.js";
import type {
  NetworkResearchRequest,
  NetworkResearchResult,
  RawNetworkResearchItem,
  ResearchQueryPlan,
} from "../types.js";

export class XiaohongshuBrowserStrategy implements PlatformBrowserStrategy {
  public readonly name = "xiaohongshu_browser_strategy";
  public readonly platform = "小红书";

  public canExplore(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
    candidates: NetworkResearchResult[],
  ): boolean {
    return (
      normalizePlatform(request.targetPlatform ?? plan.targetPlatform) === "小红书" ||
      candidates.some((candidate) => isXiaohongshuUrl(candidate.url))
    );
  }

  public async explore(input: PlatformBrowserStrategyInput): Promise<RawNetworkResearchItem[]> {
    const targetUrl = chooseTargetUrl(input);
    const sessionId = sessionIdFor(
      "research",
      `${this.name}-${input.request.request}-${targetUrl}`,
    );
    const snapshot = await input.runtime.openAndSnapshot({
      sessionId,
      url: targetUrl,
      allowedDomains: input.allowedDomains,
      timeoutMs: input.timeoutMs,
      maxSteps: input.maxSteps,
      maxExcerptChars: input.maxExcerptChars,
    });
    const restricted = detectRestrictedStatus({
      text: snapshot.excerpt,
      phase: "deep_exploration",
      providerName: this.name,
      platform: this.platform,
      url: snapshot.url,
      sourceDomain: domainOf(snapshot.url),
    });
    if (restricted !== null) {
      return [{
        providerName: this.name,
        phase: "deep_exploration",
        restrictedStatus: restricted,
      }];
    }
    if (!hasUsableXiaohongshuSnapshot(snapshot.excerpt)) {
      return [{
        providerName: this.name,
        phase: "deep_exploration",
        restrictedStatus: {
          code: "layout_changed",
          reason: "小红书页面可访问，但策略未识别到可用内容或结果卡片",
          phase: "deep_exploration",
          providerName: this.name,
          platform: this.platform,
          url: snapshot.url,
          sourceDomain: domainOf(snapshot.url),
          diagnosticExcerpt: snapshot.excerpt.slice(0, 800),
        },
      }];
    }

    return [{
      title: inferObservedTitle(input),
      url: snapshot.url,
      snippet: snapshot.excerpt,
      rawExcerpt: snapshot.excerpt,
      source: "小红书站内观察",
      sourceDomain: domainOf(snapshot.url),
      platform: this.platform,
      providerName: this.name,
      phase: "deep_exploration",
      resultQuality: "observed_case",
      observedAt: new Date().toISOString(),
    }];
  }
}

function chooseTargetUrl(input: PlatformBrowserStrategyInput): string {
  const xhsCandidate = input.candidates.find((candidate) => isXiaohongshuUrl(candidate.url));
  if (xhsCandidate !== undefined) {
    return xhsCandidate.url;
  }
  const keyword =
    input.plan.siteSearchQueries[0] ??
    input.plan.queries[0] ??
    input.request.request;
  const url = new URL("https://www.xiaohongshu.com/search_result");
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("source", "web_explore_feed");
  return url.toString();
}

function inferObservedTitle(input: PlatformBrowserStrategyInput): string {
  const keyword =
    input.plan.siteSearchQueries[0] ??
    (input.plan.contentObject || input.request.request);
  return `小红书站内观察：${keyword}`.slice(0, 120);
}

function isXiaohongshuUrl(url: string): boolean {
  const domain = domainOf(url);
  return domain === "xiaohongshu.com" || domain.endsWith(".xiaohongshu.com");
}

function normalizePlatform(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value.trim();
}

function hasUsableXiaohongshuSnapshot(text: string): boolean {
  const normalized = text.trim();
  if (normalized.length < 20) {
    return false;
  }
  return /小红书|笔记|点赞|收藏|评论|分享|搜索|@/.test(normalized);
}
