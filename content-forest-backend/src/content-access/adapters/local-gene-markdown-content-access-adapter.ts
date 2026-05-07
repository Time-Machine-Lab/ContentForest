import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { ApplicationError } from "../../shared/errors/application-error.js";
import type {
  CreateGeneInsightMarkdownInput,
  GeneMarkdownContentAccessPort,
} from "../ports/gene-markdown-content-access-port.js";

export class LocalGeneMarkdownContentAccessAdapter
  implements GeneMarkdownContentAccessPort
{
  private readonly contentRootDir: string;

  public constructor(contentRootDir: string) {
    this.contentRootDir = resolve(contentRootDir);
  }

  public async prepareSeedGeneLibrary(seedId: string): Promise<string> {
    const contentLocation = `genes/seed-scoped/${this.safeFileName(seedId)}`;
    await mkdir(this.resolve(contentLocation), { recursive: true });
    return contentLocation;
  }

  public async createGeneInsightMarkdown(
    input: CreateGeneInsightMarkdownInput,
  ): Promise<string> {
    const contentLocation =
      `genes/seed-scoped/${this.safeFileName(input.seedId)}/${this.safeFileName(input.insightId)}.md`;
    await this.write(contentLocation, input.markdown);
    return contentLocation;
  }

  public async readGeneInsightMarkdown(contentLocation: string): Promise<string> {
    return readFile(this.resolve(contentLocation), "utf8");
  }

  public async updateGeneInsightMarkdown(
    contentLocation: string,
    markdown: string,
  ): Promise<void> {
    await this.write(contentLocation, markdown);
  }

  public async removeGeneInsightMarkdown(contentLocation: string): Promise<void> {
    await rm(this.resolve(contentLocation), { force: true });
  }

  private async write(contentLocation: string, markdown: string): Promise<void> {
    const target = this.resolve(contentLocation);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, markdown, "utf8");
  }

  private resolve(contentLocation: string): string {
    const normalized = contentLocation.replaceAll("\\", "/");
    const segments = normalized.split("/");
    if (
      normalized.trim().length === 0 ||
      isAbsolute(normalized) ||
      segments.includes("..")
    ) {
      throw this.invalidContentLocation();
    }

    const target = resolve(this.contentRootDir, normalized);
    const relativePath = relative(this.contentRootDir, target);
    if (
      relativePath.length === 0 ||
      relativePath.startsWith("..") ||
      isAbsolute(relativePath)
    ) {
      throw this.invalidContentLocation();
    }
    return target;
  }

  private safeFileName(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  private invalidContentLocation(): ApplicationError {
    return new ApplicationError(
      "CONTENT_ACCESS_ERROR",
      "内容位置必须是运行时内容根目录下的相对路径",
      500,
    );
  }
}
