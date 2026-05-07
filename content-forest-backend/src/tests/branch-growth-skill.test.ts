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
      target: { fruitCount: 1 },
    },
    metadata: {},
    startedAt: "2026-01-01T00:00:00.000Z",
  };
}

function candidateJson(markdown = "# 候选果实"): string {
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
      usedResourceRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
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
    expect(tools.calls.map((call) => call.name)).toEqual([
      "read_growth_source_node",
      "read_generator_skill",
      "read_growth_resources",
    ]);
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
