import { mkdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
  AgentTask,
  AgentTaskFailure,
  AgentTaskOutput,
  AgentTaskType,
} from "./agent-task.js";

export type AgentExchangeLogPhase =
  | "task"
  | "skill"
  | "tool"
  | "llm"
  | "validator"
  | "runtime";

export type AgentExchangeLogDirection = "input" | "output" | "error" | "info";

export interface AgentExchangeLogConfig {
  enabled: boolean;
  dir: string;
  maxContentChars: number;
}

export interface AgentExchangeLogEvent {
  at: string;
  phase: AgentExchangeLogPhase;
  direction: AgentExchangeLogDirection;
  name: string;
  status?: "started" | "completed" | "failed" | "skipped";
  content?: unknown;
}

export interface AgentExchangeLogDocument {
  task: {
    taskId: string;
    taskType: AgentTaskType | string;
    startedAt: string;
    completedAt: string;
  };
  result: {
    ok: boolean;
    output?: unknown;
    error?: AgentTaskFailure;
  };
  events: AgentExchangeLogEvent[];
}

export interface AgentExchangeLogSink {
  enabled: boolean;
  write(document: AgentExchangeLogDocument): Promise<string | null>;
}

export class DisabledAgentExchangeLogSink implements AgentExchangeLogSink {
  public readonly enabled = false;

  public async write(_document: AgentExchangeLogDocument): Promise<string | null> {
    return null;
  }
}

export class FileAgentExchangeLogSink implements AgentExchangeLogSink {
  public readonly enabled = true;
  private readonly dir: string;

  public constructor(dir: string) {
    this.dir = resolve(dir);
  }

  public async write(document: AgentExchangeLogDocument): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const baseName = formatTimestampForFile(document.task.startedAt);
    const filePath = await findAvailablePath(this.dir, baseName);
    await writeFile(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    return filePath;
  }
}

export class AgentExchangeLogRecorder {
  private readonly sink: AgentExchangeLogSink;
  private readonly now: () => Date;
  private readonly maxContentChars: number;
  private readonly events: AgentExchangeLogEvent[] = [];
  private taskInfo: {
    taskId: string;
    taskType: AgentTaskType | string;
    startedAt: string;
  } | null = null;

  public constructor(input: {
    sink: AgentExchangeLogSink;
    now: () => Date;
    maxContentChars: number;
  }) {
    this.sink = input.sink;
    this.now = input.now;
    this.maxContentChars = input.maxContentChars;
  }

  public get enabled(): boolean {
    return this.sink.enabled;
  }

  public startTask(input: {
    taskId: string;
    taskType: string;
    startedAt: string;
    task: AgentTask;
  }): void {
    if (!this.enabled) {
      return;
    }
    this.taskInfo = {
      taskId: input.taskId,
      taskType: input.taskType,
      startedAt: input.startedAt,
    };
    this.record({
      phase: "task",
      direction: "input",
      name: input.taskType,
      status: "started",
      content: {
        input: input.task.input,
        metadata: input.task.metadata ?? {},
        skillName: input.task.skillName,
      },
    });
  }

  public record(
    event: Omit<AgentExchangeLogEvent, "at" | "content"> & { content?: unknown },
  ): void {
    if (!this.enabled) {
      return;
    }
    this.events.push({
      ...event,
      at: this.now().toISOString(),
      content:
        event.content === undefined
          ? undefined
          : sanitizeForExchangeLog(event.content, this.maxContentChars),
    });
  }

  public async flush(result: {
    ok: boolean;
    output?: AgentTaskOutput;
    error?: AgentTaskFailure;
  }): Promise<string | null> {
    if (!this.enabled || this.taskInfo === null) {
      return null;
    }
    const completedAt = this.now().toISOString();
    return await this.sink.write({
      task: {
        ...this.taskInfo,
        completedAt,
      },
      result: sanitizeForExchangeLog(result, this.maxContentChars) as {
        ok: boolean;
        output?: unknown;
        error?: AgentTaskFailure;
      },
      events: this.events.map((event) => ({ ...event })),
    });
  }
}

export function createAgentExchangeLogSink(
  config: AgentExchangeLogConfig,
): AgentExchangeLogSink {
  return config.enabled
    ? new FileAgentExchangeLogSink(config.dir)
    : new DisabledAgentExchangeLogSink();
}

export function sanitizeForExchangeLog(
  value: unknown,
  maxContentChars: number,
): unknown {
  if (typeof value === "string") {
    return sanitizeString(value, maxContentChars);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForExchangeLog(item, maxContentChars));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        isSensitiveKey(key)
          ? "[redacted-secret]"
          : sanitizeForExchangeLog(item, maxContentChars),
      ]),
    );
  }
  return value;
}

function sanitizeString(value: string, maxContentChars: number): unknown {
  const redacted = redactPathLikeValues(redactSecrets(value));
  const effectiveMaxContentChars = Math.max(maxContentChars, 20);
  if (redacted.length <= effectiveMaxContentChars) {
    return redacted;
  }
  return {
    truncated: true,
    originalLength: redacted.length,
    preview: `${redacted.slice(0, effectiveMaxContentChars)}...`,
  };
}

function redactSecrets(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [redacted-secret]")
    .replace(
      /(authorization\s*[:=]\s*)([^\s,;]+)/gi,
      "$1[redacted-secret]",
    )
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[redacted-secret]")
    .replace(/\bsk-cp-[A-Za-z0-9_-]{12,}\b/g, "[redacted-secret]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted-secret]");
}

function redactPathLikeValues(value: string): string {
  return value
    .replace(/[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*/g, "[redacted-path]")
    .replace(/\/(?:Users|home|var|tmp|opt|srv)\/[^\s"'`]+/g, "[redacted-path]");
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return (
    normalized.includes("apikey") ||
    normalized.includes("api_key") ||
    normalized.includes("authorization") ||
    normalized.includes("token") ||
    normalized === "key"
  );
}

function formatTimestampForFile(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

async function findAvailablePath(dir: string, baseName: string): Promise<string> {
  for (let index = 0; index < 1000; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const filePath = join(dir, `${baseName}${suffix}.json`);
    if (!(await pathExists(filePath))) {
      return filePath;
    }
  }
  throw new Error("Unable to allocate agent exchange log file name");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
