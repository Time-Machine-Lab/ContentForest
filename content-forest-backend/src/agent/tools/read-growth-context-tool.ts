import type { FruitMarkdownContentAccessPort } from "../../content-access/ports/fruit-markdown-content-access-port.js";
import type { GeneMarkdownContentAccessPort } from "../../content-access/ports/gene-markdown-content-access-port.js";
import type { NutrientMarkdownContentAccessPort } from "../../content-access/ports/nutrient-markdown-content-access-port.js";
import type { SeedMarkdownContentAccessPort } from "../../content-access/ports/seed-markdown-content-access-port.js";
import { GENE_INSIGHT_STATUSES } from "../../modules/gene/domain/gene-types.js";
import { NUTRIENT_CARD_STATUSES } from "../../modules/nutrient/domain/nutrient-types.js";
import { ApplicationError } from "../../shared/errors/application-error.js";
import type { FruitStoragePort } from "../../storage/ports/fruit-storage-port.js";
import type { GeneStoragePort } from "../../storage/ports/gene-storage-port.js";
import type { NutrientStoragePort } from "../../storage/ports/nutrient-storage-port.js";
import type { SeedStoragePort } from "../../storage/ports/seed-storage-port.js";
import type { MediaStoragePort } from "../../storage/ports/media-storage-port.js";
import type { AgentTaskContext } from "../runtime/agent-task.js";
import type { ToolContract, ToolInput, ToolOutput } from "../runtime/tool-contract.js";
import {
  readAuthorizedResourceRefs,
  readSourceNodeRef,
} from "./agent-tool-utils.js";

export const READ_GROWTH_SOURCE_NODE_TOOL_NAME = "read_growth_source_node";
export const READ_GROWTH_RESOURCES_TOOL_NAME = "read_growth_resources";

export class ReadGrowthSourceNodeTool implements ToolContract {
  public readonly name = READ_GROWTH_SOURCE_NODE_TOOL_NAME;
  public readonly description = "Read the authorized growth source seed or fruit markdown.";
  public readonly readOnly = true;

  public constructor(
    private readonly dependencies: {
      seedStorage: SeedStoragePort;
      fruitStorage: FruitStoragePort;
      seedContentAccess: SeedMarkdownContentAccessPort;
      fruitContentAccess: FruitMarkdownContentAccessPort;
    },
  ) {}

  public async execute(
    _input: ToolInput,
    context: AgentTaskContext,
  ): Promise<ToolOutput> {
    const source = readSourceNodeRef(context);
    if (source.nodeType === "seed") {
      const seed = await this.dependencies.seedStorage.findSeedById(
        String(context.input.seedId),
      );
      if (seed === null || seed.rootNodeId !== source.nodeId) {
        throw new ApplicationError("NOT_FOUND", "来源种子不存在", 404);
      }
      return {
        content: {
          nodeType: "seed",
          nodeId: source.nodeId,
          title: seed.title,
          markdown: await this.dependencies.seedContentAccess.readSeedMarkdown(
            seed.contentLocation,
          ),
        },
      };
    }

    const fruit = await this.dependencies.fruitStorage.findFruitById(source.nodeId);
    if (fruit === null) {
      throw new ApplicationError("NOT_FOUND", "来源果实不存在", 404);
    }
    return {
      content: {
        nodeType: "fruit",
        nodeId: source.nodeId,
        generatorId: fruit.generatorId,
        summary: fruit.summary,
        geneTags: [...fruit.geneTags],
        markdown: await this.dependencies.fruitContentAccess.readFruitMarkdown(
          fruit.contentLocation,
        ),
      },
    };
  }
}

export class ReadGrowthResourcesTool implements ToolContract {
  public readonly name = READ_GROWTH_RESOURCES_TOOL_NAME;
  public readonly description = "Read authorized nutrient and gene references for branch growth.";
  public readonly readOnly = true;

  public constructor(
    private readonly dependencies: {
      geneStorage?: GeneStoragePort;
      geneContentAccess?: GeneMarkdownContentAccessPort;
      nutrientStorage?: NutrientStoragePort;
      nutrientContentAccess?: NutrientMarkdownContentAccessPort;
      mediaStorage?: MediaStoragePort;
    } = {},
  ) {}

  public async execute(
    _input: ToolInput,
    context: AgentTaskContext,
  ): Promise<ToolOutput> {
    const refs = readAuthorizedResourceRefs(context);
    const nutrients = [];
    if (
      this.dependencies.nutrientStorage !== undefined &&
      this.dependencies.nutrientContentAccess !== undefined &&
      typeof context.input.seedId === "string"
    ) {
      const referableNutrients =
        await this.dependencies.nutrientStorage.listReferableContents(
          context.input.seedId,
        );
      for (const ref of refs.filter((item) => item.resourceType === "nutrient")) {
        const nutrient = referableNutrients.find(
          (item) => item.content.id === ref.resourceId,
        );
        if (nutrient === undefined) {
          continue;
        }
        nutrients.push({
          resourceType: "nutrient",
          resourceId: ref.resourceId,
          title: nutrient.content.title,
          library: {
            id: nutrient.library.id,
            name: nutrient.library.name,
            scope: nutrient.library.scope,
            seedId: nutrient.library.seedId,
          },
          markdown:
            await this.dependencies.nutrientContentAccess.readNutrientMarkdown(
              nutrient.content.contentLocation,
            ),
        });
      }
    }
    const temporaryNutrientCards = [];
    if (
      this.dependencies.nutrientStorage !== undefined &&
      this.dependencies.nutrientContentAccess !== undefined &&
      typeof context.input.seedId === "string"
    ) {
      for (const ref of refs.filter((item) => item.resourceType === "nutrient_card")) {
        const card = await this.dependencies.nutrientStorage.findCardById(
          ref.resourceId,
        );
        if (
          card === null ||
          card.seedId !== context.input.seedId ||
          card.status !== NUTRIENT_CARD_STATUSES.unsettled
        ) {
          continue;
        }
        temporaryNutrientCards.push({
          resourceType: "nutrient_card",
          resourceId: ref.resourceId,
          title: card.title,
          status: card.status,
          candidate: true,
          markdown:
            await this.dependencies.nutrientContentAccess.readNutrientMarkdown(
              card.contentLocation,
            ),
        });
      }
    }
    const genes = [];
    for (const ref of refs.filter((item) => item.resourceType === "gene")) {
      if (
        this.dependencies.geneStorage === undefined ||
        this.dependencies.geneContentAccess === undefined
      ) {
        continue;
      }
      const insight = await this.dependencies.geneStorage.findInsightById(
        ref.resourceId,
      );
      if (
        insight === null ||
        insight.seedId !== context.input.seedId ||
        insight.status !== GENE_INSIGHT_STATUSES.active
      ) {
        continue;
      }
      genes.push({
        resourceType: "gene",
        resourceId: ref.resourceId,
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
    const mediaAssets = [];
    if (
      this.dependencies.mediaStorage !== undefined &&
      typeof context.input.seedId === "string"
    ) {
      for (const ref of refs.filter((item) => item.resourceType === "media")) {
        const asset = await this.dependencies.mediaStorage.findMediaAssetById(
          ref.resourceId,
        );
        if (asset === null || asset.seedId !== context.input.seedId) {
          continue;
        }
        mediaAssets.push({
          resourceType: "media",
          resourceId: ref.resourceId,
          usage: ref.usage ?? "",
          mediaType: asset.mediaType,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          sizeBytes: asset.sizeBytes,
          contentUrl: `/api/media-assets/${encodeURIComponent(asset.id)}/content`,
          note:
            asset.mediaType === "video"
              ? "视频可作为资源引用，但不代表当前 Agent 一定能理解视频内容。"
              : "图片可作为本轮授权媒体引用。",
        });
      }
    }
    return {
      content: {
        requestedRefs: refs,
        nutrients,
        temporaryNutrientCards,
        mediaAssets,
        genes,
      },
    };
  }
}
