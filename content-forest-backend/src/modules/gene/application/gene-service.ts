import type { AgentPort } from "../../../agent/ports/agent-port.js";
import type { AgentTaskResult } from "../../../agent/runtime/agent-task.js";
import type { GeneMarkdownContentAccessPort } from "../../../content-access/ports/gene-markdown-content-access-port.js";
import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type { FeedbackStoragePort } from "../../../storage/ports/feedback-storage-port.js";
import type { FruitRecord, FruitStoragePort } from "../../../storage/ports/fruit-storage-port.js";
import type { GeneStoragePort } from "../../../storage/ports/gene-storage-port.js";
import type { PublicationStoragePort } from "../../../storage/ports/publication-storage-port.js";
import type { SeedStoragePort } from "../../../storage/ports/seed-storage-port.js";
import {
  GENE_EVIDENCE_SOURCE_TYPES,
  GENE_EVIDENCE_STRENGTHS,
  GENE_EXTRACTION_AGENT_INPUT_CONTRACT_VERSION,
  GENE_EXTRACTION_TASK_STATUSES,
  GENE_INSIGHT_STATUSES,
  GENE_REMINDER_STATUSES,
  GENE_SUGGESTION_STATUSES,
  type GeneEvidenceSource,
  type GeneExtractionAgentInput,
  type GeneExtractionAgentSuggestion,
  type GeneExtractionReminder,
  type GeneExtractionTask,
  type GeneExtractionTaskResult,
  type GeneInsightDetail,
  type GeneInsightSummary,
  type GeneLibrary,
  type GeneSuggestion,
} from "../domain/gene-types.js";

export interface CreateFruitEvidenceReminderInput {
  fruitId: string;
  action: "selected" | "eliminated";
}

export interface StartGeneExtractionInput {
  reminderId?: string;
  evidenceSources: GeneEvidenceSource[];
}

export interface EditGeneSuggestionInput {
  title: string;
  bodyMarkdown: string;
  lineage?: string;
  niche?: string;
}

export interface ConfirmGeneSuggestionInput {
  title?: string;
  bodyMarkdown?: string;
  lineage?: string;
  niche?: string;
}

export interface EditGeneInsightInput {
  bodyMarkdown: string;
}

const EXECUTABLE_EVIDENCE_SOURCE_TYPES = new Set<GeneEvidenceSource["sourceType"]>([
  GENE_EVIDENCE_SOURCE_TYPES.fruitSelected,
  GENE_EVIDENCE_SOURCE_TYPES.fruitEliminated,
  GENE_EVIDENCE_SOURCE_TYPES.publication,
  GENE_EVIDENCE_SOURCE_TYPES.feedback,
]);

export interface GeneServiceDependencies {
  storage: GeneStoragePort;
  contentAccess: GeneMarkdownContentAccessPort;
  seedStorage: SeedStoragePort;
  fruitStorage?: FruitStoragePort;
  publicationStorage?: PublicationStoragePort;
  feedbackStorage?: FeedbackStoragePort;
  agentPort?: AgentPort;
  idGenerator?: IdGenerator;
  now?: () => Date;
}

export class GeneService {
  private readonly storage: GeneStoragePort;
  private readonly contentAccess: GeneMarkdownContentAccessPort;
  private readonly seedStorage: SeedStoragePort;
  private readonly fruitStorage: FruitStoragePort | undefined;
  private readonly publicationStorage: PublicationStoragePort | undefined;
  private readonly feedbackStorage: FeedbackStoragePort | undefined;
  private readonly agentPort: AgentPort | undefined;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;

  public constructor(dependencies: GeneServiceDependencies) {
    this.storage = dependencies.storage;
    this.contentAccess = dependencies.contentAccess;
    this.seedStorage = dependencies.seedStorage;
    this.fruitStorage = dependencies.fruitStorage;
    this.publicationStorage = dependencies.publicationStorage;
    this.feedbackStorage = dependencies.feedbackStorage;
    this.agentPort = dependencies.agentPort;
    this.idGenerator = dependencies.idGenerator ?? new RandomIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
  }

  public async prepareSeedGeneLibrary(seedId: string): Promise<GeneLibrary> {
    await this.requireSeed(seedId);
    const existing = await this.storage.findGeneLibraryBySeedId(seedId);
    if (existing !== null) {
      return existing;
    }

    const timestamp = this.timestamp();
    const contentLocation = await this.contentAccess.prepareSeedGeneLibrary(seedId);
    const record: GeneLibrary = {
      seedId,
      contentLocation,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.storage.upsertGeneLibrary(record);
    return record;
  }

  public async getSeedGeneLibrary(seedId: string): Promise<GeneLibrary> {
    await this.requireSeed(seedId);
    const record = await this.storage.findGeneLibraryBySeedId(seedId);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "种子级基因库不存在", 404);
    }
    return record;
  }

  public async createReminderFromFruitEvidence(
    seedId: string,
    input: CreateFruitEvidenceReminderInput,
  ): Promise<GeneExtractionReminder> {
    await this.requireSeed(seedId);
    const fruitId = this.requireNonBlank(input.fruitId, "果实不能为空");
    if (this.fruitStorage !== undefined) {
      const fruit = await this.fruitStorage.findFruitById(fruitId);
      if (fruit === null) {
        throw new ApplicationError("NOT_FOUND", "果实不存在", 404);
      }
    }

    const sourceType =
      input.action === "selected"
        ? GENE_EVIDENCE_SOURCE_TYPES.fruitSelected
        : GENE_EVIDENCE_SOURCE_TYPES.fruitEliminated;
    const timestamp = this.timestamp();
    const record: GeneExtractionReminder = {
      id: this.idGenerator.nextId("gene-reminder"),
      seedId,
      status: GENE_REMINDER_STATUSES.pending,
      evidenceSources: [
        {
          sourceType,
          sourceId: fruitId,
          strength: GENE_EVIDENCE_STRENGTHS.weak,
        },
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.storage.createReminder(record);
    return record;
  }

  public async listPendingReminders(seedId: string): Promise<GeneExtractionReminder[]> {
    await this.requireSeed(seedId);
    return this.storage.listRemindersBySeedAndStatus(
      seedId,
      GENE_REMINDER_STATUSES.pending,
    );
  }

  public async ignoreReminder(reminderId: string): Promise<GeneExtractionReminder> {
    const reminder = await this.requireReminder(reminderId);
    if (reminder.status !== GENE_REMINDER_STATUSES.pending) {
      return reminder;
    }
    const updated = {
      ...reminder,
      status: GENE_REMINDER_STATUSES.ignored,
      updatedAt: this.timestamp(),
    };
    await this.storage.saveReminder(updated);
    return updated;
  }

  public async startExtractionTask(
    seedId: string,
    input: StartGeneExtractionInput,
  ): Promise<GeneExtractionTaskResult> {
    await this.requireSeed(seedId);
    await this.prepareSeedGeneLibrary(seedId);
    const evidenceSources = this.normalizeEvidenceSources(input.evidenceSources);
    this.requireExecutableEvidence(evidenceSources);
    await this.authorizeEvidenceSources(seedId, evidenceSources);
    const timestamp = this.timestamp();
    const taskId = this.idGenerator.nextId("gene-task");
    const agentInput = await this.buildAgentInput(seedId, taskId, evidenceSources);
    const task: GeneExtractionTask = {
      id: taskId,
      seedId,
      status: GENE_EXTRACTION_TASK_STATUSES.running,
      failureReason: null,
      evidenceSources,
      agentInput: agentInput as unknown as Record<string, unknown>,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.storage.createExtractionTask(task);

    try {
      const agent = this.requireAgentPort();
      const result = await agent.runTask({
        taskId,
        type: "gene_extraction",
        input: agentInput as unknown as Record<string, unknown>,
        metadata: {
          seedId,
          evidenceSources,
        },
      });
      if (!result.ok) {
        await this.failTask(task, result.error.message);
        throw new ApplicationError("AGENT_TASK_FAILED", result.error.message, 502);
      }

      const suggestions = await this.persistAgentSuggestionsFromAgentResult(
        task,
        seedId,
        taskId,
        evidenceSources,
        result,
      );
      const completedTask = {
        ...task,
        status: GENE_EXTRACTION_TASK_STATUSES.completed,
        updatedAt: this.timestamp(),
      };
      await this.storage.saveExtractionTask(completedTask);
      if (input.reminderId !== undefined) {
        await this.markReminderHandled(input.reminderId);
      }
      return {
        task: completedTask,
        suggestions,
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "基因汲取失败";
      await this.failTask(task, message);
      throw new ApplicationError("AGENT_TASK_FAILED", message, 502);
    }
  }

  public async listPendingSuggestions(seedId: string): Promise<GeneSuggestion[]> {
    await this.requireSeed(seedId);
    return this.storage.listSuggestionsBySeedAndStatus(
      seedId,
      GENE_SUGGESTION_STATUSES.pending,
    );
  }

  public async getSuggestion(suggestionId: string): Promise<GeneSuggestion> {
    return this.requireSuggestion(suggestionId);
  }

  public async editSuggestion(
    suggestionId: string,
    input: EditGeneSuggestionInput,
  ): Promise<GeneSuggestion> {
    const suggestion = await this.requirePendingSuggestion(suggestionId);
    const updated = {
      ...suggestion,
      title: this.requireNonBlank(input.title, "基因建议标题不能为空"),
      bodyMarkdown: this.requireNonBlank(
        input.bodyMarkdown,
        "基因建议正文不能为空",
      ),
      lineage: this.normalizeOptionalText(input.lineage),
      niche: this.normalizeOptionalText(input.niche),
      updatedAt: this.timestamp(),
    };
    await this.storage.saveSuggestion(updated);
    return updated;
  }

  public async dismissSuggestion(suggestionId: string): Promise<GeneSuggestion> {
    const suggestion = await this.requirePendingSuggestion(suggestionId);
    const updated = {
      ...suggestion,
      status: GENE_SUGGESTION_STATUSES.dismissed,
      updatedAt: this.timestamp(),
    };
    await this.storage.saveSuggestion(updated);
    return updated;
  }

  public async confirmSuggestion(
    suggestionId: string,
    input: ConfirmGeneSuggestionInput = {},
  ): Promise<GeneInsightDetail> {
    const suggestion = await this.requirePendingSuggestion(suggestionId);
    await this.prepareSeedGeneLibrary(suggestion.seedId);
    const timestamp = this.timestamp();
    const insightId = this.idGenerator.nextId("gene-insight");
    const title = this.requireNonBlank(
      input.title ?? suggestion.title,
      "基因经验标题不能为空",
    );
    const bodyMarkdown = this.requireNonBlank(
      input.bodyMarkdown ?? suggestion.bodyMarkdown,
      "基因经验正文不能为空",
    );
    const contentLocation = await this.contentAccess.createGeneInsightMarkdown({
      seedId: suggestion.seedId,
      insightId,
      markdown: bodyMarkdown,
    });
    const insight: GeneInsightSummary = {
      id: insightId,
      seedId: suggestion.seedId,
      suggestionId: suggestion.id,
      status: GENE_INSIGHT_STATUSES.active,
      title,
      lineage: this.normalizeOptionalText(input.lineage ?? suggestion.lineage),
      niche: this.normalizeOptionalText(input.niche ?? suggestion.niche),
      contentLocation,
      evidenceSources: suggestion.evidenceSources,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    };

    try {
      await this.storage.createInsight(insight);
      await this.storage.saveSuggestion({
        ...suggestion,
        status: GENE_SUGGESTION_STATUSES.confirmed,
        updatedAt: this.timestamp(),
      });
    } catch (error) {
      await this.contentAccess.removeGeneInsightMarkdown(contentLocation);
      throw error;
    }

    return {
      ...insight,
      bodyMarkdown,
    };
  }

  public async listInsights(seedId: string): Promise<GeneInsightSummary[]> {
    await this.requireSeed(seedId);
    return this.storage.listInsightsBySeed(seedId);
  }

  public async listReferableInsights(seedId: string): Promise<GeneInsightSummary[]> {
    await this.requireSeed(seedId);
    return this.storage.listReferableInsightsBySeed(seedId);
  }

  public async getInsight(insightId: string): Promise<GeneInsightDetail> {
    const insight = await this.requireInsight(insightId);
    const bodyMarkdown = await this.contentAccess.readGeneInsightMarkdown(
      insight.contentLocation,
    );
    return {
      ...insight,
      bodyMarkdown,
    };
  }

  public async editInsight(
    insightId: string,
    input: EditGeneInsightInput,
  ): Promise<GeneInsightDetail> {
    const insight = await this.requireInsight(insightId);
    const bodyMarkdown = this.requireNonBlank(
      input.bodyMarkdown,
      "基因经验正文不能为空",
    );
    await this.contentAccess.updateGeneInsightMarkdown(
      insight.contentLocation,
      bodyMarkdown,
    );
    const updated = {
      ...insight,
      updatedAt: this.timestamp(),
    };
    await this.storage.saveInsight(updated);
    return {
      ...updated,
      bodyMarkdown,
    };
  }

  public async archiveInsight(insightId: string): Promise<GeneInsightDetail> {
    const insight = await this.requireInsight(insightId);
    const bodyMarkdown = await this.contentAccess.readGeneInsightMarkdown(
      insight.contentLocation,
    );
    if (insight.status === GENE_INSIGHT_STATUSES.archived) {
      return {
        ...insight,
        bodyMarkdown,
      };
    }
    const timestamp = this.timestamp();
    const updated = {
      ...insight,
      status: GENE_INSIGHT_STATUSES.archived,
      updatedAt: timestamp,
      archivedAt: timestamp,
    };
    await this.storage.saveInsight(updated);
    return {
      ...updated,
      bodyMarkdown,
    };
  }

  private async buildAgentInput(
    seedId: string,
    taskId: string,
    evidenceSources: GeneEvidenceSource[],
  ): Promise<GeneExtractionAgentInput> {
    const fruitEvidence = await this.buildFruitEvidence(evidenceSources);
    const feedbackEvidence = await this.buildFeedbackEvidence(evidenceSources);
    const referableGeneInsights = (await this.storage.listReferableInsightsBySeed(seedId))
      .map((insight) => ({
        insightId: insight.id,
        title: insight.title,
        lineage: insight.lineage,
        niche: insight.niche,
        contentLocation: insight.contentLocation,
    }));

    return {
      contractVersion: GENE_EXTRACTION_AGENT_INPUT_CONTRACT_VERSION,
      seedId,
      taskId,
      evidenceSources,
      fruitEvidence,
      feedbackEvidence,
      referableGeneInsights,
    };
  }

  private async buildFeedbackEvidence(
    evidenceSources: GeneEvidenceSource[],
  ): Promise<GeneExtractionAgentInput["feedbackEvidence"]> {
    if (this.feedbackStorage === undefined) {
      return [];
    }
    const snapshotIds = [
      ...new Set(
        evidenceSources
          .filter((source) => source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.feedback)
          .map((source) => source.sourceId),
      ),
    ];
    const evidence: GeneExtractionAgentInput["feedbackEvidence"] = [];
    for (const snapshotId of snapshotIds) {
      const snapshot = await this.feedbackStorage.findFeedbackSnapshotById(
        snapshotId,
      );
      if (snapshot === null) {
        continue;
      }
      const monitorAttachment =
        await this.feedbackStorage.findMonitorAttachmentById(
          snapshot.monitorAttachmentId,
        );
      evidence.push({
        snapshotId: snapshot.id,
        publicationRecordId: snapshot.publicationRecordId,
        monitorAttachmentId: snapshot.monitorAttachmentId,
        monitorType: monitorAttachment?.monitorType ?? null,
        performanceData: structuredClone(snapshot.performanceData),
        userObservation: snapshot.userObservation,
        capturedAt: snapshot.capturedAt,
      });
    }
    return evidence;
  }

  private async buildFruitEvidence(
    evidenceSources: GeneEvidenceSource[],
  ): Promise<GeneExtractionAgentInput["fruitEvidence"]> {
    if (this.fruitStorage === undefined) {
      return [];
    }

    const fruitIds = [
      ...new Set(
        evidenceSources
          .filter((source) =>
            source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.fruitSelected ||
            source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.fruitEliminated,
          )
          .map((source) => source.sourceId),
      ),
    ];

    const records: FruitRecord[] = [];
    for (const fruitId of fruitIds) {
      const record = await this.fruitStorage.findFruitById(fruitId);
      if (record !== null) {
        records.push(record);
      }
    }
    return records.map((record) => ({
      fruitId: record.id,
      selectionState: record.selectionState,
      contentLocation: record.contentLocation,
      summary: record.summary,
      geneTags: [...record.geneTags],
    }));
  }

  private async persistAgentSuggestionsFromAgentResult(
    task: GeneExtractionTask,
    seedId: string,
    taskId: string,
    evidenceSources: GeneEvidenceSource[],
    result: AgentTaskResult & { ok: true },
  ): Promise<GeneSuggestion[]> {
    try {
      return await this.persistAgentSuggestions(
        seedId,
        taskId,
        evidenceSources,
        result,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Agent returned unusable gene suggestions";
      await this.failTask(task, message);
      throw new ApplicationError("AGENT_TASK_FAILED", message, 502);
    }
  }

  private async persistAgentSuggestions(
    seedId: string,
    taskId: string,
    evidenceSources: GeneEvidenceSource[],
    result: AgentTaskResult & { ok: true },
  ): Promise<GeneSuggestion[]> {
    const agentSuggestions = this.extractAgentSuggestions(result.output.content);
    const suggestions: GeneSuggestion[] = [];
    for (const agentSuggestion of agentSuggestions) {
      const timestamp = this.timestamp();
      const suggestion: GeneSuggestion = {
        id: this.idGenerator.nextId("gene-suggestion"),
        seedId,
        taskId,
        status: GENE_SUGGESTION_STATUSES.pending,
        title: this.requireNonBlank(
          agentSuggestion.title,
          "Agent 返回的基因建议标题不能为空",
        ),
        bodyMarkdown: this.requireNonBlank(
          agentSuggestion.bodyMarkdown,
          "Agent 返回的基因建议正文不能为空",
        ),
        lineage: this.normalizeOptionalText(agentSuggestion.lineage),
        niche: this.normalizeOptionalText(agentSuggestion.niche),
        evidenceSources,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await this.storage.createSuggestion(suggestion);
      suggestions.push(suggestion);
    }
    return suggestions;
  }

  private extractAgentSuggestions(content: unknown): GeneExtractionAgentSuggestion[] {
    const candidates = Array.isArray(content)
      ? content
      : this.isRecord(content) && Array.isArray(content.suggestions)
        ? content.suggestions
        : [];

    if (candidates.length === 0) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Agent 未返回可用的基因建议",
        502,
      );
    }

    return candidates.map((candidate) => {
      if (!this.isRecord(candidate)) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Agent 基因建议格式不正确",
          502,
        );
      }
      return {
        title: this.requireString(candidate.title, "Agent 基因建议缺少标题"),
        bodyMarkdown: this.requireString(
          candidate.bodyMarkdown,
          "Agent 基因建议缺少正文",
        ),
        lineage:
          typeof candidate.lineage === "string" ? candidate.lineage : undefined,
        niche: typeof candidate.niche === "string" ? candidate.niche : undefined,
        evidenceInterpretation:
          typeof candidate.evidenceInterpretation === "string"
            ? candidate.evidenceInterpretation
            : undefined,
      };
    });
  }

  private async markReminderHandled(reminderId: string): Promise<void> {
    const reminder = await this.requireReminder(reminderId);
    if (reminder.status !== GENE_REMINDER_STATUSES.pending) {
      return;
    }
    await this.storage.saveReminder({
      ...reminder,
      status: GENE_REMINDER_STATUSES.handled,
      updatedAt: this.timestamp(),
    });
  }

  private async failTask(
    task: GeneExtractionTask,
    failureReason: string,
  ): Promise<void> {
    await this.storage.saveExtractionTask({
      ...task,
      status: GENE_EXTRACTION_TASK_STATUSES.failed,
      failureReason,
      updatedAt: this.timestamp(),
    });
  }

  private normalizeEvidenceSources(
    evidenceSources: GeneEvidenceSource[],
  ): GeneEvidenceSource[] {
    if (!Array.isArray(evidenceSources) || evidenceSources.length === 0) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "基因汲取至少需要一个证据来源",
        400,
      );
    }
    return evidenceSources.map((source) => ({
      sourceType: this.requireEvidenceSourceType(source.sourceType),
      sourceId: this.requireNonBlank(source.sourceId, "证据来源不能为空"),
      strength: this.requireEvidenceStrength(source.strength),
    }));
  }

  private requireExecutableEvidence(evidenceSources: GeneEvidenceSource[]): void {
    const hasExecutableEvidence = evidenceSources.some((source) =>
      EXECUTABLE_EVIDENCE_SOURCE_TYPES.has(source.sourceType),
    );
    if (!hasExecutableEvidence) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "反馈证据尚未接入基因汲取执行流程",
        400,
      );
    }
  }

  private async authorizeEvidenceSources(
    seedId: string,
    evidenceSources: GeneEvidenceSource[],
  ): Promise<void> {
    for (const source of evidenceSources) {
      if (
        source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.fruitSelected ||
        source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.fruitEliminated
      ) {
        await this.requireFruitEvidenceBelongsToSeed(seedId, source.sourceId);
        continue;
      }

      if (source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.publication) {
        await this.requirePublicationEvidenceBelongsToSeed(seedId, source.sourceId);
        continue;
      }

      if (source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.feedback) {
        await this.requireFeedbackEvidenceBelongsToSeed(seedId, source.sourceId);
      }
    }
  }

  private async requireFruitEvidenceBelongsToSeed(
    seedId: string,
    fruitId: string,
  ): Promise<void> {
    const rootSeedId = await this.resolveFruitRootSeedId(fruitId);
    if (rootSeedId !== seedId) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "果实证据不属于当前种子",
        400,
      );
    }
  }

  private async requirePublicationEvidenceBelongsToSeed(
    seedId: string,
    publicationRecordId: string,
  ): Promise<void> {
    if (this.publicationStorage === undefined) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "发布证据存储尚未装配",
        400,
      );
    }
    const publication =
      await this.publicationStorage.findPublicationRecordById(publicationRecordId);
    if (publication === null) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "发布证据无法解析",
        400,
      );
    }
    const rootSeedId = await this.resolveFruitRootSeedId(publication.fruitId);
    if (rootSeedId !== seedId) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "发布证据不属于当前种子",
        400,
      );
    }
  }

  private async requireFeedbackEvidenceBelongsToSeed(
    seedId: string,
    snapshotId: string,
  ): Promise<void> {
    if (this.feedbackStorage === undefined) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "反馈证据存储尚未装配",
        400,
      );
    }
    const snapshot = await this.feedbackStorage.findFeedbackSnapshotById(snapshotId);
    if (snapshot === null) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "反馈证据无法解析",
        400,
      );
    }
    await this.requirePublicationEvidenceBelongsToSeed(
      seedId,
      snapshot.publicationRecordId,
    );
  }

  private async resolveFruitRootSeedId(fruitId: string): Promise<string> {
    if (this.fruitStorage === undefined) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "果实证据存储尚未装配",
        400,
      );
    }
    const fruit = await this.fruitStorage.findFruitById(fruitId);
    if (fruit === null) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "果实证据无法解析",
        400,
      );
    }
    return this.resolveRootSeedIdFromFruit(fruit, new Set([fruit.id]));
  }

  private async resolveRootSeedIdFromFruit(
    fruit: FruitRecord,
    visitedFruitIds: Set<string>,
  ): Promise<string> {
    if (fruit.parentNodeRef.nodeType === "seed") {
      return this.seedIdFromSeedNodeId(fruit.parentNodeRef.nodeId);
    }

    const parentFruitId = fruit.parentNodeRef.nodeId;
    if (visitedFruitIds.has(parentFruitId)) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "果实证据父链无法解析",
        400,
      );
    }
    visitedFruitIds.add(parentFruitId);
    const parentFruit = await this.fruitStorage?.findFruitById(parentFruitId);
    if (parentFruit === undefined || parentFruit === null) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "果实证据父链无法解析",
        400,
      );
    }
    return this.resolveRootSeedIdFromFruit(parentFruit, visitedFruitIds);
  }

  private seedIdFromSeedNodeId(seedNodeId: string): string {
    return seedNodeId.startsWith("seed-node_")
      ? seedNodeId.slice("seed-node_".length)
      : seedNodeId;
  }

  private async requireSeed(seedId: string): Promise<void> {
    const normalizedSeedId = this.requireNonBlank(seedId, "种子不能为空");
    const seed = await this.seedStorage.findSeedById(normalizedSeedId);
    if (seed === null) {
      throw new ApplicationError("NOT_FOUND", "种子不存在", 404);
    }
  }

  private async requireReminder(reminderId: string): Promise<GeneExtractionReminder> {
    const reminder = await this.storage.findReminderById(reminderId);
    if (reminder === null) {
      throw new ApplicationError("NOT_FOUND", "汲取提醒不存在", 404);
    }
    return reminder;
  }

  private async requireSuggestion(suggestionId: string): Promise<GeneSuggestion> {
    const suggestion = await this.storage.findSuggestionById(suggestionId);
    if (suggestion === null) {
      throw new ApplicationError("NOT_FOUND", "基因建议不存在", 404);
    }
    return suggestion;
  }

  private async requirePendingSuggestion(
    suggestionId: string,
  ): Promise<GeneSuggestion> {
    const suggestion = await this.requireSuggestion(suggestionId);
    if (suggestion.status !== GENE_SUGGESTION_STATUSES.pending) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "只有待确认基因建议可以执行该操作",
        400,
      );
    }
    return suggestion;
  }

  private async requireInsight(insightId: string): Promise<GeneInsightSummary> {
    const insight = await this.storage.findInsightById(insightId);
    if (insight === null) {
      throw new ApplicationError("NOT_FOUND", "基因经验不存在", 404);
    }
    return insight;
  }

  private requireAgentPort(): AgentPort {
    if (this.agentPort === undefined) {
      throw new ApplicationError(
        "AGENT_TASK_FAILED",
        "基因汲取 Agent 入口尚未装配",
        502,
      );
    }
    return this.agentPort;
  }

  private requireEvidenceSourceType(value: string): GeneEvidenceSource["sourceType"] {
    if (
      value === GENE_EVIDENCE_SOURCE_TYPES.fruitSelected ||
      value === GENE_EVIDENCE_SOURCE_TYPES.fruitEliminated ||
      value === GENE_EVIDENCE_SOURCE_TYPES.publication ||
      value === GENE_EVIDENCE_SOURCE_TYPES.feedback
    ) {
      return value;
    }
    throw new ApplicationError("VALIDATION_ERROR", "证据来源类型不正确", 400);
  }

  private requireEvidenceStrength(value: string): GeneEvidenceSource["strength"] {
    if (
      value === GENE_EVIDENCE_STRENGTHS.weak ||
      value === GENE_EVIDENCE_STRENGTHS.medium ||
      value === GENE_EVIDENCE_STRENGTHS.strong
    ) {
      return value;
    }
    throw new ApplicationError("VALIDATION_ERROR", "证据强度不正确", 400);
  }

  private requireString(value: unknown, message: string): string {
    if (typeof value !== "string") {
      throw new ApplicationError("VALIDATION_ERROR", message, 502);
    }
    return value;
  }

  private requireNonBlank(value: string, message: string): string {
    const normalized = value.trim();
    if (normalized.length === 0) {
      throw new ApplicationError("VALIDATION_ERROR", message, 400);
    }
    return normalized;
  }

  private normalizeOptionalText(value: string | undefined): string {
    return value?.trim() ?? "";
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}
