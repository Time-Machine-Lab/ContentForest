import { resolve } from "node:path";

export interface AppConfig {
  contentRootDir: string;
  databasePath: string;
  port: number;
}

export interface AppConfigEnv {
  CONTENT_FOREST_CONTENT_ROOT?: string;
  CONTENT_FOREST_DATABASE_PATH?: string;
  CONTENT_FOREST_PORT?: string;
}

export function loadAppConfig(
  env: AppConfigEnv = process.env,
  cwd: string = process.cwd(),
): AppConfig {
  return {
    contentRootDir: resolve(
      cwd,
      env.CONTENT_FOREST_CONTENT_ROOT ?? "data/content",
    ),
    databasePath: resolve(
      cwd,
      env.CONTENT_FOREST_DATABASE_PATH ?? "data/app.sqlite",
    ),
    port: Number.parseInt(env.CONTENT_FOREST_PORT ?? "3001", 10),
  };
}
