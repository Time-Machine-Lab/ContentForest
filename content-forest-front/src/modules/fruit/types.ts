export type FruitSelectionState = 'candidate' | 'selected' | 'eliminated'
export type FruitNodeType = 'seed' | 'fruit'
export type FruitMediaType = 'image' | 'video'
export type FruitMediaDisplayRole = 'primary' | 'inline' | 'reference' | 'attachment'

export interface FruitParentNodeRef {
  nodeId: string
  nodeType: FruitNodeType
}

export interface FruitMediaSummary {
  id: string
  mediaType: FruitMediaType
  mimeType: string
  fileName: string
  sizeBytes: number
  contentUrl: string
}

export interface FruitMediaAttachment extends FruitMediaSummary {
  displayRole: FruitMediaDisplayRole
  sortOrder: number
}

export interface FruitSummary {
  id: string
  selectionState: FruitSelectionState
  parentNodeRef: FruitParentNodeRef
  contentLocation: string
  generatorId: string | null
  summary: string
  geneTags: string[]
  media: FruitMediaAttachment[]
  createdAt: string
  updatedAt: string
}

export interface FruitDetail extends FruitSummary {
  markdown: string
}

export interface UpdateFruitContentRequest {
  markdown: string
}

export interface ApiErrorResponse {
  code: string
  message: string
}
