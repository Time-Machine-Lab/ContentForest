import type {
  NutrientArchiveState,
  NutrientCardStatus,
  NutrientLibraryScope,
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
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  archivedAt: string | null;
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
  listCardsBySeed(
    seedId: string,
    filter?: NutrientCardListFilter,
  ): Promise<NutrientCardRecord[]>;
  findCardsBySettledContentIds(
    contentIds: string[],
  ): Promise<NutrientCardRecord[]>;
}
