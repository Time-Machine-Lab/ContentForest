import type { FruitMarkdownContentAccessPort } from "../../content-access/ports/fruit-markdown-content-access-port.js";
import type { GeneMarkdownContentAccessPort } from "../../content-access/ports/gene-markdown-content-access-port.js";
import type { SeedMarkdownContentAccessPort } from "../../content-access/ports/seed-markdown-content-access-port.js";
import { GENE_INSIGHT_STATUSES } from "../../modules/gene/domain/gene-types.js";
import { ApplicationError } from "../../shared/errors/application-error.js";
import type { FruitStoragePort } from "../../storage/ports/fruit-storage-port.js";
import type { GeneStoragePort } from "../../storage/ports/gene-storage-port.js";
import type { SeedStoragePort } from "../../storage/ports/seed-storage-port.js";
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
    } = {},
  ) {}

  public async execute(
    _input: ToolInput,
    context: AgentTaskContext,
  ): Promise<ToolOutput> {
    const refs = readAuthorizedResourceRefs(context);
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
        markdown: await this.dependencies.geneContentAccess.readGeneInsightMarkdown(
          insight.contentLocation,
        ),
      });
    }
    return {
      content: {
        requestedRefs: refs,
        nutrients: refs
          .filter((ref) => ref.resourceType === "nutrient")
          .map((ref) => ({
            resourceType: "nutrient",
            resourceId: ref.resourceId,
            unavailableInPhaseOne: true,
          })),
        genes,
      },
    };
  }
}
