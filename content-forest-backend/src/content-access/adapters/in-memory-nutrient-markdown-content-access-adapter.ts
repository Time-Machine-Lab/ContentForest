import type {
  CreateNutrientMarkdownInput,
  NutrientMarkdownContentAccessPort,
} from "../ports/nutrient-markdown-content-access-port.js";
import { NUTRIENT_LIBRARY_SCOPES } from "../../modules/nutrient/domain/nutrient-types.js";
import { ApplicationError } from "../../shared/errors/application-error.js";

export class InMemoryNutrientMarkdownContentAccessAdapter
  implements NutrientMarkdownContentAccessPort
{
  private readonly markdownByLocation = new Map<string, string>();

  public async createNutrientMarkdown(
    input: CreateNutrientMarkdownInput,
  ): Promise<string> {
    const location =
      input.libraryScope === NUTRIENT_LIBRARY_SCOPES.public
        ? `nutrients/public/${input.contentId}.md`
        : `nutrients/seed-scoped/${input.seedId ?? "unknown"}/${input.contentId}.md`;
    this.markdownByLocation.set(location, input.markdown);
    return location;
  }

  public async readNutrientMarkdown(contentLocation: string): Promise<string> {
    const markdown = this.markdownByLocation.get(contentLocation);
    if (markdown === undefined) {
      throw new ApplicationError(
        "CONTENT_ACCESS_ERROR",
        "营养内容 Markdown 不存在",
        500,
      );
    }
    return markdown;
  }

  public async updateNutrientMarkdown(
    contentLocation: string,
    markdown: string,
  ): Promise<void> {
    if (!this.markdownByLocation.has(contentLocation)) {
      throw new ApplicationError(
        "CONTENT_ACCESS_ERROR",
        "营养内容 Markdown 不存在",
        500,
      );
    }
    this.markdownByLocation.set(contentLocation, markdown);
  }

  public async removeNutrientMarkdown(contentLocation: string): Promise<void> {
    this.markdownByLocation.delete(contentLocation);
  }
}
