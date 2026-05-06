import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadLocalEnvFile, type MutableEnv } from "../app/config/local-env.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-env-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("loadLocalEnvFile", () => {
  it("loads local env values without overriding explicit env values", async () => {
    const root = await createTempRoot();
    const envPath = join(root, ".env.local");
    const targetEnv: MutableEnv = {
      CONTENT_FOREST_AGENT_LLM_MODEL: "explicit-model",
    };
    await writeFile(
      envPath,
      [
        "CONTENT_FOREST_AGENT_LLM_MODE=openai-compatible",
        "CONTENT_FOREST_AGENT_LLM_PROVIDER=minimax",
        "CONTENT_FOREST_AGENT_LLM_MODEL=MiniMax-M2.7",
        "CONTENT_FOREST_AGENT_LLM_API_KEY='local-key'",
      ].join("\n"),
      "utf8",
    );

    await loadLocalEnvFile(envPath, targetEnv);

    expect(targetEnv).toMatchObject({
      CONTENT_FOREST_AGENT_LLM_MODE: "openai-compatible",
      CONTENT_FOREST_AGENT_LLM_PROVIDER: "minimax",
      CONTENT_FOREST_AGENT_LLM_MODEL: "explicit-model",
      CONTENT_FOREST_AGENT_LLM_API_KEY: "local-key",
    });
  });

  it("does nothing when the local env file does not exist", async () => {
    const root = await createTempRoot();
    const targetEnv: MutableEnv = {};

    await expect(
      loadLocalEnvFile(join(root, ".env.local"), targetEnv),
    ).resolves.toBeUndefined();
    expect(targetEnv).toEqual({});
  });
});
