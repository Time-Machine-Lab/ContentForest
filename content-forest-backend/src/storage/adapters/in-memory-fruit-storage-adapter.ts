import type { ParentNodeRef } from "../../modules/fruit/domain/fruit-types.js";
import type {
  FruitRecord,
  FruitStoragePort,
} from "../ports/fruit-storage-port.js";

export class InMemoryFruitStorageAdapter implements FruitStoragePort {
  private readonly records = new Map<string, FruitRecord>();

  public async createFruit(record: FruitRecord): Promise<void> {
    this.records.set(record.id, this.cloneRecord(record));
  }

  public async findFruitById(fruitId: string): Promise<FruitRecord | null> {
    const record = this.records.get(fruitId);
    return record === undefined ? null : this.cloneRecord(record);
  }

  public async saveFruit(record: FruitRecord): Promise<void> {
    this.records.set(record.id, this.cloneRecord(record));
  }

  public async listChildFruits(
    parentNodeRef: ParentNodeRef,
  ): Promise<FruitRecord[]> {
    return [...this.records.values()]
      .filter(
        (record) =>
          record.parentNodeRef.nodeId === parentNodeRef.nodeId &&
          record.parentNodeRef.nodeType === parentNodeRef.nodeType,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => this.cloneRecord(record));
  }

  private cloneRecord(record: FruitRecord): FruitRecord {
    return {
      ...record,
      parentNodeRef: { ...record.parentNodeRef },
      geneTags: [...record.geneTags],
    };
  }
}
