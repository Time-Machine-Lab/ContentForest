import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import type {
  CreateSeedMarkdownInput,
  SeedMarkdownContentAccessPort,
} from "../ports/seed-markdown-content-access-port.js";

export class LocalSeedMarkdownContentAccessAdapter
  implements SeedMarkdownContentAccessPort
{
  private readonly rootDir: string;

  public constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  public async createSeedMarkdown(input: CreateSeedMarkdownInput): Promise<string> {
    const contentLocation = `seed/${this.safeFileName(input.seedId)}.md`;
    await this.write(contentLocation, input.markdown);
    return contentLocation;
  }

  public async readSeedMarkdown(contentLocation: string): Promise<string> {
    return readFile(this.resolve(contentLocation), "utf8");
  }

  public async updateSeedMarkdown(
    contentLocation: string,
    markdown: string,
  ): Promise<void> {
    await this.write(contentLocation, markdown);
  }

  private async write(contentLocation: string, markdown: string): Promise<void> {
    const target = this.resolve(contentLocation);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, markdown, "utf8");
  }

  private resolve(contentLocation: string): string {
    const normalized = normalize(contentLocation);
    if (normalized.startsWith("..")) {
      throw new Error("Invalid content location");
    }
    return join(this.rootDir, normalized);
  }

  private safeFileName(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
}

