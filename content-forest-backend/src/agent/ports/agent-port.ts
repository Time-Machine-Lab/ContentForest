import type { AgentTask, AgentTaskResult, AgentTaskStreamEvent } from "../runtime/agent-task.js";

export interface AgentPort {
  runTask(task: AgentTask): Promise<AgentTaskResult>;
  streamTask?(task: AgentTask): AsyncGenerator<AgentTaskStreamEvent, AgentTaskResult>;
}
