import type {
  GeneratorSkillContentAccessPort,
  GeneratorSkillOverview,
  SaveGeneratorSkillInput,
} from "../ports/generator-skill-content-access-port.js";
import { ApplicationError } from "../../shared/errors/application-error.js";

export class InMemoryGeneratorSkillContentAccessAdapter
  implements GeneratorSkillContentAccessPort
{
  private readonly filesByLocation = new Map<string, Map<string, string>>();

  public setGeneratorSkill(
    contentLocation: string,
    files: Record<string, string>,
  ): void {
    this.filesByLocation.set(contentLocation, new Map(Object.entries(files)));
  }

  public async saveGeneratorSkill(input: SaveGeneratorSkillInput): Promise<string> {
    const contentLocation = `generators/${input.generatorId}`;
    this.setGeneratorSkill(contentLocation, {
      "SKILL.md": input.zipBuffer.toString("utf8"),
    });
    return contentLocation;
  }

  public async replaceGeneratorSkill(input: SaveGeneratorSkillInput): Promise<string> {
    return this.saveGeneratorSkill(input);
  }

  public async readGeneratorSkill(
    contentLocation: string,
  ): Promise<GeneratorSkillOverview> {
    const files = this.requireFiles(contentLocation);
    const skillMarkdown = files.get("SKILL.md");
    if (skillMarkdown === undefined) {
      throw new ApplicationError("CONTENT_ACCESS_ERROR", "Generator SKILL.md not found", 500);
    }
    return {
      skillMarkdown,
      entries: [...files.keys()].sort(),
    };
  }

  public async readGeneratorSkillTextFile(
    contentLocation: string,
    relativePath: string,
  ): Promise<string> {
    const normalizedPath = normalizeRelativePath(relativePath);
    const content = this.requireFiles(contentLocation).get(normalizedPath);
    if (content === undefined) {
      throw new ApplicationError("CONTENT_ACCESS_ERROR", "Generator skill file not found", 500);
    }
    return content;
  }

  public async removeGeneratorSkill(contentLocation: string): Promise<void> {
    this.filesByLocation.delete(contentLocation);
  }

  private requireFiles(contentLocation: string): Map<string, string> {
    const files = this.filesByLocation.get(contentLocation);
    if (files === undefined) {
      throw new ApplicationError("CONTENT_ACCESS_ERROR", "Generator skill not found", 500);
    }
    return files;
  }
}

function normalizeRelativePath(path: string): string {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\/+/, "");
  const segments = normalized.split("/").filter((segment) => segment.length > 0);
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[a-zA-Z]:\//.test(normalized) ||
    segments.includes("..")
  ) {
    throw new ApplicationError("VALIDATION_ERROR", "Invalid generator skill path", 400);
  }
  return segments.join("/");
}
