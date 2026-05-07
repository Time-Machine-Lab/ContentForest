import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type { PublicationStoragePort } from "../../../storage/ports/publication-storage-port.js";
import {
  PUBLICATION_PUBLISHER_TYPES,
  type PublicationRecord,
} from "../domain/publication-types.js";
import type { PublishableFruitPort } from "./publishable-fruit-port.js";

export interface CreatePublicationRecordInput {
  fruitId: string;
  publicationTarget: string;
  publicationEvidence: string;
  publicationNote?: string;
}

export interface UpdatePublicationRecordInput {
  publicationTarget?: string;
  publicationEvidence?: string;
  publicationNote?: string;
}

export interface PublicationServiceDependencies {
  storage: PublicationStoragePort;
  publishableFruitPort: PublishableFruitPort;
  idGenerator?: IdGenerator;
  now?: () => Date;
}

export class PublicationService {
  private readonly storage: PublicationStoragePort;
  private readonly publishableFruitPort: PublishableFruitPort;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;

  public constructor(dependencies: PublicationServiceDependencies) {
    this.storage = dependencies.storage;
    this.publishableFruitPort = dependencies.publishableFruitPort;
    this.idGenerator = dependencies.idGenerator ?? new RandomIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
  }

  public async createPublicationRecord(
    input: CreatePublicationRecordInput,
  ): Promise<PublicationRecord> {
    const fruitId = this.requireNonBlank(input.fruitId, "Fruit id is required");
    const publicationTarget = this.requireNonBlank(
      input.publicationTarget,
      "Publication target is required",
    );
    const publicationEvidence = this.requireNonBlank(
      input.publicationEvidence,
      "Publication evidence is required",
    );

    await this.publishableFruitPort.assertPublishable(fruitId);

    const timestamp = this.timestamp();
    const record: PublicationRecord = {
      id: this.idGenerator.nextId("publication"),
      fruitId,
      publisherType: PUBLICATION_PUBLISHER_TYPES.manual,
      publicationTarget,
      publicationEvidence,
      publicationNote: this.normalizeOptionalText(input.publicationNote),
      publishedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.storage.createPublicationRecord(record);
    return { ...record };
  }

  public async editPublicationRecord(
    publicationRecordId: string,
    input: UpdatePublicationRecordInput,
  ): Promise<PublicationRecord> {
    const record = await this.requirePublicationRecord(publicationRecordId);
    if (
      input.publicationTarget === undefined &&
      input.publicationEvidence === undefined &&
      input.publicationNote === undefined
    ) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "At least one editable publication field is required",
        400,
      );
    }

    const updatedRecord: PublicationRecord = {
      ...record,
      publicationTarget:
        input.publicationTarget === undefined
          ? record.publicationTarget
          : this.requireNonBlank(
              input.publicationTarget,
              "Publication target is required",
            ),
      publicationEvidence:
        input.publicationEvidence === undefined
          ? record.publicationEvidence
          : this.requireNonBlank(
              input.publicationEvidence,
              "Publication evidence is required",
            ),
      publicationNote:
        input.publicationNote === undefined
          ? record.publicationNote
          : this.normalizeOptionalText(input.publicationNote),
      updatedAt: this.timestamp(),
    };

    await this.storage.savePublicationRecord(updatedRecord);
    return { ...updatedRecord };
  }

  public async getPublicationRecord(
    publicationRecordId: string,
  ): Promise<PublicationRecord> {
    return this.requirePublicationRecord(publicationRecordId);
  }

  public async listPublicationRecordsByFruit(
    fruitId: string,
  ): Promise<PublicationRecord[]> {
    return this.storage.listPublicationRecordsByFruit(
      this.requireNonBlank(fruitId, "Fruit id is required"),
    );
  }

  public async assertPublicationRecordExists(
    publicationRecordId: string,
  ): Promise<void> {
    const id = this.requireNonBlank(
      publicationRecordId,
      "Publication record id is required",
    );
    if (!(await this.storage.hasPublicationRecord(id))) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Publication record does not exist",
        404,
      );
    }
  }

  private async requirePublicationRecord(
    publicationRecordId: string,
  ): Promise<PublicationRecord> {
    const id = this.requireNonBlank(
      publicationRecordId,
      "Publication record id is required",
    );
    const record = await this.storage.findPublicationRecordById(id);
    if (record === null) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Publication record does not exist",
        404,
      );
    }
    return record;
  }

  private requireNonBlank(value: string, message: string): string {
    const normalized = value.trim();
    if (normalized.length === 0) {
      throw new ApplicationError("VALIDATION_ERROR", message, 400);
    }
    return normalized;
  }

  private normalizeOptionalText(value: string | undefined): string {
    return value?.trim() ?? "";
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

