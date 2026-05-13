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
  "找一下",
  "关于",
  "帖子",
  "视频",
  "爆款",
  "案例",
  "5~10篇",
  "5-10篇",
  "5 到 10 篇",
  "5到10篇",
];

export function planNetworkResearch(
  request: NetworkResearchRequest,
): ResearchQueryPlan {
  const text = normalizeSpaces(request.request);
  const targetPlatform = normalizeOptional(request.targetPlatform) ?? inferPlatform(text);
  const contentObject = extractContentObject(text, targetPlatform);
  const intent = inferIntent(text);
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
    notes: [
      "查询规划会优先保留平台、内容对象和案例意图。",
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
    [platform, object, "爆款", "案例"],
    [platform, object, "内容打法"],
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
  let result = text;
  if (platform !== null) {
    result = result.replaceAll(platform, " ");
  }
  for (const noise of QUERY_NOISE) {
    result = result.replaceAll(noise, " ");
  }
  result = normalizeSpaces(result)
    .replace(/[,，。.!！?？]/g, " ")
    .trim();
  return normalizeSpaces(result).slice(0, 80);
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
