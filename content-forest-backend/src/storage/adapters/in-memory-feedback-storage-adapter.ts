import type {
  FeedbackMonitorAttachment,
  FeedbackSnapshot,
} from "../../modules/feedback/domain/feedback-types.js";
import type { FeedbackStoragePort } from "../ports/feedback-storage-port.js";

export class InMemoryFeedbackStorageAdapter implements FeedbackStoragePort {
  private readonly monitorAttachments = new Map<
    string,
    FeedbackMonitorAttachment
  >();
  private readonly snapshots = new Map<string, FeedbackSnapshot>();

  public async createMonitorAttachment(
    attachment: FeedbackMonitorAttachment,
  ): Promise<void> {
    this.monitorAttachments.set(attachment.id, { ...attachment });
  }

  public async findMonitorAttachmentById(
    monitorAttachmentId: string,
  ): Promise<FeedbackMonitorAttachment | null> {
    const attachment = this.monitorAttachments.get(monitorAttachmentId);
    return attachment === undefined ? null : { ...attachment };
  }

  public async findMonitorAttachmentByPublicationRecordId(
    publicationRecordId: string,
  ): Promise<FeedbackMonitorAttachment | null> {
    const attachment = [...this.monitorAttachments.values()].find(
      (item) => item.publicationRecordId === publicationRecordId,
    );
    return attachment === undefined ? null : { ...attachment };
  }

  public async hasMonitorAttachmentForPublicationRecord(
    publicationRecordId: string,
  ): Promise<boolean> {
    return [...this.monitorAttachments.values()].some(
      (attachment) => attachment.publicationRecordId === publicationRecordId,
    );
  }

  public async createFeedbackSnapshot(
    snapshot: FeedbackSnapshot,
  ): Promise<void> {
    this.snapshots.set(snapshot.id, this.cloneSnapshot(snapshot));
  }

  public async saveFeedbackSnapshot(snapshot: FeedbackSnapshot): Promise<void> {
    this.snapshots.set(snapshot.id, this.cloneSnapshot(snapshot));
  }

  public async findFeedbackSnapshotById(
    snapshotId: string,
  ): Promise<FeedbackSnapshot | null> {
    const snapshot = this.snapshots.get(snapshotId);
    return snapshot === undefined ? null : this.cloneSnapshot(snapshot);
  }

  public async listFeedbackSnapshotsByPublicationRecord(
    publicationRecordId: string,
  ): Promise<FeedbackSnapshot[]> {
    return [...this.snapshots.values()]
      .filter((snapshot) => snapshot.publicationRecordId === publicationRecordId)
      .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
      .map((snapshot) => this.cloneSnapshot(snapshot));
  }

  private cloneSnapshot(snapshot: FeedbackSnapshot): FeedbackSnapshot {
    return {
      ...snapshot,
      performanceData: structuredClone(snapshot.performanceData),
    };
  }
}
