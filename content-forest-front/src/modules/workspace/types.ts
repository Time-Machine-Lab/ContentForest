export type WorkspaceNodeType = 'seed' | 'fruit'
export type WorkspaceArchiveState = 'active' | 'archived'
export type WorkspaceSelectionState = 'candidate' | 'selected' | 'eliminated'
export type WorkspaceNutrientScope = 'public' | 'seed_scoped'
export type WorkspaceGeneStatus = 'active' | 'archived'
export type WorkspaceEvidenceSourceType = 'fruit_selected' | 'fruit_eliminated' | 'publication' | 'feedback'
export type WorkspaceEvidenceStrength = 'weak' | 'medium' | 'strong'

export interface WorkspaceNodeRef {
  nodeType: WorkspaceNodeType
  nodeId: string
}

export interface WorkspaceNodeGrowth {
  isGrowing: boolean
  taskId: string | null
}

export interface WorkspaceFailedInputHint {
  hasFailedInput: boolean
  taskId: string | null
  failureReason: string | null
  updatedAt: string | null
}

export interface WorkspaceSeedSummary {
  id: string
  title: string
  archiveState: WorkspaceArchiveState
  rootNodeId: string
  contentLocation: string
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export interface WorkspaceSeedNode {
  nodeType: 'seed'
  nodeId: string
  seedId: string
  title: string
  archiveState: WorkspaceArchiveState
  growth: WorkspaceNodeGrowth
  failedInput: WorkspaceFailedInputHint
}

export interface WorkspaceFruitNode {
  nodeType: 'fruit'
  nodeId: string
  fruitId: string
  selectionState: WorkspaceSelectionState
  parentNodeRef: WorkspaceNodeRef
  contentLocation: string
  generatorId: string | null
  summary: string
  geneTags: string[]
  createdAt: string
  updatedAt: string
  growth: WorkspaceNodeGrowth
  failedInput: WorkspaceFailedInputHint
}

export type WorkspaceNode = WorkspaceSeedNode | WorkspaceFruitNode

export interface WorkspaceEdge {
  id: string
  parentNodeRef: WorkspaceNodeRef
  childNodeRef: WorkspaceNodeRef
}

export interface SelectableWorkspaceGenerator {
  id: string
  name: string
  description: string
  contentLocation: string
}

export interface ReferableWorkspaceNutrient {
  id: string
  libraryId: string
  title: string
  archiveState: WorkspaceArchiveState
  contentLocation: string
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  library: {
    id: string
    name: string
    scope: WorkspaceNutrientScope
    seedId: string | null
  }
}

export interface WorkspaceEvidenceSource {
  sourceType: WorkspaceEvidenceSourceType
  sourceId: string
  strength: WorkspaceEvidenceStrength
}

export interface ReferableWorkspaceGeneInsight {
  id: string
  seedId: string
  suggestionId: string | null
  status: WorkspaceGeneStatus
  title: string
  lineage: string
  niche: string
  contentLocation: string
  evidenceSources: WorkspaceEvidenceSource[]
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface WorkspaceResources {
  generators: SelectableWorkspaceGenerator[]
  nutrients: ReferableWorkspaceNutrient[]
  geneInsights: ReferableWorkspaceGeneInsight[]
}

export interface WorkspaceGeneLibrarySummary {
  seedId: string
  contentLocation: string
  insightCount: number
  referableInsightCount: number
  updatedAt: string
}

export interface WorkspaceGeneReminderSummary {
  id: string
  seedId: string
  status: 'pending'
  evidenceSources: WorkspaceEvidenceSource[]
  runningTaskId: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkspaceGeneSuggestionSummary {
  id: string
  seedId: string
  taskId: string
  status: 'pending'
  title: string
  lineage: string
  niche: string
  evidenceSources: WorkspaceEvidenceSource[]
  createdAt: string
  updatedAt: string
}

export interface WorkspaceGeneExtractionStats {
  pendingReminderCount: number
  pendingSuggestionCount: number
  insightCount: number
  referableInsightCount: number
}

export interface WorkspaceGeneExtractionActions {
  canStartExtraction: boolean
  canReviewSuggestions: boolean
  canOpenGeneLibrary: boolean
}

export interface WorkspaceGeneExtractionHub {
  seedId: string
  geneLibrary: WorkspaceGeneLibrarySummary
  pendingReminders: WorkspaceGeneReminderSummary[]
  pendingSuggestions: WorkspaceGeneSuggestionSummary[]
  stats: WorkspaceGeneExtractionStats
  actions: WorkspaceGeneExtractionActions
}

export interface WorkspaceSnapshot {
  seed: WorkspaceSeedSummary
  workspaceReadOnly: boolean
  nodes: WorkspaceNode[]
  edges: WorkspaceEdge[]
  resources: WorkspaceResources
  geneExtractionHub: WorkspaceGeneExtractionHub
}

export interface ApiErrorResponse {
  code: string
  message: string
}
