import type {
  GrowthAttempt,
  GrowthFailedInput,
  GrowthSourceNodeRef,
  GrowthTaskSummary,
} from "../../modules/growth/domain/growth-types.js";

export type GrowthTaskRecord = GrowthTaskSummary;
export type GrowthAttemptRecord = GrowthAttempt;
export type GrowthFailedInputRecord = GrowthFailedInput;

export interface GrowthLockRecord {
  sourceNodeRef: GrowthSourceNodeRef;
  taskId: string;
  lockedAt: string;
}

export interface GrowthStoragePort {
  createTask(record: GrowthTaskRecord): Promise<void>;
  findTaskById(taskId: string): Promise<GrowthTaskRecord | null>;
  saveTask(record: GrowthTaskRecord): Promise<void>;

  createAttempt(record: GrowthAttemptRecord): Promise<void>;
  saveAttempt(record: GrowthAttemptRecord): Promise<void>;
  listAttemptsByTaskId(taskId: string): Promise<GrowthAttemptRecord[]>;

  acquireLock(record: GrowthLockRecord): Promise<boolean>;
  releaseLock(sourceNodeRef: GrowthSourceNodeRef, taskId?: string): Promise<void>;
  findLockBySource(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<GrowthLockRecord | null>;

  upsertFailedInput(record: GrowthFailedInputRecord): Promise<void>;
  findFailedInputBySource(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<GrowthFailedInputRecord | null>;
  clearFailedInput(sourceNodeRef: GrowthSourceNodeRef): Promise<void>;
}

export function cloneGrowthResourceRefs<T extends { resourceId: string }>(
  refs: T[],
): T[] {
  return refs.map((ref) => ({ ...ref }));
}
