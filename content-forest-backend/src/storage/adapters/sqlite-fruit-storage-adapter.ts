import { DatabaseSync } from "node:sqlite";
import type {
  FruitSelectionState,
  ParentNodeRef,
  ParentNodeType,
} from "../../modules/fruit/domain/fruit-types.js";
import type {
  FruitRecord,
  FruitStoragePort,
} from "../ports/fruit-storage-port.js";

interface FruitRow {
  id: string;
  selection_state: FruitSelectionState;
  parent_node_id: string;
  parent_node_type: ParentNodeType;
  content_location: string;
  generator_id: string | null;
  summary: string;
  gene_tags_json: string;
  created_at: string;
  updated_at: string;
}

export class SqliteFruitStorageAdapter implements FruitStoragePort {
  private readonly database: DatabaseSync;

  public constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath);
    this.ensureSchema();
  }

  public async createFruit(record: FruitRecord): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO fruits (
          id,
          selection_state,
          parent_node_id,
          parent_node_type,
          content_location,
          generator_id,
          summary,
          gene_tags_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.selectionState,
        record.parentNodeRef.nodeId,
        record.parentNodeRef.nodeType,
        record.contentLocation,
        record.generatorId,
        record.summary,
        JSON.stringify(record.geneTags),
        record.createdAt,
        record.updatedAt,
      );
  }

  public async findFruitById(fruitId: string): Promise<FruitRecord | null> {
    const row = this.database
      .prepare("SELECT * FROM fruits WHERE id = ?")
      .get(fruitId) as FruitRow | undefined;
    return row === undefined ? null : this.toRecord(row);
  }

  public async saveFruit(record: FruitRecord): Promise<void> {
    this.database
      .prepare(
        `UPDATE fruits
          SET selection_state = ?,
              parent_node_id = ?,
              parent_node_type = ?,
              content_location = ?,
              generator_id = ?,
              summary = ?,
              gene_tags_json = ?,
              updated_at = ?
          WHERE id = ?`,
      )
      .run(
        record.selectionState,
        record.parentNodeRef.nodeId,
        record.parentNodeRef.nodeType,
        record.contentLocation,
        record.generatorId,
        record.summary,
        JSON.stringify(record.geneTags),
        record.updatedAt,
        record.id,
      );
  }

  public async listChildFruits(
    parentNodeRef: ParentNodeRef,
  ): Promise<FruitRecord[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM fruits
          WHERE parent_node_type = ? AND parent_node_id = ?
          ORDER BY updated_at DESC`,
      )
      .all(parentNodeRef.nodeType, parentNodeRef.nodeId) as unknown as FruitRow[];
    return rows.map((row) => this.toRecord(row));
  }

  public close(): void {
    this.database.close();
  }

  private ensureSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS fruits (
        id TEXT PRIMARY KEY,
        selection_state TEXT NOT NULL DEFAULT 'candidate' CHECK (selection_state IN ('candidate', 'selected', 'eliminated')),
        parent_node_id TEXT NOT NULL,
        parent_node_type TEXT NOT NULL CHECK (parent_node_type IN ('seed', 'fruit')),
        content_location TEXT NOT NULL,
        generator_id TEXT,
        summary TEXT NOT NULL DEFAULT '',
        gene_tags_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_fruits_parent_node_updated_at
        ON fruits (parent_node_type, parent_node_id, updated_at);

      CREATE INDEX IF NOT EXISTS idx_fruits_selection_state_updated_at
        ON fruits (selection_state, updated_at);
    `);
    this.ensureColumn("fruits", "generator_id", "TEXT");
  }

  private toRecord(row: FruitRow): FruitRecord {
    return {
      id: row.id,
      selectionState: row.selection_state,
      parentNodeRef: {
        nodeId: row.parent_node_id,
        nodeType: row.parent_node_type,
      },
      contentLocation: row.content_location,
      generatorId: row.generator_id,
      summary: row.summary,
      geneTags: this.parseGeneTags(row.gene_tags_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private parseGeneTags(value: string): string[] {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }

  private ensureColumn(
    tableName: string,
    columnName: string,
    definition: string,
  ): void {
    const rows = this.database
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as Array<{ name: string }>;
    if (!rows.some((row) => row.name === columnName)) {
      this.database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    }
  }
}
