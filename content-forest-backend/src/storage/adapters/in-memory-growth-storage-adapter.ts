import type {
  GrowthAttemptRecord,
  GrowthFailedInputRecord,
  GrowthLockRecord,
  GrowthStoragePort,
  GrowthTaskRecord,
} from "../ports/growth-storage-port.js";
import { cloneGrowthResourceRefs } from "../ports/growth-storage-port.js";
import type {
  GrowthAuthorizationScope,
  GrowthSourceNodeRef,
} from "../../modules/growth/domain/growth-types.js";

export class InMemoryGrowthStorageAdapter implements GrowthStoragePort {
  private readonly tasks = new Map<string, GrowthTaskRecord>();
  private readonly attempts = new Map<string, GrowthAttemptRecord>();
  private readonly locks = new Map<string, GrowthLockRecord>();
  private readonly failedInputs = new Map<string, GrowthFailedInputRecord>();

  public async createTask(record: GrowthTaskRecord): Promise<void> {
    this.tasks.set(record.id, this.cloneTask(record));
  }

  public async findTaskById(taskId: string): Promise<GrowthTaskRecord | null> {
    const record = this.tasks.get(taskId);
    return record === undefined ? null : this.cloneTask(record);
  }

  public async listRunningTasks(): Promise<GrowthTaskRecord[]> {
    return [...this.tasks.values()]
      .filter((record) => record.status === "running")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((record) => this.cloneTask(record));
  }

  public async saveTask(record: GrowthTaskRecord): Promise<void> {
    this.tasks.set(record.id, this.cloneTask(record));
  }

  public async createAttempt(record: GrowthAttemptRecord): Promise<void> {
    this.attempts.set(record.id, this.cloneAttempt(record));
  }

  public async saveAttempt(record: GrowthAttemptRecord): Promise<void> {
    this.attempts.set(record.id, this.cloneAttempt(record));
  }

  public async listAttemptsByTaskId(
    taskId: string,
  ): Promise<GrowthAttemptRecord[]> {
    return [...this.attempts.values()]
      .filter((record) => record.taskId === taskId)
      .sort((left, right) => left.attemptIndex - right.attemptIndex)
      .map((record) => this.cloneAttempt(record));
  }

  public async acquireLock(record: GrowthLockRecord): Promise<boolean> {
    const key = this.sourceKey(record.sourceNodeRef);
    if (this.locks.has(key)) {
      return false;
    }
    this.locks.set(key, this.cloneLock(record));
    return true;
  }

  public async releaseLock(
    sourceNodeRef: GrowthSourceNodeRef,
    taskId?: string,
  ): Promise<void> {
    const key = this.sourceKey(sourceNodeRef);
    const record = this.locks.get(key);
    if (record === undefined) {
      return;
    }
    if (taskId !== undefined && record.taskId !== taskId) {
      return;
    }
    this.locks.delete(key);
  }

  public async findLockBySource(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<GrowthLockRecord | null> {
    const record = this.locks.get(this.sourceKey(sourceNodeRef));
    return record === undefined ? null : this.cloneLock(record);
  }

  public async listLocks(): Promise<GrowthLockRecord[]> {
    return [...this.locks.values()]
      .sort((left, right) => left.lockedAt.localeCompare(right.lockedAt))
      .map((record) => this.cloneLock(record));
  }

  public async upsertFailedInput(record: GrowthFailedInputRecord): Promise<void> {
    this.failedInputs.set(this.sourceKey(record.sourceNodeRef), this.cloneFailedInput(record));
  }

  public async findFailedInputBySource(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<GrowthFailedInputRecord | null> {
    const record = this.failedInputs.get(this.sourceKey(sourceNodeRef));
    return record === undefined ? null : this.cloneFailedInput(record);
  }

  public async clearFailedInput(sourceNodeRef: GrowthSourceNodeRef): Promise<void> {
    this.failedInputs.delete(this.sourceKey(sourceNodeRef));
  }

  private sourceKey(sourceNodeRef: GrowthSourceNodeRef): string {
    return `${sourceNodeRef.nodeType}:${sourceNodeRef.nodeId}`;
  }

  private cloneTask(record: GrowthTaskRecord): GrowthTaskRecord {
    return {
      ...record,
      sourceNodeRef: { ...record.sourceNodeRef },
      nutrientRefs: cloneGrowthResourceRefs(record.nutrientRefs),
      geneRefs: cloneGrowthResourceRefs(record.geneRefs),
      detailParams: { ...record.detailParams },
      authorizationScope: this.cloneAuthorizationScope(record.authorizationScope),
      agentInput: { ...record.agentInput },
      successfulFruitIds: [...record.successfulFruitIds],
    };
  }

  private cloneAttempt(record: GrowthAttemptRecord): GrowthAttemptRecord {
    return {
      ...record,
      agentOutput: { ...record.agentOutput },
    };
  }

  private cloneLock(record: GrowthLockRecord): GrowthLockRecord {
    return {
      ...record,
      sourceNodeRef: { ...record.sourceNodeRef },
    };
  }

  private cloneFailedInput(record: GrowthFailedInputRecord): GrowthFailedInputRecord {
    return {
      ...record,
      sourceNodeRef: { ...record.sourceNodeRef },
      nutrientRefs: cloneGrowthResourceRefs(record.nutrientRefs),
      geneRefs: cloneGrowthResourceRefs(record.geneRefs),
      detailParams: { ...record.detailParams },
    };
  }

  private cloneAuthorizationScope(
    scope: GrowthAuthorizationScope,
  ): GrowthAuthorizationScope {
    return {
      ...scope,
      sourceNodeRef: { ...scope.sourceNodeRef },
      nutrientRefs: cloneGrowthResourceRefs(scope.nutrientRefs),
      geneRefs: cloneGrowthResourceRefs(scope.geneRefs),
    };
  }
}
