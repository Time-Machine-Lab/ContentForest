import type { NutrientLibraryScope } from "../../modules/nutrient/domain/nutrient-types.js";

export interface CreateNutrientMarkdownInput {
  contentId: string;
  libraryScope: NutrientLibraryScope;
  seedId: string | null;
  markdown: string;
}

export interface NutrientMarkdownContentAccessPort {
  createNutrientMarkdown(input: CreateNutrientMarkdownInput): Promise<string>;
  readNutrientMarkdown(contentLocation: string): Promise<string>;
  updateNutrientMarkdown(contentLocation: string, markdown: string): Promise<void>;
  removeNutrientMarkdown(contentLocation: string): Promise<void>;
}
