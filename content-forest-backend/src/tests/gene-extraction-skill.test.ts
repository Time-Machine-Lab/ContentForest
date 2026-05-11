import { describe, expect, it } from "vitest";
import { AgentRuntime } from "../agent/runtime/agent-runtime.js";
import { AgentTrace } from "../agent/runtime/agent-trace.js";
import type {
  LlmAdapter,
  LlmCompletionInput,
  LlmCompletionResult,
} from "../agent/runtime/llm-adapter.js";
import { SkillRegistry } from "../agent/runtime/skill-runtime.js";
import type { ToolCaller, ToolInput, ToolOutput } from "../agent/runtime/tool-contract.js";
import { ToolRegistry } from "../agent/runtime/tool-registry.js";
import { GeneExtractionSkill } from "../agent/skills/gene-extraction-skill.js";
import {
  buildStructuredGeneExtractionSuggestions,
} from "../agent/skills/gene-extraction-structured-output.js";
import {
  ReadGeneEvidenceTool,
  ReadGeneSeedContextTool,
  ReadReferableGeneInsightsTool,
} from "../agent/tools/read-gene-context-tool.js";
import { InMemoryFruitMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-fruit-markdown-content-access-adapter.js";
import { InMemoryGeneMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-gene-markdown-content-access-adapter.js";
import { InMemorySeedMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-seed-markdown-content-access-adapter.js";
import { FRUIT_SELECTION_STATES } from "../modules/fruit/domain/fruit-types.js";
import {
  GENE_EVIDENCE_SOURCE_TYPES,
  GENE_EXTRACTION_TASK_STATUSES,
  GENE_INSIGHT_STATUSES,
  GENE_SUGGESTION_STATUSES,
} from "../modules/gene/domain/gene-types.js";
import { GeneService } from "../modules/gene/application/gene-service.js";
import { SEED_ARCHIVE_STATES } from "../modules/seed/domain/seed-types.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryFruitStorageAdapter } from "../storage/adapters/in-memory-fruit-storage-adapter.js";
import { InMemoryGeneStorageAdapter } from "../storage/adapters/in-memory-gene-storage-adapter.js";
import { InMemoryPublicationStorageAdapter } from "../storage/adapters/in-memory-publication-storage-adapter.js";
import { InMemorySeedStorageAdapter } from "../storage/adapters/in-memory-seed-storage-adapter.js";

class SequenceLlm implements LlmAdapter {
  public readonly inputs: LlmCompletionInput[] = [];
  private readonly responses: string[];

  public constructor(responses: string[]) {
    this.responses = responses;
  }

  public async complete(input: LlmCompletionInput): Promise<LlmCompletionResult> {
    this.inputs.push(input);
    return { content: this.responses.shift() ?? "{}" };
  }
}

class FakeTools implements ToolCaller {
  public readonly calls: Array<{ name: string; input: ToolInput }> = [];

  public async callTool(name: string, input: ToolInput): Promise<ToolOutput> {
    this.calls.push({ name, input });
    if (name === "read_gene_seed_context") {
      return {
        content: {
          seedId: "seed_1",
          title: "Wallpaper project",
          markdown: "Promote a wallpaper product.",
        },
      };
    }
    if (name === "read_gene_evidence") {
      return {
        content: {
          evidence: [
            {
              evidenceType: GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
              evidenceDirection: "positive",
              strength: "weak",
              fruit: {
                fruitId: "fruit_1",
                markdown: "Users want to feel understood.",
              },
            },
            {
              evidenceType: GENE_EVIDENCE_SOURCE_TYPES.fruitEliminated,
              evidenceDirection: "negative",
              strength: "weak",
              fruit: {
                fruitId: "fruit_2",
                markdown: "Feature list only.",
              },
            },
          ],
          unsupportedEvidence: [],
        },
      };
    }
    if (name === "read_referable_gene_insights") {
      return {
        content: {
          insights: [
            {
              insightId: "gene_1",
              title: "Emotional opening",
              markdown: "Open with emotion.",
            },
          ],
        },
      };
    }
    throw new Error(`unknown tool: ${name}`);
  }
}

function validOutput(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: "gene_extraction_suggestions",
    suggestions: [
      {
        title: "Keep emotional opening",
        bodyMarkdown:
          "Expression trait: open with a user emotion before product details.\nApplicable niche: product introduction opening.\nNext round usage: inherit and strengthen this emotional opening, then mutate the example scenario for each platform.",
        polarity: "positive",
        evidenceInterpretation:
          "The selected fruit used emotional framing. This is weak human-selection evidence, so next branch growth should test it again before treating it as a strong platform signal.",
        nextRoundUsage:
          "Next round usage: inherit and strengthen this emotional opening, then mutate the example scenario for each platform.",
        lineage: "emotion",
        niche: "opening",
        similarityRelation: "reinforces",
        relatedInsightIds: ["gene_1"],
        warnings: [],
        ...overrides,
      },
    ],
  });
}

function context() {
  return {
    taskId: "gene-task_1",
    taskType: "gene_extraction" as const,
    input: {
      seedId: "seed_1",
      evidenceSources: [
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
          sourceId: "fruit_1",
          strength: "weak",
        },
      ],
      fruitEvidence: [],
      referableGeneInsights: [],
    },
    metadata: {},
    startedAt: "2026-01-01T00:00:00.000Z",
  };
}

function createIdGenerator(): IdGenerator {
  let counter = 0;
  return {
    nextId(prefix: string): string {
      counter += 1;
      return `${prefix}_${counter}`;
    },
  };
}

function createNow(): () => Date {
  let counter = 0;
  return () => {
    counter += 1;
    return new Date(`2026-01-01T00:00:${String(counter).padStart(2, "0")}.000Z`);
  };
}

async function createRuntimeFixture(llm: LlmAdapter) {
  const seedStorage = new InMemorySeedStorageAdapter();
  const fruitStorage = new InMemoryFruitStorageAdapter();
  const geneStorage = new InMemoryGeneStorageAdapter();
  const publicationStorage = new InMemoryPublicationStorageAdapter();
  const seedContentAccess = new InMemorySeedMarkdownContentAccessAdapter();
  const fruitContentAccess = new InMemoryFruitMarkdownContentAccessAdapter();
  const geneContentAccess = new InMemoryGeneMarkdownContentAccessAdapter();
  const seedLocation = await seedContentAccess.createSeedMarkdown({
    seedId: "seed_1",
    markdown: "Promote premium wallpapers.",
  });
  await seedStorage.createSeed({
    id: "seed_1",
    title: "Wallpaper project",
    archiveState: SEED_ARCHIVE_STATES.active,
    contentLocation: seedLocation,
    rootNodeId: "seed-node_seed_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
  });
  const fruitLocation = await fruitContentAccess.createFruitMarkdown({
    fruitId: "fruit_1",
    markdown: "Users want wallpapers that match their mood.",
  });
  await fruitStorage.createFruit({
    id: "fruit_1",
    selectionState: FRUIT_SELECTION_STATES.selected,
    parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
    contentLocation: fruitLocation,
    generatorId: null,
    summary: "Mood expression",
    geneTags: ["emotion"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  await geneContentAccess.prepareSeedGeneLibrary("seed_1");
  const insightLocation = await geneContentAccess.createGeneInsightMarkdown({
    seedId: "seed_1",
    insightId: "gene_1",
    markdown: "Open with emotional value.",
  });
  await geneStorage.createInsight({
    id: "gene_1",
    seedId: "seed_1",
    suggestionId: null,
    status: GENE_INSIGHT_STATUSES.active,
    title: "Emotional value",
    lineage: "emotion",
    niche: "opening",
    contentLocation: insightLocation,
    evidenceSources: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
  });

  const skillRegistry = new SkillRegistry();
  skillRegistry.register(new GeneExtractionSkill());
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(
    new ReadGeneSeedContextTool({ seedStorage, seedContentAccess }),
  );
  toolRegistry.register(
    new ReadGeneEvidenceTool({
      fruitStorage,
      fruitContentAccess,
      publicationStorage,
    }),
  );
  toolRegistry.register(
    new ReadReferableGeneInsightsTool({ geneStorage, geneContentAccess }),
  );
  return {
    seedStorage,
    fruitStorage,
    geneStorage,
    geneContentAccess,
    agentRuntime: new AgentRuntime({
      skillRegistry,
      toolRegistry,
      llm,
      nextTaskId: () => "agent-task_1",
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    }),
  };
}

describe("GeneExtractionSkill", () => {
  it("generates consumable suggestions with polarity and similarity relation", async () => {
    const skill = new GeneExtractionSkill();
    const tools = new FakeTools();
    const output = await skill.execute({
      context: context(),
      tools,
      llm: new SequenceLlm([validOutput()]),
      trace: new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z")),
    });

    expect(output.content).toMatchObject({
      type: "gene_extraction_suggestions",
      suggestions: [
        {
          title: "Keep emotional opening",
          polarity: "positive",
          similarityRelation: "reinforces",
        },
      ],
    });
    expect(JSON.stringify(output.content)).toContain("positive gene");
    expect(JSON.stringify(output.content)).toContain("Next Round Usage");
    expect(tools.calls.map((call) => call.name)).toEqual([
      "read_gene_seed_context",
      "read_gene_evidence",
      "read_referable_gene_insights",
    ]);
  });

  it("repairs invalid structured output once and fails after repeated invalid output", async () => {
    await expect(
      buildStructuredGeneExtractionSuggestions({
        llm: new SequenceLlm(["not json", validOutput()]),
        trace: new AgentTrace(),
        promptContext: "authorized context",
        maxRepairAttempts: 1,
      }),
    ).resolves.toMatchObject({
      suggestions: [{ title: "Keep emotional opening" }],
    });

    await expect(
      buildStructuredGeneExtractionSuggestions({
        llm: new SequenceLlm(["not json", "still not json"]),
        trace: new AgentTrace(),
        promptContext: "authorized context",
        maxRepairAttempts: 1,
      }),
    ).rejects.toMatchObject({ code: "AGENT_SKILL_ERROR" });
  });

  it("rejects generic suggestions without next-round usage advice", async () => {
    await expect(
      buildStructuredGeneExtractionSuggestions({
        llm: new SequenceLlm([
          validOutput({
            bodyMarkdown: "Open with emotion.",
            evidenceInterpretation: "The selected fruit used emotional framing.",
            nextRoundUsage: "Use it.",
          }),
          validOutput(),
        ]),
        trace: new AgentTrace(),
        promptContext: "authorized context",
        maxRepairAttempts: 1,
      }),
    ).resolves.toMatchObject({
      suggestions: [{ title: "Keep emotional opening" }],
    });
  });

  it("lets GeneService persist pending suggestions through the real AgentRuntime", async () => {
    const fixture = await createRuntimeFixture(new SequenceLlm([validOutput()]));
    const idGenerator = createIdGenerator();
    const now = createNow();
    const geneService = new GeneService({
      storage: fixture.geneStorage,
      contentAccess: fixture.geneContentAccess,
      seedStorage: fixture.seedStorage,
      fruitStorage: fixture.fruitStorage,
      agentPort: fixture.agentRuntime,
      idGenerator,
      now,
    });
    const result = await geneService.startExtractionTask("seed_1", {
      evidenceSources: [
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
          sourceId: "fruit_1",
          strength: "weak",
        },
      ],
    });

    expect(result.task.status).toBe(GENE_EXTRACTION_TASK_STATUSES.completed);
    expect(result.suggestions).toMatchObject([
      {
        status: GENE_SUGGESTION_STATUSES.pending,
        title: "Keep emotional opening",
      },
    ]);
    expect(result.suggestions[0]?.bodyMarkdown).toContain("positive gene");
    await expect(
      fixture.geneContentAccess.readGeneInsightMarkdown(
        "genes/seed-scoped/seed_1/gene-suggestion_1.md",
      ),
    ).rejects.toMatchObject({ code: "CONTENT_ACCESS_ERROR" });
  });

  it("does not save suggestions, write markdown, or confirm insights by itself", async () => {
    const fixture = await createRuntimeFixture(new SequenceLlm([validOutput()]));
    const result = await fixture.agentRuntime.runTask({
      taskId: "gene-task_1",
      type: "gene_extraction",
      input: {
        seedId: "seed_1",
        evidenceSources: [
          {
            sourceType: GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
            sourceId: "fruit_1",
            strength: "weak",
          },
        ],
        fruitEvidence: [
          {
            fruitId: "fruit_1",
            selectionState: "selected",
            contentLocation: "fruits/fruit_1.md",
            summary: "Mood expression",
            geneTags: ["emotion"],
          },
        ],
        referableGeneInsights: [
          {
            insightId: "gene_1",
            title: "Emotional value",
            lineage: "emotion",
            niche: "opening",
            contentLocation: "genes/seed-scoped/seed_1/gene_1.md",
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
    await expect(fixture.geneStorage.listSuggestionsBySeed("seed_1")).resolves.toEqual(
      [],
    );
    await expect(fixture.geneStorage.listInsightsBySeed("seed_1")).resolves.toHaveLength(
      1,
    );
  });
});
