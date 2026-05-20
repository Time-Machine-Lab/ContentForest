import type {
  FruitMediaAttachmentRecord,
  FruitMediaAttachmentWithAssetRecord,
  MediaAssetRecord,
  MediaStoragePort,
} from "../ports/media-storage-port.js";

export class InMemoryMediaStorageAdapter implements MediaStoragePort {
  private readonly mediaAssets = new Map<string, MediaAssetRecord>();
  private readonly attachments = new Map<string, FruitMediaAttachmentRecord[]>();

  public async createMediaAsset(record: MediaAssetRecord): Promise<void> {
    this.mediaAssets.set(record.id, this.cloneAsset(record));
  }

  public async findMediaAssetById(
    mediaAssetId: string,
  ): Promise<MediaAssetRecord | null> {
    const record = this.mediaAssets.get(mediaAssetId);
    return record === undefined ? null : this.cloneAsset(record);
  }

  public async listMediaAssetsBySeedId(
    seedId: string,
  ): Promise<MediaAssetRecord[]> {
    return [...this.mediaAssets.values()]
      .filter((record) => record.seedId === seedId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => this.cloneAsset(record));
  }

  public async replaceFruitMediaAttachments(
    fruitId: string,
    records: FruitMediaAttachmentRecord[],
  ): Promise<void> {
    this.attachments.set(
      fruitId,
      records
        .map((record) => this.cloneAttachment(record))
        .sort((left, right) => left.sortOrder - right.sortOrder),
    );
  }

  public async listFruitMediaAttachments(
    fruitId: string,
  ): Promise<FruitMediaAttachmentWithAssetRecord[]> {
    return this.attachmentsWithAssets(this.attachments.get(fruitId) ?? []);
  }

  public async listFruitMediaAttachmentsByFruitIds(
    fruitIds: string[],
  ): Promise<FruitMediaAttachmentWithAssetRecord[]> {
    const fruitIdSet = new Set(fruitIds);
    return this.attachmentsWithAssets(
      [...this.attachments.entries()]
        .filter(([fruitId]) => fruitIdSet.has(fruitId))
        .flatMap(([, records]) => records),
    );
  }

  private attachmentsWithAssets(
    records: FruitMediaAttachmentRecord[],
  ): FruitMediaAttachmentWithAssetRecord[] {
    return records.flatMap((record) => {
      const asset = this.mediaAssets.get(record.mediaAssetId);
      return asset === undefined
        ? []
        : [{ ...this.cloneAttachment(record), mediaAsset: this.cloneAsset(asset) }];
    });
  }

  private cloneAsset(record: MediaAssetRecord): MediaAssetRecord {
    return { ...record };
  }

  private cloneAttachment(
    record: FruitMediaAttachmentRecord,
  ): FruitMediaAttachmentRecord {
    return { ...record };
  }
}
