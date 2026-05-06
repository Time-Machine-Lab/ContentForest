import type {
  CreateFruitMarkdownInput,
  FruitMarkdownContentAccessPort,
} from "../ports/fruit-markdown-content-access-port.js";
import { ApplicationError } from "../../shared/errors/application-error.js";

export class InMemoryFruitMarkdownContentAccessAdapter
  implements FruitMarkdownContentAccessPort
{
  private readonly markdownByLocation = new Map<string, string>();

  public async createFruitMarkdown(input: CreateFruitMarkdownInput): Promise<string> {
    const location = `fruits/${input.fruitId}.md`;
    this.markdownByLocation.set(location, input.markdown);
    return location;
  }

  public async readFruitMarkdown(contentLocation: string): Promise<string> {
    const markdown = this.markdownByLocation.get(contentLocation);
    if (markdown === undefined) {
      throw new ApplicationError(
        "CONTENT_ACCESS_ERROR",
        "果实 Markdown 内容不存在",
        500,
      );
    }
    return markdown;
  }

  public async updateFruitMarkdown(
    contentLocation: string,
    markdown: string,
  ): Promise<void> {
    if (!this.markdownByLocation.has(contentLocation)) {
      throw new ApplicationError(
        "CONTENT_ACCESS_ERROR",
        "果实 Markdown 内容不存在",
        500,
      );
    }
    this.markdownByLocation.set(contentLocation, markdown);
  }

  public async removeFruitMarkdown(contentLocation: string): Promise<void> {
    this.markdownByLocation.delete(contentLocation);
  }
}
