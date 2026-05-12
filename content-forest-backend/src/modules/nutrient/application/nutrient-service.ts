import type { AgentPort } from "../../../agent/ports/agent-port.js";
import { validateNutrientResearchOutput } from "../../../agent/skills/nutrient-research-output.js";
import type { NutrientMarkdownContentAccessPort } from "../../../content-access/ports/nutrient-markdown-content-access-port.js";
import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type {
  NutrientCardRecord,
  NutrientContentRecord,
  NutrientCardListFilter,
  NutrientDepositableBlockRecord,
  NutrientLibraryListFilter,
  NutrientLibraryRecord,
  NutrientResearchMessageRecord,
  NutrientResearchSessionRecord,
  NutrientStoragePort,
} from "../../../storage/ports/nutrient-storage-port.js";
import type { SeedStoragePort } from "../../../storage/ports/seed-storage-port.js";
import {
  NUTRIENT_ARCHIVE_STATES,
  NUTRIENT_CARD_STATUSES,
  NUTRIENT_LIBRARY_SCOPES,
  type NutrientArchiveState,
  type NutrientCardDetail,
  type NutrientCardStatus,
  type NutrientCardSummary,
  type NutrientDepositableBlock,
  type NutrientContentDetail,
  type NutrientContentSummary,
  type NutrientLibraryDetail,
  type NutrientLibraryScope,
  type NutrientLibrarySummary,
  type NutrientResearchMessage,
  type NutrientResearchSessionDetail,
  type NutrientResearchSessionSummary,
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

export interface CreateNutrientCardInput {
  title: string;
  markdown: string;
  conversationId?: string | null;
}

export interface UpdateNutrientCardInput {
  title?: string;
  markdown?: string;
}

export interface ListNutrientCardsInput {
  status?: NutrientCardStatus;
}

export interface SettleNutrientCardInput {
  libraryId: string;
}

export interface BindNutrientCardConversationInput {
  conversationId: string;
}

export interface CreateNutrientResearchSessionInput {
  seedId: string;
  nutrientCardId?: string | null;
  title?: string;
}

export interface SubmitNutrientResearchMessageInput {
  message: string;
}

export interface SubmitNutrientResearchMessageResult {
  userMessage: NutrientResearchMessage;
  assistantMessage: NutrientResearchMessage;
  depositableBlocks: NutrientDepositableBlock[];
}

export interface NutrientResourceRef {
  resourceType: "nutrient";
  resourceId: string;
}

export interface TemporaryNutrientCardResourceRef {
  resourceType: "nutrient_card";
  resourceId: string;
}

export interface NutrientServiceDependencies {
  storage: NutrientStoragePort;
  contentAccess: NutrientMarkdownContentAccessPort;
  seedStorage: SeedStoragePort;
  agentPort?: AgentPort;
  idGenerator?: IdGenerator;
  now?: () => Date;
}

export class NutrientService {
  private readonly storage: NutrientStoragePort;
  private readonly contentAccess: NutrientMarkdownContentAccessPort;
  private readonly seedStorage: SeedStoragePort;
  private readonly agentPort: AgentPort | undefined;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;

  public constructor(dependencies: NutrientServiceDependencies) {
    this.storage = dependencies.storage;
    this.contentAccess = dependencies.contentAccess;
    this.seedStorage = dependencies.seedStorage;
    this.agentPort = dependencies.agentPort;
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

  public async createCard(
    seedId: string,
    input: CreateNutrientCardInput,
  ): Promise<NutrientCardDetail> {
    const normalizedSeedId = await this.requireSeed(seedId);
    const title = this.requireNonBlank(input.title, "营养卡片标题不能为空");
    const markdown = this.requireNonBlank(
      input.markdown,
      "营养卡片 Markdown 正文不能为空",
    );
    const cardId = this.idGenerator.nextId("nutrient-card");
    const timestamp = this.timestamp();
    const contentLocation = await this.contentAccess.createNutrientMarkdown({
      contentId: cardId,
      libraryScope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId: normalizedSeedId,
      markdown,
    });
    const record: NutrientCardRecord = {
      id: cardId,
      seedId: normalizedSeedId,
      title,
      status: NUTRIENT_CARD_STATUSES.unsettled,
      contentLocation,
      settledContentId: null,
      defaultForGrowth: false,
      conversationId: this.normalizeNullableText(input.conversationId),
      createdAt: timestamp,
      updatedAt: timestamp,
      settledAt: null,
      archivedAt: null,
    };

    try {
      await this.storage.createCard(record);
    } catch (error) {
      await this.contentAccess.removeNutrientMarkdown(contentLocation);
      throw error;
    }
    return this.toCardDetail(record, markdown);
  }

  public async listCards(
    seedId: string,
    input: ListNutrientCardsInput = {},
  ): Promise<NutrientCardSummary[]> {
    const normalizedSeedId = await this.requireSeed(seedId);
    const filter: NutrientCardListFilter = {};
    if (input.status !== undefined) {
      filter.status = this.requireCardStatus(input.status);
    }
    const records = await this.storage.listCardsBySeed(normalizedSeedId, filter);
    return records.map((record) => this.toCardSummary(record));
  }

  public async getCard(cardId: string): Promise<NutrientCardDetail> {
    const record = await this.requireCard(cardId);
    const markdown = await this.contentAccess.readNutrientMarkdown(
      record.contentLocation,
    );
    return this.toCardDetail(record, markdown);
  }

  public async updateCard(
    cardId: string,
    input: UpdateNutrientCardInput,
  ): Promise<NutrientCardDetail> {
    if (input.title === undefined && input.markdown === undefined) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "至少需要提供营养卡片标题或 Markdown 正文",
        400,
      );
    }
    const record = await this.requireCard(cardId);
    if (record.status === NUTRIENT_CARD_STATUSES.archived) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "已归档营养卡片不能编辑",
        400,
      );
    }
    const title =
      input.title === undefined
        ? record.title
        : this.requireNonBlank(input.title, "营养卡片标题不能为空");
    const markdown =
      input.markdown === undefined
        ? null
        : this.requireNonBlank(input.markdown, "营养卡片 Markdown 正文不能为空");
    if (markdown !== null) {
      await this.contentAccess.updateNutrientMarkdown(
        record.contentLocation,
        markdown,
      );
    }

    const updated: NutrientCardRecord = {
      ...record,
      title,
      updatedAt: this.timestamp(),
    };
    await this.storage.saveCard(updated);
    await this.syncSettledContentFromCard(updated, markdown);
    return this.getCard(cardId);
  }

  public async settleCard(
    cardId: string,
    input: SettleNutrientCardInput,
  ): Promise<NutrientCardDetail> {
    const record = await this.requireCard(cardId);
    if (record.status !== NUTRIENT_CARD_STATUSES.unsettled) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "只有未沉淀营养卡片可以沉淀",
        400,
      );
    }
    const library = await this.requireActiveLibrary(input.libraryId);
    if (
      library.scope !== NUTRIENT_LIBRARY_SCOPES.seedScoped ||
      library.seedId !== record.seedId
    ) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "营养卡片只能沉淀到当前种子专属营养库",
        400,
      );
    }
    const markdown = await this.contentAccess.readNutrientMarkdown(
      record.contentLocation,
    );
    const content = await this.createContent(library.id, {
      title: record.title,
      markdown,
    });
    const timestamp = this.timestamp();
    const updated: NutrientCardRecord = {
      ...record,
      status: NUTRIENT_CARD_STATUSES.settled,
      settledContentId: content.id,
      updatedAt: timestamp,
      settledAt: timestamp,
      archivedAt: null,
    };
    await this.storage.saveCard(updated);
    return this.getCard(cardId);
  }

  public async archiveCard(cardId: string): Promise<NutrientCardDetail> {
    const record = await this.requireCard(cardId);
    if (record.status === NUTRIENT_CARD_STATUSES.archived) {
      return this.getCard(cardId);
    }
    const timestamp = this.timestamp();
    await this.storage.saveCard({
      ...record,
      status: NUTRIENT_CARD_STATUSES.archived,
      defaultForGrowth: false,
      updatedAt: timestamp,
      archivedAt: timestamp,
    });
    return this.getCard(cardId);
  }

  public async setDefaultForGrowth(cardId: string): Promise<NutrientCardDetail> {
    const record = await this.requireCard(cardId);
    if (record.status !== NUTRIENT_CARD_STATUSES.settled) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "只有已沉淀营养卡片可以设置为常驻营养",
        400,
      );
    }
    await this.storage.saveCard({
      ...record,
      defaultForGrowth: true,
      updatedAt: this.timestamp(),
    });
    return this.getCard(cardId);
  }

  public async clearDefaultForGrowth(cardId: string): Promise<NutrientCardDetail> {
    const record = await this.requireCard(cardId);
    await this.storage.saveCard({
      ...record,
      defaultForGrowth: false,
      updatedAt: this.timestamp(),
    });
    return this.getCard(cardId);
  }

  public async bindCardConversation(
    cardId: string,
    input: BindNutrientCardConversationInput,
  ): Promise<NutrientCardDetail> {
    const record = await this.requireCard(cardId);
    if (record.status === NUTRIENT_CARD_STATUSES.archived) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "已归档营养卡片不能绑定会话",
        400,
      );
    }
    await this.storage.saveCard({
      ...record,
      conversationId: this.requireNonBlank(input.conversationId, "会话不能为空"),
      updatedAt: this.timestamp(),
    });
    return this.getCard(cardId);
  }

  public async createResearchSession(
    input: CreateNutrientResearchSessionInput,
  ): Promise<NutrientResearchSessionDetail> {
    const seedId = await this.requireSeed(input.seedId);
    const nutrientCardId = await this.resolveResearchCard(seedId, input.nutrientCardId);
    if (nutrientCardId !== null) {
      const existing = await this.storage.findResearchSessionByCardId(
        nutrientCardId,
      );
      if (existing !== null) {
        return this.getResearchSession(existing.id);
      }
    }
    const timestamp = this.timestamp();
    const session: NutrientResearchSessionRecord = {
      id: this.idGenerator.nextId("nutrient-research-session"),
      seedId,
      nutrientCardId,
      title:
        input.title === undefined
          ? ""
          : this.normalizeOptionalText(input.title),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.storage.createResearchSession(session);
    if (nutrientCardId !== null) {
      await this.bindCardConversation(nutrientCardId, {
        conversationId: session.id,
      });
    }
    return this.getResearchSession(session.id);
  }

  public async getResearchSession(
    sessionId: string,
  ): Promise<NutrientResearchSessionDetail> {
    const session = await this.requireResearchSession(sessionId);
    const messages = await this.listResearchMessages(session.id);
    const depositableBlocks = await this.listDepositableBlocks(session.id);
    return {
      ...this.toResearchSessionSummary(session),
      messages,
      depositableBlocks,
    };
  }

  public async listResearchMessages(
    sessionId: string,
  ): Promise<NutrientResearchMessage[]> {
    const session = await this.requireResearchSession(sessionId);
    const records = await this.storage.listResearchMessagesBySession(session.id);
    return records.map((record) => this.toResearchMessage(record));
  }

  public async listDepositableBlocks(
    sessionId: string,
  ): Promise<NutrientDepositableBlock[]> {
    const session = await this.requireResearchSession(sessionId);
    const records = await this.storage.listDepositableBlocksBySession(session.id);
    return records.map((record) => this.toDepositableBlock(record));
  }

  public async submitResearchMessage(
    sessionId: string,
    input: SubmitNutrientResearchMessageInput,
  ): Promise<SubmitNutrientResearchMessageResult> {
    const session = await this.requireResearchSession(sessionId);
    const message = this.requireNonBlank(input.message, "研究消息不能为空");
    const timestamp = this.timestamp();
    const userMessageRecord: NutrientResearchMessageRecord = {
      id: this.idGenerator.nextId("nutrient-research-message"),
      sessionId: session.id,
      role: "user",
      content: message,
      agentTaskId: null,
      trace: [],
      failureReason: null,
      createdAt: timestamp,
    };
    await this.storage.createResearchMessage(userMessageRecord);

    const agent = this.requireAgentPort();
    const agentResult = await agent.runTask({
      type: "nutrient_research",
      input: await this.buildResearchAgentInput(session, message),
      metadata: {
        seedId: session.seedId,
        nutrientCardId: session.nutrientCardId,
        sessionId: session.id,
      },
    });

    if (!agentResult.ok) {
      const assistant = await this.saveAssistantResearchMessage({
        session,
        content: agentResult.error.message,
        agentTaskId: agentResult.taskId,
        trace: agentResult.trace.map((event) => ({ ...event })),
        failureReason: agentResult.error.message,
      });
      throw new ApplicationError(
        "AGENT_TASK_FAILED",
        agentResult.error.message,
        502,
      );
    }

    const output = validateNutrientResearchOutput(agentResult.output.content);
    const assistant = await this.saveAssistantResearchMessage({
      session,
      content: output.message,
      agentTaskId: agentResult.taskId,
      trace: agentResult.trace.map((event) => ({ ...event })),
      failureReason: null,
    });
    const blocks: NutrientDepositableBlock[] = [];
    for (const block of output.depositableBlocks) {
      const record: NutrientDepositableBlockRecord = {
        id: this.idGenerator.nextId("nutrient-depositable-block"),
        sessionId: session.id,
        messageId: assistant.id,
        title: block.title,
        markdown: block.markdown,
        createdAt: this.timestamp(),
      };
      await this.storage.createDepositableBlock(record);
      blocks.push(this.toDepositableBlock(record));
    }
    await this.touchResearchSession(session);
    return {
      userMessage: this.toResearchMessage(userMessageRecord),
      assistantMessage: assistant,
      depositableBlocks: blocks,
    };
  }

  public async listReferableContents(
    seedId: string,
  ): Promise<ReferableNutrientContent[]> {
    const normalizedSeedId = await this.requireSeed(seedId);
    const records = await this.storage.listReferableContents(normalizedSeedId);
    return records.map(({ content, library, defaultForGrowth }) => ({
      ...this.toContentSummary(content),
      library: {
        id: library.id,
        name: library.name,
        scope: library.scope,
        seedId: library.seedId,
      },
      defaultForGrowth,
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

  public async assertTemporaryNutrientCardRefsReferable(
    seedId: string,
    refs: TemporaryNutrientCardResourceRef[],
  ): Promise<void> {
    if (refs.length === 0) {
      return;
    }
    const normalizedSeedId = await this.requireSeed(seedId);
    for (const ref of refs) {
      if (ref.resourceType !== "nutrient_card") {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "临时营养卡片引用类型不正确",
          400,
        );
      }
      const card = await this.requireCard(ref.resourceId);
      if (card.seedId !== normalizedSeedId) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "营养卡片不可被当前种子引用",
          400,
        );
      }
      if (card.status !== NUTRIENT_CARD_STATUSES.unsettled) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "只有未沉淀营养卡片可以作为临时资料引用",
          400,
        );
      }
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

  private async resolveResearchCard(
    seedId: string,
    nutrientCardId: string | null | undefined,
  ): Promise<string | null> {
    if (nutrientCardId === undefined || nutrientCardId === null) {
      return null;
    }
    const card = await this.requireCard(nutrientCardId);
    if (card.seedId !== seedId) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "营养研究会话不能绑定其他种子的营养卡片",
        400,
      );
    }
    return card.id;
  }

  private async requireCard(cardId: string): Promise<NutrientCardRecord> {
    const normalized = this.requireNonBlank(cardId, "营养卡片不能为空");
    const record = await this.storage.findCardById(normalized);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "营养卡片不存在", 404);
    }
    return record;
  }

  private async requireResearchSession(
    sessionId: string,
  ): Promise<NutrientResearchSessionRecord> {
    const normalized = this.requireNonBlank(sessionId, "营养研究会话不能为空");
    const record = await this.storage.findResearchSessionById(normalized);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "营养研究会话不存在", 404);
    }
    return record;
  }

  private async buildResearchAgentInput(
    session: NutrientResearchSessionRecord,
    message: string,
  ): Promise<Record<string, unknown>> {
    const seed = await this.seedStorage.findSeedById(session.seedId);
    const card =
      session.nutrientCardId === null
        ? null
        : await this.storage.findCardById(session.nutrientCardId);
    const recentMessages = (
      await this.storage.listResearchMessagesBySession(session.id)
    )
      .slice(-8)
      .map((item) => ({
        role: item.role,
        content: item.content,
        createdAt: item.createdAt,
      }));
    return {
      seedId: session.seedId,
      seedTitle: seed?.title ?? "",
      nutrientCardId: session.nutrientCardId,
      nutrientCardTitle: card?.title ?? "",
      sessionId: session.id,
      message,
      recentMessages,
    };
  }

  private async saveAssistantResearchMessage(input: {
    session: NutrientResearchSessionRecord;
    content: string;
    agentTaskId: string;
    trace: Record<string, unknown>[];
    failureReason: string | null;
  }): Promise<NutrientResearchMessage> {
    const record: NutrientResearchMessageRecord = {
      id: this.idGenerator.nextId("nutrient-research-message"),
      sessionId: input.session.id,
      role: "assistant",
      content: input.content,
      agentTaskId: input.agentTaskId,
      trace: input.trace,
      failureReason: input.failureReason,
      createdAt: this.timestamp(),
    };
    await this.storage.createResearchMessage(record);
    await this.touchResearchSession(input.session);
    return this.toResearchMessage(record);
  }

  private async touchResearchSession(
    session: NutrientResearchSessionRecord,
  ): Promise<void> {
    await this.storage.saveResearchSession({
      ...session,
      updatedAt: this.timestamp(),
    });
  }

  private requireAgentPort(): AgentPort {
    if (this.agentPort === undefined) {
      throw new ApplicationError(
        "AGENT_TASK_FAILED",
        "营养研究 Agent 入口尚未装配",
        502,
      );
    }
    return this.agentPort;
  }

  private async syncSettledContentFromCard(
    card: NutrientCardRecord,
    markdown: string | null,
  ): Promise<void> {
    if (card.settledContentId === null) {
      return;
    }
    const content = await this.storage.findContentById(card.settledContentId);
    if (content === null) {
      return;
    }
    await this.storage.saveContent({
      ...content,
      title: card.title,
      updatedAt: card.updatedAt,
    });
    if (markdown !== null) {
      await this.contentAccess.updateNutrientMarkdown(
        content.contentLocation,
        markdown,
      );
    }
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

  private requireCardStatus(value: NutrientCardStatus): NutrientCardStatus {
    if (
      value !== NUTRIENT_CARD_STATUSES.unsettled &&
      value !== NUTRIENT_CARD_STATUSES.settled &&
      value !== NUTRIENT_CARD_STATUSES.archived
    ) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "营养卡片状态不正确",
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

  private normalizeNullableText(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const normalized = value.trim();
    return normalized.length === 0 ? null : normalized;
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

  private toCardSummary(record: NutrientCardRecord): NutrientCardSummary {
    return {
      id: record.id,
      seedId: record.seedId,
      title: record.title,
      status: record.status,
      contentLocation: record.contentLocation,
      settledContentId: record.settledContentId,
      defaultForGrowth: record.defaultForGrowth,
      conversationId: record.conversationId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      settledAt: record.settledAt,
      archivedAt: record.archivedAt,
    };
  }

  private toCardDetail(
    record: NutrientCardRecord,
    markdown: string,
  ): NutrientCardDetail {
    return {
      ...this.toCardSummary(record),
      markdown,
    };
  }

  private toResearchSessionSummary(
    record: NutrientResearchSessionRecord,
  ): NutrientResearchSessionSummary {
    return {
      id: record.id,
      seedId: record.seedId,
      nutrientCardId: record.nutrientCardId,
      title: record.title,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private toResearchMessage(
    record: NutrientResearchMessageRecord,
  ): NutrientResearchMessage {
    return {
      id: record.id,
      sessionId: record.sessionId,
      role: record.role,
      content: record.content,
      agentTaskId: record.agentTaskId,
      trace: record.trace.map((event) => ({ ...event })),
      failureReason: record.failureReason,
      createdAt: record.createdAt,
    };
  }

  private toDepositableBlock(
    record: NutrientDepositableBlockRecord,
  ): NutrientDepositableBlock {
    return {
      id: record.id,
      sessionId: record.sessionId,
      messageId: record.messageId,
      title: record.title,
      markdown: record.markdown,
      createdAt: record.createdAt,
    };
  }
}
