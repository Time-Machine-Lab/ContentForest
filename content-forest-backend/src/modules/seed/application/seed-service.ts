import {
  ApplicationError,
} from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type { AgentPort } from "../../../agent/ports/agent-port.js";
import type { SeedMarkdownContentAccessPort } from "../../../content-access/ports/seed-markdown-content-access-port.js";
import type {
  SeedBriefRecord,
  SeedRecord,
  SeedStoragePort,
} from "../../../storage/ports/seed-storage-port.js";
import {
  SEED_ARCHIVE_STATES,
  type SeedBriefDetail,
  type SeedBriefSummary,
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

export interface UpdateSeedBriefInput {
  markdown: string;
}

export interface SeedServiceDependencies {
  storage: SeedStoragePort;
  contentAccess: SeedMarkdownContentAccessPort;
  agentPort?: AgentPort;
  afterSeedCreated?: (seedId: string) => Promise<void>;
  idGenerator?: IdGenerator;
  now?: () => Date;
}

export class SeedService {
  private readonly storage: SeedStoragePort;
  private readonly contentAccess: SeedMarkdownContentAccessPort;
  private readonly agentPort: AgentPort | undefined;
  private readonly afterSeedCreated: ((seedId: string) => Promise<void>) | undefined;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;

  public constructor(dependencies: SeedServiceDependencies) {
    this.storage = dependencies.storage;
    this.contentAccess = dependencies.contentAccess;
    this.agentPort = dependencies.agentPort;
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

  public async generateSeedBrief(seedId: string): Promise<SeedBriefDetail> {
    const seed = await this.getSeed(seedId);
    const markdown = await this.generateBriefMarkdown(seed);
    return this.saveGeneratedBrief(seed.id, markdown);
  }

  public async refreshSeedBrief(seedId: string): Promise<SeedBriefDetail> {
    const existing = await this.requireSeedBrief(seedId);
    const seed = await this.getSeed(seedId);
    const markdown = await this.generateBriefMarkdown(seed);
    const timestamp = this.timestamp();
    await this.contentAccess.updateSeedMarkdown(existing.contentLocation, markdown);
    const nextRecord: SeedBriefRecord = {
      ...existing,
      updatedAt: timestamp,
    };
    await this.storage.upsertSeedBrief(nextRecord);
    return this.toBriefDetail(nextRecord, markdown);
  }

  public async getSeedBrief(seedId: string): Promise<SeedBriefDetail | null> {
    await this.requireSeed(seedId);
    const record = await this.storage.findSeedBriefBySeedId(seedId);
    if (record === null) {
      return null;
    }
    const markdown = await this.contentAccess.readSeedMarkdown(record.contentLocation);
    return this.toBriefDetail(record, markdown);
  }

  public async getSeedBriefSummary(seedId: string): Promise<SeedBriefSummary> {
    await this.requireSeed(seedId);
    const record = await this.storage.findSeedBriefBySeedId(seedId);
    return this.toBriefSummary(seedId, record);
  }

  public async updateSeedBrief(
    seedId: string,
    input: UpdateSeedBriefInput,
  ): Promise<SeedBriefDetail> {
    const record = await this.requireSeedBrief(seedId);
    const markdown = this.requireNonBlank(input.markdown, "种子主简报 Markdown 不能为空");
    await this.contentAccess.updateSeedMarkdown(record.contentLocation, markdown);
    const nextRecord: SeedBriefRecord = {
      ...record,
      updatedAt: this.timestamp(),
    };
    await this.storage.upsertSeedBrief(nextRecord);
    return this.toBriefDetail(nextRecord, markdown);
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

  private async requireSeedBrief(seedId: string): Promise<SeedBriefRecord> {
    await this.requireSeed(seedId);
    const record = await this.storage.findSeedBriefBySeedId(seedId);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "种子主简报尚未生成", 404);
    }
    return record;
  }

  private async generateBriefMarkdown(seed: SeedDetail): Promise<string> {
    if (this.agentPort === undefined) {
      throw new ApplicationError(
        "AGENT_TASK_FAILED",
        "种子主简报生成能力不可用",
        502,
      );
    }
    const result = await this.agentPort.runTask({
      type: "seed_brief",
      input: {
        seedId: seed.id,
        seedTitle: seed.title,
        seedMarkdown: seed.markdown,
      },
    });
    if (!result.ok) {
      throw new ApplicationError(
        "AGENT_TASK_FAILED",
        result.error.message,
        502,
      );
    }
    const markdown = this.readBriefMarkdownFromAgentOutput(result.output.content);
    return this.requireNonBlank(markdown, "种子主简报生成结果为空");
  }

  private readBriefMarkdownFromAgentOutput(content: unknown): string {
    if (typeof content === "string") {
      return cleanSeedBriefMarkdown(content);
    }
    if (
      typeof content === "object" &&
      content !== null &&
      !Array.isArray(content) &&
      typeof (content as { markdown?: unknown }).markdown === "string"
    ) {
      return cleanSeedBriefMarkdown((content as { markdown: string }).markdown);
    }
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "种子主简报生成结果不可落地",
      502,
    );
  }

  private async saveGeneratedBrief(
    seedId: string,
    markdown: string,
  ): Promise<SeedBriefDetail> {
    const existing = await this.storage.findSeedBriefBySeedId(seedId);
    const timestamp = this.timestamp();
    if (existing !== null) {
      await this.contentAccess.updateSeedMarkdown(existing.contentLocation, markdown);
      const nextRecord: SeedBriefRecord = {
        ...existing,
        updatedAt: timestamp,
      };
      await this.storage.upsertSeedBrief(nextRecord);
      return this.toBriefDetail(nextRecord, markdown);
    }

    const contentLocation = await this.contentAccess.createSeedBriefMarkdown({
      seedId,
      markdown,
    });
    const record: SeedBriefRecord = {
      id: this.idGenerator.nextId("seed-brief"),
      seedId,
      contentLocation,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.storage.upsertSeedBrief(record);
    return this.toBriefDetail(record, markdown);
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

  private toBriefSummary(
    seedId: string,
    record: SeedBriefRecord | null,
  ): SeedBriefSummary {
    if (record === null) {
      return {
        seedId,
        hasBrief: false,
        id: null,
        contentLocation: null,
        createdAt: null,
        updatedAt: null,
      };
    }
    return {
      seedId: record.seedId,
      hasBrief: true,
      id: record.id,
      contentLocation: record.contentLocation,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private toBriefDetail(
    record: SeedBriefRecord,
    markdown: string,
  ): SeedBriefDetail {
    return {
      ...this.toBriefSummary(record.seedId, record),
      markdown,
    };
  }
}

function cleanSeedBriefMarkdown(value: string): string {
  return value.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}
