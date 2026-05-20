import { describe, expect, it } from "vitest";
import { BranchGrowthSkill } from "../agent/skills/branch-growth-skill.js";
import { parseStructuredCandidate } from "../agent/skills/branch-growth-structured-output.js";
import { AgentTrace } from "../agent/runtime/agent-trace.js";
import type {
  LlmAdapter,
  LlmCompletionInput,
  LlmCompletionResult,
} from "../agent/runtime/llm-adapter.js";
import type { ToolCaller, ToolInput, ToolOutput } from "../agent/runtime/tool-contract.js";

class SequenceLlm implements LlmAdapter {
  public readonly inputs: LlmCompletionInput[] = [];
  private readonly responses: string[];

  public constructor(responses: string[]) {
    this.responses = responses;
  }

  public async complete(input: LlmCompletionInput): Promise<LlmCompletionResult> {
    this.inputs.push(input);
    const content = this.responses.shift();
    return {
      content: content ?? this.inputs[this.inputs.length - 1]?.messages.at(-1)?.content ?? "{}",
    };
  }
}

class FakeTools implements ToolCaller {
  public readonly calls: Array<{ name: string; input: ToolInput }> = [];

  public async callTool(name: string, input: ToolInput): Promise<ToolOutput> {
    this.calls.push({ name, input });
    if (name === "read_growth_source_node") {
      return {
        content: {
          nodeType: "seed",
          nodeId: "seed-node_seed_1",
          title: "壁纸项目",
          markdown: "做一款壁纸产品宣传",
        },
      };
    }
    if (name === "read_generator_skill") {
      return {
        content: {
          generatorId: "generator_1",
          name: "小红书生成器",
          description: "生成小红书文案",
          skillMarkdown: "写出有情绪价值的小红书文案",
          entries: ["SKILL.md", "scripts/main.mjs"],
        },
      };
    }
    if (name === "read_growth_resources") {
      return {
        content: {
          requestedRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
          genes: [{ resourceType: "gene", resourceId: "gene_1", markdown: "强调陪伴感" }],
          nutrients: [],
        },
      };
    }
    if (name === "execute_generator_script") {
      return {
        content: {
          payload: "# 脚本生成内容",
        },
      };
    }
    throw new Error(`unknown tool: ${name}`);
  }
}

function routeInput(): Record<string, unknown> {
  return {
    contentSearchMap: {
      algorithmVersion: "content-search-map-v1",
      platformInference: {
        platforms: ["小红书"],
        contentForms: ["图文笔记"],
        source: "generator",
        confidence: "high",
        evidenceSummary: "生成器提供平台线索",
      },
      routeCandidates: [],
    },
    selectedRoute: {
      id: "route-1-platform-fit",
      objective: "对齐平台语感",
      platforms: ["小红书"],
      audience: "年轻用户",
      contentForm: "图文笔记",
      narrativeMechanism: "真实场景切入",
      emotionalDrivers: ["代入感"],
      evidencePlan: ["来源节点"],
      interactionMode: "引导评论",
      riskGuards: ["不要伪造案例"],
      mutationOperators: [
        {
          key: "route-1:narrative",
          label: "叙事机制变异",
          variable: "narrative",
          action: "改变切入方式",
          radius: "balanced",
        },
      ],
      successSignals: ["前三行有平台语感"],
      referencePlan: {
        summary: "生成器定平台，用户输入定意图",
        items: [
          {
            sourceType: "generator",
            resourceId: "generator_1",
            role: "hard_constraint",
            usage: "约束小红书语感",
            confidence: "high",
          },
        ],
      },
    },
    referencePlan: {
      summary: "生成器定平台，用户输入定意图",
      items: [],
    },
    mutationOperators: [
      {
        key: "route-1:narrative",
        label: "叙事机制变异",
        variable: "narrative",
        action: "改变切入方式",
        radius: "balanced",
      },
    ],
    platformInference: {
      platforms: ["小红书"],
      contentForms: ["图文笔记"],
      source: "generator",
      confidence: "high",
      evidenceSummary: "生成器提供平台线索",
    },
  };
}

function context(
  detailParams: Record<string, unknown> = {},
  extraInput: Record<string, unknown> = {},
) {
  return {
    taskId: "growth-attempt_1",
    taskType: "growth" as const,
    input: {
      seedId: "seed_1",
      growthTaskId: "growth-task_1",
      attemptId: "growth-attempt_1",
      attemptIndex: 1,
      sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      userInput: "更适合年轻用户",
      generatorRef: { generatorId: "generator_1" },
      authorizationScope: {
        seedId: "seed_1",
        sourceNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
        generatorId: "generator_1",
        nutrientRefs: [],
        geneRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
      },
      detailParams,
      target: { fruitCount: 1, totalFruitCount: 3 },
      ...extraInput,
    },
    metadata: {},
    startedAt: "2026-01-01T00:00:00.000Z",
  };
}

function candidateJson(
  markdown = "# 候选果实",
  usedResourceRefs: unknown = [{ resourceType: "gene", resourceId: "gene_1" }],
): string {
  return JSON.stringify({
    type: "candidate_fruit",
    payload: {
      markdown,
      rawGeneratorOutput: markdown,
      attachments: [],
    },
    meta: {
      summary: "壁纸产品的小红书表达",
      geneTags: ["情绪价值"],
      usedResourceRefs,
      warnings: [],
    },
  });
}

describe("BranchGrowthSkill", () => {
  it("parses candidate JSON from analysis text with multiple fenced objects", () => {
    const parsed = parseStructuredCandidate([
      "analysis before json",
      "```json",
      JSON.stringify({ type: "debug", payload: { markdown: "# wrong" } }),
      "```",
      "```json",
      candidateJson("# parsed candidate"),
      "```",
    ].join("\n"));

    expect(parsed).toMatchObject({
      type: "candidate_fruit",
      payload: { markdown: "# parsed candidate" },
    });
  });

  it("wraps generator payload into a structured candidate fruit", async () => {
    const skill = new BranchGrowthSkill();
    const llm = new SequenceLlm(["# 生成器 payload", candidateJson()]);
    const tools = new FakeTools();
    const trace = new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z"));

    const output = await skill.execute({
      context: context(),
      llm,
      tools,
      trace,
    });

    expect(output.content).toMatchObject({
      type: "candidate_fruit",
      payload: { markdown: "# 候选果实" },
      meta: { geneTags: ["情绪价值"] },
    });
    expect(llm.inputs[0]?.messages[1]?.content).toContain("## 本次生长策略");
    expect(llm.inputs[0]?.messages[1]?.content).toContain("content-evolution-v2");
    expect(llm.inputs[0]?.messages[1]?.content).toContain("evidenceCards");
    expect(llm.inputs[0]?.messages[0]?.content).toContain("未受信任的数据");
    expect(llm.inputs[0]?.messages[1]?.content).toContain("## 参考槽位路由");
    expect(llm.inputs[1]?.messages[0]?.content).toContain(
      "usedResourceRefs 必须是对象数组",
    );
    expect(llm.inputs[1]?.messages[0]?.content).toContain(
      '"resourceId":"gene_1"',
    );
    expect(llm.inputs[1]?.messages[0]?.content).toContain(
      "生成器内部 references 文件都不是 gene 或 nutrient",
    );
    expect(trace.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "skill_progress",
          metadata: expect.objectContaining({
            stage: "strategy_prepared",
            algorithmVersion: "content-evolution-v2",
            explorationSlot: "pain-resonance",
            fallbackUsed: true,
            evidenceCardCount: 2,
          }),
        }),
        expect.objectContaining({
          type: "skill_progress",
          metadata: expect.objectContaining({
            stage: "reference_plan_transmitted",
          }),
        }),
      ]),
    );
    expect(tools.calls.map((call) => call.name)).toEqual([
      "read_growth_source_node",
      "read_generator_skill",
      "read_growth_resources",
    ]);
  });

  it("normalizes string resource refs returned by the structured candidate model", async () => {
    const skill = new BranchGrowthSkill();
    const llm = new SequenceLlm(["# 生成器 payload", candidateJson("# 候选果实", ["gene_1"])]);
    const tools = new FakeTools();

    const output = await skill.execute({
      context: context(),
      llm,
      tools,
      trace: new AgentTrace(),
    });

    expect(output.content).toMatchObject({
      meta: {
        usedResourceRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
      },
    });
  });

  it("repairs unauthorized resource refs with the allowed ref list", async () => {
    const skill = new BranchGrowthSkill();
    const llm = new SequenceLlm([
      "# 生成器 payload",
      candidateJson("# 候选果实", [
        { resourceType: "nutrient", resourceId: "xiaohongshu-viral-factors" },
      ]),
      candidateJson("# 候选果实", []),
    ]);

    const output = await skill.execute({
      context: context(),
      llm,
      tools: new FakeTools(),
      trace: new AgentTrace(),
    });

    expect(output.content).toMatchObject({
      payload: { markdown: "# 候选果实" },
      meta: { usedResourceRefs: [] },
    });
    expect(llm.inputs[2]?.messages[0]?.content).toContain(
      "如果原始输出包含未授权资源引用，请删除该引用",
    );
    expect(llm.inputs[2]?.messages[0]?.content).toContain(
      '"resourceId":"gene_1"',
    );
  });

  it("uses the controlled script tool when a generator script path is provided", async () => {
    const skill = new BranchGrowthSkill();
    const llm = new SequenceLlm([candidateJson("# 脚本候选")]);
    const tools = new FakeTools();

    const output = await skill.execute({
      context: context({ generatorScriptPath: "scripts/main.mjs" }, routeInput()),
      llm,
      tools,
      trace: new AgentTrace(),
    });

    expect(output.content).toMatchObject({
      payload: { markdown: "# 脚本候选" },
    });
    expect(tools.calls.map((call) => call.name)).toContain("execute_generator_script");
    const scriptCall = tools.calls.find((call) => call.name === "execute_generator_script");
    expect(scriptCall?.input).toMatchObject({
      input: {
        selectedRoute: { id: "route-1-platform-fit" },
        referencePlan: { summary: "生成器定平台，用户输入定意图" },
        mutationOperators: [expect.objectContaining({ key: "route-1:narrative" })],
        platformInference: { source: "generator" },
      },
    });
  });

  it("passes selected route metadata into prompt, metadata, and route trace", async () => {
    const skill = new BranchGrowthSkill();
    const llm = new SequenceLlm([
      "# 路线 payload",
      candidateJson("# 路线候选", [{ resourceType: "gene", resourceId: "gene_1" }]),
    ]);
    const trace = new AgentTrace();

    const output = await skill.execute({
      context: context({}, routeInput()),
      llm,
      tools: new FakeTools(),
      trace,
    });

    expect(llm.inputs[0]?.messages[1]?.content).toContain("## 选中探索路线");
    expect(llm.inputs[0]?.messages[1]?.content).toContain("route-1-platform-fit");
    expect(llm.inputs[0]?.messages[1]?.content).toContain("## 参考计划");
    expect(llm.inputs[0]?.messages[1]?.content).toContain("## 突变算子");
    expect(output.metadata).toMatchObject({
      selectedRoute: { id: "route-1-platform-fit" },
      platformInference: { source: "generator" },
      fallbackUsed: false,
    });
    expect(trace.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "skill_progress",
          metadata: expect.objectContaining({
            stage: "route_strategy",
            selectedRoute: expect.objectContaining({ id: "route-1-platform-fit" }),
          }),
        }),
      ]),
    );
  });

  it("cleans thinking and analysis from generator payload and candidate markdown", async () => {
    const skill = new BranchGrowthSkill();
    const llm = new SequenceLlm([
      "<think>分析过程</think>\n我先分析标题\n\n## 标题\n清理后的标题\n\n## 内容\n清理后的正文",
      candidateJson("<think>结构化思考</think>\n## 标题\n清理后的标题\n\n## 内容\n清理后的正文"),
    ]);

    const output = await skill.execute({
      context: context(),
      llm,
      tools: new FakeTools(),
      trace: new AgentTrace(),
    });

    expect(JSON.stringify(output.content)).not.toContain("<think>");
    expect(output.content).toMatchObject({
      payload: {
        markdown: "## 标题\n清理后的标题\n\n## 内容\n清理后的正文",
      },
    });
    expect(llm.inputs[1]?.messages[1]?.content).not.toContain("分析过程");
  });

  it("repairs invalid structured output once and fails after repeated invalid output", async () => {
    const skill = new BranchGrowthSkill();
    const repaired = new SequenceLlm(["# payload", "not json", candidateJson("# 修复后")]);

    await expect(
      skill.execute({
        context: context(),
        llm: repaired,
        tools: new FakeTools(),
        trace: new AgentTrace(),
      }),
    ).resolves.toMatchObject({
      content: { payload: { markdown: "# 修复后" } },
    });
    expect(repaired.inputs[2]?.messages[1]?.content).toContain(
      "模型未返回可解析的候选果实 JSON",
    );
    expect(repaired.inputs[2]?.messages[0]?.content).toContain(
      "如果原始输出包含未授权资源引用，请删除该引用",
    );
    expect(repaired.inputs[2]?.messages[1]?.content).not.toContain("{truncate");

    const broken = new SequenceLlm(["# payload", "not json", "still not json"]);
    await expect(
      skill.execute({
        context: context(),
        llm: broken,
        tools: new FakeTools(),
        trace: new AgentTrace(),
      }),
    ).rejects.toMatchObject({
      code: "AGENT_SKILL_ERROR",
    });
  });
});
