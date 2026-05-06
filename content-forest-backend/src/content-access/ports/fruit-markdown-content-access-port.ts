export interface CreateFruitMarkdownInput {
  fruitId: string;
  markdown: string;
}

export interface FruitMarkdownContentAccessPort {
  createFruitMarkdown(input: CreateFruitMarkdownInput): Promise<string>;
  readFruitMarkdown(contentLocation: string): Promise<string>;
  updateFruitMarkdown(contentLocation: string, markdown: string): Promise<void>;
  removeFruitMarkdown(contentLocation: string): Promise<void>;
}
