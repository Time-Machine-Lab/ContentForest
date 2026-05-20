import { NetworkProviderError } from "../provider-failure.js";
import {
  sanitizeTikhubDiagnostic,
  TikhubMcpClient,
  type TikhubMcpClientOptions,
  type TikhubMcpPlatformInfo,
  type TikhubMcpTool,
} from "../tikhub-mcp-client.js";
import type {
  NetworkEngagement,
  NetworkObserveRequest,
  NetworkProvider,
  NetworkResearchRequest,
  NetworkResearchResultQuality,
  NetworkRestrictedStatus,
  NetworkRestrictedStatusCode,
  RawNetworkResearchItem,
  ResearchQueryPlan,
} from "../types.js";

export type TikhubPlatformCapabilityName =
  | "search"
  | "detail"
  | "author"
  | "comments"
  | "engagement"
  | "rawMetadata";

export interface TikhubPlatformCapabilityMatrix {
  platform: string;
  label: string;
  enabled: boolean;
  evidenceSource: boolean;
  capabilities: Record<TikhubPlatformCapabilityName, boolean>;
  searchTool?: string;
  detailTool?: string;
  safeToolCount: number;
  restrictedReason?: string;
}

export interface TikhubMcpPlatformProviderOptions extends TikhubMcpClientOptions {
  enabled?: boolean;
  enableAllPlatforms?: boolean;
  enabledPlatforms?: string[];
  excludedPlatforms?: string[];
  maxResults?: number;
  client?: TikhubMcpClient;
  now?: () => Date;
}

interface PlatformDefinition {
  slug: string;
  label: string;
  aliases: string[];
  evidenceSource: boolean;
}

interface SelectedTools {
  matrix: TikhubPlatformCapabilityMatrix;
  searchTool: TikhubMcpTool | null;
  detailTool: TikhubMcpTool | null;
}

interface ParsedPlatformPost {
  id: string | null;
  url: string;
  title: string;
  body: string;
  author: {
    id?: string;
    name?: string;
    url?: string;
    handle?: string;
  };
  publishedAt: string | null;
  engagement: NetworkEngagement;
  rawMetadata: Record<string, unknown>;
}

const DEFAULT_MAX_RESULTS = 8;
const RAW_EXCERPT_MAX_CHARS = 6000;
const RAW_METADATA_MAX_CHARS = 12000;
const DEFAULT_EXCLUDED_PLATFORMS = ["xiaohongshu", "xhs", "rednote"];

const PLATFORM_DEFINITIONS: PlatformDefinition[] = [
  {
    slug: "tiktok",
    label: "TikTok",
    aliases: ["tiktok", "tik tok"],
    evidenceSource: true,
  },
  {
    slug: "douyin",
    label: "Douyin",
    aliases: ["douyin", "抖音"],
    evidenceSource: true,
  },
  {
    slug: "instagram",
    label: "Instagram",
    aliases: ["instagram", "ins", "reels"],
    evidenceSource: true,
  },
  {
    slug: "weibo",
    label: "Weibo",
    aliases: ["weibo", "微博"],
    evidenceSource: true,
  },
  {
    slug: "bilibili",
    label: "Bilibili",
    aliases: ["bilibili", "b站", "bili", "哔哩哔哩"],
    evidenceSource: true,
  },
  {
    slug: "youtube",
    label: "YouTube",
    aliases: ["youtube", "yt", "youtu.be"],
    evidenceSource: true,
  },
  {
    slug: "kuaishou",
    label: "Kuaishou",
    aliases: ["kuaishou", "快手"],
    evidenceSource: true,
  },
  {
    slug: "zhihu",
    label: "Zhihu",
    aliases: ["zhihu", "知乎"],
    evidenceSource: true,
  },
  {
    slug: "linkedin",
    label: "LinkedIn",
    aliases: ["linkedin", "linked in", "领英"],
    evidenceSource: true,
  },
  {
    slug: "reddit",
    label: "Reddit",
    aliases: ["reddit"],
    evidenceSource: true,
  },
  {
    slug: "wechat",
    label: "WeChat",
    aliases: ["wechat", "weixin", "微信", "公众号"],
    evidenceSource: true,
  },
  {
    slug: "twitter",
    label: "Twitter/X",
    aliases: ["twitter", "x.com", "推特", "tweet", "tweets", " x "],
    evidenceSource: true,
  },
  {
    slug: "threads",
    label: "Threads",
    aliases: ["threads"],
    evidenceSource: true,
  },
  {
    slug: "others",
    label: "Others",
    aliases: ["others", "other"],
    evidenceSource: false,
  },
  {
    slug: "tikhub",
    label: "TikHub Utilities",
    aliases: ["tikhub", "tikhub utilities"],
    evidenceSource: false,
  },
];

const XIAOHONGSHU_ALIASES = [
  "xiaohongshu",
  "xhs",
  "rednote",
  "小红书",
];

const UNSAFE_TOOL_MARKERS = [
  "cookie",
  "cookies",
  "login",
  "private",
  "publish",
  "upload",
  "delete",
  "follow",
  "unfollow",
  "send",
  "message",
  "dm",
  "comment",
  "like",
  "collect",
  "favorite",
  "write",
];

const SEARCH_TOOL_MARKERS = [
  "search",
  "query",
  "discover",
  "keyword",
  "list",
];

const DETAIL_TOOL_MARKERS = [
  "detail",
  "info",
  "get",
  "item",
  "post",
  "tweet",
  "video",
  "note",
  "aweme",
];

export class TikhubMcpPlatformProvider implements NetworkProvider {
  public readonly name = "tikhub_mcp_platform";

  private readonly enabled: boolean;
  private readonly enableAllPlatforms: boolean;
  private readonly enabledPlatforms: Set<string>;
  private readonly excludedPlatforms: Set<string>;
  private readonly maxResults: number;
  private readonly client: TikhubMcpClient;
  private readonly now: () => Date;

  public constructor(options: TikhubMcpPlatformProviderOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.enableAllPlatforms = options.enableAllPlatforms ?? true;
    this.enabledPlatforms = new Set((options.enabledPlatforms ?? []).map(normalizeSlug));
    this.excludedPlatforms = new Set([
      ...DEFAULT_EXCLUDED_PLATFORMS,
      ...(options.excludedPlatforms ?? []),
    ].map(normalizeSlug));
    this.maxResults = Math.min(Math.max(options.maxResults ?? DEFAULT_MAX_RESULTS, 1), 15);
    this.client = options.client ?? new TikhubMcpClient(options);
    this.now = options.now ?? (() => new Date());
  }

  public canResearch(request: NetworkResearchRequest): boolean {
    const platform = this.resolvePlatform(request.targetPlatform, request.request);
    return platform !== null &&
      !this.isExcluded(platform.slug) &&
      this.isPlatformEnabled(platform.slug) &&
      platform.evidenceSource;
  }

  public canObserve(_request: NetworkObserveRequest): boolean {
    return false;
  }

  public async research(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    const platform = this.resolvePlatform(
      request.targetPlatform ?? plan.targetPlatform ?? undefined,
      request.request,
    );
    if (!this.enabled) {
      return [this.restrictedItem(
        "provider_unavailable",
        "TikHub MCP Provider is disabled",
        platform?.slug ?? null,
      )];
    }
    if (platform === null) {
      return [this.restrictedItem(
        "provider_unavailable",
        "TikHub MCP Provider could not resolve a supported platform",
        null,
      )];
    }
    if (this.isExcluded(platform.slug)) {
      return [this.restrictedItem(
        "provider_unavailable",
        `TikHub MCP Provider excludes platform ${platform.slug}`,
        platform.slug,
      )];
    }
    if (!this.isPlatformEnabled(platform.slug)) {
      return [this.restrictedItem(
        "provider_unavailable",
        `TikHub MCP platform is not enabled: ${platform.slug}`,
        platform.slug,
      )];
    }
    if (!this.client.configured) {
      return [this.restrictedItem(
        "missing_api_key",
        "TikHub MCP API key is not configured",
        platform.slug,
      )];
    }

    let selected: SelectedTools;
    try {
      selected = await this.discoverTools(platform);
    } catch (error) {
      return [this.restrictedFromError(error, platform.slug, "initial_search")];
    }

    if (selected.searchTool === null) {
      return [this.restrictedItem(
        "platform_capability_unavailable",
        selected.matrix.restrictedReason ??
          `TikHub MCP platform ${platform.slug} has no safe public search tool`,
        platform.slug,
      )];
    }

    const targetCount = Math.min(
      Math.max(request.maxResults ?? plan.expectedResultCount ?? this.maxResults, 1),
      this.maxResults,
    );
    const keyword = selectSearchKeyword(request, plan, platform);
    const capturedAt = this.now().toISOString();
    const items: RawNetworkResearchItem[] = [];
    let searchRecords: unknown[];
    try {
      const searchResult = await this.client.callTool({
        platform: platform.slug,
        toolName: selected.searchTool.name,
        arguments: buildSearchArguments(selected.searchTool, keyword, targetCount),
      });
      searchRecords = readToolRecords(searchResult);
    } catch (error) {
      return [this.restrictedFromError(error, platform.slug, "initial_search")];
    }

    for (const record of searchRecords) {
      const parsed = parsePlatformPost(record, platform);
      if (!isUsablePlatformPost(parsed)) {
        continue;
      }
      const candidate = toRawResearchItem(parsed, {
        capturedAt,
        providerName: this.name,
        platform,
        observed: false,
      });
      const detailTarget = parsed.id ?? parsed.url;
      if (selected.detailTool !== null && detailTarget.length > 0) {
        try {
          const detailResult = await this.client.callTool({
            platform: platform.slug,
            toolName: selected.detailTool.name,
            arguments: buildDetailArguments(selected.detailTool, parsed, platform),
          });
          const details = readToolRecords(detailResult);
          const detail = details.length > 0
            ? parsePlatformPost(details[0], platform)
            : parsePlatformPost(detailResult, platform);
          if (isUsablePlatformPost(detail)) {
            items.push(toRawResearchItem(detail, {
              capturedAt,
              providerName: this.name,
              platform,
              observed: true,
            }));
          } else {
            items.push(candidate);
          }
        } catch (error) {
          items.push(candidate);
          items.push(this.restrictedFromError(error, platform.slug, "initial_search", parsed.url));
        }
      } else {
        items.push(candidate);
      }
      if (items.filter((item) => item.restrictedStatus === undefined).length >= targetCount) {
        break;
      }
    }

    if (items.filter((item) => item.restrictedStatus === undefined).length === 0) {
      return [this.restrictedItem(
        "empty_result",
        `TikHub MCP returned no usable ${platform.label} posts for keyword: ${keyword}`,
        platform.slug,
      )];
    }
    return items;
  }

  public async probeAvailability(): Promise<{
    ok: boolean;
    health: Record<string, unknown>;
    platforms: TikhubMcpPlatformInfo[];
  }> {
    const [health, platforms] = await Promise.all([
      this.client.health(),
      this.client.listPlatforms(),
    ]);
    return {
      ok: true,
      health,
      platforms,
    };
  }

  public platformCapabilityMatrix(
    tools: TikhubMcpTool[],
    platformSlug: string,
  ): TikhubPlatformCapabilityMatrix {
    const platform = findPlatformDefinition(platformSlug) ?? {
      slug: normalizeSlug(platformSlug),
      label: platformSlug,
      aliases: [platformSlug],
      evidenceSource: true,
    };
    const safeTools = tools.filter(isSafeTool);
    const searchTool = chooseTool(safeTools, SEARCH_TOOL_MARKERS);
    const detailTool = chooseTool(safeTools, DETAIL_TOOL_MARKERS);
    return {
      platform: platform.slug,
      label: platform.label,
      enabled: this.isPlatformEnabled(platform.slug) && !this.isExcluded(platform.slug),
      evidenceSource: platform.evidenceSource,
      capabilities: {
        search: searchTool !== null,
        detail: detailTool !== null,
        author: detailTool !== null || searchTool !== null,
        comments: detailTool !== null,
        engagement: detailTool !== null || searchTool !== null,
        rawMetadata: true,
      },
      searchTool: searchTool?.name,
      detailTool: detailTool?.name,
      safeToolCount: safeTools.length,
      restrictedReason: searchTool === null
        ? `No safe public search tool discovered for ${platform.slug}`
        : undefined,
    };
  }

  public configSummary(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      enableAllPlatforms: this.enableAllPlatforms,
      enabledPlatforms: [...this.enabledPlatforms],
      excludedPlatforms: [...this.excludedPlatforms],
      maxResults: this.maxResults,
      apiKeyConfigured: this.client.configured,
    };
  }

  private async discoverTools(platform: PlatformDefinition): Promise<SelectedTools> {
    const tools = await this.client.listTools(platform.slug);
    const matrix = this.platformCapabilityMatrix(tools, platform.slug);
    const safeTools = tools.filter(isSafeTool);
    return {
      matrix,
      searchTool: matrix.searchTool !== undefined
        ? safeTools.find((tool) => tool.name === matrix.searchTool) ?? null
        : null,
      detailTool: matrix.detailTool !== undefined
        ? safeTools.find((tool) => tool.name === matrix.detailTool) ?? null
        : null,
    };
  }

  private resolvePlatform(
    explicitPlatform: string | undefined,
    text: string,
  ): PlatformDefinition | null {
    const explicit = normalizeInput(explicitPlatform ?? "");
    if (explicit.length > 0) {
      const matched = findPlatformDefinition(explicit);
      if (matched !== null) {
        return matched;
      }
    }
    return findPlatformDefinition(text);
  }

  private isPlatformEnabled(slug: string): boolean {
    if (this.enableAllPlatforms) {
      return true;
    }
    return this.enabledPlatforms.has(normalizeSlug(slug));
  }

  private isExcluded(slug: string): boolean {
    const normalized = normalizeSlug(slug);
    return this.excludedPlatforms.has(normalized) ||
      XIAOHONGSHU_ALIASES.some((alias) => normalizeSlug(alias) === normalized);
  }

  private restrictedItem(
    code: NetworkRestrictedStatusCode,
    reason: string,
    platform: string | null,
  ): RawNetworkResearchItem {
    return {
      restrictedStatus: {
        code,
        reason: sanitizeTikhubDiagnostic(reason, 320),
        providerName: this.name,
        phase: "initial_search",
        platform,
        diagnosticExcerpt: sanitizeTikhubDiagnostic(reason, 320),
      },
    };
  }

  private restrictedFromError(
    error: unknown,
    platform: string,
    phase: NetworkRestrictedStatus["phase"],
    url?: string,
  ): RawNetworkResearchItem {
    if (error instanceof NetworkProviderError) {
      const code = normalizeRestrictedCode(error.failureCode);
      return {
        restrictedStatus: {
          code,
          reason: sanitizeTikhubDiagnostic(error.message, 320),
          providerName: this.name,
          phase,
          platform,
          url,
          diagnosticExcerpt: sanitizeTikhubDiagnostic(error.message, 320),
        },
      };
    }
    const message = error instanceof Error ? error.message : "TikHub MCP provider failed";
    return {
      restrictedStatus: {
        code: "unknown",
        reason: sanitizeTikhubDiagnostic(message, 320),
        providerName: this.name,
        phase,
        platform,
        url,
        diagnosticExcerpt: sanitizeTikhubDiagnostic(message, 320),
      },
    };
  }
}

export function defaultTikhubMcpPlatformSlugs(): string[] {
  return PLATFORM_DEFINITIONS
    .filter((platform) => platform.evidenceSource)
    .map((platform) => platform.slug);
}

function findPlatformDefinition(value: string): PlatformDefinition | null {
  const normalized = normalizeInput(value);
  const slug = normalizeSlug(value);
  for (const platform of PLATFORM_DEFINITIONS) {
    if (platform.slug === slug) {
      return platform;
    }
    if (platform.aliases.some((alias) => normalized.includes(normalizeInput(alias)))) {
      return platform;
    }
  }
  return null;
}

function isSafeTool(tool: TikhubMcpTool): boolean {
  const schema = readRecord(tool.inputSchema);
  const required = readStringArray(schema.required).map((value) => value.toLowerCase());
  const text = [
    tool.name,
    tool.description ?? "",
    JSON.stringify(required),
  ].join(" ").toLowerCase();
  if (required.some((field) => /cookie|session|token|private|login/.test(field))) {
    return false;
  }
  return !UNSAFE_TOOL_MARKERS.some((marker) => new RegExp(`\\b${escapeRegExp(marker)}\\b`, "i").test(text));
}

function chooseTool(
  tools: TikhubMcpTool[],
  markers: string[],
): TikhubMcpTool | null {
  const scored = tools
    .map((tool) => ({
      tool,
      score: scoreTool(tool, markers),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
  return scored[0]?.tool ?? null;
}

function scoreTool(tool: TikhubMcpTool, markers: string[]): number {
  const name = tool.name.toLowerCase();
  const description = (tool.description ?? "").toLowerCase();
  let score = 0;
  for (const marker of markers) {
    if (name.includes(marker)) {
      score += 3;
    }
    if (description.includes(marker)) {
      score += 1;
    }
  }
  if (/get|fetch|detail|info/.test(name) && markers.includes("detail")) {
    score += 2;
  }
  if (/search|query/.test(name) && markers.includes("search")) {
    score += 2;
  }
  return score;
}

function buildSearchArguments(
  tool: TikhubMcpTool,
  keyword: string,
  limit: number,
): Record<string, unknown> {
  const schema = readRecord(tool.inputSchema);
  const properties = readRecord(schema.properties);
  const args: Record<string, unknown> = {};
  assignFirstSupported(args, properties, [
    "query",
    "q",
    "keyword",
    "keywords",
    "search_keyword",
    "searchKeyword",
    "searchKey",
    "content",
  ], keyword);
  assignFirstSupported(args, properties, [
    "limit",
    "count",
    "max_results",
    "maxResults",
    "pageSize",
    "size",
  ], limit);
  if (Object.keys(args).length === 0) {
    args.query = keyword;
    args.limit = limit;
  }
  return args;
}

function buildDetailArguments(
  tool: TikhubMcpTool,
  post: ParsedPlatformPost,
  platform: PlatformDefinition,
): Record<string, unknown> {
  const schema = readRecord(tool.inputSchema);
  const properties = readRecord(schema.properties);
  const args: Record<string, unknown> = {};
  const id = post.id ?? "";
  const url = post.url;
  const idKeys = platform.slug === "twitter"
    ? ["tweet_id", "tweetId", "id", "rest_id", "restId"]
    : ["id", "item_id", "itemId", "post_id", "postId", "video_id", "videoId", "aweme_id", "awemeId", "bvid"];
  assignFirstSupported(args, properties, idKeys, id);
  assignFirstSupported(args, properties, ["url", "link", "share_url", "shareUrl"], url);
  if (Object.keys(args).length === 0) {
    if (id.length > 0) {
      args.id = id;
    } else {
      args.url = url;
    }
  }
  return args;
}

function assignFirstSupported(
  target: Record<string, unknown>,
  properties: Record<string, unknown>,
  keys: string[],
  value: string | number,
): void {
  if (typeof value === "string" && value.length === 0) {
    return;
  }
  for (const key of keys) {
    if (properties[key] !== undefined) {
      target[key] = value;
      return;
    }
  }
}

function selectSearchKeyword(
  request: NetworkResearchRequest,
  plan: ResearchQueryPlan,
  platform: PlatformDefinition,
): string {
  const quoted = extractQuotedKeyword(request.request);
  if (quoted.length > 0) {
    return quoted.slice(0, 100);
  }
  const base = plan.contentObject || request.nutrientCardTitle || request.seedTitle || request.request;
  let keyword = base;
  for (const alias of platform.aliases) {
    keyword = keyword.replace(new RegExp(escapeRegExp(alias), "giu"), " ");
  }
  keyword = keyword
    .replace(/search|find|posts?|tweets?|videos?|cases?/giu, " ")
    .replace(/搜索|查找|找一下|找几篇|找几条|帖子|视频|案例|保留|获取/gu, " ")
    .replace(/\d+\s*(?:~|-|到)\s*\d+\s*[篇条个]/gu, " ")
    .replace(/\d+\s*[篇条个]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (keyword || request.request).slice(0, 100);
}

function readToolRecords(value: unknown): unknown[] {
  const extracted = extractMcpContent(value);
  const records = readRecords(extracted);
  return records.length > 0 ? records : readRecords(value);
}

function extractMcpContent(value: unknown): unknown {
  const record = readRecord(value);
  const content = Array.isArray(record.content) ? record.content : [];
  if (content.length === 0) {
    return value;
  }
  const parsed: unknown[] = [];
  for (const item of content) {
    const itemRecord = readRecord(item);
    const text = readString(itemRecord.text);
    if (text.length === 0) {
      continue;
    }
    const parsedText = tryParseJson(text);
    if (parsedText !== null) {
      parsed.push(parsedText);
    } else {
      parsed.push({ text });
    }
  }
  return parsed.length === 1 ? parsed[0] : parsed;
}

function readRecords(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  const record = readRecord(value);
  for (const key of ["items", "list", "results", "data", "timeline", "tweets", "posts", "videos"]) {
    const direct = record[key];
    if (Array.isArray(direct)) {
      return direct;
    }
    const nested = readRecord(direct);
    for (const nestedKey of ["items", "list", "results", "timeline", "tweets", "posts", "videos"]) {
      if (Array.isArray(nested[nestedKey])) {
        return nested[nestedKey] as unknown[];
      }
    }
  }
  return Object.keys(record).length > 0 ? [record] : [];
}

function parsePlatformPost(
  value: unknown,
  platform: PlatformDefinition,
): ParsedPlatformPost {
  const record = unwrapPostRecord(readRecord(value));
  const authorRecord = readNestedRecord(record, ["author", "user", "user_info", "userInfo", "core_user", "coreUser"]);
  const authorHandle = firstString(authorRecord, [
    "screen_name",
    "screenName",
    "username",
    "userName",
    "handle",
    "name",
  ]);
  const id = firstString(record, [
    "tweet_id",
    "tweetId",
    "id_str",
    "idStr",
    "rest_id",
    "restId",
    "note_id",
    "noteId",
    "aweme_id",
    "awemeId",
    "video_id",
    "videoId",
    "post_id",
    "postId",
    "item_id",
    "itemId",
    "id",
  ]);
  const url = firstString(record, [
    "url",
    "link",
    "share_url",
    "shareUrl",
    "web_url",
    "webUrl",
    "uri",
  ]) || inferPostUrl(platform.slug, id, authorHandle);
  const body = firstString(record, [
    "full_text",
    "fullText",
    "text",
    "content",
    "desc",
    "description",
    "caption",
    "snippet",
    "raw_text",
    "rawText",
  ]);
  const title = firstString(record, [
    "title",
    "display_title",
    "displayTitle",
    "name",
  ]) || truncate(body, 100);
  return {
    id: id.length > 0 ? id : null,
    url,
    title,
    body,
    author: {
      id: firstString(authorRecord, ["id", "user_id", "userId", "uid", "rest_id"]) || undefined,
      name: firstString(authorRecord, ["nickname", "display_name", "displayName", "name", "full_name"]) || authorHandle || undefined,
      url: firstString(authorRecord, ["url", "link", "profile_url", "profileUrl"]) || undefined,
      handle: authorHandle || undefined,
    },
    publishedAt: firstString(record, [
      "created_at",
      "createdAt",
      "published_at",
      "publishedAt",
      "publish_time",
      "publishTime",
      "time",
      "date",
    ]) || null,
    engagement: readEngagement(record),
    rawMetadata: sanitizeRawMetadata(record),
  };
}

function toRawResearchItem(
  post: ParsedPlatformPost,
  defaults: {
    capturedAt: string;
    providerName: string;
    platform: PlatformDefinition;
    observed: boolean;
  },
): RawNetworkResearchItem {
  const evidenceCompleteness = {
    hasPlatformIdOrUrl: post.id !== null || post.url.length > 0,
    hasTitle: post.title.length > 0 || post.body.length > 0,
    hasAuthor: post.author.name !== undefined || post.author.handle !== undefined,
    hasBodyOrExcerpt: post.body.length > 0,
    hasEngagement: Object.keys(post.engagement).length > 0,
  };
  return {
    platformItemId: post.id,
    title: post.title,
    url: post.url,
    author: {
      id: post.author.id,
      name: post.author.name,
      url: post.author.url,
    },
    source: defaults.platform.label,
    sourceDomain: domainOf(post.url),
    platform: defaults.platform.label,
    publishedAt: post.publishedAt,
    capturedAt: defaults.capturedAt,
    engagement: post.engagement,
    rawMetadata: post.rawMetadata,
    rawExcerpt: truncate(post.body, RAW_EXCERPT_MAX_CHARS),
    snippet: post.body,
    providerName: defaults.providerName,
    phase: "initial_search",
    resultQuality: qualityFromCompleteness(evidenceCompleteness, defaults.observed),
    evidenceCompleteness,
    observedAt: defaults.observed ? defaults.capturedAt : null,
  };
}

function qualityFromCompleteness(
  completeness: {
    hasPlatformIdOrUrl: boolean;
    hasTitle: boolean;
    hasAuthor: boolean;
    hasBodyOrExcerpt: boolean;
    hasEngagement: boolean;
  },
  observed: boolean,
): NetworkResearchResultQuality {
  if (
    completeness.hasPlatformIdOrUrl &&
    completeness.hasTitle &&
    completeness.hasAuthor &&
    completeness.hasBodyOrExcerpt &&
    completeness.hasEngagement
  ) {
    return "complete_observed_case";
  }
  return observed ? "observed_case" : "candidate_lead";
}

function isUsablePlatformPost(post: ParsedPlatformPost): boolean {
  return (post.id !== null || post.url.length > 0) &&
    (post.title.length > 0 || post.body.length > 0);
}

function readEngagement(record: Record<string, unknown>): NetworkEngagement {
  const nested = {
    ...readRecord(record.public_metrics),
    ...readRecord(record.publicMetrics),
    ...readRecord(record.stats),
    ...readRecord(record.stat),
    ...readRecord(record.interact_info),
    ...readRecord(record.interactInfo),
    ...readRecord(record.engagement),
    ...record,
  };
  const engagement: NetworkEngagement = {};
  assignMetric(engagement, "likes", nested, [
    "likes",
    "like_count",
    "likeCount",
    "favorite_count",
    "favoriteCount",
    "liked_count",
    "likedCount",
  ]);
  assignMetric(engagement, "favorites", nested, [
    "bookmarks",
    "bookmark_count",
    "bookmarkCount",
    "favorites",
    "collect_count",
    "collectCount",
    "collected_count",
    "collectedCount",
  ]);
  assignMetric(engagement, "comments", nested, [
    "comments",
    "comment_count",
    "commentCount",
    "reply_count",
    "replyCount",
    "replies",
  ]);
  assignMetric(engagement, "shares", nested, [
    "shares",
    "share_count",
    "shareCount",
    "retweet_count",
    "retweetCount",
    "repost_count",
    "repostCount",
  ]);
  assignMetric(engagement, "views", nested, [
    "views",
    "view_count",
    "viewCount",
    "impression_count",
    "impressionCount",
    "play_count",
    "playCount",
  ]);
  assignMetric(engagement, "quotes", nested, [
    "quotes",
    "quote_count",
    "quoteCount",
  ]);
  assignMetric(engagement, "retweets", nested, [
    "retweets",
    "retweet_count",
    "retweetCount",
    "reposts",
    "repost_count",
    "repostCount",
  ]);
  return engagement;
}

function assignMetric(
  target: NetworkEngagement,
  key: keyof NetworkEngagement,
  record: Record<string, unknown>,
  candidates: string[],
): void {
  for (const candidate of candidates) {
    const metric = parseMetric(record[candidate]);
    if (metric !== null) {
      target[key] = metric;
      return;
    }
  }
}

function parseMetric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim().replace(/,/g, "");
  const matched = /([\d.]+)\s*(万|w|k|千)?/i.exec(text);
  if (matched === null) {
    return null;
  }
  const base = Number.parseFloat(matched[1] ?? "");
  if (!Number.isFinite(base)) {
    return null;
  }
  const unit = (matched[2] ?? "").toLowerCase();
  if (unit === "万" || unit === "w") {
    return Math.round(base * 10_000);
  }
  if (unit === "k" || unit === "千") {
    return Math.round(base * 1000);
  }
  return Math.round(base);
}

function unwrapPostRecord(record: Record<string, unknown>): Record<string, unknown> {
  for (const key of ["tweet", "post", "item", "video", "note", "detail", "data", "result"]) {
    const nested = readRecord(record[key]);
    if (Object.keys(nested).length > 0) {
      return {
        ...record,
        ...nested,
      };
    }
  }
  return record;
}

function readNestedRecord(
  record: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  for (const key of keys) {
    const value = readRecord(record[key]);
    if (Object.keys(value).length > 0) {
      return value;
    }
  }
  return {};
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = readString(record[key]);
    if (value.length > 0) {
      return value;
    }
  }
  return "";
}

function inferPostUrl(platform: string, id: string, authorHandle: string): string {
  if (id.length === 0) {
    return "";
  }
  if (platform === "twitter") {
    const handle = authorHandle.replace(/^@/u, "");
    return handle.length > 0
      ? `https://x.com/${handle}/status/${id}`
      : `https://x.com/i/web/status/${id}`;
  }
  return "";
}

function normalizeRestrictedCode(
  code: NetworkProviderError["failureCode"],
): NetworkRestrictedStatusCode {
  if (
    code === "provider_unavailable" ||
    code === "missing_api_key" ||
    code === "quota_exceeded" ||
    code === "network_error" ||
    code === "timeout"
  ) {
    return code;
  }
  return "unknown";
}

function extractQuotedKeyword(value: string): string {
  const match = /["“'‘]([^"”'’]{2,100})["”'’]/u.exec(value);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function sanitizeRawMetadata(record: Record<string, unknown>): Record<string, unknown> {
  const text = sanitizeTikhubDiagnostic(JSON.stringify(record), RAW_METADATA_MAX_CHARS);
  const parsed = tryParseJson(text);
  return readRecord(parsed);
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function normalizeInput(value: string): string {
  return ` ${value.toLowerCase().replace(/\s+/g, " ").trim()} `;
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
