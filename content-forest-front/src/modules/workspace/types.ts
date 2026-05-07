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

export interface WorkspaceSnapshot {
  seed: WorkspaceSeedSummary
  workspaceReadOnly: boolean
  nodes: WorkspaceNode[]
  edges: WorkspaceEdge[]
  resources: WorkspaceResources
}

export interface ApiErrorResponse {
  code: string
  message: string
}
