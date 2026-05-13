import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { ApplicationError } from "../../shared/errors/application-error.js";
import { BrowserSessionPool } from "./browser-session-pool.js";
import { NetworkProviderError } from "./provider-failure.js";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

export interface BrowserCli {
  run(args: string[], timeoutMs: number): Promise<string>;
}

export interface BrowserActionSnapshot {
  url: string;
  excerpt: string;
  steps: string[];
}

export interface BrowserActionRuntime {
  openAndSnapshot(input: {
    sessionId: string;
    url: string;
    allowedDomains: string[];
    timeoutMs: number;
    maxSteps: number;
    maxExcerptChars: number;
  }): Promise<BrowserActionSnapshot>;
}

export class AgentBrowserCli implements BrowserCli {
  public async run(args: string[], timeoutMs: number): Promise<string> {
    try {
      const command = resolveAgentBrowserCommand();
      const result = await execFileAsync(command.file, [...command.args, ...args], {
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      return [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : "agent-browser 执行失败";
      throw new ApplicationError(
        "AGENT_TOOL_ERROR",
        `agent-browser 不可用或执行失败：${message}`,
        502,
      );
    }
  }
}

export class AgentBrowserActionRuntime implements BrowserActionRuntime {
  private readonly cli: BrowserCli;
  private readonly pool: BrowserSessionPool;

  public constructor(input: {
    cli?: BrowserCli;
    pool?: BrowserSessionPool;
  } = {}) {
    this.cli = input.cli ?? new AgentBrowserCli();
    this.pool = input.pool ?? new BrowserSessionPool(2);
  }

  public async openAndSnapshot(input: {
    sessionId: string;
    url: string;
    allowedDomains: string[];
    timeoutMs: number;
    maxSteps: number;
    maxExcerptChars: number;
  }): Promise<BrowserActionSnapshot> {
    assertAllowedDomain(input.url, input.allowedDomains);
    if (input.maxSteps < 2) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "浏览器观察最大步骤数不足以打开并读取页面",
        400,
      );
    }

    return this.pool.runExclusive(input.sessionId, async () => {
      const steps: string[] = [];
      const baseArgs = [
        "--session",
        input.sessionId,
        "--allowed-domains",
        input.allowedDomains.join(","),
      ];
      let openError: unknown = null;
      try {
        await this.cli.run([...baseArgs, "open", input.url], input.timeoutMs);
        steps.push(`open:${domainOf(input.url)}`);
      } catch (error) {
        openError = error;
        steps.push(`open_failed:${domainOf(input.url)}`);
        if (input.maxSteps >= 3) {
          await this.cli.run([...baseArgs, "wait", "2000"], Math.min(input.timeoutMs, 5_000));
          steps.push("wait_after_open_failed");
        }
      }
      const output = await this.cli.run([...baseArgs, "snapshot"], input.timeoutMs);
      steps.push("snapshot");
      if (output.trim().length === 0 && openError !== null) {
        throw openError;
      }
      return {
        url: input.url,
        excerpt: output.slice(0, input.maxExcerptChars),
        steps,
      };
    });
  }
}

export function assertAllowedDomain(url: string, allowedDomains: string[]): void {
  if (!isAllowedDomain(url, allowedDomains)) {
    throw new NetworkProviderError("domain_not_allowed", "浏览器观察域名不在允许范围内");
  }
}

export function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  const domain = domainOf(url);
  if (domain.length === 0) {
    return false;
  }
  if (allowedDomains.length === 0) {
    return true;
  }
  return allowedDomains.some((allowed) => isDomainAllowedByPattern(domain, allowed));
}

export function sessionIdFor(mode: "research" | "observe", value: string): string {
  const safe = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `network-${mode}-${safe.slice(0, 48) || "task"}`;
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function resolveAgentBrowserCommand(): { file: string; args: string[] } {
  try {
    return {
      file: process.execPath,
      args: [require.resolve("agent-browser/bin/agent-browser.js")],
    };
  } catch {
    return { file: "agent-browser", args: [] };
  }
}

function isDomainAllowedByPattern(domain: string, allowed: string): boolean {
  const normalized = allowed.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }
  if (normalized.startsWith("*.")) {
    const suffix = normalized.slice(2);
    return domain === suffix || domain.endsWith(`.${suffix}`);
  }
  return domain === normalized || domain.endsWith(`.${normalized}`);
}
