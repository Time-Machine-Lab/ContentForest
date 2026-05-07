export interface CreateGeneInsightMarkdownInput {
  seedId: string;
  insightId: string;
  markdown: string;
}

export interface GeneMarkdownContentAccessPort {
  prepareSeedGeneLibrary(seedId: string): Promise<string>;
  createGeneInsightMarkdown(input: CreateGeneInsightMarkdownInput): Promise<string>;
  readGeneInsightMarkdown(contentLocation: string): Promise<string>;
  updateGeneInsightMarkdown(
    contentLocation: string,
    markdown: string,
  ): Promise<void>;
  removeGeneInsightMarkdown(contentLocation: string): Promise<void>;
}
