import type {
  FeedbackMonitorAttachment,
  FeedbackSnapshot,
} from "../../modules/feedback/domain/feedback-types.js";

export interface FeedbackStoragePort {
  createMonitorAttachment(attachment: FeedbackMonitorAttachment): Promise<void>;
  findMonitorAttachmentById(
    monitorAttachmentId: string,
  ): Promise<FeedbackMonitorAttachment | null>;
  findMonitorAttachmentByPublicationRecordId(
    publicationRecordId: string,
  ): Promise<FeedbackMonitorAttachment | null>;
  hasMonitorAttachmentForPublicationRecord(
    publicationRecordId: string,
  ): Promise<boolean>;
  createFeedbackSnapshot(snapshot: FeedbackSnapshot): Promise<void>;
  saveFeedbackSnapshot(snapshot: FeedbackSnapshot): Promise<void>;
  findFeedbackSnapshotById(snapshotId: string): Promise<FeedbackSnapshot | null>;
  listFeedbackSnapshotsByPublicationRecord(
    publicationRecordId: string,
  ): Promise<FeedbackSnapshot[]>;
}
