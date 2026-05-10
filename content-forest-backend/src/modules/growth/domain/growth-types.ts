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

export interface GrowthResourceRef {
  resourceType: GrowthResourceType;
  resourceId: string;
}

export interface GrowthTaskInput {
  seedId: string;
  sourceNodeRef: GrowthSourceNodeRef;
  userInput: string;
  generatorId: string;
  fruitCount: number;
  nutrientRefs: GrowthResourceRef[];
  geneRefs: GrowthResourceRef[];
  detailParams: Record<string, unknown>;
}

export interface GrowthAuthorizationScope {
  seedId: string;
  sourceNodeRef: GrowthSourceNodeRef;
  generatorId: string;
  nutrientRefs: GrowthResourceRef[];
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
  createdAt: string;
  updatedAt: string;
}

export interface GrowthTaskDetail extends GrowthTaskSummary {
  attempts: GrowthAttempt[];
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
