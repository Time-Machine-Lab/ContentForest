import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PublicationController } from "../interface/http/publication-controller.js";
import type { PublishableFruitPort } from "../modules/publication/application/publishable-fruit-port.js";
import { PublicationService } from "../modules/publication/application/publication-service.js";
import { PUBLICATION_PUBLISHER_TYPES } from "../modules/publication/domain/publication-types.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryPublicationStorageAdapter } from "../storage/adapters/in-memory-publication-storage-adapter.js";

function createPublicationService(options?: {
  publishable?: boolean;
}): PublicationService {
  let idCounter = 0;
  let timeCounter = 0;
  const idGenerator: IdGenerator = {
    nextId(prefix: string): string {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
  };
  const publishableFruitPort: PublishableFruitPort = {
    async assertPublishable(_fruitId: string): Promise<void> {
      if (options?.publishable === false) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Fruit is not publishable",
          400,
        );
      }
    },
  };

  return new PublicationService({
    storage: new InMemoryPublicationStorageAdapter(),
    publishableFruitPort,
    idGenerator,
    now: () => {
      timeCounter += 1;
      return new Date(`2026-01-01T00:00:0${timeCounter}.000Z`);
    },
  });
}

describe("PublicationService", () => {
  it("creates a manual publication record for a publishable fruit", async () => {
    const service = createPublicationService();

    const record = await service.createPublicationRecord({
      fruitId: "fruit_selected",
      publicationTarget: "X post",
      publicationEvidence: "https://example.test/post/1",
      publicationNote: "manual confirmation",
    });

    expect(record).toMatchObject({
      id: "publication_1",
      fruitId: "fruit_selected",
      publisherType: PUBLICATION_PUBLISHER_TYPES.manual,
      publicationTarget: "X post",
      publicationEvidence: "https://example.test/post/1",
      publicationNote: "manual confirmation",
      publishedAt: "2026-01-01T00:00:01.000Z",
      createdAt: "2026-01-01T00:00:01.000Z",
      updatedAt: "2026-01-01T00:00:01.000Z",
    });
  });

  it("rejects publication creation when the fruit is not publishable", async () => {
    const service = createPublicationService({ publishable: false });

    await expect(
      service.createPublicationRecord({
        fruitId: "fruit_candidate",
        publicationTarget: "X post",
        publicationEvidence: "https://example.test/post/1",
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      service.listPublicationRecordsByFruit("fruit_candidate"),
    ).resolves.toHaveLength(0);
  });

  it("edits target, evidence, and note without changing fruit or publication time", async () => {
    const service = createPublicationService();
    const record = await service.createPublicationRecord({
      fruitId: "fruit_selected",
      publicationTarget: "X post",
      publicationEvidence: "old evidence",
      publicationNote: "old note",
    });

    const edited = await service.editPublicationRecord(record.id, {
      publicationTarget: "X thread",
      publicationEvidence: "new evidence",
      publicationNote: "",
    });

    expect(edited).toMatchObject({
      id: record.id,
      fruitId: "fruit_selected",
      publisherType: PUBLICATION_PUBLISHER_TYPES.manual,
      publicationTarget: "X thread",
      publicationEvidence: "new evidence",
      publicationNote: "",
      publishedAt: record.publishedAt,
      createdAt: record.createdAt,
      updatedAt: "2026-01-01T00:00:02.000Z",
    });
  });

  it("views a record, lists multiple records by fruit, and validates existence", async () => {
    const service = createPublicationService();
    const first = await service.createPublicationRecord({
      fruitId: "fruit_selected",
      publicationTarget: "X post",
      publicationEvidence: "first",
    });
    const second = await service.createPublicationRecord({
      fruitId: "fruit_selected",
      publicationTarget: "Rednote post",
      publicationEvidence: "second",
    });
    await service.createPublicationRecord({
      fruitId: "other_fruit",
      publicationTarget: "Other",
      publicationEvidence: "other",
    });

    await expect(service.getPublicationRecord(first.id)).resolves.toMatchObject({
      id: first.id,
    });
    await expect(
      service.listPublicationRecordsByFruit("fruit_selected"),
    ).resolves.toMatchObject([{ id: second.id }, { id: first.id }]);
    await expect(
      service.assertPublicationRecordExists(second.id),
    ).resolves.toBeUndefined();
    await expect(
      service.assertPublicationRecordExists("missing"),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it("does not expose delete, archive, attachment upload, or automatic publishing capabilities", () => {
    const service = createPublicationService();
    const controller = new PublicationController(service);

    expect("deletePublicationRecord" in service).toBe(false);
    expect("archivePublicationRecord" in service).toBe(false);
    expect("uploadPublicationScreenshot" in controller).toBe(false);
    expect("autoPublish" in controller).toBe(false);
  });

  it("keeps the top-level API contract free of unsupported capabilities", async () => {
    const apiContract = await readFile(
      join(process.cwd(), "..", "docs", "api", "publication.yaml"),
      "utf8",
    );

    expect(apiContract).not.toContain("delete:");
    expect(apiContract).not.toContain("/archive");
    expect(apiContract).not.toContain("multipart/form-data");
    expect(apiContract).not.toContain("autoPublish");
  });
});
