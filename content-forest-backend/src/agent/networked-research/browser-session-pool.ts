import { ApplicationError } from "../../shared/errors/application-error.js";

export class BrowserSessionPool {
  private readonly maxConcurrent: number;
  private active = 0;
  private readonly queue: Array<() => void> = [];
  private readonly sessionQueues = new Map<string, Promise<unknown>>();

  public constructor(maxConcurrent: number = 2) {
    this.maxConcurrent = Math.min(Math.max(maxConcurrent, 1), 3);
  }

  public async runExclusive<T>(
    sessionId: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const previous = this.sessionQueues.get(sessionId) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(() => this.withGlobalSlot(action));
    this.sessionQueues.set(sessionId, current);
    try {
      return await current;
    } finally {
      if (this.sessionQueues.get(sessionId) === current) {
        this.sessionQueues.delete(sessionId);
      }
    }
  }

  private async withGlobalSlot<T>(action: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await action();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
    this.active += 1;
  }

  private release(): void {
    if (this.active <= 0) {
      throw new ApplicationError(
        "AGENT_TOOL_ERROR",
        "浏览器并发池状态异常",
        500,
      );
    }
    this.active -= 1;
    const next = this.queue.shift();
    next?.();
  }
}
