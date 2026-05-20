import type {
  NetworkEngagement,
  NetworkObservationResult,
  NetworkObserveRequest,
  NetworkResearchPhase,
  NetworkResearchResult,
  NetworkResearchResultQuality,
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
  if (item.restrictedStatus !== undefined) {
    return null;
  }
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
  const author = normalizeAuthor(item.author);
  const evidenceCompleteness = normalizeEvidenceCompleteness(item, {
    title,
    url,
    snippet,
    author,
    engagement,
  });
  return {
    platformItemId: normalizeNullableText(item.platformItemId ?? null),
    title: truncate(title.length > 0 ? title : snippet, 180),
    url,
    author,
    coverUrl: normalizeNullableText(item.coverUrl ?? null),
    source: item.source ?? sourceDomain,
    sourceDomain,
    platform: item.platform ?? null,
    snippet: truncate(snippet, 2000),
    publishedAt,
    capturedAt,
    freshness: freshnessOf(publishedAt, capturedAt),
    engagement,
    rawExcerpt: truncate(item.rawExcerpt ?? snippet, 6000),
    rawMetadata: sanitizeRawMetadata(item.rawMetadata ?? {}),
    providerName: item.providerName ?? "unknown",
    relevanceScore: scoreItem({ title, snippet, engagement, publishedAt }),
    phase: normalizePhase(item.phase),
    resultQuality: normalizeQuality(item.resultQuality, item, evidenceCompleteness),
    evidenceCompleteness,
    observedAt: normalizeOptionalDate(item.observedAt ?? null),
  };
}

function sanitizeRawMetadata(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      typeof item === "number" && Number.isFinite(item) ||
      typeof item === "string" ||
      typeof item === "boolean" ||
      item === null
    ) {
      result[key] = item;
    }
  }
  return result;
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
  return [...items].sort((left, right) => {
    const qualityDelta = qualityRank(right.resultQuality) - qualityRank(left.resultQuality);
    if (qualityDelta !== 0) {
      return qualityDelta;
    }
    return right.relevanceScore - left.relevanceScore;
  });
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

function normalizeAuthor(
  value: RawNetworkResearchItem["author"],
): NonNullable<NetworkResearchResult["author"]> {
  if (value === undefined) {
    return {};
  }
  return {
    id: normalizeNullableText(value.id) ?? undefined,
    name: normalizeNullableText(value.name) ?? undefined,
    url: normalizeNullableText(value.url) ?? undefined,
  };
}

function normalizeEvidenceCompleteness(
  item: RawNetworkResearchItem,
  normalized: {
    title: string;
    url: string;
    snippet: string;
    author: NetworkResearchResult["author"];
    engagement: NetworkEngagement;
  },
): NetworkResearchResult["evidenceCompleteness"] {
  return {
    hasPlatformIdOrUrl:
      normalizeNullableText(item.platformItemId ?? null) !== null ||
      normalized.url.length > 0,
    hasTitle: normalized.title.length > 0,
    hasAuthor: normalizeNullableText(normalized.author.name) !== null,
    hasBodyOrExcerpt:
      normalized.snippet.length > 0 ||
      normalizeNullableText(item.rawExcerpt ?? null) !== null,
    hasEngagement: Object.keys(normalized.engagement).length > 0,
    ...item.evidenceCompleteness,
  };
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

function normalizeNullableText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
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

function normalizePhase(value: NetworkResearchPhase | undefined): NetworkResearchPhase {
  return value ?? "initial_search";
}

function normalizeQuality(
  value: NetworkResearchResultQuality | undefined,
  item: RawNetworkResearchItem,
  evidenceCompleteness: NetworkResearchResult["evidenceCompleteness"],
): NetworkResearchResultQuality {
  if (value !== undefined) {
    return value;
  }
  if (item.platform === "小红书") {
    const complete =
      evidenceCompleteness.hasPlatformIdOrUrl &&
      evidenceCompleteness.hasTitle &&
      evidenceCompleteness.hasAuthor &&
      evidenceCompleteness.hasBodyOrExcerpt &&
      evidenceCompleteness.hasEngagement;
    if (complete) {
      return "complete_observed_case";
    }
    if (item.observedAt !== undefined || item.phase === "deep_exploration") {
      return "observed_case";
    }
    return "candidate_lead";
  }
  if (item.phase === "deep_exploration") {
    const hasObservedSignals =
      normalizeText(item.snippet ?? "").length > 0 &&
      Object.keys(item.engagement ?? {}).length > 0;
    return hasObservedSignals ? "complete_observed_case" : "observed_case";
  }
  return "candidate_lead";
}

function qualityRank(value: NetworkResearchResultQuality): number {
  if (value === "complete_observed_case") {
    return 3;
  }
  if (value === "observed_case") {
    return 2;
  }
  return 1;
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function numberOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
