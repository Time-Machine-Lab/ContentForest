import type {
  CreateFeedbackSnapshotRequest,
  FeedbackHistory,
  FeedbackMonitorAttachment,
  FeedbackSnapshot,
  UpdateFeedbackSnapshotRequest,
} from './types'

type HttpMethod = 'GET' | 'POST' | 'PATCH'

export interface FeedbackFetchOptions {
  method?: HttpMethod
  body?: BodyInit | CreateFeedbackSnapshotRequest | UpdateFeedbackSnapshotRequest | null
}

export type FeedbackFetcher = <T>(url: string, options?: FeedbackFetchOptions) => Promise<T>

function endpoint(baseUrl: string, path: string) {
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createFeedbackApi(fetcher: FeedbackFetcher, baseUrl = '') {
  return {
    attachManualMonitor(publicationRecordId: string) {
      return fetcher<FeedbackMonitorAttachment>(endpoint(baseUrl, `/api/publication-records/${encodeURIComponent(publicationRecordId)}/monitor`), {
        method: 'POST',
      })
    },
    getFeedbackHistory(publicationRecordId: string) {
      return fetcher<FeedbackHistory>(endpoint(baseUrl, `/api/publication-records/${encodeURIComponent(publicationRecordId)}/feedback`))
    },
    createFeedbackSnapshot(publicationRecordId: string, payload: CreateFeedbackSnapshotRequest) {
      return fetcher<FeedbackSnapshot>(endpoint(baseUrl, `/api/publication-records/${encodeURIComponent(publicationRecordId)}/feedback-snapshots`), {
        method: 'POST',
        body: payload,
      })
    },
    updateFeedbackSnapshot(snapshotId: string, payload: UpdateFeedbackSnapshotRequest) {
      return fetcher<FeedbackSnapshot>(endpoint(baseUrl, `/api/feedback-snapshots/${encodeURIComponent(snapshotId)}`), {
        method: 'PATCH',
        body: payload,
      })
    },
  }
}
