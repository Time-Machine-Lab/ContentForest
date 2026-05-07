import type { FruitDetail, UpdateFruitContentRequest } from './types'

type HttpMethod = 'GET' | 'POST' | 'PATCH'

export interface FruitFetchOptions {
  method?: HttpMethod
  body?: BodyInit | UpdateFruitContentRequest | null
}

export type FruitFetcher = <T>(url: string, options?: FruitFetchOptions) => Promise<T>

function endpoint(baseUrl: string, path: string) {
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createFruitApi(fetcher: FruitFetcher, baseUrl = '') {
  return {
    getFruit(fruitId: string) {
      return fetcher<FruitDetail>(endpoint(baseUrl, `/api/fruits/${encodeURIComponent(fruitId)}`))
    },
    updateFruitContent(fruitId: string, payload: UpdateFruitContentRequest) {
      return fetcher<FruitDetail>(endpoint(baseUrl, `/api/fruits/${encodeURIComponent(fruitId)}/content`), {
        method: 'PATCH',
        body: payload,
      })
    },
    selectFruit(fruitId: string) {
      return fetcher<FruitDetail>(endpoint(baseUrl, `/api/fruits/${encodeURIComponent(fruitId)}/select`), {
        method: 'POST',
      })
    },
    eliminateFruit(fruitId: string) {
      return fetcher<FruitDetail>(endpoint(baseUrl, `/api/fruits/${encodeURIComponent(fruitId)}/eliminate`), {
        method: 'POST',
      })
    },
    restoreFruitCandidate(fruitId: string) {
      return fetcher<FruitDetail>(endpoint(baseUrl, `/api/fruits/${encodeURIComponent(fruitId)}/restore-candidate`), {
        method: 'POST',
      })
    },
  }
}
