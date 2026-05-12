export const NUTRIENT_LIBRARY_SCOPES = {
  public: "public",
  seedScoped: "seed_scoped",
} as const;

export type NutrientLibraryScope =
  (typeof NUTRIENT_LIBRARY_SCOPES)[keyof typeof NUTRIENT_LIBRARY_SCOPES];

export const NUTRIENT_ARCHIVE_STATES = {
  active: "active",
  archived: "archived",
} as const;

export type NutrientArchiveState =
  (typeof NUTRIENT_ARCHIVE_STATES)[keyof typeof NUTRIENT_ARCHIVE_STATES];

export const NUTRIENT_CARD_STATUSES = {
  unsettled: "unsettled",
  settled: "settled",
  archived: "archived",
} as const;

export type NutrientCardStatus =
  (typeof NUTRIENT_CARD_STATUSES)[keyof typeof NUTRIENT_CARD_STATUSES];

export interface NutrientLibrarySummary {
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

export interface NutrientLibraryDetail extends NutrientLibrarySummary {
  contentCount: number;
}

export interface NutrientContentSummary {
  id: string;
  libraryId: string;
  title: string;
  archiveState: NutrientArchiveState;
  contentLocation: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface NutrientContentDetail extends NutrientContentSummary {
  markdown: string;
}

export interface NutrientCardSummary {
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

export interface NutrientCardDetail extends NutrientCardSummary {
  markdown: string;
}

export interface ReferableNutrientContent extends NutrientContentSummary {
  defaultForGrowth: boolean;
  library: {
    id: string;
    name: string;
    scope: NutrientLibraryScope;
    seedId: string | null;
  };
}
