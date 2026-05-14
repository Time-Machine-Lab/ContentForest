export const AGENT_TASK_TYPES = [
  "growth",
  "gene_extraction",
  "seed_brief",
  "nutrient_research",
] as const;

export type AgentTaskType = typeof AGENT_TASK_TYPES[number];

export interface AgentTaskInput {
  [key: string]: unknown;
}

export interface AgentTask {
  taskId?: string;
  type: string;
  input: AgentTaskInput;
  skillName?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTaskContext {
  taskId: string;
  taskType: AgentTaskType;
  input: AgentTaskInput;
  metadata: Record<string, unknown>;
  startedAt: string;
  abortSignal?: AbortSignal;
}

export interface AgentTaskRunOptions {
  signal?: AbortSignal;
}

export interface AgentTaskOutput {
  taskType?: string;
  content: unknown;
  metadata?: Record<string, unknown>;
}

export type AgentTaskStreamEvent =
  | {
    type: "thought_delta";
    delta: string;
  }
  | {
    type: "message_delta";
    delta: string;
  }
  | {
    type: "nutrient_block_started";
    title: string;
  }
  | {
    type: "nutrient_block_delta";
    title: string;
    delta: string;
  }
  | {
    type: "tool_progress";
    stage: string;
    message: string;
    metadata?: Record<string, unknown>;
  }
  | {
    type: "tool_call_started";
    toolName: string;
    message: string;
    metadata?: Record<string, unknown>;
  }
  | {
    type: "tool_call_completed";
    toolName: string;
    message: string;
    metadata?: Record<string, unknown>;
  }
  | {
    type: "tool_call_failed";
    toolName: string;
    message: string;
    metadata?: Record<string, unknown>;
  }
  | {
    type: "task_cancelled";
    message: string;
  };

export interface AgentTaskFailure {
  code: string;
  message: string;
}

export interface AgentTaskSuccessResult {
  ok: true;
  taskId: string;
  output: AgentTaskOutput;
  trace: AgentTraceEvent[];
}

export interface AgentTaskFailureResult {
  ok: false;
  taskId: string;
  error: AgentTaskFailure;
  trace: AgentTraceEvent[];
}

export type AgentTaskResult = AgentTaskSuccessResult | AgentTaskFailureResult;

export type AgentTraceEventType =
  | "task_started"
  | "tool_called"
  | "tool_completed"
  | "tool_failed"
  | "skill_called"
  | "skill_failed"
  | "skill_progress"
  | "llm_called"
  | "llm_failed"
  | "output_validated"
  | "task_completed"
  | "task_failed";

export interface AgentTraceEvent {
  type: AgentTraceEventType;
  at: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export function isAgentTaskType(value: string): value is AgentTaskType {
  return AGENT_TASK_TYPES.includes(value as AgentTaskType);
}
