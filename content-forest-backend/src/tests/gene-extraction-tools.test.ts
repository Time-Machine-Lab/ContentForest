import { describe, expect, it } from "vitest";
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
  GENE_INSIGHT_STATUSES,
} from "../modules/gene/domain/gene-types.js";
import { PUBLICATION_PUBLISHER_TYPES } from "../modules/publication/domain/publication-types.js";
import { SEED_ARCHIVE_STATES } from "../modules/seed/domain/seed-types.js";
import { InMemoryFruitStorageAdapter } from "../storage/adapters/in-memory-fruit-storage-adapter.js";
import { InMemoryFeedbackStorageAdapter } from "../storage/adapters/in-memory-feedback-storage-adapter.js";
import { InMemoryGeneStorageAdapter } from "../storage/adapters/in-memory-gene-storage-adapter.js";
import { InMemoryPublicationStorageAdapter } from "../storage/adapters/in-memory-publication-storage-adapter.js";
import { InMemorySeedStorageAdapter } from "../storage/adapters/in-memory-seed-storage-adapter.js";
import type { AgentTaskContext } from "../agent/runtime/agent-task.js";

const now = "2026-01-01T00:00:00.000Z";

async function createFixture() {
  const seedStorage = new InMemorySeedStorageAdapter();
  const fruitStorage = new InMemoryFruitStorageAdapter();
  const feedbackStorage = new InMemoryFeedbackStorageAdapter();
  const geneStorage = new InMemoryGeneStorageAdapter();
  const publicationStorage = new InMemoryPublicationStorageAdapter();
  const seedContentAccess = new InMemorySeedMarkdownContentAccessAdapter();
  const fruitContentAccess = new InMemoryFruitMarkdownContentAccessAdapter();
  const geneContentAccess = new InMemoryGeneMarkdownContentAccessAdapter();

  const seedLocation = await seedContentAccess.createSeedMarkdown({
    seedId: "seed_1",
    markdown: "# Wallpaper seed",
  });
  await seedStorage.createSeed({
    id: "seed_1",
    title: "Wallpaper project",
    archiveState: SEED_ARCHIVE_STATES.active,
    contentLocation: seedLocation,
    rootNodeId: "seed-node_seed_1",
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
  await seedStorage.createSeed({
    id: "seed_2",
    title: "Other seed",
    archiveState: SEED_ARCHIVE_STATES.active,
    contentLocation: "seeds/seed_2.md",
    rootNodeId: "seed-node_seed_2",
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });

  const selectedLocation = await fruitContentAccess.createFruitMarkdown({
    fruitId: "fruit_selected",
    markdown: "Selected fruit markdown",
  });
  await fruitStorage.createFruit({
    id: "fruit_selected",
    selectionState: FRUIT_SELECTION_STATES.selected,
    parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
    contentLocation: selectedLocation,
    generatorId: null,
    summary: "Selected expression",
    geneTags: ["emotion"],
    createdAt: now,
    updatedAt: now,
  });
  const eliminatedLocation = await fruitContentAccess.createFruitMarkdown({
    fruitId: "fruit_eliminated",
    markdown: "Eliminated fruit markdown",
  });
  await fruitStorage.createFruit({
    id: "fruit_eliminated",
    selectionState: FRUIT_SELECTION_STATES.eliminated,
    parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
    contentLocation: eliminatedLocation,
    generatorId: null,
    summary: "Eliminated expression",
    geneTags: ["feature-only"],
    createdAt: now,
    updatedAt: now,
  });
  await publicationStorage.createPublicationRecord({
    id: "publication_1",
    fruitId: "fruit_selected",
    publisherType: PUBLICATION_PUBLISHER_TYPES.manual,
    publicationTarget: "x",
    publicationEvidence: "https://example.com/post",
    publicationNote: "manual publish",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await feedbackStorage.createMonitorAttachment({
    id: "feedback-monitor_1",
    publicationRecordId: "publication_1",
    monitorType: "manual",
    createdAt: now,
    updatedAt: now,
  });
  await feedbackStorage.createFeedbackSnapshot({
    id: "feedback_1",
    publicationRecordId: "publication_1",
    monitorAttachmentId: "feedback-monitor_1",
    performanceData: { views: 100, likes: 8 },
    userObservation: "manual data pull",
    capturedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await geneContentAccess.prepareSeedGeneLibrary("seed_1");
  const insightLocation = await geneContentAccess.createGeneInsightMarkdown({
    seedId: "seed_1",
    insightId: "gene_active",
    markdown: "Existing active gene markdown",
  });
  await geneStorage.createInsight({
    id: "gene_active",
    seedId: "seed_1",
    suggestionId: null,
    status: GENE_INSIGHT_STATUSES.active,
    title: "Existing gene",
    lineage: "emotion",
    niche: "opening",
    contentLocation: insightLocation,
    evidenceSources: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
  const archivedLocation = await geneContentAccess.createGeneInsightMarkdown({
    seedId: "seed_1",
    insightId: "gene_archived",
    markdown: "Archived gene markdown",
  });
  await geneStorage.createInsight({
    id: "gene_archived",
    seedId: "seed_1",
    suggestionId: null,
    status: GENE_INSIGHT_STATUSES.archived,
    title: "Archived gene",
    lineage: "old",
    niche: "old",
    contentLocation: archivedLocation,
    evidenceSources: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: now,
  });
  const otherInsightLocation = await geneContentAccess.createGeneInsightMarkdown({
    seedId: "seed_2",
    insightId: "gene_other",
    markdown: "Other seed gene markdown",
  });
  await geneStorage.createInsight({
    id: "gene_other",
    seedId: "seed_2",
    suggestionId: null,
    status: GENE_INSIGHT_STATUSES.active,
    title: "Other gene",
    lineage: "other",
    niche: "other",
    contentLocation: otherInsightLocation,
    evidenceSources: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });

  return {
    seedStorage,
    fruitStorage,
    feedbackStorage,
    geneStorage,
    publicationStorage,
    seedContentAccess,
    fruitContentAccess,
    geneContentAccess,
  };
}

function context(
  overrides: Partial<AgentTaskContext["input"]> = {},
): AgentTaskContext {
  return {
    taskId: "gene-task_1",
    taskType: "gene_extraction",
    input: {
      seedId: "seed_1",
      evidenceSources: [
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
          sourceId: "fruit_selected",
          strength: "weak",
        },
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.fruitEliminated,
          sourceId: "fruit_eliminated",
          strength: "weak",
        },
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.publication,
          sourceId: "publication_1",
          strength: "medium",
        },
        {
          sourceType: GENE_EVIDENCE_SOURCE_TYPES.feedback,
          sourceId: "feedback_1",
          strength: "strong",
        },
      ],
      fruitEvidence: [
        {
          fruitId: "fruit_selected",
          selectionState: "selected",
          contentLocation: "fruits/fruit_selected.md",
          summary: "Selected expression",
          geneTags: ["emotion"],
        },
        {
          fruitId: "fruit_eliminated",
          selectionState: "eliminated",
          contentLocation: "fruits/fruit_eliminated.md",
          summary: "Eliminated expression",
          geneTags: ["feature-only"],
        },
      ],
      referableGeneInsights: [
        {
          insightId: "gene_active",
          title: "Existing gene",
          lineage: "emotion",
          niche: "opening",
          contentLocation: "genes/seed-scoped/seed_1/gene_active.md",
        },
        {
          insightId: "gene_archived",
          title: "Archived gene",
          lineage: "old",
          niche: "old",
          contentLocation: "genes/seed-scoped/seed_1/gene_archived.md",
        },
      ],
      ...overrides,
    },
    metadata: {},
    startedAt: now,
  };
}

describe("gene extraction read tools", () => {
  it("reads authorized seed context without leaking absolute paths", async () => {
    const fixture = await createFixture();
    const tool = new ReadGeneSeedContextTool(fixture);

    const output = await tool.execute({}, context());

    expect(output.content).toMatchObject({
      seedId: "seed_1",
      title: "Wallpaper project",
      markdown: "# Wallpaper seed",
    });
    expect(JSON.stringify(output.content)).not.toContain(":\\");
    await expect(tool.execute({ seedId: "seed_2" }, context())).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("reads fruit, publication and feedback evidence", async () => {
    const fixture = await createFixture();
    const tool = new ReadGeneEvidenceTool(fixture);

    const output = await tool.execute({}, context());
    const content = output.content as {
      evidence: Array<Record<string, unknown>>;
      unsupportedEvidence: Array<Record<string, unknown>>;
    };

    expect(content.evidence).toHaveLength(4);
    expect(content.evidence[0]).toMatchObject({
      evidenceType: GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
      evidenceDirection: "positive",
      fruit: { markdown: "Selected fruit markdown" },
    });
    expect(content.evidence[1]).toMatchObject({
      evidenceType: GENE_EVIDENCE_SOURCE_TYPES.fruitEliminated,
      evidenceDirection: "negative",
      fruit: { markdown: "Eliminated fruit markdown" },
    });
    expect(content.evidence[2]).toMatchObject({
      evidenceType: GENE_EVIDENCE_SOURCE_TYPES.publication,
      publication: {
        publicationTarget: "x",
        publicationEvidence: "https://example.com/post",
        publicationNote: "manual publish",
        publishedAt: now,
      },
    });
    expect(content.evidence[3]).toMatchObject({
      evidenceType: GENE_EVIDENCE_SOURCE_TYPES.feedback,
      publication: {
        publicationRecordId: "publication_1",
        publicationTarget: "x",
      },
      feedback: {
        snapshotId: "feedback_1",
        monitorType: "manual",
        performanceData: { views: 100, likes: 8 },
        userObservation: "manual data pull",
      },
    });
    expect(content.unsupportedEvidence).toEqual([]);

    await expect(
      tool.execute({ sourceIds: ["fruit_not_authorized"] }, context()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("reads active referable insights and rejects unauthorized insight access", async () => {
    const fixture = await createFixture();
    const tool = new ReadReferableGeneInsightsTool(fixture);

    const output = await tool.execute({}, context());
    expect(output.content).toMatchObject({
      insights: [
        {
          insightId: "gene_active",
          markdown: "Existing active gene markdown",
        },
      ],
    });

    await expect(
      tool.execute({ insightIds: ["gene_other"] }, context()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      tool.execute(
        { insightIds: ["gene_other"] },
        context({
          referableGeneInsights: [
            {
              insightId: "gene_other",
              title: "Other gene",
              lineage: "other",
              niche: "other",
              contentLocation: "genes/seed-scoped/seed_2/gene_other.md",
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
