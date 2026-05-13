import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FeedbackController } from "../interface/http/feedback-controller.js";
import type { PublicationRecordPort } from "../modules/feedback/application/publication-record-port.js";
import { FeedbackService } from "../modules/feedback/application/feedback-service.js";
import { FEEDBACK_MONITOR_TYPES } from "../modules/feedback/domain/feedback-types.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryFeedbackStorageAdapter } from "../storage/adapters/in-memory-feedback-storage-adapter.js";

function createFeedbackService(options?: {
  publicationExists?: boolean;
  observationPort?: ConstructorParameters<typeof FeedbackService>[0]["networkObservationPort"];
}): FeedbackService {
  let idCounter = 0;
  let timeCounter = 0;
  const idGenerator: IdGenerator = {
    nextId(prefix: string): string {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
  };
  const publicationRecordPort: PublicationRecordPort = {
    async assertPublicationRecordExists(_publicationRecordId: string): Promise<void> {
      if (options?.publicationExists === false) {
        throw new ApplicationError(
          "NOT_FOUND",
          "Publication record does not exist",
          404,
        );
      }
    },
  };

  return new FeedbackService({
    storage: new InMemoryFeedbackStorageAdapter(),
    publicationRecordPort,
    networkObservationPort: options?.observationPort,
    idGenerator,
    now: () => {
      timeCounter += 1;
      return new Date(`2026-01-01T00:00:0${timeCounter}.000Z`);
    },
  });
}

describe("FeedbackService", () => {
  it("attaches one manual monitor to an existing publication record", async () => {
    const service = createFeedbackService();

    const attachment = await service.attachManualMonitor("publication_1");

    expect(attachment).toMatchObject({
      id: "feedback-monitor_1",
      publicationRecordId: "publication_1",
      monitorType: FEEDBACK_MONITOR_TYPES.manual,
      createdAt: "2026-01-01T00:00:01.000Z",
      updatedAt: "2026-01-01T00:00:01.000Z",
    });
    await expect(
      service.attachManualMonitor("publication_1"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects monitor attachment and snapshots when publication or monitor is missing", async () => {
    const missingPublicationService = createFeedbackService({
      publicationExists: false,
    });
    await expect(
      missingPublicationService.attachManualMonitor("publication_missing"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const service = createFeedbackService();
    await expect(
      service.createFeedbackSnapshot("publication_1", {
        performanceData: { views: 100 },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("creates and edits feedback snapshots without changing immutable relations", async () => {
    const service = createFeedbackService();
    await service.attachManualMonitor("publication_1");

    const first = await service.createFeedbackSnapshot("publication_1", {
      performanceData: { views: 100, likes: 8 },
      userObservation: "good opening",
    });
    const second = await service.createFeedbackSnapshot("publication_1", {
      performanceData: { views: 180 },
      userObservation: "keeps growing",
      capturedAt: "2026-01-02T00:00:00.000Z",
    });
    const edited = await service.editFeedbackSnapshot(first.id, {
      performanceData: { views: 120, likes: 10 },
      userObservation: "corrected",
    });
    const history = await service.getFeedbackHistory("publication_1");

    expect(edited).toMatchObject({
      id: first.id,
      publicationRecordId: "publication_1",
      monitorAttachmentId: first.monitorAttachmentId,
      performanceData: { views: 120, likes: 10 },
      userObservation: "corrected",
      capturedAt: first.capturedAt,
      createdAt: first.createdAt,
      updatedAt: "2026-01-01T00:00:04.000Z",
    });
    expect(history.monitorAttachment).toMatchObject({
      id: first.monitorAttachmentId,
    });
    expect(history.snapshots).toMatchObject([
      { id: first.id, performanceData: { views: 120, likes: 10 } },
      { id: second.id, performanceData: { views: 180 } },
    ]);
  });

  it("does not expose delete, archive, fruit mutation, or gene extraction triggers", () => {
    const service = createFeedbackService();
    const controller = new FeedbackController(service);

    expect("deleteFeedbackSnapshot" in service).toBe(false);
    expect("archiveFeedbackSnapshot" in service).toBe(false);
    expect("selectFruit" in service).toBe(false);
    expect("startGeneExtractionTask" in service).toBe(false);
    expect("deleteFeedbackSnapshot" in controller).toBe(false);
  });

  it("observes publication links without creating feedback snapshots", async () => {
    const service = createFeedbackService({
      observationPort: {
        async observeUrl(input) {
          return {
            url: input.url,
            sourceDomain: "xiaohongshu.com",
            platform: input.platform ?? null,
            capturedAt: "2026-01-02T00:00:00.000Z",
            accessStatus: "accessible",
            metrics: { likes: 88 },
            missingMetrics: [],
            sourceMethod: "fake",
            rawExcerpt: "点赞 88",
            providerName: "fake_provider",
          };
        },
      },
    });
    await service.attachManualMonitor("publication_1");

    const observation = await service.observePublicationLink("publication_1", {
      url: "https://www.xiaohongshu.com/explore/1",
      platform: "小红书",
    });
    const history = await service.getFeedbackHistory("publication_1");

    expect(observation).toMatchObject({
      metrics: { likes: 88 },
      providerName: "fake_provider",
    });
    expect(history.snapshots).toEqual([]);
  });

  it("does not require network observation for manual snapshots", async () => {
    const service = createFeedbackService();
    await service.attachManualMonitor("publication_1");

    const snapshot = await service.createFeedbackSnapshot("publication_1", {
      performanceData: { views: 100 },
    });

    expect(snapshot.performanceData).toEqual({ views: 100 });
  });

  it("keeps the top-level API contract free of unsupported capabilities", async () => {
    const apiContract = await readFile(
      join(process.cwd(), "..", "docs", "api", "feedback.yaml"),
      "utf8",
    );

    expect(apiContract).not.toContain("delete:");
    expect(apiContract).not.toContain("/archive");
    expect(apiContract).not.toContain("fitnessScore");
    expect(apiContract).not.toContain("autoMonitor");
  });
});
