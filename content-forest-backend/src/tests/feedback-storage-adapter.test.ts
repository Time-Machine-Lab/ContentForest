import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FEEDBACK_MONITOR_TYPES } from "../modules/feedback/domain/feedback-types.js";
import { SqliteFeedbackStorageAdapter } from "../storage/adapters/sqlite-feedback-storage-adapter.js";

const tempRoots: string[] = [];
const now = "2026-01-01T00:00:00.000Z";

async function createStorage(): Promise<SqliteFeedbackStorageAdapter> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-feedback-storage-"));
  tempRoots.push(root);
  return new SqliteFeedbackStorageAdapter(join(root, "app.sqlite"));
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("SqliteFeedbackStorageAdapter", () => {
  it("persists monitor attachments and ordered feedback snapshots", async () => {
    const storage = await createStorage();
    try {
      await storage.createMonitorAttachment({
        id: "feedback-monitor_1",
        publicationRecordId: "publication_1",
        monitorType: FEEDBACK_MONITOR_TYPES.manual,
        createdAt: now,
        updatedAt: now,
      });
      await storage.createFeedbackSnapshot({
        id: "feedback-snapshot_2",
        publicationRecordId: "publication_1",
        monitorAttachmentId: "feedback-monitor_1",
        performanceData: { views: 200 },
        userObservation: "second",
        capturedAt: "2026-01-02T00:00:00.000Z",
        createdAt: now,
        updatedAt: now,
      });
      await storage.createFeedbackSnapshot({
        id: "feedback-snapshot_1",
        publicationRecordId: "publication_1",
        monitorAttachmentId: "feedback-monitor_1",
        performanceData: { views: 100, nested: { saves: 5 } },
        userObservation: "first",
        capturedAt: "2026-01-01T00:00:00.000Z",
        createdAt: now,
        updatedAt: now,
      });

      await expect(
        storage.findMonitorAttachmentByPublicationRecordId("publication_1"),
      ).resolves.toMatchObject({
        id: "feedback-monitor_1",
        monitorType: FEEDBACK_MONITOR_TYPES.manual,
      });
      await expect(
        storage.hasMonitorAttachmentForPublicationRecord("publication_1"),
      ).resolves.toBe(true);
      await expect(
        storage.listFeedbackSnapshotsByPublicationRecord("publication_1"),
      ).resolves.toMatchObject([
        { id: "feedback-snapshot_1", performanceData: { nested: { saves: 5 } } },
        { id: "feedback-snapshot_2", performanceData: { views: 200 } },
      ]);

      await storage.saveFeedbackSnapshot({
        id: "feedback-snapshot_1",
        publicationRecordId: "publication_1",
        monitorAttachmentId: "feedback-monitor_1",
        performanceData: { views: 150 },
        userObservation: "corrected",
        capturedAt: "2026-01-01T00:00:00.000Z",
        createdAt: now,
        updatedAt: "2026-01-01T01:00:00.000Z",
      });
      await expect(
        storage.findFeedbackSnapshotById("feedback-snapshot_1"),
      ).resolves.toMatchObject({
        performanceData: { views: 150 },
        userObservation: "corrected",
      });
    } finally {
      storage.close();
    }
  });
});
