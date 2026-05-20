import type {
  FruitMediaDisplayRole,
  MediaAssetSourceType,
  MediaType,
} from "../../modules/media/domain/media-types.js";

export interface MediaAssetRecord {
  id: string;
  seedId: string;
  mediaType: MediaType;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  contentLocation: string;
  sourceType: MediaAssetSourceType;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FruitMediaAttachmentRecord {
  id: string;
  fruitId: string;
  mediaAssetId: string;
  displayRole: FruitMediaDisplayRole;
  sortOrder: number;
  createdAt: string;
}

export interface FruitMediaAttachmentWithAssetRecord
  extends FruitMediaAttachmentRecord {
  mediaAsset: MediaAssetRecord;
}

export interface MediaStoragePort {
  createMediaAsset(record: MediaAssetRecord): Promise<void>;
  findMediaAssetById(mediaAssetId: string): Promise<MediaAssetRecord | null>;
  listMediaAssetsBySeedId(seedId: string): Promise<MediaAssetRecord[]>;
  replaceFruitMediaAttachments(
    fruitId: string,
    records: FruitMediaAttachmentRecord[],
  ): Promise<void>;
  listFruitMediaAttachments(
    fruitId: string,
  ): Promise<FruitMediaAttachmentWithAssetRecord[]>;
  listFruitMediaAttachmentsByFruitIds(
    fruitIds: string[],
  ): Promise<FruitMediaAttachmentWithAssetRecord[]>;
}
