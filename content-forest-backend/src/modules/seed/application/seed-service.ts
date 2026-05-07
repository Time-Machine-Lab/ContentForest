import {
  ApplicationError,
} from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type { SeedMarkdownContentAccessPort } from "../../../content-access/ports/seed-markdown-content-access-port.js";
import type {
  SeedRecord,
  SeedStoragePort,
} from "../../../storage/ports/seed-storage-port.js";
import {
  SEED_ARCHIVE_STATES,
  type SeedDetail,
  type SeedGrowthEligibility,
  type SeedRootNode,
  type SeedSummary,
} from "../domain/seed-types.js";

export interface CreateSeedInput {
  title: string;
  markdown: string;
}

export interface UpdateSeedInput {
  title?: string;
  markdown?: string;
}

export interface SeedServiceDependencies {
  storage: SeedStoragePort;
  contentAccess: SeedMarkdownContentAccessPort;
  afterSeedCreated?: (seedId: string) => Promise<void>;
  idGenerator?: IdGenerator;
  now?: () => Date;
}

export class SeedService {
  private readonly storage: SeedStoragePort;
  private readonly contentAccess: SeedMarkdownContentAccessPort;
  private readonly afterSeedCreated: ((seedId: string) => Promise<void>) | undefined;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;

  public constructor(dependencies: SeedServiceDependencies) {
    this.storage = dependencies.storage;
    this.contentAccess = dependencies.contentAccess;
    this.afterSeedCreated = dependencies.afterSeedCreated;
    this.idGenerator = dependencies.idGenerator ?? new RandomIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
  }

  public async createSeed(input: CreateSeedInput): Promise<SeedDetail> {
    const title = this.requireNonBlank(input.title, "种子标题不能为空");
    const markdown = this.requireNonBlank(input.markdown, "种子 Markdown 正文不能为空");
    const seedId = this.idGenerator.nextId("seed");
    const timestamp = this.timestamp();
    const contentLocation = await this.contentAccess.createSeedMarkdown({
      seedId,
      markdown,
    });

    const record: SeedRecord = {
      id: seedId,
      title,
      archiveState: SEED_ARCHIVE_STATES.active,
      contentLocation,
      rootNodeId: this.rootNodeId(seedId),
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    };

    await this.storage.createSeed(record);
    if (this.afterSeedCreated !== undefined) {
      await this.afterSeedCreated(seedId);
    }
    return this.toDetail(record, markdown);
  }

  public async getSeed(seedId: string): Promise<SeedDetail> {
    const record = await this.requireSeed(seedId);
    const markdown = await this.contentAccess.readSeedMarkdown(record.contentLocation);
    return this.toDetail(record, markdown);
  }

  public async updateSeed(seedId: string, input: UpdateSeedInput): Promise<SeedDetail> {
    if (input.title === undefined && input.markdown === undefined) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "至少需要提供种子标题或 Markdown 正文",
        400,
      );
    }

    const record = await this.requireSeed(seedId);
    const nextTitle =
      input.title === undefined
        ? record.title
        : this.requireNonBlank(input.title, "种子标题不能为空");

    if (input.markdown !== undefined) {
      const nextMarkdown = this.requireNonBlank(
        input.markdown,
        "种子 Markdown 正文不能为空",
      );
      await this.contentAccess.updateSeedMarkdown(record.contentLocation, nextMarkdown);
    }

    const nextRecord: SeedRecord = {
      ...record,
      title: nextTitle,
      updatedAt: this.timestamp(),
    };
    await this.storage.saveSeed(nextRecord);
    return this.getSeed(seedId);
  }

  public async listActiveSeeds(): Promise<SeedSummary[]> {
    const records = await this.storage.listSeedsByArchiveState(
      SEED_ARCHIVE_STATES.active,
    );
    return records.map((record) => this.toSummary(record));
  }

  public async listArchivedSeeds(): Promise<SeedSummary[]> {
    const records = await this.storage.listSeedsByArchiveState(
      SEED_ARCHIVE_STATES.archived,
    );
    return records.map((record) => this.toSummary(record));
  }

  public async archiveSeed(seedId: string): Promise<SeedDetail> {
    const record = await this.requireSeed(seedId);
    if (record.archiveState === SEED_ARCHIVE_STATES.archived) {
      return this.getSeed(seedId);
    }

    const timestamp = this.timestamp();
    await this.storage.saveSeed({
      ...record,
      archiveState: SEED_ARCHIVE_STATES.archived,
      updatedAt: timestamp,
      archivedAt: timestamp,
    });
    return this.getSeed(seedId);
  }

  public async restoreSeed(seedId: string): Promise<SeedDetail> {
    const record = await this.requireSeed(seedId);
    if (record.archiveState === SEED_ARCHIVE_STATES.active) {
      return this.getSeed(seedId);
    }

    await this.storage.saveSeed({
      ...record,
      archiveState: SEED_ARCHIVE_STATES.active,
      updatedAt: this.timestamp(),
      archivedAt: null,
    });
    return this.getSeed(seedId);
  }

  public async getRootNode(seedId: string): Promise<SeedRootNode> {
    const record = await this.requireSeed(seedId);
    return {
      seedId: record.id,
      nodeId: record.rootNodeId,
      nodeType: "seed",
      workspaceReadOnly: record.archiveState === SEED_ARCHIVE_STATES.archived,
    };
  }

  public async getGrowthEligibility(seedId: string): Promise<SeedGrowthEligibility> {
    const record = await this.requireSeed(seedId);
    const archived = record.archiveState === SEED_ARCHIVE_STATES.archived;
    return {
      seedId: record.id,
      canGrow: !archived,
      workspaceReadOnly: archived,
      reason: archived ? "种子已归档，工作区只读，不能发起新的枝化生长" : null,
    };
  }

  public async assertCanGrow(seedId: string): Promise<void> {
    const eligibility = await this.getGrowthEligibility(seedId);
    if (!eligibility.canGrow) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        eligibility.reason ?? "该种子不能作为枝化生长来源",
        400,
      );
    }
  }

  private async requireSeed(seedId: string): Promise<SeedRecord> {
    const record = await this.storage.findSeedById(seedId);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "种子不存在", 404);
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

  private timestamp(): string {
    return this.now().toISOString();
  }

  private rootNodeId(seedId: string): string {
    return `seed-node_${seedId}`;
  }

  private toSummary(record: SeedRecord): SeedSummary {
    return {
      id: record.id,
      title: record.title,
      archiveState: record.archiveState,
      contentLocation: record.contentLocation,
      rootNodeId: record.rootNodeId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      archivedAt: record.archivedAt,
    };
  }

  private toDetail(record: SeedRecord, markdown: string): SeedDetail {
    return {
      ...this.toSummary(record),
      markdown,
    };
  }
}
