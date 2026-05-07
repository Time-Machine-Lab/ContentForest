import type {
  CreateGeneInsightMarkdownInput,
  GeneMarkdownContentAccessPort,
} from "../ports/gene-markdown-content-access-port.js";
import { ApplicationError } from "../../shared/errors/application-error.js";

export class InMemoryGeneMarkdownContentAccessAdapter
  implements GeneMarkdownContentAccessPort
{
  private readonly markdownByLocation = new Map<string, string>();
  private readonly libraries = new Set<string>();

  public async prepareSeedGeneLibrary(seedId: string): Promise<string> {
    const location = `genes/seed-scoped/${seedId}`;
    this.libraries.add(location);
    return location;
  }

  public async createGeneInsightMarkdown(
    input: CreateGeneInsightMarkdownInput,
  ): Promise<string> {
    const location = `genes/seed-scoped/${input.seedId}/${input.insightId}.md`;
    this.libraries.add(`genes/seed-scoped/${input.seedId}`);
    this.markdownByLocation.set(location, input.markdown);
    return location;
  }

  public async readGeneInsightMarkdown(contentLocation: string): Promise<string> {
    const markdown = this.markdownByLocation.get(contentLocation);
    if (markdown === undefined) {
      throw new ApplicationError(
        "CONTENT_ACCESS_ERROR",
        "基因经验 Markdown 内容不存在",
        500,
      );
    }
    return markdown;
  }

  public async updateGeneInsightMarkdown(
    contentLocation: string,
    markdown: string,
  ): Promise<void> {
    if (!this.markdownByLocation.has(contentLocation)) {
      throw new ApplicationError(
        "CONTENT_ACCESS_ERROR",
        "基因经验 Markdown 内容不存在",
        500,
      );
    }
    this.markdownByLocation.set(contentLocation, markdown);
  }

  public async removeGeneInsightMarkdown(contentLocation: string): Promise<void> {
    this.markdownByLocation.delete(contentLocation);
  }
}

