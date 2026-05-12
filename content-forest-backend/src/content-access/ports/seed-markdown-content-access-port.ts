export interface CreateSeedMarkdownInput {
  seedId: string;
  markdown: string;
}

export interface CreateSeedBriefMarkdownInput {
  seedId: string;
  markdown: string;
}

export interface SeedMarkdownContentAccessPort {
  createSeedMarkdown(input: CreateSeedMarkdownInput): Promise<string>;
  createSeedBriefMarkdown(input: CreateSeedBriefMarkdownInput): Promise<string>;
  readSeedMarkdown(contentLocation: string): Promise<string>;
  updateSeedMarkdown(contentLocation: string, markdown: string): Promise<void>;
}
