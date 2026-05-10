import type {
  ConfirmGeneSuggestionRequest,
  EditGeneSuggestionRequest,
  EditGeneInsightRequest,
  GeneExtractionReminder,
  GeneExtractionTaskResult,
  GeneInsightSummary,
  GeneInsightDetail,
  GeneLibrary,
  GeneSuggestion,
  StartGeneExtractionTaskRequest,
} from './types'

type HttpMethod = 'GET' | 'POST' | 'PATCH'

export interface GeneFetchOptions {
  method?: HttpMethod
  body?: BodyInit | StartGeneExtractionTaskRequest | EditGeneSuggestionRequest | ConfirmGeneSuggestionRequest | EditGeneInsightRequest | null
}

export type GeneFetcher = <T>(url: string, options?: GeneFetchOptions) => Promise<T>

function endpoint(baseUrl: string, path: string) {
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createGeneApi(fetcher: GeneFetcher, baseUrl = '') {
  return {
    getLibrary(seedId: string) {
      return fetcher<GeneLibrary>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/gene-library`))
    },
    prepareLibrary(seedId: string) {
      return fetcher<GeneLibrary>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/gene-library`), {
        method: 'POST',
      })
    },
    listSuggestions(seedId: string) {
      return fetcher<GeneSuggestion[]>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/gene-suggestions`))
    },
    startExtractionTask(seedId: string, payload: StartGeneExtractionTaskRequest) {
      return fetcher<GeneExtractionTaskResult>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/gene-extraction-tasks`), {
        method: 'POST',
        body: payload,
      })
    },
    ignoreReminder(reminderId: string) {
      return fetcher<GeneExtractionReminder>(endpoint(baseUrl, `/api/gene-reminders/${encodeURIComponent(reminderId)}/ignore`), {
        method: 'POST',
      })
    },
    getSuggestion(suggestionId: string) {
      return fetcher<GeneSuggestion>(endpoint(baseUrl, `/api/gene-suggestions/${encodeURIComponent(suggestionId)}`))
    },
    editSuggestion(suggestionId: string, payload: EditGeneSuggestionRequest) {
      return fetcher<GeneSuggestion>(endpoint(baseUrl, `/api/gene-suggestions/${encodeURIComponent(suggestionId)}`), {
        method: 'PATCH',
        body: payload,
      })
    },
    dismissSuggestion(suggestionId: string) {
      return fetcher<GeneSuggestion>(endpoint(baseUrl, `/api/gene-suggestions/${encodeURIComponent(suggestionId)}/dismiss`), {
        method: 'POST',
      })
    },
    confirmSuggestion(suggestionId: string, payload: ConfirmGeneSuggestionRequest = {}) {
      return fetcher<GeneInsightDetail>(endpoint(baseUrl, `/api/gene-suggestions/${encodeURIComponent(suggestionId)}/confirm`), {
        method: 'POST',
        body: payload,
      })
    },
    listInsights(seedId: string) {
      return fetcher<GeneInsightSummary[]>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/gene-insights`))
    },
    listReferableInsights(seedId: string) {
      return fetcher<GeneInsightSummary[]>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/gene-insights/referable`))
    },
    getInsight(insightId: string) {
      return fetcher<GeneInsightDetail>(endpoint(baseUrl, `/api/gene-insights/${encodeURIComponent(insightId)}`))
    },
    editInsight(insightId: string, payload: EditGeneInsightRequest) {
      return fetcher<GeneInsightDetail>(endpoint(baseUrl, `/api/gene-insights/${encodeURIComponent(insightId)}`), {
        method: 'PATCH',
        body: payload,
      })
    },
    archiveInsight(insightId: string) {
      return fetcher<GeneInsightDetail>(endpoint(baseUrl, `/api/gene-insights/${encodeURIComponent(insightId)}/archive`), {
        method: 'POST',
      })
    },
  }
}
