import type {
  CreatePublicationRecordRequest,
  PublicationRecord,
  UpdatePublicationRecordRequest,
} from './types'

type HttpMethod = 'GET' | 'POST' | 'PATCH'

export interface PublicationFetchOptions {
  method?: HttpMethod
  body?: BodyInit | CreatePublicationRecordRequest | UpdatePublicationRecordRequest | null
}

export type PublicationFetcher = <T>(url: string, options?: PublicationFetchOptions) => Promise<T>

function endpoint(baseUrl: string, path: string) {
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createPublicationApi(fetcher: PublicationFetcher, baseUrl = '') {
  return {
    createPublicationRecord(payload: CreatePublicationRecordRequest) {
      return fetcher<PublicationRecord>(endpoint(baseUrl, '/api/publication-records'), {
        method: 'POST',
        body: payload,
      })
    },
    listPublicationRecordsByFruit(fruitId: string) {
      return fetcher<PublicationRecord[]>(endpoint(baseUrl, `/api/fruits/${encodeURIComponent(fruitId)}/publication-records`))
    },
    getPublicationRecord(publicationRecordId: string) {
      return fetcher<PublicationRecord>(endpoint(baseUrl, `/api/publication-records/${encodeURIComponent(publicationRecordId)}`))
    },
    updatePublicationRecord(publicationRecordId: string, payload: UpdatePublicationRecordRequest) {
      return fetcher<PublicationRecord>(endpoint(baseUrl, `/api/publication-records/${encodeURIComponent(publicationRecordId)}`), {
        method: 'PATCH',
        body: payload,
      })
    },
  }
}
