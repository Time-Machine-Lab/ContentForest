export interface SaveGeneratorSkillInput {
  generatorId: string;
  zipBuffer: Buffer;
}

export interface GeneratorSkillOverview {
  skillMarkdown: string;
  entries: string[];
}

export interface GeneratorSkillContentAccessPort {
  saveGeneratorSkill(input: SaveGeneratorSkillInput): Promise<string>;
  replaceGeneratorSkill(input: SaveGeneratorSkillInput): Promise<string>;
  readGeneratorSkill(contentLocation: string): Promise<GeneratorSkillOverview>;
  removeGeneratorSkill(contentLocation: string): Promise<void>;
}
