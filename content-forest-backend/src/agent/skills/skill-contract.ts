import type {
  AgentTaskContext,
  AgentTaskOutput,
  AgentTaskStreamEvent,
  AgentTaskType,
} from "../runtime/agent-task.js";
import type { AgentTrace } from "../runtime/agent-trace.js";
import type { LlmAdapter } from "../runtime/llm-adapter.js";
import type { ToolCaller } from "../runtime/tool-contract.js";

export interface SkillExecutionInput {
  context: AgentTaskContext;
  tools: ToolCaller;
  llm: LlmAdapter;
  trace: AgentTrace;
  emit?: (event: AgentTaskStreamEvent) => void | Promise<void>;
}

export interface SkillContract {
  name: string;
  description: string;
  supportedTaskTypes: AgentTaskType[];
  execute(input: SkillExecutionInput): Promise<AgentTaskOutput>;
}
