export type FeedbackMonitorType = 'manual'

export interface FeedbackMonitorAttachment {
  id: string
  publicationRecordId: string
  monitorType: FeedbackMonitorType
  createdAt: string
  updatedAt: string
}

export interface FeedbackSnapshot {
  id: string
  publicationRecordId: string
  monitorAttachmentId: string
  performanceData: Record<string, unknown>
  userObservation: string
  capturedAt: string
  createdAt: string
  updatedAt: string
}

export interface FeedbackHistory {
  publicationRecordId: string
  monitorAttachment: FeedbackMonitorAttachment | null
  snapshots: FeedbackSnapshot[]
}

export interface CreateFeedbackSnapshotRequest {
  performanceData: Record<string, unknown>
  userObservation?: string
  capturedAt?: string
}

export interface UpdateFeedbackSnapshotRequest {
  performanceData?: Record<string, unknown>
  userObservation?: string
  capturedAt?: string
}
