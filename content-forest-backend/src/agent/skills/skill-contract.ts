import type {
  AgentTaskContext,
  AgentTaskOutput,
  AgentTaskType,
} from "../runtime/agent-task.js";
import type { LlmAdapter } from "../runtime/llm-adapter.js";
import type { ToolCaller } from "../runtime/tool-contract.js";

export interface SkillExecutionInput {
  context: AgentTaskContext;
  tools: ToolCaller;
  llm: LlmAdapter;
}

export interface SkillContract {
  name: string;
  description: string;
  supportedTaskTypes: AgentTaskType[];
  execute(input: SkillExecutionInput): Promise<AgentTaskOutput>;
}
