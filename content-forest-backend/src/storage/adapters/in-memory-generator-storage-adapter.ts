import type {
  GeneratorRecord,
  GeneratorStoragePort,
} from "../ports/generator-storage-port.js";
import type { GeneratorEnableState } from "../../modules/generator/domain/generator-types.js";

export class InMemoryGeneratorStorageAdapter implements GeneratorStoragePort {
  private readonly records = new Map<string, GeneratorRecord>();

  public async createGenerator(record: GeneratorRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  public async findGeneratorById(
    generatorId: string,
  ): Promise<GeneratorRecord | null> {
    const record = this.records.get(generatorId);
    return record === undefined ? null : { ...record };
  }

  public async listGenerators(): Promise<GeneratorRecord[]> {
    return this.sortedRecords([...this.records.values()]);
  }

  public async listGeneratorsByEnableState(
    enableState: GeneratorEnableState,
  ): Promise<GeneratorRecord[]> {
    return this.sortedRecords(
      [...this.records.values()].filter(
        (record) => record.enableState === enableState,
      ),
    );
  }

  public async saveGenerator(record: GeneratorRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  private sortedRecords(records: GeneratorRecord[]): GeneratorRecord[] {
    return records
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => ({ ...record }));
  }
}
