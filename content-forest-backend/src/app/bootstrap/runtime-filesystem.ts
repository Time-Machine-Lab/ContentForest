import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface RuntimeFilesystemConfig {
  contentRootDir: string;
  databasePath: string;
}

export const STANDARD_CONTENT_DIRECTORIES = [
  "seeds",
  "fruits",
  "nutrients",
  "nutrients/public",
  "nutrients/seed-scoped",
  "generators",
  "attachments",
  "tmp",
] as const;

export async function initializeRuntimeFilesystem(
  config: RuntimeFilesystemConfig,
): Promise<void> {
  await mkdir(dirname(config.databasePath), { recursive: true });
  await mkdir(config.contentRootDir, { recursive: true });

  await Promise.all(
    STANDARD_CONTENT_DIRECTORIES.map((directory) =>
      mkdir(join(config.contentRootDir, directory), { recursive: true }),
    ),
  );
}
