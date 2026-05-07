export type NutrientArchiveState = 'active' | 'archived'
export type NutrientLibraryScope = 'public' | 'seed_scoped'

export interface CreateNutrientLibraryRequest {
  name: string
  description?: string
  scope: NutrientLibraryScope
  seedId?: string | null
}

export interface UpdateNutrientLibraryRequest {
  name?: string
  description?: string
}

export interface CreateNutrientContentRequest {
  title: string
  markdown: string
}

export interface UpdateNutrientContentRequest {
  title?: string
  markdown?: string
}

export interface NutrientLibrarySummary {
  id: string
  name: string
  description: string
  scope: NutrientLibraryScope
  seedId: string | null
  archiveState: NutrientArchiveState
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export interface NutrientLibraryDetail extends NutrientLibrarySummary {
  contentCount: number
}

export interface NutrientContentSummary {
  id: string
  libraryId: string
  title: string
  archiveState: NutrientArchiveState
  contentLocation: string
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export interface NutrientContentDetail extends NutrientContentSummary {
  markdown: string
}

export interface ReferableNutrientContent extends NutrientContentSummary {
  library: {
    id: string
    name: string
    scope: NutrientLibraryScope
    seedId: string | null
  }
}

export interface NutrientLibraryListQuery {
  scope?: NutrientLibraryScope
  archiveState?: NutrientArchiveState
  seedId?: string
}

export interface NutrientContentListQuery {
  archiveState?: NutrientArchiveState
}

export interface ApiErrorResponse {
  code: string
  message: string
}
