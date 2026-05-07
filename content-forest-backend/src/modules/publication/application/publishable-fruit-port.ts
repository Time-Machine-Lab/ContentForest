export interface PublishableFruitPort {
  assertPublishable(fruitId: string): Promise<void>;
}

