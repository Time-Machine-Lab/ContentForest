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
  status: GeneExtractionTaskStatus;
  failureReason: string | null;
  evidenceSources: GeneEvidenceSource[];
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
}

export interface GeneInsightDetail extends GeneInsightSummary {
  bodyMarkdown: string;
}

export interface GeneExtractionTaskResult {
  task: GeneExtractionTask;
  suggestions: GeneSuggestion[];
}

export const GENE_EXTRACTION_AGENT_INPUT_CONTRACT_VERSION =
  "gene-extraction-agent-input/v1";

export interface GeneExtractionAgentInput {
  contractVersion: typeof GENE_EXTRACTION_AGENT_INPUT_CONTRACT_VERSION;
  seedId: string;
  taskId: string;
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
  }>;
}

export interface GeneExtractionAgentSuggestion {
  title: string;
  bodyMarkdown: string;
  lineage?: string;
  niche?: string;
  evidenceInterpretation?: string;
}
