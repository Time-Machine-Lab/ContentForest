export const FRUIT_SELECTION_STATES = {
  candidate: "candidate",
  selected: "selected",
  eliminated: "eliminated",
} as const;

export type FruitSelectionState =
  (typeof FRUIT_SELECTION_STATES)[keyof typeof FRUIT_SELECTION_STATES];

export type ParentNodeType = "seed" | "fruit";

export interface ParentNodeRef {
  nodeId: string;
  nodeType: ParentNodeType;
}

export interface FruitSummary {
  id: string;
  selectionState: FruitSelectionState;
  parentNodeRef: ParentNodeRef;
  contentLocation: string;
  generatorId: string | null;
  summary: string;
  geneTags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FruitDetail extends FruitSummary {
  markdown: string;
}

export interface FruitPublishEligibility {
  fruitId: string;
  canPublish: boolean;
  reason: string | null;
}

export interface FruitGrowthSourceRef {
  fruitId: string;
  nodeId: string;
  nodeType: "fruit";
  contentLocation: string;
}
