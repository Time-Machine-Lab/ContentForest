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

export const NUTRIENT_GAP_SUGGESTION_STATUSES = {
  pending: "pending",
  adopted: "adopted",
  ignored: "ignored",
} as const;

export type NutrientGapSuggestionStatus =
  (typeof NUTRIENT_GAP_SUGGESTION_STATUSES)[keyof typeof NUTRIENT_GAP_SUGGESTION_STATUSES];

export const NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES = {
  seedBriefGap: "seed_brief_gap",
  growthInputGap: "growth_input_gap",
  fruitElimination: "fruit_elimination",
  growthFailure: "growth_failure",
  manual: "manual",
} as const;

export type NutrientGapSuggestionSourceType =
  (typeof NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES)[keyof typeof NUTRIENT_GAP_SUGGESTION_SOURCE_TYPES];

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

export type NutrientResearchMessageRole = "user" | "assistant";

export interface NutrientResearchMessage {
  id: string;
  sessionId: string;
  role: NutrientResearchMessageRole;
  content: string;
  agentTaskId: string | null;
  trace: Record<string, unknown>[];
  failureReason: string | null;
  createdAt: string;
}

export interface NutrientDepositableBlock {
  id: string;
  sessionId: string;
  messageId: string;
  title: string;
  markdown: string;
  createdAt: string;
}

export interface NutrientResearchSessionSummary {
  id: string;
  seedId: string;
  nutrientCardId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface NutrientResearchSessionDetail extends NutrientResearchSessionSummary {
  messages: NutrientResearchMessage[];
  depositableBlocks: NutrientDepositableBlock[];
}

export interface NutrientGapSuggestion {
  id: string;
  seedId: string;
  status: NutrientGapSuggestionStatus;
  sourceType: NutrientGapSuggestionSourceType;
  sourceId: string | null;
  title: string;
  bodyMarkdown: string;
  adoptedCardId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AdoptNutrientGapSuggestionResult {
  suggestion: NutrientGapSuggestion;
  nutrientCard: NutrientCardDetail;
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
