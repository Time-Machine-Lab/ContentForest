import type {
  CreateSeedRequest,
  SeedBriefDetail,
  SeedDetail,
  SeedRootNode,
  SeedSummary,
  UpdateSeedBriefRequest,
  UpdateSeedRequest,
} from './types'

type HttpMethod = 'GET' | 'POST' | 'PATCH'

export interface SeedFetchOptions {
  method?: HttpMethod
  body?: BodyInit | CreateSeedRequest | UpdateSeedRequest | UpdateSeedBriefRequest | null
}

export type SeedFetcher = <T>(url: string, options?: SeedFetchOptions) => Promise<T>

function endpoint(baseUrl: string, path: string) {
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createSeedApi(fetcher: SeedFetcher, baseUrl = '') {
  return {
    listActiveSeeds() {
      return fetcher<SeedSummary[]>(endpoint(baseUrl, '/api/seeds'))
    },
    listArchivedSeeds() {
      return fetcher<SeedSummary[]>(endpoint(baseUrl, '/api/seeds/archived'))
    },
    getSeed(seedId: string) {
      return fetcher<SeedDetail>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}`))
    },
    createSeed(payload: CreateSeedRequest) {
      return fetcher<SeedDetail>(endpoint(baseUrl, '/api/seeds'), {
        method: 'POST',
        body: payload,
      })
    },
    updateSeed(seedId: string, payload: UpdateSeedRequest) {
      return fetcher<SeedDetail>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}`), {
        method: 'PATCH',
        body: payload,
      })
    },
    archiveSeed(seedId: string) {
      return fetcher<SeedDetail>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/archive`), {
        method: 'POST',
      })
    },
    restoreSeed(seedId: string) {
      return fetcher<SeedDetail>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/restore`), {
        method: 'POST',
      })
    },
    getSeedRootNode(seedId: string) {
      return fetcher<SeedRootNode>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/root-node`))
    },
    generateSeedBrief(seedId: string) {
      return fetcher<SeedBriefDetail>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/brief`), {
        method: 'POST',
      })
    },
    getSeedBrief(seedId: string) {
      return fetcher<SeedBriefDetail | null>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/brief`))
    },
    updateSeedBrief(seedId: string, payload: UpdateSeedBriefRequest) {
      return fetcher<SeedBriefDetail>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/brief`), {
        method: 'PATCH',
        body: payload,
      })
    },
    refreshSeedBrief(seedId: string) {
      return fetcher<SeedBriefDetail>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/brief/refresh`), {
        method: 'POST',
      })
    },
  }
}
