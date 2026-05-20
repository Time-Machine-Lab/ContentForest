import type { AgentTaskContext, AgentTaskOutput } from "./agent-task.js";
import { validateBranchGrowthCandidateFruit } from "../skills/branch-growth-candidate.js";

export function validateBranchGrowthAgentOutput(
  output: AgentTaskOutput,
  context: AgentTaskContext,
): AgentTaskOutput {
  if (context.taskType === "growth" && isCandidateFruitContent(output.content)) {
    output.content = validateBranchGrowthCandidateFruit(output.content);
  }
  return output;
}

function isCandidateFruitContent(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).type === "candidate_fruit"
  );
}
