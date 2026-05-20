import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { FruitService } from "../../fruit/application/fruit-service.js";
import type { FruitSummary, ParentNodeRef } from "../../fruit/domain/fruit-types.js";
import type { GeneService } from "../../gene/application/gene-service.js";
import type { GeneratorService } from "../../generator/application/generator-service.js";
import type { GrowthService } from "../../growth/application/growth-service.js";
import type { GrowthFailedInput, GrowthSourceNodeRef } from "../../growth/domain/growth-types.js";
import type { MediaService } from "../../media/application/media-service.js";
import type { NutrientService } from "../../nutrient/application/nutrient-service.js";
import type { SeedService } from "../../seed/application/seed-service.js";
import { SEED_ARCHIVE_STATES } from "../../seed/domain/seed-types.js";
import {
  toWorkspaceGeneLibrarySummary,
  toWorkspaceGeneSuggestionSummary,
} from "../domain/workspace-types.js";
import type {
  WorkspaceEdge,
  WorkspaceFailedInputHint,
  WorkspaceFruitNode,
  WorkspaceGeneExtractionHub,
  WorkspaceNode,
  WorkspaceNodeRef,
  WorkspaceNutrientSuggestionHub,
  WorkspaceResources,
  WorkspaceSeedBriefSummary,
  WorkspaceSeedSummary,
  WorkspaceSnapshot,
} from "../domain/workspace-types.js";

export interface WorkspaceServiceDependencies {
  seedService: SeedService;
  fruitService: FruitService;
  growthService: GrowthService;
  generatorService: GeneratorService;
  nutrientService: NutrientService;
  mediaService?: MediaService;
  geneService: GeneService;
  maxTreeDepth?: number;
}

export class WorkspaceService {
  private readonly seedService: SeedService;
  private readonly fruitService: FruitService;
  private readonly growthService: GrowthService;
  private readonly generatorService: GeneratorService;
  private readonly nutrientService: NutrientService;
  private readonly mediaService: MediaService | undefined;
  private readonly geneService: GeneService;
  private readonly maxTreeDepth: number;

  public constructor(dependencies: WorkspaceServiceDependencies) {
    this.seedService = dependencies.seedService;
    this.fruitService = dependencies.fruitService;
    this.growthService = dependencies.growthService;
    this.generatorService = dependencies.generatorService;
    this.nutrientService = dependencies.nutrientService;
    this.mediaService = dependencies.mediaService;
    this.geneService = dependencies.geneService;
    this.maxTreeDepth = dependencies.maxTreeDepth ?? 100;
  }

  public async getWorkspaceSnapshot(seedId: string): Promise<WorkspaceSnapshot> {
    const seedDetail = await this.seedService.getSeed(seedId);
    const seed = this.toWorkspaceSeedSummary(seedDetail);
    const rootRef: GrowthSourceNodeRef = {
      nodeType: "seed",
      nodeId: seed.rootNodeId,
    };
    const nodes: WorkspaceNode[] = [
      {
        nodeType: "seed",
        nodeId: seed.rootNodeId,
        seedId: seed.id,
        title: seed.title,
        archiveState: seed.archiveState,
        growth: await this.growthService.getSourceStatus(rootRef),
        failedInput: this.toFailedInputHint(
          await this.growthService.getLatestFailedInput(rootRef),
        ),
      },
    ];
    const edges: WorkspaceEdge[] = [];

    await this.appendFruitSubtree(rootRef, nodes, edges, new Set(), 0);

    return {
      seed,
      workspaceReadOnly: seed.archiveState === SEED_ARCHIVE_STATES.archived,
      seedBrief: await this.getSeedBriefSummary(seed.id),
      nodes,
      edges,
      resources: await this.getResources(seed.id),
      nutrientSuggestionHub: await this.getNutrientSuggestionHub(seed.id),
      geneExtractionHub: await this.getGeneExtractionHub(seed.id),
    };
  }

  private async appendFruitSubtree(
    parentNodeRef: ParentNodeRef,
    nodes: WorkspaceNode[],
    edges: WorkspaceEdge[],
    visitedFruitIds: Set<string>,
    depth: number,
  ): Promise<void> {
    if (depth > this.maxTreeDepth) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "内容树层级过深，工作区快照无法聚合",
        500,
      );
    }

    const children = await this.fruitService.listChildFruits(parentNodeRef);
    for (const fruit of children) {
      if (visitedFruitIds.has(fruit.id)) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "内容树存在循环父子关系，工作区快照无法聚合",
          500,
        );
      }
      visitedFruitIds.add(fruit.id);
      nodes.push(await this.toFruitNode(fruit));
      edges.push({
        id: `${parentNodeRef.nodeType}:${parentNodeRef.nodeId}->fruit:${fruit.id}`,
        parentNodeRef: this.toWorkspaceNodeRef(parentNodeRef),
        childNodeRef: {
          nodeType: "fruit",
          nodeId: fruit.id,
        },
      });
      await this.appendFruitSubtree(
        { nodeType: "fruit", nodeId: fruit.id },
        nodes,
        edges,
        visitedFruitIds,
        depth + 1,
      );
    }
  }

  private async toFruitNode(fruit: FruitSummary): Promise<WorkspaceFruitNode> {
    const sourceNodeRef: GrowthSourceNodeRef = {
      nodeType: "fruit",
      nodeId: fruit.id,
    };
    return {
      nodeType: "fruit",
      nodeId: fruit.id,
      fruitId: fruit.id,
      selectionState: fruit.selectionState,
      parentNodeRef: { ...fruit.parentNodeRef },
      contentLocation: fruit.contentLocation,
      generatorId: fruit.generatorId,
      summary: fruit.summary,
      geneTags: [...fruit.geneTags],
      media: fruit.media.map((media) => ({ ...media })),
      createdAt: fruit.createdAt,
      updatedAt: fruit.updatedAt,
      growth: await this.growthService.getSourceStatus(sourceNodeRef),
      failedInput: this.toFailedInputHint(
        await this.growthService.getLatestFailedInput(sourceNodeRef),
      ),
    };
  }

  private async getResources(seedId: string): Promise<WorkspaceResources> {
    const [generators, nutrients, mediaAssets, geneInsights] = await Promise.all([
      this.generatorService.listSelectableGenerators(),
      this.nutrientService.listReferableContents(seedId),
      this.mediaService?.listReferableMediaAssets(seedId) ?? Promise.resolve([]),
      this.geneService.listReferableInsights(seedId),
    ]);

    return {
      generators,
      nutrients,
      mediaAssets,
      geneInsights,
    };
  }

  private async getNutrientSuggestionHub(
    seedId: string,
  ): Promise<WorkspaceNutrientSuggestionHub> {
    const pendingSuggestions = await this.nutrientService.listGapSuggestions(seedId, {
      status: "pending",
    });
    return {
      seedId,
      pendingSuggestions,
      stats: {
        pendingSuggestionCount: pendingSuggestions.length,
      },
      actions: {
        canReviewSuggestions: pendingSuggestions.length > 0,
        canOpenNutrientWorkbench: true,
      },
    };
  }

  private async getGeneExtractionHub(
    seedId: string,
  ): Promise<WorkspaceGeneExtractionHub> {
    const [
      geneLibrary,
      pendingReminders,
      runningExtractionTasks,
      pendingSuggestions,
      insights,
      referableInsights,
    ] = await Promise.all([
      this.geneService.getSeedGeneLibrary(seedId),
      this.geneService.listPendingReminders(seedId),
      this.geneService.listRunningExtractionTasks(seedId),
      this.geneService.listPendingSuggestions(seedId),
      this.geneService.listInsights(seedId),
      this.geneService.listReferableInsights(seedId),
    ]);
    const runningTaskByReminderId = new Map(
      runningExtractionTasks
        .filter((task) => task.reminderId !== null && task.reminderId !== undefined)
        .map((task) => [task.reminderId as string, task.id]),
    );

    return {
      seedId,
      geneLibrary: toWorkspaceGeneLibrarySummary(
        geneLibrary,
        insights.length,
        referableInsights.length,
      ),
      pendingReminders: pendingReminders.map((reminder) => ({
        ...reminder,
        evidenceSources: reminder.evidenceSources.map((source) => ({ ...source })),
        runningTaskId: runningTaskByReminderId.get(reminder.id) ?? null,
      })),
      pendingSuggestions: pendingSuggestions.map(toWorkspaceGeneSuggestionSummary),
      stats: {
        pendingReminderCount: pendingReminders.length,
        pendingSuggestionCount: pendingSuggestions.length,
        insightCount: insights.length,
        referableInsightCount: referableInsights.length,
      },
      actions: {
        canStartExtraction: pendingReminders.length > 0,
        canReviewSuggestions: pendingSuggestions.length > 0,
        canOpenGeneLibrary: true,
      },
    };
  }

  private toFailedInputHint(
    failedInput: GrowthFailedInput | null,
  ): WorkspaceFailedInputHint {
    if (failedInput === null) {
      return {
        hasFailedInput: false,
        taskId: null,
        failureReason: null,
        updatedAt: null,
      };
    }
    return {
      hasFailedInput: true,
      taskId: failedInput.taskId,
      failureReason: failedInput.failureReason,
      updatedAt: failedInput.updatedAt,
    };
  }

  private toWorkspaceSeedSummary(seed: WorkspaceSeedSummary): WorkspaceSeedSummary {
    return {
      id: seed.id,
      title: seed.title,
      archiveState: seed.archiveState,
      contentLocation: seed.contentLocation,
      rootNodeId: seed.rootNodeId,
      createdAt: seed.createdAt,
      updatedAt: seed.updatedAt,
      archivedAt: seed.archivedAt,
    };
  }

  private async getSeedBriefSummary(
    seedId: string,
  ): Promise<WorkspaceSeedBriefSummary> {
    const summary = await this.seedService.getSeedBriefSummary(seedId);
    return {
      seedId: summary.seedId,
      hasBrief: summary.hasBrief,
      id: summary.id,
      contentLocation: summary.contentLocation,
      updatedAt: summary.updatedAt,
    };
  }

  private toWorkspaceNodeRef(nodeRef: ParentNodeRef): WorkspaceNodeRef {
    return {
      nodeType: nodeRef.nodeType,
      nodeId: nodeRef.nodeId,
    };
  }
}
