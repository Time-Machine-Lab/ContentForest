import {
  NUTRIENT_ARCHIVE_STATES,
  NUTRIENT_LIBRARY_SCOPES,
} from "../../modules/nutrient/domain/nutrient-types.js";
import type {
  NutrientCardListFilter,
  NutrientCardRecord,
  NutrientContentListFilter,
  NutrientContentRecord,
  NutrientLibraryListFilter,
  NutrientLibraryRecord,
  NutrientStoragePort,
  ReferableNutrientContentRecord,
} from "../ports/nutrient-storage-port.js";

export class InMemoryNutrientStorageAdapter implements NutrientStoragePort {
  private readonly libraries = new Map<string, NutrientLibraryRecord>();
  private readonly contents = new Map<string, NutrientContentRecord>();
  private readonly cards = new Map<string, NutrientCardRecord>();

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
}
