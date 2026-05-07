import type { PublicationRecord } from "../../modules/publication/domain/publication-types.js";

export interface PublicationStoragePort {
  createPublicationRecord(record: PublicationRecord): Promise<void>;
  savePublicationRecord(record: PublicationRecord): Promise<void>;
  findPublicationRecordById(
    publicationRecordId: string,
  ): Promise<PublicationRecord | null>;
  listPublicationRecordsByFruit(fruitId: string): Promise<PublicationRecord[]>;
  hasPublicationRecord(publicationRecordId: string): Promise<boolean>;
}

