export const GENE_EVIDENCE_SOURCE_TYPES = {
  fruitSelected: "fruit_selected",
  fruitEliminated: "fruit_eliminated",
  publication: "publication",
  feedback: "feedback",
} as const;

export type GeneEvidenceSourceType =
  (typeof GENE_EVIDENCE_SOURCE_TYPES)[keyof typeof GENE_EVIDENCE_SOURCE_TYPES];

export const GENE_EVIDENCE_STRENGTHS = {
  weak: "weak",
  medium: "medium",
  strong: "strong",
} as const;

export type GeneEvidenceStrength =
  (typeof GENE_EVIDENCE_STRENGTHS)[keyof typeof GENE_EVIDENCE_STRENGTHS];

export interface GeneEvidenceSource {
  sourceType: GeneEvidenceSourceType;
  sourceId: string;
  strength: GeneEvidenceStrength;
}

export const GENE_REMINDER_STATUSES = {
  pending: "pending",
  handled: "handled",
  ignored: "ignored",
} as const;

export type GeneReminderStatus =
  (typeof GENE_REMINDER_STATUSES)[keyof typeof GENE_REMINDER_STATUSES];

export const GENE_EXTRACTION_TASK_STATUSES = {
  running: "running",
  completed: "completed",
  failed: "failed",
} as const;

export type GeneExtractionTaskStatus =
  (typeof GENE_EXTRACTION_TASK_STATUSES)[keyof typeof GENE_EXTRACTION_TASK_STATUSES];

export const GENE_SUGGESTION_STATUSES = {
  pending: "pending",
  confirmed: "confirmed",
  dismissed: "dismissed",
} as const;

export type GeneSuggestionStatus =
  (typeof GENE_SUGGESTION_STATUSES)[keyof typeof GENE_SUGGESTION_STATUSES];

export const GENE_INSIGHT_STATUSES = {
  active: "active",
  archived: "archived",
} as const;

export type GeneInsightStatus =
  (typeof GENE_INSIGHT_STATUSES)[keyof typeof GENE_INSIGHT_STATUSES];

export const GENE_USAGE_SOURCE_TYPES = {
  growthTask: "growth_task",
  manual: "manual",
  publication: "publication",
  feedback: "feedback",
} as const;

export type GeneUsageSourceType =
  (typeof GENE_USAGE_SOURCE_TYPES)[keyof typeof GENE_USAGE_SOURCE_TYPES];

export const GENE_USAGE_OUTCOMES = {
  positive: "positive",
  neutral: "neutral",
  negative: "negative",
} as const;

export type GeneUsageOutcome =
  (typeof GENE_USAGE_OUTCOMES)[keyof typeof GENE_USAGE_OUTCOMES];

export const GENE_EXTRACTION_REASON_CONTEXT_VERSION =
  "gene-extraction-reason/v1";

export interface GeneExtractionReasonContext {
  contextVersion: typeof GENE_EXTRACTION_REASON_CONTEXT_VERSION;
  userReason: string;
}

export const GENE_SUGGESTION_POLARITIES = {
  positive: "positive",
  negative: "negative",
} as const;

export type GeneSuggestionPolarity =
  (typeof GENE_SUGGESTION_POLARITIES)[keyof typeof GENE_SUGGESTION_POLARITIES];

export const GENE_SIMILARITY_RELATIONS = {
  new: "new",
  reinforces: "reinforces",
  branches: "branches",
  conflicts: "conflicts",
} as const;

export type GeneSimilarityRelation =
  (typeof GENE_SIMILARITY_RELATIONS)[keyof typeof GENE_SIMILARITY_RELATIONS];

export interface GeneSuggestionSemantics {
  polarity: GeneSuggestionPolarity;
  evidenceInterpretation: string;
  nextRoundUsage: string;
  similarityRelation: GeneSimilarityRelation;
  relatedInsightIds: string[];
  warnings: string[];
}

export interface GeneLibrary {
  seedId: string;
  contentLocation: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneExtractionReminder {
  id: string;
  seedId: string;
  status: GeneReminderStatus;
  evidenceSources: GeneEvidenceSource[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneExtractionTask {
  id: string;
  seedId: string;
  reminderId?: string | null;
  status: GeneExtractionTaskStatus;
  failureReason: string | null;
  evidenceSources: GeneEvidenceSource[];
  reasonContext?: GeneExtractionReasonContext;
  agentInput: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GeneSuggestion {
  id: string;
  seedId: string;
  taskId: string;
  status: GeneSuggestionStatus;
  title: string;
  bodyMarkdown: string;
  lineage: string;
  niche: string;
  evidenceSources: GeneEvidenceSource[];
  semantics?: GeneSuggestionSemantics;
  createdAt: string;
  updatedAt: string;
}

export interface GeneInsightSummary {
  id: string;
  seedId: string;
  suggestionId: string | null;
  status: GeneInsightStatus;
  title: string;
  lineage: string;
  niche: string;
  contentLocation: string;
  evidenceSources: GeneEvidenceSource[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  performance?: GenePerformanceSummary;
}

export interface GeneInsightDetail extends GeneInsightSummary {
  bodyMarkdown: string;
}

export interface GeneUsageRecord {
  id: string;
  seedId: string;
  insightId: string;
  sourceType: GeneUsageSourceType;
  sourceId: string;
  outcome: GeneUsageOutcome;
  note: string;
  createdAt: string;
}

export interface GenePerformanceSummary {
  insightId: string;
  seedId: string;
  usageCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  score: number;
  lastUsedAt: string | null;
  updatedAt: string;
}

export interface GeneLineageEvolutionSummary {
  lineage: string;
  insightCount: number;
  usageCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  score: number;
}

export interface GeneLibraryEvolutionSummary {
  seedId: string;
  insights: GeneInsightSummary[];
  lineages: GeneLineageEvolutionSummary[];
}

export interface GeneUsageRecordResult {
  usage: GeneUsageRecord;
  performance: GenePerformanceSummary;
}

export interface GeneExtractionTaskResult {
  task: GeneExtractionTask;
  suggestions: GeneSuggestion[];
}

export const GENE_EXTRACTION_AGENT_INPUT_CONTRACT_VERSION =
  "gene-extraction-agent-input/v2";

export interface GeneExtractionAgentInput {
  contractVersion: typeof GENE_EXTRACTION_AGENT_INPUT_CONTRACT_VERSION;
  seedId: string;
  taskId: string;
  reasonContext: GeneExtractionReasonContext;
  evidenceSources: GeneEvidenceSource[];
  fruitEvidence: Array<{
    fruitId: string;
    selectionState: string;
    contentLocation: string;
    summary: string;
    geneTags: string[];
  }>;
  feedbackEvidence: Array<{
    snapshotId: string;
    publicationRecordId: string;
    monitorAttachmentId: string;
    monitorType: string | null;
    performanceData: Record<string, unknown>;
    userObservation: string;
    capturedAt: string;
  }>;
  referableGeneInsights: Array<{
    insightId: string;
    title: string;
    lineage: string;
    niche: string;
    contentLocation: string;
    performance: GenePerformanceSummary;
  }>;
}

export interface GeneExtractionAgentSuggestion {
  title: string;
  bodyMarkdown: string;
  polarity?: GeneSuggestionPolarity;
  lineage?: string;
  niche?: string;
  evidenceInterpretation?: string;
  nextRoundUsage?: string;
  similarityRelation?: GeneSimilarityRelation;
  relatedInsightIds?: string[];
  warnings?: string[];
}
