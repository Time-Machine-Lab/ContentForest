import type {
  GeneEvidenceSource,
  GeneExtractionReminder,
  GeneExtractionTask,
  GeneInsightSummary,
  GeneLibrary,
  GenePerformanceSummary,
  GeneReminderStatus,
  GeneSuggestion,
  GeneUsageRecord,
} from "../../modules/gene/domain/gene-types.js";

export type GeneLibraryRecord = GeneLibrary;
export type GeneExtractionReminderRecord = GeneExtractionReminder;
export type GeneExtractionTaskRecord = GeneExtractionTask;
export type GeneSuggestionRecord = GeneSuggestion;
export type GeneInsightRecord = GeneInsightSummary;
export type GeneUsageRecordRecord = GeneUsageRecord;
export type GenePerformanceSummaryRecord = GenePerformanceSummary;

export interface GeneStoragePort {
  upsertGeneLibrary(record: GeneLibraryRecord): Promise<void>;
  findGeneLibraryBySeedId(seedId: string): Promise<GeneLibraryRecord | null>;

  createReminder(record: GeneExtractionReminderRecord): Promise<void>;
  findReminderById(reminderId: string): Promise<GeneExtractionReminderRecord | null>;
  saveReminder(record: GeneExtractionReminderRecord): Promise<void>;
  listRemindersBySeedAndStatus(
    seedId: string,
    status: GeneReminderStatus,
  ): Promise<GeneExtractionReminderRecord[]>;

  createExtractionTask(record: GeneExtractionTaskRecord): Promise<void>;
  findExtractionTaskById(taskId: string): Promise<GeneExtractionTaskRecord | null>;
  saveExtractionTask(record: GeneExtractionTaskRecord): Promise<void>;

  createSuggestion(record: GeneSuggestionRecord): Promise<void>;
  findSuggestionById(suggestionId: string): Promise<GeneSuggestionRecord | null>;
  saveSuggestion(record: GeneSuggestionRecord): Promise<void>;
  listSuggestionsBySeed(seedId: string): Promise<GeneSuggestionRecord[]>;
  listSuggestionsBySeedAndStatus(
    seedId: string,
    status: GeneSuggestionRecord["status"],
  ): Promise<GeneSuggestionRecord[]>;

  createInsight(record: GeneInsightRecord): Promise<void>;
  findInsightById(insightId: string): Promise<GeneInsightRecord | null>;
  saveInsight(record: GeneInsightRecord): Promise<void>;
  listInsightsBySeed(seedId: string): Promise<GeneInsightRecord[]>;
  listReferableInsightsBySeed(seedId: string): Promise<GeneInsightRecord[]>;

  createUsageRecord(record: GeneUsageRecordRecord): Promise<void>;
  findPerformanceSummaryByInsightId(
    insightId: string,
  ): Promise<GenePerformanceSummaryRecord | null>;
  upsertPerformanceSummary(record: GenePerformanceSummaryRecord): Promise<void>;
  listPerformanceSummariesBySeed(
    seedId: string,
  ): Promise<GenePerformanceSummaryRecord[]>;
}

export function cloneEvidenceSources(
  evidenceSources: GeneEvidenceSource[],
): GeneEvidenceSource[] {
  return evidenceSources.map((source) => ({ ...source }));
}
