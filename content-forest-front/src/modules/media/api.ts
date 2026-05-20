import type { CreateMediaAssetRequest, MediaAssetDetail } from './types'

type HttpMethod = 'GET' | 'POST'

export interface MediaFetchOptions {
  method?: HttpMethod
  body?: BodyInit | CreateMediaAssetRequest | null
}

export type MediaFetcher = <T>(url: string, options?: MediaFetchOptions) => Promise<T>

function endpoint(baseUrl: string, path: string) {
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createMediaApi(fetcher: MediaFetcher, baseUrl = '') {
  return {
    createMediaAsset(payload: CreateMediaAssetRequest) {
      return fetcher<MediaAssetDetail>(endpoint(baseUrl, '/api/media-assets'), {
        method: 'POST',
        body: payload,
      })
    },
    getMediaAsset(mediaAssetId: string) {
      return fetcher<MediaAssetDetail>(endpoint(baseUrl, `/api/media-assets/${encodeURIComponent(mediaAssetId)}`))
    },
    getMediaAssetContentUrl(mediaAssetId: string) {
      return endpoint(baseUrl, `/api/media-assets/${encodeURIComponent(mediaAssetId)}/content`)
    },
  }
}
