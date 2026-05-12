import {
  NUTRIENT_ARCHIVE_STATES,
  NUTRIENT_LIBRARY_SCOPES,
} from "../../modules/nutrient/domain/nutrient-types.js";
import type {
  NutrientCardListFilter,
  NutrientCardRecord,
  NutrientDepositableBlockRecord,
  NutrientContentListFilter,
  NutrientContentRecord,
  NutrientGapSuggestionListFilter,
  NutrientGapSuggestionRecord,
  NutrientLibraryListFilter,
  NutrientLibraryRecord,
  NutrientCardMergeRecord,
  NutrientResearchMessageRecord,
  NutrientResearchSessionRecord,
  NutrientStoragePort,
  NutrientUsageRecord,
  ReferableNutrientContentRecord,
} from "../ports/nutrient-storage-port.js";
import type { NutrientUsageResourceType } from "../../modules/nutrient/domain/nutrient-types.js";

export class InMemoryNutrientStorageAdapter implements NutrientStoragePort {
  private readonly libraries = new Map<string, NutrientLibraryRecord>();
  private readonly contents = new Map<string, NutrientContentRecord>();
  private readonly cards = new Map<string, NutrientCardRecord>();
  private readonly researchSessions = new Map<string, NutrientResearchSessionRecord>();
  private readonly researchMessages = new Map<string, NutrientResearchMessageRecord>();
  private readonly depositableBlocks = new Map<string, NutrientDepositableBlockRecord>();
  private readonly gapSuggestions = new Map<string, NutrientGapSuggestionRecord>();
  private readonly usageRecords = new Map<string, NutrientUsageRecord>();
  private readonly mergeRecords = new Map<string, NutrientCardMergeRecord>();

  public async createLibrary(record: NutrientLibraryRecord): Promise<void> {
    this.libraries.set(record.id, { ...record });
  }

  public async findLibraryById(
    libraryId: string,
  ): Promise<NutrientLibraryRecord | null> {
    const record = this.libraries.get(libraryId);
    return record === undefined ? null : { ...record };
  }

  public async saveLibrary(record: NutrientLibraryRecord): Promise<void> {
    this.libraries.set(record.id, { ...record });
  }

  public async listLibraries(
    filter: NutrientLibraryListFilter = {},
  ): Promise<NutrientLibraryRecord[]> {
    return [...this.libraries.values()]
      .filter((record) => filter.scope === undefined || record.scope === filter.scope)
      .filter(
        (record) =>
          filter.archiveState === undefined ||
          record.archiveState === filter.archiveState,
      )
      .filter((record) => filter.seedId === undefined || record.seedId === filter.seedId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => ({ ...record }));
  }

  public async countContentsByLibrary(libraryId: string): Promise<number> {
    return [...this.contents.values()].filter(
      (record) => record.libraryId === libraryId,
    ).length;
  }

  public async createContent(record: NutrientContentRecord): Promise<void> {
    this.contents.set(record.id, { ...record });
  }

  public async findContentById(
    contentId: string,
  ): Promise<NutrientContentRecord | null> {
    const record = this.contents.get(contentId);
    return record === undefined ? null : { ...record };
  }

  public async saveContent(record: NutrientContentRecord): Promise<void> {
    this.contents.set(record.id, { ...record });
  }

  public async listContentsByLibrary(
    libraryId: string,
    filter: NutrientContentListFilter = {},
  ): Promise<NutrientContentRecord[]> {
    return [...this.contents.values()]
      .filter((record) => record.libraryId === libraryId)
      .filter(
        (record) =>
          filter.archiveState === undefined ||
          record.archiveState === filter.archiveState,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => ({ ...record }));
  }

  public async listReferableContents(
    seedId: string,
  ): Promise<ReferableNutrientContentRecord[]> {
    return [...this.contents.values()]
      .flatMap((content) => {
        const library = this.libraries.get(content.libraryId);
        if (library === undefined) {
          return [];
        }
        const libraryReferable =
          library.archiveState === NUTRIENT_ARCHIVE_STATES.active &&
          (library.scope === NUTRIENT_LIBRARY_SCOPES.public ||
            library.seedId === seedId);
        if (
          !libraryReferable ||
          content.archiveState !== NUTRIENT_ARCHIVE_STATES.active ||
          this.isBlockedByArchivedCard(content.id)
        ) {
          return [];
        }
        return [{
          content: { ...content },
          library: { ...library },
          defaultForGrowth: this.isDefaultForGrowth(content.id),
        }];
      })
      .sort((left, right) =>
        right.content.updatedAt.localeCompare(left.content.updatedAt),
      );
  }

  public async createCard(record: NutrientCardRecord): Promise<void> {
    this.cards.set(record.id, { ...record });
  }

  public async findCardById(cardId: string): Promise<NutrientCardRecord | null> {
    const record = this.cards.get(cardId);
    return record === undefined ? null : { ...record };
  }

  public async saveCard(record: NutrientCardRecord): Promise<void> {
    this.cards.set(record.id, { ...record });
  }

  public async listCardsBySeed(
    seedId: string,
    filter: NutrientCardListFilter = {},
  ): Promise<NutrientCardRecord[]> {
    return [...this.cards.values()]
      .filter((record) => record.seedId === seedId)
      .filter((record) => filter.status === undefined || record.status === filter.status)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => ({ ...record }));
  }

  public async findCardsBySettledContentIds(
    contentIds: string[],
  ): Promise<NutrientCardRecord[]> {
    const contentIdSet = new Set(contentIds);
    return [...this.cards.values()]
      .filter(
        (record) =>
          record.settledContentId !== null &&
          contentIdSet.has(record.settledContentId),
      )
      .map((record) => ({ ...record }));
  }

  private isDefaultForGrowth(contentId: string): boolean {
    return [...this.cards.values()].some(
      (card) =>
        card.settledContentId === contentId &&
        card.defaultForGrowth &&
        card.status !== "archived",
    );
  }

  private isBlockedByArchivedCard(contentId: string): boolean {
    return [...this.cards.values()].some(
      (card) => card.settledContentId === contentId && card.status === "archived",
    );
  }

  public async createResearchSession(
    record: NutrientResearchSessionRecord,
  ): Promise<void> {
    this.researchSessions.set(record.id, { ...record });
  }

  public async findResearchSessionById(
    sessionId: string,
  ): Promise<NutrientResearchSessionRecord | null> {
    const record = this.researchSessions.get(sessionId);
    return record === undefined ? null : { ...record };
  }

  public async saveResearchSession(
    record: NutrientResearchSessionRecord,
  ): Promise<void> {
    this.researchSessions.set(record.id, { ...record });
  }

  public async findResearchSessionByCardId(
    cardId: string,
  ): Promise<NutrientResearchSessionRecord | null> {
    const record = [...this.researchSessions.values()]
      .filter((session) => session.nutrientCardId === cardId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    return record === undefined ? null : { ...record };
  }

  public async createResearchMessage(
    record: NutrientResearchMessageRecord,
  ): Promise<void> {
    this.researchMessages.set(record.id, this.cloneMessage(record));
  }

  public async listResearchMessagesBySession(
    sessionId: string,
  ): Promise<NutrientResearchMessageRecord[]> {
    return [...this.researchMessages.values()]
      .filter((record) => record.sessionId === sessionId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((record) => this.cloneMessage(record));
  }

  public async createDepositableBlock(
    record: NutrientDepositableBlockRecord,
  ): Promise<void> {
    this.depositableBlocks.set(record.id, { ...record });
  }

  public async listDepositableBlocksBySession(
    sessionId: string,
  ): Promise<NutrientDepositableBlockRecord[]> {
    return [...this.depositableBlocks.values()]
      .filter((record) => record.sessionId === sessionId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((record) => ({ ...record }));
  }

  public async createGapSuggestion(
    record: NutrientGapSuggestionRecord,
  ): Promise<boolean> {
    const duplicate = [...this.gapSuggestions.values()].some(
      (item) => item.seedId === record.seedId && item.dedupeKey === record.dedupeKey,
    );
    if (duplicate) {
      return false;
    }
    this.gapSuggestions.set(record.id, { ...record });
    return true;
  }

  public async findGapSuggestionById(
    suggestionId: string,
  ): Promise<NutrientGapSuggestionRecord | null> {
    const record = this.gapSuggestions.get(suggestionId);
    return record === undefined ? null : { ...record };
  }

  public async saveGapSuggestion(
    record: NutrientGapSuggestionRecord,
  ): Promise<void> {
    this.gapSuggestions.set(record.id, { ...record });
  }

  public async listGapSuggestionsBySeed(
    seedId: string,
    filter: NutrientGapSuggestionListFilter = {},
  ): Promise<NutrientGapSuggestionRecord[]> {
    return [...this.gapSuggestions.values()]
      .filter((record) => record.seedId === seedId)
      .filter((record) => filter.status === undefined || record.status === filter.status)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => ({ ...record }));
  }

  public async countGapSuggestionsBySeed(
    seedId: string,
    filter: NutrientGapSuggestionListFilter = {},
  ): Promise<number> {
    return (await this.listGapSuggestionsBySeed(seedId, filter)).length;
  }

  public async createUsageRecord(record: NutrientUsageRecord): Promise<void> {
    this.usageRecords.set(record.id, { ...record });
  }

  public async listUsageRecordsByResource(
    resourceType: NutrientUsageResourceType,
    resourceId: string,
  ): Promise<NutrientUsageRecord[]> {
    return [...this.usageRecords.values()]
      .filter(
        (record) =>
          record.resourceType === resourceType && record.resourceId === resourceId,
      )
      .sort((left, right) => right.usedAt.localeCompare(left.usedAt))
      .map((record) => ({ ...record }));
  }

  public async createCardMergeRecord(
    record: NutrientCardMergeRecord,
  ): Promise<void> {
    this.mergeRecords.set(record.id, { ...record });
  }

  public async listCardMergeRecordsByTarget(
    cardId: string,
  ): Promise<NutrientCardMergeRecord[]> {
    return [...this.mergeRecords.values()]
      .filter((record) => record.targetCardId === cardId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((record) => ({ ...record }));
  }

  private cloneMessage(
    record: NutrientResearchMessageRecord,
  ): NutrientResearchMessageRecord {
    return {
      ...record,
      trace: record.trace.map((event) => ({ ...event })),
    };
  }
}
