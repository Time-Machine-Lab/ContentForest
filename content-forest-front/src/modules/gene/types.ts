export type GeneEvidenceSourceType = 'fruit_selected' | 'fruit_eliminated' | 'publication' | 'feedback'
export type GeneEvidenceStrength = 'weak' | 'medium' | 'strong'
export type GeneReminderStatus = 'pending' | 'handled' | 'ignored'
export type GeneTaskStatus = 'running' | 'completed' | 'failed'
export type GeneSuggestionStatus = 'pending' | 'confirmed' | 'dismissed'
export type GeneInsightStatus = 'active' | 'archived'

export interface GeneEvidenceSource {
  sourceType: GeneEvidenceSourceType
  sourceId: string
  strength: GeneEvidenceStrength
}

export interface GeneLibrary {
  seedId: string
  contentLocation: string
  createdAt: string
  updatedAt: string
}

export interface GeneExtractionReminder {
  id: string
  seedId: string
  status: GeneReminderStatus
  evidenceSources: GeneEvidenceSource[]
  createdAt: string
  updatedAt: string
}

export interface GeneExtractionTask {
  id: string
  seedId: string
  status: GeneTaskStatus
  failureReason?: string | null
  evidenceSources: GeneEvidenceSource[]
  createdAt: string
  updatedAt: string
}

export interface GeneSuggestion {
  id: string
  seedId: string
  taskId: string
  status: GeneSuggestionStatus
  title: string
  bodyMarkdown: string
  lineage: string
  niche: string
  evidenceSources: GeneEvidenceSource[]
  createdAt: string
  updatedAt: string
}

export interface GeneInsightSummary {
  id: string
  seedId: string
  status: GeneInsightStatus
  title: string
  lineage: string
  niche: string
  contentLocation: string
  evidenceSources: GeneEvidenceSource[]
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export interface GeneInsightDetail extends GeneInsightSummary {
  bodyMarkdown: string
}

export interface StartGeneExtractionTaskRequest {
  reminderId?: string
  evidenceSources: GeneEvidenceSource[]
}

export interface GeneExtractionTaskResult {
  task: GeneExtractionTask
  suggestions: GeneSuggestion[]
}

export interface EditGeneSuggestionRequest {
  title: string
  bodyMarkdown: string
  lineage?: string
  niche?: string
}

export interface ConfirmGeneSuggestionRequest {
  title?: string
  bodyMarkdown?: string
  lineage?: string
  niche?: string
}

export interface EditGeneInsightRequest {
  bodyMarkdown: string
}

export interface ApiErrorResponse {
  code: string
  message: string
}
