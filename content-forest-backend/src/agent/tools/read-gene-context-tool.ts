import type { FruitMarkdownContentAccessPort } from "../../content-access/ports/fruit-markdown-content-access-port.js";
import type { GeneMarkdownContentAccessPort } from "../../content-access/ports/gene-markdown-content-access-port.js";
import type { SeedMarkdownContentAccessPort } from "../../content-access/ports/seed-markdown-content-access-port.js";
import {
  GENE_EVIDENCE_SOURCE_TYPES,
  GENE_INSIGHT_STATUSES,
  type GeneEvidenceSource,
} from "../../modules/gene/domain/gene-types.js";
import { ApplicationError } from "../../shared/errors/application-error.js";
import type { FeedbackStoragePort } from "../../storage/ports/feedback-storage-port.js";
import type { FruitStoragePort } from "../../storage/ports/fruit-storage-port.js";
import type { GeneStoragePort } from "../../storage/ports/gene-storage-port.js";
import type { PublicationStoragePort } from "../../storage/ports/publication-storage-port.js";
import type { SeedStoragePort } from "../../storage/ports/seed-storage-port.js";
import type { AgentTaskContext } from "../runtime/agent-task.js";
import type { ToolContract, ToolInput, ToolOutput } from "../runtime/tool-contract.js";
import { requireRecord, requireString } from "./agent-tool-utils.js";

export const READ_GENE_SEED_CONTEXT_TOOL_NAME = "read_gene_seed_context";
export const READ_GENE_EVIDENCE_TOOL_NAME = "read_gene_evidence";
export const READ_REFERABLE_GENE_INSIGHTS_TOOL_NAME = "read_referable_gene_insights";

export class ReadGeneSeedContextTool implements ToolContract {
  public readonly name = READ_GENE_SEED_CONTEXT_TOOL_NAME;
  public readonly description = "Read the seed context authorized by a gene extraction task.";
  public readonly readOnly = true;

  public constructor(
    private readonly dependencies: {
      seedStorage: SeedStoragePort;
      seedContentAccess: SeedMarkdownContentAccessPort;
    },
  ) {}

  public async execute(
    input: ToolInput,
    context: AgentTaskContext,
  ): Promise<ToolOutput> {
    const seedId = readTaskSeedId(context);
    const requestedSeedId =
      typeof input.seedId === "string" && input.seedId.trim().length > 0
        ? input.seedId.trim()
        : seedId;
    if (requestedSeedId !== seedId) {
      throw new ApplicationError("VALIDATION_ERROR", "种子未被本次任务授权", 403);
    }

    const seed = await this.dependencies.seedStorage.findSeedById(seedId);
    if (seed === null) {
      throw new ApplicationError("NOT_FOUND", "种子不存在", 404);
    }
    return {
      content: {
        seedId: seed.id,
        title: seed.title,
        markdown: await this.dependencies.seedContentAccess.readSeedMarkdown(
          seed.contentLocation,
        ),
      },
    };
  }
}

export class ReadGeneEvidenceTool implements ToolContract {
  public readonly name = READ_GENE_EVIDENCE_TOOL_NAME;
  public readonly description = "Read authorized fruit and publication evidence for gene extraction.";
  public readonly readOnly = true;

  public constructor(
    private readonly dependencies: {
      fruitStorage: FruitStoragePort;
      fruitContentAccess: FruitMarkdownContentAccessPort;
      publicationStorage?: PublicationStoragePort;
      feedbackStorage?: FeedbackStoragePort;
    },
  ) {}

  public async execute(
    input: ToolInput,
    context: AgentTaskContext,
  ): Promise<ToolOutput> {
    const evidenceSources = filterEvidenceSources(context, input.sourceIds);
    const fruitEvidence = readFruitEvidenceInputs(context);
    const fruitEvidenceById = new Map(
      fruitEvidence.map((item) => [item.fruitId, item]),
    );
    const evidence = [];
    const unsupported = [];

    for (const source of evidenceSources) {
      if (
        source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.fruitSelected ||
        source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.fruitEliminated
      ) {
        const allowedFruit = fruitEvidenceById.get(source.sourceId);
        if (allowedFruit === undefined) {
          throw new ApplicationError("VALIDATION_ERROR", "果实证据未被本次任务授权", 403);
        }
        const fruit = await this.dependencies.fruitStorage.findFruitById(source.sourceId);
        if (fruit === null) {
          throw new ApplicationError("NOT_FOUND", "果实证据不存在", 404);
        }
        evidence.push({
          evidenceType: source.sourceType,
          evidenceDirection:
            source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.fruitSelected
              ? "positive"
              : "negative",
          strength: source.strength,
          fruit: {
            fruitId: fruit.id,
            selectionState: fruit.selectionState,
            summary: fruit.summary,
            geneTags: [...fruit.geneTags],
            markdown: await this.dependencies.fruitContentAccess.readFruitMarkdown(
              fruit.contentLocation,
            ),
          },
        });
        continue;
      }

      if (source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.publication) {
        if (this.dependencies.publicationStorage === undefined) {
          unsupported.push({
            evidenceType: source.sourceType,
            sourceId: source.sourceId,
            reason: "发布验证模块尚未装配",
          });
          continue;
        }
        const publication =
          await this.dependencies.publicationStorage.findPublicationRecordById(
            source.sourceId,
          );
        if (publication === null) {
          throw new ApplicationError("NOT_FOUND", "发布记录证据不存在", 404);
        }
        evidence.push({
          evidenceType: source.sourceType,
          evidenceDirection: "neutral",
          strength: source.strength,
          publication: {
            publicationRecordId: publication.id,
            fruitId: publication.fruitId,
            publisherType: publication.publisherType,
            publicationTarget: publication.publicationTarget,
            publicationEvidence: publication.publicationEvidence,
            publicationNote: publication.publicationNote,
            publishedAt: publication.publishedAt,
          },
          interpretationBoundary: "发布记录只证明内容已进入外部验证，不代表表现好坏。",
        });
        continue;
      }

      if (source.sourceType === GENE_EVIDENCE_SOURCE_TYPES.feedback) {
        if (this.dependencies.feedbackStorage === undefined) {
          unsupported.push({
            evidenceType: source.sourceType,
            sourceId: source.sourceId,
            reason: "数据回流模块尚未装配",
          });
          continue;
        }
        if (this.dependencies.publicationStorage === undefined) {
          unsupported.push({
            evidenceType: source.sourceType,
            sourceId: source.sourceId,
            reason: "发布验证模块尚未装配",
          });
          continue;
        }
        const snapshot =
          await this.dependencies.feedbackStorage.findFeedbackSnapshotById(
            source.sourceId,
          );
        if (snapshot === null) {
          throw new ApplicationError("NOT_FOUND", "反馈证据不存在", 404);
        }
        const publication =
          await this.dependencies.publicationStorage.findPublicationRecordById(
            snapshot.publicationRecordId,
          );
        if (publication === null) {
          throw new ApplicationError("NOT_FOUND", "反馈证据关联的发布记录不存在", 404);
        }
        const monitorAttachment =
          await this.dependencies.feedbackStorage.findMonitorAttachmentById(
            snapshot.monitorAttachmentId,
          );
        evidence.push({
          evidenceType: source.sourceType,
          evidenceDirection: "neutral",
          strength: source.strength,
          publication: {
            publicationRecordId: publication.id,
            fruitId: publication.fruitId,
            publisherType: publication.publisherType,
            publicationTarget: publication.publicationTarget,
            publicationEvidence: publication.publicationEvidence,
            publicationNote: publication.publicationNote,
            publishedAt: publication.publishedAt,
          },
          feedback: {
            snapshotId: snapshot.id,
            publicationRecordId: snapshot.publicationRecordId,
            monitorAttachmentId: snapshot.monitorAttachmentId,
            monitorType: monitorAttachment?.monitorType ?? null,
            performanceData: structuredClone(snapshot.performanceData),
            userObservation: snapshot.userObservation,
            capturedAt: snapshot.capturedAt,
          },
          interpretationBoundary:
            "反馈快照只记录外部表现事实和用户观察，不代表系统已经判断成败或计算适应度。",
        });
        continue;
      }

      unsupported.push({
        evidenceType: source.sourceType,
        sourceId: source.sourceId,
        reason: "该证据类型暂未接入只读 Tool",
      });
    }

    return {
      content: {
        evidence,
        unsupportedEvidence: unsupported,
        nutrientContext: {
          unavailableInThisChange: true,
          reason: "营养库读取由营养库模块完成后接入。",
        },
      },
    };
  }
}

export class ReadReferableGeneInsightsTool implements ToolContract {
  public readonly name = READ_REFERABLE_GENE_INSIGHTS_TOOL_NAME;
  public readonly description = "Read referable gene insights authorized by a gene extraction task.";
  public readonly readOnly = true;

  public constructor(
    private readonly dependencies: {
      geneStorage: GeneStoragePort;
      geneContentAccess: GeneMarkdownContentAccessPort;
    },
  ) {}

  public async execute(
    input: ToolInput,
    context: AgentTaskContext,
  ): Promise<ToolOutput> {
    const seedId = readTaskSeedId(context);
    const authorizedInsights = readReferableInsightInputs(context);
    const authorizedIds = new Set(authorizedInsights.map((item) => item.insightId));
    const requestedIds = readRequestedIds(input.insightIds, authorizedIds);
    const insights = [];

    for (const insightId of requestedIds) {
      const insight = await this.dependencies.geneStorage.findInsightById(insightId);
      if (insight === null) {
        throw new ApplicationError("NOT_FOUND", "基因经验不存在", 404);
      }
      if (insight.seedId !== seedId) {
        throw new ApplicationError("VALIDATION_ERROR", "基因经验不属于本次任务种子", 403);
      }
      if (insight.status !== GENE_INSIGHT_STATUSES.active) {
        continue;
      }
      insights.push({
        insightId: insight.id,
        title: insight.title,
        lineage: insight.lineage,
        niche: insight.niche,
        performance:
          (await this.dependencies.geneStorage.findPerformanceSummaryByInsightId(
            insight.id,
          )) ?? {
            insightId: insight.id,
            seedId: insight.seedId,
            usageCount: 0,
            positiveCount: 0,
            neutralCount: 0,
            negativeCount: 0,
            score: 0,
            lastUsedAt: null,
            updatedAt: "",
          },
        markdown: await this.dependencies.geneContentAccess.readGeneInsightMarkdown(
          insight.contentLocation,
        ),
      });
    }

    return {
      content: {
        insights,
      },
    };
  }
}

function readTaskSeedId(context: AgentTaskContext): string {
  return requireString(context.input.seedId, "基因汲取任务缺少种子");
}

function filterEvidenceSources(
  context: AgentTaskContext,
  requestedIdsInput: unknown,
): GeneEvidenceSource[] {
  const evidenceSources = normalizeEvidenceSources(context.input.evidenceSources);
  if (requestedIdsInput === undefined) {
    return evidenceSources;
  }
  if (!Array.isArray(requestedIdsInput)) {
    throw new ApplicationError("VALIDATION_ERROR", "证据请求格式不正确", 400);
  }
  const requestedIds = new Set(
    requestedIdsInput.map((item) => requireString(item, "证据来源不能为空")),
  );
  const knownIds = new Set(evidenceSources.map((source) => source.sourceId));
  for (const id of requestedIds) {
    if (!knownIds.has(id)) {
      throw new ApplicationError("VALIDATION_ERROR", "证据来源未被本次任务授权", 403);
    }
  }
  return evidenceSources.filter((source) => requestedIds.has(source.sourceId));
}

function normalizeEvidenceSources(value: unknown): GeneEvidenceSource[] {
  if (!Array.isArray(value)) {
    throw new ApplicationError("VALIDATION_ERROR", "基因汲取任务缺少证据来源", 400);
  }
  return value.map((item) => {
    const record = requireRecord(item, "证据来源格式不正确");
    const sourceType = record.sourceType;
    if (
      sourceType !== GENE_EVIDENCE_SOURCE_TYPES.fruitSelected &&
      sourceType !== GENE_EVIDENCE_SOURCE_TYPES.fruitEliminated &&
      sourceType !== GENE_EVIDENCE_SOURCE_TYPES.publication &&
      sourceType !== GENE_EVIDENCE_SOURCE_TYPES.feedback
    ) {
      throw new ApplicationError("VALIDATION_ERROR", "证据来源类型不正确", 400);
    }
    const strength = record.strength;
    if (strength !== "weak" && strength !== "medium" && strength !== "strong") {
      throw new ApplicationError("VALIDATION_ERROR", "证据强度不正确", 400);
    }
    return {
      sourceType,
      sourceId: requireString(record.sourceId, "证据来源不能为空"),
      strength,
    };
  });
}

function readFruitEvidenceInputs(
  context: AgentTaskContext,
): Array<{
  fruitId: string;
  selectionState: string;
  contentLocation: string;
  summary: string;
  geneTags: string[];
}> {
  if (!Array.isArray(context.input.fruitEvidence)) {
    return [];
  }
  return context.input.fruitEvidence.map((item) => {
    const record = requireRecord(item, "果实证据格式不正确");
    return {
      fruitId: requireString(record.fruitId, "果实证据不能为空"),
      selectionState: typeof record.selectionState === "string" ? record.selectionState : "",
      contentLocation: typeof record.contentLocation === "string" ? record.contentLocation : "",
      summary: typeof record.summary === "string" ? record.summary : "",
      geneTags: Array.isArray(record.geneTags)
        ? record.geneTags.filter((tag): tag is string => typeof tag === "string")
        : [],
    };
  });
}

function readReferableInsightInputs(
  context: AgentTaskContext,
): Array<{ insightId: string }> {
  if (!Array.isArray(context.input.referableGeneInsights)) {
    return [];
  }
  return context.input.referableGeneInsights.map((item) => {
    const record = requireRecord(item, "可引用基因经验格式不正确");
    return {
      insightId: requireString(record.insightId, "基因经验不能为空"),
    };
  });
}

function readRequestedIds(
  value: unknown,
  authorizedIds: Set<string>,
): string[] {
  if (value === undefined) {
    return [...authorizedIds];
  }
  if (!Array.isArray(value)) {
    throw new ApplicationError("VALIDATION_ERROR", "基因经验请求格式不正确", 400);
  }
  const requestedIds = value.map((item) => requireString(item, "基因经验不能为空"));
  for (const id of requestedIds) {
    if (!authorizedIds.has(id)) {
      throw new ApplicationError("VALIDATION_ERROR", "基因经验未被本次任务授权", 403);
    }
  }
  return requestedIds;
}
