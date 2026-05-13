import { NetworkProviderError } from "../provider-failure.js";
import type {
  NetworkSearchProvider,
  NetworkResearchRequest,
  RawNetworkResearchItem,
  ResearchQueryPlan,
} from "../types.js";

export type SearchApiProviderName = "brave" | "tavily" | "serpapi";

export interface ConfiguredSearchApiProviderOptions {
  provider?: SearchApiProviderName | "";
  apiKey?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  maxQueries?: number;
  maxResultsPerQuery?: number;
}

export class ConfiguredSearchApiProvider implements NetworkSearchProvider {
  public readonly name: string;

  private readonly provider: SearchApiProviderName | "";
  private readonly apiKey: string;
  private readonly endpoint?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxQueries: number;
  private readonly maxResultsPerQuery: number;

  public constructor(options: ConfiguredSearchApiProviderOptions = {}) {
    this.provider = normalizeProvider(options.provider);
    this.name = this.provider.length > 0 ? `search_api_${this.provider}` : "search_api";
    this.apiKey = options.apiKey?.trim() ?? "";
    this.endpoint = options.endpoint;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxQueries = Math.min(Math.max(options.maxQueries ?? 2, 1), 4);
    this.maxResultsPerQuery = Math.min(Math.max(options.maxResultsPerQuery ?? 4, 1), 8);
  }

  public canSearch(_request: NetworkResearchRequest, _plan: ResearchQueryPlan): boolean {
    return this.provider.length > 0;
  }

  public async search(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    if (this.provider.length === 0) {
      throw new NetworkProviderError(
        "provider_unavailable",
        "Search Provider is not configured. Set CONTENT_FOREST_SEARCH_PROVIDER to brave, tavily, or serpapi.",
      );
    }
    if (this.apiKey.length === 0) {
      throw new NetworkProviderError(
        "missing_api_key",
        "Search Provider API key is not configured. Set CONTENT_FOREST_SEARCH_API_KEY.",
      );
    }

    const queries = plan.queries.slice(0, this.maxQueries);
    const items: RawNetworkResearchItem[] = [];
    for (const query of queries) {
      items.push(...await this.searchOne(query, request, plan));
    }
    return items;
  }

  private async searchOne(
    query: string,
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    if (this.provider === "brave") {
      return this.searchBrave(query, request, plan);
    }
    if (this.provider === "tavily") {
      return this.searchTavily(query, request, plan);
    }
    return this.searchSerpApi(query, request, plan);
  }

  private async searchBrave(
    query: string,
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    const url = new URL(this.endpoint ?? "https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(this.maxResultsPerQuery));
    const json = await this.fetchJson(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": this.apiKey,
      },
    });
    const results = readArray(readRecord(json).web, "results");
    return results.map((item) => mapSearchItem(item, {
      providerName: this.name,
      platform: request.targetPlatform ?? plan.targetPlatform,
      source: "Brave Search",
    }));
  }

  private async searchTavily(
    query: string,
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    const json = await this.fetchJson(this.endpoint ?? "https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: this.maxResultsPerQuery,
        search_depth: "basic",
      }),
    });
    const results = readArray(json, "results");
    return results.map((item) => mapSearchItem(item, {
      providerName: this.name,
      platform: request.targetPlatform ?? plan.targetPlatform,
      source: "Tavily",
    }));
  }

  private async searchSerpApi(
    query: string,
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    const url = new URL(this.endpoint ?? "https://serpapi.com/search.json");
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("num", String(this.maxResultsPerQuery));
    const json = await this.fetchJson(url.toString(), {});
    const results = readArray(json, "organic_results");
    return results.map((item) => mapSearchItem(item, {
      providerName: this.name,
      platform: request.targetPlatform ?? plan.targetPlatform,
      source: "SerpApi",
    }));
  }

  private async fetchJson(url: string, init: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, init);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search Provider network failed";
      throw new NetworkProviderError("network_error", message);
    }
    if (response.status === 401 || response.status === 403) {
      throw new NetworkProviderError("missing_api_key", "Search Provider rejected the API key");
    }
    if (response.status === 429) {
      throw new NetworkProviderError("quota_exceeded", "Search Provider quota or rate limit exceeded");
    }
    if (!response.ok) {
      throw new NetworkProviderError(
        "network_error",
        `Search Provider returned HTTP ${response.status}`,
      );
    }
    return response.json();
  }
}

function normalizeProvider(value: ConfiguredSearchApiProviderOptions["provider"]): SearchApiProviderName | "" {
  return value === "brave" || value === "tavily" || value === "serpapi" ? value : "";
}

function mapSearchItem(
  value: unknown,
  defaults: {
    providerName: string;
    platform: string | null | undefined;
    source: string;
  },
): RawNetworkResearchItem {
  const item = readRecord(value);
  const url = readString(item.url) || readString(item.link);
  return {
    title: readString(item.title) || readString(item.name),
    url,
    snippet:
      readString(item.snippet) ||
      readString(item.description) ||
      readString(item.content),
    source: defaults.source,
    sourceDomain: domainOf(url),
    platform: defaults.platform ?? null,
    rawExcerpt:
      readString(item.snippet) ||
      readString(item.description) ||
      readString(item.content),
    providerName: defaults.providerName,
    phase: "initial_search",
    resultQuality: "candidate_lead",
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readArray(value: unknown, key: string): unknown[] {
  const target = key.length === 0 ? value : readRecord(value)[key];
  return Array.isArray(target) ? target : [];
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
