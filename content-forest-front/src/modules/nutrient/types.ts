export type NutrientArchiveState = 'active' | 'archived'
export type NutrientCardStatus = 'unsettled' | 'settled' | 'archived'
export type NutrientLibraryScope = 'public' | 'seed_scoped'
export type NutrientResearchMessageRole = 'user' | 'assistant'

export interface CreateNutrientLibraryRequest {
  name: string
  description?: string
  scope: NutrientLibraryScope
  seedId?: string | null
}

export interface UpdateNutrientLibraryRequest {
  name?: string
  description?: string
}

export interface CreateNutrientContentRequest {
  title: string
  markdown: string
}

export interface UpdateNutrientContentRequest {
  title?: string
  markdown?: string
}

export interface CreateNutrientCardRequest {
  title: string
  markdown: string
  conversationId?: string | null
}

export interface UpdateNutrientCardRequest {
  title?: string
  markdown?: string
}

export interface SettleNutrientCardRequest {
  libraryId: string
}

export interface BindNutrientCardConversationRequest {
  conversationId: string
}

export interface CreateNutrientResearchSessionRequest {
  seedId: string
  nutrientCardId?: string | null
  title?: string
}

export interface SubmitNutrientResearchMessageRequest {
  message: string
}

export interface NutrientLibrarySummary {
  id: string
  name: string
  description: string
  scope: NutrientLibraryScope
  seedId: string | null
  archiveState: NutrientArchiveState
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export interface NutrientLibraryDetail extends NutrientLibrarySummary {
  contentCount: number
}

export interface NutrientContentSummary {
  id: string
  libraryId: string
  title: string
  archiveState: NutrientArchiveState
  contentLocation: string
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export interface NutrientContentDetail extends NutrientContentSummary {
  markdown: string
}

export interface NutrientCardSummary {
  id: string
  seedId: string
  title: string
  status: NutrientCardStatus
  contentLocation: string
  settledContentId: string | null
  defaultForGrowth: boolean
  conversationId: string | null
  createdAt: string
  updatedAt: string
  settledAt?: string | null
  archivedAt?: string | null
}

export interface NutrientCardDetail extends NutrientCardSummary {
  markdown: string
}

export interface NutrientResearchMessage {
  id: string
  sessionId: string
  role: NutrientResearchMessageRole
  content: string
  agentTaskId: string | null
  trace: Array<Record<string, unknown>>
  failureReason: string | null
  createdAt: string
}

export interface NutrientDepositableBlock {
  id: string
  sessionId: string
  messageId: string
  title: string
  markdown: string
  createdAt: string
}

export interface NutrientResearchSessionSummary {
  id: string
  seedId: string
  nutrientCardId: string | null
  title: string
  createdAt: string
  updatedAt: string
}

export interface NutrientResearchSessionDetail extends NutrientResearchSessionSummary {
  messages: NutrientResearchMessage[]
  depositableBlocks: NutrientDepositableBlock[]
}

export interface SubmitNutrientResearchMessageResult {
  userMessage: NutrientResearchMessage
  assistantMessage: NutrientResearchMessage
  depositableBlocks: NutrientDepositableBlock[]
}

export interface ReferableNutrientContent extends NutrientContentSummary {
  defaultForGrowth: boolean
  library: {
    id: string
    name: string
    scope: NutrientLibraryScope
    seedId: string | null
  }
}

export interface NutrientLibraryListQuery {
  scope?: NutrientLibraryScope
  archiveState?: NutrientArchiveState
  seedId?: string
}

export interface NutrientContentListQuery {
  archiveState?: NutrientArchiveState
}

export interface NutrientCardListQuery {
  status?: NutrientCardStatus
}

export type NutrientWorkbenchPane = 'cards' | 'agent' | 'suggestions'

export interface NutrientWorkbenchState {
  seedId: string
  activePane: NutrientWorkbenchPane
  selectedCardId: string
  composingMessage: string
}

export interface NutrientWorkbenchBackendDependency {
  name: string
  status: 'available' | '依赖后端更新'
  note: string
}

export const NUTRIENT_WORKBENCH_BACKEND_DEPENDENCIES: NutrientWorkbenchBackendDependency[] = [
  {
    name: '种子营养卡片列表与详情',
    status: 'available',
    note: '已对齐 docs/api/nutrient.yaml 中的 /api/seeds/{seedId}/nutrient-cards 与 /api/nutrient-cards/{cardId}',
  },
  {
    name: '营养研究会话与可沉淀块',
    status: 'available',
    note: '已对齐 docs/api/nutrient.yaml 中的 nutrient-research-sessions 系列接口',
  },
  {
    name: '枝化生长缺口建议队列',
    status: '依赖后端更新',
    note: '当前缺少种子级建议列表、采纳、忽略接口；前端仅保留建议区 UI 容器',
  },
]

export interface ApiErrorResponse {
  code: string
  message: string
}
