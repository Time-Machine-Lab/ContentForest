export type NutrientArchiveState = 'active' | 'archived'
export type NutrientCardStatus = 'unsettled' | 'settled' | 'archived'
export type NutrientLibraryScope = 'public' | 'seed_scoped'
export type NutrientResearchMessageRole = 'user' | 'assistant'
export type NutrientResearchSessionStatus = 'idle' | 'loading' | 'ready' | 'submitting' | 'failed' | 'cancelled'
export type NutrientGapSuggestionStatus = 'pending' | 'adopted' | 'ignored'
export type NutrientGapSuggestionSourceType = 'seed_brief_gap' | 'growth_input_gap' | 'fruit_elimination' | 'growth_failure' | 'manual'

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
}

export interface UpdateNutrientCardRequest {
  title?: string
  markdown?: string
}

export interface SettleNutrientCardRequest {
  libraryId: string
}

export interface MergeNutrientCardRequest {
  title: string
  markdown: string
  sourceCardId?: string | null
  mergeNote?: string
}

export interface CreateNutrientResearchSessionRequest {
  seedId: string
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
  createdAt: string
  updatedAt: string
  settledAt?: string | null
  archivedAt?: string | null
}

export interface NutrientCardDetail extends NutrientCardSummary {
  markdown: string
}

export interface NutrientGapSuggestion {
  id: string
  seedId: string
  status: NutrientGapSuggestionStatus
  sourceType: NutrientGapSuggestionSourceType
  sourceId: string | null
  title: string
  bodyMarkdown: string
  adoptedCardId: string | null
  createdAt: string
  updatedAt: string
  resolvedAt?: string | null
}

export interface AdoptNutrientGapSuggestionResult {
  suggestion: NutrientGapSuggestion
  nutrientCard: NutrientCardDetail
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

export interface NutrientResearchTemplate {
  id: string
  title: string
  prompt: string
}

export interface NutrientResearchSessionSummary {
  id: string
  seedId: string
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

export type NutrientResearchSessionListQuery = Record<string, never>

export type NutrientResearchStreamEvent =
  | {
    type: 'user_message'
    message: NutrientResearchMessage
  }
  | {
    type: 'progress'
    stage: 'message_saved' | 'agent_started' | 'agent_completed' | 'saving_result' | 'tool_started' | 'tool_completed' | 'tool_failed'
    message: string
    metadata?: Record<string, unknown>
  }
  | {
    type: 'thought_delta'
    delta: string
  }
  | {
    type: 'message_delta'
    delta: string
  }
  | {
    type: 'nutrient_block_delta'
    title: string
    delta: string
  }
  | {
    type: 'tool_call_started'
    toolName: string
    message: string
    metadata?: Record<string, unknown>
  }
  | {
    type: 'tool_call_completed'
    toolName: string
    message: string
    metadata?: Record<string, unknown>
  }
  | {
    type: 'tool_call_failed'
    toolName: string
    message: string
    metadata?: Record<string, unknown>
  }
  | {
    type: 'assistant_message_delta'
    message: NutrientResearchMessage
    delta: string
    done: boolean
  }
  | {
    type: 'depositable_block'
    block: NutrientDepositableBlock
  }
  | {
    type: 'done'
    assistantMessage: NutrientResearchMessage
    depositableBlocks: NutrientDepositableBlock[]
  }
  | {
    type: 'error'
    code: string
    message: string
    assistantMessage?: NutrientResearchMessage
  }
  | {
    type: 'cancelled'
    message: string
    assistantMessage?: NutrientResearchMessage
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

export interface NutrientGapSuggestionListQuery {
  status?: NutrientGapSuggestionStatus
}

export type NutrientWorkbenchPane = 'sessions' | 'agent' | 'cards'

export interface NutrientWorkbenchState {
  seedId: string
  activePane: NutrientWorkbenchPane
  selectedCardId: string
  composingMessage: string
  activeSessionId: string
  sessionStatus: NutrientResearchSessionStatus
}

export interface NutrientWorkbenchBackendDependency {
  name: string
  status: 'available' | '依赖后端更新'
  note: string
}

export const NUTRIENT_WORKBENCH_BACKEND_DEPENDENCIES: NutrientWorkbenchBackendDependency[] = [
  {
    name: '种子营养内容列表与详情',
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
    status: 'available',
    note: '已对齐 docs/api/nutrient.yaml 中的 nutrient-gap-suggestions 系列接口',
  },
  {
    name: '营养新鲜度提醒',
    status: '依赖后端更新',
    note: '当前缺少营养内容新鲜度提醒接口；前端先预留展示位并提示依赖',
  },
  {
    name: '营养使用表现摘要',
    status: '依赖后端更新',
    note: '当前缺少引用次数、关联果实和后续反馈摘要接口；前端先预留展示位并避免表达为质量评分',
  },
  {
    name: '相似营养检测',
    status: '依赖后端更新',
    note: '当前缺少相似营养候选接口；前端先在可沉淀块处提供合并与保存草稿操作',
  },
  {
    name: '可沉淀营养块合并与忽略',
    status: '依赖后端更新',
    note: '当前缺少可沉淀块级别的合并、忽略接口；前端先通过编辑当前内容或本地隐藏完成交互',
  },
]

export interface ApiErrorResponse {
  code: string
  message: string
}
