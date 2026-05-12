import { ApplicationError } from "../../shared/errors/application-error.js";

export interface NutrientResearchDepositableBlock {
  title: string;
  markdown: string;
}

export interface NutrientResearchOutput {
  type: "nutrient_research_result";
  message: string;
  depositableBlocks: NutrientResearchDepositableBlock[];
}

export function validateNutrientResearchOutput(value: unknown): NutrientResearchOutput {
  const record = requireRecord(value, "营养研究输出必须是对象");
  if (record.type !== "nutrient_research_result") {
    throw new ApplicationError("VALIDATION_ERROR", "营养研究输出类型不正确", 502);
  }
  const message = requireString(record.message, "营养研究回复不能为空");
  const blocks = Array.isArray(record.depositableBlocks)
    ? record.depositableBlocks.map((item) => {
        const block = requireRecord(item, "可沉淀营养块必须是对象");
        return {
          title: requireString(block.title, "可沉淀营养标题不能为空"),
          markdown: requireString(block.markdown, "可沉淀营养正文不能为空"),
        };
      })
    : [];
  if (message.length === 0 && blocks.length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", "营养研究输出不能为空", 502);
  }
  return {
    type: "nutrient_research_result",
    message,
    depositableBlocks: blocks,
  };
}

export function parseNutrientResearchJson(text: string): unknown {
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
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const parsed = tryParseJson(cleaned.slice(start, end + 1));
    if (parsed.ok) {
      return parsed.value;
    }
  }
  throw new ApplicationError("VALIDATION_ERROR", "模型未返回可解析的营养研究 JSON", 502);
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApplicationError("VALIDATION_ERROR", message, 502);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", message, 502);
  }
  return value.trim();
}
