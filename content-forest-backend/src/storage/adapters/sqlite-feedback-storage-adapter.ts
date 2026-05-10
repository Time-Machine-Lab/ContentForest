import { DatabaseSync } from "node:sqlite";
import type {
  FeedbackMonitorAttachment,
  FeedbackMonitorType,
  FeedbackSnapshot,
} from "../../modules/feedback/domain/feedback-types.js";
import type { FeedbackStoragePort } from "../ports/feedback-storage-port.js";

interface FeedbackMonitorAttachmentRow {
  id: string;
  publication_record_id: string;
  monitor_type: FeedbackMonitorType;
  created_at: string;
  updated_at: string;
}

interface FeedbackSnapshotRow {
  id: string;
  publication_record_id: string;
  monitor_attachment_id: string;
  performance_data_json: string;
  user_observation: string;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

export class SqliteFeedbackStorageAdapter implements FeedbackStoragePort {
  private readonly database: DatabaseSync;

  public constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath);
    this.ensureSchema();
  }

  public async createMonitorAttachment(
    attachment: FeedbackMonitorAttachment,
  ): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO feedback_monitor_attachments (
          id,
          publication_record_id,
          monitor_type,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        attachment.id,
        attachment.publicationRecordId,
        attachment.monitorType,
        attachment.createdAt,
        attachment.updatedAt,
      );
  }

  public async findMonitorAttachmentById(
    monitorAttachmentId: string,
  ): Promise<FeedbackMonitorAttachment | null> {
    const row = this.database
      .prepare("SELECT * FROM feedback_monitor_attachments WHERE id = ?")
      .get(monitorAttachmentId) as FeedbackMonitorAttachmentRow | undefined;
    return row === undefined ? null : this.toMonitorAttachment(row);
  }

  public async findMonitorAttachmentByPublicationRecordId(
    publicationRecordId: string,
  ): Promise<FeedbackMonitorAttachment | null> {
    const row = this.database
      .prepare(
        "SELECT * FROM feedback_monitor_attachments WHERE publication_record_id = ?",
      )
      .get(publicationRecordId) as FeedbackMonitorAttachmentRow | undefined;
    return row === undefined ? null : this.toMonitorAttachment(row);
  }

  public async hasMonitorAttachmentForPublicationRecord(
    publicationRecordId: string,
  ): Promise<boolean> {
    const row = this.database
      .prepare(
        `SELECT 1 AS exists_flag
          FROM feedback_monitor_attachments
          WHERE publication_record_id = ?`,
      )
      .get(publicationRecordId) as { exists_flag: number } | undefined;
    return row !== undefined;
  }

  public async createFeedbackSnapshot(
    snapshot: FeedbackSnapshot,
  ): Promise<void> {
    this.database
      .prepare(
        `INSERT INTO feedback_snapshots (
          id,
          publication_record_id,
          monitor_attachment_id,
          performance_data_json,
          user_observation,
          captured_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        snapshot.id,
        snapshot.publicationRecordId,
        snapshot.monitorAttachmentId,
        JSON.stringify(snapshot.performanceData),
        snapshot.userObservation,
        snapshot.capturedAt,
        snapshot.createdAt,
        snapshot.updatedAt,
      );
  }

  public async saveFeedbackSnapshot(snapshot: FeedbackSnapshot): Promise<void> {
    this.database
      .prepare(
        `UPDATE feedback_snapshots
          SET performance_data_json = ?,
              user_observation = ?,
              captured_at = ?,
              updated_at = ?
          WHERE id = ?`,
      )
      .run(
        JSON.stringify(snapshot.performanceData),
        snapshot.userObservation,
        snapshot.capturedAt,
        snapshot.updatedAt,
        snapshot.id,
      );
  }

  public async findFeedbackSnapshotById(
    snapshotId: string,
  ): Promise<FeedbackSnapshot | null> {
    const row = this.database
      .prepare("SELECT * FROM feedback_snapshots WHERE id = ?")
      .get(snapshotId) as FeedbackSnapshotRow | undefined;
    return row === undefined ? null : this.toSnapshot(row);
  }

  public async listFeedbackSnapshotsByPublicationRecord(
    publicationRecordId: string,
  ): Promise<FeedbackSnapshot[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM feedback_snapshots
          WHERE publication_record_id = ?
          ORDER BY captured_at ASC, created_at ASC`,
      )
      .all(publicationRecordId) as unknown as FeedbackSnapshotRow[];
    return rows.map((row) => this.toSnapshot(row));
  }

  public close(): void {
    this.database.close();
  }

  private ensureSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS feedback_monitor_attachments (
        id TEXT PRIMARY KEY,
        publication_record_id TEXT NOT NULL UNIQUE,
        monitor_type TEXT NOT NULL DEFAULT 'manual' CHECK (monitor_type = 'manual'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS feedback_snapshots (
        id TEXT PRIMARY KEY,
        publication_record_id TEXT NOT NULL,
        monitor_attachment_id TEXT NOT NULL,
        performance_data_json TEXT NOT NULL,
        user_observation TEXT NOT NULL DEFAULT '',
        captured_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_feedback_snapshots_publication_captured_at
        ON feedback_snapshots (publication_record_id, captured_at);
    `);
  }

  private toMonitorAttachment(
    row: FeedbackMonitorAttachmentRow,
  ): FeedbackMonitorAttachment {
    return {
      id: row.id,
      publicationRecordId: row.publication_record_id,
      monitorType: row.monitor_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toSnapshot(row: FeedbackSnapshotRow): FeedbackSnapshot {
    return {
      id: row.id,
      publicationRecordId: row.publication_record_id,
      monitorAttachmentId: row.monitor_attachment_id,
      performanceData: JSON.parse(row.performance_data_json) as Record<
        string,
        unknown
      >,
      userObservation: row.user_observation,
      capturedAt: row.captured_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
