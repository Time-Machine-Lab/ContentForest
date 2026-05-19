import type { NetworkResearchRequest, ResearchQueryPlan } from "./types.js";

const PLATFORM_ALIASES: Array<{ platform: string; tokens: string[] }> = [
  { platform: "小红书", tokens: ["小红书", "xhs", "xiaohongshu", "rednote"] },
  { platform: "抖音", tokens: ["抖音", "douyin"] },
  { platform: "TikTok", tokens: ["tiktok", "tik tok"] },
  { platform: "Instagram", tokens: ["instagram", "ins", "reels"] },
  { platform: "YouTube", tokens: ["youtube", "yt"] },
  { platform: "X", tokens: ["twitter", "推特", " x ", "x.com"] },
  { platform: "B站", tokens: ["b站", "bilibili"] },
];

const QUERY_NOISE = [
  "搜索",
  "查找",
  "找到",
  "找几篇",
  "找几条",
  "找一下",
  "给我",
  "帮我",
  "关于",
  "相关的",
  "相关",
  "有哪些",
  "从各种方向考察",
  "各种方向考察",
  "挑选",
  "作为爆款文章案例",
  "作为案例",
  "总结出相应的规则",
  "总结相应规则",
  "相应的规则",
  "并",
  "保留案例",
  "梳理核心",
  "梳理出核心",
  "梳理出爆款核心",
  "梳理爆款核心",
  "5~10篇",
  "5-10篇",
  "5 到 10 篇",
  "5到10篇",
];

const TASK_NOISE_PATTERNS = [
  /找(?:几|[一二三四五六七八九十\d]+)?[篇条个]?/gu,
  /保留(?:一下)?案例/gu,
  /梳理(?:出)?(?:爆款)?核心/gu,
  /从各种方向考察/gu,
  /挑选/gu,
  /作为(?:爆款文章)?案例/gu,
  /总结(?:出)?(?:相应的)?规则/gu,
  /(?:^|\s)并(?:\s|$)/gu,
  /\d+\s*(?:~|-|到)\s*\d+\s*[篇条个]/gu,
  /[，,。.!！?？]/gu,
];

export function planNetworkResearch(
  request: NetworkResearchRequest,
): ResearchQueryPlan {
  const text = normalizeSpaces(request.request);
  const targetPlatform = normalizeOptional(request.targetPlatform) ?? inferPlatform(text);
  const contentObject = extractContentObject(text, targetPlatform);
  const intent = inferIntent(text);
  const expectedResultCount = inferExpectedResultCount(text);
  const queries = buildQueries({
    text,
    targetPlatform,
    contentObject,
    seedTitle: normalizeOptional(request.seedTitle),
    nutrientCardTitle: normalizeOptional(request.nutrientCardTitle),
  });

  return {
    intent,
    targetPlatform,
    contentObject,
    queries,
    siteSearchQueries: buildSiteSearchQueries({
      text,
      targetPlatform,
      contentObject,
      intent,
    }),
    requestedDeepExploration: request.deepExploration === true || inferDeepExploration(text),
    expectedResultCount,
    notes: [
      "查询规划会优先保留平台、内容对象和案例意图。",
      "查询规划会清洗找几篇、保留案例、梳理核心等任务指令噪声。",
      "种子标题不会被无差别拼接进所有查询，避免污染平台研究。",
    ],
  };
}

function buildQueries(input: {
  text: string;
  targetPlatform: string | null;
  contentObject: string;
  seedTitle: string | null;
  nutrientCardTitle: string | null;
}): string[] {
  const platform = input.targetPlatform ?? "";
  const object = input.contentObject || input.nutrientCardTitle || input.seedTitle || input.text;
  const queries = [
    [platform, object, "爆款案例"],
    [platform, object, "内容打法", "拆解"],
    [platform, object, "标题", "封面", "评论区"],
    [platform, object, "种草", "安利"],
  ]
    .map((parts) => normalizeSpaces(parts.filter(Boolean).join(" ")))
    .filter((query) => query.length > 0);

  if (queries.length === 0) {
    return [input.text.slice(0, 160)];
  }
  return [...new Set(queries)].slice(0, 4);
}

function buildSiteSearchQueries(input: {
  text: string;
  targetPlatform: string | null;
  contentObject: string;
  intent: ResearchQueryPlan["intent"];
}): string[] {
  const object = input.contentObject || stripTaskNoise(input.text);
  const intentWords = input.intent === "platform_cases"
    ? ["爆款", "案例", "种草", "安利"]
    : input.intent === "trend"
      ? ["最近", "趋势"]
      : ["经验", "打法"];
  const queries = [
    [object, ...intentWords.slice(0, 2)],
    [object, ...intentWords.slice(2)],
    [object, "标题", "封面"],
  ]
    .map((parts) => normalizeSpaces(parts.filter(Boolean).join(" ")))
    .filter((query) => query.length > 0);
  return [...new Set(queries)].slice(0, 3);
}

function inferPlatform(text: string): string | null {
  const lowered = ` ${text.toLowerCase()} `;
  for (const entry of PLATFORM_ALIASES) {
    if (entry.tokens.some((token) => lowered.includes(token.toLowerCase()))) {
      return entry.platform;
    }
  }
  return null;
}

function inferIntent(text: string): ResearchQueryPlan["intent"] {
  if (/爆款|案例|帖子|视频|内容/.test(text)) {
    return "platform_cases";
  }
  if (/规则|指南|规范|潜规则|引流/.test(text)) {
    return "platform_rules";
  }
  if (/趋势|最近|新潮|近期/.test(text)) {
    return "trend";
  }
  return "general";
}

function extractContentObject(text: string, platform: string | null): string {
  const quoted = extractQuotedKeyword(text);
  if (quoted.length > 0) {
    return quoted.slice(0, 80);
  }
  let result = text;
  if (platform !== null) {
    result = result.replaceAll(platform, " ");
  }
  result = stripTaskNoise(result);
  for (const noise of QUERY_NOISE) {
    result = result.replaceAll(noise, " ");
  }
  result = normalizeSpaces(result)
    .replace(/[,，。.!！?？]/g, " ")
    .trim();
  return normalizeSpaces(result).slice(0, 80);
}

function extractQuotedKeyword(text: string): string {
  const match = /["“'‘]([^"”'’]{2,80})["”'’]/u.exec(text);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function stripTaskNoise(text: string): string {
  let result = text;
  for (const pattern of TASK_NOISE_PATTERNS) {
    result = result.replace(pattern, " ");
  }
  return normalizeSpaces(result);
}

function inferDeepExploration(text: string): boolean {
  return /深入|打开|查看详情|站内|具体帖子|具体文章|真实案例|案例/.test(text);
}

function inferExpectedResultCount(text: string): number | null {
  const range = /(\d+)\s*(?:~|-|到)\s*(\d+)\s*[篇条个]/u.exec(text);
  if (range !== null) {
    return Number.parseInt(range[2] ?? range[1] ?? "", 10) || null;
  }
  const single = /(\d+)\s*[篇条个]/u.exec(text);
  if (single !== null) {
    return Number.parseInt(single[1] ?? "", 10) || null;
  }
  return null;
}

function normalizeOptional(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = normalizeSpaces(value);
  return normalized.length === 0 ? null : normalized;
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
