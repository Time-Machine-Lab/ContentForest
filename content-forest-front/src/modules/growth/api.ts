import type {
  GrowthFailedInput,
  GrowthNodeType,
  GrowthSourceStatus,
  GrowthTaskDetail,
  GrowthTaskResult,
  StartGrowthTaskRequest,
} from './types'

type HttpMethod = 'GET' | 'POST'

export interface GrowthFetchOptions {
  method?: HttpMethod
  body?: BodyInit | StartGrowthTaskRequest | null
}

export type GrowthFetcher = <T>(url: string, options?: GrowthFetchOptions) => Promise<T>

function endpoint(baseUrl: string, path: string) {
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function sourcePath(nodeType: GrowthNodeType, nodeId: string) {
  return `${encodeURIComponent(nodeType)}/${encodeURIComponent(nodeId)}`
}

export function createGrowthApi(fetcher: GrowthFetcher, baseUrl = '') {
  return {
    startGrowthTask(payload: StartGrowthTaskRequest) {
      return fetcher<GrowthTaskResult>(endpoint(baseUrl, '/api/growth-tasks'), {
        method: 'POST',
        body: payload,
      })
    },
    getGrowthTask(taskId: string) {
      return fetcher<GrowthTaskDetail>(endpoint(baseUrl, `/api/growth-tasks/${encodeURIComponent(taskId)}`))
    },
    retryGrowthSource(nodeType: GrowthNodeType, nodeId: string) {
      return fetcher<GrowthTaskResult>(endpoint(baseUrl, `/api/growth-sources/${sourcePath(nodeType, nodeId)}/retry`), {
        method: 'POST',
      })
    },
    getGrowthSourceStatus(nodeType: GrowthNodeType, nodeId: string) {
      return fetcher<GrowthSourceStatus>(endpoint(baseUrl, `/api/growth-sources/${sourcePath(nodeType, nodeId)}/status`))
    },
    getGrowthFailedInput(nodeType: GrowthNodeType, nodeId: string) {
      return fetcher<GrowthFailedInput | null>(endpoint(baseUrl, `/api/growth-sources/${sourcePath(nodeType, nodeId)}/failed-input`))
    },
  }
}
