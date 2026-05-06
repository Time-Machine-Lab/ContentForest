import type { SeedController } from "../../interface/http/seed-controller.js";
import type { GeneratorController } from "../../interface/http/generator-controller.js";
import type { FruitController } from "../../interface/http/fruit-controller.js";
import { GeneratorController as HttpGeneratorController } from "../../interface/http/generator-controller.js";
import { FruitController as HttpFruitController } from "../../interface/http/fruit-controller.js";
import { SeedController as HttpSeedController } from "../../interface/http/seed-controller.js";
import { LocalFruitMarkdownContentAccessAdapter } from "../../content-access/adapters/local-fruit-markdown-content-access-adapter.js";
import { LocalGeneratorSkillContentAccessAdapter } from "../../content-access/adapters/local-generator-skill-content-access-adapter.js";
import { LocalSeedMarkdownContentAccessAdapter } from "../../content-access/adapters/local-seed-markdown-content-access-adapter.js";
import { FruitService } from "../../modules/fruit/application/fruit-service.js";
import { GeneratorService } from "../../modules/generator/application/generator-service.js";
import { SeedService } from "../../modules/seed/application/seed-service.js";
import { SqliteFruitStorageAdapter } from "../../storage/adapters/sqlite-fruit-storage-adapter.js";
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
  const seedContentAccess = new LocalSeedMarkdownContentAccessAdapter(
    config.contentRootDir,
  );
  const generatorContentAccess = new LocalGeneratorSkillContentAccessAdapter(
    config.contentRootDir,
  );
  const fruitContentAccess = new LocalFruitMarkdownContentAccessAdapter(
    config.contentRootDir,
  );
  const seedService = new SeedService({
    storage: seedStorage,
    contentAccess: seedContentAccess,
  });
  const generatorService = new GeneratorService({
    storage: generatorStorage,
    contentAccess: generatorContentAccess,
  });
  const fruitService = new FruitService({
    storage: fruitStorage,
    contentAccess: fruitContentAccess,
  });
  const seedController = new HttpSeedController(seedService);
  const generatorController = new HttpGeneratorController(generatorService);
  const fruitController = new HttpFruitController(fruitService);

  return {
    config,
    seedController,
    generatorController,
    fruitController,
    close(): void {
      seedStorage.close();
      generatorStorage.close();
      fruitStorage.close();
    },
  };
}
