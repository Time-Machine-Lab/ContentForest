import { ApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTaskOutput, AgentTaskType } from "../runtime/agent-task.js";
import type { ToolCaller } from "../runtime/tool-contract.js";
import {
  EXECUTE_GENERATOR_SCRIPT_TOOL_NAME,
} from "../tools/execute-generator-script-tool.js";
import {
  READ_GENERATOR_SKILL_TOOL_NAME,
} from "../tools/read-generator-skill-tool.js";
import {
  READ_GROWTH_RESOURCES_TOOL_NAME,
  READ_GROWTH_SOURCE_NODE_TOOL_NAME,
} from "../tools/read-growth-context-tool.js";
import type { SkillContract, SkillExecutionInput } from "./skill-contract.js";
import type { BranchGrowthResourceRef } from "./branch-growth-candidate.js";
import { buildStructuredBranchGrowthCandidate } from "./branch-growth-structured-output.js";
import {
  buildContentEvolutionStrategy,
  cleanGeneratorPayload,
  type ContentEvolutionStrategy,
} from "./content-evolution-strategy.js";

export class BranchGrowthSkill implements SkillContract {
  public readonly name = "branch_growth";
  public readonly description = "Built-in branch growth skill that wraps generator payload into candidate fruit.";
  public readonly supportedTaskTypes: AgentTaskType[] = ["growth"];

  public async execute(input: SkillExecutionInput): Promise<AgentTaskOutput> {
    const generatorId = readGeneratorId(input.context.input);
    const authorizedResourceRefs = readAuthorizedRefs(input.context.input);
    input.trace.record("skill_progress", "Branch growth started", {
      stage: "branch_growth_started",
      generatorId,
      sourceNodeType: readSourceNodeType(input.context.input),
    });

    const [source, generator, resources] = await Promise.all([
      readToolRecord(input.tools, READ_GROWTH_SOURCE_NODE_TOOL_NAME, {}),
      readToolRecord(input.tools, READ_GENERATOR_SKILL_TOOL_NAME, { generatorId }),
      readToolRecord(input.tools, READ_GROWTH_RESOURCES_TOOL_NAME, {}),
    ]);
    input.trace.record("skill_progress", "Branch growth context loaded", {
      stage: "context_loaded",
      generatorId,
      entryCount: Array.isArray(generator.entries) ? generator.entries.length : 0,
      userVisible: true,
      parentStepId: "pipeline:context",
      stepId: "context-loaded",
      label: "读取资源补全上下文",
      status: "completed",
    });

    const strategy = buildContentEvolutionStrategy({
      taskInput: input.context.input,
      source,
      resources,
    });
    input.trace.record("skill_progress", "Content evolution strategy prepared", {
      stage: "strategy_prepared",
      algorithmVersion: strategy.algorithmVersion,
      explorationSlot: strategy.explorationSlot.key,
      evidenceCardCount: strategy.evidenceCards.length,
      userVisible: true,
      parentStepId: "pipeline:search",
      stepId: "strategy-prepared",
      label: "确定创作探索方向",
      status: "completed",
    });

    const payload = await this.createGeneratorPayload({
      execution: input,
      generator,
      source,
      resources,
      generatorId,
      strategy,
    });
    input.trace.record("skill_progress", "Generator payload created", {
      stage: "generator_payload_created",
      algorithmVersion: strategy.algorithmVersion,
      explorationSlot: strategy.explorationSlot.key,
      payloadLength: payload.length,
      userVisible: true,
      parentStepId: `attempt:${readOptionalString(input.context.input.attemptId)}`,
      stepId: "generator-payload-created",
      label: "生成文案",
      status: "completed",
    });

    const candidate = await buildStructuredBranchGrowthCandidate({
      llm: input.llm,
      trace: input.trace,
      payloadMarkdown: payload,
      rawGeneratorOutput: payload,
      promptContext: buildPromptContext({
        source,
        generator,
        resources,
        strategy,
        taskInput: input.context.input,
        userInput: readOptionalString(input.context.input.userInput),
      }),
      validationOptions: {
        authorizedResourceRefs,
      },
      maxRepairAttempts: 1,
    });

    return {
      taskType: "growth",
      content: candidate,
      metadata: {
        skillName: this.name,
        algorithmVersion: strategy.algorithmVersion,
        explorationSlot: strategy.explorationSlot,
        mutationPlan: input.context.input.mutationPlan ?? null,
      },
    };
  }

  private async createGeneratorPayload(input: {
    execution: SkillExecutionInput;
    generator: Record<string, unknown>;
    source: Record<string, unknown>;
    resources: Record<string, unknown>;
    generatorId: string;
    strategy: ContentEvolutionStrategy;
  }): Promise<string> {
    const scriptPath = readScriptPath(input.execution.context.input);
    if (scriptPath !== null) {
      const result = await readToolRecord(
        input.execution.tools,
        EXECUTE_GENERATOR_SCRIPT_TOOL_NAME,
        {
          generatorId: input.generatorId,
          scriptPath,
          input: {
            source: input.source,
            generator: {
              generatorId: input.generator.generatorId,
              name: input.generator.name,
              description: input.generator.description,
              skillMarkdown: input.generator.skillMarkdown,
            },
            resources: input.resources,
            strategy: input.strategy,
            roundGrowthBrief: input.execution.context.input.roundGrowthBrief ?? {},
            searchMode: input.execution.context.input.searchMode ?? null,
            mutationIntensity: input.execution.context.input.mutationIntensity ?? null,
            mutationPlan: input.execution.context.input.mutationPlan ?? {},
            userInput: readOptionalString(input.execution.context.input.userInput),
            detailParams: input.execution.context.input.detailParams ?? {},
          },
        },
      );
      const content = result.payload;
      return cleanGeneratorPayload(
        typeof content === "string" ? content : JSON.stringify(content),
      );
    }

    const completion = await input.execution.llm.complete({
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: [
            "你是外部生成器 Skill 的执行者。",
            "请严格依据生成器方法论输出内容 payload。",
            "你必须服从本次生长策略、探索方向和证据卡片，生成与同批次其他 attempt 有区分度的内容。",
            "只输出 Markdown payload，不要输出果实 meta，不要声明已保存或已完成任务。",
            "不要输出思考过程、候选分析、策略解释或中间推理，只输出用户最终可见的发布内容。",
          ].join("\n"),
        },
        {
          role: "user",
          content: buildPromptContext({
            source: input.source,
            generator: input.generator,
            resources: input.resources,
            strategy: input.strategy,
            taskInput: input.execution.context.input,
            userInput: readOptionalString(input.execution.context.input.userInput),
          }),
        },
      ],
    });
    const payload = cleanGeneratorPayload(completion.content);
    if (payload.length === 0) {
      throw new ApplicationError("AGENT_SKILL_ERROR", "生成器 payload 为空", 502);
    }
    return payload;
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
  source: Record<string, unknown>;
  generator: Record<string, unknown>;
  resources: Record<string, unknown>;
  strategy: ContentEvolutionStrategy;
  taskInput: Record<string, unknown>;
  userInput: string;
}): string {
  return [
    "## 内容进化算法版本",
    input.strategy.algorithmVersion,
    "## 本轮生长简报",
    JSON.stringify(sanitizeContext(readRecord(input.taskInput.roundGrowthBrief)), null, 2),
    "## 管线搜索参数",
    JSON.stringify(
      {
        searchMode: input.taskInput.searchMode ?? null,
        mutationIntensity: input.taskInput.mutationIntensity ?? null,
        mutationPlan: input.taskInput.mutationPlan ?? null,
      },
      null,
      2,
    ),
    "## 本次生长策略",
    JSON.stringify(input.strategy, null, 2),
    "## 生成器方法论",
    readOptionalString(input.generator.skillMarkdown),
    "## 来源节点",
    JSON.stringify(sanitizeContext(input.source), null, 2),
    "## 用户补充输入",
    input.userInput,
    "## 授权参考资源",
    JSON.stringify(sanitizeContext(input.resources), null, 2),
  ].join("\n\n");
}

function readGeneratorId(input: Record<string, unknown>): string {
  const generatorRef = input.generatorRef;
  if (
    typeof generatorRef === "object" &&
    generatorRef !== null &&
    !Array.isArray(generatorRef) &&
    typeof (generatorRef as Record<string, unknown>).generatorId === "string"
  ) {
    return ((generatorRef as Record<string, unknown>).generatorId as string).trim();
  }
  const scope = input.authorizationScope;
  if (
    typeof scope === "object" &&
    scope !== null &&
    !Array.isArray(scope) &&
    typeof (scope as Record<string, unknown>).generatorId === "string"
  ) {
    return ((scope as Record<string, unknown>).generatorId as string).trim();
  }
  throw new ApplicationError("VALIDATION_ERROR", "枝化生长缺少生成器引用", 400);
}

function readSourceNodeType(input: Record<string, unknown>): string {
  const source = input.sourceNodeRef;
  if (typeof source === "object" && source !== null && !Array.isArray(source)) {
    const nodeType = (source as Record<string, unknown>).nodeType;
    return typeof nodeType === "string" ? nodeType : "unknown";
  }
  return "unknown";
}

function readScriptPath(input: Record<string, unknown>): string | null {
  const detailParams = input.detailParams;
  if (
    typeof detailParams !== "object" ||
    detailParams === null ||
    Array.isArray(detailParams)
  ) {
    return null;
  }
  const value =
    (detailParams as Record<string, unknown>).generatorScriptPath ??
    (detailParams as Record<string, unknown>).scriptPath;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readAuthorizedRefs(
  input: Record<string, unknown>,
): BranchGrowthResourceRef[] {
  const scope = input.authorizationScope;
  if (typeof scope !== "object" || scope === null || Array.isArray(scope)) {
    return [];
  }
  const record = scope as Record<string, unknown>;
  return [
    ...normalizeRefs(record.nutrientRefs, "nutrient"),
    ...normalizeRefs(record.geneRefs, "gene"),
  ];
}

function normalizeRefs(
  value: unknown,
  resourceType: "nutrient" | "gene",
): BranchGrowthResourceRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null && !Array.isArray(item),
    )
    .filter((item) => item.resourceType === resourceType)
    .map((item) => ({
      resourceType,
      resourceId: readOptionalString(item.resourceId),
    }))
    .filter((item) => item.resourceId.length > 0);
}

function readOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function sanitizeContext(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
