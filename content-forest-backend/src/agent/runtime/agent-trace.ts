import type { AgentTraceEvent, AgentTraceEventType } from "./agent-task.js";

export class AgentTrace {
  private readonly events: AgentTraceEvent[] = [];
  private readonly now: () => Date;

  public constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  public record(
    type: AgentTraceEventType,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.events.push({
      type,
      at: this.now().toISOString(),
      message,
      metadata: metadata === undefined ? undefined : sanitizeMetadata(metadata),
    });
  }

  public list(): AgentTraceEvent[] {
    return this.events.map((event) => ({
      ...event,
      metadata: event.metadata === undefined ? undefined : { ...event.metadata },
    }));
  }
}

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      key.toLowerCase().includes("key") ? "[redacted]" : value,
    ]),
  );
}
