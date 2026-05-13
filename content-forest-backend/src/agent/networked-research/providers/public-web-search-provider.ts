import { NetworkProviderError } from "../provider-failure.js";
import type {
  NetworkResearchRequest,
  NetworkSearchProvider,
  RawNetworkResearchItem,
  ResearchQueryPlan,
} from "../types.js";

export interface PublicWebSearchProviderOptions {
  fetchImpl?: typeof fetch;
  maxQueries?: number;
  maxResultsPerQuery?: number;
  enabled?: boolean;
}

export class PublicWebSearchProvider implements NetworkSearchProvider {
  public readonly name = "public_web_search";

  private readonly fetchImpl: typeof fetch;
  private readonly maxQueries: number;
  private readonly maxResultsPerQuery: number;
  private readonly enabled: boolean;

  public constructor(options: PublicWebSearchProviderOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxQueries = Math.min(Math.max(options.maxQueries ?? 2, 1), 4);
    this.maxResultsPerQuery = Math.min(Math.max(options.maxResultsPerQuery ?? 5, 1), 8);
    this.enabled = options.enabled ?? true;
  }

  public canSearch(_request: NetworkResearchRequest, _plan: ResearchQueryPlan): boolean {
    return this.enabled;
  }

  public async search(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    const items: RawNetworkResearchItem[] = [];
    const errors: string[] = [];
    for (const query of plan.queries.slice(0, this.maxQueries)) {
      try {
        items.push(...await this.searchDuckDuckGoHtml(query, request, plan));
        continue;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "DuckDuckGo HTML search failed");
      }
      try {
        items.push(...await this.searchSogouHtml(query, request, plan));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Sogou HTML search failed");
      }
    }
    if (items.length === 0) {
      throw new NetworkProviderError(
        errors.length > 0 ? "network_error" : "empty_result",
        errors.length > 0
          ? `Public web search failed: ${errors.slice(0, 3).join("; ")}`
          : "Public web search returned no usable results",
      );
    }
    return items;
  }

  private async searchDuckDuckGoHtml(
    query: string,
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    const url = new URL("https://html.duckduckgo.com/html/");
    url.searchParams.set("q", query);
    const html = await this.fetchText(url.toString());
    return parseDuckDuckGoHtml(html)
      .slice(0, this.maxResultsPerQuery)
      .map((item) => ({
        ...item,
        source: "DuckDuckGo HTML",
        sourceDomain: domainOf(item.url ?? ""),
        platform: request.targetPlatform ?? plan.targetPlatform,
        providerName: this.name,
        phase: "initial_search",
        resultQuality: "candidate_lead",
      }));
  }

  private async searchSogouHtml(
    query: string,
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    const url = new URL("https://www.sogou.com/web");
    url.searchParams.set("query", query);
    const html = await this.fetchText(url.toString());
    return parseSogouHtml(html)
      .slice(0, this.maxResultsPerQuery)
      .map((item) => ({
        ...item,
        source: "Sogou Web",
        sourceDomain: domainOf(item.url ?? ""),
        platform: request.targetPlatform ?? plan.targetPlatform,
        providerName: this.name,
        phase: "initial_search",
        resultQuality: "candidate_lead",
      }));
  }

  private async fetchText(url: string): Promise<string> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 ContentForestNetworkResearch/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Public web search network failed";
      throw new NetworkProviderError("network_error", message);
    }
    if (response.status === 429) {
      throw new NetworkProviderError("quota_exceeded", "Public web search rate limited");
    }
    if (!response.ok) {
      throw new NetworkProviderError(
        "network_error",
        `Public web search returned HTTP ${response.status}`,
      );
    }
    return response.text();
  }
}

function parseDuckDuckGoHtml(html: string): Array<{
  title: string;
  url: string;
  snippet: string;
  rawExcerpt: string;
}> {
  const results: Array<{
    title: string;
    url: string;
    snippet: string;
    rawExcerpt: string;
  }> = [];
  const blocks = html.split(/<div[^>]+class="[^"]*\bresult\b[^"]*"[^>]*>/i).slice(1);
  for (const block of blocks) {
    const titleMatch = /class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (titleMatch === null) {
      continue;
    }
    const url = unwrapDuckDuckGoUrl(decodeHtml(titleMatch[1] ?? ""));
    const title = stripTags(decodeHtml(titleMatch[2] ?? ""));
    const snippetMatch = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    const snippet = stripTags(decodeHtml(snippetMatch?.[1] ?? ""));
    if (title.length === 0 && snippet.length === 0) {
      continue;
    }
    results.push({
      title,
      url,
      snippet,
      rawExcerpt: snippet,
    });
  }
  return results;
}

function parseSogouHtml(html: string): Array<{
  title: string;
  url: string;
  snippet: string;
  rawExcerpt: string;
}> {
  const results: Array<{
    title: string;
    url: string;
    snippet: string;
    rawExcerpt: string;
  }> = [];
  const blocks = html.split(/<div[^>]+class="[^"]*\bvrwrap\b[^"]*"[^>]*>/i).slice(1);
  for (const block of blocks) {
    const titleMatch = /<h3[^>]+class="[^"]*\bvr-title\b[^"]*"[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (titleMatch === null) {
      continue;
    }
    const href = decodeHtml(titleMatch[1] ?? "");
    const title = stripTags(decodeHtml(titleMatch[2] ?? ""));
    const snippetMatch = /<div[^>]+class="[^"]*\bspace-txt\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(block);
    const snippet = stripTags(decodeHtml(snippetMatch?.[1] ?? ""));
    const url = href.startsWith("http")
      ? href
      : `https://www.sogou.com${href.startsWith("/") ? href : `/${href}`}`;
    if (title.length === 0 && snippet.length === 0) {
      continue;
    }
    results.push({
      title,
      url,
      snippet,
      rawExcerpt: snippet,
    });
  }
  return results;
}

function unwrapDuckDuckGoUrl(value: string): string {
  const normalized = value.startsWith("//") ? `https:${value}` : value;
  try {
    const url = new URL(normalized);
    const uddg = url.searchParams.get("uddg");
    return uddg ?? normalized;
  } catch {
    return normalized;
  }
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/<!--red_beg-->|<!--red_end-->/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    );
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
