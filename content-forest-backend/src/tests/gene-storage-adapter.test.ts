import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  GENE_EXTRACTION_TASK_STATUSES,
  GENE_INSIGHT_STATUSES,
  GENE_REMINDER_STATUSES,
  GENE_SUGGESTION_STATUSES,
  type GeneEvidenceSource,
} from "../modules/gene/domain/gene-types.js";
import { InMemoryGeneStorageAdapter } from "../storage/adapters/in-memory-gene-storage-adapter.js";
import { SqliteGeneStorageAdapter } from "../storage/adapters/sqlite-gene-storage-adapter.js";
import type { GeneStoragePort } from "../storage/ports/gene-storage-port.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-gene-storage-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Gene storage adapters", () => {
  it("supports lifecycle queries with the in-memory adapter", async () => {
    await exerciseStorage(new InMemoryGeneStorageAdapter());
  });

  it("supports lifecycle queries with the SQLite adapter", async () => {
    const root = await createTempRoot();
    const storage = new SqliteGeneStorageAdapter(join(root, "app.sqlite"));
    try {
      await exerciseStorage(storage);
    } finally {
      storage.close();
    }
  });
});

async function exerciseStorage(storage: GeneStoragePort): Promise<void> {
  const evidenceSources: GeneEvidenceSource[] = [
    {
      sourceType: "fruit_selected",
      sourceId: "fruit_1",
      strength: "weak",
    },
  ];

  await storage.upsertGeneLibrary({
    seedId: "seed_1",
    contentLocation: "genes/seed-scoped/seed_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  await storage.createReminder({
    id: "reminder_1",
    seedId: "seed_1",
    status: GENE_REMINDER_STATUSES.pending,
    evidenceSources,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  await storage.saveReminder({
    id: "reminder_1",
    seedId: "seed_1",
    status: GENE_REMINDER_STATUSES.ignored,
    evidenceSources,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:01.000Z",
  });
  await storage.createExtractionTask({
    id: "task_1",
    seedId: "seed_1",
    status: GENE_EXTRACTION_TASK_STATUSES.running,
    failureReason: null,
    evidenceSources,
    agentInput: { seedId: "seed_1" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  await storage.saveExtractionTask({
    id: "task_1",
    seedId: "seed_1",
    status: GENE_EXTRACTION_TASK_STATUSES.completed,
    failureReason: null,
    evidenceSources,
    agentInput: { seedId: "seed_1" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:01.000Z",
  });
  await storage.createSuggestion({
    id: "suggestion_1",
    seedId: "seed_1",
    taskId: "task_1",
    status: GENE_SUGGESTION_STATUSES.pending,
    title: "标题",
    bodyMarkdown: "正文",
    lineage: "谱系",
    niche: "生态位",
    evidenceSources,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  await storage.createInsight({
    id: "insight_1",
    seedId: "seed_1",
    suggestionId: "suggestion_1",
    status: GENE_INSIGHT_STATUSES.active,
    title: "标题",
    lineage: "谱系",
    niche: "生态位",
    contentLocation: "genes/seed-scoped/seed_1/insight_1.md",
    evidenceSources,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
  });

  await expect(storage.findGeneLibraryBySeedId("seed_1")).resolves.toMatchObject({
    seedId: "seed_1",
  });
  await expect(
    storage.listRemindersBySeedAndStatus("seed_1", GENE_REMINDER_STATUSES.pending),
  ).resolves.toHaveLength(0);
  await expect(storage.findExtractionTaskById("task_1")).resolves.toMatchObject({
    status: GENE_EXTRACTION_TASK_STATUSES.completed,
  });
  await expect(
    storage.listSuggestionsBySeedAndStatus(
      "seed_1",
      GENE_SUGGESTION_STATUSES.pending,
    ),
  ).resolves.toHaveLength(1);
  await expect(storage.listReferableInsightsBySeed("seed_1")).resolves.toHaveLength(1);

  const insight = await storage.findInsightById("insight_1");
  if (insight === null) {
    throw new Error("insight missing");
  }
  await storage.saveInsight({
    ...insight,
    status: GENE_INSIGHT_STATUSES.archived,
    updatedAt: "2026-01-01T00:00:02.000Z",
    archivedAt: "2026-01-01T00:00:02.000Z",
  });
  await expect(storage.listReferableInsightsBySeed("seed_1")).resolves.toHaveLength(0);
}
