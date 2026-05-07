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
  const direct = tryParseJson(cleaned);
  if (direct.ok) {
    return direct.value;
  }

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(cleaned);
  if (fenced?.[1] !== undefined) {
    const parsed = tryParseJson(fenced[1].trim());
    if (parsed.ok) {
      return parsed.value;
    }
  }

  const objectText = extractFirstJsonObject(cleaned);
  if (objectText !== null) {
    const parsed = tryParseJson(objectText);
    if (parsed.ok) {
      return parsed.value;
    }
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
          "JSON 必须符合：{type:'candidate_fruit',payload:{markdown,rawGeneratorOutput,attachments},meta:{summary,geneTags,usedResourceRefs,warnings}}。",
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
          "只输出一个 JSON 对象。",
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

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}
