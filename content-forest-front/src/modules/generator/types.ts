export type GeneratorEnableState = 'enabled' | 'disabled'

export interface ImportGeneratorRequest {
  name: string
  description: string
  zipBase64: string
}

export interface ReuploadGeneratorRequest {
  zipBase64: string
}

export interface GeneratorSummary {
  id: string
  name: string
  description: string
  enableState: GeneratorEnableState
  contentLocation: string
  createdAt: string
  updatedAt: string
  disabledAt?: string | null
}

export interface GeneratorDetail extends GeneratorSummary {
  skillMarkdown: string
  entries: string[]
}

export interface SelectableGenerator {
  id: string
  name: string
  description: string
  contentLocation: string
}

export interface ApiErrorResponse {
  code: string
  message: string
}
