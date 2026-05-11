import { ApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTaskOutput, AgentTaskType } from "../runtime/agent-task.js";
import type { ToolCaller } from "../runtime/tool-contract.js";
import {
  READ_GENE_EVIDENCE_TOOL_NAME,
  READ_GENE_SEED_CONTEXT_TOOL_NAME,
  READ_REFERABLE_GENE_INSIGHTS_TOOL_NAME,
} from "../tools/read-gene-context-tool.js";
import { buildStructuredGeneExtractionSuggestions } from "./gene-extraction-structured-output.js";
import {
  geneSuggestionsToAgentSuggestions,
  type StructuredGeneExtractionSuggestions,
} from "./gene-extraction-suggestion.js";
import type { SkillContract, SkillExecutionInput } from "./skill-contract.js";
import { CONTENT_EVOLUTION_ALGORITHM_VERSION } from "./content-evolution-strategy.js";

export class GeneExtractionSkill implements SkillContract {
  public readonly name = "gene_extraction";
  public readonly description =
    "Built-in gene extraction skill that turns authorized evidence into user-confirmable gene suggestions.";
  public readonly supportedTaskTypes: AgentTaskType[] = ["gene_extraction"];

  public async execute(input: SkillExecutionInput): Promise<AgentTaskOutput> {
    input.trace.record("skill_progress", "Gene extraction started", {
      stage: "gene_extraction_started",
      algorithmVersion: CONTENT_EVOLUTION_ALGORITHM_VERSION,
      seedId: readOptionalString(input.context.input.seedId),
    });

    const [seed, evidence, insights] = await Promise.all([
      readToolRecord(input.tools, READ_GENE_SEED_CONTEXT_TOOL_NAME, {}),
      readToolRecord(input.tools, READ_GENE_EVIDENCE_TOOL_NAME, {}),
      readToolRecord(input.tools, READ_REFERABLE_GENE_INSIGHTS_TOOL_NAME, {}),
    ]);
    input.trace.record("skill_progress", "Gene extraction context loaded", {
      stage: "gene_context_loaded",
      algorithmVersion: CONTENT_EVOLUTION_ALGORITHM_VERSION,
      evidenceCount: countArray(evidence.evidence),
      unsupportedEvidenceCount: countArray(evidence.unsupportedEvidence),
      insightCount: countArray(insights.insights),
    });

    const structured = await buildStructuredGeneExtractionSuggestions({
      llm: input.llm,
      trace: input.trace,
      promptContext: buildPromptContext({
        seed,
        evidence,
        insights,
        taskInput: input.context.input,
      }),
      maxRepairAttempts: 1,
    });

    return {
      taskType: "gene_extraction",
      content: withConsumableMarkdown(structured),
      metadata: {
        skillName: this.name,
        algorithmVersion: CONTENT_EVOLUTION_ALGORITHM_VERSION,
      },
    };
  }
}

function withConsumableMarkdown(
  structured: StructuredGeneExtractionSuggestions,
): StructuredGeneExtractionSuggestions {
  const agentSuggestions = geneSuggestionsToAgentSuggestions(structured);
  return {
    type: "gene_extraction_suggestions",
    suggestions: structured.suggestions.map((suggestion, index) => ({
      ...suggestion,
      title: agentSuggestions[index]?.title ?? suggestion.title,
      bodyMarkdown: agentSuggestions[index]?.bodyMarkdown ?? suggestion.bodyMarkdown,
      polarity: agentSuggestions[index]?.polarity ?? suggestion.polarity,
      lineage: agentSuggestions[index]?.lineage ?? suggestion.lineage,
      niche: agentSuggestions[index]?.niche ?? suggestion.niche,
      evidenceInterpretation:
        agentSuggestions[index]?.evidenceInterpretation ??
        suggestion.evidenceInterpretation,
      nextRoundUsage:
        agentSuggestions[index]?.nextRoundUsage ?? suggestion.nextRoundUsage,
      similarityRelation:
        agentSuggestions[index]?.similarityRelation ?? suggestion.similarityRelation,
      relatedInsightIds:
        agentSuggestions[index]?.relatedInsightIds ?? suggestion.relatedInsightIds,
      warnings: agentSuggestions[index]?.warnings ?? suggestion.warnings,
    })),
  };
}

async function readToolRecord(
  tools: ToolCaller,
  name: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const output = await tools.callTool(name, input);
  if (
    typeof output.content !== "object" ||
    output.content === null ||
    Array.isArray(output.content)
  ) {
    throw new ApplicationError(
      "AGENT_TOOL_ERROR",
      `Tool ${name} returned invalid content`,
      500,
    );
  }
  return output.content as Record<string, unknown>;
}

function buildPromptContext(input: {
  seed: Record<string, unknown>;
  evidence: Record<string, unknown>;
  insights: Record<string, unknown>;
  taskInput: Record<string, unknown>;
}): string {
  return [
    "## Content Evolution Algorithm Version",
    CONTENT_EVOLUTION_ALGORITHM_VERSION,
    "",
    "## Task Boundary",
    "You may only use the seed, evidence, and referable gene insights provided below.",
    "You are producing pending gene hypothesis suggestions for the user to review. Do not save or confirm anything.",
    "A gene is a testable content expression hypothesis, not a generic tag.",
    "Each suggestion should help the next branch growth decide whether to inherit, strengthen, mutate, combine, or avoid a trait.",
    "",
    "## Seed Context",
    JSON.stringify(sanitizeForPrompt(input.seed), null, 2),
    "",
    "## Evidence Context",
    JSON.stringify(sanitizeForPrompt(input.evidence), null, 2),
    "",
    "## Referable Existing Gene Insights",
    JSON.stringify(sanitizeForPrompt(input.insights), null, 2),
    "",
    "## Extraction Input Meta",
    JSON.stringify(
      sanitizeForPrompt({
        reasonContext: input.taskInput.reasonContext,
        evidenceSources: input.taskInput.evidenceSources,
        referableGeneInsights: input.taskInput.referableGeneInsights,
      }),
      null,
      2,
    ),
  ].join("\n");
}

function sanitizeForPrompt(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, redactPathLikeValues)) as unknown;
}

function redactPathLikeValues(_key: string, value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  if (/[a-zA-Z]:\\|\/Users\/|\/home\/|\/var\/|\/tmp\//.test(value)) {
    return "[redacted-path]";
  }
  if (value.length > 4000) {
    return `${value.slice(0, 4000)}...`;
  }
  return value;
}

function readOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}
