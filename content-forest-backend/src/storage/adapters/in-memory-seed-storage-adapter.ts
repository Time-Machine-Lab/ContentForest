import type {
  SeedRecord,
  SeedStoragePort,
} from "../ports/seed-storage-port.js";
import type { SeedArchiveState } from "../../modules/seed/domain/seed-types.js";

export class InMemorySeedStorageAdapter implements SeedStoragePort {
  private readonly records = new Map<string, SeedRecord>();

  public async createSeed(record: SeedRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  public async findSeedById(seedId: string): Promise<SeedRecord | null> {
    const record = this.records.get(seedId);
    return record === undefined ? null : { ...record };
  }

  public async listSeedsByArchiveState(
    archiveState: SeedArchiveState,
  ): Promise<SeedRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.archiveState === archiveState)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => ({ ...record }));
  }

  public async saveSeed(record: SeedRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }
}

