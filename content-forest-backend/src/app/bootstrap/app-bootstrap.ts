import type { SeedController } from "../../interface/http/seed-controller.js";
import type { GeneratorController } from "../../interface/http/generator-controller.js";
import type { FruitController } from "../../interface/http/fruit-controller.js";
import type { GeneController } from "../../interface/http/gene-controller.js";
import type { GrowthController } from "../../interface/http/growth-controller.js";
import type { PublicationController } from "../../interface/http/publication-controller.js";
import type { FeedbackController } from "../../interface/http/feedback-controller.js";
import type { NutrientController } from "../../interface/http/nutrient-controller.js";
import type { WorkspaceController } from "../../interface/http/workspace-controller.js";
import { GeneratorController as HttpGeneratorController } from "../../interface/http/generator-controller.js";
import { FruitController as HttpFruitController } from "../../interface/http/fruit-controller.js";
import { GeneController as HttpGeneController } from "../../interface/http/gene-controller.js";
import { GrowthController as HttpGrowthController } from "../../interface/http/growth-controller.js";
import { PublicationController as HttpPublicationController } from "../../interface/http/publication-controller.js";
import { FeedbackController as HttpFeedbackController } from "../../interface/http/feedback-controller.js";
import { NutrientController as HttpNutrientController } from "../../interface/http/nutrient-controller.js";
import { SeedController as HttpSeedController } from "../../interface/http/seed-controller.js";
import { WorkspaceController as HttpWorkspaceController } from "../../interface/http/workspace-controller.js";
import { AgentRuntime } from "../../agent/runtime/agent-runtime.js";
import { createAgentExchangeLogSink } from "../../agent/runtime/agent-exchange-log.js";
import { FakeLlmAdapter } from "../../agent/runtime/fake-llm-adapter.js";
import type { LlmAdapter } from "../../agent/runtime/llm-adapter.js";
import { OpenAiCompatibleLlmAdapter } from "../../agent/runtime/openai-compatible-llm-adapter.js";
import { SkillRegistry } from "../../agent/runtime/skill-runtime.js";
import { ToolRegistry } from "../../agent/runtime/tool-registry.js";
import { BranchGrowthSkill } from "../../agent/skills/branch-growth-skill.js";
import { GeneExtractionSkill } from "../../agent/skills/gene-extraction-skill.js";
import { NutrientResearchSkill } from "../../agent/skills/nutrient-research-skill.js";
import { SeedBriefSkill } from "../../agent/skills/seed-brief-skill.js";
import { ControlledWebSearchTool } from "../../agent/tools/controlled-web-search-tool.js";
import { NetworkedResearchTool } from "../../agent/tools/networked-research-tool.js";
import { ExecuteGeneratorScriptTool } from "../../agent/tools/execute-generator-script-tool.js";
import { ReadGeneratorSkillTool } from "../../agent/tools/read-generator-skill-tool.js";
import {
  ReadGeneEvidenceTool,
  ReadGeneSeedContextTool,
  ReadReferableGeneInsightsTool,
} from "../../agent/tools/read-gene-context-tool.js";
import {
  ReadGrowthResourcesTool,
  ReadGrowthSourceNodeTool,
} from "../../agent/tools/read-growth-context-tool.js";
import { LocalFruitMarkdownContentAccessAdapter } from "../../content-access/adapters/local-fruit-markdown-content-access-adapter.js";
import { LocalGeneMarkdownContentAccessAdapter } from "../../content-access/adapters/local-gene-markdown-content-access-adapter.js";
import { LocalGeneratorSkillContentAccessAdapter } from "../../content-access/adapters/local-generator-skill-content-access-adapter.js";
import { LocalNutrientMarkdownContentAccessAdapter } from "../../content-access/adapters/local-nutrient-markdown-content-access-adapter.js";
import { LocalSeedMarkdownContentAccessAdapter } from "../../content-access/adapters/local-seed-markdown-content-access-adapter.js";
import { FruitService } from "../../modules/fruit/application/fruit-service.js";
import { FeedbackService } from "../../modules/feedback/application/feedback-service.js";
import { GeneService } from "../../modules/gene/application/gene-service.js";
import { GeneratorService } from "../../modules/generator/application/generator-service.js";
import { GrowthService } from "../../modules/growth/application/growth-service.js";
import { NutrientService } from "../../modules/nutrient/application/nutrient-service.js";
import { PublicationService } from "../../modules/publication/application/publication-service.js";
import { SeedService } from "../../modules/seed/application/seed-service.js";
import { WorkspaceService } from "../../modules/workspace/application/workspace-service.js";
import { SqliteFruitStorageAdapter } from "../../storage/adapters/sqlite-fruit-storage-adapter.js";
import { SqliteFeedbackStorageAdapter } from "../../storage/adapters/sqlite-feedback-storage-adapter.js";
import { SqliteGeneStorageAdapter } from "../../storage/adapters/sqlite-gene-storage-adapter.js";
import { SqliteGeneratorStorageAdapter } from "../../storage/adapters/sqlite-generator-storage-adapter.js";
import { SqliteGrowthStorageAdapter } from "../../storage/adapters/sqlite-growth-storage-adapter.js";
import { SqliteNutrientStorageAdapter } from "../../storage/adapters/sqlite-nutrient-storage-adapter.js";
import { SqlitePublicationStorageAdapter } from "../../storage/adapters/sqlite-publication-storage-adapter.js";
import { SqliteSeedStorageAdapter } from "../../storage/adapters/sqlite-seed-storage-adapter.js";
import type { AppConfig, AppConfigEnv } from "../config/app-config.js";
import {
  getAgentLlmStartupWarnings,
  loadAppConfig,
} from "../config/app-config.js";
import { initializeRuntimeFilesystem } from "./runtime-filesystem.js";

export interface AppRuntime {
  config: AppConfig;
  seedController: SeedController;
  generatorController: GeneratorController;
  fruitController: FruitController;
  geneController: GeneController;
  growthController: GrowthController;
  publicationController: PublicationController;
  feedbackController: FeedbackController;
  nutrientController: NutrientController;
  workspaceController: WorkspaceController;
  close(): void;
}

export async function bootstrapApp(
  env: AppConfigEnv = process.env,
  cwd: string = process.cwd(),
): Promise<AppRuntime> {
  const config = loadAppConfig(env, cwd);
  for (const warning of getAgentLlmStartupWarnings(config)) {
    console.warn(warning);
  }
  await initializeRuntimeFilesystem(config);

  const seedStorage = new SqliteSeedStorageAdapter(config.databasePath);
  const generatorStorage = new SqliteGeneratorStorageAdapter(config.databasePath);
  const fruitStorage = new SqliteFruitStorageAdapter(config.databasePath);
  const geneStorage = new SqliteGeneStorageAdapter(config.databasePath);
  const growthStorage = new SqliteGrowthStorageAdapter(config.databasePath);
  const nutrientStorage = new SqliteNutrientStorageAdapter(config.databasePath);
  const publicationStorage = new SqlitePublicationStorageAdapter(
    config.databasePath,
  );
  const feedbackStorage = new SqliteFeedbackStorageAdapter(config.databasePath);
  const seedContentAccess = new LocalSeedMarkdownContentAccessAdapter(
    config.contentRootDir,
  );
  const generatorContentAccess = new LocalGeneratorSkillContentAccessAdapter(
    config.contentRootDir,
  );
  const fruitContentAccess = new LocalFruitMarkdownContentAccessAdapter(
    config.contentRootDir,
  );
  const geneContentAccess = new LocalGeneMarkdownContentAccessAdapter(
    config.contentRootDir,
  );
  const nutrientContentAccess = new LocalNutrientMarkdownContentAccessAdapter(
    config.contentRootDir,
  );
  const skillRegistry = new SkillRegistry();
  skillRegistry.register(new BranchGrowthSkill());
  skillRegistry.register(new GeneExtractionSkill());
  skillRegistry.register(new SeedBriefSkill());
  skillRegistry.register(new NutrientResearchSkill());
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(new ControlledWebSearchTool());
  toolRegistry.register(new NetworkedResearchTool());
  toolRegistry.register(
    new ReadGeneratorSkillTool({
      generatorStorage,
      contentAccess: generatorContentAccess,
    }),
  );
  toolRegistry.register(
    new ExecuteGeneratorScriptTool({
      generatorStorage,
      contentAccess: generatorContentAccess,
    }),
  );
  toolRegistry.register(
    new ReadGrowthSourceNodeTool({
      seedStorage,
      fruitStorage,
      seedContentAccess,
      fruitContentAccess,
    }),
  );
  toolRegistry.register(
    new ReadGrowthResourcesTool({
      geneStorage,
      geneContentAccess,
      nutrientStorage,
      nutrientContentAccess,
    }),
  );
  toolRegistry.register(
    new ReadGeneSeedContextTool({
      seedStorage,
      seedContentAccess,
    }),
  );
  toolRegistry.register(
    new ReadGeneEvidenceTool({
      fruitStorage,
      fruitContentAccess,
      publicationStorage,
      feedbackStorage,
    }),
  );
  toolRegistry.register(
    new ReadReferableGeneInsightsTool({
      geneStorage,
      geneContentAccess,
    }),
  );
  const agentRuntime = new AgentRuntime({
    skillRegistry,
    toolRegistry,
    llm: createLlmAdapter(config),
    exchangeLogSink: createAgentExchangeLogSink(config.agent.exchangeLog),
    exchangeLogMaxContentChars: config.agent.exchangeLog.maxContentChars,
  });
  const geneService = new GeneService({
    storage: geneStorage,
    contentAccess: geneContentAccess,
    seedStorage,
    fruitStorage,
    publicationStorage,
    feedbackStorage,
    agentPort: agentRuntime,
  });
  const generatorService = new GeneratorService({
    storage: generatorStorage,
    contentAccess: generatorContentAccess,
  });
  const nutrientService = new NutrientService({
    storage: nutrientStorage,
    contentAccess: nutrientContentAccess,
    seedStorage,
    fruitStorage,
    publicationStorage,
    feedbackStorage,
    agentPort: agentRuntime,
  });
  const seedService = new SeedService({
    storage: seedStorage,
    contentAccess: seedContentAccess,
    agentPort: agentRuntime,
    afterSeedCreated: (seedId) => geneService.prepareSeedGeneLibrary(seedId).then(() => undefined),
    afterSeedBriefSaved: (seedId, markdown) =>
      nutrientService.createSuggestionsFromSeedBrief(seedId, markdown).then(() => undefined),
  });
  const fruitService = new FruitService({
    storage: fruitStorage,
    contentAccess: fruitContentAccess,
    onFruitSelectionChanged: ({ seedId, fruitId, selectionState }) => {
      if (selectionState !== "selected" && selectionState !== "eliminated") {
        return Promise.resolve();
      }
      const geneReminder = geneService
        .createReminderFromFruitEvidence(seedId, {
          fruitId,
          action: selectionState,
        });
      const nutrientSuggestion =
        selectionState === "eliminated"
          ? nutrientService.createSuggestionFromFruitElimination({
              seedId,
              fruitId,
            })
          : Promise.resolve();
      return Promise.all([geneReminder, nutrientSuggestion]).then(() => undefined);
    },
  });
  const growthService = new GrowthService({
    storage: growthStorage,
    seedStorage,
    fruitStorage,
    generatorStorage,
    fruitService,
    agentPort: agentRuntime,
    geneUsageTracking: geneService,
    nutrientGapSuggestions: nutrientService,
    nutrientUsageTracking: nutrientService,
    referenceAuthorization: {
      async authorize(scope) {
        await nutrientService.assertNutrientRefsReferable(
          scope.seedId,
          scope.nutrientRefs.map((ref) => ({
            resourceType: "nutrient",
            resourceId: ref.resourceId,
          })),
        );
        await nutrientService.assertTemporaryNutrientCardRefsReferable(
          scope.seedId,
          scope.temporaryNutrientCardRefs.map((ref) => ({
            resourceType: "nutrient_card",
            resourceId: ref.resourceId,
          })),
        );
        return {
          ...scope,
          sourceNodeRef: { ...scope.sourceNodeRef },
          nutrientRefs: scope.nutrientRefs.map((ref) => ({ ...ref })),
          temporaryNutrientCardRefs: scope.temporaryNutrientCardRefs.map((ref) => ({
            ...ref,
          })),
          geneRefs: scope.geneRefs.map((ref) => ({ ...ref })),
        };
      },
    },
  });
  await growthService.recoverInterruptedGrowthTasks();
  const publicationService = new PublicationService({
    storage: publicationStorage,
    publishableFruitPort: fruitService,
  });
  const feedbackService = new FeedbackService({
    storage: feedbackStorage,
    publicationRecordPort: publicationService,
  });
  const workspaceService = new WorkspaceService({
    seedService,
    fruitService,
    growthService,
    generatorService,
    nutrientService,
    geneService,
  });
  const seedController = new HttpSeedController(seedService);
  const generatorController = new HttpGeneratorController(generatorService);
  const fruitController = new HttpFruitController(fruitService);
  const geneController = new HttpGeneController(geneService);
  const growthController = new HttpGrowthController(growthService);
  const publicationController = new HttpPublicationController(publicationService);
  const feedbackController = new HttpFeedbackController(feedbackService);
  const nutrientController = new HttpNutrientController(nutrientService);
  const workspaceController = new HttpWorkspaceController(workspaceService);

  return {
    config,
    seedController,
    generatorController,
    fruitController,
    geneController,
    growthController,
    publicationController,
    feedbackController,
    nutrientController,
    workspaceController,
    close(): void {
      seedStorage.close();
      generatorStorage.close();
      fruitStorage.close();
      geneStorage.close();
      growthStorage.close();
      nutrientStorage.close();
      publicationStorage.close();
      feedbackStorage.close();
    },
  };
}

function createLlmAdapter(config: AppConfig): LlmAdapter {
  const llm = config.agent.llm;
  if (llm.isRealLlmAvailable) {
    return new OpenAiCompatibleLlmAdapter({
      provider: llm.provider,
      baseUrl: llm.baseUrl,
      model: llm.model,
      apiKey: llm.apiKey,
    });
  }
  return new FakeLlmAdapter();
}
