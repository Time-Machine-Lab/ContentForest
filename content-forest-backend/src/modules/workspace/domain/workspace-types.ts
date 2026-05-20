import type { FruitSelectionState, ParentNodeRef } from "../../fruit/domain/fruit-types.js";
import type {
  GeneEvidenceSource,
  GeneExtractionReminder,
  GeneInsightSummary,
  GeneLibrary,
  GeneSuggestion,
} from "../../gene/domain/gene-types.js";
import type { SelectableGenerator } from "../../generator/domain/generator-types.js";
import type { GrowthSourceStatus } from "../../growth/domain/growth-types.js";
import type {
  FruitMediaAttachmentSummary,
  MediaAssetSummary,
} from "../../media/domain/media-types.js";
import type {
  NutrientGapSuggestion,
  ReferableNutrientContent,
} from "../../nutrient/domain/nutrient-types.js";
import type { SeedArchiveState } from "../../seed/domain/seed-types.js";

export type WorkspaceNodeType = "seed" | "fruit";

export interface WorkspaceNodeRef {
  nodeType: WorkspaceNodeType;
  nodeId: string;
}

export interface WorkspaceSeedSummary {
  id: string;
  title: string;
  archiveState: SeedArchiveState;
  contentLocation: string;
  rootNodeId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface WorkspaceSeedBriefSummary {
  seedId: string;
  hasBrief: boolean;
  id: string | null;
  contentLocation: string | null;
  updatedAt: string | null;
}

export interface WorkspaceFailedInputHint {
  hasFailedInput: boolean;
  taskId: string | null;
  failureReason: string | null;
  updatedAt: string | null;
}

export interface WorkspaceSeedNode {
  nodeType: "seed";
  nodeId: string;
  seedId: string;
  title: string;
  archiveState: SeedArchiveState;
  growth: GrowthSourceStatus;
  failedInput: WorkspaceFailedInputHint;
}

export interface WorkspaceFruitNode {
  nodeType: "fruit";
  nodeId: string;
  fruitId: string;
  selectionState: FruitSelectionState;
  parentNodeRef: ParentNodeRef;
  contentLocation: string;
  generatorId: string | null;
  summary: string;
  geneTags: string[];
  media: FruitMediaAttachmentSummary[];
  createdAt: string;
  updatedAt: string;
  growth: GrowthSourceStatus;
  failedInput: WorkspaceFailedInputHint;
}

export type WorkspaceNode = WorkspaceSeedNode | WorkspaceFruitNode;

export interface WorkspaceEdge {
  id: string;
  parentNodeRef: WorkspaceNodeRef;
  childNodeRef: WorkspaceNodeRef;
}

export interface WorkspaceResources {
  generators: SelectableGenerator[];
  nutrients: ReferableNutrientContent[];
  mediaAssets: MediaAssetSummary[];
  geneInsights: GeneInsightSummary[];
}

export type WorkspaceNutrientGapSuggestionSummary = NutrientGapSuggestion;

export interface WorkspaceNutrientSuggestionHub {
  seedId: string;
  pendingSuggestions: WorkspaceNutrientGapSuggestionSummary[];
  stats: {
    pendingSuggestionCount: number;
  };
  actions: {
    canReviewSuggestions: boolean;
    canOpenNutrientWorkbench: boolean;
  };
}

export interface WorkspaceGeneLibrarySummary {
  seedId: string;
  contentLocation: string;
  insightCount: number;
  referableInsightCount: number;
  updatedAt: string;
}

export interface WorkspaceGeneReminderSummary extends GeneExtractionReminder {
  runningTaskId: string | null;
}

export type WorkspaceGeneSuggestionSummary = Omit<GeneSuggestion, "bodyMarkdown">;

export interface WorkspaceGeneExtractionStats {
  pendingReminderCount: number;
  pendingSuggestionCount: number;
  insightCount: number;
  referableInsightCount: number;
}

export interface WorkspaceGeneExtractionActions {
  canStartExtraction: boolean;
  canReviewSuggestions: boolean;
  canOpenGeneLibrary: boolean;
}

export interface WorkspaceGeneExtractionHub {
  seedId: string;
  geneLibrary: WorkspaceGeneLibrarySummary;
  pendingReminders: WorkspaceGeneReminderSummary[];
  pendingSuggestions: WorkspaceGeneSuggestionSummary[];
  stats: WorkspaceGeneExtractionStats;
  actions: WorkspaceGeneExtractionActions;
}

export function toWorkspaceGeneLibrarySummary(
  library: GeneLibrary,
  insightCount: number,
  referableInsightCount: number,
): WorkspaceGeneLibrarySummary {
  return {
    seedId: library.seedId,
    contentLocation: library.contentLocation,
    insightCount,
    referableInsightCount,
    updatedAt: library.updatedAt,
  };
}

export function toWorkspaceGeneSuggestionSummary(
  suggestion: GeneSuggestion,
): WorkspaceGeneSuggestionSummary {
  return {
    id: suggestion.id,
    seedId: suggestion.seedId,
    taskId: suggestion.taskId,
    status: suggestion.status,
    title: suggestion.title,
    lineage: suggestion.lineage,
    niche: suggestion.niche,
    evidenceSources: suggestion.evidenceSources.map(
      (source): GeneEvidenceSource => ({ ...source }),
    ),
    createdAt: suggestion.createdAt,
    updatedAt: suggestion.updatedAt,
  };
}

export interface WorkspaceSnapshot {
  seed: WorkspaceSeedSummary;
  workspaceReadOnly: boolean;
  seedBrief: WorkspaceSeedBriefSummary;
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  resources: WorkspaceResources;
  nutrientSuggestionHub: WorkspaceNutrientSuggestionHub;
  geneExtractionHub: WorkspaceGeneExtractionHub;
}
