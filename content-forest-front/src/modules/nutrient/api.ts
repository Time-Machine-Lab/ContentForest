import type {
  CreateNutrientContentRequest,
  CreateNutrientCardRequest,
  CreateNutrientLibraryRequest,
  CreateNutrientResearchSessionRequest,
  MergeNutrientCardRequest,
  AdoptNutrientGapSuggestionResult,
  NutrientCardDetail,
  NutrientCardListQuery,
  NutrientCardSummary,
  NutrientContentDetail,
  NutrientContentListQuery,
  NutrientContentSummary,
  NutrientDepositableBlock,
  NutrientGapSuggestion,
  NutrientGapSuggestionListQuery,
  NutrientLibraryDetail,
  NutrientLibraryListQuery,
  NutrientLibrarySummary,
  NutrientResearchMessage,
  NutrientResearchSessionListQuery,
  NutrientResearchSessionSummary,
  NutrientResearchSessionDetail,
  NutrientResearchStreamEvent,
  ReferableNutrientContent,
  SettleNutrientCardRequest,
  SubmitNutrientResearchMessageRequest,
  SubmitNutrientResearchMessageResult,
  UpdateNutrientCardRequest,
  UpdateNutrientContentRequest,
  UpdateNutrientLibraryRequest,
} from './types'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface NutrientFetchOptions {
  method?: HttpMethod
  body?: BodyInit
    | CreateNutrientLibraryRequest
    | UpdateNutrientLibraryRequest
    | CreateNutrientContentRequest
    | UpdateNutrientContentRequest
    | CreateNutrientCardRequest
    | UpdateNutrientCardRequest
    | MergeNutrientCardRequest
    | SettleNutrientCardRequest
    | CreateNutrientResearchSessionRequest
    | SubmitNutrientResearchMessageRequest
    | null
}

export type NutrientFetcher = <T>(url: string, options?: NutrientFetchOptions) => Promise<T>

export type NutrientResearchStreamHandler = (event: NutrientResearchStreamEvent) => void

export interface NutrientResearchStreamOptions {
  signal?: AbortSignal
}

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
    listCards(seedId: string, query: NutrientCardListQuery = {}) {
      const search = queryString({ status: query.status })
      return fetcher<NutrientCardSummary[]>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/nutrient-cards${search}`))
    },
    listResearchSessions(seedId: string, _query: NutrientResearchSessionListQuery = {}) {
      return fetcher<NutrientResearchSessionSummary[]>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/nutrient-research-sessions`))
    },
    listGapSuggestions(seedId: string, query: NutrientGapSuggestionListQuery = {}) {
      const search = queryString({ status: query.status })
      return fetcher<NutrientGapSuggestion[]>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/nutrient-gap-suggestions${search}`))
    },
    adoptGapSuggestion(suggestionId: string) {
      return fetcher<AdoptNutrientGapSuggestionResult>(endpoint(baseUrl, `/api/nutrient-gap-suggestions/${encodeURIComponent(suggestionId)}/adopt`), {
        method: 'POST',
      })
    },
    ignoreGapSuggestion(suggestionId: string) {
      return fetcher<NutrientGapSuggestion>(endpoint(baseUrl, `/api/nutrient-gap-suggestions/${encodeURIComponent(suggestionId)}/ignore`), {
        method: 'POST',
      })
    },
    createCard(seedId: string, payload: CreateNutrientCardRequest) {
      return fetcher<NutrientCardDetail>(endpoint(baseUrl, `/api/seeds/${encodeURIComponent(seedId)}/nutrient-cards`), {
        method: 'POST',
        body: payload,
      })
    },
    getCard(cardId: string) {
      return fetcher<NutrientCardDetail>(endpoint(baseUrl, `/api/nutrient-cards/${encodeURIComponent(cardId)}`))
    },
    updateCard(cardId: string, payload: UpdateNutrientCardRequest) {
      return fetcher<NutrientCardDetail>(endpoint(baseUrl, `/api/nutrient-cards/${encodeURIComponent(cardId)}`), {
        method: 'PATCH',
        body: payload,
      })
    },
    deleteCard(cardId: string) {
      return fetcher<void>(endpoint(baseUrl, `/api/nutrient-cards/${encodeURIComponent(cardId)}`), {
        method: 'DELETE',
      })
    },
    mergeCard(cardId: string, payload: MergeNutrientCardRequest) {
      return fetcher<NutrientCardDetail>(endpoint(baseUrl, `/api/nutrient-cards/${encodeURIComponent(cardId)}/merge`), {
        method: 'POST',
        body: payload,
      })
    },
    settleCard(cardId: string, payload: SettleNutrientCardRequest) {
      return fetcher<NutrientCardDetail>(endpoint(baseUrl, `/api/nutrient-cards/${encodeURIComponent(cardId)}/settle`), {
        method: 'POST',
        body: payload,
      })
    },
    archiveCard(cardId: string) {
      return fetcher<NutrientCardDetail>(endpoint(baseUrl, `/api/nutrient-cards/${encodeURIComponent(cardId)}/archive`), {
        method: 'POST',
      })
    },
    setDefaultForGrowth(cardId: string) {
      return fetcher<NutrientCardDetail>(endpoint(baseUrl, `/api/nutrient-cards/${encodeURIComponent(cardId)}/default-for-growth`), {
        method: 'POST',
      })
    },
    clearDefaultForGrowth(cardId: string) {
      return fetcher<NutrientCardDetail>(endpoint(baseUrl, `/api/nutrient-cards/${encodeURIComponent(cardId)}/default-for-growth/clear`), {
        method: 'POST',
      })
    },
    createResearchSession(payload: CreateNutrientResearchSessionRequest) {
      return fetcher<NutrientResearchSessionDetail>(endpoint(baseUrl, '/api/nutrient-research-sessions'), {
        method: 'POST',
        body: payload,
      })
    },
    getResearchSession(sessionId: string) {
      return fetcher<NutrientResearchSessionDetail>(endpoint(baseUrl, `/api/nutrient-research-sessions/${encodeURIComponent(sessionId)}`))
    },
    deleteResearchSession(sessionId: string) {
      return fetcher<void>(endpoint(baseUrl, `/api/nutrient-research-sessions/${encodeURIComponent(sessionId)}`), {
        method: 'DELETE',
      })
    },
    listResearchMessages(sessionId: string) {
      return fetcher<NutrientResearchMessage[]>(endpoint(baseUrl, `/api/nutrient-research-sessions/${encodeURIComponent(sessionId)}/messages`))
    },
    submitResearchMessage(sessionId: string, payload: SubmitNutrientResearchMessageRequest) {
      return fetcher<SubmitNutrientResearchMessageResult>(endpoint(baseUrl, `/api/nutrient-research-sessions/${encodeURIComponent(sessionId)}/messages`), {
        method: 'POST',
        body: payload,
      })
    },
    async streamResearchMessage(
      sessionId: string,
      payload: SubmitNutrientResearchMessageRequest,
      onEvent: NutrientResearchStreamHandler,
      options: NutrientResearchStreamOptions = {},
    ) {
      const response = await fetch(endpoint(baseUrl, `/api/nutrient-research-sessions/${encodeURIComponent(sessionId)}/messages/stream`), {
        method: 'POST',
        headers: {
          accept: 'text/event-stream',
          'content-type': 'application/json',
        },
        signal: options.signal,
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error(await response.text() || `营养研究流式请求失败：${response.status}`)
      }
      if (!response.body) {
        throw new Error('当前环境不支持营养研究流式响应')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        const parts = buffer.split(/\n\n/)
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const dataLine = part
            .split(/\n/)
            .find((line) => line.startsWith('data: '))
          if (!dataLine) continue
          onEvent(JSON.parse(dataLine.slice(6)) as NutrientResearchStreamEvent)
        }
        if (done) break
      }
      if (buffer.trim()) {
        const dataLine = buffer
          .split(/\n/)
          .find((line) => line.startsWith('data: '))
        if (dataLine) {
          onEvent(JSON.parse(dataLine.slice(6)) as NutrientResearchStreamEvent)
        }
      }
    },
    listDepositableBlocks(sessionId: string) {
      return fetcher<NutrientDepositableBlock[]>(endpoint(baseUrl, `/api/nutrient-research-sessions/${encodeURIComponent(sessionId)}/depositable-blocks`))
    },
  }
}
