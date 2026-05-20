import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { InMemoryMediaContentAccessAdapter } from "../content-access/adapters/in-memory-media-content-access-adapter.js";
import { LocalMediaContentAccessAdapter } from "../content-access/adapters/local-media-content-access-adapter.js";
import { MediaController } from "../interface/http/media-controller.js";
import { MediaService } from "../modules/media/application/media-service.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryMediaStorageAdapter } from "../storage/adapters/in-memory-media-storage-adapter.js";

const tempRoots: string[] = [];
const pngBytes = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
]);

function createIdGenerator(): IdGenerator {
  const counters = new Map<string, number>();
  return {
    nextId(prefix: string): string {
      const next = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, next);
      return `${prefix}_${next}`;
    },
  };
}

function createService(): {
  service: MediaService;
  storage: InMemoryMediaStorageAdapter;
  contentAccess: InMemoryMediaContentAccessAdapter;
} {
  const storage = new InMemoryMediaStorageAdapter();
  const contentAccess = new InMemoryMediaContentAccessAdapter();
  return {
    service: new MediaService({
      storage,
      contentAccess,
      idGenerator: createIdGenerator(),
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    }),
    storage,
    contentAccess,
  };
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("MediaService", () => {
  it("serves upload, detail, and content reads through the media controller", async () => {
    const { service } = createService();
    const controller = new MediaController(service);

    const created = await controller.createMediaAsset({
      seedId: "seed_1",
      fileName: "cover.png",
      mimeType: "image/png",
      contentBase64: pngBytes.toString("base64"),
    });
    const detail = await controller.getMediaAsset("media-asset_1");
    const content = await controller.readMediaContent("media-asset_1");

    expect(created.status).toBe(201);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id: "media-asset_1",
      contentUrl: "/api/media-assets/media-asset_1/content",
    });
    expect(content.asset.mimeType).toBe("image/png");
    expect(content.content.equals(pngBytes)).toBe(true);
  });

  it("uploads and reads image media without exposing the stored content location", async () => {
    const { service, storage } = createService();

    const asset = await service.createMediaAssetFromUpload({
      seedId: "seed_1",
      fileName: "C:\\Users\\dev\\cover.png",
      mimeType: "image/png",
      contentBase64: pngBytes.toString("base64"),
    });
    const stored = await storage.findMediaAssetById(asset.id);
    const read = await service.readMediaContent(asset.id);

    expect(asset).toMatchObject({
      id: "media-asset_1",
      seedId: "seed_1",
      mediaType: "image",
      mimeType: "image/png",
      fileName: "cover.png",
      contentUrl: "/api/media-assets/media-asset_1/content",
      canReference: true,
    });
    expect(read.content.equals(pngBytes)).toBe(true);
    expect(stored?.contentLocation).toBe("media/media-asset_1/cover.png");
    expect(isAbsolute(stored?.contentLocation ?? "")).toBe(false);
    expect(JSON.stringify(asset)).not.toContain("contentLocation");
    expect(JSON.stringify(asset)).not.toContain("C:\\Users");
  });

  it("rejects unsupported MIME types and mismatched image content", async () => {
    const { service } = createService();

    await expect(
      service.createMediaAssetFromUpload({
        seedId: "seed_1",
        fileName: "note.txt",
        mimeType: "text/plain",
        contentBase64: pngBytes.toString("base64"),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      service.createMediaAssetFromUpload({
        seedId: "seed_1",
        fileName: "cover.jpg",
        mimeType: "image/jpeg",
        contentBase64: pngBytes.toString("base64"),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});

describe("LocalMediaContentAccessAdapter", () => {
  it("stores media under a relative media location and rejects path escape attempts", async () => {
    const root = await mkdtemp(join(tmpdir(), "content-forest-media-"));
    tempRoots.push(root);
    const adapter = new LocalMediaContentAccessAdapter(root);

    const contentLocation = await adapter.createMediaContent({
      mediaAssetId: "media_1",
      fileName: "cover.png",
      content: pngBytes,
    });

    expect(contentLocation).toBe("media/media_1/cover.png");
    expect(isAbsolute(contentLocation)).toBe(false);
    await expect(adapter.readMediaContent(contentLocation)).resolves.toEqual(
      pngBytes,
    );
    await expect(adapter.readMediaContent("../outside.png")).rejects.toBeInstanceOf(
      ApplicationError,
    );
    await expect(
      adapter.readMediaContent(join(root, "media", "media_1", "cover.png")),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});
