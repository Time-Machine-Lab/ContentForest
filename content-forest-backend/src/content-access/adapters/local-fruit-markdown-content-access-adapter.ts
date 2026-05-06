import { readFile, rm, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type {
  CreateFruitMarkdownInput,
  FruitMarkdownContentAccessPort,
} from "../ports/fruit-markdown-content-access-port.js";
import { ApplicationError } from "../../shared/errors/application-error.js";

export class LocalFruitMarkdownContentAccessAdapter
  implements FruitMarkdownContentAccessPort
{
  private readonly contentRootDir: string;

  public constructor(contentRootDir: string) {
    this.contentRootDir = resolve(contentRootDir);
  }

  public async createFruitMarkdown(
    input: CreateFruitMarkdownInput,
  ): Promise<string> {
    const contentLocation = `fruits/${this.safeFileName(input.fruitId)}.md`;
    await this.write(contentLocation, input.markdown);
    return contentLocation;
  }

  public async readFruitMarkdown(contentLocation: string): Promise<string> {
    return readFile(this.resolve(contentLocation), "utf8");
  }

  public async updateFruitMarkdown(
    contentLocation: string,
    markdown: string,
  ): Promise<void> {
    await this.write(contentLocation, markdown);
  }

  public async removeFruitMarkdown(contentLocation: string): Promise<void> {
    await rm(this.resolve(contentLocation), { force: true });
  }

  private async write(contentLocation: string, markdown: string): Promise<void> {
    const target = this.resolve(contentLocation);
    await writeFile(target, markdown, "utf8");
  }

  private resolve(contentLocation: string): string {
    const segments = contentLocation.replaceAll("\\", "/").split("/");
    if (
      contentLocation.trim().length === 0 ||
      isAbsolute(contentLocation) ||
      segments.includes("..")
    ) {
      throw this.invalidContentLocation();
    }

    const target = resolve(this.contentRootDir, contentLocation);
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
