import type { AgentTask, AgentTaskResult } from "../runtime/agent-task.js";

export interface AgentPort {
  runTask(task: AgentTask): Promise<AgentTaskResult>;
}
