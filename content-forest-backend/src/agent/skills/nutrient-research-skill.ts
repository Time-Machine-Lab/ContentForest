import { ApplicationError } from "../../shared/errors/application-error.js";
import { NETWORKED_RESEARCH_TOOL_NAME } from "../tools/networked-research-tool.js";
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
    input.trace.record("skill_progress", "Nutrient research started", {
      stage: "nutrient_research_started",
      seedId: readOptionalString(input.context.input.seedId),
      nutrientCardId: readOptionalString(input.context.input.nutrientCardId),
    });

    const research = await readToolRecord(input.tools, NETWORKED_RESEARCH_TOOL_NAME, {
      mode: "research",
      request: userMessage,
      seedTitle: readOptionalString(input.context.input.seedTitle),
      nutrientCardTitle: readOptionalString(input.context.input.nutrientCardTitle),
      maxResults: 8,
    });
    await input.emit?.({
      type: "tool_progress",
      stage: "network_research_completed",
      message: "联网研究完成，开始组织回复与可沉淀营养",
      metadata: {
        queryCount: readQueryCount(research),
        resultCount: Array.isArray(research.results) ? research.results.length : 0,
      },
    });
    input.trace.record("skill_progress", "Nutrient research network package completed", {
      stage: "network_research_completed",
      queryCount: readQueryCount(research),
      resultCount: Array.isArray(research.results) ? research.results.length : 0,
      providerFailures: Array.isArray(research.failures) ? research.failures.length : 0,
      restrictedStatuses: Array.isArray(research.restrictedStatuses)
        ? research.restrictedStatuses.length
        : 0,
      resultQualitySummary: summarizeResultQuality(research.results),
    });

    const output = await buildStructuredNutrientResearchOutput({
      llm: input.llm,
      trace: input.trace,
      promptContext: buildPromptContext({
        taskInput: input.context.input,
        userMessage,
        research,
      }),
      maxRepairAttempts: 1,
      onStreamEvent: input.emit,
    });

    return {
      taskType: "nutrient_research",
      content: output,
      metadata: {
        skillName: this.name,
        networkResultCount: Array.isArray(research.results) ? research.results.length : 0,
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
  research: Record<string, unknown>;
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
    "## 联网研究上下文包",
    [
      "说明：resultQuality=candidate_lead 只代表搜索候选线索，不能称为已验证真实案例；",
      "resultQuality=observed_case 或 complete_observed_case 才代表浏览器打开平台页面后观察到的案例；",
      "restrictedStatuses 表示验证码、登录墙、布局变化、Provider 不可用等限制，必须如实说明限制，不得基于这些内容编造案例。",
    ].join("\n"),
    JSON.stringify(input.research, null, 2),
  ].join("\n\n");
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

function readQueryCount(research: Record<string, unknown>): number {
  const queryPlan = research.queryPlan;
  if (typeof queryPlan !== "object" || queryPlan === null || Array.isArray(queryPlan)) {
    return 0;
  }
  const queries = (queryPlan as Record<string, unknown>).queries;
  return Array.isArray(queries) ? queries.length : 0;
}

function summarizeResultQuality(value: unknown): Record<string, number> {
  const summary: Record<string, number> = {};
  if (!Array.isArray(value)) {
    return summary;
  }
  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      continue;
    }
    const quality = (item as Record<string, unknown>).resultQuality;
    if (typeof quality !== "string") {
      continue;
    }
    summary[quality] = (summary[quality] ?? 0) + 1;
  }
  return summary;
}
