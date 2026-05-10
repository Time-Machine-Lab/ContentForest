import { describe, expect, it } from "vitest";
import { BranchGrowthSkill } from "../agent/skills/branch-growth-skill.js";
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

function context(detailParams: Record<string, unknown> = {}) {
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
    expect(llm.inputs[0]?.messages[1]?.content).toContain("content-evolution-v1");
    expect(llm.inputs[0]?.messages[1]?.content).toContain("evidenceCards");
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
            algorithmVersion: "content-evolution-v1",
            explorationSlot: "pain-resonance",
            evidenceCardCount: 2,
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
      context: context({ generatorScriptPath: "scripts/main.mjs" }),
      llm,
      tools,
      trace: new AgentTrace(),
    });

    expect(output.content).toMatchObject({
      payload: { markdown: "# 脚本候选" },
    });
    expect(tools.calls.map((call) => call.name)).toContain("execute_generator_script");
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
