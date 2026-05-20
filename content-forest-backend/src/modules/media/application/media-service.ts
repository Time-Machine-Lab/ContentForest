import type { MediaContentAccessPort } from "../../../content-access/ports/media-content-access-port.js";
import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type {
  FruitMediaAttachmentRecord,
  FruitMediaAttachmentWithAssetRecord,
  MediaAssetRecord,
  MediaStoragePort,
} from "../../../storage/ports/media-storage-port.js";
import {
  FRUIT_MEDIA_DISPLAY_ROLES,
  MEDIA_ASSET_SOURCE_TYPES,
  MEDIA_TYPES,
  type FruitMediaAttachmentSummary,
  type FruitMediaDisplayRole,
  type MediaAssetDetail,
  type MediaAssetSourceType,
  type MediaAssetSummary,
  type MediaType,
} from "../domain/media-types.js";

export interface CreateMediaAssetUploadInput {
  seedId: string;
  fileName: string;
  mimeType: string;
  contentBase64: string;
  sourceType?: MediaAssetSourceType;
  sourceId?: string | null;
}

export interface CreateMediaAssetFromBufferInput {
  seedId: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
  sourceType?: MediaAssetSourceType;
  sourceId?: string | null;
}

export interface MediaContentReadResult {
  asset: MediaAssetDetail;
  content: Buffer;
}

export interface MediaRefAuthorizationInput {
  resourceType: "media";
  resourceId: string;
  usage?: string;
}

export interface MediaServiceDependencies {
  storage: MediaStoragePort;
  contentAccess: MediaContentAccessPort;
  idGenerator?: IdGenerator;
  now?: () => Date;
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export class MediaService {
  private readonly storage: MediaStoragePort;
  private readonly contentAccess: MediaContentAccessPort;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;

  public constructor(dependencies: MediaServiceDependencies) {
    this.storage = dependencies.storage;
    this.contentAccess = dependencies.contentAccess;
    this.idGenerator = dependencies.idGenerator ?? new RandomIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
  }

  public async createMediaAssetFromUpload(
    input: CreateMediaAssetUploadInput,
  ): Promise<MediaAssetDetail> {
    return this.createMediaAssetFromBuffer({
      seedId: input.seedId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      content: this.decodeBase64(input.contentBase64),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    });
  }

  public async createMediaAssetFromBuffer(
    input: CreateMediaAssetFromBufferInput,
  ): Promise<MediaAssetDetail> {
    const seedId = this.requireNonBlank(input.seedId, "种子不能为空");
    const fileName = this.normalizeFileName(input.fileName);
    const mimeType = this.normalizeMimeType(input.mimeType);
    const mediaType = this.mediaTypeFromMimeType(mimeType);
    this.validateContent(input.content, mediaType, mimeType);

    const mediaAssetId = this.idGenerator.nextId("media-asset");
    const timestamp = this.timestamp();
    const contentLocation = await this.contentAccess.createMediaContent({
      mediaAssetId,
      fileName,
      content: input.content,
    });
    const record: MediaAssetRecord = {
      id: mediaAssetId,
      seedId,
      mediaType,
      mimeType,
      fileName,
      sizeBytes: input.content.byteLength,
      contentLocation,
      sourceType: this.normalizeSourceType(input.sourceType),
      sourceId: this.normalizeOptionalText(input.sourceId),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      await this.storage.createMediaAsset(record);
    } catch (error) {
      await this.contentAccess.removeMediaContent(contentLocation);
      throw error;
    }

    return this.toDetail(record);
  }

  public async getMediaAsset(mediaAssetId: string): Promise<MediaAssetDetail> {
    return this.toDetail(await this.requireMediaAsset(mediaAssetId));
  }

  public async readMediaContent(
    mediaAssetId: string,
  ): Promise<MediaContentReadResult> {
    const record = await this.requireMediaAsset(mediaAssetId);
    return {
      asset: this.toDetail(record),
      content: await this.contentAccess.readMediaContent(record.contentLocation),
    };
  }

  public async listReferableMediaAssets(
    seedId: string,
  ): Promise<MediaAssetSummary[]> {
    const records = await this.storage.listMediaAssetsBySeedId(
      this.requireNonBlank(seedId, "种子不能为空"),
    );
    return records.map((record) => this.toSummary(record));
  }

  public async assertMediaRefsReferable(
    seedId: string,
    refs: MediaRefAuthorizationInput[],
  ): Promise<void> {
    const normalizedSeedId = this.requireNonBlank(seedId, "种子不能为空");
    for (const ref of refs) {
      if (ref.resourceType !== "media") {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "媒体引用类型不正确",
          400,
        );
      }
      if ((ref.usage ?? "").trim().length === 0) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "媒体引用必须包含用途说明",
          400,
        );
      }
      const record = await this.requireMediaAsset(ref.resourceId);
      if (record.seedId !== normalizedSeedId) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "媒体资源不属于当前种子",
          400,
        );
      }
    }
  }

  public async listFruitMediaAttachments(
    fruitId: string,
  ): Promise<FruitMediaAttachmentSummary[]> {
    const rows = await this.storage.listFruitMediaAttachments(fruitId);
    return rows.map((row) => this.toFruitAttachmentSummary(row));
  }

  public async listFruitMediaAttachmentsByFruitIds(
    fruitIds: string[],
  ): Promise<Map<string, FruitMediaAttachmentSummary[]>> {
    const rows = await this.storage.listFruitMediaAttachmentsByFruitIds(fruitIds);
    const byFruitId = new Map<string, FruitMediaAttachmentSummary[]>();
    for (const row of rows) {
      const list = byFruitId.get(row.fruitId) ?? [];
      list.push(this.toFruitAttachmentSummary(row));
      byFruitId.set(row.fruitId, list);
    }
    return byFruitId;
  }

  public async replaceFruitMediaAttachments(
    fruitId: string,
    attachments: Array<{
      mediaAssetId: string;
      displayRole?: FruitMediaDisplayRole;
      sortOrder?: number;
    }>,
  ): Promise<void> {
    const normalizedFruitId = this.requireNonBlank(fruitId, "果实不能为空");
    const timestamp = this.timestamp();
    const records: FruitMediaAttachmentRecord[] = [];
    const seen = new Set<string>();
    for (const [index, attachment] of attachments.entries()) {
      const mediaAssetId = this.requireNonBlank(
        attachment.mediaAssetId,
        "媒体资源不能为空",
      );
      if (seen.has(mediaAssetId)) {
        continue;
      }
      seen.add(mediaAssetId);
      await this.requireMediaAsset(mediaAssetId);
      records.push({
        id: this.idGenerator.nextId("fruit-media"),
        fruitId: normalizedFruitId,
        mediaAssetId,
        displayRole: this.normalizeDisplayRole(attachment.displayRole),
        sortOrder: this.normalizeSortOrder(attachment.sortOrder, index),
        createdAt: timestamp,
      });
    }
    await this.storage.replaceFruitMediaAttachments(normalizedFruitId, records);
  }

  private async requireMediaAsset(
    mediaAssetId: string,
  ): Promise<MediaAssetRecord> {
    const id = this.requireNonBlank(mediaAssetId, "媒体资源不能为空");
    const record = await this.storage.findMediaAssetById(id);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "媒体资源不存在", 404);
    }
    return record;
  }

  private decodeBase64(value: string): Buffer {
    const normalized = value.replace(/\s+/g, "");
    if (
      normalized.length === 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
    ) {
      throw new ApplicationError("VALIDATION_ERROR", "媒体内容 Base64 格式不正确", 400);
    }
    return Buffer.from(normalized, "base64");
  }

  private validateContent(
    content: Buffer,
    mediaType: MediaType,
    mimeType: string,
  ): void {
    if (content.byteLength === 0) {
      throw new ApplicationError("VALIDATION_ERROR", "媒体内容不能为空", 400);
    }
    const limit = mediaType === MEDIA_TYPES.image ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (content.byteLength > limit) {
      throw new ApplicationError("VALIDATION_ERROR", "媒体文件超过大小限制", 400);
    }
    const detected = this.detectMimeType(content);
    if (detected !== null && detected !== mimeType) {
      throw new ApplicationError("VALIDATION_ERROR", "媒体 MIME 类型与内容不匹配", 400);
    }
    if (detected === null && mediaType === MEDIA_TYPES.image) {
      throw new ApplicationError("VALIDATION_ERROR", "图片内容格式不受支持", 400);
    }
  }

  private detectMimeType(content: Buffer): string | null {
    if (content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return "image/png";
    }
    if (content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) {
      return "image/jpeg";
    }
    const header = content.subarray(0, 12).toString("ascii");
    if (header.startsWith("GIF87a") || header.startsWith("GIF89a")) {
      return "image/gif";
    }
    if (header.startsWith("RIFF") && header.slice(8, 12) === "WEBP") {
      return "image/webp";
    }
    if (content.length >= 12 && content.subarray(4, 8).toString("ascii") === "ftyp") {
      return content.subarray(8, 12).toString("ascii").startsWith("qt")
        ? "video/quicktime"
        : "video/mp4";
    }
    if (content.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
      return "video/webm";
    }
    return null;
  }

  private mediaTypeFromMimeType(mimeType: string): MediaType {
    if (ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      return MEDIA_TYPES.image;
    }
    if (ALLOWED_VIDEO_MIME_TYPES.has(mimeType)) {
      return MEDIA_TYPES.video;
    }
    throw new ApplicationError("VALIDATION_ERROR", "媒体 MIME 类型不受支持", 400);
  }

  private normalizeMimeType(value: string): string {
    return this.requireNonBlank(value, "媒体 MIME 类型不能为空").toLowerCase();
  }

  private normalizeSourceType(
    value: MediaAssetSourceType | undefined,
  ): MediaAssetSourceType {
    if (value === undefined) {
      return MEDIA_ASSET_SOURCE_TYPES.userUpload;
    }
    if (Object.values(MEDIA_ASSET_SOURCE_TYPES).includes(value)) {
      return value;
    }
    throw new ApplicationError("VALIDATION_ERROR", "媒体来源类型不正确", 400);
  }

  private normalizeDisplayRole(
    value: FruitMediaDisplayRole | undefined,
  ): FruitMediaDisplayRole {
    if (value === undefined) {
      return FRUIT_MEDIA_DISPLAY_ROLES.attachment;
    }
    if (Object.values(FRUIT_MEDIA_DISPLAY_ROLES).includes(value)) {
      return value;
    }
    throw new ApplicationError("VALIDATION_ERROR", "媒体展示角色不正确", 400);
  }

  private normalizeSortOrder(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isInteger(value) && value >= 0
      ? value
      : fallback;
  }

  private normalizeFileName(value: string): string {
    const normalized = this.requireNonBlank(value, "媒体文件名不能为空")
      .replaceAll("\\", "/")
      .split("/")
      .filter((part) => part.length > 0)
      .at(-1) ?? "";
    return normalized.length > 0 ? normalized : "media.bin";
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    const normalized = value?.trim() ?? "";
    return normalized.length === 0 ? null : normalized;
  }

  private requireNonBlank(value: string, message: string): string {
    const normalized = value.trim();
    if (normalized.length === 0) {
      throw new ApplicationError("VALIDATION_ERROR", message, 400);
    }
    return normalized;
  }

  private toDetail(record: MediaAssetRecord): MediaAssetDetail {
    return {
      ...this.toSummary(record),
      canReference: true,
    };
  }

  private toSummary(record: MediaAssetRecord): MediaAssetSummary {
    return {
      id: record.id,
      seedId: record.seedId,
      mediaType: record.mediaType,
      mimeType: record.mimeType,
      fileName: record.fileName,
      sizeBytes: record.sizeBytes,
      sourceType: record.sourceType,
      sourceId: record.sourceId,
      contentUrl: this.contentUrl(record.id),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private toFruitAttachmentSummary(
    record: FruitMediaAttachmentWithAssetRecord,
  ): FruitMediaAttachmentSummary {
    return {
      ...this.toSummary(record.mediaAsset),
      displayRole: record.displayRole,
      sortOrder: record.sortOrder,
      attachedAt: record.createdAt,
    };
  }

  private contentUrl(mediaAssetId: string): string {
    return `/api/media-assets/${encodeURIComponent(mediaAssetId)}/content`;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}
