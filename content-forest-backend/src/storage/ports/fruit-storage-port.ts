import type {
  FruitSelectionState,
  ParentNodeRef,
} from "../../modules/fruit/domain/fruit-types.js";

export interface FruitRecord {
  id: string;
  selectionState: FruitSelectionState;
  parentNodeRef: ParentNodeRef;
  contentLocation: string;
  summary: string;
  geneTags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FruitStoragePort {
  createFruit(record: FruitRecord): Promise<void>;
  findFruitById(fruitId: string): Promise<FruitRecord | null>;
  saveFruit(record: FruitRecord): Promise<void>;
  listChildFruits(parentNodeRef: ParentNodeRef): Promise<FruitRecord[]>;
}
