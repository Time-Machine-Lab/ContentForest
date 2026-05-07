import type { GeneratorSkillContentAccessPort } from "../../content-access/ports/generator-skill-content-access-port.js";
import { GENERATOR_ENABLE_STATES } from "../../modules/generator/domain/generator-types.js";
import { ApplicationError } from "../../shared/errors/application-error.js";
import type { GeneratorStoragePort } from "../../storage/ports/generator-storage-port.js";
import type { AgentTaskContext } from "../runtime/agent-task.js";
import type { ToolContract, ToolInput, ToolOutput } from "../runtime/tool-contract.js";
import {
  readAuthorizedGeneratorId,
  requireString,
} from "./agent-tool-utils.js";

export const READ_GENERATOR_SKILL_TOOL_NAME = "read_generator_skill";

export class ReadGeneratorSkillTool implements ToolContract {
  public readonly name = READ_GENERATOR_SKILL_TOOL_NAME;
  public readonly description = "Read authorized generator skill files without exposing local paths.";
  public readonly readOnly = true;

  private readonly generatorStorage: GeneratorStoragePort;
  private readonly contentAccess: GeneratorSkillContentAccessPort;

  public constructor(dependencies: {
    generatorStorage: GeneratorStoragePort;
    contentAccess: GeneratorSkillContentAccessPort;
  }) {
    this.generatorStorage = dependencies.generatorStorage;
    this.contentAccess = dependencies.contentAccess;
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

    const generator = await this.generatorStorage.findGeneratorById(requestedGeneratorId);
    if (generator === null) {
      throw new ApplicationError("NOT_FOUND", "生成器不存在", 404);
    }
    if (generator.enableState !== GENERATOR_ENABLE_STATES.enabled) {
      throw new ApplicationError("VALIDATION_ERROR", "生成器已停用", 400);
    }

    const overview = await this.contentAccess.readGeneratorSkill(
      generator.contentLocation,
    );
    if (overview.skillMarkdown.trim().length === 0) {
      throw new ApplicationError("CONTENT_ACCESS_ERROR", "生成器 SKILL.md 为空", 500);
    }

    return {
      content: {
        generatorId: generator.id,
        name: generator.name,
        description: generator.description,
        skillMarkdown: overview.skillMarkdown,
        entries: overview.entries.map((entry) => entry.replaceAll("\\", "/")),
        attachments: overview.entries
          .filter((entry) => entry !== "SKILL.md")
          .map((entry) => ({
            path: entry.replaceAll("\\", "/"),
            kind: inferEntryKind(entry),
          })),
      },
    };
  }
}

export function readGeneratorIdFromToolInput(input: ToolInput): string {
  return requireString(input.generatorId, "生成器不能为空");
}

function inferEntryKind(entry: string): string {
  const lower = entry.toLowerCase();
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) {
    return "script";
  }
  if (lower.endsWith(".md") || lower.endsWith(".txt")) {
    return "text";
  }
  return "attachment";
}
