import type { SeedController } from "../../interface/http/seed-controller.js";
import type { GeneratorController } from "../../interface/http/generator-controller.js";
import type { FruitController } from "../../interface/http/fruit-controller.js";
import type { GeneController } from "../../interface/http/gene-controller.js";
import type { GrowthController } from "../../interface/http/growth-controller.js";
import type { PublicationController } from "../../interface/http/publication-controller.js";
import { GeneratorController as HttpGeneratorController } from "../../interface/http/generator-controller.js";
import { FruitController as HttpFruitController } from "../../interface/http/fruit-controller.js";
import { GeneController as HttpGeneController } from "../../interface/http/gene-controller.js";
import { GrowthController as HttpGrowthController } from "../../interface/http/growth-controller.js";
import { PublicationController as HttpPublicationController } from "../../interface/http/publication-controller.js";
import { SeedController as HttpSeedController } from "../../interface/http/seed-controller.js";
import { AgentRuntime } from "../../agent/runtime/agent-runtime.js";
import { FakeLlmAdapter } from "../../agent/runtime/fake-llm-adapter.js";
import type { LlmAdapter } from "../../agent/runtime/llm-adapter.js";
import { OpenAiCompatibleLlmAdapter } from "../../agent/runtime/openai-compatible-llm-adapter.js";
import { SkillRegistry } from "../../agent/runtime/skill-runtime.js";
import { ToolRegistry } from "../../agent/runtime/tool-registry.js";
import { BranchGrowthSkill } from "../../agent/skills/branch-growth-skill.js";
import { ExecuteGeneratorScriptTool } from "../../agent/tools/execute-generator-script-tool.js";
import { ReadGeneratorSkillTool } from "../../agent/tools/read-generator-skill-tool.js";
import {
  ReadGrowthResourcesTool,
  ReadGrowthSourceNodeTool,
} from "../../agent/tools/read-growth-context-tool.js";
import { LocalFruitMarkdownContentAccessAdapter } from "../../content-access/adapters/local-fruit-markdown-content-access-adapter.js";
import { LocalGeneMarkdownContentAccessAdapter } from "../../content-access/adapters/local-gene-markdown-content-access-adapter.js";
import { LocalGeneratorSkillContentAccessAdapter } from "../../content-access/adapters/local-generator-skill-content-access-adapter.js";
import { LocalSeedMarkdownContentAccessAdapter } from "../../content-access/adapters/local-seed-markdown-content-access-adapter.js";
import { FruitService } from "../../modules/fruit/application/fruit-service.js";
import { GeneService } from "../../modules/gene/application/gene-service.js";
import { GeneratorService } from "../../modules/generator/application/generator-service.js";
import { GrowthService } from "../../modules/growth/application/growth-service.js";
import { PublicationService } from "../../modules/publication/application/publication-service.js";
import { SeedService } from "../../modules/seed/application/seed-service.js";
import { SqliteFruitStorageAdapter } from "../../storage/adapters/sqlite-fruit-storage-adapter.js";
import { SqliteGeneStorageAdapter } from "../../storage/adapters/sqlite-gene-storage-adapter.js";
import { SqliteGeneratorStorageAdapter } from "../../storage/adapters/sqlite-generator-storage-adapter.js";
import { SqliteGrowthStorageAdapter } from "../../storage/adapters/sqlite-growth-storage-adapter.js";
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
  const publicationStorage = new SqlitePublicationStorageAdapter(
    config.databasePath,
  );
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
  const skillRegistry = new SkillRegistry();
  skillRegistry.register(new BranchGrowthSkill());
  const toolRegistry = new ToolRegistry();
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
    }),
  );
  const agentRuntime = new AgentRuntime({
    skillRegistry,
    toolRegistry,
    llm: createLlmAdapter(config),
  });
  const geneService = new GeneService({
    storage: geneStorage,
    contentAccess: geneContentAccess,
    seedStorage,
    fruitStorage,
    agentPort: agentRuntime,
  });
  const seedService = new SeedService({
    storage: seedStorage,
    contentAccess: seedContentAccess,
    afterSeedCreated: (seedId) => geneService.prepareSeedGeneLibrary(seedId).then(() => undefined),
  });
  const generatorService = new GeneratorService({
    storage: generatorStorage,
    contentAccess: generatorContentAccess,
  });
  const fruitService = new FruitService({
    storage: fruitStorage,
    contentAccess: fruitContentAccess,
    onFruitSelectionChanged: ({ seedId, fruitId, selectionState }) => {
      if (selectionState !== "selected" && selectionState !== "eliminated") {
        return Promise.resolve();
      }
      return geneService
        .createReminderFromFruitEvidence(seedId, {
          fruitId,
          action: selectionState,
        })
        .then(() => undefined);
    },
  });
  const growthService = new GrowthService({
    storage: growthStorage,
    seedStorage,
    fruitStorage,
    generatorStorage,
    fruitService,
    agentPort: agentRuntime,
  });
  const publicationService = new PublicationService({
    storage: publicationStorage,
    publishableFruitPort: fruitService,
  });
  const seedController = new HttpSeedController(seedService);
  const generatorController = new HttpGeneratorController(generatorService);
  const fruitController = new HttpFruitController(fruitService);
  const geneController = new HttpGeneController(geneService);
  const growthController = new HttpGrowthController(growthService);
  const publicationController = new HttpPublicationController(publicationService);

  return {
    config,
    seedController,
    generatorController,
    fruitController,
    geneController,
    growthController,
    publicationController,
    close(): void {
      seedStorage.close();
      generatorStorage.close();
      fruitStorage.close();
      geneStorage.close();
      growthStorage.close();
      publicationStorage.close();
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
