export const SEED_ARCHIVE_STATES = {
  active: "active",
  archived: "archived",
} as const;

export type SeedArchiveState =
  (typeof SEED_ARCHIVE_STATES)[keyof typeof SEED_ARCHIVE_STATES];

export interface SeedSummary {
  id: string;
  title: string;
  archiveState: SeedArchiveState;
  contentLocation: string;
  rootNodeId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface SeedDetail extends SeedSummary {
  markdown: string;
}

export interface SeedRootNode {
  seedId: string;
  nodeId: string;
  nodeType: "seed";
  workspaceReadOnly: boolean;
}

export interface SeedGrowthEligibility {
  seedId: string;
  canGrow: boolean;
  workspaceReadOnly: boolean;
  reason: string | null;
}

