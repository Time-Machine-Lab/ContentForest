<script setup lang="ts">
import { createNutrientApi, type NutrientCardDetail, type NutrientCardStatus, type NutrientCardSummary, type NutrientDepositableBlock, type NutrientFetcher, type NutrientGapSuggestion, type NutrientGapSuggestionSourceType, type NutrientResearchMessage, type NutrientResearchSessionDetail, type NutrientResearchSessionSummary, type NutrientResearchTemplate, type NutrientWorkbenchPane, type NutrientWorkbenchState } from '../../../src/modules/nutrient'
import MarkdownViewer from '../markdown/MarkdownViewer.vue'

type ResearchMessageView = NutrientResearchMessage & {
  localStatus?: 'pending' | 'failed' | 'cancelled'
  localKind?: 'thought' | 'assistant_stream' | 'tool' | 'progress'
  toolName?: string
  toolStatus?: 'running' | 'completed' | 'failed'
  metadata?: Record<string, unknown>
  collapsed?: boolean
}

type ResearchTimelineItem =
  | { kind: 'message'; id: string; createdAt: string; message: ResearchMessageView }
  | { kind: 'block'; id: string; createdAt: string; block: NutrientDepositableBlock }

type WorkbenchMode = 'session' | 'new-session' | 'card-detail'
type NutrientCardStatusFilter = NutrientCardStatus | 'all'

const props = defineProps<{
  open: boolean
  seedId: string
  seedTitle?: string
}>()

const emit = defineEmits<{
  close: []
  changed: []
  reference: [payload: {
    id: string
    kind: 'nutrient' | 'nutrient_card'
    label: string
    scope: string
    description: string
  }]
}>()

const runtimeConfig = useRuntimeConfig()
const apiBase = String(runtimeConfig.public.apiBase || '')

const fetcher: NutrientFetcher = (url, options) => $fetch(url, {
  method: options?.method,
  body: options?.body as BodyInit | Record<string, unknown> | null | undefined,
})

const nutrientApi = createNutrientApi(fetcher, apiBase)
const localState = reactive<NutrientWorkbenchState>({
  seedId: '',
  activePane: 'agent',
  selectedCardId: '',
  composingMessage: '',
  activeSessionId: '',
  sessionStatus: 'idle',
})
const cards = ref<NutrientCardSummary[]>([])
const nutrientSuggestions = ref<NutrientGapSuggestion[]>([])
const researchSessions = ref<NutrientResearchSessionSummary[]>([])
const selectedCard = ref<NutrientCardDetail | null>(null)
const researchSession = ref<NutrientResearchSessionDetail | null>(null)
const researchMessages = ref<ResearchMessageView[]>([])
const depositableBlocks = ref<NutrientDepositableBlock[]>([])
const cardsLoading = ref(false)
const suggestionsLoading = ref(false)
const detailLoading = ref(false)
const sessionLoading = ref(false)
const sessionsLoading = ref(false)
const submitLoading = ref(false)
const operationLoading = ref('')
const workbenchError = ref('')
const researchError = ref('')
const lastSubmittedMessage = ref('')
const settleLibraryId = ref('')
const ignoredBlockIds = ref<string[]>([])
const currentStreamAbortController = shallowRef<AbortController | null>(null)
const activeWorkbenchMode = ref<WorkbenchMode>('new-session')
const suggestionPopoverOpen = ref(false)
const cardSearch = ref('')
const cardStatusFilter = ref<NutrientCardStatusFilter>('all')
const mergeTargetBlock = ref<NutrientDepositableBlock | null>(null)
const mergeTargetSearch = ref('')
const mergeTargetStatusFilter = ref<NutrientCardStatusFilter>('all')
const confirmingSessionDeleteId = ref('')
const confirmingCardDelete = ref(false)
let localMessageSequence = 0

const researchTemplates: NutrientResearchTemplate[] = [
  {
    id: 'viral-expression',
    title: '爆款表达',
    prompt: '研究这个方向在目标平台最近的爆款表达方式，提炼标题、开头、结构和互动设计。',
  },
  {
    id: 'cover-title',
    title: '标题封面',
    prompt: '拆解这个方向适合的标题和封面套路，给出可直接复用的表达模板。',
  },
  {
    id: 'competitor-playbook',
    title: '竞品打法',
    prompt: '研究相似账号或竞品内容打法，总结他们如何包装选题、制造信任和引导行动。',
  },
  {
    id: 'pain-language',
    title: '痛点语言',
    prompt: '研究目标用户的真实痛点、评论区语言和高频表达，提炼可用于内容创作的原话素材。',
  },
  {
    id: 'risk-avoidance',
    title: '避雷点',
    prompt: '研究这个方向容易踩雷的广告感、违规风险、用户反感点和应避免的表达。',
  },
  {
    id: 'trend-shift',
    title: '趋势变化',
    prompt: '研究这个方向最近 30 天的内容趋势变化，说明哪些表达正在变强，哪些正在失效。',
  },
]

const pendingNutrientSuggestions = computed(() => nutrientSuggestions.value.filter((suggestion) => suggestion.status === 'pending'))
const visibleDepositableBlocks = computed(() => depositableBlocks.value.filter((block) => !ignoredBlockIds.value.includes(block.id)))
const hasActiveConversation = computed(() => researchMessages.value.length > 0 || visibleDepositableBlocks.value.length > 0)
const isResearchRunning = computed(() => submitLoading.value && currentStreamAbortController.value !== null)
const researchTimelineItems = computed<ResearchTimelineItem[]>(() => [
  ...researchMessages.value.map((message) => ({
    kind: 'message' as const,
    id: `message:${message.id}`,
    createdAt: message.createdAt,
    message,
  })),
  ...visibleDepositableBlocks.value.map((block) => ({
    kind: 'block' as const,
    id: `block:${block.id}`,
    createdAt: block.createdAt,
    block,
  })),
].sort((left, right) => timelineTime(left.createdAt) - timelineTime(right.createdAt)))
const filteredCards = computed(() => filterCards(cards.value, cardSearch.value, cardStatusFilter.value))
const mergeTargetCards = computed(() => filterCards(
  cards.value.filter((card) => card.status !== 'archived'),
  mergeTargetSearch.value,
  mergeTargetStatusFilter.value,
))
const mainModeTitle = computed(() => {
  if (activeWorkbenchMode.value === 'card-detail') return selectedCard.value?.title || '营养内容'
  if (activeWorkbenchMode.value === 'session') return researchSession.value?.title || '研究会话'
  return '新研究会话'
})
const mainModeSubtitle = computed(() => {
  if (activeWorkbenchMode.value === 'card-detail') return selectedCard.value ? statusLabel(selectedCard.value.status) : '资产详情'
  if (activeWorkbenchMode.value === 'session') return '研究过程'
  return '发送第一条消息后创建会话'
})
const activePane = computed({
  get: () => localState.activePane,
  set: (value: NutrientWorkbenchPane) => {
    localState.activePane = value
  },
})

watch(
  () => [props.open, props.seedId] as const,
  ([open, seedId]) => {
    if (!open || !seedId) return
    localState.seedId = seedId
    void initializeWorkbench()
  },
  { immediate: true },
)

async function initializeWorkbench() {
  resetResearchState()
  selectedCard.value = null
  localState.selectedCardId = ''
  await Promise.all([
    loadCards({ autoSelect: false }),
    loadGapSuggestions(),
    loadResearchSessions({ restoreLatest: true }),
  ])
}

async function loadCards(options: { autoSelect?: boolean } = {}) {
  if (!props.seedId) return
  cardsLoading.value = true
  workbenchError.value = ''
  try {
    cards.value = await nutrientApi.listCards(props.seedId)
    if (options.autoSelect === true && !localState.selectedCardId && cards.value[0]) {
      await selectCard(cards.value[0].id)
    }
  }
  catch (error) {
    workbenchError.value = errorMessage(error)
  }
  finally {
    cardsLoading.value = false
  }
}

async function loadResearchSessions(options: { restoreLatest?: boolean } = {}) {
  if (!props.seedId) return
  sessionsLoading.value = true
  researchError.value = ''
  try {
    researchSessions.value = await nutrientApi.listResearchSessions(props.seedId)
    if (
      options.restoreLatest === true &&
      !researchSession.value &&
      !localState.selectedCardId &&
      researchSessions.value[0]
    ) {
      await loadResearchSession(researchSessions.value[0].id)
    }
  }
  catch (error) {
    researchError.value = errorMessage(error)
  }
  finally {
    sessionsLoading.value = false
  }
}

async function loadGapSuggestions() {
  if (!props.seedId) return
  suggestionsLoading.value = true
  workbenchError.value = ''
  try {
    nutrientSuggestions.value = await nutrientApi.listGapSuggestions(props.seedId, { status: 'pending' })
  }
  catch (error) {
    workbenchError.value = errorMessage(error)
  }
  finally {
    suggestionsLoading.value = false
  }
}

async function ensureSettleLibraryId() {
  if (settleLibraryId.value) return settleLibraryId.value
  const libraries = await nutrientApi.listLibraries({
    scope: 'seed_scoped',
    archiveState: 'active',
    seedId: props.seedId,
  })
  const library = libraries.find((item) => item.seedId === props.seedId)
  if (!library) {
    throw new Error('需要先创建当前种子的专属营养库')
  }
  settleLibraryId.value = library.id
  return library.id
}

async function selectCard(cardId: string) {
  if (isResearchRunning.value) return
  localState.selectedCardId = cardId
  detailLoading.value = true
  workbenchError.value = ''
  try {
    selectedCard.value = await nutrientApi.getCard(cardId)
    confirmingCardDelete.value = false
    activeWorkbenchMode.value = 'card-detail'
    activePane.value = 'agent'
  }
  catch (error) {
    workbenchError.value = errorMessage(error)
  }
  finally {
    detailLoading.value = false
  }
}

function resetResearchState() {
  researchSession.value = null
  researchMessages.value = []
  depositableBlocks.value = []
  ignoredBlockIds.value = []
  localState.activeSessionId = ''
  localState.sessionStatus = 'idle'
  researchError.value = ''
}

function enterNewSessionDraft(message = '') {
  if (isResearchRunning.value) return
  selectedCard.value = null
  localState.selectedCardId = ''
  localState.composingMessage = message
  resetResearchState()
  confirmingSessionDeleteId.value = ''
  confirmingCardDelete.value = false
  activeWorkbenchMode.value = 'new-session'
  activePane.value = 'agent'
}

async function loadResearchSession(sessionId: string) {
  if (isResearchRunning.value) return
  sessionLoading.value = true
  localState.sessionStatus = 'loading'
  researchError.value = ''
  try {
    const session = await nutrientApi.getResearchSession(sessionId)
    applyResearchSession(session)
  }
  catch (error) {
    localState.sessionStatus = 'failed'
    researchError.value = errorMessage(error)
  }
  finally {
    sessionLoading.value = false
  }
}

function applyResearchSession(session: NutrientResearchSessionDetail) {
  researchSession.value = session
  researchMessages.value = [...session.messages]
  depositableBlocks.value = [...session.depositableBlocks]
  localState.activeSessionId = session.id
  localState.sessionStatus = 'ready'
  activeWorkbenchMode.value = 'session'
}

async function selectResearchSession(sessionId: string) {
  if (isResearchRunning.value) return
  selectedCard.value = null
  localState.selectedCardId = ''
  confirmingSessionDeleteId.value = ''
  confirmingCardDelete.value = false
  await loadResearchSession(sessionId)
  activePane.value = 'agent'
}

async function startNewResearchSession() {
  enterNewSessionDraft()
}

async function ensureResearchSession() {
  if (researchSession.value) return researchSession.value
  const session = await nutrientApi.createResearchSession({
    seedId: props.seedId,
    title: `${props.seedTitle ?? '当前种子'} / 营养研究`,
  })
  applyResearchSession(session)
  await loadResearchSessions()
  return session
}

async function submitResearchMessage() {
  const message = localState.composingMessage.trim()
  if (!message || submitLoading.value) return
  const abortController = new AbortController()
  currentStreamAbortController.value = abortController
  submitLoading.value = true
  localState.sessionStatus = 'submitting'
  researchError.value = ''
  lastSubmittedMessage.value = message
  let optimisticUserId = ''
  let optimisticAssistantId = ''
  let assistantMessageId = ''
  let streamError: string | null = null
  try {
    const session = await ensureResearchSession()
    localState.composingMessage = ''
    const optimistic = createOptimisticResearchTurn(session.id, message)
    optimisticUserId = optimistic.user.id
    optimisticAssistantId = optimistic.assistant.id
    let userMessageId = optimisticUserId
    assistantMessageId = optimisticAssistantId
    let thoughtMessageId = ''
    let assistantContentStarted = false
    const streamBlockIds = new Map<string, string>()
    const streamToolMessageIds = new Map<string, string>()
    researchMessages.value = [
      ...researchMessages.value,
      optimistic.user,
    ]
    await nutrientApi.streamResearchMessage(session.id, { message }, (event) => {
      if (event.type === 'user_message') {
        userMessageId = upsertResearchMessage(userMessageId, event.message)
        return
      }
      if (event.type === 'progress') {
        appendLocalResearchMessage(session.id, event.message, {
          localStatus: 'pending',
          localKind: 'progress',
          metadata: event.metadata,
        })
        return
      }
      if (event.type === 'thought_delta') {
        if (!thoughtMessageId) {
          thoughtMessageId = `local-thought-${Date.now()}`
          researchMessages.value = [
            ...researchMessages.value,
            {
              id: thoughtMessageId,
              sessionId: session.id,
              role: 'assistant',
              content: '',
              agentTaskId: null,
              trace: [],
              failureReason: null,
              createdAt: new Date().toISOString(),
              localStatus: 'pending',
              localKind: 'thought',
              collapsed: false,
            },
          ]
        }
        appendResearchMessageDelta(thoughtMessageId, event.delta)
        return
      }
      if (
        event.type === 'tool_call_started' ||
        event.type === 'tool_call_completed' ||
        event.type === 'tool_call_failed'
      ) {
        upsertToolMessage(streamToolMessageIds, session.id, event.toolName, {
          message: event.message,
          status: event.type === 'tool_call_failed'
            ? 'failed'
            : event.type === 'tool_call_completed' ? 'completed' : 'running',
          metadata: event.metadata,
        })
        return
      }
      if (event.type === 'message_delta') {
        if (!assistantContentStarted) {
          assistantContentStarted = true
          researchMessages.value = researchMessages.value.map((item) => item.id === assistantMessageId
            ? { ...item, content: '', localStatus: 'pending', localKind: 'assistant_stream' }
            : item)
        }
        appendResearchMessageDelta(assistantMessageId, event.delta)
        return
      }
      if (event.type === 'nutrient_block_delta') {
        appendStreamDepositableBlock(streamBlockIds, session.id, assistantMessageId, event.title, event.delta)
        return
      }
      if (event.type === 'assistant_message_delta') {
        assistantMessageId = upsertResearchMessage(
          assistantMessageId,
          event.message,
          event.done ? undefined : 'pending',
        )
        return
      }
      if (event.type === 'depositable_block') {
        depositableBlocks.value = mergeDepositableBlocks(depositableBlocks.value, [event.block])
        return
      }
      if (event.type === 'done') {
        assistantMessageId = upsertResearchMessage(assistantMessageId, event.assistantMessage)
        finishTransientMessages()
        const localIds = new Set(streamBlockIds.values())
        depositableBlocks.value = depositableBlocks.value.filter((block) => !localIds.has(block.id))
        depositableBlocks.value = mergeDepositableBlocks(
          depositableBlocks.value,
          event.depositableBlocks,
        )
        localState.sessionStatus = 'ready'
        return
      }
      if (event.type === 'cancelled') {
        streamError = event.message
        finishTransientMessages('cancelled')
        if (event.assistantMessage) {
          assistantMessageId = upsertResearchMessage(assistantMessageId, event.assistantMessage, 'cancelled')
        }
        else {
          markResearchMessage(assistantMessageId, {
            content: event.message,
            failureReason: event.message,
            localStatus: 'cancelled',
          })
        }
        localState.sessionStatus = 'cancelled'
        return
      }
      if (event.type === 'error') {
        streamError = event.message
        finishTransientMessages('failed')
        if (event.assistantMessage) {
          assistantMessageId = upsertResearchMessage(assistantMessageId, event.assistantMessage, 'failed')
        }
        else {
          researchMessages.value = researchMessages.value.map((item) => item.id === assistantMessageId
            ? { ...item, content: event.message, failureReason: event.message, localStatus: 'failed' }
            : item)
        }
      }
    }, { signal: abortController.signal })
    if (streamError) {
      throw new Error(streamError)
    }
    localState.sessionStatus = 'ready'
    await loadResearchSessions()
  }
  catch (error) {
    const wasCancelled = abortController.signal.aborted
    localState.sessionStatus = wasCancelled ? 'cancelled' : 'failed'
    researchError.value = wasCancelled ? '研究已暂停' : errorMessage(error)
    localState.composingMessage = message
    finishTransientMessages(wasCancelled ? 'cancelled' : 'failed')
    if (assistantMessageId || optimisticAssistantId) {
      const targetMessageId = assistantMessageId || optimisticAssistantId
      researchMessages.value = researchMessages.value.map((item) => item.id === targetMessageId
        ? {
            ...item,
            localStatus: wasCancelled ? 'cancelled' : 'failed',
            content: wasCancelled ? '研究已暂停，可以继续输入或重试。' : '研究没有成功完成，已保留你的输入，可以直接重试。',
            failureReason: wasCancelled ? '研究已暂停' : errorMessage(error),
          }
        : item)
    }
  }
  finally {
    submitLoading.value = false
    currentStreamAbortController.value = null
  }
}

function cancelResearchMessage() {
  if (!currentStreamAbortController.value) return
  currentStreamAbortController.value.abort()
  localState.sessionStatus = 'cancelled'
}

function appendResearchMessageDelta(messageId: string, delta: string) {
  researchMessages.value = researchMessages.value.map((item) => item.id === messageId
    ? { ...item, content: `${item.content}${delta}` }
    : item)
}

function appendLocalResearchMessage(
  sessionId: string,
  content: string,
  patch: Partial<ResearchMessageView> = {},
) {
  localMessageSequence += 1
  const id = `local-stream-${localMessageSequence}`
  researchMessages.value = [
    ...researchMessages.value,
    {
      id,
      sessionId,
      role: 'assistant',
      content,
      agentTaskId: null,
      trace: [],
      failureReason: null,
      createdAt: new Date().toISOString(),
      ...patch,
    },
  ]
  return id
}

function timelineTime(value: string) {
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

function markResearchMessage(
  messageId: string,
  patch: Partial<ResearchMessageView>,
) {
  researchMessages.value = researchMessages.value.map((item) => item.id === messageId
    ? { ...item, ...patch }
    : item)
}

function finishTransientMessages(status?: 'failed' | 'cancelled') {
  researchMessages.value = researchMessages.value.map((item) => {
    if (item.localStatus !== 'pending') return item
    if (status === 'failed') return { ...item, localStatus: 'failed' }
    if (status === 'cancelled') return { ...item, localStatus: 'cancelled' }
    return { ...item, localStatus: undefined }
  })
}

function upsertToolMessage(
  streamToolMessageIds: Map<string, string>,
  sessionId: string,
  toolName: string,
  input: {
    message: string
    status: 'running' | 'completed' | 'failed'
    metadata?: Record<string, unknown>
  },
) {
  const existingId = streamToolMessageIds.get(toolName)
  const localStatus = input.status === 'failed'
    ? 'failed'
    : input.status === 'running' ? 'pending' : undefined
  if (existingId) {
    markResearchMessage(existingId, {
      content: input.message,
      localStatus,
      toolStatus: input.status,
      metadata: input.metadata,
    })
    return existingId
  }
  localMessageSequence += 1
  const id = `local-tool-${localMessageSequence}`
  streamToolMessageIds.set(toolName, id)
  researchMessages.value = [
    ...researchMessages.value,
    {
      id,
      sessionId,
      role: 'assistant',
      content: input.message,
      agentTaskId: null,
      trace: [],
      failureReason: null,
      createdAt: new Date().toISOString(),
      localStatus,
      localKind: 'tool',
      toolName,
      toolStatus: input.status,
      metadata: input.metadata,
    },
  ]
  return id
}

function appendStreamDepositableBlock(
  streamBlockIds: Map<string, string>,
  sessionId: string,
  assistantMessageId: string,
  title: string,
  delta: string,
) {
  const key = title.trim() || '可沉淀营养'
  const existingId = streamBlockIds.get(key)
  if (existingId) {
    depositableBlocks.value = depositableBlocks.value.map((block) => block.id === existingId
      ? { ...block, markdown: `${block.markdown}${delta}` }
      : block)
    return
  }
  const id = `local-nutrient-${Date.now()}-${streamBlockIds.size}`
  streamBlockIds.set(key, id)
  depositableBlocks.value = [
    ...depositableBlocks.value,
    {
      id,
      sessionId,
      messageId: assistantMessageId,
      title: key,
      markdown: delta,
      createdAt: new Date().toISOString(),
    },
  ]
}

function upsertResearchMessage(
  replaceId: string,
  message: NutrientResearchMessage,
  localStatus?: ResearchMessageView['localStatus'],
) {
  const next: ResearchMessageView = localStatus ? { ...message, localStatus } : { ...message }
  let replaced = false
  researchMessages.value = researchMessages.value.map((item) => {
    if (item.id !== replaceId && item.id !== message.id) return item
    replaced = true
    return next
  })
  if (!replaced) {
    researchMessages.value = [...researchMessages.value, next]
  }
  return message.id
}

function createOptimisticResearchTurn(sessionId: string, message: string): {
  user: ResearchMessageView
  assistant: ResearchMessageView
} {
  localMessageSequence += 1
  const createdAt = new Date().toISOString()
  return {
    user: {
      id: `local-user-${localMessageSequence}`,
      sessionId,
      role: 'user',
      content: message,
      agentTaskId: null,
      trace: [],
      failureReason: null,
      createdAt,
      localStatus: 'pending',
    },
    assistant: {
      id: `local-agent-${localMessageSequence}`,
      sessionId,
      role: 'assistant',
      content: '正在研究资料、提炼规律和整理可沉淀营养。',
      agentTaskId: null,
      trace: [],
      failureReason: null,
      createdAt,
      localStatus: 'pending',
    },
  }
}

async function retryLastResearchMessage() {
  if (!lastSubmittedMessage.value) return
  localState.composingMessage = lastSubmittedMessage.value
  await submitResearchMessage()
}

function mergeDepositableBlocks(
  current: NutrientDepositableBlock[],
  incoming: NutrientDepositableBlock[],
) {
  const map = new Map(current.map((block) => [block.id, block]))
  for (const block of incoming) {
    map.set(block.id, block)
  }
  return [...map.values()]
}

async function createCardFromBlock(block: NutrientDepositableBlock) {
  operationLoading.value = `create-block:${block.id}`
  researchError.value = ''
  try {
    const card = await nutrientApi.createCard(props.seedId, {
      title: block.title,
      markdown: block.markdown,
    })
    await loadCards()
    await selectCard(card.id)
    emit('changed')
  }
  catch (error) {
    researchError.value = errorMessage(error)
  }
  finally {
    operationLoading.value = ''
  }
}

async function keepSuggestionAsNewCard(block: NutrientDepositableBlock) {
  await createCardFromBlock(block)
}

function openMergeTargetSelector(block: NutrientDepositableBlock) {
  mergeTargetBlock.value = block
  mergeTargetSearch.value = ''
  mergeTargetStatusFilter.value = 'all'
}

function closeMergeTargetSelector() {
  mergeTargetBlock.value = null
}

async function mergeBlockIntoTargetCard(targetCardId: string) {
  const block = mergeTargetBlock.value
  if (!block) return
  operationLoading.value = `merge-block:${block.id}`
  researchError.value = ''
  try {
    const updated = await nutrientApi.mergeCard(targetCardId, {
      title: block.title,
      markdown: block.markdown,
      sourceCardId: null,
      mergeNote: researchSession.value ? `来自研究会话：${researchSession.value.title || researchSession.value.id}` : '来自营养研究成果',
    })
    selectedCard.value = updated
    localState.selectedCardId = updated.id
    activeWorkbenchMode.value = 'card-detail'
    cards.value = cards.value.map((card) => card.id === updated.id ? updated : card)
    ignoredBlockIds.value = [...ignoredBlockIds.value, block.id]
    closeMergeTargetSelector()
    emit('changed')
  }
  catch (error) {
    researchError.value = errorMessage(error)
  }
  finally {
    operationLoading.value = ''
  }
}

async function mergeSuggestionIntoCard(block: NutrientDepositableBlock) {
  openMergeTargetSelector(block)
}

function ignoreDepositableBlock(blockId: string) {
  if (ignoredBlockIds.value.includes(blockId)) return
  ignoredBlockIds.value = [...ignoredBlockIds.value, blockId]
}

async function acceptNutrientSuggestion(suggestion: NutrientGapSuggestion) {
  operationLoading.value = `adopt-suggestion:${suggestion.id}`
  workbenchError.value = ''
  try {
    await nutrientApi.adoptGapSuggestion(suggestion.id)
    nutrientSuggestions.value = nutrientSuggestions.value.filter((item) => item.id !== suggestion.id)
    await loadCards()
    enterNewSessionDraft(suggestion.bodyMarkdown)
    suggestionPopoverOpen.value = false
    emit('changed')
  }
  catch (error) {
    workbenchError.value = errorMessage(error)
  }
  finally {
    operationLoading.value = ''
  }
}

function requestDeleteResearchSession(sessionId: string) {
  if (isResearchRunning.value) return
  confirmingSessionDeleteId.value = confirmingSessionDeleteId.value === sessionId ? '' : sessionId
}

async function deleteResearchSession(sessionId: string) {
  if (isResearchRunning.value) return
  operationLoading.value = `delete-session:${sessionId}`
  researchError.value = ''
  try {
    const wasActiveSession = localState.activeSessionId === sessionId
    await nutrientApi.deleteResearchSession(sessionId)
    researchSessions.value = researchSessions.value.filter((session) => session.id !== sessionId)
    if (wasActiveSession) {
      enterNewSessionDraft()
    }
    await loadResearchSessions()
    confirmingSessionDeleteId.value = ''
    emit('changed')
  }
  catch (error) {
    researchError.value = errorMessage(error)
  }
  finally {
    operationLoading.value = ''
  }
}

function requestDeleteSelectedCard() {
  if (!selectedCard.value || selectedCard.value.status !== 'unsettled') return
  confirmingCardDelete.value = true
}

async function deleteSelectedCard() {
  if (!selectedCard.value || selectedCard.value.status !== 'unsettled') return
  operationLoading.value = 'delete-card'
  workbenchError.value = ''
  try {
    const deletedId = selectedCard.value.id
    await nutrientApi.deleteCard(deletedId)
    cards.value = cards.value.filter((card) => card.id !== deletedId)
    selectedCard.value = null
    localState.selectedCardId = ''
    activeWorkbenchMode.value = researchSession.value ? 'session' : 'new-session'
    confirmingCardDelete.value = false
    emit('changed')
  }
  catch (error) {
    workbenchError.value = errorMessage(error)
  }
  finally {
    operationLoading.value = ''
  }
}

async function ignoreNutrientSuggestion(suggestion: NutrientGapSuggestion) {
  operationLoading.value = `ignore-suggestion:${suggestion.id}`
  workbenchError.value = ''
  try {
    await nutrientApi.ignoreGapSuggestion(suggestion.id)
    nutrientSuggestions.value = nutrientSuggestions.value.filter((item) => item.id !== suggestion.id)
    emit('changed')
  }
  catch (error) {
    workbenchError.value = errorMessage(error)
  }
  finally {
    operationLoading.value = ''
  }
}

function applyResearchTemplate(template: NutrientResearchTemplate) {
  localState.composingMessage = template.prompt
}

function submitComposerKeyboard(event: KeyboardEvent) {
  if (event.shiftKey) return
  event.preventDefault()
  if (isResearchRunning.value) return
  void submitResearchMessage()
}

function toggleMessageCollapsed(messageId: string) {
  researchMessages.value = researchMessages.value.map((item) => item.id === messageId
    ? { ...item, collapsed: !item.collapsed }
    : item)
}

function messageAuthorLabel(message: ResearchMessageView) {
  if (message.role === 'user') return '你'
  if (message.localKind === 'thought') return '思考'
  if (message.localKind === 'tool') return message.toolName || '工具调用'
  return 'Agent'
}

function messageStatusLabel(message: ResearchMessageView) {
  if (message.localStatus === 'pending') return '生成中'
  if (message.localStatus === 'failed') return '失败'
  if (message.localStatus === 'cancelled') return '已暂停'
  if (message.localKind === 'tool' && message.toolStatus) return toolStatusLabel(message.toolStatus)
  return formatTime(message.createdAt)
}

function toolStatusLabel(status: NonNullable<ResearchMessageView['toolStatus']>) {
  if (status === 'running') return '调用中'
  if (status === 'completed') return '已完成'
  return '调用失败'
}

function formatMetadata(metadata?: Record<string, unknown>) {
  if (!metadata || Object.keys(metadata).length === 0) return ''
  return JSON.stringify(metadata, null, 2)
}

function sessionScopeLabel(session: NutrientResearchSessionSummary) {
  return session.seedId ? '研究会话' : '研究会话'
}

function sessionChipTitle(session: NutrientResearchSessionSummary) {
  return session.title || sessionScopeLabel(session)
}

function filterCards(
  input: NutrientCardSummary[],
  search: string,
  status: NutrientCardStatusFilter,
) {
  const keyword = search.trim().toLowerCase()
  return input.filter((card) => {
    const matchesStatus = status === 'all' || card.status === status
    const matchesSearch = !keyword || card.title.toLowerCase().includes(keyword)
    return matchesStatus && matchesSearch
  })
}

async function refreshSelectedCard(cardId = localState.selectedCardId) {
  if (!cardId) return
  const detail = await nutrientApi.getCard(cardId)
  selectedCard.value = detail
  cards.value = cards.value.map((card) => card.id === detail.id ? detail : card)
}

async function settleSelectedCard() {
  if (!selectedCard.value || selectedCard.value.status !== 'unsettled') return
  operationLoading.value = 'settle'
  workbenchError.value = ''
  try {
    const libraryId = await ensureSettleLibraryId()
    const updated = await nutrientApi.settleCard(selectedCard.value.id, { libraryId })
    selectedCard.value = updated
    await loadCards()
    emit('changed')
  }
  catch (error) {
    workbenchError.value = errorMessage(error)
  }
  finally {
    operationLoading.value = ''
  }
}

async function archiveSelectedCard() {
  if (!selectedCard.value || selectedCard.value.status === 'archived') return
  operationLoading.value = 'archive'
  workbenchError.value = ''
  try {
    const updated = await nutrientApi.archiveCard(selectedCard.value.id)
    selectedCard.value = updated
    await loadCards()
    emit('changed')
  }
  catch (error) {
    workbenchError.value = errorMessage(error)
  }
  finally {
    operationLoading.value = ''
  }
}

async function toggleDefaultForGrowth() {
  if (!selectedCard.value || selectedCard.value.status !== 'settled') return
  operationLoading.value = 'default'
  workbenchError.value = ''
  try {
    if (selectedCard.value.defaultForGrowth) {
      await nutrientApi.clearDefaultForGrowth(selectedCard.value.id)
    }
    else {
      await nutrientApi.setDefaultForGrowth(selectedCard.value.id)
    }
    await refreshSelectedCard()
    emit('changed')
  }
  catch (error) {
    workbenchError.value = errorMessage(error)
  }
  finally {
    operationLoading.value = ''
  }
}

function referenceSelectedCard() {
  const card = selectedCard.value
  if (!card || card.status === 'archived') return
  if (card.status === 'unsettled') {
    emit('reference', {
      id: card.id,
      kind: 'nutrient_card',
      label: card.title,
      scope: '草稿营养内容',
      description: '本次枝化生长临时参考',
    })
    return
  }
  if (!card.settledContentId) return
  emit('reference', {
    id: card.settledContentId,
    kind: 'nutrient',
    label: card.title,
    scope: '已沉淀营养内容',
    description: card.defaultForGrowth ? '默认带入，可本次移除' : '正式营养内容',
  })
}

function statusLabel(status: NutrientCardStatus) {
  if (status === 'unsettled') return '草稿'
  if (status === 'settled') return '已沉淀'
  return '已归档'
}

function suggestionSourceLabel(sourceType: NutrientGapSuggestionSourceType) {
  const labels: Record<NutrientGapSuggestionSourceType, string> = {
    seed_brief_gap: '种子简报缺口',
    growth_input_gap: '枝化输入缺口',
    fruit_elimination: '淘汰反馈',
    growth_failure: '生长失败',
    manual: '手动建议',
  }
  return labels[sourceType]
}

function suggestionSummary(suggestion: NutrientGapSuggestion) {
  const normalized = suggestion.bodyMarkdown.replace(/[#>*_\-\n\r`]/g, ' ').replace(/\s+/g, ' ').trim()
  return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function close() {
  emit('close')
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '营养工作台暂时不可用'
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="cf-nutrient-workbench-backdrop" @click.self="close">
      <section class="cf-nutrient-workbench-dialog" role="dialog" aria-modal="true" aria-label="营养工作台" tabindex="-1" @keydown.esc="close">
        <header class="cf-nutrient-workbench-head">
          <div>
            <span>Seed Nutrition</span>
            <h2>营养工作台</h2>
            <p>{{ seedTitle || '当前种子' }}</p>
          </div>
          <button class="cf-nutrient-workbench-close" type="button" aria-label="关闭营养工作台" @click="close">×</button>
        </header>

        <div class="cf-nutrient-workbench-tabs" aria-label="营养工作台分区">
          <button type="button" :class="{ 'is-active': activePane === 'sessions' }" @click="activePane = 'sessions'">会话</button>
          <button type="button" :class="{ 'is-active': activePane === 'agent' }" @click="activePane = 'agent'">工作区</button>
          <button type="button" :class="{ 'is-active': activePane === 'cards' }" @click="activePane = 'cards'">内容</button>
        </div>

        <p v-if="workbenchError" class="cf-nutrient-workbench-error">{{ workbenchError }}</p>

        <div class="cf-nutrient-workbench-layout">
          <aside class="cf-nutrient-card-rail cf-nutrient-session-rail" :class="{ 'is-active-pane': activePane === 'sessions' }" aria-label="研究会话">
            <header class="cf-nutrient-pane-head">
              <strong>研究会话</strong>
            </header>

            <button
              class="cf-nutrient-new-session-btn"
              :class="{ 'is-selected': activeWorkbenchMode === 'new-session' }"
              type="button"
              :disabled="isResearchRunning"
              @click="startNewResearchSession"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              <span>新会话</span>
            </button>

            <div v-if="sessionsLoading" class="cf-nutrient-workbench-empty">读取研究会话中</div>
            <div v-else-if="researchSessions.length === 0" class="cf-nutrient-workbench-empty">
              <strong>暂无历史会话</strong>
              <span>从新研究会话开始，让 Agent 帮你补充营养资料。</span>
            </div>
            <div v-else class="cf-nutrient-card-list">
              <article
                v-for="session in researchSessions"
                :key="session.id"
                class="cf-nutrient-card-item cf-nutrient-session-item"
                :class="{ 'is-selected': localState.activeSessionId === session.id && activeWorkbenchMode === 'session' }"
              >
                <button type="button" :disabled="isResearchRunning" @click="selectResearchSession(session.id)">
                  <span>{{ formatDate(session.updatedAt) }}</span>
                  <strong>{{ sessionChipTitle(session) }}</strong>
                </button>
                <button
                  class="cf-nutrient-btn cf-nutrient-btn-danger cf-nutrient-icon-btn"
                  type="button"
                  :disabled="isResearchRunning || operationLoading === `delete-session:${session.id}`"
                  title="删除会话"
                  @click.stop="requestDeleteResearchSession(session.id)"
                >
                  ×
                </button>
                <div v-if="confirmingSessionDeleteId === session.id" class="cf-nutrient-inline-confirm">
                  <span>只删除会话记录，已沉淀营养会保留。</span>
                  <button class="cf-nutrient-btn cf-nutrient-btn-danger" type="button" :disabled="operationLoading === `delete-session:${session.id}`" @click="deleteResearchSession(session.id)">
                    {{ operationLoading === `delete-session:${session.id}` ? '删除中' : '确认删除' }}
                  </button>
                  <button class="cf-nutrient-btn cf-nutrient-btn-ghost" type="button" :disabled="Boolean(operationLoading)" @click="confirmingSessionDeleteId = ''">取消</button>
                </div>
              </article>
            </div>
          </aside>

          <main class="cf-nutrient-agent-panel" :class="{ 'is-active-pane': activePane === 'agent' }" aria-label="Agent 工作区">
            <header class="cf-nutrient-pane-head">
              <div class="cf-nutrient-pane-title">
                <strong>{{ mainModeTitle }}</strong>
                <span>{{ mainModeSubtitle }}</span>
              </div>
              <div class="cf-nutrient-main-actions">
                <button class="cf-nutrient-btn cf-nutrient-btn-secondary cf-nutrient-suggestion-trigger" type="button" title="查看营养汲取消息" @click="suggestionPopoverOpen = !suggestionPopoverOpen">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
                    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
                  </svg>
                  汲取消息
                  <span>{{ pendingNutrientSuggestions.length }}</span>
                </button>
                <button class="cf-nutrient-btn cf-nutrient-btn-primary" type="button" :disabled="sessionLoading || submitLoading" @click="startNewResearchSession">
                  新会话
                </button>
              </div>
            </header>
            <div v-if="suggestionPopoverOpen" class="cf-nutrient-suggestion-popover">
              <article v-for="suggestion in pendingNutrientSuggestions" :key="suggestion.id" class="cf-nutrient-suggestion-card">
                <span>{{ suggestionSourceLabel(suggestion.sourceType) }}</span>
                <strong>{{ suggestion.title }}</strong>
                <p>{{ suggestionSummary(suggestion) }}</p>
                <div>
                  <button class="cf-nutrient-btn cf-nutrient-btn-primary" type="button" :disabled="Boolean(operationLoading)" @click="acceptNutrientSuggestion(suggestion)">采纳</button>
                  <button class="cf-nutrient-btn cf-nutrient-btn-ghost" type="button" :disabled="Boolean(operationLoading)" @click="ignoreNutrientSuggestion(suggestion)">忽略</button>
                </div>
              </article>
              <div v-if="pendingNutrientSuggestions.length === 0" class="cf-nutrient-workbench-empty cf-nutrient-chat-empty">
                <strong>暂无汲取建议</strong>
                <span>发现资料缺口后会在这里提醒你。</span>
              </div>
            </div>

            <section class="cf-nutrient-agent-thread">
              <div v-if="detailLoading" class="cf-nutrient-workbench-empty">读取营养内容中</div>
              <template v-else>
                <article v-if="selectedCard && activeWorkbenchMode === 'card-detail'" class="cf-nutrient-card-preview cf-nutrient-card-context cf-nutrient-card-detail-view">
                  <header>
                    <div>
                      <span class="cf-nutrient-card-status" :class="`is-${selectedCard.status}`">{{ selectedCard.defaultForGrowth ? '默认带入' : statusLabel(selectedCard.status) }}</span>
                      <h3>{{ selectedCard.title }}</h3>
                    </div>
                    <button class="cf-nutrient-btn cf-nutrient-btn-ghost" type="button" @click="activePane = 'cards'">定位内容</button>
                  </header>
                  <div class="cf-nutrient-card-actions" aria-label="营养内容操作">
                    <button
                      v-if="selectedCard.status === 'unsettled'"
                      class="cf-nutrient-btn cf-nutrient-btn-primary"
                      type="button"
                      :disabled="Boolean(operationLoading)"
                      @click="settleSelectedCard"
                    >
                      {{ operationLoading === 'settle' ? '沉淀中' : '沉淀' }}
                    </button>
                    <button
                      class="cf-nutrient-btn cf-nutrient-btn-secondary"
                      type="button"
                      :disabled="selectedCard.status === 'archived'"
                      @click="referenceSelectedCard"
                    >
                      {{ selectedCard.status === 'unsettled' ? '临时引用' : '引用' }}
                    </button>
                    <button
                      v-if="selectedCard.status === 'settled'"
                      class="cf-nutrient-btn cf-nutrient-btn-secondary"
                      type="button"
                      :class="{ 'is-active': selectedCard.defaultForGrowth }"
                      :disabled="Boolean(operationLoading)"
                      @click="toggleDefaultForGrowth"
                    >
                      {{ selectedCard.defaultForGrowth ? '取消默认带入' : '默认带入' }}
                    </button>
                    <button
                      v-if="selectedCard.status !== 'archived'"
                      class="cf-nutrient-btn cf-nutrient-btn-danger"
                      type="button"
                      :disabled="Boolean(operationLoading)"
                      @click="archiveSelectedCard"
                    >
                      {{ operationLoading === 'archive' ? '归档中' : '归档' }}
                    </button>
                    <button v-else class="cf-nutrient-btn cf-nutrient-btn-ghost" type="button" disabled title="依赖后端更新">回档</button>
                    <button
                      v-if="selectedCard.status === 'unsettled'"
                      class="cf-nutrient-btn cf-nutrient-btn-danger"
                      type="button"
                      :disabled="Boolean(operationLoading)"
                      @click="requestDeleteSelectedCard"
                    >
                      删除
                    </button>
                  </div>
                  <div v-if="confirmingCardDelete" class="cf-nutrient-inline-confirm cf-nutrient-card-confirm">
                    <span>删除草稿营养内容，不影响研究会话。</span>
                    <button class="cf-nutrient-btn cf-nutrient-btn-danger" type="button" :disabled="operationLoading === 'delete-card'" @click="deleteSelectedCard">
                      {{ operationLoading === 'delete-card' ? '删除中' : '确认删除' }}
                    </button>
                    <button class="cf-nutrient-btn cf-nutrient-btn-ghost" type="button" :disabled="Boolean(operationLoading)" @click="confirmingCardDelete = false">取消</button>
                  </div>
                  <p v-if="selectedCard.status === 'archived'" class="cf-nutrient-dependency-note">回档营养内容依赖后端更新</p>
                  <div class="cf-nutrient-feedback-grid" aria-label="营养反馈信息">
                    <section class="cf-nutrient-freshness">
                      <strong>新鲜度提醒</strong>
                      <p>依赖后端更新：后续由系统提示这张营养是否需要重新研究。</p>
                    </section>
                    <section class="cf-nutrient-usage-summary">
                      <strong>使用表现摘要</strong>
                      <p>依赖后端更新：后续展示引用次数、关联果实和选择/淘汰/发布反馈，只辅助判断使用表现。</p>
                    </section>
                  </div>
                  <details class="cf-nutrient-card-markdown">
                    <summary>展开内容</summary>
                    <MarkdownViewer :markdown="selectedCard.markdown" />
                  </details>
                </article>

                <div v-if="activeWorkbenchMode !== 'card-detail' && sessionLoading" class="cf-nutrient-workbench-empty">读取研究会话中</div>
                <div v-else-if="activeWorkbenchMode !== 'card-detail' && !hasActiveConversation" class="cf-nutrient-workbench-empty cf-nutrient-chat-empty">
                  <strong>{{ activeWorkbenchMode === 'new-session' ? '开始新的营养研究' : '继续营养研究' }}</strong>
                  <span>{{ activeWorkbenchMode === 'new-session' ? '发送第一条消息后创建会话。' : '用模板快速启动，或直接描述要研究的平台和方向。' }}</span>
                </div>

                <div v-else-if="activeWorkbenchMode !== 'card-detail'" class="cf-nutrient-message-list" aria-live="polite">
                  <article
                    v-for="item in researchTimelineItems"
                    :key="item.id"
                    :class="item.kind === 'message'
                      ? ['cf-nutrient-message', `is-${item.message.role}`, item.message.localStatus ? `is-${item.message.localStatus}` : '', item.message.localKind ? `is-${item.message.localKind}` : '']
                      : ['cf-nutrient-depositable-block']"
                  >
                    <template v-if="item.kind === 'message'">
                      <header class="cf-nutrient-message-head">
                        <strong>{{ messageAuthorLabel(item.message) }}</strong>
                        <span>{{ messageStatusLabel(item.message) }}</span>
                      </header>
                      <template v-if="item.message.localKind === 'thought'">
                        <button
                          class="cf-nutrient-thought-toggle"
                          type="button"
                          @click="toggleMessageCollapsed(item.message.id)"
                        >
                          <span>{{ item.message.collapsed ? '展开思考' : '收起思考' }}</span>
                          <strong>{{ item.message.localStatus === 'pending' ? '思考中' : '思考记录' }}</strong>
                        </button>
                        <MarkdownViewer v-if="!item.message.collapsed" class="cf-nutrient-thought-body" :markdown="item.message.content || '正在思考...'" />
                      </template>
                      <template v-else-if="item.message.localKind === 'tool'">
                        <div class="cf-nutrient-tool-body">
                          <span class="cf-nutrient-tool-status" :class="`is-${item.message.toolStatus || 'running'}`">{{ item.message.toolStatus ? toolStatusLabel(item.message.toolStatus) : '调用中' }}</span>
                          <MarkdownViewer :markdown="item.message.content" />
                          <pre v-if="formatMetadata(item.message.metadata)" class="cf-nutrient-tool-meta">{{ formatMetadata(item.message.metadata) }}</pre>
                        </div>
                      </template>
                      <template v-else-if="item.message.localKind === 'progress'">
                        <div class="cf-nutrient-tool-body">
                          <span class="cf-nutrient-tool-status is-running">进度</span>
                          <MarkdownViewer :markdown="item.message.content" />
                          <pre v-if="formatMetadata(item.message.metadata)" class="cf-nutrient-tool-meta">{{ formatMetadata(item.message.metadata) }}</pre>
                        </div>
                      </template>
                      <MarkdownViewer v-else :markdown="item.message.content" />
                      <p v-if="item.message.failureReason" class="cf-nutrient-message-failure">{{ item.message.failureReason }}</p>
                      <span v-if="item.message.localStatus === 'pending' && item.message.role === 'assistant'" class="cf-nutrient-message-pulse" />
                    </template>

                    <template v-else>
                      <header>
                        <div>
                          <span>可沉淀营养</span>
                          <strong>{{ item.block.title }}</strong>
                        </div>
                      </header>
                      <MarkdownViewer :markdown="item.block.markdown" />
                      <div class="cf-nutrient-block-actions">
                        <button
                          class="cf-nutrient-btn cf-nutrient-btn-primary"
                          type="button"
                          :disabled="Boolean(operationLoading)"
                          @click="keepSuggestionAsNewCard(item.block)"
                        >
                          {{ operationLoading === `create-block:${item.block.id}` ? '创建中' : '保存为卡片' }}
                        </button>
                        <button
                          class="cf-nutrient-btn cf-nutrient-btn-secondary"
                          type="button"
                          :disabled="Boolean(operationLoading)"
                          @click="mergeSuggestionIntoCard(item.block)"
                        >
                          {{ operationLoading === `merge-block:${item.block.id}` ? '合并中' : '合并到内容' }}
                        </button>
                        <button class="cf-nutrient-btn cf-nutrient-btn-ghost" type="button" @click="ignoreDepositableBlock(item.block.id)">忽略</button>
                      </div>
                    </template>
                  </article>
                </div>

                <div v-if="submitLoading" class="cf-nutrient-research-loading">
                  <span />
                  <strong>研究中</strong>
                </div>
                <p v-if="researchError" class="cf-nutrient-workbench-error">
                  {{ researchError }}
                  <button v-if="lastSubmittedMessage" type="button" @click="retryLastResearchMessage">重试</button>
                </p>
                <div v-if="mergeTargetBlock" class="cf-nutrient-merge-panel" role="dialog" aria-label="选择合并目标">
                  <header>
                    <div>
                      <span>选择合并目标</span>
                      <strong>{{ mergeTargetBlock.title }}</strong>
                    </div>
                    <button class="cf-nutrient-btn cf-nutrient-btn-ghost" type="button" @click="closeMergeTargetSelector">关闭</button>
                  </header>
                  <div class="cf-nutrient-filter-row">
                    <input v-model="mergeTargetSearch" type="search" placeholder="搜索目标营养内容">
                    <div class="cf-nutrient-segmented-filter" role="group" aria-label="合并目标状态筛选">
                      <button type="button" :class="{ 'is-active': mergeTargetStatusFilter === 'all' }" @click="mergeTargetStatusFilter = 'all'">全部</button>
                      <button type="button" :class="{ 'is-active': mergeTargetStatusFilter === 'unsettled' }" @click="mergeTargetStatusFilter = 'unsettled'">草稿</button>
                      <button type="button" :class="{ 'is-active': mergeTargetStatusFilter === 'settled' }" @click="mergeTargetStatusFilter = 'settled'">正常</button>
                    </div>
                  </div>
                  <div class="cf-nutrient-merge-target-list">
                    <button
                      v-for="card in mergeTargetCards"
                      :key="card.id"
                      class="cf-nutrient-card-item"
                      type="button"
                      :disabled="Boolean(operationLoading)"
                      @click="mergeBlockIntoTargetCard(card.id)"
                    >
                      <span class="cf-nutrient-card-item-top">
                        <span class="cf-nutrient-card-status" :class="`is-${card.status}`">{{ statusLabel(card.status) }}</span>
                        <span>{{ formatDate(card.updatedAt) }}</span>
                      </span>
                      <strong>{{ card.title }}</strong>
                    </button>
                    <div v-if="mergeTargetCards.length === 0" class="cf-nutrient-workbench-empty cf-nutrient-chat-empty">
                      <strong>没有可合并目标</strong>
                      <span>请调整筛选，或先保存为新草稿。</span>
                    </div>
                  </div>
                </div>
              </template>
            </section>

            <footer v-if="activeWorkbenchMode !== 'card-detail'" class="cf-nutrient-agent-composer">
              <div class="cf-nutrient-template-strip" aria-label="研究模板">
                <button
                  v-for="template in researchTemplates"
                  :key="template.id"
                  class="cf-nutrient-btn cf-nutrient-btn-ghost"
                  type="button"
                  @click="applyResearchTemplate(template)"
                >
                  {{ template.title }}
                </button>
              </div>
              <div class="cf-nutrient-composer-row">
                <div class="cf-nutrient-composer-field">
                  <textarea
                    v-model="localState.composingMessage"
                    placeholder="描述要研究的平台、方向或缺口"
                    rows="2"
                    @keydown.enter="submitComposerKeyboard"
                  />
                </div>
                <button
                  class="cf-nutrient-btn cf-nutrient-btn-primary cf-nutrient-send-btn"
                  :class="{ 'is-pausing': isResearchRunning }"
                  type="button"
                  :disabled="!isResearchRunning && !localState.composingMessage.trim()"
                  @click="isResearchRunning ? cancelResearchMessage() : submitResearchMessage()"
                >
                  <svg v-if="!isResearchRunning" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m5 12 14-7-4 14-3-6-7-1Z" />
                    <path d="m12 13 7-8" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 6h3v12H8z" />
                    <path d="M13 6h3v12h-3z" />
                  </svg>
                  {{ isResearchRunning ? '暂停' : '发送' }}
                </button>
              </div>
            </footer>
          </main>

          <aside class="cf-nutrient-suggestion-rail cf-nutrient-asset-rail" :class="{ 'is-active-pane': activePane === 'cards' }" aria-label="营养内容">
            <header class="cf-nutrient-pane-head">
              <strong>营养内容</strong>
              <button class="cf-nutrient-btn cf-nutrient-btn-ghost" type="button" :disabled="cardsLoading" @click="() => loadCards()">刷新</button>
            </header>

            <div class="cf-nutrient-filter-row cf-nutrient-card-filter">
              <input v-model="cardSearch" type="search" placeholder="搜索营养内容">
              <div class="cf-nutrient-segmented-filter" role="group" aria-label="营养内容状态筛选">
                <button type="button" :class="{ 'is-active': cardStatusFilter === 'all' }" @click="cardStatusFilter = 'all'">全部</button>
                <button type="button" :class="{ 'is-active': cardStatusFilter === 'unsettled' }" @click="cardStatusFilter = 'unsettled'">草稿</button>
                <button type="button" :class="{ 'is-active': cardStatusFilter === 'settled' }" @click="cardStatusFilter = 'settled'">正常</button>
                <button type="button" :class="{ 'is-active': cardStatusFilter === 'archived' }" @click="cardStatusFilter = 'archived'">归档</button>
              </div>
            </div>

            <div class="cf-nutrient-card-list">
              <div v-if="cardsLoading" class="cf-nutrient-workbench-empty">读取营养内容中</div>
              <div v-else-if="filteredCards.length === 0" class="cf-nutrient-workbench-empty">
                <strong>暂无匹配内容</strong>
                <span>保存或沉淀营养后会出现在这里。</span>
              </div>
              <button
                v-for="card in filteredCards"
                :key="card.id"
                class="cf-nutrient-card-item"
                :class="{
                  'is-selected': localState.selectedCardId === card.id && activeWorkbenchMode === 'card-detail',
                  'is-archived': card.status === 'archived',
                  'is-default': card.defaultForGrowth,
                }"
                type="button"
                @click="selectCard(card.id)"
              >
                <span class="cf-nutrient-card-item-top">
                  <span class="cf-nutrient-card-status" :class="`is-${card.status}`">{{ statusLabel(card.status) }}</span>
                  <span>{{ card.defaultForGrowth ? '默认带入' : formatDate(card.updatedAt) }}</span>
                </span>
                <strong>{{ card.title }}</strong>
                <small>{{ card.status === 'settled' ? '可引用到枝化生长' : card.status === 'unsettled' ? '草稿，可继续沉淀' : '已归档，仅查看' }}</small>
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.cf-nutrient-workbench-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 28px;
  background: rgba(4, 6, 11, .76);
  backdrop-filter: blur(10px);
}

.cf-nutrient-workbench-dialog {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  width: min(1380px, calc(100vw - 56px));
  height: min(860px, calc(100vh - 56px));
  min-height: 620px;
  overflow: hidden;
  border: 1px solid rgba(138, 154, 255, .22);
  border-radius: 10px;
  background: #0a0d13;
  box-shadow: 0 24px 72px rgba(0, 0, 0, .48);
  color: #edf1ff;
}

.cf-nutrient-workbench-head,
.cf-nutrient-pane-head,
.cf-nutrient-workbench-tabs,
.cf-nutrient-card-preview header,
.cf-nutrient-agent-composer,
.cf-nutrient-suggestion-card div {
  display: flex;
  align-items: center;
}

.cf-nutrient-workbench-head {
  grid-row: 1;
  gap: 18px;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(139, 156, 255, .14);
}

.cf-nutrient-workbench-head > div:first-child {
  min-width: 0;
  flex: 1;
}

.cf-nutrient-workbench-head span,
.cf-nutrient-pane-head span,
.cf-nutrient-card-preview span,
.cf-nutrient-card-item span,
.cf-nutrient-suggestion-card span,
.cf-nutrient-suggestion-card p,
.cf-nutrient-workbench-empty span {
  color: rgba(210, 218, 242, .62);
  font-size: 12px;
  line-height: 18px;
}

.cf-nutrient-workbench-head h2 {
  margin: 4px 0;
  color: #fff;
  font-size: 22px;
  font-weight: 760;
  letter-spacing: 0;
}

.cf-nutrient-workbench-head p {
  margin: 0;
  overflow: hidden;
  color: rgba(230, 236, 255, .74);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-nutrient-workbench-close,
.cf-nutrient-pane-head button,
.cf-nutrient-card-preview button,
.cf-nutrient-agent-composer button,
.cf-nutrient-suggestion-card button,
.cf-nutrient-workbench-tabs button {
  min-height: 32px;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 8px;
  background: rgba(255, 255, 255, .055);
  color: #eef2ff;
  cursor: pointer;
}

.cf-nutrient-btn {
  min-height: 32px;
  padding: 0 11px;
  border: 1px solid rgba(255, 255, 255, .11);
  border-radius: 7px;
  background: rgba(255, 255, 255, .055);
  color: #eef2ff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
  line-height: 1;
  transition: border-color .14s ease, background .14s ease, color .14s ease, transform .14s ease, box-shadow .14s ease;
}

.cf-nutrient-btn:hover:not(:disabled) {
  border-color: rgba(165, 181, 255, .34);
  background: rgba(255, 255, 255, .085);
  transform: translateY(-1px);
}

.cf-nutrient-btn:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, .36);
}

.cf-nutrient-btn:focus-visible {
  outline: 2px solid rgba(128, 166, 255, .74);
  outline-offset: 2px;
}

.cf-nutrient-btn:disabled {
  cursor: not-allowed;
  opacity: .48;
}

.cf-nutrient-btn-primary {
  border-color: rgba(104, 214, 197, .32);
  background: rgba(69, 184, 164, .16);
  color: #d8fff8;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08), 0 1px 0 rgba(0, 0, 0, .35);
}

.cf-nutrient-btn-primary:hover:not(:disabled),
.cf-nutrient-btn-primary.is-active {
  border-color: rgba(115, 238, 217, .48);
  background: rgba(69, 184, 164, .22);
}

.cf-nutrient-btn-secondary {
  border-color: rgba(130, 154, 255, .28);
  background: rgba(88, 112, 214, .14);
  color: #edf1ff;
}

.cf-nutrient-btn-secondary:hover:not(:disabled),
.cf-nutrient-btn-secondary.is-active {
  border-color: rgba(148, 170, 255, .48);
  background: rgba(88, 112, 214, .22);
}

.cf-nutrient-btn-danger {
  border-color: rgba(255, 130, 130, .22);
  background: rgba(150, 54, 54, .12);
  color: #ffd7d7;
}

.cf-nutrient-btn-danger:hover:not(:disabled) {
  border-color: rgba(255, 145, 145, .44);
  background: rgba(150, 54, 54, .2);
}

.cf-nutrient-btn-ghost {
  background: rgba(255, 255, 255, .035);
  color: rgba(238, 242, 255, .82);
}

.cf-nutrient-workbench-close {
  width: 36px;
  padding: 0;
  font-size: 24px;
  line-height: 1;
}

.cf-nutrient-workbench-tabs {
  grid-row: 2;
  display: none;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(139, 156, 255, .12);
}

.cf-nutrient-workbench-tabs button {
  flex: 1;
}

.cf-nutrient-workbench-tabs button.is-active {
  border-color: rgba(121, 156, 255, .58);
  background: rgba(88, 122, 255, .18);
}

.cf-nutrient-workbench-error {
  grid-row: 3;
  margin: 10px 16px 0;
  padding: 9px 12px;
  border: 1px solid rgba(255, 120, 120, .24);
  border-radius: 8px;
  background: rgba(88, 18, 18, .26);
  color: #ffc9c9;
  font-size: 13px;
}

.cf-nutrient-workbench-layout {
  grid-row: 4;
  display: grid;
  grid-template-columns: minmax(240px, 280px) minmax(460px, 1fr) minmax(240px, 300px);
  align-items: stretch;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.cf-nutrient-card-rail,
.cf-nutrient-agent-panel,
.cf-nutrient-suggestion-rail {
  align-self: stretch;
  box-sizing: border-box;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border-right: 1px solid rgba(139, 156, 255, .12);
}

.cf-nutrient-suggestion-rail {
  border-right: 0;
}

.cf-nutrient-card-rail,
.cf-nutrient-suggestion-rail {
  padding: 14px;
  background: rgba(7, 9, 14, .42);
}

.cf-nutrient-agent-panel {
  display: grid;
  position: relative;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  background: rgba(10, 13, 20, .68);
}

.cf-nutrient-pane-head {
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
}

.cf-nutrient-pane-title {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.cf-nutrient-agent-panel > .cf-nutrient-pane-head {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(139, 156, 255, .12);
}

.cf-nutrient-card-list,
.cf-nutrient-suggestion-list {
  display: grid;
  align-content: start;
  align-items: start;
  gap: 10px;
  grid-auto-rows: max-content;
}

.cf-nutrient-session-rail,
.cf-nutrient-asset-rail {
  display: grid;
  gap: 10px;
  overflow: hidden;
}

.cf-nutrient-session-rail {
  grid-template-rows: auto auto minmax(0, 1fr);
}

.cf-nutrient-asset-rail {
  grid-template-rows: auto auto minmax(0, 1fr);
}

.cf-nutrient-session-rail .cf-nutrient-card-list,
.cf-nutrient-asset-rail .cf-nutrient-card-list {
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.cf-nutrient-card-item,
.cf-nutrient-suggestion-card,
.cf-nutrient-card-preview,
.cf-nutrient-workbench-empty {
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 8px;
  background: rgba(255, 255, 255, .045);
}

.cf-nutrient-card-item {
  display: grid;
  gap: 9px;
  width: 100%;
  min-width: 0;
  padding: 12px 13px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .035);
}

.cf-nutrient-session-item {
  grid-template-columns: minmax(0, 1fr) 30px;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 2px 6px;
  padding: 3px;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.cf-nutrient-session-item > button:first-child {
  display: grid;
  align-content: start;
  gap: 5px;
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 8px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.cf-nutrient-session-item > button:first-child:disabled {
  cursor: not-allowed;
}

.cf-nutrient-session-item > button:first-child span {
  color: rgba(210, 218, 242, .48);
  font-size: 11px;
  line-height: 14px;
}

.cf-nutrient-session-item > button:first-child strong {
  display: -webkit-box;
  overflow: hidden;
  color: rgba(244, 248, 255, .88);
  font-size: 13px;
  line-height: 18px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.cf-nutrient-session-item .cf-nutrient-icon-btn {
  width: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border-color: transparent;
  background: transparent;
  color: rgba(238, 242, 255, .42);
  opacity: 0;
}

.cf-nutrient-session-item:hover,
.cf-nutrient-session-item.is-selected {
  border-color: rgba(139, 156, 255, .14);
  background: rgba(255, 255, 255, .045);
}

.cf-nutrient-session-item.is-selected {
  background: rgba(91, 118, 214, .13);
}

.cf-nutrient-session-item:hover .cf-nutrient-icon-btn,
.cf-nutrient-session-item.is-selected .cf-nutrient-icon-btn {
  opacity: 1;
}

.cf-nutrient-inline-confirm {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid rgba(255, 130, 130, .2);
  border-radius: 8px;
  background: rgba(105, 38, 48, .2);
}

.cf-nutrient-inline-confirm span {
  min-width: 0;
  color: rgba(255, 218, 218, .78);
  font-size: 12px;
  line-height: 18px;
}

.cf-nutrient-new-session-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 999px;
  background: rgba(255, 255, 255, .05);
  color: rgba(246, 249, 255, .92);
  cursor: pointer;
  font-size: 14px;
  font-weight: 680;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .06), 0 8px 22px rgba(0, 0, 0, .16);
}

.cf-nutrient-new-session-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 2;
}

.cf-nutrient-new-session-btn:hover:not(:disabled),
.cf-nutrient-new-session-btn.is-selected {
  border-color: rgba(127, 247, 221, .3);
  background: rgba(94, 215, 197, .1);
  color: #d8fff8;
}

.cf-nutrient-new-session-btn:disabled {
  cursor: not-allowed;
  opacity: .48;
}

.cf-nutrient-card-item:hover:not(.cf-nutrient-session-item),
.cf-nutrient-card-item.is-selected:not(.cf-nutrient-session-item) {
  border-color: rgba(122, 158, 255, .48);
  background: rgba(73, 104, 214, .18);
}

.cf-nutrient-card-item:active {
  transform: translateY(1px);
}

.cf-nutrient-card-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cf-nutrient-card-item.is-archived {
  opacity: .6;
}

.cf-nutrient-card-item.is-default {
  border-color: rgba(94, 215, 197, .28);
}

.cf-nutrient-asset-rail .cf-nutrient-card-item {
  min-height: 92px;
  align-content: start;
}

.cf-nutrient-asset-rail .cf-nutrient-card-item strong {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.cf-nutrient-asset-rail .cf-nutrient-card-item small {
  display: -webkit-box;
  overflow: hidden;
  color: rgba(210, 218, 242, .46);
  font-size: 11px;
  line-height: 16px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.cf-nutrient-card-item strong,
.cf-nutrient-suggestion-card strong,
.cf-nutrient-card-preview h3,
.cf-nutrient-workbench-empty strong {
  min-width: 0;
  overflow-wrap: anywhere;
  color: #fff;
  font-size: 14px;
  line-height: 20px;
}

.cf-nutrient-card-status {
  width: fit-content;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .07);
}

.cf-nutrient-card-status.is-settled {
  color: #9ff0c2;
  background: rgba(54, 190, 108, .14);
}

.cf-nutrient-card-status.is-unsettled {
  color: #ffdca0;
  background: rgba(214, 153, 61, .16);
}

.cf-nutrient-card-status.is-archived {
  color: rgba(224, 230, 244, .54);
}

.cf-nutrient-agent-thread {
  min-height: 0;
  overflow: auto;
  padding: 14px 16px 28px;
  scrollbar-gutter: stable;
}

.cf-nutrient-main-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cf-nutrient-suggestion-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  position: relative;
  padding-right: 8px;
}

.cf-nutrient-suggestion-trigger svg,
.cf-nutrient-send-btn svg {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.cf-nutrient-suggestion-trigger span {
  display: inline-grid;
  min-width: 18px;
  height: 18px;
  margin-left: 6px;
  place-items: center;
  border-radius: 999px;
  background: rgba(94, 215, 197, .24);
  color: #d8fff8;
  font-size: 11px;
  font-weight: 760;
}

.cf-nutrient-suggestion-popover {
  position: absolute;
  top: 58px;
  right: 16px;
  z-index: 2;
  display: grid;
  gap: 10px;
  width: min(360px, calc(100% - 32px));
  max-height: min(420px, calc(100% - 86px));
  overflow: auto;
  padding: 10px;
  border: 1px solid rgba(139, 156, 255, .18);
  border-radius: 8px;
  background: rgba(12, 16, 25, .96);
  box-shadow: 0 18px 46px rgba(0, 0, 0, .42);
}

.cf-nutrient-card-preview {
  padding: 12px;
}

.cf-nutrient-card-preview header {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.cf-nutrient-card-context {
  margin-bottom: 12px;
  border-color: rgba(130, 154, 255, .2);
  background: rgba(18, 23, 35, .72);
}

.cf-nutrient-card-markdown {
  margin-top: 12px;
}

.cf-nutrient-card-markdown summary {
  width: fit-content;
  cursor: pointer;
  color: rgba(210, 222, 255, .76);
  font-size: 12px;
}

.cf-nutrient-card-markdown[open] {
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, .08);
}

.cf-nutrient-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 10px;
}

.cf-nutrient-card-confirm {
  margin: -2px 0 12px;
}

.cf-nutrient-feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 10px;
}

.cf-nutrient-freshness,
.cf-nutrient-usage-summary,
.cf-nutrient-similar-hint {
  display: grid;
  gap: 5px;
  padding: 9px;
  border: 1px solid rgba(127, 247, 221, .14);
  border-radius: 8px;
  background: rgba(127, 247, 221, .055);
}

.cf-nutrient-freshness strong,
.cf-nutrient-usage-summary strong,
.cf-nutrient-similar-hint strong {
  color: #d7fff8;
  font-size: 12px;
}

.cf-nutrient-freshness p,
.cf-nutrient-usage-summary p,
.cf-nutrient-similar-hint p {
  margin: 0;
  color: rgba(218, 235, 246, .68);
  font-size: 12px;
  line-height: 18px;
}

.cf-nutrient-card-actions button {
  min-height: 30px;
}

.cf-nutrient-card-actions button:hover:not(:disabled),
.cf-nutrient-card-actions button.is-active {
  color: #f4f7ff;
}

.cf-nutrient-card-actions button:disabled {
  cursor: not-allowed;
  opacity: .48;
}

.cf-nutrient-dependency-note,
.cf-nutrient-conversation-note {
  margin: -4px 0 12px;
  color: rgba(210, 218, 242, .62);
  font-size: 12px;
}

.cf-nutrient-card-preview h3 {
  margin: 3px 0 0;
  font-size: 18px;
}

.cf-nutrient-message-list {
  display: grid;
  gap: 13px;
}

.cf-nutrient-message,
.cf-nutrient-depositable-block {
  display: grid;
  gap: 10px;
  max-width: min(760px, 100%);
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 8px;
  background: rgba(18, 21, 30, .72);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .035);
}

.cf-nutrient-message.is-user {
  justify-self: end;
  width: min(620px, 92%);
  border-color: rgba(122, 158, 255, .24);
  background: rgba(52, 70, 145, .28);
}

.cf-nutrient-message.is-assistant {
  justify-self: start;
}

.cf-nutrient-message.is-thought {
  max-width: min(680px, 100%);
  border-color: rgba(190, 172, 255, .18);
  background: rgba(53, 45, 84, .24);
  color: rgba(232, 228, 255, .82);
}

.cf-nutrient-message.is-tool {
  max-width: min(700px, 100%);
  border-color: rgba(255, 210, 132, .18);
  background: rgba(70, 55, 26, .2);
}

.cf-nutrient-message.is-pending {
  border-color: rgba(127, 247, 221, .22);
}

.cf-nutrient-message.is-failed {
  border-color: rgba(255, 120, 120, .28);
  background: rgba(88, 18, 18, .2);
}

.cf-nutrient-message.is-cancelled {
  border-color: rgba(210, 218, 242, .16);
  background: rgba(80, 87, 107, .16);
}

.cf-nutrient-message header,
.cf-nutrient-depositable-block header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cf-nutrient-message header strong,
.cf-nutrient-depositable-block header strong {
  color: #fff;
  font-size: 13px;
}

.cf-nutrient-message header span,
.cf-nutrient-depositable-block header span {
  color: rgba(210, 218, 242, .58);
  font-size: 12px;
}

.cf-nutrient-thought-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 34px;
  padding: 8px 10px;
  border: 1px solid rgba(190, 172, 255, .16);
  border-radius: 8px;
  background: rgba(255, 255, 255, .035);
  color: rgba(238, 236, 255, .84);
  cursor: pointer;
  text-align: left;
}

.cf-nutrient-thought-toggle strong {
  flex: 0 0 auto;
  color: rgba(210, 197, 255, .8);
  font-size: 11px;
}

.cf-nutrient-thought-body {
  padding: 2px 4px;
}

.cf-nutrient-tool-body {
  display: grid;
  gap: 8px;
}

.cf-nutrient-tool-status {
  width: fit-content;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255, 210, 132, .12);
  color: #ffe2a8;
  font-size: 11px;
  font-weight: 700;
}

.cf-nutrient-tool-status.is-completed {
  background: rgba(94, 215, 197, .12);
  color: #bffbf0;
}

.cf-nutrient-tool-status.is-failed {
  background: rgba(255, 120, 120, .13);
  color: #ffc9c9;
}

.cf-nutrient-tool-meta {
  max-height: 120px;
  margin: 0;
  overflow: auto;
  padding: 9px 10px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 8px;
  background: rgba(0, 0, 0, .18);
  color: rgba(231, 236, 255, .72);
  font-size: 11px;
  line-height: 16px;
  white-space: pre-wrap;
}

.cf-nutrient-message-failure {
  margin: 0;
  color: #ffc9c9;
  font-size: 12px;
}

.cf-nutrient-message-pulse {
  width: 34px;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(127, 247, 221, .14);
}

.cf-nutrient-message-pulse::after {
  display: block;
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: rgba(127, 247, 221, .78);
  animation: cf-nutrient-loading-line 1.1s ease-in-out infinite;
  content: "";
}

.cf-nutrient-depositable-block {
  border-color: rgba(94, 215, 197, .32);
  background: rgba(31, 84, 77, .22);
}

.cf-nutrient-block-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cf-nutrient-similar-hint {
  border-color: rgba(255, 220, 160, .18);
  background: rgba(214, 153, 61, .08);
}

.cf-nutrient-similar-hint strong {
  color: #ffe3ad;
}

.cf-nutrient-block-actions button {
  min-height: 30px;
}

.cf-nutrient-block-actions button:disabled {
  cursor: not-allowed;
  opacity: .48;
}

.cf-nutrient-filter-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.cf-nutrient-filter-row input {
  min-width: 0;
  min-height: 34px;
  border: 1px solid rgba(139, 156, 255, .16);
  border-radius: 7px;
  background: rgba(255, 255, 255, .04);
  color: #eef2ff;
  outline: 0;
}

.cf-nutrient-filter-row input {
  padding: 0 10px;
}

.cf-nutrient-filter-row input:focus {
  border-color: rgba(127, 247, 221, .42);
}

.cf-nutrient-segmented-filter {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  padding: 3px;
  border: 1px solid rgba(139, 156, 255, .12);
  border-radius: 8px;
  background: rgba(255, 255, 255, .035);
}

.cf-nutrient-merge-panel .cf-nutrient-segmented-filter {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cf-nutrient-segmented-filter button {
  min-width: 0;
  min-height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(224, 230, 244, .68);
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
}

.cf-nutrient-segmented-filter button:hover,
.cf-nutrient-segmented-filter button.is-active {
  background: rgba(94, 215, 197, .14);
  color: #d8fff8;
}

.cf-nutrient-merge-panel {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid rgba(94, 215, 197, .22);
  border-radius: 8px;
  background: rgba(8, 14, 20, .9);
}

.cf-nutrient-merge-panel > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cf-nutrient-merge-panel > header div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.cf-nutrient-merge-target-list {
  display: grid;
  max-height: 260px;
  overflow: auto;
  gap: 8px;
}

.cf-nutrient-research-loading {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 12px;
  color: rgba(226, 236, 255, .74);
  font-size: 12px;
}

.cf-nutrient-research-loading span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #7ff7dd;
  box-shadow: 0 0 0 0 rgba(127, 247, 221, .5);
  animation: cf-nutrient-pulse 1.15s ease-in-out infinite;
}

@keyframes cf-nutrient-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(127, 247, 221, .4);
  }

  100% {
    box-shadow: 0 0 0 9px rgba(127, 247, 221, 0);
  }
}

@keyframes cf-nutrient-loading-line {
  0% {
    transform: translateX(-110%);
  }

  100% {
    transform: translateX(250%);
  }
}

.cf-nutrient-agent-composer {
  display: grid;
  gap: 9px;
  padding: 12px 16px 14px;
  border-top: 1px solid rgba(139, 156, 255, .12);
  background: rgba(7, 10, 16, .86);
}

.cf-nutrient-template-strip,
.cf-nutrient-composer-row {
  display: flex;
  gap: 8px;
}

.cf-nutrient-template-strip {
  overflow-x: auto;
  padding-bottom: 1px;
}

.cf-nutrient-template-strip button {
  flex: 0 0 auto;
  min-height: 28px;
  font-size: 12px;
}

.cf-nutrient-composer-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  padding: 8px;
  border: 1px solid rgba(139, 156, 255, .16);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, .055), rgba(255, 255, 255, .028));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .05), 0 10px 30px rgba(0, 0, 0, .18);
}

.cf-nutrient-composer-row:focus-within {
  border-color: rgba(127, 247, 221, .36);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .06), 0 0 0 3px rgba(94, 215, 197, .08);
}

.cf-nutrient-agent-composer textarea {
  width: 100%;
  min-height: 52px;
  max-height: 128px;
  resize: none;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #f5f7ff;
  padding: 8px 10px;
  outline: 0;
  font-size: 14px;
  line-height: 21px;
}

.cf-nutrient-agent-composer textarea::placeholder {
  color: rgba(210, 218, 242, .45);
}

.cf-nutrient-send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: stretch;
  min-width: 84px;
  border-radius: 8px;
}

.cf-nutrient-send-btn.is-pausing {
  border-color: rgba(255, 190, 105, .42);
  background: rgba(170, 98, 38, .22);
  color: #ffe1b8;
}

.cf-nutrient-agent-composer textarea:disabled {
  opacity: .58;
}

.cf-nutrient-agent-composer button:disabled,
.cf-nutrient-suggestion-card button:disabled {
  cursor: not-allowed;
  opacity: .46;
}

.cf-nutrient-suggestion-card {
  display: grid;
  gap: 9px;
  padding: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .035);
}

.cf-nutrient-suggestion-card p {
  margin: 0;
}

.cf-nutrient-suggestion-footnote {
  margin: 2px 0 0;
  padding: 10px;
  border: 1px dashed rgba(255, 255, 255, .1);
  border-radius: 8px;
  color: rgba(210, 218, 242, .5);
  font-size: 12px;
  line-height: 18px;
}

.cf-nutrient-suggestion-card div {
  gap: 8px;
}

.cf-nutrient-suggestion-card button {
  flex: 1;
}

.cf-nutrient-workbench-empty {
  display: grid;
  place-items: center;
  align-content: center;
  min-height: 160px;
  padding: 18px;
  text-align: center;
}

.cf-nutrient-chat-empty {
  min-height: 118px;
  margin: 0;
  border-style: dashed;
  background: rgba(255, 255, 255, .03);
}

@media (max-width: 900px) {
  .cf-nutrient-workbench-backdrop {
    padding: 12px;
  }

  .cf-nutrient-workbench-dialog {
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
    min-height: 0;
  }

  .cf-nutrient-workbench-head {
    align-items: flex-start;
    gap: 10px;
    padding: 14px;
  }

  .cf-nutrient-workbench-tabs {
    display: flex;
  }

  .cf-nutrient-workbench-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .cf-nutrient-card-rail,
  .cf-nutrient-agent-panel,
  .cf-nutrient-suggestion-rail {
    display: none;
    border-right: 0;
  }

  .cf-nutrient-card-rail.is-active-pane,
  .cf-nutrient-agent-panel.is-active-pane,
  .cf-nutrient-suggestion-rail.is-active-pane {
    display: grid;
  }

  .cf-nutrient-feedback-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .cf-nutrient-composer-row {
    align-items: stretch;
    flex-direction: column;
  }

  .cf-nutrient-send-btn {
    min-height: 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cf-nutrient-btn,
  .cf-nutrient-message-pulse::after,
  .cf-nutrient-research-loading span {
    animation: none;
    transition: none;
  }

  .cf-nutrient-btn:hover:not(:disabled),
  .cf-nutrient-btn:active:not(:disabled) {
    transform: none;
  }
}
</style>
