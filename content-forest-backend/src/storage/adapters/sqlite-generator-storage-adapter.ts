import { DatabaseSync } from "node:sqlite";
import type {
  GeneratorRecord,
  GeneratorStoragePort,
} from "../ports/generator-storage-port.js";
import type { GeneratorEnableState } from "../../modules/generator/domain/generator-types.js";

interface GeneratorRow {
  id: string;
  name: string;
  description: string;
  enable_state: GeneratorEnableState;
  content_location: string;
  created_at: string;
  updated_at: string;
  disabled_at: string | null;
}

export class SqliteGeneratorStorageAdapter implements GeneratorStoragePort {
  private readonly database: DatabaseSync;

  public constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath);
    this.ensureSchema();
  }

  public async createGenerator(record: GeneratorRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO generators (
          id,
          name,
          description,
          enable_state,
          content_location,
          created_at,
          updated_at,
          disabled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.name,
        record.description,
        record.enableState,
        record.contentLocation,
        record.createdAt,
        record.updatedAt,
        record.disabledAt,
      );
  }

  public async findGeneratorById(
    generatorId: string,
  ): Promise<GeneratorRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM generators WHERE id = ?")
      .get(generatorId) as GeneratorRow | undefined;
    return row === undefined ? null : this.toRecord(row);
  }

  public async listGenerators(): Promise<GeneratorRecord[]> {
    const rows = this.database
      .prepare("SELECT * FROM generators ORDER BY updated_at DESC")
      .all() as unknown as GeneratorRow[];
    return rows.map((row) => this.toRecord(row));
  }

  public async listGeneratorsByEnableState(
    enableState: GeneratorEnableState,
  ): Promise<GeneratorRecord[]> {
    const rows = this.database
      .prepare(
        "SELECT * FROM generators WHERE enable_state = ? ORDER BY updated_at DESC",
      )
      .all(enableState) as unknown as GeneratorRow[];
    return rows.map((row) => this.toRecord(row));
  }

  public async saveGenerator(record: GeneratorRecord): Promise<void> {
    this.database
      .prepare(
        `UPDATE generators
          SET name = ?,
              description = ?,
              enable_state = ?,
              content_location = ?,
              updated_at = ?,
              disabled_at = ?
          WHERE id = ?`,
      )
      .run(
        record.name,
        record.description,
        record.enableState,
        record.contentLocation,
        record.updatedAt,
        record.disabledAt,
        record.id,
      );
  }

  public close(): void {
    this.database.close();
  }

  private ensureSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS generators (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        enable_state TEXT NOT NULL DEFAULT 'enabled' CHECK (enable_state IN ('enabled', 'disabled')),
        content_location TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        disabled_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_generators_enable_state_updated_at
        ON generators (enable_state, updated_at);
    `);
  }

  private toRecord(row: GeneratorRow): GeneratorRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      enableState: row.enable_state,
      contentLocation: row.content_location,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      disabledAt: row.disabled_at,
    };
  }
}
