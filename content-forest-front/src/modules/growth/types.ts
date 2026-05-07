export type GrowthNodeType = 'seed' | 'fruit'
export type GrowthResourceType = 'nutrient' | 'gene'
export type GrowthTaskStatus = 'running' | 'completed' | 'failed'
export type GrowthAttemptStatus = 'running' | 'succeeded' | 'failed'

export interface GrowthSourceNodeRef {
  nodeType: GrowthNodeType
  nodeId: string
}

export interface GrowthResourceRef {
  resourceType: GrowthResourceType
  resourceId: string
}

export interface StartGrowthTaskRequest {
  seedId: string
  sourceNodeRef: GrowthSourceNodeRef
  userInput?: string
  generatorId: string
  fruitCount?: number
  nutrientRefs?: GrowthResourceRef[]
  geneRefs?: GrowthResourceRef[]
  detailParams?: Record<string, unknown>
}

export interface GrowthAttempt {
  id: string
  taskId: string
  attemptIndex: number
  status: GrowthAttemptStatus
  agentTaskId?: string | null
  fruitId: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
}

export interface GrowthTaskDetail {
  id: string
  seedId: string
  sourceNodeRef: GrowthSourceNodeRef
  status: GrowthTaskStatus
  userInput?: string
  generatorId: string
  fruitCount: number
  nutrientRefs: GrowthResourceRef[]
  geneRefs: GrowthResourceRef[]
  successfulFruitIds: string[]
  failureReason: string | null
  attempts: GrowthAttempt[]
  createdAt: string
  updatedAt: string
  finishedAt?: string | null
}

export interface GrowthTaskResult {
  task: GrowthTaskDetail
}

export interface GrowthSourceStatus {
  sourceNodeRef: GrowthSourceNodeRef
  isGrowing: boolean
  taskId: string | null
}

export interface GrowthFailedInput {
  taskId: string
  seedId: string
  sourceNodeRef: GrowthSourceNodeRef
  userInput: string
  generatorId: string
  fruitCount: number
  nutrientRefs: GrowthResourceRef[]
  geneRefs: GrowthResourceRef[]
  detailParams?: Record<string, unknown>
  failureReason: string
  updatedAt: string
}

export interface ApiErrorResponse {
  code: string
  message: string
}
