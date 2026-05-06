import type {
  GeneratorDetail,
  GeneratorSummary,
  ImportGeneratorRequest,
  ReuploadGeneratorRequest,
  SelectableGenerator,
} from './types'

type HttpMethod = 'GET' | 'POST'

export interface GeneratorFetchOptions {
  method?: HttpMethod
  body?: BodyInit | ImportGeneratorRequest | ReuploadGeneratorRequest | null
}

export type GeneratorFetcher = <T>(url: string, options?: GeneratorFetchOptions) => Promise<T>

function endpoint(baseUrl: string, path: string) {
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createGeneratorApi(fetcher: GeneratorFetcher, baseUrl = '') {
  return {
    listGenerators() {
      return fetcher<GeneratorSummary[]>(endpoint(baseUrl, '/api/generators'))
    },
    listSelectableGenerators() {
      return fetcher<SelectableGenerator[]>(endpoint(baseUrl, '/api/generators/selectable'))
    },
    getGenerator(generatorId: string) {
      return fetcher<GeneratorDetail>(endpoint(baseUrl, `/api/generators/${encodeURIComponent(generatorId)}`))
    },
    importGenerator(payload: ImportGeneratorRequest) {
      return fetcher<GeneratorDetail>(endpoint(baseUrl, '/api/generators'), {
        method: 'POST',
        body: payload,
      })
    },
    reuploadGenerator(generatorId: string, payload: ReuploadGeneratorRequest) {
      return fetcher<GeneratorDetail>(endpoint(baseUrl, `/api/generators/${encodeURIComponent(generatorId)}/reupload`), {
        method: 'POST',
        body: payload,
      })
    },
    enableGenerator(generatorId: string) {
      return fetcher<GeneratorDetail>(endpoint(baseUrl, `/api/generators/${encodeURIComponent(generatorId)}/enable`), {
        method: 'POST',
      })
    },
    disableGenerator(generatorId: string) {
      return fetcher<GeneratorDetail>(endpoint(baseUrl, `/api/generators/${encodeURIComponent(generatorId)}/disable`), {
        method: 'POST',
      })
    },
  }
}
