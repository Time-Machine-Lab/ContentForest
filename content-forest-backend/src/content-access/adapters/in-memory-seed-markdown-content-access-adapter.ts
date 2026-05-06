import type {
  CreateSeedMarkdownInput,
  SeedMarkdownContentAccessPort,
} from "../ports/seed-markdown-content-access-port.js";
import { ApplicationError } from "../../shared/errors/application-error.js";

export class InMemorySeedMarkdownContentAccessAdapter
  implements SeedMarkdownContentAccessPort
{
  private readonly markdownByLocation = new Map<string, string>();

  public async createSeedMarkdown(input: CreateSeedMarkdownInput): Promise<string> {
    const location = `seeds/${input.seedId}.md`;
    this.markdownByLocation.set(location, input.markdown);
    return location;
  }

  public async readSeedMarkdown(contentLocation: string): Promise<string> {
    const markdown = this.markdownByLocation.get(contentLocation);
    if (markdown === undefined) {
      throw new ApplicationError(
        "CONTENT_ACCESS_ERROR",
        "种子 Markdown 内容不存在",
        500,
      );
    }
    return markdown;
  }

  public async updateSeedMarkdown(
    contentLocation: string,
    markdown: string,
  ): Promise<void> {
    if (!this.markdownByLocation.has(contentLocation)) {
      throw new ApplicationError(
        "CONTENT_ACCESS_ERROR",
        "种子 Markdown 内容不存在",
        500,
      );
    }
    this.markdownByLocation.set(contentLocation, markdown);
  }
}
