export const FEEDBACK_MONITOR_TYPES = {
  manual: "manual",
} as const;

export type FeedbackMonitorType =
  (typeof FEEDBACK_MONITOR_TYPES)[keyof typeof FEEDBACK_MONITOR_TYPES];

export interface FeedbackMonitorAttachment {
  id: string;
  publicationRecordId: string;
  monitorType: FeedbackMonitorType;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSnapshot {
  id: string;
  publicationRecordId: string;
  monitorAttachmentId: string;
  performanceData: Record<string, unknown>;
  userObservation: string;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackHistory {
  publicationRecordId: string;
  monitorAttachment: FeedbackMonitorAttachment | null;
  snapshots: FeedbackSnapshot[];
}
