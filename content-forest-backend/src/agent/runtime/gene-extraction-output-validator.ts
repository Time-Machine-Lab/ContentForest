import type { AgentTaskContext, AgentTaskOutput } from "./agent-task.js";
import { validateGeneExtractionSuggestions } from "../skills/gene-extraction-suggestion.js";

export function validateGeneExtractionAgentOutput(
  output: AgentTaskOutput,
  context: AgentTaskContext,
): AgentTaskOutput {
  if (context.taskType === "gene_extraction") {
    validateGeneExtractionSuggestions(output.content);
  }
  return output;
}
