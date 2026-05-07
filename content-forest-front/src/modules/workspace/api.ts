import type { WorkspaceSnapshot } from './types'

type HttpMethod = 'GET'

export interface WorkspaceFetchOptions {
  method?: HttpMethod
}

export type WorkspaceFetcher = <T>(url: string, options?: WorkspaceFetchOptions) => Promise<T>

function endpoint(baseUrl: string, path: string) {
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createWorkspaceApi(fetcher: WorkspaceFetcher, baseUrl = '') {
  return {
    getSeedWorkspace(seedId: string) {
      return fetcher<WorkspaceSnapshot>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/workspace`))
    },
  }
}
