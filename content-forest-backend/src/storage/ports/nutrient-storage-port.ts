import type {
  NutrientArchiveState,
  NutrientCardStatus,
  NutrientGapSuggestionSourceType,
  NutrientGapSuggestionStatus,
  NutrientLibraryScope,
  NutrientReferenceUsageStatus,
  NutrientResearchMessageRole,
  NutrientUsageResourceType,
} from "../../modules/nutrient/domain/nutrient-types.js";

export interface NutrientLibraryRecord {
  id: string;
  name: string;
  description: string;
  scope: NutrientLibraryScope;
  seedId: string | null;
  archiveState: NutrientArchiveState;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface NutrientContentRecord {
  id: string;
  libraryId: string;
  title: string;
  archiveState: NutrientArchiveState;
  contentLocation: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface NutrientCardRecord {
  id: string;
  seedId: string;
  title: string;
  status: NutrientCardStatus;
  contentLocation: string;
  settledContentId: string | null;
  defaultForGrowth: boolean;
  lastResearchedAt: string | null;
  lastReferencedAt: string | null;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  archivedAt: string | null;
}

export interface NutrientResearchSessionRecord {
  id: string;
  seedId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface NutrientResearchMessageRecord {
  id: string;
  sessionId: string;
  role: NutrientResearchMessageRole;
  content: string;
  agentTaskId: string | null;
  trace: Record<string, unknown>[];
  failureReason: string | null;
  createdAt: string;
}

export interface NutrientDepositableBlockRecord {
  id: string;
  sessionId: string;
  messageId: string;
  title: string;
  markdown: string;
  createdAt: string;
}

export interface NutrientGapSuggestionRecord {
  id: string;
  seedId: string;
  status: NutrientGapSuggestionStatus;
  sourceType: NutrientGapSuggestionSourceType;
  sourceId: string | null;
  title: string;
  bodyMarkdown: string;
  dedupeKey: string;
  adoptedCardId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface NutrientUsageRecord {
  id: string;
  seedId: string;
  resourceType: NutrientUsageResourceType;
  resourceId: string;
  growthTaskId: string;
  growthAttemptId: string;
  fruitId: string;
  usageStatus: NutrientReferenceUsageStatus;
  referenceSummary: Record<string, unknown> | null;
  usedAt: string;
  createdAt: string;
}

export interface NutrientCardMergeRecord {
  id: string;
  seedId: string;
  sourceCardId: string | null;
  targetCardId: string;
  sourceTitle: string;
  sourceContentLocation: string | null;
  mergeNote: string;
  mergedAt: string;
  createdAt: string;
}

export interface NutrientLibraryListFilter {
  scope?: NutrientLibraryScope;
  archiveState?: NutrientArchiveState;
  seedId?: string;
}

export interface NutrientContentListFilter {
  archiveState?: NutrientArchiveState;
}

export interface NutrientCardListFilter {
  status?: NutrientCardStatus;
}

export interface NutrientGapSuggestionListFilter {
  status?: NutrientGapSuggestionStatus;
}

export interface ReferableNutrientContentRecord {
  content: NutrientContentRecord;
  library: NutrientLibraryRecord;
  defaultForGrowth: boolean;
}

export interface NutrientStoragePort {
  createLibrary(record: NutrientLibraryRecord): Promise<void>;
  findLibraryById(libraryId: string): Promise<NutrientLibraryRecord | null>;
  saveLibrary(record: NutrientLibraryRecord): Promise<void>;
  listLibraries(filter?: NutrientLibraryListFilter): Promise<NutrientLibraryRecord[]>;
  countContentsByLibrary(libraryId: string): Promise<number>;

  createContent(record: NutrientContentRecord): Promise<void>;
  findContentById(contentId: string): Promise<NutrientContentRecord | null>;
  saveContent(record: NutrientContentRecord): Promise<void>;
  listContentsByLibrary(
    libraryId: string,
    filter?: NutrientContentListFilter,
  ): Promise<NutrientContentRecord[]>;
  listReferableContents(seedId: string): Promise<ReferableNutrientContentRecord[]>;

  createCard(record: NutrientCardRecord): Promise<void>;
  findCardById(cardId: string): Promise<NutrientCardRecord | null>;
  saveCard(record: NutrientCardRecord): Promise<void>;
  deleteCard(cardId: string): Promise<void>;
  listCardsBySeed(
    seedId: string,
    filter?: NutrientCardListFilter,
  ): Promise<NutrientCardRecord[]>;
  findCardsBySettledContentIds(
    contentIds: string[],
  ): Promise<NutrientCardRecord[]>;

  createResearchSession(record: NutrientResearchSessionRecord): Promise<void>;
  findResearchSessionById(
    sessionId: string,
  ): Promise<NutrientResearchSessionRecord | null>;
  saveResearchSession(record: NutrientResearchSessionRecord): Promise<void>;
  deleteResearchSession(sessionId: string): Promise<void>;
  listResearchSessionsBySeed(
    seedId: string,
  ): Promise<NutrientResearchSessionRecord[]>;

  createResearchMessage(record: NutrientResearchMessageRecord): Promise<void>;
  listResearchMessagesBySession(
    sessionId: string,
  ): Promise<NutrientResearchMessageRecord[]>;

  createDepositableBlock(record: NutrientDepositableBlockRecord): Promise<void>;
  listDepositableBlocksBySession(
    sessionId: string,
  ): Promise<NutrientDepositableBlockRecord[]>;

  createGapSuggestion(record: NutrientGapSuggestionRecord): Promise<boolean>;
  findGapSuggestionById(
    suggestionId: string,
  ): Promise<NutrientGapSuggestionRecord | null>;
  saveGapSuggestion(record: NutrientGapSuggestionRecord): Promise<void>;
  listGapSuggestionsBySeed(
    seedId: string,
    filter?: NutrientGapSuggestionListFilter,
  ): Promise<NutrientGapSuggestionRecord[]>;
  countGapSuggestionsBySeed(
    seedId: string,
    filter?: NutrientGapSuggestionListFilter,
  ): Promise<number>;

  createUsageRecord(record: NutrientUsageRecord): Promise<void>;
  listUsageRecordsByResource(
    resourceType: NutrientUsageResourceType,
    resourceId: string,
  ): Promise<NutrientUsageRecord[]>;

  createCardMergeRecord(record: NutrientCardMergeRecord): Promise<void>;
  listCardMergeRecordsByTarget(cardId: string): Promise<NutrientCardMergeRecord[]>;
}
