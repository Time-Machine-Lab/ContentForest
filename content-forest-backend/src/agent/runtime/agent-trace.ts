import type { AgentTraceEvent, AgentTraceEventType } from "./agent-task.js";
import { sanitizeForExchangeLog } from "./agent-exchange-log.js";

export class AgentTrace {
  private readonly events: AgentTraceEvent[] = [];
  private readonly now: () => Date;
  private readonly onRecord?: (event: AgentTraceEvent) => void;

  public constructor(
    now: () => Date = () => new Date(),
    onRecord?: (event: AgentTraceEvent) => void,
  ) {
    this.now = now;
    this.onRecord = onRecord;
  }

  public record(
    type: AgentTraceEventType,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    const event = {
      type,
      at: this.now().toISOString(),
      message,
      metadata: metadata === undefined ? undefined : sanitizeMetadata(metadata),
    };
    this.events.push(event);
    this.onRecord?.(event);
  }

  public list(): AgentTraceEvent[] {
    return this.events.map((event) => ({
      ...event,
      metadata: event.metadata === undefined ? undefined : { ...event.metadata },
    }));
  }
}

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return sanitizeForExchangeLog(metadata, 4000) as Record<string, unknown>;
}
