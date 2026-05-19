import { execFile } from "node:child_process";
import { NetworkProviderError } from "../provider-failure.js";
import type {
  NetworkEngagement,
  NetworkObserveRequest,
  NetworkProvider,
  NetworkResearchRequest,
  NetworkRestrictedStatus,
  NetworkRestrictedStatusCode,
  RawNetworkResearchItem,
  ResearchQueryPlan,
} from "../types.js";

export interface XiaohongshuCliResearchProviderOptions {
  enabled?: boolean;
  cliPath?: string;
  timeoutMs?: number;
  maxResults?: number;
  defaultSort?: string;
  checkLogin?: boolean;
  runner?: XiaohongshuCliRunner;
  now?: () => Date;
}

export interface XiaohongshuCliRunOptions {
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface XiaohongshuCliRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface XiaohongshuCliRunner {
  run(args: string[], options: XiaohongshuCliRunOptions): Promise<XiaohongshuCliRunResult>;
}

interface XiaohongshuCliEnvelope {
  ok?: boolean;
  schema_version?: string;
  data?: unknown;
  error?: unknown;
}

interface ParsedXiaohongshuNote {
  id: string | null;
  url: string;
  title: string;
  body: string;
  author: {
    id?: string;
    name?: string;
    url?: string;
  };
  coverUrl: string | null;
  publishedAt: string | null;
  engagement: NetworkEngagement;
}

const XIAOHONGSHU_ALIASES = ["小红书", "xhs", "xiaohongshu", "rednote"];
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_STDOUT_CHARS = 200_000;
const MAX_STDERR_CHARS = 1_200;
const RAW_BODY_MAX_CHARS = 6000;

export class XiaohongshuCliProcessError extends Error {
  public readonly stdout: string;
  public readonly stderr: string;
  public readonly exitCode: number;
  public readonly failureCode: NetworkProviderError["failureCode"];

  public constructor(input: {
    message: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    failureCode?: NetworkProviderError["failureCode"];
  }) {
    super(input.message);
    this.name = "XiaohongshuCliProcessError";
    this.stdout = sanitizeDiagnostic(input.stdout ?? "", MAX_STDOUT_CHARS);
    this.stderr = sanitizeDiagnostic(input.stderr ?? "", MAX_STDERR_CHARS);
    this.exitCode = input.exitCode ?? 1;
    this.failureCode = input.failureCode ?? "provider_error";
  }
}

export class ExecFileXiaohongshuCliRunner implements XiaohongshuCliRunner {
  private readonly cliPath: string;

  public constructor(cliPath: string = "xhs") {
    this.cliPath = cliPath.trim() || "xhs";
  }

  public async run(
    args: string[],
    options: XiaohongshuCliRunOptions,
  ): Promise<XiaohongshuCliRunResult> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const child = execFile(
        this.cliPath,
        args,
        {
          encoding: "utf8",
          maxBuffer: MAX_STDOUT_CHARS,
          timeout: options.timeoutMs,
          windowsHide: true,
          env: {
            ...process.env,
            NO_COLOR: "1",
            PYTHONIOENCODING: process.env.PYTHONIOENCODING ?? "utf-8",
            PYTHONUTF8: process.env.PYTHONUTF8 ?? "1",
          },
        },
        (error, stdout, stderr) => {
          if (settled) {
            return;
          }
          settled = true;
          const sanitizedStdout = sanitizeDiagnostic(String(stdout ?? ""), MAX_STDOUT_CHARS);
          const sanitizedStderr = sanitizeDiagnostic(String(stderr ?? ""), MAX_STDERR_CHARS);
          if (error !== null) {
            const failureCode = inferProcessFailureCode(error);
            reject(new XiaohongshuCliProcessError({
              message: sanitizeDiagnostic(error.message, MAX_STDERR_CHARS),
              stdout: sanitizedStdout,
              stderr: sanitizedStderr,
              exitCode: readExitCode(error),
              failureCode,
            }));
            return;
          }
          resolve({
            stdout: sanitizedStdout,
            stderr: sanitizedStderr,
            exitCode: 0,
          });
        },
      );
      child.stdin?.end();

      const abort = (): void => {
        if (settled) {
          return;
        }
        try {
          child.kill();
        } catch {
          // Best effort process cancellation.
        }
        settled = true;
        reject(new XiaohongshuCliProcessError({
          message: "xiaohongshu-cli command was aborted",
          failureCode: "timeout",
        }));
      };
      options.signal?.addEventListener("abort", abort, { once: true });
    });
  }
}

export class XiaohongshuCliResearchProvider implements NetworkProvider {
  public readonly name = "xiaohongshu_cli";

  private readonly enabled: boolean;
  private readonly timeoutMs: number;
  private readonly maxResults: number;
  private readonly defaultSort: string;
  private readonly checkLogin: boolean;
  private readonly runner: XiaohongshuCliRunner;
  private readonly now: () => Date;

  public constructor(options: XiaohongshuCliResearchProviderOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.timeoutMs = Math.max(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1000);
    this.maxResults = Math.min(Math.max(options.maxResults ?? 8, 1), 15);
    this.defaultSort = normalizeSort(options.defaultSort);
    this.checkLogin = options.checkLogin ?? true;
    this.runner = options.runner ?? new ExecFileXiaohongshuCliRunner(options.cliPath);
    this.now = options.now ?? (() => new Date());
  }

  public canResearch(request: NetworkResearchRequest): boolean {
    return isXiaohongshuText(request.targetPlatform) ||
      isXiaohongshuText(request.request);
  }

  public canObserve(_request: NetworkObserveRequest): boolean {
    return false;
  }

  public async research(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    if (!this.enabled) {
      return [this.restrictedItem(
        "provider_unavailable",
        "xiaohongshu-cli Provider is disabled",
        "initial_search",
      )];
    }

    if (this.checkLogin) {
      const status = await this.runEnvelope(["status", "--json"]);
      const restrictedStatus = statusRestrictedStatus(status, this.name);
      if (restrictedStatus !== null) {
        return [{ restrictedStatus }];
      }
    }

    const targetCount = normalizeTargetResultCount(request, plan, this.maxResults);
    const keywords = buildSearchKeywords(request, plan);
    const capturedAt = this.now().toISOString();
    const candidates = await this.searchCandidates(keywords, targetCount, capturedAt);
    if (candidates.length === 0) {
      return [this.restrictedItem(
        "empty_result",
        `xiaohongshu-cli returned no notes for keywords: ${keywords.join(", ")}`,
        "initial_search",
      )];
    }

    const items: RawNetworkResearchItem[] = [];
    for (const candidate of candidates.slice(0, targetCount)) {
      const readTarget = candidate.platformItemId ?? candidate.url ?? "";
      if (readTarget.length === 0) {
        items.push(candidate);
        continue;
      }
      try {
        const detail = await this.readDetail(readTarget, capturedAt);
        items.push(detail);
      } catch (error) {
        items.push(candidate);
        const restrictedStatus = restrictedStatusFromError(error, this.name, candidate.url ?? "");
        if (restrictedStatus !== null) {
          items.push({ restrictedStatus });
        }
      }
    }
    return items;
  }

  public configSummary(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      timeoutMs: this.timeoutMs,
      maxResults: this.maxResults,
      defaultSort: this.defaultSort,
      checkLogin: this.checkLogin,
    };
  }

  private async searchCandidates(
    keywords: string[],
    targetCount: number,
    capturedAt: string,
  ): Promise<RawNetworkResearchItem[]> {
    const items: RawNetworkResearchItem[] = [];
    const seen = new Set<string>();
    const maxPages = targetCount > 8 ? 2 : 1;
    for (const keyword of keywords) {
    for (let page = 1; page <= maxPages && items.length < targetCount; page += 1) {
      const envelope = await this.runEnvelope([
        "search",
        keyword,
        "--json",
        "--sort",
        this.defaultSort,
        "--page",
        String(page),
      ]);
      const restrictedStatus = envelopeRestrictedStatus(envelope, {
        providerName: this.name,
        phase: "initial_search",
        platform: "小红书",
      });
      if (restrictedStatus !== null) {
        return items.length > 0 ? items : [{ restrictedStatus }];
      }
      for (const record of readDataRecords(envelope.data)) {
        const note = parseXiaohongshuNote(record);
        if (!isSearchCandidateNote(note)) {
          continue;
        }
        const dedupeKey = note.id ?? note.url;
        if (seen.has(dedupeKey)) {
          continue;
        }
        seen.add(dedupeKey);
        items.push(toRawResearchItem(note, {
          capturedAt,
          providerName: this.name,
          observed: false,
        }));
        if (items.length >= targetCount) {
          break;
        }
      }
    }
    if (items.length >= targetCount) {
      break;
    }
    }
    return items;
  }

  private async readDetail(
    noteIdOrUrl: string,
    capturedAt: string,
  ): Promise<RawNetworkResearchItem> {
    const envelope = await this.runEnvelope(["read", noteIdOrUrl, "--json"]);
    const restrictedStatus = envelopeRestrictedStatus(envelope, {
      providerName: this.name,
      phase: "initial_search",
      platform: "小红书",
      url: noteIdOrUrl.startsWith("http") ? noteIdOrUrl : undefined,
    });
    if (restrictedStatus !== null) {
      return { restrictedStatus };
    }
    const records = readDataRecords(envelope.data);
    const note = parseXiaohongshuNote(records[0] ?? envelope.data);
    return toRawResearchItem(note, {
      capturedAt,
      providerName: this.name,
      observed: true,
    });
  }

  private async runEnvelope(args: string[]): Promise<XiaohongshuCliEnvelope> {
    let result: XiaohongshuCliRunResult;
    try {
      result = await this.runner.run(args, { timeoutMs: this.timeoutMs });
    } catch (error) {
      if (error instanceof XiaohongshuCliProcessError) {
        const parsed = tryParseEnvelope(error.stdout);
        if (parsed !== null) {
          return parsed;
        }
        throw new NetworkProviderError(
          error.failureCode,
          error.stderr || error.message,
        );
      }
      const message =
        error instanceof Error ? sanitizeDiagnostic(error.message, MAX_STDERR_CHARS) : "xiaohongshu-cli command failed";
      throw new NetworkProviderError("provider_error", message);
    }

    const parsed = tryParseEnvelope(result.stdout);
    if (parsed === null) {
      const diagnostic = result.stderr || result.stdout.slice(0, MAX_STDERR_CHARS);
      throw new NetworkProviderError(
        "provider_error",
        `xiaohongshu-cli returned non-JSON output: ${sanitizeDiagnostic(diagnostic, MAX_STDERR_CHARS)}`,
      );
    }
    return parsed;
  }

  private restrictedItem(
    code: NetworkRestrictedStatusCode,
    reason: string,
    phase: NetworkRestrictedStatus["phase"],
  ): RawNetworkResearchItem {
    return {
      restrictedStatus: {
        code,
        reason,
        providerName: this.name,
        phase,
        platform: "小红书",
        diagnosticExcerpt: sanitizeDiagnostic(reason, 320),
      },
    };
  }
}

function toRawResearchItem(
  note: ParsedXiaohongshuNote,
  defaults: {
    capturedAt: string;
    providerName: string;
    observed: boolean;
  },
): RawNetworkResearchItem {
  const evidenceCompleteness = {
    hasPlatformIdOrUrl: note.id !== null || note.url.length > 0,
    hasTitle: note.title.length > 0 || note.body.length > 0,
    hasAuthor: note.author.name !== undefined,
    hasBodyOrExcerpt: note.body.length > 0,
    hasEngagement: Object.keys(note.engagement).length > 0,
  };
  return {
    platformItemId: note.id,
    title: note.title,
    url: note.url,
    author: note.author,
    coverUrl: note.coverUrl,
    snippet: note.body,
    source: "小红书",
    sourceDomain: domainOf(note.url),
    platform: "小红书",
    publishedAt: note.publishedAt,
    capturedAt: defaults.capturedAt,
    engagement: note.engagement,
    rawExcerpt: truncate(note.body, RAW_BODY_MAX_CHARS),
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
): "candidate_lead" | "observed_case" | "complete_observed_case" {
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

function isSearchCandidateNote(note: ParsedXiaohongshuNote): boolean {
  return (note.id !== null || note.url.length > 0) &&
    (note.title.length > 0 || note.body.length > 0 || note.author.name !== undefined);
}

function statusRestrictedStatus(
  envelope: XiaohongshuCliEnvelope,
  providerName: string,
): NetworkRestrictedStatus | null {
  const restricted = envelopeRestrictedStatus(envelope, {
    providerName,
    phase: "initial_search",
    platform: "小红书",
  });
  if (restricted !== null) {
    return restricted;
  }
  const data = readRecord(envelope.data);
  const status = [
    readString(data.status),
    readString(data.state),
    readString(data.code),
    readString(data.message),
  ].join(" ").toLowerCase();
  const authValue = firstBoolean(data, [
    "authenticated",
    "isAuthenticated",
    "loggedIn",
    "logged_in",
    "valid",
  ]);
  if (authValue === false || /not[_ -]?authenticated|not[_ -]?login|cookie.*expired|login required|未登录|登录/.test(status)) {
    return {
      code: "restricted_by_login",
      reason: "xiaohongshu-cli is not authenticated or its cookie expired",
      providerName,
      phase: "initial_search",
      platform: "小红书",
      diagnosticExcerpt: sanitizeDiagnostic(status, 320),
    };
  }
  return null;
}

function envelopeRestrictedStatus(
  envelope: XiaohongshuCliEnvelope,
  defaults: {
    providerName: string;
    phase: NetworkRestrictedStatus["phase"];
    platform: string;
    url?: string;
  },
): NetworkRestrictedStatus | null {
  if (envelope.ok !== false) {
    return null;
  }
  const error = readRecord(envelope.error);
  const errorCode = readString(error.code) || readString(error.errorCode);
  const reason = readString(error.message) ||
    readString(error.reason) ||
    readString(envelope.error) ||
    "xiaohongshu-cli returned an error";
  return {
    code: mapXiaohongshuErrorCode(errorCode, reason),
    reason: sanitizeDiagnostic(reason, 320),
    providerName: defaults.providerName,
    phase: defaults.phase,
    platform: defaults.platform,
    url: defaults.url,
    diagnosticExcerpt: sanitizeDiagnostic(reason, 320),
  };
}

function restrictedStatusFromError(
  error: unknown,
  providerName: string,
  url: string,
): NetworkRestrictedStatus | null {
  if (error instanceof NetworkProviderError) {
    const code = error.failureCode === "provider_error" || error.failureCode === "strategy_unavailable"
      ? "unknown"
      : error.failureCode;
    return {
      code,
      reason: sanitizeDiagnostic(error.message, 320),
      providerName,
      phase: "initial_search",
      platform: "小红书",
      url,
      diagnosticExcerpt: sanitizeDiagnostic(error.message, 320),
    };
  }
  return null;
}

function parseXiaohongshuNote(value: unknown): ParsedXiaohongshuNote {
  const record = unwrapNoteRecord(readRecord(value));
  const id = firstString(record, [
    "note_id",
    "noteId",
    "noteID",
    "id",
    "noteIdStr",
  ]);
  const url = firstString(record, [
    "url",
    "link",
    "share_url",
    "shareUrl",
    "note_url",
    "noteUrl",
    "web_url",
  ]) || (id.length > 0 ? `https://www.xiaohongshu.com/explore/${id}` : "");
  const authorRecord = readNestedRecord(record, ["author", "user", "user_info", "userInfo"]);
  const authorId = firstString(authorRecord, ["id", "user_id", "userId", "uid"]);
  const authorName = firstString(authorRecord, ["name", "nickname", "nickName", "user_name"]);
  const authorUrl = firstString(authorRecord, ["url", "link", "profile_url", "profileUrl"]);
  return {
    id: id || null,
    url,
    title: firstString(record, ["title", "display_title", "displayTitle", "note_title", "name"]),
    body: firstString(record, [
      "desc",
      "description",
      "content",
      "text",
      "note_content",
      "noteContent",
      "snippet",
    ]),
    author: {
      id: authorId || undefined,
      name: authorName || undefined,
      url: authorUrl || undefined,
    },
    coverUrl: readCoverUrl(record),
    publishedAt: readPublishedAt(record),
    engagement: readEngagement(record),
  };
}

function unwrapNoteRecord(record: Record<string, unknown>): Record<string, unknown> {
  for (const key of ["note", "item", "detail", "note_card", "noteCard", "data"]) {
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

function readDataRecords(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  const record = readRecord(value);
  for (const key of ["items", "notes", "results", "list", "data", "feeds"]) {
    const nested = record[key];
    if (Array.isArray(nested)) {
      return nested;
    }
    const nestedRecord = readRecord(nested);
    for (const nestedKey of ["items", "notes", "results", "list"]) {
      if (Array.isArray(nestedRecord[nestedKey])) {
        return nestedRecord[nestedKey] as unknown[];
      }
    }
  }
  return Object.keys(record).length > 0 ? [record] : [];
}

function readCoverUrl(record: Record<string, unknown>): string | null {
  const direct = firstString(record, [
    "cover",
    "cover_url",
    "coverUrl",
    "image",
    "image_url",
    "imageUrl",
    "thumbnail",
    "thumbnail_url",
  ]);
  if (direct.length > 0) {
    return direct;
  }
  const coverRecord = readRecord(record.cover);
  const coverUrl = firstString(coverRecord, [
    "url_default",
    "urlDefault",
    "url_pre",
    "urlPre",
    "url",
  ]);
  if (coverUrl.length > 0) {
    return coverUrl;
  }
  for (const key of ["images", "image_list", "imageList", "pictures"]) {
    const images = readArray(record[key]);
    const first = readRecord(images[0]);
    const url = firstString(first, [
      "url_default",
      "urlDefault",
      "url_pre",
      "urlPre",
      "url",
      "src",
      "origin_url",
      "originUrl",
    ]);
    if (url.length > 0) {
      return url;
    }
    for (const info of readArray(first.info_list)) {
      const infoUrl = firstString(readRecord(info), ["url", "src"]);
      if (infoUrl.length > 0) {
        return infoUrl;
      }
    }
  }
  return null;
}

function readPublishedAt(record: Record<string, unknown>): string | null {
  const direct = firstString(record, [
    "published_at",
    "publishedAt",
    "publish_time",
    "publishTime",
    "created_at",
    "createdAt",
    "time",
  ]);
  if (direct.length > 0) {
    const timestamp = Number.parseInt(direct, 10);
    if (Number.isFinite(timestamp) && timestamp > 1_000_000_000) {
      const ms = timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
      return new Date(ms).toISOString();
    }
    return direct;
  }
  return null;
}

function readEngagement(record: Record<string, unknown>): NetworkEngagement {
  const nested = {
    ...readRecord(record.interact_info),
    ...readRecord(record.interactInfo),
    ...readRecord(record.stats),
    ...readRecord(record.engagement),
    ...record,
  };
  const engagement: NetworkEngagement = {};
  assignMetric(engagement, "likes", nested, [
    "likes",
    "like",
    "liked_count",
    "likedCount",
    "like_count",
    "likeCount",
  ]);
  assignMetric(engagement, "favorites", nested, [
    "favorites",
    "collect",
    "collected_count",
    "collectedCount",
    "collect_count",
    "collectCount",
    "fav_count",
  ]);
  assignMetric(engagement, "comments", nested, [
    "comments",
    "comment",
    "comment_count",
    "commentCount",
    "comments_count",
  ]);
  assignMetric(engagement, "shares", nested, [
    "shares",
    "share",
    "share_count",
    "shareCount",
    "shared_count",
    "sharedCount",
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
  if (text.length === 0) {
    return null;
  }
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

function buildSearchKeywords(
  request: NetworkResearchRequest,
  plan: ResearchQueryPlan,
): string[] {
  const primary = selectSearchKeyword(request, plan);
  const keywords = [
    primary,
    plan.contentObject,
    ...expandedXiaohongshuKeywords(primary),
  ]
    .map((keyword) => keyword.replace(/\s+/g, " ").trim())
    .filter((keyword) => keyword.length > 0);
  return [...new Set(keywords)].slice(0, 6);
}

function expandedXiaohongshuKeywords(primary: string): string[] {
  const normalized = primary.toLowerCase();
  const hasAi = normalized.includes("ai");
  const hasDeveloperSignal =
    primary.includes("\u72ec\u7acb\u5f00\u53d1") ||
    primary.includes("\u4e2a\u4eba\u5f00\u53d1") ||
    normalized.includes("vibe");
  if (!hasAi && !hasDeveloperSignal) {
    return [];
  }
  return [
    `${primary} \u6848\u4f8b`,
    `${primary} \u7206\u6b3e`,
    "\u72ec\u7acb\u5f00\u53d1\u8005 AI\u4ea7\u54c1",
    "\u4e2a\u4eba\u5f00\u53d1\u8005 AI\u4ea7\u54c1",
    "Vibe Coding \u72ec\u7acb\u5f00\u53d1",
    "AI\u521b\u4e1a \u72ec\u7acb\u5f00\u53d1",
    "\u4e00\u4eba\u516c\u53f8 AI\u4ea7\u54c1",
  ];
}

function selectSearchKeyword(
  request: NetworkResearchRequest,
  plan: ResearchQueryPlan,
): string {
  const quoted = extractQuotedKeyword(request.request);
  if (quoted.length > 0) {
    return quoted.slice(0, 80);
  }
  const preferred = plan.contentObject || request.nutrientCardTitle || request.seedTitle || request.request;
  let keyword = preferred;
  for (const alias of XIAOHONGSHU_ALIASES) {
    keyword = keyword.replace(new RegExp(escapeRegExp(alias), "giu"), " ");
  }
  keyword = keyword
    .replace(/爆款|案例|帖子|文章|搜索|查找|找一下|找几篇|找几条/gu, " ")
    .replace(/\d+\s*(?:~|-|到)\s*\d+\s*[篇条个]/gu, " ")
    .replace(/\d+\s*[篇条个]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (keyword || request.request).slice(0, 80);
}

function normalizeTargetResultCount(
  request: NetworkResearchRequest,
  plan: ResearchQueryPlan,
  maxResults: number,
): number {
  return Math.min(Math.max(request.maxResults ?? plan.expectedResultCount ?? maxResults, 1), maxResults);
}

function extractQuotedKeyword(value: string): string {
  const match = /["“'‘]([^"”'’]{2,80})["”'’]/u.exec(value);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function isXiaohongshuText(value: string | undefined | null): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = ` ${value.toLowerCase()} `;
  return XIAOHONGSHU_ALIASES.some((alias) => normalized.includes(alias.toLowerCase()));
}

function mapXiaohongshuErrorCode(
  code: string,
  reason: string,
): NetworkRestrictedStatusCode {
  const normalized = `${code} ${reason}`.toLowerCase();
  if (/not[_ -]?authenticated|not[_ -]?login|cookie.*expired|login required|未登录|登录/.test(normalized)) {
    return "restricted_by_login";
  }
  if (/verification|required|captcha|needverify|验证码|验证/.test(normalized)) {
    return "restricted_by_captcha";
  }
  if (/ip.*block|ip.*risk|access denied|forbidden|风控|访问受限|存在风险/.test(normalized)) {
    return "access_denied";
  }
  if (/timeout|timed out|超时/.test(normalized)) {
    return "timeout";
  }
  if (/empty|no result|暂无结果|没有找到/.test(normalized)) {
    return "empty_result";
  }
  return "unknown";
}

function inferProcessFailureCode(error: Error): NetworkProviderError["failureCode"] {
  const record = readRecord(error);
  const code = readString(record.code);
  const message = error.message.toLowerCase();
  if (code === "ENOENT" || /not recognized|not found|no such file|找不到/.test(message)) {
    return "provider_unavailable";
  }
  if (code === "ETIMEDOUT" || /timeout|timed out/.test(message)) {
    return "timeout";
  }
  return "provider_error";
}

function readExitCode(error: Error): number {
  const record = readRecord(error);
  const code = record.code;
  return typeof code === "number" && Number.isFinite(code) ? code : 1;
}

function tryParseEnvelope(value: string): XiaohongshuCliEnvelope | null {
  try {
    const parsed = JSON.parse(value.trim()) as unknown;
    const record = readRecord(parsed);
    if (Object.keys(record).length === 0) {
      return null;
    }
    return {
      ok: typeof record.ok === "boolean" ? record.ok : undefined,
      schema_version: readString(record.schema_version) || undefined,
      data: record.data,
      error: record.error,
    };
  } catch {
    return null;
  }
}

function normalizeSort(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized !== undefined && normalized.length > 0 ? normalized : "general";
}

function firstBoolean(
  record: Record<string, unknown>,
  keys: string[],
): boolean | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return null;
}

function firstString(
  record: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = readString(record[key]);
    if (value.length > 0) {
      return value;
    }
  }
  return "";
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

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

export function sanitizeDiagnostic(value: string, maxLength: number = MAX_STDERR_CHARS): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [redacted-secret]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[redacted-secret]")
    .replace(/(cookie|cookies?|x-s|x-t|authorization)\s*[:=]\s*["']?[^"'\s;]{8,}/gi, "$1=[redacted-secret]")
    .replace(/[A-Za-z]:\\Users\\[^\\\r\n]+/g, "[redacted-local-path]")
    .replace(/\/(?:Users|home)\/[^\s\r\n]+/g, "[redacted-local-path]")
    .replace(/\b[A-Za-z0-9_+/=-]{48,}\b/g, "[redacted-secret]")
    .slice(0, maxLength);
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
