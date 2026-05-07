import { ApplicationError } from "../../shared/errors/application-error.js";
import type { GeneExtractionAgentSuggestion } from "../../modules/gene/domain/gene-types.js";

export const GENE_SUGGESTION_POLARITIES = {
  positive: "positive",
  negative: "negative",
} as const;

export type GeneSuggestionPolarity =
  (typeof GENE_SUGGESTION_POLARITIES)[keyof typeof GENE_SUGGESTION_POLARITIES];

export const GENE_SIMILARITY_RELATIONS = {
  new: "new",
  reinforces: "reinforces",
  branches: "branches",
  conflicts: "conflicts",
} as const;

export type GeneSimilarityRelation =
  (typeof GENE_SIMILARITY_RELATIONS)[keyof typeof GENE_SIMILARITY_RELATIONS];

export interface StructuredGeneExtractionSuggestion {
  title: string;
  bodyMarkdown: string;
  polarity: GeneSuggestionPolarity;
  evidenceInterpretation: string;
  lineage: string;
  niche: string;
  similarityRelation: GeneSimilarityRelation;
  relatedInsightIds: string[];
  warnings: string[];
}

export interface StructuredGeneExtractionSuggestions {
  type: "gene_extraction_suggestions";
  suggestions: StructuredGeneExtractionSuggestion[];
}

export function validateGeneExtractionSuggestions(
  value: unknown,
): StructuredGeneExtractionSuggestions {
  const output = normalizeGeneExtractionSuggestions(value);
  const errors: string[] = [];

  if (output.suggestions.length < 1 || output.suggestions.length > 3) {
    errors.push("suggestions length must be between 1 and 3");
  }

  const serialized = JSON.stringify(output);
  if (containsRealPath(serialized)) {
    errors.push("gene suggestions cannot contain real local file paths");
  }
  if (/已写入基因库|已确认基因经验|已保存基因|已修改系统事实|database updated|gene saved/i.test(serialized)) {
    errors.push("gene suggestions cannot claim system facts");
  }

  for (const [index, suggestion] of output.suggestions.entries()) {
    const prefix = `suggestions[${index}]`;
    if (suggestion.title.trim().length === 0) {
      errors.push(`${prefix}.title is required`);
    }
    if (suggestion.bodyMarkdown.trim().length === 0) {
      errors.push(`${prefix}.bodyMarkdown is required`);
    }
    if (suggestion.evidenceInterpretation.trim().length === 0) {
      errors.push(`${prefix}.evidenceInterpretation is required`);
    }
  }

  if (errors.length > 0) {
    throw new ApplicationError("VALIDATION_ERROR", errors.join("; "), 502);
  }

  return {
    type: "gene_extraction_suggestions",
    suggestions: output.suggestions.map((suggestion) => ({
      title: suggestion.title.trim(),
      bodyMarkdown: suggestion.bodyMarkdown.trim(),
      polarity: suggestion.polarity,
      evidenceInterpretation: suggestion.evidenceInterpretation.trim(),
      lineage: suggestion.lineage.trim(),
      niche: suggestion.niche.trim(),
      similarityRelation: suggestion.similarityRelation,
      relatedInsightIds: uniqueStrings(suggestion.relatedInsightIds),
      warnings: uniqueStrings(suggestion.warnings),
    })),
  };
}

export function normalizeGeneExtractionSuggestions(
  value: unknown,
): StructuredGeneExtractionSuggestions {
  const record = requireRecord(value, "gene extraction output must be an object");
  const rawSuggestions = Array.isArray(record.suggestions)
    ? record.suggestions
    : record.type === "gene_extraction_suggestions" && Array.isArray(record.items)
      ? record.items
      : null;
  if (rawSuggestions === null) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "gene extraction output must contain suggestions",
      502,
    );
  }

  return {
    type: "gene_extraction_suggestions",
    suggestions: rawSuggestions.map(normalizeSuggestion),
  };
}

export function geneSuggestionsToAgentSuggestions(
  value: unknown,
): GeneExtractionAgentSuggestion[] {
  const output = validateGeneExtractionSuggestions(value);
  return output.suggestions.map((suggestion) => ({
    title: suggestion.title,
    bodyMarkdown: formatSuggestionMarkdown(suggestion),
    lineage: suggestion.lineage,
    niche: suggestion.niche,
    evidenceInterpretation: suggestion.evidenceInterpretation,
  }));
}

function normalizeSuggestion(value: unknown): StructuredGeneExtractionSuggestion {
  const record = requireRecord(value, "gene suggestion must be an object");
  return {
    title: requireString(record.title, "gene suggestion title is required"),
    bodyMarkdown: requireString(
      record.bodyMarkdown,
      "gene suggestion bodyMarkdown is required",
    ),
    polarity: normalizePolarity(record.polarity),
    evidenceInterpretation: typeof record.evidenceInterpretation === "string"
      ? record.evidenceInterpretation
      : "",
    lineage: typeof record.lineage === "string" ? record.lineage : "",
    niche: typeof record.niche === "string" ? record.niche : "",
    similarityRelation: normalizeSimilarityRelation(record.similarityRelation),
    relatedInsightIds: normalizeStringArray(record.relatedInsightIds),
    warnings: normalizeStringArray(record.warnings),
  };
}

function normalizePolarity(value: unknown): GeneSuggestionPolarity {
  if (value === GENE_SUGGESTION_POLARITIES.positive) {
    return value;
  }
  if (value === GENE_SUGGESTION_POLARITIES.negative) {
    return value;
  }
  throw new ApplicationError("VALIDATION_ERROR", "gene suggestion polarity is invalid", 502);
}

function normalizeSimilarityRelation(value: unknown): GeneSimilarityRelation {
  if (
    value === GENE_SIMILARITY_RELATIONS.new ||
    value === GENE_SIMILARITY_RELATIONS.reinforces ||
    value === GENE_SIMILARITY_RELATIONS.branches ||
    value === GENE_SIMILARITY_RELATIONS.conflicts
  ) {
    return value;
  }
  throw new ApplicationError(
    "VALIDATION_ERROR",
    "gene suggestion similarityRelation is invalid",
    502,
  );
}

function formatSuggestionMarkdown(
  suggestion: StructuredGeneExtractionSuggestion,
): string {
  return [
    suggestion.bodyMarkdown.trim(),
    "",
    "## 结构化判断",
    `- 基因方向：${suggestion.polarity === "positive" ? "正向基因" : "反向基因"}`,
    `- 相似关系：${formatSimilarityRelation(suggestion.similarityRelation)}`,
    suggestion.relatedInsightIds.length > 0
      ? `- 相关既有基因：${suggestion.relatedInsightIds.join(", ")}`
      : null,
    "",
    "## 证据解释",
    suggestion.evidenceInterpretation.trim(),
  ]
    .filter((item): item is string => item !== null)
    .join("\n");
}

function formatSimilarityRelation(relation: GeneSimilarityRelation): string {
  if (relation === "reinforces") {
    return "强化已有基因";
  }
  if (relation === "branches") {
    return "从已有基因分叉";
  }
  if (relation === "conflicts") {
    return "与已有基因冲突";
  }
  return "新增基因";
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApplicationError("VALIDATION_ERROR", message, 502);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new ApplicationError("VALIDATION_ERROR", message, 502);
  }
  return value;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function containsRealPath(value: string): boolean {
  return /[a-zA-Z]:\\|\/Users\/|\/home\/|\/var\/|\/tmp\//.test(value);
}
