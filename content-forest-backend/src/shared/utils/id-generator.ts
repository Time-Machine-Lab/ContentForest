export interface IdGenerator {
  nextId(prefix: string): string;
}

export class RandomIdGenerator implements IdGenerator {
  public nextId(prefix: string): string {
    const random = globalThis.crypto.randomUUID();
    return `${prefix}_${random}`;
  }
}

