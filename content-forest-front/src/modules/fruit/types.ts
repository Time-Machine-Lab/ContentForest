export type FruitSelectionState = 'candidate' | 'selected' | 'eliminated'
export type FruitNodeType = 'seed' | 'fruit'

export interface FruitParentNodeRef {
  nodeId: string
  nodeType: FruitNodeType
}

export interface FruitSummary {
  id: string
  selectionState: FruitSelectionState
  parentNodeRef: FruitParentNodeRef
  contentLocation: string
  generatorId: string | null
  summary: string
  geneTags: string[]
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
