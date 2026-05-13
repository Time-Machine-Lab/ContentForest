import type { AgentPort } from "../../../agent/ports/agent-port.js";
import type { AgentTaskSuccessResult } from "../../../agent/runtime/agent-task.js";
import { validateNutrientResearchOutput } from "../../../agent/skills/nutrient-research-output.js";
import type { NutrientMarkdownContentAccessPort } from "../../../content-access/ports/nutrient-markdown-content-access-port.js";
import {
  ApplicationError,
  isApplicationError,
} from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type {
  NutrientCardRecord,
  NutrientContentRecord,
  NutrientCardListFilter,
  NutrientDepositableBlockRecord,
  NutrientLibraryListFilter,
  NutrientLibraryRecord,
  NutrientGapSuggestionListFilter,
  NutrientGapSuggestionRecord,
  NutrientResearchMessageRecord,
  NutrientResearchSessionRecord,
  NutrientStoragePort,
  NutrientUsageRecord,
} from "../../../storage/ports/nutrient-storage-port.js";
import type { FeedbackStoragePort } from "../../../storage/ports/feedback-storage-port.js";
import type { FruitStoragePort } from "../../../storage/ports/fruit-storage-port.js";
import type { PublicationStoragePort } from "../../../storage/ports/publication-storage-port.js";
import type { SeedStoragePort } from "../../../storage/ports/seed-storage-port.js";
import {
  NUTRIENT_ARCHIVE_STATES,
  NUTRIENT_CARD_STATUSES,
  NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES,
  NUTRIENT_GAP_SUGGESTION_STATUSES,
  NUTRIENT_LIBRARY_SCOPES,
  type AdoptNutrientGapSuggestionResult,
  type NutrientArchiveState,
  type NutrientCardDetail,
  type NutrientCardStatus,
  type NutrientCardSummary,
  type NutrientDepositableBlock,
  type NutrientContentDetail,
  type NutrientContentSummary,
  type NutrientGapSuggestion,
  type NutrientGapSuggestionSourceType,
  type NutrientGapSuggestionStatus,
  type NutrientLibraryDetail,
  type NutrientLibraryScope,
  type NutrientLibrarySummary,
  type NutrientFreshnessReminder,
  type NutrientResearchMessage,
  type NutrientResearchSessionDetail,
  type NutrientResearchSessionSummary,
  type NutrientUsageResourceType,
  type NutrientUsageSummary,
  type SimilarNutrientCard,
  type ReferableNutrientContent,
} from "../domain/nutrient-types.js";

const DEFAULT_SEED_SCOPED_NUTRIENT_LIBRARY_NAME = "默认专属营养库";

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
  libraryId?: string;
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

export type NutrientResearchStreamEvent =
  | {
    type: "user_message";
    message: NutrientResearchMessage;
  }
  | {
    type: "progress";
    stage: "message_saved" | "agent_started" | "agent_completed" | "saving_result";
    message: string;
  }
  | {
    type: "assistant_message_delta";
    message: NutrientResearchMessage;
    delta: string;
    done: boolean;
  }
  | {
    type: "depositable_block";
    block: NutrientDepositableBlock;
  }
  | {
    type: "done";
    assistantMessage: NutrientResearchMessage;
    depositableBlocks: NutrientDepositableBlock[];
  }
  | {
    type: "error";
    code: string;
    message: string;
    assistantMessage?: NutrientResearchMessage;
  };

interface PersistedNutrientResearchResult {
  assistantMessage: NutrientResearchMessage;
  depositableBlocks: NutrientDepositableBlock[];
}

export interface CreateNutrientGapSuggestionInput {
  seedId: string;
  sourceType: NutrientGapSuggestionSourceType;
  sourceId?: string | null;
  title: string;
  bodyMarkdown: string;
}

export interface ListNutrientGapSuggestionsInput {
  status?: NutrientGapSuggestionStatus;
}

export interface GrowthInputGapSignal {
  seedId: string;
  userInput: string;
  nutrientRefCount: number;
  temporaryNutrientCardRefCount?: number;
  sourceId?: string | null;
}

export interface FruitEliminationGapSignal {
  seedId: string;
  fruitId: string;
}

export interface GrowthFailureGapSignal {
  seedId: string;
  taskId: string;
  failureReason: string;
}

export interface NutrientResourceRef {
  resourceType: "nutrient";
  resourceId: string;
}

export interface TemporaryNutrientCardResourceRef {
  resourceType: "nutrient_card";
  resourceId: string;
}

export interface RecordNutrientUsageInput {
  seedId: string;
  growthTaskId: string;
  growthAttemptId: string;
  fruitId: string;
  refs: Array<{
    resourceType: NutrientUsageResourceType;
    resourceId: string;
  }>;
}

export interface FindSimilarNutrientCardsInput {
  title: string;
  markdown?: string;
}

export interface MergeNutrientCardInput {
  title: string;
  markdown: string;
  sourceCardId?: string | null;
  mergeNote?: string;
}

export interface NutrientServiceDependencies {
  storage: NutrientStoragePort;
  contentAccess: NutrientMarkdownContentAccessPort;
  seedStorage: SeedStoragePort;
  fruitStorage?: FruitStoragePort;
  publicationStorage?: PublicationStoragePort;
  feedbackStorage?: FeedbackStoragePort;
  agentPort?: AgentPort;
  idGenerator?: IdGenerator;
  now?: () => Date;
}

export class NutrientService {
  private readonly storage: NutrientStoragePort;
  private readonly contentAccess: NutrientMarkdownContentAccessPort;
  private readonly seedStorage: SeedStoragePort;
  private readonly fruitStorage: FruitStoragePort | undefined;
  private readonly publicationStorage: PublicationStoragePort | undefined;
  private readonly feedbackStorage: FeedbackStoragePort | undefined;
  private readonly agentPort: AgentPort | undefined;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;

  public constructor(dependencies: NutrientServiceDependencies) {
    this.storage = dependencies.storage;
    this.contentAccess = dependencies.contentAccess;
    this.seedStorage = dependencies.seedStorage;
    this.fruitStorage = dependencies.fruitStorage;
    this.publicationStorage = dependencies.publicationStorage;
    this.feedbackStorage = dependencies.feedbackStorage;
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

  public async ensureDefaultSeedScopedLibrary(
    seedId: string,
  ): Promise<NutrientLibraryDetail> {
    const normalizedSeedId = await this.requireSeed(seedId);
    const library = await this.ensureDefaultSeedScopedLibraryRecord(
      normalizedSeedId,
    );
    const contentCount = await this.storage.countContentsByLibrary(library.id);
    return this.toLibraryDetail(library, contentCount);
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
    const title = this.requireNonBlank(input.title, "草稿营养内容标题不能为空");
    const markdown = this.requireNonBlank(
      input.markdown,
      "草稿营养内容 Markdown 正文不能为空",
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
      lastResearchedAt: null,
      lastReferencedAt: null,
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
        "至少需要提供工作台营养内容标题或 Markdown 正文",
        400,
      );
    }
    const record = await this.requireCard(cardId);
    if (record.status === NUTRIENT_CARD_STATUSES.archived) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "已归档工作台营养内容不能编辑",
        400,
      );
    }
    const title =
      input.title === undefined
        ? record.title
        : this.requireNonBlank(input.title, "工作台营养内容标题不能为空");
    const markdown =
      input.markdown === undefined
        ? null
        : this.requireNonBlank(input.markdown, "工作台营养内容 Markdown 正文不能为空");
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
        "只有草稿营养内容可以沉淀",
        400,
      );
    }
    const library =
      input.libraryId === undefined
        ? await this.ensureDefaultSeedScopedLibraryRecord(record.seedId)
        : await this.requireActiveLibrary(input.libraryId);
    if (
      library.scope !== NUTRIENT_LIBRARY_SCOPES.seedScoped ||
      library.seedId !== record.seedId
    ) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "草稿营养内容只能沉淀到当前种子专属营养库",
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

  public async deleteDraftCard(cardId: string): Promise<void> {
    const record = await this.requireCard(cardId);
    if (record.status !== NUTRIENT_CARD_STATUSES.unsettled) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Only draft nutrient content can be deleted",
        400,
      );
    }
    await this.storage.deleteCard(record.id);
    await this.contentAccess.removeNutrientMarkdown(record.contentLocation);
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
        "只有已沉淀营养内容可以设置为默认带入",
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
        "已归档工作台营养内容不能绑定会话",
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
    const userMessageRecord = await this.createUserResearchMessage(
      session,
      message,
    );
    const agentResult = await this.runNutrientResearchAgent(session, message);

    if (!agentResult.ok) {
      await this.saveAssistantResearchMessage({
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

    const result = await this.persistSuccessfulResearchResult(
      session,
      agentResult,
    );
    return {
      userMessage: this.toResearchMessage(userMessageRecord),
      assistantMessage: result.assistantMessage,
      depositableBlocks: result.depositableBlocks,
    };
  }

  public async *streamResearchMessage(
    sessionId: string,
    input: SubmitNutrientResearchMessageInput,
  ): AsyncGenerator<NutrientResearchStreamEvent> {
    const session = await this.requireResearchSession(sessionId);
    const message = this.requireNonBlank(input.message, "研究消息不能为空");
    const userMessageRecord = await this.createUserResearchMessage(
      session,
      message,
    );
    yield {
      type: "user_message",
      message: this.toResearchMessage(userMessageRecord),
    };
    yield {
      type: "progress",
      stage: "message_saved",
      message: "用户消息已保存",
    };
    yield {
      type: "progress",
      stage: "agent_started",
      message: "Agent 正在研究营养资料",
    };

    try {
      const agentResult = await this.runNutrientResearchAgent(session, message);
      if (!agentResult.ok) {
        const assistantMessage = await this.saveAssistantResearchMessage({
          session,
          content: agentResult.error.message,
          agentTaskId: agentResult.taskId,
          trace: agentResult.trace.map((event) => ({ ...event })),
          failureReason: agentResult.error.message,
        });
        yield {
          type: "error",
          code: agentResult.error.code,
          message: agentResult.error.message,
          assistantMessage,
        };
        return;
      }

      yield {
        type: "progress",
        stage: "agent_completed",
        message: "Agent 研究完成，正在保存结果",
      };
      const result = await this.persistSuccessfulResearchResult(
        session,
        agentResult,
      );
      yield {
        type: "progress",
        stage: "saving_result",
        message: "研究结果已保存",
      };
      yield {
        type: "assistant_message_delta",
        message: result.assistantMessage,
        delta: result.assistantMessage.content,
        done: true,
      };
      for (const block of result.depositableBlocks) {
        yield {
          type: "depositable_block",
          block,
        };
      }
      yield {
        type: "done",
        assistantMessage: result.assistantMessage,
        depositableBlocks: result.depositableBlocks,
      };
    } catch (error) {
      const failureMessage =
        error instanceof Error ? error.message : "营养研究失败";
      let assistantMessage: NutrientResearchMessage | undefined;
      try {
        assistantMessage = await this.saveAssistantResearchMessage({
          session,
          content: failureMessage,
          agentTaskId: "nutrient-research-stream-error",
          trace: [],
          failureReason: failureMessage,
        });
      } catch {
        assistantMessage = undefined;
      }
      yield {
        type: "error",
        code: isApplicationError(error) ? error.code : "AGENT_TASK_FAILED",
        message: failureMessage,
        assistantMessage,
      };
    }
  }

  public async createGapSuggestion(
    input: CreateNutrientGapSuggestionInput,
  ): Promise<NutrientGapSuggestion> {
    const seedId = await this.requireSeed(input.seedId);
    const sourceType = this.requireGapSuggestionSourceType(input.sourceType);
    const title = this.requireNonBlank(input.title, "营养汲取建议标题不能为空");
    const bodyMarkdown = this.requireNonBlank(
      input.bodyMarkdown,
      "营养汲取建议内容不能为空",
    );
    const timestamp = this.timestamp();
    const record: NutrientGapSuggestionRecord = {
      id: this.idGenerator.nextId("nutrient-gap-suggestion"),
      seedId,
      status: NUTRIENT_GAP_SUGGESTION_STATUSES.pending,
      sourceType,
      sourceId: this.normalizeNullableText(input.sourceId),
      title,
      bodyMarkdown,
      dedupeKey: this.buildGapSuggestionDedupeKey({
        sourceType,
        sourceId: input.sourceId,
        title,
      }),
      adoptedCardId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      resolvedAt: null,
    };
    const created = await this.storage.createGapSuggestion(record);
    if (created) {
      return this.toGapSuggestion(record);
    }
    const existing = (await this.storage.listGapSuggestionsBySeed(seedId))
      .find((suggestion) => suggestion.dedupeKey === record.dedupeKey);
    return this.toGapSuggestion(existing ?? record);
  }

  public async listGapSuggestions(
    seedId: string,
    input: ListNutrientGapSuggestionsInput = {},
  ): Promise<NutrientGapSuggestion[]> {
    const normalizedSeedId = await this.requireSeed(seedId);
    const filter: NutrientGapSuggestionListFilter = {};
    if (input.status !== undefined) {
      filter.status = this.requireGapSuggestionStatus(input.status);
    }
    const records = await this.storage.listGapSuggestionsBySeed(
      normalizedSeedId,
      filter,
    );
    return records.map((record) => this.toGapSuggestion(record));
  }

  public async countPendingGapSuggestions(seedId: string): Promise<number> {
    const normalizedSeedId = await this.requireSeed(seedId);
    return this.storage.countGapSuggestionsBySeed(normalizedSeedId, {
      status: NUTRIENT_GAP_SUGGESTION_STATUSES.pending,
    });
  }

  public async adoptGapSuggestion(
    suggestionId: string,
  ): Promise<AdoptNutrientGapSuggestionResult> {
    const suggestion = await this.requireGapSuggestion(suggestionId);
    if (suggestion.status !== NUTRIENT_GAP_SUGGESTION_STATUSES.pending) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "只有待处理营养汲取建议可以采纳",
        400,
      );
    }
    const nutrientCard = await this.createCard(suggestion.seedId, {
      title: suggestion.title,
      markdown: suggestion.bodyMarkdown,
    });
    const timestamp = this.timestamp();
    const updated: NutrientGapSuggestionRecord = {
      ...suggestion,
      status: NUTRIENT_GAP_SUGGESTION_STATUSES.adopted,
      adoptedCardId: nutrientCard.id,
      updatedAt: timestamp,
      resolvedAt: timestamp,
    };
    await this.storage.saveGapSuggestion(updated);
    return {
      suggestion: this.toGapSuggestion(updated),
      nutrientCard,
    };
  }

  public async ignoreGapSuggestion(
    suggestionId: string,
  ): Promise<NutrientGapSuggestion> {
    const suggestion = await this.requireGapSuggestion(suggestionId);
    if (suggestion.status !== NUTRIENT_GAP_SUGGESTION_STATUSES.pending) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "只有待处理营养汲取建议可以忽略",
        400,
      );
    }
    const timestamp = this.timestamp();
    const updated: NutrientGapSuggestionRecord = {
      ...suggestion,
      status: NUTRIENT_GAP_SUGGESTION_STATUSES.ignored,
      updatedAt: timestamp,
      resolvedAt: timestamp,
    };
    await this.storage.saveGapSuggestion(updated);
    return this.toGapSuggestion(updated);
  }

  public async createSuggestionsFromSeedBrief(
    seedId: string,
    markdown: string,
  ): Promise<NutrientGapSuggestion[]> {
    const gaps = this.extractSeedBriefGapLines(markdown);
    const created: NutrientGapSuggestion[] = [];
    for (const gap of gaps) {
      created.push(
        await this.createGapSuggestion({
          seedId,
          sourceType: NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.seedBriefGap,
          sourceId: "seed_brief",
          title: this.shortTitle(`补充资料：${gap}`),
          bodyMarkdown: [
            "# 营养汲取建议",
            "",
            `建议补充与「${gap}」相关的资料、案例或平台表达规律。`,
            "",
            "## 研究输入",
            gap,
          ].join("\n"),
        }),
      );
    }
    return created;
  }

  public async createSuggestionFromGrowthInput(
    input: GrowthInputGapSignal,
  ): Promise<NutrientGapSuggestion | null> {
    const totalRefs =
      input.nutrientRefCount + (input.temporaryNutrientCardRefCount ?? 0);
    const direction = this.extractPlatformOrDirection(input.userInput);
    if (direction === null || totalRefs > 0) {
      return null;
    }
    return this.createGapSuggestion({
      seedId: input.seedId,
      sourceType: NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.growthInputGap,
      sourceId: input.sourceId,
      title: this.shortTitle(`补充${direction}资料`),
      bodyMarkdown: [
        "# 营养汲取建议",
        "",
        `用户本次生长提到了「${direction}」，但没有带入相关营养资料。`,
        "",
        "## 研究输入",
        input.userInput.trim(),
      ].join("\n"),
    });
  }

  public async createSuggestionFromFruitElimination(
    input: FruitEliminationGapSignal,
  ): Promise<NutrientGapSuggestion> {
    return this.createGapSuggestion({
      seedId: input.seedId,
      sourceType: NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.fruitElimination,
      sourceId: input.fruitId,
      title: "补充淘汰原因资料",
      bodyMarkdown: [
        "# 营养汲取建议",
        "",
        "该果实被淘汰，建议补充平台语感、同类案例、失败原因或反面样本，帮助后续生长规避类似表达。",
        "",
        "## 关联果实",
        input.fruitId,
      ].join("\n"),
    });
  }

  public async createSuggestionFromGrowthFailure(
    input: GrowthFailureGapSignal,
  ): Promise<NutrientGapSuggestion> {
    return this.createGapSuggestion({
      seedId: input.seedId,
      sourceType: NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.growthFailure,
      sourceId: input.taskId,
      title: "补充生成失败资料",
      bodyMarkdown: [
        "# 营养汲取建议",
        "",
        "枝化生长没有成功生成果实，建议补充更明确的平台案例、表达规则或种子专属资料。",
        "",
        "## 失败原因",
        input.failureReason,
      ].join("\n"),
    });
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
          "临时营养内容引用类型不正确",
          400,
        );
      }
      const card = await this.requireCard(ref.resourceId);
      if (card.seedId !== normalizedSeedId) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "工作台营养内容不可被当前种子引用",
          400,
        );
      }
      if (card.status !== NUTRIENT_CARD_STATUSES.unsettled) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "只有草稿营养内容可以作为临时资料引用",
          400,
        );
      }
    }
  }

  public async recordNutrientUsage(
    input: RecordNutrientUsageInput,
  ): Promise<void> {
    const seedId = await this.requireSeed(input.seedId);
    const timestamp = this.timestamp();
    const seen = new Set<string>();
    for (const ref of input.refs) {
      const resourceId = this.requireNonBlank(ref.resourceId, "营养引用不能为空");
      if (ref.resourceType !== "nutrient" && ref.resourceType !== "nutrient_card") {
        throw new ApplicationError("VALIDATION_ERROR", "营养引用类型不正确", 400);
      }
      const key = `${ref.resourceType}:${resourceId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      await this.storage.createUsageRecord({
        id: this.idGenerator.nextId("nutrient-usage"),
        seedId,
        resourceType: ref.resourceType,
        resourceId,
        growthTaskId: this.requireNonBlank(input.growthTaskId, "生长任务不能为空"),
        growthAttemptId: this.requireNonBlank(
          input.growthAttemptId,
          "生长尝试不能为空",
        ),
        fruitId: this.requireNonBlank(input.fruitId, "果实不能为空"),
        usedAt: timestamp,
        createdAt: timestamp,
      });
      await this.touchReferencedCard(ref.resourceType, resourceId, timestamp);
    }
  }

  public async getCardUsageSummary(cardId: string): Promise<NutrientUsageSummary> {
    const card = await this.requireCard(cardId);
    const cardRecords = await this.storage.listUsageRecordsByResource(
      "nutrient_card",
      card.id,
    );
    const settledRecords =
      card.settledContentId === null
        ? []
        : await this.storage.listUsageRecordsByResource(
            "nutrient",
            card.settledContentId,
          );
    return this.buildUsageSummaryFromRecords(
      "nutrient_card",
      card.id,
      [...cardRecords, ...settledRecords].sort((left, right) =>
        right.usedAt.localeCompare(left.usedAt),
      ),
    );
  }

  public async listFreshnessReminders(
    seedId: string,
  ): Promise<NutrientFreshnessReminder[]> {
    const cards = await this.storage.listCardsBySeed(await this.requireSeed(seedId));
    const now = this.now().getTime();
    const staleUpdateMs = 1000 * 60 * 60 * 24 * 30;
    const staleReferenceMs = 1000 * 60 * 60 * 24 * 14;
    return cards.flatMap((card) => {
      if (card.status === NUTRIENT_CARD_STATUSES.archived) {
        return [];
      }
      const reasons: string[] = [];
      if (this.isOlderThan(card.updatedAt, now, staleUpdateMs)) {
        reasons.push("长期未更新，建议重新研究");
      }
      if (
        card.lastReferencedAt === null ||
        this.isOlderThan(card.lastReferencedAt, now, staleReferenceMs)
      ) {
        reasons.push("近期未被引用，建议检查是否仍有价值");
      }
      return reasons.length === 0
        ? []
        : [{
            cardId: card.id,
            title: card.title,
            reasons,
            lastUpdatedAt: card.updatedAt,
            lastReferencedAt: card.lastReferencedAt,
          }];
    });
  }

  public async findSimilarCards(
    seedId: string,
    input: FindSimilarNutrientCardsInput,
  ): Promise<SimilarNutrientCard[]> {
    const normalizedSeedId = await this.requireSeed(seedId);
    const title = this.requireNonBlank(input.title, "营养标题不能为空");
    const words = this.tokenize(`${title} ${input.markdown ?? ""}`);
    const cards = await this.storage.listCardsBySeed(normalizedSeedId);
    return cards
      .map((card) => ({
        card,
        overlap: this.countTokenOverlap(words, this.tokenize(card.title)),
      }))
      .filter((item) => item.overlap > 0 || item.card.title.includes(title))
      .sort((left, right) => right.overlap - left.overlap)
      .slice(0, 5)
      .map(({ card }) => ({
        cardId: card.id,
        title: card.title,
        status: card.status,
        reason: "标题或关键词相似",
      }));
  }

  public async mergeIntoCard(
    cardId: string,
    input: MergeNutrientCardInput,
  ): Promise<NutrientCardDetail> {
    const target = await this.requireCard(cardId);
    if (target.status === NUTRIENT_CARD_STATUSES.archived) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "已归档工作台营养内容不能合并",
        400,
      );
    }
    const title = this.requireNonBlank(input.title, "合并来源标题不能为空");
    const markdown = this.requireNonBlank(input.markdown, "合并内容不能为空");
    const existingMarkdown = await this.contentAccess.readNutrientMarkdown(
      target.contentLocation,
    );
    const mergedMarkdown = [
      existingMarkdown.trim(),
      "",
      "## 合并补充",
      "",
      `### ${title}`,
      "",
      markdown,
    ].join("\n").trim();
    await this.contentAccess.updateNutrientMarkdown(
      target.contentLocation,
      mergedMarkdown,
    );
    const timestamp = this.timestamp();
    const updated = {
      ...target,
      updatedAt: timestamp,
    };
    await this.storage.saveCard(updated);
    await this.syncSettledContentFromCard(updated, mergedMarkdown);
    await this.storage.createCardMergeRecord({
      id: this.idGenerator.nextId("nutrient-card-merge"),
      seedId: target.seedId,
      sourceCardId: this.normalizeNullableText(input.sourceCardId),
      targetCardId: target.id,
      sourceTitle: title,
      sourceContentLocation: null,
      mergeNote: this.normalizeOptionalText(input.mergeNote),
      mergedAt: timestamp,
      createdAt: timestamp,
    });
    return this.getCard(target.id);
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

  private async ensureDefaultSeedScopedLibraryRecord(
    seedId: string,
  ): Promise<NutrientLibraryRecord> {
    const libraryId = this.defaultSeedScopedLibraryId(seedId);
    const existing = await this.storage.findLibraryById(libraryId);
    if (existing !== null) {
      if (existing.archiveState === NUTRIENT_ARCHIVE_STATES.active) {
        return existing;
      }
      const restored: NutrientLibraryRecord = {
        ...existing,
        archiveState: NUTRIENT_ARCHIVE_STATES.active,
        updatedAt: this.timestamp(),
        archivedAt: null,
      };
      await this.storage.saveLibrary(restored);
      return restored;
    }

    const timestamp = this.timestamp();
    const record: NutrientLibraryRecord = {
      id: libraryId,
      name: DEFAULT_SEED_SCOPED_NUTRIENT_LIBRARY_NAME,
      description: "",
      scope: NUTRIENT_LIBRARY_SCOPES.seedScoped,
      seedId,
      archiveState: NUTRIENT_ARCHIVE_STATES.active,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    };

    try {
      await this.storage.createLibrary(record);
      return record;
    } catch (error) {
      const concurrent = await this.storage.findLibraryById(libraryId);
      if (concurrent === null) {
        throw error;
      }
      if (concurrent.archiveState === NUTRIENT_ARCHIVE_STATES.active) {
        return concurrent;
      }
      const restored: NutrientLibraryRecord = {
        ...concurrent,
        archiveState: NUTRIENT_ARCHIVE_STATES.active,
        updatedAt: this.timestamp(),
        archivedAt: null,
      };
      await this.storage.saveLibrary(restored);
      return restored;
    }
  }

  private defaultSeedScopedLibraryId(seedId: string): string {
    return `nutrient-library_default_${encodeURIComponent(seedId)}`;
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
        "营养研究会话不能绑定其他种子的营养内容",
        400,
      );
    }
    return card.id;
  }

  private async requireCard(cardId: string): Promise<NutrientCardRecord> {
    const normalized = this.requireNonBlank(cardId, "工作台营养内容不能为空");
    const record = await this.storage.findCardById(normalized);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "工作台营养内容不存在", 404);
    }
    return record;
  }

  private async touchReferencedCard(
    resourceType: NutrientUsageResourceType,
    resourceId: string,
    referencedAt: string,
  ): Promise<void> {
    const cards =
      resourceType === "nutrient_card"
        ? [await this.storage.findCardById(resourceId)].filter(
            (card): card is NutrientCardRecord => card !== null,
          )
        : await this.storage.findCardsBySettledContentIds([resourceId]);
    for (const card of cards) {
      await this.storage.saveCard({
        ...card,
        lastReferencedAt: referencedAt,
      });
    }
  }

  private async buildUsageSummary(
    resourceType: NutrientUsageResourceType,
    resourceId: string,
  ): Promise<NutrientUsageSummary> {
    const records = await this.storage.listUsageRecordsByResource(
      resourceType,
      resourceId,
    );
    return this.buildUsageSummaryFromRecords(resourceType, resourceId, records);
  }

  private async buildUsageSummaryFromRecords(
    resourceType: NutrientUsageResourceType,
    resourceId: string,
    records: NutrientUsageRecord[],
  ): Promise<NutrientUsageSummary> {
    const fruitIds = [...new Set(records.map((record) => record.fruitId))];
    const fruits = [];
    let selectedFruitCount = 0;
    let eliminatedFruitCount = 0;
    let publicationRecordCount = 0;
    let feedbackSnapshotCount = 0;
    for (const fruitId of fruitIds) {
      const fruit = await this.fruitStorage?.findFruitById(fruitId);
      const usage = records.find((record) => record.fruitId === fruitId);
      if (fruit?.selectionState === "selected") {
        selectedFruitCount += 1;
      }
      if (fruit?.selectionState === "eliminated") {
        eliminatedFruitCount += 1;
      }
      const publications =
        (await this.publicationStorage?.listPublicationRecordsByFruit(fruitId)) ??
        [];
      publicationRecordCount += publications.length;
      let fruitFeedbackCount = 0;
      for (const publication of publications) {
        const snapshots =
          (await this.feedbackStorage?.listFeedbackSnapshotsByPublicationRecord(
            publication.id,
          )) ?? [];
        fruitFeedbackCount += snapshots.length;
      }
      feedbackSnapshotCount += fruitFeedbackCount;
      fruits.push({
        fruitId,
        summary: fruit?.summary ?? "",
        selectionState: fruit?.selectionState ?? "unknown",
        publicationRecordCount: publications.length,
        feedbackSnapshotCount: fruitFeedbackCount,
        usedAt: usage?.usedAt ?? "",
      });
    }
    return {
      resourceType,
      resourceId,
      usageCount: records.length,
      fruitCount: fruitIds.length,
      selectedFruitCount,
      eliminatedFruitCount,
      publicationRecordCount,
      feedbackSnapshotCount,
      latestUsedAt: records[0]?.usedAt ?? null,
      fruits,
    };
  }

  private isOlderThan(value: string, now: number, durationMs: number): boolean {
    const time = Date.parse(value);
    return Number.isFinite(time) && now - time > durationMs;
  }

  private tokenize(value: string): string[] {
    return [...new Set(
      value.toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 2),
    )];
  }

  private countTokenOverlap(left: string[], right: string[]): number {
    const rightSet = new Set(right);
    return left.filter((token) => rightSet.has(token)).length;
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

  private async requireGapSuggestion(
    suggestionId: string,
  ): Promise<NutrientGapSuggestionRecord> {
    const normalized = this.requireNonBlank(
      suggestionId,
      "营养汲取建议不能为空",
    );
    const record = await this.storage.findGapSuggestionById(normalized);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "营养汲取建议不存在", 404);
    }
    return record;
  }

  private async createUserResearchMessage(
    session: NutrientResearchSessionRecord,
    message: string,
  ): Promise<NutrientResearchMessageRecord> {
    const record: NutrientResearchMessageRecord = {
      id: this.idGenerator.nextId("nutrient-research-message"),
      sessionId: session.id,
      role: "user",
      content: message,
      agentTaskId: null,
      trace: [],
      failureReason: null,
      createdAt: this.timestamp(),
    };
    await this.storage.createResearchMessage(record);
    return record;
  }

  private async runNutrientResearchAgent(
    session: NutrientResearchSessionRecord,
    message: string,
  ) {
    const agent = this.requireAgentPort();
    return agent.runTask({
      type: "nutrient_research",
      input: await this.buildResearchAgentInput(session, message),
      metadata: {
        seedId: session.seedId,
        nutrientCardId: session.nutrientCardId,
        sessionId: session.id,
      },
    });
  }

  private async persistSuccessfulResearchResult(
    session: NutrientResearchSessionRecord,
    agentResult: AgentTaskSuccessResult,
  ): Promise<PersistedNutrientResearchResult> {
    const output = validateNutrientResearchOutput(agentResult.output.content);
    const assistantMessage = await this.saveAssistantResearchMessage({
      session,
      content: output.message,
      agentTaskId: agentResult.taskId,
      trace: agentResult.trace.map((event) => ({ ...event })),
      failureReason: null,
    });
    const depositableBlocks: NutrientDepositableBlock[] = [];
    for (const block of output.depositableBlocks) {
      const record: NutrientDepositableBlockRecord = {
        id: this.idGenerator.nextId("nutrient-depositable-block"),
        sessionId: session.id,
        messageId: assistantMessage.id,
        title: block.title,
        markdown: block.markdown,
        createdAt: this.timestamp(),
      };
      await this.storage.createDepositableBlock(record);
      depositableBlocks.push(this.toDepositableBlock(record));
    }
    await this.touchResearchSession(session);
    return {
      assistantMessage,
      depositableBlocks,
    };
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
    const timestamp = this.timestamp();
    await this.storage.saveResearchSession({
      ...session,
      updatedAt: timestamp,
    });
    if (session.nutrientCardId !== null) {
      const card = await this.storage.findCardById(session.nutrientCardId);
      if (card !== null) {
        await this.storage.saveCard({
          ...card,
          lastResearchedAt: timestamp,
        });
      }
    }
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
        "工作台营养内容状态不正确",
        400,
      );
    }
    return value;
  }

  private requireGapSuggestionStatus(
    value: NutrientGapSuggestionStatus,
  ): NutrientGapSuggestionStatus {
    if (
      value !== NUTRIENT_GAP_SUGGESTION_STATUSES.pending &&
      value !== NUTRIENT_GAP_SUGGESTION_STATUSES.adopted &&
      value !== NUTRIENT_GAP_SUGGESTION_STATUSES.ignored
    ) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "营养汲取建议状态不正确",
        400,
      );
    }
    return value;
  }

  private requireGapSuggestionSourceType(
    value: NutrientGapSuggestionSourceType,
  ): NutrientGapSuggestionSourceType {
    if (
      value !== NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.seedBriefGap &&
      value !== NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.growthInputGap &&
      value !== NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.fruitElimination &&
      value !== NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.growthFailure &&
      value !== NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES.manual
    ) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "营养汲取建议来源不正确",
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

  private buildGapSuggestionDedupeKey(input: {
    sourceType: NutrientGapSuggestionSourceType;
    sourceId?: string | null;
    title: string;
  }): string {
    return [
      input.sourceType,
      this.normalizeNullableText(input.sourceId) ?? "none",
      input.title.trim().replace(/\s+/g, " ").toLowerCase(),
    ].join(":");
  }

  private extractSeedBriefGapLines(markdown: string): string[] {
    const lines = markdown
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*#>\s]+/, "").trim())
      .filter((line) => line.length > 0)
      .filter((line) => /缺口|证据|资料|案例|待补充|需要补充/.test(line));
    return [...new Set(lines)].slice(0, 5);
  }

  private extractPlatformOrDirection(value: string): string | null {
    const normalized = value.trim();
    if (normalized.length === 0) {
      return null;
    }
    const known = [
      "小红书",
      "抖音",
      "视频号",
      "B站",
      "微博",
      "知乎",
      "公众号",
      "Twitter",
      "X",
      "TikTok",
      "YouTube",
    ].find((platform) => normalized.toLowerCase().includes(platform.toLowerCase()));
    if (known !== undefined) {
      return known;
    }
    const directionMatch = normalized.match(/([\p{Script=Han}A-Za-z0-9]{2,18})(方向|赛道|平台|账号|爆款|案例)/u);
    return directionMatch?.[0] ?? null;
  }

  private shortTitle(value: string): string {
    const normalized = value.replace(/\s+/g, " ").trim();
    return Array.from(normalized).slice(0, 24).join("");
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
      lastResearchedAt: record.lastResearchedAt,
      lastReferencedAt: record.lastReferencedAt,
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

  private toGapSuggestion(
    record: NutrientGapSuggestionRecord,
  ): NutrientGapSuggestion {
    return {
      id: record.id,
      seedId: record.seedId,
      status: record.status,
      sourceType: record.sourceType,
      sourceId: record.sourceId,
      title: record.title,
      bodyMarkdown: record.bodyMarkdown,
      adoptedCardId: record.adoptedCardId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      resolvedAt: record.resolvedAt,
    };
  }
}
