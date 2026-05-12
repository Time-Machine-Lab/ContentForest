import { describe, expect, it } from "vitest";
import {
  ControlledWebSearchTool,
  type WebSearchProvider,
} from "../agent/tools/controlled-web-search-tool.js";
import type { AgentTaskContext } from "../agent/runtime/agent-task.js";

const context: AgentTaskContext = {
  taskId: "agent-task_1",
  taskType: "nutrient_research",
  input: {},
  metadata: {},
  startedAt: "2026-01-01T00:00:00.000Z",
};

describe("ControlledWebSearchTool", () => {
  it("returns controlled search results and metadata", async () => {
    const provider: WebSearchProvider = {
      async search(query, maxResults) {
        return [
          {
            title: `result ${query}`,
            url: "https://example.com",
            snippet: `max ${maxResults}`,
          },
        ];
      },
    };
    const tool = new ControlledWebSearchTool(provider);

    const output = await tool.execute(
      { query: "小红书壁纸案例", maxResults: 3 },
      context,
    );

    expect(output).toMatchObject({
      content: {
        query: "小红书壁纸案例",
        results: [
          {
            title: "result 小红书壁纸案例",
            url: "https://example.com",
            snippet: "max 3",
          },
        ],
      },
      metadata: {
        query: "小红书壁纸案例",
        resultCount: 1,
      },
    });
  });

  it("returns a readable failure when search provider fails", async () => {
    const tool = new ControlledWebSearchTool({
      async search() {
        throw new Error("network down");
      },
    });

    await expect(
      tool.execute({ query: "小红书" }, context),
    ).rejects.toMatchObject({
      code: "AGENT_TOOL_ERROR",
      message: "联网搜索失败：network down",
    });
  });
});
