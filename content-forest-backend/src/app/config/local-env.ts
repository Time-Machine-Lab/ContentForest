import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type MutableEnv = Record<string, string | undefined>;

export async function loadLocalEnvFile(
  filePath: string = resolve(process.cwd(), ".env.local"),
  targetEnv: MutableEnv = process.env,
): Promise<void> {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const line of content.split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (entry === null || targetEnv[entry.key] !== undefined) {
      continue;
    }
    targetEnv[entry.key] = entry.value;
  }
}

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  return {
    key,
    value: unquote(trimmed.slice(separatorIndex + 1).trim()),
  };
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
