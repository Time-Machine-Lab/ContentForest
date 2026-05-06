import type { FruitMarkdownContentAccessPort } from "../../../content-access/ports/fruit-markdown-content-access-port.js";
import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type {
  FruitRecord,
  FruitStoragePort,
} from "../../../storage/ports/fruit-storage-port.js";
import {
  FRUIT_SELECTION_STATES,
  type FruitDetail,
  type FruitGrowthSourceRef,
  type FruitPublishEligibility,
  type FruitSelectionState,
  type FruitSummary,
  type ParentNodeRef,
} from "../domain/fruit-types.js";

export interface FruitCandidateInput {
  markdown: string;
  parentNodeRef: ParentNodeRef;
  summary?: string;
  geneTags?: string[];
}

export interface UpdateFruitContentInput {
  markdown: string;
}

export interface FruitServiceDependencies {
  storage: FruitStoragePort;
  contentAccess: FruitMarkdownContentAccessPort;
  idGenerator?: IdGenerator;
  now?: () => Date;
}

export class FruitService {
  private readonly storage: FruitStoragePort;
  private readonly contentAccess: FruitMarkdownContentAccessPort;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;

  public constructor(dependencies: FruitServiceDependencies) {
    this.storage = dependencies.storage;
    this.contentAccess = dependencies.contentAccess;
    this.idGenerator = dependencies.idGenerator ?? new RandomIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
  }

  public async createFruitFromCandidate(
    input: FruitCandidateInput,
  ): Promise<FruitDetail> {
    const markdown = this.requireNonBlank(
      input.markdown,
      "果实 Markdown 正文不能为空",
    );
    const parentNodeRef = this.requireParentNodeRef(input.parentNodeRef);
    const fruitId = this.idGenerator.nextId("fruit");
    const timestamp = this.timestamp();
    const contentLocation = await this.contentAccess.createFruitMarkdown({
      fruitId,
      markdown,
    });

    const record: FruitRecord = {
      id: fruitId,
      selectionState: FRUIT_SELECTION_STATES.candidate,
      parentNodeRef,
      contentLocation,
      summary: this.normalizeOptionalText(input.summary),
      geneTags: this.normalizeGeneTags(input.geneTags),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      await this.storage.createFruit(record);
    } catch (error) {
      await this.contentAccess.removeFruitMarkdown(contentLocation);
      throw error;
    }

    return this.toDetail(record, markdown);
  }

  public async getFruit(fruitId: string): Promise<FruitDetail> {
    const record = await this.requireFruit(fruitId);
    const markdown = await this.contentAccess.readFruitMarkdown(
      record.contentLocation,
    );
    return this.toDetail(record, markdown);
  }

  public async updateFruitContent(
    fruitId: string,
    input: UpdateFruitContentInput,
  ): Promise<FruitDetail> {
    const markdown = this.requireNonBlank(
      input.markdown,
      "果实 Markdown 正文不能为空",
    );
    const record = await this.requireFruit(fruitId);
    await this.contentAccess.updateFruitMarkdown(record.contentLocation, markdown);
    await this.storage.saveFruit({
      ...record,
      updatedAt: this.timestamp(),
    });
    return this.getFruit(fruitId);
  }

  public async selectFruit(fruitId: string): Promise<FruitDetail> {
    return this.changeSelectionState(fruitId, FRUIT_SELECTION_STATES.selected);
  }

  public async eliminateFruit(fruitId: string): Promise<FruitDetail> {
    return this.changeSelectionState(fruitId, FRUIT_SELECTION_STATES.eliminated);
  }

  public async restoreFruitToCandidate(fruitId: string): Promise<FruitDetail> {
    return this.changeSelectionState(fruitId, FRUIT_SELECTION_STATES.candidate);
  }

  public async listChildFruits(
    parentNodeRef: ParentNodeRef,
  ): Promise<FruitSummary[]> {
    const records = await this.storage.listChildFruits(
      this.requireParentNodeRef(parentNodeRef),
    );
    return records.map((record) => this.toSummary(record));
  }

  public async getPublishEligibility(
    fruitId: string,
  ): Promise<FruitPublishEligibility> {
    const record = await this.requireFruit(fruitId);
    const canPublish = record.selectionState === FRUIT_SELECTION_STATES.selected;
    return {
      fruitId: record.id,
      canPublish,
      reason: canPublish ? null : "只有已选择果实才能发布",
    };
  }

  public async assertPublishable(fruitId: string): Promise<void> {
    const eligibility = await this.getPublishEligibility(fruitId);
    if (!eligibility.canPublish) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        eligibility.reason ?? "该果实不能发布",
        400,
      );
    }
  }

  public async getGrowthSourceRef(
    fruitId: string,
  ): Promise<FruitGrowthSourceRef> {
    const record = await this.requireFruit(fruitId);
    return {
      fruitId: record.id,
      nodeId: record.id,
      nodeType: "fruit",
      contentLocation: record.contentLocation,
    };
  }

  private async changeSelectionState(
    fruitId: string,
    selectionState: FruitSelectionState,
  ): Promise<FruitDetail> {
    const record = await this.requireFruit(fruitId);
    await this.storage.saveFruit({
      ...record,
      selectionState,
      updatedAt: this.timestamp(),
    });
    return this.getFruit(fruitId);
  }

  private async requireFruit(fruitId: string): Promise<FruitRecord> {
    const record = await this.storage.findFruitById(fruitId);
    if (record === null) {
      throw new ApplicationError("NOT_FOUND", "果实不存在", 404);
    }
    return record;
  }

  private requireParentNodeRef(parentNodeRef: ParentNodeRef): ParentNodeRef {
    if (parentNodeRef === undefined || parentNodeRef === null) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "果实父节点不能为空",
        400,
      );
    }
    const nodeId = this.requireNonBlank(
      parentNodeRef.nodeId,
      "果实父节点不能为空",
    );
    if (parentNodeRef.nodeType !== "seed" && parentNodeRef.nodeType !== "fruit") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "果实父节点类型必须是 seed 或 fruit",
        400,
      );
    }
    return {
      nodeId,
      nodeType: parentNodeRef.nodeType,
    };
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

  private normalizeGeneTags(value: string[] | undefined): string[] {
    return [
      ...new Set(
        (value ?? [])
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      ),
    ];
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private toSummary(record: FruitRecord): FruitSummary {
    return {
      id: record.id,
      selectionState: record.selectionState,
      parentNodeRef: { ...record.parentNodeRef },
      contentLocation: record.contentLocation,
      summary: record.summary,
      geneTags: [...record.geneTags],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private toDetail(record: FruitRecord, markdown: string): FruitDetail {
    return {
      ...this.toSummary(record),
      markdown,
    };
  }
}
