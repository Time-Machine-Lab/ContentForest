import type {
  CreateNutrientContentRequest,
  CreateNutrientLibraryRequest,
  NutrientContentDetail,
  NutrientContentListQuery,
  NutrientContentSummary,
  NutrientLibraryDetail,
  NutrientLibraryListQuery,
  NutrientLibrarySummary,
  ReferableNutrientContent,
  UpdateNutrientContentRequest,
  UpdateNutrientLibraryRequest,
} from './types'

type HttpMethod = 'GET' | 'POST' | 'PATCH'

export interface NutrientFetchOptions {
  method?: HttpMethod
  body?: BodyInit
    | CreateNutrientLibraryRequest
    | UpdateNutrientLibraryRequest
    | CreateNutrientContentRequest
    | UpdateNutrientContentRequest
    | null
}

export type NutrientFetcher = <T>(url: string, options?: NutrientFetchOptions) => Promise<T>

function endpoint(baseUrl: string, path: string) {
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function queryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const serialized = search.toString()
  return serialized ? `?${serialized}` : ''
}

export function createNutrientApi(fetcher: NutrientFetcher, baseUrl = '') {
  return {
    listLibraries(query: NutrientLibraryListQuery = {}) {
      const search = queryString({
        scope: query.scope,
        archiveState: query.archiveState,
        seedId: query.seedId,
      })
      return fetcher<NutrientLibrarySummary[]>(endpoint(baseUrl, `/api/nutrient-libraries${search}`))
    },
    getLibrary(libraryId: string) {
      return fetcher<NutrientLibraryDetail>(endpoint(baseUrl, `/api/nutrient-libraries/${encodeURIComponent(libraryId)}`))
    },
    createLibrary(payload: CreateNutrientLibraryRequest) {
      return fetcher<NutrientLibraryDetail>(endpoint(baseUrl, '/api/nutrient-libraries'), {
        method: 'POST',
        body: payload,
      })
    },
    updateLibrary(libraryId: string, payload: UpdateNutrientLibraryRequest) {
      return fetcher<NutrientLibraryDetail>(endpoint(baseUrl, `/api/nutrient-libraries/${encodeURIComponent(libraryId)}`), {
        method: 'PATCH',
        body: payload,
      })
    },
    archiveLibrary(libraryId: string) {
      return fetcher<NutrientLibraryDetail>(endpoint(baseUrl, `/api/nutrient-libraries/${encodeURIComponent(libraryId)}/archive`), {
        method: 'POST',
      })
    },
    restoreLibrary(libraryId: string) {
      return fetcher<NutrientLibraryDetail>(endpoint(baseUrl, `/api/nutrient-libraries/${encodeURIComponent(libraryId)}/restore`), {
        method: 'POST',
      })
    },
    listContents(libraryId: string, query: NutrientContentListQuery = {}) {
      const search = queryString({ archiveState: query.archiveState })
      return fetcher<NutrientContentSummary[]>(endpoint(baseUrl, `/api/nutrient-libraries/${encodeURIComponent(libraryId)}/contents${search}`))
    },
    createContent(libraryId: string, payload: CreateNutrientContentRequest) {
      return fetcher<NutrientContentDetail>(endpoint(baseUrl, `/api/nutrient-libraries/${encodeURIComponent(libraryId)}/contents`), {
        method: 'POST',
        body: payload,
      })
    },
    getContent(contentId: string) {
      return fetcher<NutrientContentDetail>(endpoint(baseUrl, `/api/nutrient-contents/${encodeURIComponent(contentId)}`))
    },
    updateContent(contentId: string, payload: UpdateNutrientContentRequest) {
      return fetcher<NutrientContentDetail>(endpoint(baseUrl, `/api/nutrient-contents/${encodeURIComponent(contentId)}`), {
        method: 'PATCH',
        body: payload,
      })
    },
    archiveContent(contentId: string) {
      return fetcher<NutrientContentDetail>(endpoint(baseUrl, `/api/nutrient-contents/${encodeURIComponent(contentId)}/archive`), {
        method: 'POST',
      })
    },
    restoreContent(contentId: string) {
      return fetcher<NutrientContentDetail>(endpoint(baseUrl, `/api/nutrient-contents/${encodeURIComponent(contentId)}/restore`), {
        method: 'POST',
      })
    },
    listReferableNutrients(seedId: string) {
      return fetcher<ReferableNutrientContent[]>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/referable-nutrients`))
    },
  }
}
