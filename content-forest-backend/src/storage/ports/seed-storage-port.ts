import type { SeedArchiveState } from "../../modules/seed/domain/seed-types.js";

export interface SeedRecord {
  id: string;
  title: string;
  archiveState: SeedArchiveState;
  contentLocation: string;
  rootNodeId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface SeedStoragePort {
  createSeed(record: SeedRecord): Promise<void>;
  findSeedById(seedId: string): Promise<SeedRecord | null>;
  listSeedsByArchiveState(archiveState: SeedArchiveState): Promise<SeedRecord[]>;
  saveSeed(record: SeedRecord): Promise<void>;
}

