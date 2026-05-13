import { ApplicationError } from "../../shared/errors/application-error.js";
import {
  BrowserResearchProvider,
  NetworkProviderRouter,
  PlatformDataPlaceholderProvider,
  WebPageFetchPlaceholderProvider,
  type NetworkDataRequest,
  type NetworkProvider,
} from "../networked-research/index.js";
import type { AgentTaskContext } from "../runtime/agent-task.js";
import type { ToolContract, ToolInput, ToolOutput } from "../runtime/tool-contract.js";

export const NETWORKED_RESEARCH_TOOL_NAME = "networked_research";

export class NetworkedResearchTool implements ToolContract {
  public readonly name = NETWORKED_RESEARCH_TOOL_NAME;
  public readonly description =
    "Run controlled network data research or URL observation through provider router.";
  public readonly readOnly = true;

  private readonly router: NetworkProviderRouter;

  public constructor(router: NetworkProviderRouter = createDefaultNetworkProviderRouter()) {
    this.router = router;
  }

  public async execute(
    input: ToolInput,
    context: AgentTaskContext,
  ): Promise<ToolOutput> {
    if (context.taskType !== "nutrient_research") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "联网数据获取工具仅允许受控 Agent 任务使用",
        400,
      );
    }
    const request = parseNetworkDataRequest(input);
    try {
      const result = await this.router.run(request);
      return {
        content: result,
        metadata: summarizeNetworkResult(result),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "联网数据获取失败，请稍后重试";
      throw new ApplicationError(
        "AGENT_TOOL_ERROR",
        `联网数据获取失败：${message}`,
        502,
      );
    }
  }
}

export function createDefaultNetworkProviderRouter(
  providers?: NetworkProvider[],
): NetworkProviderRouter {
  return new NetworkProviderRouter({
    providers: providers ?? [
      new BrowserResearchProvider({
        allowedDomains: [
          "bing.com",
          "xiaohongshu.com",
          "douyin.com",
          "tiktok.com",
          "instagram.com",
          "youtube.com",
          "x.com",
          "twitter.com",
        ],
      }),
      new WebPageFetchPlaceholderProvider(),
      new PlatformDataPlaceholderProvider(),
    ],
  });
}

function parseNetworkDataRequest(input: ToolInput): NetworkDataRequest {
  const mode = readOptionalString(input.mode) === "observe" ? "observe" : "research";
  if (mode === "observe") {
    return {
      mode,
      url: readRequiredString(input.url, "观测链接不能为空").slice(0, 1200),
      platform: readOptionalString(input.platform) || undefined,
    };
  }
  return {
    mode,
    request: readRequiredString(input.request ?? input.query, "研究请求不能为空"),
    seedTitle: readOptionalString(input.seedTitle) || undefined,
    nutrientCardTitle: readOptionalString(input.nutrientCardTitle) || undefined,
    targetPlatform: readOptionalString(input.targetPlatform) || undefined,
    maxResults: normalizeMaxResults(input.maxResults),
  };
}

function summarizeNetworkResult(result: Awaited<ReturnType<NetworkProviderRouter["run"]>>) {
  if (result.mode === "observe") {
    return {
      mode: result.mode,
      providerFailures: result.failures.length,
      hasObservation: result.observation !== null,
      accessStatus: result.observation?.accessStatus ?? null,
    };
  }
  return {
    mode: result.mode,
    queryCount: result.queryPlan.queries.length,
    resultCount: result.results.length,
    providerFailures: result.failures.length,
    queries: result.queryPlan.queries,
  };
}

function normalizeMaxResults(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 12) {
    throw new ApplicationError("VALIDATION_ERROR", "研究结果数量必须在 1 到 12 之间", 400);
  }
  return value as number;
}

function readRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", message, 400);
  }
  return value.trim();
}

function readOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
