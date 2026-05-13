import { ApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTaskContext } from "../runtime/agent-task.js";
import type { ToolContract, ToolInput, ToolOutput } from "../runtime/tool-contract.js";

export const CONTROLLED_WEB_SEARCH_TOOL_NAME = "controlled_web_search";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchProvider {
  search(query: string, maxResults: number): Promise<WebSearchResult[]>;
}

export class ControlledWebSearchTool implements ToolContract {
  public readonly name = CONTROLLED_WEB_SEARCH_TOOL_NAME;
  public readonly description = "Search the public web for nutrient research.";
  public readonly readOnly = true;

  private readonly provider: WebSearchProvider;

  public constructor(provider: WebSearchProvider = new RemovedDefaultSearchProvider()) {
    this.provider = provider;
  }

  public async execute(
    input: ToolInput,
    context: AgentTaskContext,
  ): Promise<ToolOutput> {
    if (context.taskType !== "nutrient_research") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "联网搜索工具仅允许营养研究任务使用",
        400,
      );
    }
    const query = requireSearchQuery(input.query);
    const maxResults = normalizeMaxResults(input.maxResults);
    try {
      const results = await this.provider.search(query, maxResults);
      return {
        content: {
          query,
          results: results.slice(0, maxResults).map((result) => ({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
          })),
        },
        metadata: {
          query,
          resultCount: results.length,
          resultSummary: results
            .slice(0, maxResults)
            .map((result) => `${result.title}: ${result.snippet}`)
            .join("\n")
            .slice(0, 1200),
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "联网搜索失败，请稍后重试";
      throw new ApplicationError(
        "AGENT_TOOL_ERROR",
        `联网搜索失败：${message}`,
        502,
      );
    }
  }
}

class RemovedDefaultSearchProvider implements WebSearchProvider {
  public async search(): Promise<WebSearchResult[]> {
    throw new Error("controlled_web_search default provider was removed; use networked_research");
  }
}

function requireSearchQuery(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", "搜索关键词不能为空", 400);
  }
  return value.trim().slice(0, 200);
}

function normalizeMaxResults(value: unknown): number {
  if (value === undefined) {
    return 5;
  }
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 8) {
    throw new ApplicationError("VALIDATION_ERROR", "搜索结果数量必须在 1 到 8 之间", 400);
  }
  return value as number;
}
