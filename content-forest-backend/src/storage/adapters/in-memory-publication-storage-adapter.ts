import type { PublicationRecord } from "../../modules/publication/domain/publication-types.js";
import type { PublicationStoragePort } from "../ports/publication-storage-port.js";

export class InMemoryPublicationStorageAdapter
  implements PublicationStoragePort
{
  private readonly records = new Map<string, PublicationRecord>();

  public async createPublicationRecord(
    record: PublicationRecord,
  ): Promise<void> {
    this.records.set(record.id, this.cloneRecord(record));
  }

  public async savePublicationRecord(record: PublicationRecord): Promise<void> {
    this.records.set(record.id, this.cloneRecord(record));
  }

  public async findPublicationRecordById(
    publicationRecordId: string,
  ): Promise<PublicationRecord | null> {
    const record = this.records.get(publicationRecordId);
    return record === undefined ? null : this.cloneRecord(record);
  }

  public async listPublicationRecordsByFruit(
    fruitId: string,
  ): Promise<PublicationRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.fruitId === fruitId)
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
      .map((record) => this.cloneRecord(record));
  }

  public async hasPublicationRecord(
    publicationRecordId: string,
  ): Promise<boolean> {
    return this.records.has(publicationRecordId);
  }

  private cloneRecord(record: PublicationRecord): PublicationRecord {
    return { ...record };
  }
}

