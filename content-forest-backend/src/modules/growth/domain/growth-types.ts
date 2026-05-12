import type { ParentNodeRef } from "../../fruit/domain/fruit-types.js";

export const GROWTH_TASK_STATUSES = {
  running: "running",
  completed: "completed",
  failed: "failed",
} as const;

export type GrowthTaskStatus =
  (typeof GROWTH_TASK_STATUSES)[keyof typeof GROWTH_TASK_STATUSES];

export const GROWTH_ATTEMPT_STATUSES = {
  running: "running",
  succeeded: "succeeded",
  failed: "failed",
} as const;

export type GrowthAttemptStatus =
  (typeof GROWTH_ATTEMPT_STATUSES)[keyof typeof GROWTH_ATTEMPT_STATUSES];

export type GrowthSourceNodeRef = ParentNodeRef;

export type GrowthResourceType = "nutrient" | "gene";
export type GrowthTemporaryResourceType = "nutrient_card";

export const GROWTH_SEARCH_MODES = {
  broadExploration: "broad_exploration",
  directionalStrengthening: "directional_strengthening",
  localVariation: "local_variation",
  negativeFeedbackAvoidance: "negative_feedback_avoidance",
} as const;

export type GrowthSearchMode =
  (typeof GROWTH_SEARCH_MODES)[keyof typeof GROWTH_SEARCH_MODES];

export const GROWTH_MUTATION_INTENSITIES = {
  conservative: "conservative",
  balanced: "balanced",
  aggressive: "aggressive",
} as const;

export type GrowthMutationIntensity =
  (typeof GROWTH_MUTATION_INTENSITIES)[keyof typeof GROWTH_MUTATION_INTENSITIES];

export const GROWTH_PATH_STEP_STATUSES = {
  pending: "pending",
  running: "running",
  completed: "completed",
  failed: "failed",
} as const;

export type GrowthPathStepStatus =
  (typeof GROWTH_PATH_STEP_STATUSES)[keyof typeof GROWTH_PATH_STEP_STATUSES];

export interface GrowthResourceRef {
  resourceType: GrowthResourceType;
  resourceId: string;
}

export interface GrowthTemporaryNutrientCardRef {
  resourceType: GrowthTemporaryResourceType;
  resourceId: string;
}

export interface GrowthPipelineParams {
  searchMode: GrowthSearchMode;
  mutationIntensity: GrowthMutationIntensity;
  recommendationReason: string;
}

export interface GrowthMutationPlan {
  direction: string;
  intent: string;
  intensity: GrowthMutationIntensity;
  hypothesis: string;
  inherit: string[];
  avoid: string[];
  evidenceSummary: string;
}

export interface GrowthPathStep {
  id: string;
  parentId: string | null;
  attemptId: string | null;
  label: string;
  status: GrowthPathStepStatus;
  detail: string | null;
  updatedAt: string | null;
}

export interface GrowthTaskInput {
  seedId: string;
  sourceNodeRef: GrowthSourceNodeRef;
  userInput: string;
  generatorId: string;
  fruitCount: number;
  nutrientRefs: GrowthResourceRef[];
  temporaryNutrientCardRefs: GrowthTemporaryNutrientCardRef[];
  geneRefs: GrowthResourceRef[];
  detailParams: Record<string, unknown>;
  pipelineParams: GrowthPipelineParams;
}

export interface GrowthAuthorizationScope {
  seedId: string;
  sourceNodeRef: GrowthSourceNodeRef;
  generatorId: string;
  nutrientRefs: GrowthResourceRef[];
  temporaryNutrientCardRefs: GrowthTemporaryNutrientCardRef[];
  geneRefs: GrowthResourceRef[];
}

export interface GrowthTaskSummary extends GrowthTaskInput {
  id: string;
  status: GrowthTaskStatus;
  authorizationScope: GrowthAuthorizationScope;
  agentInput: Record<string, unknown>;
  successfulFruitIds: string[];
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface GrowthAttempt {
  id: string;
  taskId: string;
  attemptIndex: number;
  status: GrowthAttemptStatus;
  agentTaskId: string | null;
  fruitId: string | null;
  failureReason: string | null;
  agentOutput: Record<string, unknown>;
  mutationPlan: GrowthMutationPlan;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthTaskDetail extends GrowthTaskSummary {
  attempts: GrowthAttempt[];
  pathGraph: GrowthPathStep[];
}

export interface GrowthTaskResult {
  task: GrowthTaskDetail;
}

export interface GrowthSourceStatus {
  sourceNodeRef: GrowthSourceNodeRef;
  isGrowing: boolean;
  taskId: string | null;
}

export interface GrowthFailedInput extends GrowthTaskInput {
  taskId: string;
  failureReason: string;
  updatedAt: string;
}

export interface BranchGrowthAgentInput {
  seedId: string;
  growthTaskId: string;
  attemptId: string;
  attemptIndex: number;
  sourceNodeRef: GrowthSourceNodeRef;
  userInput: string;
  generatorRef: {
    generatorId: string;
  };
  authorizationScope: GrowthAuthorizationScope;
  detailParams: Record<string, unknown>;
  roundGrowthBrief: Record<string, unknown>;
  searchMode: GrowthSearchMode;
  mutationIntensity: GrowthMutationIntensity;
  mutationPlan: GrowthMutationPlan;
  target: {
    fruitCount: 1;
    totalFruitCount?: number;
  };
}

export interface BranchGrowthAgentCandidate {
  markdown: string;
  summary?: string;
  geneTags?: string[];
}
