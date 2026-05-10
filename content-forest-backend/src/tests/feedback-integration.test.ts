import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeRuntimeFilesystem } from "../app/bootstrap/runtime-filesystem.js";
import { FeedbackController } from "../interface/http/feedback-controller.js";
import { FeedbackService } from "../modules/feedback/application/feedback-service.js";
import { PublicationService } from "../modules/publication/application/publication-service.js";
import type { PublishableFruitPort } from "../modules/publication/application/publishable-fruit-port.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { SqliteFeedbackStorageAdapter } from "../storage/adapters/sqlite-feedback-storage-adapter.js";
import { SqlitePublicationStorageAdapter } from "../storage/adapters/sqlite-publication-storage-adapter.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-feedback-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Feedback module integration", () => {
  it("attaches manual monitor and records editable snapshots through the controller", async () => {
    const root = await createTempRoot();
    const config = {
      contentRootDir: join(root, "content"),
      databasePath: join(root, "app.sqlite"),
      port: 3001,
    };
    await initializeRuntimeFilesystem(config);

    let idCounter = 0;
    let timeCounter = 0;
    const idGenerator: IdGenerator = {
      nextId(prefix: string): string {
        idCounter += 1;
        return `${prefix}_integration_${idCounter}`;
      },
    };
    const publishableFruitPort: PublishableFruitPort = {
      async assertPublishable(_fruitId: string): Promise<void> {},
    };
    const publicationStorage = new SqlitePublicationStorageAdapter(
      config.databasePath,
    );
    const feedbackStorage = new SqliteFeedbackStorageAdapter(config.databasePath);
    const publicationService = new PublicationService({
      storage: publicationStorage,
      publishableFruitPort,
      idGenerator,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });
    const feedbackService = new FeedbackService({
      storage: feedbackStorage,
      publicationRecordPort: publicationService,
      idGenerator,
      now: () => {
        timeCounter += 1;
        return new Date(`2026-01-01T00:00:0${timeCounter}.000Z`);
      },
    });
    const controller = new FeedbackController(feedbackService);

    try {
      const publication = await publicationService.createPublicationRecord({
        fruitId: "fruit_selected",
        publicationTarget: "X post",
        publicationEvidence: "https://example.test/post/1",
      });
      const attachment = await controller.attachManualMonitor(publication.id);
      expect(attachment.status).toBe(201);
      expect(attachment.body).toMatchObject({
        id: "feedback-monitor_integration_2",
        publicationRecordId: publication.id,
      });

      const snapshot = await controller.createFeedbackSnapshot(publication.id, {
        performanceData: { views: 100, likes: 8 },
        userObservation: "opening works",
      });
      expect(snapshot.status).toBe(201);
      expect(snapshot.body).toMatchObject({
        id: "feedback-snapshot_integration_3",
        publicationRecordId: publication.id,
        performanceData: { views: 100, likes: 8 },
      });

      const snapshotBody = snapshot.body as { id: string };
      const edited = await controller.editFeedbackSnapshot(snapshotBody.id, {
        performanceData: { views: 140 },
        userObservation: "manual correction",
      });
      expect(edited.status).toBe(200);
      expect(edited.body).toMatchObject({
        id: snapshotBody.id,
        performanceData: { views: 140 },
        userObservation: "manual correction",
      });

      await expect(
        controller.getFeedbackHistory(publication.id),
      ).resolves.toMatchObject({
        status: 200,
        body: {
          publicationRecordId: publication.id,
          snapshots: [{ id: snapshotBody.id }],
        },
      });
    } finally {
      feedbackStorage.close();
      publicationStorage.close();
    }
  });
});
