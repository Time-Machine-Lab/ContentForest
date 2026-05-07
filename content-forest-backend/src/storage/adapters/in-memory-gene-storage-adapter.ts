import {
  GENE_INSIGHT_STATUSES,
  type GeneReminderStatus,
  type GeneSuggestionStatus,
} from "../../modules/gene/domain/gene-types.js";
import type {
  GeneExtractionReminderRecord,
  GeneExtractionTaskRecord,
  GeneInsightRecord,
  GeneLibraryRecord,
  GeneStoragePort,
  GeneSuggestionRecord,
} from "../ports/gene-storage-port.js";
import { cloneEvidenceSources } from "../ports/gene-storage-port.js";

export class InMemoryGeneStorageAdapter implements GeneStoragePort {
  private readonly libraries = new Map<string, GeneLibraryRecord>();
  private readonly reminders = new Map<string, GeneExtractionReminderRecord>();
  private readonly tasks = new Map<string, GeneExtractionTaskRecord>();
  private readonly suggestions = new Map<string, GeneSuggestionRecord>();
  private readonly insights = new Map<string, GeneInsightRecord>();

  public async upsertGeneLibrary(record: GeneLibraryRecord): Promise<void> {
    this.libraries.set(record.seedId, { ...record });
  }

  public async findGeneLibraryBySeedId(
    seedId: string,
  ): Promise<GeneLibraryRecord | null> {
    const record = this.libraries.get(seedId);
    return record === undefined ? null : { ...record };
  }

  public async createReminder(
    record: GeneExtractionReminderRecord,
  ): Promise<void> {
    this.reminders.set(record.id, this.cloneReminder(record));
  }

  public async findReminderById(
    reminderId: string,
  ): Promise<GeneExtractionReminderRecord | null> {
    const record = this.reminders.get(reminderId);
    return record === undefined ? null : this.cloneReminder(record);
  }

  public async saveReminder(
    record: GeneExtractionReminderRecord,
  ): Promise<void> {
    this.reminders.set(record.id, this.cloneReminder(record));
  }

  public async listRemindersBySeedAndStatus(
    seedId: string,
    status: GeneReminderStatus,
  ): Promise<GeneExtractionReminderRecord[]> {
    return [...this.reminders.values()]
      .filter((record) => record.seedId === seedId && record.status === status)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => this.cloneReminder(record));
  }

  public async createExtractionTask(
    record: GeneExtractionTaskRecord,
  ): Promise<void> {
    this.tasks.set(record.id, this.cloneTask(record));
  }

  public async findExtractionTaskById(
    taskId: string,
  ): Promise<GeneExtractionTaskRecord | null> {
    const record = this.tasks.get(taskId);
    return record === undefined ? null : this.cloneTask(record);
  }

  public async saveExtractionTask(
    record: GeneExtractionTaskRecord,
  ): Promise<void> {
    this.tasks.set(record.id, this.cloneTask(record));
  }

  public async createSuggestion(record: GeneSuggestionRecord): Promise<void> {
    this.suggestions.set(record.id, this.cloneSuggestion(record));
  }

  public async findSuggestionById(
    suggestionId: string,
  ): Promise<GeneSuggestionRecord | null> {
    const record = this.suggestions.get(suggestionId);
    return record === undefined ? null : this.cloneSuggestion(record);
  }

  public async saveSuggestion(record: GeneSuggestionRecord): Promise<void> {
    this.suggestions.set(record.id, this.cloneSuggestion(record));
  }

  public async listSuggestionsBySeed(
    seedId: string,
  ): Promise<GeneSuggestionRecord[]> {
    return [...this.suggestions.values()]
      .filter((record) => record.seedId === seedId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => this.cloneSuggestion(record));
  }

  public async listSuggestionsBySeedAndStatus(
    seedId: string,
    status: GeneSuggestionStatus,
  ): Promise<GeneSuggestionRecord[]> {
    return [...this.suggestions.values()]
      .filter((record) => record.seedId === seedId && record.status === status)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => this.cloneSuggestion(record));
  }

  public async createInsight(record: GeneInsightRecord): Promise<void> {
    this.insights.set(record.id, this.cloneInsight(record));
  }

  public async findInsightById(
    insightId: string,
  ): Promise<GeneInsightRecord | null> {
    const record = this.insights.get(insightId);
    return record === undefined ? null : this.cloneInsight(record);
  }

  public async saveInsight(record: GeneInsightRecord): Promise<void> {
    this.insights.set(record.id, this.cloneInsight(record));
  }

  public async listInsightsBySeed(seedId: string): Promise<GeneInsightRecord[]> {
    return [...this.insights.values()]
      .filter((record) => record.seedId === seedId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => this.cloneInsight(record));
  }

  public async listReferableInsightsBySeed(
    seedId: string,
  ): Promise<GeneInsightRecord[]> {
    return [...this.insights.values()]
      .filter(
        (record) =>
          record.seedId === seedId &&
          record.status === GENE_INSIGHT_STATUSES.active,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => this.cloneInsight(record));
  }

  private cloneReminder(
    record: GeneExtractionReminderRecord,
  ): GeneExtractionReminderRecord {
    return {
      ...record,
      evidenceSources: cloneEvidenceSources(record.evidenceSources),
    };
  }

  private cloneTask(record: GeneExtractionTaskRecord): GeneExtractionTaskRecord {
    return {
      ...record,
      evidenceSources: cloneEvidenceSources(record.evidenceSources),
      agentInput: { ...record.agentInput },
    };
  }

  private cloneSuggestion(record: GeneSuggestionRecord): GeneSuggestionRecord {
    return {
      ...record,
      evidenceSources: cloneEvidenceSources(record.evidenceSources),
    };
  }

  private cloneInsight(record: GeneInsightRecord): GeneInsightRecord {
    return {
      ...record,
      evidenceSources: cloneEvidenceSources(record.evidenceSources),
    };
  }
}

