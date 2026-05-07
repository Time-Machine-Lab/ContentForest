import { ApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTrace } from "../runtime/agent-trace.js";
import type { LlmAdapter } from "../runtime/llm-adapter.js";
import {
  type StructuredGeneExtractionSuggestions,
  validateGeneExtractionSuggestions,
} from "./gene-extraction-suggestion.js";

export interface BuildStructuredGeneExtractionSuggestionsInput {
  llm: LlmAdapter;
  trace: AgentTrace;
  promptContext: string;
  maxRepairAttempts?: number;
}

export async function buildStructuredGeneExtractionSuggestions(
  input: BuildStructuredGeneExtractionSuggestionsInput,
): Promise<StructuredGeneExtractionSuggestions> {
  const maxRepairAttempts = input.maxRepairAttempts ?? 1;
  let lastText = await askForSuggestions(input);

  for (let attempt = 0; attempt <= maxRepairAttempts; attempt += 1) {
    try {
      const parsed = parseStructuredGeneExtractionSuggestions(lastText);
      const suggestions = validateGeneExtractionSuggestions(parsed);
      input.trace.record("skill_progress", "Gene extraction suggestions validated", {
        stage: "gene_suggestions_validation",
        repairAttempt: attempt,
      });
      return suggestions;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gene extraction suggestions validation failed";
      input.trace.record(
        "skill_progress",
        "Gene extraction suggestions validation failed",
        {
          stage: "gene_suggestions_validation_failed",
          repairAttempt: attempt,
          reason: truncate(message, 320),
        },
      );

      if (attempt >= maxRepairAttempts) {
        throw new ApplicationError(
          "AGENT_SKILL_ERROR",
          `Gene extraction structured output validation failed: ${message}`,
          502,
        );
      }

      lastText = await askForRepair(input, lastText, message);
    }
  }

  throw new ApplicationError(
    "AGENT_SKILL_ERROR",
    "Gene extraction structured output validation failed",
    502,
  );
}

export function parseStructuredGeneExtractionSuggestions(text: string): unknown {
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
    "Model did not return parseable gene extraction JSON",
    502,
  );
}

async function askForSuggestions(
  input: BuildStructuredGeneExtractionSuggestionsInput,
): Promise<string> {
  input.trace.record("skill_progress", "Gene extraction submit requested", {
    stage: "gene_suggestions_submit",
  });
  const completion = await input.llm.complete({
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: [
          "You are the built-in Content Forest gene extraction skill.",
          "Extract reusable content genes from authorized evidence only.",
          "Return exactly one JSON object and no prose.",
          "The JSON shape must be: {\"type\":\"gene_extraction_suggestions\",\"suggestions\":[{\"title\":\"...\",\"bodyMarkdown\":\"...\",\"polarity\":\"positive|negative\",\"evidenceInterpretation\":\"...\",\"lineage\":\"...\",\"niche\":\"...\",\"similarityRelation\":\"new|reinforces|branches|conflicts\",\"relatedInsightIds\":[],\"warnings\":[]}]}",
          "Return 1 to 3 suggestions.",
          "Positive genes describe traits worth preserving or strengthening.",
          "Negative genes describe traits to avoid or suppress.",
          "Similarity relation is only a hint for user confirmation. Do not merge or confirm genes.",
          "Do not claim that anything was saved, written, confirmed, archived, or changed in the system.",
        ].join("\n"),
      },
      {
        role: "user",
        content: truncate(input.promptContext, 12000),
      },
    ],
  });
  return completion.content;
}

async function askForRepair(
  input: BuildStructuredGeneExtractionSuggestionsInput,
  previousText: string,
  validationError: string,
): Promise<string> {
  input.trace.record("skill_progress", "Gene extraction repair requested", {
    stage: "gene_suggestions_repair",
  });
  const repaired = await input.llm.complete({
    temperature: 0,
    messages: [
      {
        role: "system",
        content: [
          "You repair JSON structure for gene extraction suggestions.",
          "Only fix structure, missing fields, invalid enum values, or forbidden claims.",
          "Do not invent system state. Return exactly one JSON object.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `Validation error:\n${truncate(validationError, 1200)}`,
          `Previous output:\n${truncate(previousText, 6000)}`,
          `Original authorized context:\n${truncate(input.promptContext, 6000)}`,
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
