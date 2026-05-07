import type { FruitSelectionState, ParentNodeRef } from "../../fruit/domain/fruit-types.js";
import type { GeneInsightSummary } from "../../gene/domain/gene-types.js";
import type { SelectableGenerator } from "../../generator/domain/generator-types.js";
import type { GrowthSourceStatus } from "../../growth/domain/growth-types.js";
import type { ReferableNutrientContent } from "../../nutrient/domain/nutrient-types.js";
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
  summary: string;
  geneTags: string[];
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
  geneInsights: GeneInsightSummary[];
}

export interface WorkspaceSnapshot {
  seed: WorkspaceSeedSummary;
  workspaceReadOnly: boolean;
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  resources: WorkspaceResources;
}
