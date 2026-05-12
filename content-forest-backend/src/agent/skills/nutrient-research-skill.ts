import { ApplicationError } from "../../shared/errors/application-error.js";
import { CONTROLLED_WEB_SEARCH_TOOL_NAME } from "../tools/controlled-web-search-tool.js";
import type { AgentTaskOutput, AgentTaskType } from "../runtime/agent-task.js";
import type { ToolCaller } from "../runtime/tool-contract.js";
import type { SkillContract, SkillExecutionInput } from "./skill-contract.js";
import { buildStructuredNutrientResearchOutput } from "./nutrient-research-structured-output.js";

export class NutrientResearchSkill implements SkillContract {
  public readonly name = "nutrient_research";
  public readonly description = "Built-in nutrient research skill with controlled web search.";
  public readonly supportedTaskTypes: AgentTaskType[] = ["nutrient_research"];

  public async execute(input: SkillExecutionInput): Promise<AgentTaskOutput> {
    const userMessage = readRequiredString(input.context.input.message, "研究问题不能为空");
    const searchQuery = buildSearchQuery(input.context.input, userMessage);
    input.trace.record("skill_progress", "Nutrient research started", {
      stage: "nutrient_research_started",
      seedId: readOptionalString(input.context.input.seedId),
      nutrientCardId: readOptionalString(input.context.input.nutrientCardId),
    });

    const search = await readToolRecord(input.tools, CONTROLLED_WEB_SEARCH_TOOL_NAME, {
      query: searchQuery,
      maxResults: 5,
    });
    input.trace.record("skill_progress", "Nutrient research search completed", {
      stage: "nutrient_research_search_completed",
      query: searchQuery,
      resultCount: Array.isArray(search.results) ? search.results.length : 0,
    });

    const output = await buildStructuredNutrientResearchOutput({
      llm: input.llm,
      trace: input.trace,
      promptContext: buildPromptContext({
        taskInput: input.context.input,
        userMessage,
        search,
      }),
      maxRepairAttempts: 1,
    });

    return {
      taskType: "nutrient_research",
      content: output,
      metadata: {
        skillName: this.name,
        searchQuery,
      },
    };
  }
}

async function readToolRecord(
  tools: ToolCaller,
  name: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const output = await tools.callTool(name, input);
  if (
    typeof output.content !== "object" ||
    output.content === null ||
    Array.isArray(output.content)
  ) {
    throw new ApplicationError("AGENT_TOOL_ERROR", `Tool ${name} 返回格式不正确`, 500);
  }
  return output.content as Record<string, unknown>;
}

function buildPromptContext(input: {
  taskInput: Record<string, unknown>;
  userMessage: string;
  search: Record<string, unknown>;
}): string {
  return [
    "## 当前种子",
    JSON.stringify(
      {
        seedId: input.taskInput.seedId ?? null,
        seedTitle: input.taskInput.seedTitle ?? "",
        nutrientCardId: input.taskInput.nutrientCardId ?? null,
        nutrientCardTitle: input.taskInput.nutrientCardTitle ?? "",
      },
      null,
      2,
    ),
    "## 历史对话摘要",
    JSON.stringify(input.taskInput.recentMessages ?? [], null, 2),
    "## 用户本次问题",
    input.userMessage,
    "## 联网搜索结果",
    JSON.stringify(input.search, null, 2),
  ].join("\n\n");
}

function buildSearchQuery(
  taskInput: Record<string, unknown>,
  userMessage: string,
): string {
  const seedTitle = readOptionalString(taskInput.seedTitle);
  const cardTitle = readOptionalString(taskInput.nutrientCardTitle);
  return [seedTitle, cardTitle, userMessage]
    .filter((item) => item.length > 0)
    .join(" ")
    .slice(0, 200);
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
