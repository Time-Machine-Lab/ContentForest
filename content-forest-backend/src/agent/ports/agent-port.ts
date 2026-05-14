import type {
  AgentTask,
  AgentTaskResult,
  AgentTaskRunOptions,
  AgentTaskStreamEvent,
} from "../runtime/agent-task.js";

export interface AgentPort {
  runTask(task: AgentTask, options?: AgentTaskRunOptions): Promise<AgentTaskResult>;
  streamTask?(
    task: AgentTask,
    options?: AgentTaskRunOptions,
  ): AsyncGenerator<AgentTaskStreamEvent, AgentTaskResult>;
}
