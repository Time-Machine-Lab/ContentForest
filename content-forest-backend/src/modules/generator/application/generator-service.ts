import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type { GeneratorSkillContentAccessPort } from "../../../content-access/ports/generator-skill-content-access-port.js";
import type {
  GeneratorRecord,
  GeneratorStoragePort,
} from "../../../storage/ports/generator-storage-port.js";
import {
  GENERATOR_ENABLE_STATES,
  type GeneratorDetail,
  type GeneratorSummary,
  type SelectableGenerator,
} from "../domain/generator-types.js";

export interface ImportGeneratorInput {
  name: string;
  description: string;
  zipBuffer: Buffer;
}

export interface ReuploadGeneratorInput {
  zipBuffer: Buffer;
}

export interface GeneratorServiceDependencies {
  storage: GeneratorStoragePort;
  contentAccess: GeneratorSkillContentAccessPort;
  idGenerator?: IdGenerator;
  now?: () => Date;
}

export class GeneratorService {
  private readonly storage: GeneratorStoragePort;
  private readonly contentAccess: GeneratorSkillContentAccessPort;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;

  public constructor(dependencies: GeneratorServiceDependencies) {
    this.storage = dependencies.storage;
    this.contentAccess = dependencies.contentAccess;
    this.idGenerator = dependencies.idGenerator ?? new RandomIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
  }

  public async importGenerator(
    input: ImportGeneratorInput,
  ): Promise<GeneratorDetail> {
    const name = this.requireNonBlank(input.name, "生成器名称不能为空");
    const description = this.requireNonBlank(
      input.description,
      "生成器描述不能为空",
    );
    this.requireZipBuffer(input.zipBuffer);

    const generatorId = this.idGenerator.nextId("generator");
    const timestamp = this.timestamp();
    const contentLocation = await this.contentAccess.saveGeneratorSkill({
      generatorId,
      zipBuffer: input.zipBuffer,
    });

    const record: GeneratorRecord = {
      id: generatorId,
      name,
      description,
      enableState: GENERATOR_ENABLE_STATES.enabled,
      contentLocation,
      createdAt: timestamp,
      updatedAt: timestamp,
      disabledAt: null,
    };

    try {
      await this.storage.createGenerator(record);
    } catch (error) {
      await this.contentAccess.removeGeneratorSkill(contentLocation);
      throw error;
    }

    return this.toDetail(record, await this.contentAccess.readGeneratorSkill(contentLocation));
  }

  public async listGenerators(): Promise<GeneratorSummary[]> {
    const records = await this.storage.listGenerators();
    return records.map((record) => this.toSummary(record));
  }

  public async listSelectableGenerators(): Promise<SelectableGenerator[]> {
    const records = await this.storage.listGeneratorsByEnableState(
      GENERATOR_ENABLE_STATES.enabled,
    );
    return records.map((record) => ({
      id: record.id,
      name: record.name,
      description: record.description,
      contentLocation: record.contentLocation,
    }));
  }

  public async getGenerator(generatorId: string): Promise<GeneratorDetail> {
    const record = await this.requireGenerator(generatorId);
    const overview = await this.contentAccess.readGeneratorSkill(
      record.contentLocation,
    );
    return this.toDetail(record, overview);
  }

  public async disableGenerator(generatorId: string): Promise<GeneratorDetail> {
    const record = await this.requireGenerator(generatorId);
    if (record.enableState === GENERATOR_ENABLE_STATES.disabled) {
      return this.getGenerator(generatorId);
    }

    const timestamp = this.timestamp();
    await this.storage.saveGenerator({
      ...record,
      enableState: GENERATOR_ENABLE_STATES.disabled,
      updatedAt: timestamp,
      disabledAt: timestamp,
    });
    return this.getGenerator(generatorId);
  }

  public async enableGenerator(generatorId: string): Promise<GeneratorDetail> {
    const record = await this.requireGenerator(generatorId);
    if (record.enableState === GENERATOR_ENABLE_STATES.enabled) {
      return this.getGenerator(generatorId);
    }

    await this.storage.saveGenerator({
      ...record,
      enableState: GENERATOR_ENABLE_STATES.enabled,
      updatedAt: this.timestamp(),
      disabledAt: null,
    });
    return this.getGenerator(generatorId);
  }

  public async reuploadGeneratorSkill(
    generatorId: string,
    input: ReuploadGeneratorInput,
  ): Promise<GeneratorDetail> {
    this.requireZipBuffer(input.zipBuffer);
    const record = await this.requireGenerator(generatorId);
    const contentLocation = await this.contentAccess.replaceGeneratorSkill({
      generatorId: record.id,
      zipBuffer: input.zipBuffer,
    });

    await this.storage.saveGenerator({
      ...record,
      contentLocation,
      updatedAt: this.timestamp(),
    });
    return this.getGenerator(generatorId);
  }

  private async requireGenerator(generatorId: string): Promise<GeneratorRecord> {
    const record = await this.storage.findGeneratorById(generatorId);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "生成器不存在", 404);
    }
    return record;
  }

  private requireZipBuffer(zipBuffer: Buffer): void {
    if (zipBuffer.length === 0) {
      throw new ApplicationError("VALIDATION_ERROR", "生成器 zip 不能为空", 400);
    }
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

  private toSummary(record: GeneratorRecord): GeneratorSummary {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      enableState: record.enableState,
      contentLocation: record.contentLocation,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      disabledAt: record.disabledAt,
    };
  }

  private toDetail(
    record: GeneratorRecord,
    overview: { skillMarkdown: string; entries: string[] },
  ): GeneratorDetail {
    return {
      ...this.toSummary(record),
      skillMarkdown: overview.skillMarkdown,
      entries: overview.entries,
    };
  }
}
