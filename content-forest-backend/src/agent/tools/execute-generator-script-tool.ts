import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GeneratorSkillContentAccessPort } from "../../content-access/ports/generator-skill-content-access-port.js";
import { GENERATOR_ENABLE_STATES } from "../../modules/generator/domain/generator-types.js";
import { ApplicationError } from "../../shared/errors/application-error.js";
import type { GeneratorStoragePort } from "../../storage/ports/generator-storage-port.js";
import type { AgentTaskContext } from "../runtime/agent-task.js";
import type { ToolContract, ToolInput, ToolOutput } from "../runtime/tool-contract.js";
import {
  normalizeRelativeSkillPath,
  readAuthorizedGeneratorId,
} from "./agent-tool-utils.js";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_OUTPUT_BYTES = 64_000;

export const EXECUTE_GENERATOR_SCRIPT_TOOL_NAME = "execute_generator_script";

export class ExecuteGeneratorScriptTool implements ToolContract {
  public readonly name = EXECUTE_GENERATOR_SCRIPT_TOOL_NAME;
  public readonly description = "Execute an authorized generator JS script with bounded input and output.";
  public readonly readOnly = true;

  private readonly generatorStorage: GeneratorStoragePort;
  private readonly contentAccess: GeneratorSkillContentAccessPort;
  private readonly nodePath: string;
  private readonly timeoutMs: number;
  private readonly maxOutputBytes: number;

  public constructor(dependencies: {
    generatorStorage: GeneratorStoragePort;
    contentAccess: GeneratorSkillContentAccessPort;
    nodePath?: string;
    timeoutMs?: number;
    maxOutputBytes?: number;
  }) {
    this.generatorStorage = dependencies.generatorStorage;
    this.contentAccess = dependencies.contentAccess;
    this.nodePath = dependencies.nodePath ?? process.execPath;
    this.timeoutMs = dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputBytes = dependencies.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  }

  public async execute(
    input: ToolInput,
    context: AgentTaskContext,
  ): Promise<ToolOutput> {
    const authorizedGeneratorId = readAuthorizedGeneratorId(context);
    const requestedGeneratorId =
      typeof input.generatorId === "string" && input.generatorId.trim().length > 0
        ? input.generatorId.trim()
        : authorizedGeneratorId;
    if (requestedGeneratorId !== authorizedGeneratorId) {
      throw new ApplicationError("VALIDATION_ERROR", "生成器未被本次任务授权", 403);
    }

    const scriptPath = normalizeRelativeSkillPath(input.scriptPath);
    if (!scriptPath.endsWith(".js") && !scriptPath.endsWith(".mjs")) {
      throw new ApplicationError("VALIDATION_ERROR", "仅允许执行 JS 脚本", 400);
    }
    const generator = await this.generatorStorage.findGeneratorById(requestedGeneratorId);
    if (generator === null) {
      throw new ApplicationError("NOT_FOUND", "生成器不存在", 404);
    }
    if (generator.enableState !== GENERATOR_ENABLE_STATES.enabled) {
      throw new ApplicationError("VALIDATION_ERROR", "生成器已停用", 400);
    }

    const overview = await this.contentAccess.readGeneratorSkill(generator.contentLocation);
    const tempDir = await mkdtemp(join(tmpdir(), "content-forest-generator-"));
    try {
      for (const entry of overview.entries.filter(isSupportedScriptAsset)) {
        const normalized = normalizeRelativeSkillPath(entry);
        const target = join(tempDir, normalized);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(
          target,
          await this.contentAccess.readGeneratorSkillTextFile(
            generator.contentLocation,
            normalized,
          ),
          "utf8",
        );
      }
      const entryPath = join(tempDir, scriptPath);
      const runnerPath = join(tempDir, "runner.mjs");
      await writeFile(runnerPath, buildRunner(entryPath), "utf8");
      const inputJson = JSON.stringify(sanitizeScriptInput(input.input));
      if (Buffer.byteLength(inputJson, "utf8") > 64_000) {
        throw new ApplicationError("VALIDATION_ERROR", "脚本输入过大", 400);
      }

      const { stdout, stderr } = await execFileAsync(
        this.nodePath,
        [
          "--experimental-permission",
          `--allow-fs-read=${tempDir}`,
          `--allow-fs-write=${tempDir}`,
          runnerPath,
        ],
        {
          cwd: tempDir,
          timeout: this.timeoutMs,
          maxBuffer: this.maxOutputBytes,
          env: {
            CONTENT_FOREST_SCRIPT_INPUT: inputJson,
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
          },
        },
      );
      const output = stdout.trim();
      if (Buffer.byteLength(output, "utf8") > this.maxOutputBytes) {
        throw new ApplicationError("AGENT_TOOL_ERROR", "生成器脚本输出过大", 500);
      }
      if (output.length === 0) {
        throw new ApplicationError("AGENT_TOOL_ERROR", "生成器脚本没有输出", 500);
      }
      return {
        content: {
          payload: output,
          stderr: stderr.trim().slice(0, 1000),
        },
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new ApplicationError(
        "AGENT_TOOL_ERROR",
        `生成器脚本执行失败: ${toErrorMessage(error)}`,
        500,
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

function buildRunner(entryPath: string): string {
  const entryUrl = pathToFileURL(entryPath).href;
  return [
    "const input = JSON.parse(process.env.CONTENT_FOREST_SCRIPT_INPUT ?? '{}');",
    `const mod = await import(${JSON.stringify(entryUrl)});`,
    "const runner = mod.default ?? mod.main;",
    "const result = typeof runner === 'function' ? await runner(input) : mod.payload;",
    "if (typeof result === 'string') console.log(result);",
    "else console.log(JSON.stringify(result));",
  ].join("\n");
}

function isSupportedScriptAsset(entry: string): boolean {
  const normalized = entry.replaceAll("\\", "/").toLowerCase();
  return (
    normalized.endsWith(".js") ||
    normalized.endsWith(".mjs") ||
    normalized.endsWith(".json")
  );
}

function sanitizeScriptInput(value: unknown): unknown {
  if (typeof value === "object" && value !== null) {
    return JSON.parse(JSON.stringify(value)) as unknown;
  }
  return value ?? {};
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("maxBuffer")) {
      return "输出超过限制";
    }
    if (error.message.includes("timed out") || error.message.includes("timeout")) {
      return "执行超时";
    }
    return error.message;
  }
  return "未知错误";
}
