import { ApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTrace } from "../runtime/agent-trace.js";
import type { LlmAdapter } from "../runtime/llm-adapter.js";
import {
  type BranchGrowthCandidateFruit,
  type BranchGrowthCandidateValidationOptions,
  validateBranchGrowthCandidateFruit,
} from "./branch-growth-candidate.js";

export interface BuildStructuredCandidateInput {
  llm: LlmAdapter;
  trace: AgentTrace;
  payloadMarkdown: string;
  rawGeneratorOutput: string;
  promptContext: string;
  validationOptions?: BranchGrowthCandidateValidationOptions;
  maxRepairAttempts?: number;
}

export async function buildStructuredBranchGrowthCandidate(
  input: BuildStructuredCandidateInput,
): Promise<BranchGrowthCandidateFruit> {
  const maxRepairAttempts = input.maxRepairAttempts ?? 1;
  let lastText = await askForCandidate(input);

  for (let attempt = 0; attempt <= maxRepairAttempts; attempt += 1) {
    try {
      const parsed = parseStructuredCandidate(lastText);
      const candidate = validateBranchGrowthCandidateFruit(
        parsed,
        input.validationOptions,
      );
      input.trace.record("skill_progress", "Branch growth candidate validated", {
        stage: "candidate_validation",
        repairAttempt: attempt,
      });
      return candidate;
    } catch (error) {
      const message = error instanceof Error ? error.message : "候选果实结构校验失败";
      input.trace.record("skill_progress", "Branch growth candidate validation failed", {
        stage: "candidate_validation_failed",
        repairAttempt: attempt,
        reason: truncate(message, 320),
      });

      if (attempt >= maxRepairAttempts) {
        throw new ApplicationError(
          "AGENT_SKILL_ERROR",
          `候选果实结构化输出校验失败: ${message}`,
          502,
        );
      }

      lastText = await askForRepair(input, lastText, message);
    }
  }

  throw new ApplicationError(
    "AGENT_SKILL_ERROR",
    "候选果实结构化输出校验失败",
    502,
  );
}

export function parseStructuredCandidate(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  let firstParsed: unknown | null = null;
  for (const candidateText of jsonCandidateTexts(cleaned)) {
    const parsed = tryParseJson(candidateText.trim());
    if (!parsed.ok) {
      continue;
    }
    firstParsed ??= parsed.value;
    if (isCandidateFruitLike(parsed.value)) {
      return parsed.value;
    }
  }

  if (firstParsed !== null) {
    return firstParsed;
  }

  throw new ApplicationError(
    "VALIDATION_ERROR",
    "模型未返回可解析的候选果实 JSON",
    502,
  );
}

async function askForCandidate(input: BuildStructuredCandidateInput): Promise<string> {
  input.trace.record("skill_progress", "Branch growth candidate submit requested", {
    stage: "candidate_submit",
  });
  const completion = await input.llm.complete({
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: [
          "你是内容森林的枝化生长结构化封装器。",
          "只输出一个 JSON 对象，不要输出解释文本。",
          "JSON 必须符合：{type:'candidate_fruit',payload:{markdown,rawGeneratorOutput,attachments},meta:{summary,geneTags,usedResourceRefs,routeId,routeSummary,mutationOperators,referenceUsage,riskHandlingSummary,factCheckSummary,riskWarnings,warnings}}。",
          "meta.summary 是果实标题，必须用 5 到 20 个字概括生成内容精华，只扣核心，不要写完整句子。",
          "summary 示例：ChopperBot切片神器、壁纸号爆款开场、低粉账号引流脚本。",
          "payload.markdown 必须是用户最终可见的发布内容，不要包含 <think>、候选分析、策略解释或中间推理。",
          "geneTags 应提取具体内容表达特征，例如选题角度、标题结构、情绪钩子、叙事方式、价值类型、平台适配或受众切口。",
          "routeId、routeSummary、mutationOperators、riskWarnings 只能记录本次候选的路线摘要、路线标识、突变算子和风险提示，不得声明已保存、已发布或已完成任务。",
          "referenceUsage 用来声明实际参考了哪些授权资源或参考原子；只声明确实落到候选果实里的项，无法确认时输出 [] 或 status:'unverified'。",
          "referenceUsage 每项必须包含 sourceType、resourceType、resourceId、status、atomIds、actions、slots、usageSummary、evidenceStrength、riskLevel。",
          "Prefer meta.referenceUsage: [] unless you can copy exact sourceType/resourceType/resourceId/atomIds/actions/slots from the provided reference plan. The backend will derive actual referenceUsage from usedResourceRefs and planned usage.",
          "Allowed referenceUsage.actions: ground, constrain, shape, style, inherit, adapt, combine, mutate, criticize, avoid. Allowed referenceUsage.slots: title_hook, opening, audience_scenario, body_structure, script_or_shot, visual_audio, proof_evidence, wording_style, cta_conversion, risk_review, fact_check. Do not invent labels such as derive/extract/cite/quote or Chinese resource-category labels.",
          "如果使用了高风险、广告 brief、论文候选主张或 fact_check/risk_review 相关参考，必须填写 riskHandlingSummary 或 factCheckSummary。",
          "warnings 可以记录本次探索方向摘要、内容边界或不确定性，但不要声明系统事实。",
          "usedResourceRefs 必须是对象数组，每项格式为 {\"resourceType\":\"nutrient\"|\"nutrient_card\"|\"media\"|\"gene\",\"resourceId\":\"资源ID\"}，不要只输出字符串数组。",
          `本次唯一允许写入 usedResourceRefs 的资源引用是：${formatAllowedResourceRefs(input.validationOptions)}。`,
          "生成器名称、生成器 Skill、生成器内部 references 文件都不是 gene 或 nutrient，禁止写入 usedResourceRefs。",
          "如果不能确认使用了允许列表中的某个资源，usedResourceRefs 输出空数组。",
          "示例：{\"type\":\"candidate_fruit\",\"payload\":{\"markdown\":\"# 正文\",\"rawGeneratorOutput\":\"# 正文\",\"attachments\":[]},\"meta\":{\"summary\":\"摘要标题\",\"geneTags\":[\"表达特征\"],\"usedResourceRefs\":[{\"resourceType\":\"gene\",\"resourceId\":\"gene_1\"}],\"routeId\":\"route-1\",\"routeSummary\":\"路线摘要\",\"mutationOperators\":[\"叙事机制变异\"],\"referenceUsage\":[],\"riskHandlingSummary\":null,\"factCheckSummary\":null,\"riskWarnings\":[\"不要伪造案例\"],\"warnings\":[]}}",
          "不要声明已保存果实、已完成任务等系统事实。",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "请将生成器 payload 封装成候选果实结构。",
          `生成器 payload:\n${truncate(input.payloadMarkdown, 6000)}`,
          `上下文:\n${truncate(input.promptContext, 4000)}`,
        ].join("\n\n"),
      },
    ],
  });
  return completion.content;
}

async function askForRepair(
  input: BuildStructuredCandidateInput,
  previousText: string,
  validationError: string,
): Promise<string> {
  input.trace.record("skill_progress", "Branch growth candidate repair requested", {
    stage: "candidate_repair",
  });
  const repaired = await input.llm.complete({
    temperature: 0,
    messages: [
      {
        role: "system",
        content: [
          "你是 JSON 结构修复器。",
          "只修复结构化格式和缺失字段，不要重新创作内容，不要声明系统事实。",
          "meta.summary 必须修复为 5 到 20 个字的果实标题，只保留内容精华。",
          "如果 payload.markdown 含有 <think>、候选分析、策略解释或中间推理，请删除这些内容，只保留用户可见正文。",
          "只输出一个 JSON 对象。",
          "输出必须符合候选果实结构，usedResourceRefs 必须是对象数组：[{\"resourceType\":\"media\",\"resourceId\":\"media-asset_1\"}]；referenceUsage 必须只引用授权资源；routeId、routeSummary、mutationOperators、riskWarnings 为候选 meta，不得声明系统事实。",
          "If referenceUsage contains invalid actions, invalid slots, old enum names, or Chinese category labels, set referenceUsage to [] and keep only authorized usedResourceRefs. The backend will reconstruct actual usage from the plan.",
          "If high-risk usage is kept, include riskHandlingSummary or factCheckSummary. If you are unsure, set referenceUsage to [].",
          `本次唯一允许写入 usedResourceRefs 的资源引用是：${formatAllowedResourceRefs(input.validationOptions)}。`,
          "如果原始输出包含未授权资源引用，请删除该引用，或仅替换为允许列表中真实匹配的引用；禁止编造资源 ID。",
          "生成器名称、生成器 Skill、生成器内部 references 文件都不是 gene 或 nutrient，禁止写入 usedResourceRefs。",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `校验错误：${truncate(validationError, 1200)}`,
          `原始输出：\n${truncate(previousText, 6000)}`,
          `原始 payload：\n${truncate(input.payloadMarkdown, 6000)}`,
        ].join("\n\n"),
      },
    ],
  });
  return repaired.content;
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

function jsonCandidateTexts(text: string): string[] {
  return [
    text,
    ...extractFencedBlocks(text),
    ...extractBalancedJsonObjects(text),
  ];
}

function extractFencedBlocks(text: string): string[] {
  const blocks: string[] = [];
  const pattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  for (const match of text.matchAll(pattern)) {
    if (match[1] !== undefined) {
      blocks.push(match[1]);
    }
  }
  return blocks;
}

function extractBalancedJsonObjects(text: string): string[] {
  const objects: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }
    if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return objects;
}

function isCandidateFruitLike(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { type?: unknown }).type === "candidate_fruit"
  );
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function formatAllowedResourceRefs(
  options: BranchGrowthCandidateValidationOptions | undefined,
): string {
  const refs = options?.authorizedResourceRefs ?? [];
  if (refs.length === 0) {
    return "[]";
  }
  return JSON.stringify(
    refs.map((ref) => ({
      resourceType: ref.resourceType,
      resourceId: ref.resourceId,
    })),
  );
}
