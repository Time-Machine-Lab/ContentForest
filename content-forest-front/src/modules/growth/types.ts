export type GrowthNodeType = 'seed' | 'fruit'
export type GrowthResourceType = 'nutrient' | 'gene'
export type GrowthTemporaryResourceType = 'nutrient_card'
export type GrowthTaskStatus = 'running' | 'completed' | 'failed'
export type GrowthAttemptStatus = 'running' | 'succeeded' | 'failed'
export type GrowthSearchMode = 'broad_exploration' | 'directional_strengthening' | 'local_variation' | 'negative_feedback_avoidance'
export type GrowthMutationIntensity = 'conservative' | 'balanced' | 'aggressive'
export type GrowthPathStepStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface GrowthSourceNodeRef {
  nodeType: GrowthNodeType
  nodeId: string
}

export interface GrowthResourceRef {
  resourceType: GrowthResourceType
  resourceId: string
}

export interface GrowthTemporaryNutrientCardRef {
  resourceType: GrowthTemporaryResourceType
  resourceId: string
}

export interface StartGrowthTaskRequest {
  seedId: string
  sourceNodeRef: GrowthSourceNodeRef
  userInput?: string
  generatorId: string
  fruitCount?: number
  nutrientRefs?: GrowthResourceRef[]
  temporaryNutrientCardRefs?: GrowthTemporaryNutrientCardRef[]
  geneRefs?: GrowthResourceRef[]
  detailParams?: Record<string, unknown>
  searchMode?: GrowthSearchMode
  mutationIntensity?: GrowthMutationIntensity
}

export interface GrowthPipelineParams {
  searchMode: GrowthSearchMode
  mutationIntensity: GrowthMutationIntensity
  recommendationReason: string
}

export interface GrowthMutationPlan {
  direction: string
  intent: string
  intensity: GrowthMutationIntensity
  hypothesis: string
  inherit?: string[]
  avoid?: string[]
  evidenceSummary?: string
}

export interface GrowthPathStep {
  id: string
  parentId?: string | null
  attemptId?: string | null
  label: string
  status: GrowthPathStepStatus
  detail?: string | null
  updatedAt?: string | null
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
  mutationPlan: GrowthMutationPlan
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
  temporaryNutrientCardRefs: GrowthTemporaryNutrientCardRef[]
  geneRefs: GrowthResourceRef[]
  successfulFruitIds: string[]
  pipelineParams: GrowthPipelineParams
  pathGraph: GrowthPathStep[]
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
  temporaryNutrientCardRefs: GrowthTemporaryNutrientCardRef[]
  geneRefs: GrowthResourceRef[]
  detailParams?: Record<string, unknown>
  pipelineParams: GrowthPipelineParams
  failureReason: string
  updatedAt: string
}

export interface ApiErrorResponse {
  code: string
  message: string
}
