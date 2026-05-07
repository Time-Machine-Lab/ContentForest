import type { NutrientMarkdownContentAccessPort } from "../../../content-access/ports/nutrient-markdown-content-access-port.js";
import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type {
  NutrientContentRecord,
  NutrientLibraryListFilter,
  NutrientLibraryRecord,
  NutrientStoragePort,
} from "../../../storage/ports/nutrient-storage-port.js";
import type { SeedStoragePort } from "../../../storage/ports/seed-storage-port.js";
import {
  NUTRIENT_ARCHIVE_STATES,
  NUTRIENT_LIBRARY_SCOPES,
  type NutrientArchiveState,
  type NutrientContentDetail,
  type NutrientContentSummary,
  type NutrientLibraryDetail,
  type NutrientLibraryScope,
  type NutrientLibrarySummary,
  type ReferableNutrientContent,
} from "../domain/nutrient-types.js";

export interface CreateNutrientLibraryInput {
  name: string;
  description?: string;
  scope: NutrientLibraryScope;
  seedId?: string | null;
}

export interface UpdateNutrientLibraryInput {
  name?: string;
  description?: string;
}

export interface ListNutrientLibrariesInput {
  scope?: NutrientLibraryScope;
  archiveState?: NutrientArchiveState;
  seedId?: string;
}

export interface CreateNutrientContentInput {
  title: string;
  markdown: string;
}

export interface UpdateNutrientContentInput {
  title?: string;
  markdown?: string;
}

export interface ListNutrientContentsInput {
  archiveState?: NutrientArchiveState;
}

export interface NutrientResourceRef {
  resourceType: "nutrient";
  resourceId: string;
}

export interface NutrientServiceDependencies {
  storage: NutrientStoragePort;
  contentAccess: NutrientMarkdownContentAccessPort;
  seedStorage: SeedStoragePort;
  idGenerator?: IdGenerator;
  now?: () => Date;
}

export class NutrientService {
  private readonly storage: NutrientStoragePort;
  private readonly contentAccess: NutrientMarkdownContentAccessPort;
  private readonly seedStorage: SeedStoragePort;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;

  public constructor(dependencies: NutrientServiceDependencies) {
    this.storage = dependencies.storage;
    this.contentAccess = dependencies.contentAccess;
    this.seedStorage = dependencies.seedStorage;
    this.idGenerator = dependencies.idGenerator ?? new RandomIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
  }

  public async createLibrary(
    input: CreateNutrientLibraryInput,
  ): Promise<NutrientLibraryDetail> {
    const name = this.requireNonBlank(input.name, "营养库名称不能为空");
    const scope = this.requireScope(input.scope);
    const seedId = await this.resolveLibrarySeedId(scope, input.seedId);
    const timestamp = this.timestamp();
    const record: NutrientLibraryRecord = {
      id: this.idGenerator.nextId("nutrient-library"),
      name,
      description: this.normalizeOptionalText(input.description),
      scope,
      seedId,
      archiveState: NUTRIENT_ARCHIVE_STATES.active,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    };
    await this.storage.createLibrary(record);
    return this.toLibraryDetail(record, 0);
  }

  public async listLibraries(
    input: ListNutrientLibrariesInput = {},
  ): Promise<NutrientLibrarySummary[]> {
    const filter: NutrientLibraryListFilter = {};
    if (input.scope !== undefined) {
      filter.scope = this.requireScope(input.scope);
    }
    if (input.archiveState !== undefined) {
      filter.archiveState = this.requireArchiveState(input.archiveState);
    }
    if (input.seedId !== undefined) {
      filter.seedId = this.requireNonBlank(input.seedId, "种子不能为空");
    }
    const records = await this.storage.listLibraries(filter);
    return records.map((record) => this.toLibrarySummary(record));
  }

  public async getLibrary(libraryId: string): Promise<NutrientLibraryDetail> {
    const record = await this.requireLibrary(libraryId);
    const contentCount = await this.storage.countContentsByLibrary(record.id);
    return this.toLibraryDetail(record, contentCount);
  }

  public async updateLibrary(
    libraryId: string,
    input: UpdateNutrientLibraryInput,
  ): Promise<NutrientLibraryDetail> {
    if (input.name === undefined && input.description === undefined) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "至少需要提供营养库名称或描述",
        400,
      );
    }
    const record = await this.requireLibrary(libraryId);
    const updated: NutrientLibraryRecord = {
      ...record,
      name:
        input.name === undefined
          ? record.name
          : this.requireNonBlank(input.name, "营养库名称不能为空"),
      description:
        input.description === undefined
          ? record.description
          : this.normalizeOptionalText(input.description),
      updatedAt: this.timestamp(),
    };
    await this.storage.saveLibrary(updated);
    return this.getLibrary(libraryId);
  }

  public async archiveLibrary(libraryId: string): Promise<NutrientLibraryDetail> {
    const record = await this.requireLibrary(libraryId);
    if (record.archiveState === NUTRIENT_ARCHIVE_STATES.archived) {
      return this.getLibrary(libraryId);
    }
    const timestamp = this.timestamp();
    await this.storage.saveLibrary({
      ...record,
      archiveState: NUTRIENT_ARCHIVE_STATES.archived,
      updatedAt: timestamp,
      archivedAt: timestamp,
    });
    return this.getLibrary(libraryId);
  }

  public async restoreLibrary(libraryId: string): Promise<NutrientLibraryDetail> {
    const record = await this.requireLibrary(libraryId);
    if (record.archiveState === NUTRIENT_ARCHIVE_STATES.active) {
      return this.getLibrary(libraryId);
    }
    await this.storage.saveLibrary({
      ...record,
      archiveState: NUTRIENT_ARCHIVE_STATES.active,
      updatedAt: this.timestamp(),
      archivedAt: null,
    });
    return this.getLibrary(libraryId);
  }

  public async createContent(
    libraryId: string,
    input: CreateNutrientContentInput,
  ): Promise<NutrientContentDetail> {
    const library = await this.requireActiveLibrary(libraryId);
    const title = this.requireNonBlank(input.title, "营养内容标题不能为空");
    const markdown = this.requireNonBlank(
      input.markdown,
      "营养内容 Markdown 正文不能为空",
    );
    const contentId = this.idGenerator.nextId("nutrient-content");
    const timestamp = this.timestamp();
    const contentLocation = await this.contentAccess.createNutrientMarkdown({
      contentId,
      libraryScope: library.scope,
      seedId: library.seedId,
      markdown,
    });
    const record: NutrientContentRecord = {
      id: contentId,
      libraryId: library.id,
      title,
      archiveState: NUTRIENT_ARCHIVE_STATES.active,
      contentLocation,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    };

    try {
      await this.storage.createContent(record);
    } catch (error) {
      await this.contentAccess.removeNutrientMarkdown(contentLocation);
      throw error;
    }

    return this.toContentDetail(record, markdown);
  }

  public async listContents(
    libraryId: string,
    input: ListNutrientContentsInput = {},
  ): Promise<NutrientContentSummary[]> {
    await this.requireLibrary(libraryId);
    const records = await this.storage.listContentsByLibrary(libraryId, {
      archiveState:
        input.archiveState === undefined
          ? undefined
          : this.requireArchiveState(input.archiveState),
    });
    return records.map((record) => this.toContentSummary(record));
  }

  public async getContent(contentId: string): Promise<NutrientContentDetail> {
    const record = await this.requireContent(contentId);
    const markdown = await this.contentAccess.readNutrientMarkdown(
      record.contentLocation,
    );
    return this.toContentDetail(record, markdown);
  }

  public async updateContent(
    contentId: string,
    input: UpdateNutrientContentInput,
  ): Promise<NutrientContentDetail> {
    if (input.title === undefined && input.markdown === undefined) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "至少需要提供营养内容标题或 Markdown 正文",
        400,
      );
    }
    const record = await this.requireContent(contentId);
    const library = await this.requireActiveLibrary(record.libraryId);
    if (record.archiveState === NUTRIENT_ARCHIVE_STATES.archived) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "已归档营养内容不能编辑",
        400,
      );
    }

    const title =
      input.title === undefined
        ? record.title
        : this.requireNonBlank(input.title, "营养内容标题不能为空");
    if (input.markdown !== undefined) {
      await this.contentAccess.updateNutrientMarkdown(
        record.contentLocation,
        this.requireNonBlank(input.markdown, "营养内容 Markdown 正文不能为空"),
      );
    }
    const updated = {
      ...record,
      libraryId: library.id,
      title,
      updatedAt: this.timestamp(),
    };
    await this.storage.saveContent(updated);
    return this.getContent(contentId);
  }

  public async archiveContent(contentId: string): Promise<NutrientContentDetail> {
    const record = await this.requireContent(contentId);
    if (record.archiveState === NUTRIENT_ARCHIVE_STATES.archived) {
      return this.getContent(contentId);
    }
    const timestamp = this.timestamp();
    await this.storage.saveContent({
      ...record,
      archiveState: NUTRIENT_ARCHIVE_STATES.archived,
      updatedAt: timestamp,
      archivedAt: timestamp,
    });
    return this.getContent(contentId);
  }

  public async restoreContent(contentId: string): Promise<NutrientContentDetail> {
    const record = await this.requireContent(contentId);
    if (record.archiveState === NUTRIENT_ARCHIVE_STATES.active) {
      return this.getContent(contentId);
    }
    await this.storage.saveContent({
      ...record,
      archiveState: NUTRIENT_ARCHIVE_STATES.active,
      updatedAt: this.timestamp(),
      archivedAt: null,
    });
    return this.getContent(contentId);
  }

  public async listReferableContents(
    seedId: string,
  ): Promise<ReferableNutrientContent[]> {
    const normalizedSeedId = await this.requireSeed(seedId);
    const records = await this.storage.listReferableContents(normalizedSeedId);
    return records.map(({ content, library }) => ({
      ...this.toContentSummary(content),
      library: {
        id: library.id,
        name: library.name,
        scope: library.scope,
        seedId: library.seedId,
      },
    }));
  }

  public async assertNutrientRefsReferable(
    seedId: string,
    refs: NutrientResourceRef[],
  ): Promise<void> {
    if (refs.length === 0) {
      return;
    }
    const referable = await this.listReferableContents(seedId);
    const referableIds = new Set(referable.map((content) => content.id));
    const blocked = refs.find((ref) => !referableIds.has(ref.resourceId));
    if (blocked !== undefined) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "营养内容不可被当前种子引用",
        400,
      );
    }
  }

  private async resolveLibrarySeedId(
    scope: NutrientLibraryScope,
    seedId: string | null | undefined,
  ): Promise<string | null> {
    if (scope === NUTRIENT_LIBRARY_SCOPES.public) {
      if (seedId !== undefined && seedId !== null && seedId.trim().length > 0) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "公共营养库不能绑定种子",
          400,
        );
      }
      return null;
    }
    if (seedId === undefined || seedId === null) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "种子专属营养库必须绑定种子",
        400,
      );
    }
    return this.requireSeed(seedId);
  }

  private async requireSeed(seedId: string): Promise<string> {
    const normalized = this.requireNonBlank(seedId, "种子不能为空");
    const seed = await this.seedStorage.findSeedById(normalized);
    if (seed === null) {
      throw new ApplicationError("NOT_FOUND", "种子不存在", 404);
    }
    return normalized;
  }

  private async requireLibrary(libraryId: string): Promise<NutrientLibraryRecord> {
    const normalized = this.requireNonBlank(libraryId, "营养库不能为空");
    const record = await this.storage.findLibraryById(normalized);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "营养库不存在", 404);
    }
    return record;
  }

  private async requireActiveLibrary(
    libraryId: string,
  ): Promise<NutrientLibraryRecord> {
    const record = await this.requireLibrary(libraryId);
    if (record.archiveState === NUTRIENT_ARCHIVE_STATES.archived) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "已归档营养库不能新增或编辑营养内容",
        400,
      );
    }
    return record;
  }

  private async requireContent(contentId: string): Promise<NutrientContentRecord> {
    const normalized = this.requireNonBlank(contentId, "营养内容不能为空");
    const record = await this.storage.findContentById(normalized);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "营养内容不存在", 404);
    }
    return record;
  }

  private requireScope(value: NutrientLibraryScope): NutrientLibraryScope {
    if (
      value !== NUTRIENT_LIBRARY_SCOPES.public &&
      value !== NUTRIENT_LIBRARY_SCOPES.seedScoped
    ) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "营养库作用域必须是 public 或 seed_scoped",
        400,
      );
    }
    return value;
  }

  private requireArchiveState(
    value: NutrientArchiveState,
  ): NutrientArchiveState {
    if (
      value !== NUTRIENT_ARCHIVE_STATES.active &&
      value !== NUTRIENT_ARCHIVE_STATES.archived
    ) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "归档状态必须是 active 或 archived",
        400,
      );
    }
    return value;
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

  private toLibrarySummary(record: NutrientLibraryRecord): NutrientLibrarySummary {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      scope: record.scope,
      seedId: record.seedId,
      archiveState: record.archiveState,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      archivedAt: record.archivedAt,
    };
  }

  private toLibraryDetail(
    record: NutrientLibraryRecord,
    contentCount: number,
  ): NutrientLibraryDetail {
    return {
      ...this.toLibrarySummary(record),
      contentCount,
    };
  }

  private toContentSummary(record: NutrientContentRecord): NutrientContentSummary {
    return {
      id: record.id,
      libraryId: record.libraryId,
      title: record.title,
      archiveState: record.archiveState,
      contentLocation: record.contentLocation,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      archivedAt: record.archivedAt,
    };
  }

  private toContentDetail(
    record: NutrientContentRecord,
    markdown: string,
  ): NutrientContentDetail {
    return {
      ...this.toContentSummary(record),
      markdown,
    };
  }
}
