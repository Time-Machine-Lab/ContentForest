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
export type GrowthMediaResourceType = "media";

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

export interface GrowthMediaRef {
  resourceType: GrowthMediaResourceType;
  resourceId: string;
  usage: string;
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
  selectedRouteId?: string | null;
  selectedRoute?: ExplorationRoute;
  referencePlan?: ReferencePlan;
  referenceAtoms?: ReferenceAtom[];
  plannedReferenceUsage?: ReferenceUsageSummary[];
  actualReferenceUsage?: ReferenceUsageSummary[];
  mutationOperators?: MutationOperator[];
  platformInference?: PlatformInference;
  routeTrace?: RouteTraceSummary;
}

export type PlatformInferenceSource = "generator" | "user" | "system" | "fallback";
export type PlatformInferenceConfidence = "high" | "medium" | "low";

export interface PlatformInference {
  platforms: string[];
  contentForms: string[];
  source: PlatformInferenceSource;
  confidence: PlatformInferenceConfidence;
  evidenceSummary: string;
}

export interface MutationOperator {
  key: string;
  label: string;
  variable: string;
  action: string;
  radius: GrowthMutationIntensity;
}

export type ReferencePlanSourceType =
  | "user_input"
  | "generator"
  | "source_node"
  | "seed_brief"
  | "nutrient"
  | "formal_nutrient"
  | "temporary_nutrient_card"
  | "media"
  | "gene"
  | "feedback"
  | "research_context"
  | "system_context";

export type ReferencePlanRole =
  | "hard_constraint"
  | "intent_driver"
  | "evidence"
  | "candidate_evidence"
  | "inherit"
  | "strengthen"
  | "combine"
  | "mutate"
  | "avoid"
  | "context";

export interface ReferencePlanItem {
  sourceType: ReferencePlanSourceType;
  resourceId: string | null;
  role: ReferencePlanRole;
  usage: string;
  confidence: PlatformInferenceConfidence;
}

export type ReferenceAtomType =
  | "fact"
  | "audience_signal"
  | "platform_mechanic"
  | "case_pattern"
  | "language_asset"
  | "structure_template"
  | "visual_audio_asset"
  | "trend_signal"
  | "risk_constraint"
  | "counterexample"
  | "performance_signal"
  | "claim_candidate"
  | "conversion_asset"
  | "brand_requirement";

export type ReferenceEvidenceStrength =
  | "confirmed"
  | "observed"
  | "candidate"
  | "speculative";

export type ReferenceSourceBias =
  | "neutral"
  | "self_reported"
  | "promotional"
  | "platform_observed"
  | "system_inferred";

export type ReferenceRiskLevel = "low" | "medium" | "high";

export type ReferenceAction =
  | "ground"
  | "constrain"
  | "shape"
  | "style"
  | "inherit"
  | "adapt"
  | "combine"
  | "mutate"
  | "criticize"
  | "avoid";

export type ContentSlot =
  | "title_hook"
  | "opening"
  | "audience_scenario"
  | "body_structure"
  | "script_or_shot"
  | "visual_audio"
  | "proof_evidence"
  | "wording_style"
  | "cta_conversion"
  | "risk_review"
  | "fact_check";

export type ReferenceRoutePriority = "must" | "strong" | "normal" | "weak";

export type ReferenceUsageStatus =
  | "provided"
  | "planned"
  | "actual"
  | "planned_not_used"
  | "unverified";

export interface ReferenceSourceRef {
  sourceType: ReferencePlanSourceType;
  resourceType: "nutrient" | "nutrient_card" | "media" | "gene" | null;
  resourceId: string | null;
  title: string | null;
}

export interface ReferenceAtom extends ReferenceSourceRef {
  id: string;
  atomType: ReferenceAtomType;
  summary: string;
  evidenceStrength: ReferenceEvidenceStrength;
  sourceBias: ReferenceSourceBias;
  allowedActions: ReferenceAction[];
  targetSlots: ContentSlot[];
  usageBoundary: string;
  forbiddenUses: string[];
  riskLevel: ReferenceRiskLevel;
}

export interface ReferenceRoute {
  atomId: string;
  action: ReferenceAction;
  slot: ContentSlot;
  priority: ReferenceRoutePriority;
  instruction: string;
  boundary: string;
}

export interface ReferenceUsageSummary extends ReferenceSourceRef {
  status: ReferenceUsageStatus;
  atomIds: string[];
  actions: ReferenceAction[];
  slots: ContentSlot[];
  usageSummary: string;
  evidenceStrength: ReferenceEvidenceStrength;
  riskLevel: ReferenceRiskLevel;
}

export interface ReferencePlan {
  summary: string;
  items: ReferencePlanItem[];
  atoms?: ReferenceAtom[];
  routes?: ReferenceRoute[];
  providedUsage?: ReferenceUsageSummary[];
  plannedUsage?: ReferenceUsageSummary[];
  riskCheckRequired?: boolean;
  fallbackUsed?: boolean;
  fallbackReason?: string | null;
}

export interface ExplorationRoute {
  id: string;
  objective: string;
  platforms: string[];
  audience: string;
  contentForm: string;
  narrativeMechanism: string;
  emotionalDrivers: string[];
  evidencePlan: string[];
  interactionMode: string;
  conversionPath?: string | null;
  riskGuards: string[];
  mutationOperators: MutationOperator[];
  successSignals: string[];
  referencePlan: ReferencePlan;
}

export interface ContentSearchMap {
  algorithmVersion: string;
  platformInference: PlatformInference;
  objectives: string[];
  audiences: string[];
  contentForms: string[];
  narrativeMechanisms: string[];
  emotionalDrivers: string[];
  evidenceInventory: string[];
  riskGuards: string[];
  routeCandidates: ExplorationRoute[];
  fallbackUsed: boolean;
  fallbackReason: string | null;
}

export interface RouteTraceSummary {
  algorithmVersion: string;
  platformInferenceSource: PlatformInferenceSource;
  selectedRouteId: string;
  mutationOperatorKeys: string[];
  successSignals: string[];
  riskGuards: string[];
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
  mediaRefs: GrowthMediaRef[];
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
  mediaRefs: GrowthMediaRef[];
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
  selectedRoute?: ExplorationRoute;
  referencePlan?: ReferencePlan;
  referenceAtoms?: ReferenceAtom[];
  plannedReferenceUsage?: ReferenceUsageSummary[];
  actualReferenceUsage?: ReferenceUsageSummary[];
  mutationOperators?: MutationOperator[];
  platformInference?: PlatformInference;
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
  contentSearchMap?: ContentSearchMap;
  selectedRoute?: ExplorationRoute;
  referencePlan?: ReferencePlan;
  referenceAtoms?: ReferenceAtom[];
  plannedReferenceUsage?: ReferenceUsageSummary[];
  mutationOperators?: MutationOperator[];
  platformInference?: PlatformInference;
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
  actualReferenceUsage?: ReferenceUsageSummary[];
  candidate?: unknown;
}
