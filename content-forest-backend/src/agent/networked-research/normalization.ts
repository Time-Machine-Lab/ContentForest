import type {
  NetworkEngagement,
  NetworkObservationResult,
  NetworkObserveRequest,
  NetworkResearchResult,
  RawNetworkResearchItem,
} from "./types.js";

export function normalizeResearchResults(
  items: RawNetworkResearchItem[],
  now: () => Date = () => new Date(),
): NetworkResearchResult[] {
  const capturedAt = now().toISOString();
  const normalized = items
    .map((item) => normalizeResearchItem(item, capturedAt))
    .filter((item): item is NetworkResearchResult => item !== null);
  return sortResearchResults(dedupeResearchResults(normalized));
}

export function normalizeObservationResult(
  request: NetworkObserveRequest,
  raw: Partial<NetworkObservationResult>,
  providerName: string,
  now: () => Date = () => new Date(),
): NetworkObservationResult {
  const url = normalizeUrl(raw.url ?? request.url);
  return {
    url,
    sourceDomain: raw.sourceDomain ?? domainOf(url),
    platform: raw.platform ?? request.platform ?? null,
    capturedAt: raw.capturedAt ?? now().toISOString(),
    accessStatus: raw.accessStatus ?? "unknown",
    metrics: sanitizeEngagement(raw.metrics ?? {}),
    missingMetrics: Array.isArray(raw.missingMetrics)
      ? raw.missingMetrics.map(String)
      : [],
    sourceMethod: raw.sourceMethod ?? "unknown",
    rawExcerpt: truncate(raw.rawExcerpt ?? "", 1200),
    providerName,
  };
}

function normalizeResearchItem(
  item: RawNetworkResearchItem,
  fallbackCapturedAt: string,
): NetworkResearchResult | null {
  const title = normalizeText(item.title ?? "");
  const snippet = normalizeText(item.snippet ?? item.rawExcerpt ?? "");
  const url = normalizeUrl(item.url ?? "");
  if (title.length === 0 && snippet.length === 0) {
    return null;
  }
  const sourceDomain = item.sourceDomain ?? domainOf(url);
  const capturedAt = item.capturedAt ?? fallbackCapturedAt;
  const publishedAt = normalizeOptionalDate(item.publishedAt ?? null);
  const engagement = sanitizeEngagement(item.engagement ?? {});
  return {
    title: truncate(title.length > 0 ? title : snippet, 180),
    url,
    source: item.source ?? sourceDomain,
    sourceDomain,
    platform: item.platform ?? null,
    snippet: truncate(snippet, 800),
    publishedAt,
    capturedAt,
    freshness: freshnessOf(publishedAt, capturedAt),
    engagement,
    rawExcerpt: truncate(item.rawExcerpt ?? snippet, 1200),
    providerName: item.providerName ?? "unknown",
    relevanceScore: scoreItem({ title, snippet, engagement, publishedAt }),
  };
}

function dedupeResearchResults(
  items: NetworkResearchResult[],
): NetworkResearchResult[] {
  const byKey = new Map<string, NetworkResearchResult>();
  for (const item of items) {
    const key = item.url.length > 0 ? item.url : `${item.sourceDomain}:${item.title}`;
    const existing = byKey.get(key);
    if (existing === undefined || item.relevanceScore > existing.relevanceScore) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

function sortResearchResults(
  items: NetworkResearchResult[],
): NetworkResearchResult[] {
  return [...items].sort((left, right) => right.relevanceScore - left.relevanceScore);
}

function scoreItem(input: {
  title: string;
  snippet: string;
  engagement: NetworkEngagement;
  publishedAt: string | null;
}): number {
  const textScore = Math.min(0.5, (input.title.length + input.snippet.length) / 1000);
  const engagementScore = Math.min(
    0.35,
    (numberOf(input.engagement.likes) +
      numberOf(input.engagement.favorites) +
      numberOf(input.engagement.comments) * 2 +
      numberOf(input.engagement.views) / 20) /
      10000,
  );
  const freshnessScore = input.publishedAt === null ? 0 : 0.15;
  return Number((textScore + engagementScore + freshnessScore).toFixed(4));
}

function freshnessOf(
  publishedAt: string | null,
  capturedAt: string,
): NetworkResearchResult["freshness"] {
  if (publishedAt === null) {
    return "unknown";
  }
  const published = Date.parse(publishedAt);
  const captured = Date.parse(capturedAt);
  if (!Number.isFinite(published) || !Number.isFinite(captured)) {
    return "unknown";
  }
  const days = (captured - published) / 86_400_000;
  if (days <= 30) {
    return "fresh";
  }
  if (days <= 180) {
    return "recent";
  }
  return "unknown";
}

function sanitizeEngagement(value: NetworkEngagement): NetworkEngagement {
  const result: NetworkEngagement = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "number" && Number.isFinite(item)) {
      result[key] = item;
      continue;
    }
    if (typeof item === "string" || typeof item === "boolean" || item === null) {
      result[key] = item;
    }
  }
  return result;
}

function normalizeOptionalDate(value: string | null): string | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    return null;
  }
  return new Date(time).toISOString();
}

function normalizeUrl(value: string): string {
  return value.trim();
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function numberOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
