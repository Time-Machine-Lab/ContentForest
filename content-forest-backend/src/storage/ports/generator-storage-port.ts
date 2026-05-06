import type { GeneratorEnableState } from "../../modules/generator/domain/generator-types.js";

export interface GeneratorRecord {
  id: string;
  name: string;
  description: string;
  enableState: GeneratorEnableState;
  contentLocation: string;
  createdAt: string;
  updatedAt: string;
  disabledAt: string | null;
}

export interface GeneratorStoragePort {
  createGenerator(record: GeneratorRecord): Promise<void>;
  findGeneratorById(generatorId: string): Promise<GeneratorRecord | null>;
  listGenerators(): Promise<GeneratorRecord[]>;
  listGeneratorsByEnableState(
    enableState: GeneratorEnableState,
  ): Promise<GeneratorRecord[]>;
  saveGenerator(record: GeneratorRecord): Promise<void>;
}
