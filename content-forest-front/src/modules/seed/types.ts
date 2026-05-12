export type SeedArchiveState = 'active' | 'archived'

export interface CreateSeedRequest {
  title: string
  markdown: string
}

export interface UpdateSeedRequest {
  title?: string
  markdown?: string
}

export interface SeedSummary {
  id: string
  title: string
  archiveState: SeedArchiveState
  rootNodeId: string
  contentLocation: string
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export interface SeedDetail extends SeedSummary {
  markdown: string
}

export interface SeedBriefSummary {
  seedId: string
  hasBrief: boolean
  id: string | null
  contentLocation: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface SeedBriefDetail extends SeedBriefSummary {
  markdown: string
}

export interface UpdateSeedBriefRequest {
  markdown: string
}

export interface SeedRootNode {
  seedId: string
  nodeId: string
  nodeType: 'seed'
  workspaceReadOnly: boolean
}

export interface GrowthEligibility {
  seedId: string
  canGrow: boolean
  workspaceReadOnly: boolean
  reason?: string | null
}

export interface ApiErrorResponse {
  code: string
  message: string
}
