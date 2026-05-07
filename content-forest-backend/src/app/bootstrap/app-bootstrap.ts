import type { SeedController } from "../../interface/http/seed-controller.js";
import type { GeneratorController } from "../../interface/http/generator-controller.js";
import type { FruitController } from "../../interface/http/fruit-controller.js";
import type { GeneController } from "../../interface/http/gene-controller.js";
import { GeneratorController as HttpGeneratorController } from "../../interface/http/generator-controller.js";
import { FruitController as HttpFruitController } from "../../interface/http/fruit-controller.js";
import { GeneController as HttpGeneController } from "../../interface/http/gene-controller.js";
import { SeedController as HttpSeedController } from "../../interface/http/seed-controller.js";
import { AgentRuntime } from "../../agent/runtime/agent-runtime.js";
import { FakeLlmAdapter } from "../../agent/runtime/fake-llm-adapter.js";
import { LocalFruitMarkdownContentAccessAdapter } from "../../content-access/adapters/local-fruit-markdown-content-access-adapter.js";
import { LocalGeneMarkdownContentAccessAdapter } from "../../content-access/adapters/local-gene-markdown-content-access-adapter.js";
import { LocalGeneratorSkillContentAccessAdapter } from "../../content-access/adapters/local-generator-skill-content-access-adapter.js";
import { LocalSeedMarkdownContentAccessAdapter } from "../../content-access/adapters/local-seed-markdown-content-access-adapter.js";
import { FruitService } from "../../modules/fruit/application/fruit-service.js";
import { GeneService } from "../../modules/gene/application/gene-service.js";
import { GeneratorService } from "../../modules/generator/application/generator-service.js";
import { SeedService } from "../../modules/seed/application/seed-service.js";
import { SqliteFruitStorageAdapter } from "../../storage/adapters/sqlite-fruit-storage-adapter.js";
import { SqliteGeneStorageAdapter } from "../../storage/adapters/sqlite-gene-storage-adapter.js";
import { SqliteGeneratorStorageAdapter } from "../../storage/adapters/sqlite-generator-storage-adapter.js";
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
  const agentRuntime = new AgentRuntime({
    llm: new FakeLlmAdapter(),
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
  const seedController = new HttpSeedController(seedService);
  const generatorController = new HttpGeneratorController(generatorService);
  const fruitController = new HttpFruitController(fruitService);
  const geneController = new HttpGeneController(geneService);

  return {
    config,
    seedController,
    generatorController,
    fruitController,
    geneController,
    close(): void {
      seedStorage.close();
      generatorStorage.close();
      fruitStorage.close();
      geneStorage.close();
    },
  };
}
