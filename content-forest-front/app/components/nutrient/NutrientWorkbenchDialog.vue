<script setup lang="ts">
import { createNutrientApi, NUTRIENT_WORKBENCH_BACKEND_DEPENDENCIES, type NutrientCardDetail, type NutrientCardStatus, type NutrientCardSummary, type NutrientDepositableBlock, type NutrientFetcher, type NutrientGapSuggestion, type NutrientGapSuggestionSourceType, type NutrientResearchMessage, type NutrientResearchSessionDetail, type NutrientResearchTemplate, type NutrientWorkbenchPane, type NutrientWorkbenchState } from '../../../src/modules/nutrient'
import MarkdownViewer from '../markdown/MarkdownViewer.vue'

type ResearchMessageView = NutrientResearchMessage & {
  localStatus?: 'pending' | 'failed'
}

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
const selectedCard = ref<NutrientCardDetail | null>(null)
const researchSession = ref<NutrientResearchSessionDetail | null>(null)
const researchMessages = ref<ResearchMessageView[]>([])
const depositableBlocks = ref<NutrientDepositableBlock[]>([])
const cardsLoading = ref(false)
const suggestionsLoading = ref(false)
const detailLoading = ref(false)
const sessionLoading = ref(false)
const submitLoading = ref(false)
const operationLoading = ref('')
const workbenchError = ref('')
const researchError = ref('')
const lastSubmittedMessage = ref('')
const settleLibraryId = ref('')
const ignoredBlockIds = ref<string[]>([])
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
const feedbackDependencyNames = computed(() => NUTRIENT_WORKBENCH_BACKEND_DEPENDENCIES
  .filter((item) => item.status === '依赖后端更新')
  .map((item) => item.name)
  .join('、'))
const settledCardsCount = computed(() => cards.value.filter((card) => card.status === 'settled').length)
const visibleDepositableBlocks = computed(() => depositableBlocks.value.filter((block) => !ignoredBlockIds.value.includes(block.id)))
const hasActiveConversation = computed(() => researchMessages.value.length > 0 || visibleDepositableBlocks.value.length > 0)
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
    void loadCards()
    void loadGapSuggestions()
  },
  { immediate: true },
)

async function loadCards() {
  if (!props.seedId) return
  cardsLoading.value = true
  workbenchError.value = ''
  try {
    cards.value = await nutrientApi.listCards(props.seedId)
    if (!localState.selectedCardId && cards.value[0]) {
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
  localState.selectedCardId = cardId
  detailLoading.value = true
  workbenchError.value = ''
  try {
    selectedCard.value = await nutrientApi.getCard(cardId)
    resetResearchState()
    if (selectedCard.value.conversationId) {
      await loadResearchSession(selectedCard.value.conversationId)
    }
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

async function loadResearchSession(sessionId: string) {
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
}

async function startNewResearchSession() {
  if (!props.seedId || sessionLoading.value || submitLoading.value) return
  selectedCard.value = null
  localState.selectedCardId = ''
  localState.composingMessage = ''
  resetResearchState()
  activePane.value = 'agent'
  sessionLoading.value = true
  localState.sessionStatus = 'loading'
  researchError.value = ''
  try {
    const session = await nutrientApi.createResearchSession({
      seedId: props.seedId,
      nutrientCardId: null,
      title: `${props.seedTitle || '当前种子'} / 新研究`,
    })
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

async function ensureResearchSession() {
  if (researchSession.value) return researchSession.value
  const session = await nutrientApi.createResearchSession({
    seedId: props.seedId,
    nutrientCardId: selectedCard.value?.id ?? null,
    title: selectedCard.value?.title ?? props.seedTitle ?? '营养研究',
  })
  applyResearchSession(session)
  if (selectedCard.value && !selectedCard.value.conversationId) {
    const updated = await nutrientApi.bindCardConversation(selectedCard.value.id, {
      conversationId: session.id,
    })
    selectedCard.value = updated
    cards.value = cards.value.map((card) => card.id === updated.id ? updated : card)
  }
  return session
}

async function submitResearchMessage() {
  const message = localState.composingMessage.trim()
  if (!message || submitLoading.value) return
  submitLoading.value = true
  localState.sessionStatus = 'submitting'
  researchError.value = ''
  lastSubmittedMessage.value = message
  let optimisticUserId = ''
  let optimisticAssistantId = ''
  let streamError: string | null = null
  try {
    const session = await ensureResearchSession()
    localState.composingMessage = ''
    const optimistic = createOptimisticResearchTurn(session.id, message)
    optimisticUserId = optimistic.user.id
    optimisticAssistantId = optimistic.assistant.id
    let userMessageId = optimisticUserId
    let assistantMessageId = optimisticAssistantId
    researchMessages.value = [
      ...researchMessages.value,
      optimistic.user,
      optimistic.assistant,
    ]
    await nutrientApi.streamResearchMessage(session.id, { message }, (event) => {
      if (event.type === 'user_message') {
        userMessageId = upsertResearchMessage(userMessageId, event.message)
        return
      }
      if (event.type === 'progress') {
        researchMessages.value = researchMessages.value.map((item) => item.id === assistantMessageId
          ? { ...item, content: event.message, localStatus: 'pending' }
          : item)
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
        depositableBlocks.value = mergeDepositableBlocks(
          depositableBlocks.value,
          event.depositableBlocks,
        )
        localState.sessionStatus = 'ready'
        return
      }
      if (event.type === 'error') {
        streamError = event.message
        if (event.assistantMessage) {
          assistantMessageId = upsertResearchMessage(assistantMessageId, event.assistantMessage, 'failed')
        }
        else {
          researchMessages.value = researchMessages.value.map((item) => item.id === assistantMessageId
            ? { ...item, content: event.message, failureReason: event.message, localStatus: 'failed' }
            : item)
        }
      }
    })
    if (streamError) {
      throw new Error(streamError)
    }
    localState.sessionStatus = 'ready'
  }
  catch (error) {
    localState.sessionStatus = 'failed'
    researchError.value = errorMessage(error)
    localState.composingMessage = message
    if (optimisticAssistantId) {
      researchMessages.value = researchMessages.value.map((item) => item.id === optimisticAssistantId
        ? {
            ...item,
            localStatus: 'failed',
            content: '研究没有成功完成，已保留你的输入，可以直接重试。',
            failureReason: errorMessage(error),
          }
        : item)
    }
  }
  finally {
    submitLoading.value = false
  }
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
      conversationId: researchSession.value?.id ?? null,
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

async function mergeBlockIntoSelectedCard(block: NutrientDepositableBlock) {
  if (!selectedCard.value || selectedCard.value.status === 'archived') return
  operationLoading.value = `merge-block:${block.id}`
  researchError.value = ''
  try {
    const nextMarkdown = [
      selectedCard.value.markdown.trim(),
      block.markdown.trim(),
    ].filter(Boolean).join('\n\n---\n\n')
    const updated = await nutrientApi.updateCard(selectedCard.value.id, {
      title: selectedCard.value.title,
      markdown: nextMarkdown,
    })
    selectedCard.value = updated
    cards.value = cards.value.map((card) => card.id === updated.id ? updated : card)
    ignoredBlockIds.value = [...ignoredBlockIds.value, block.id]
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
  await mergeBlockIntoSelectedCard(block)
}

function ignoreDepositableBlock(blockId: string) {
  if (ignoredBlockIds.value.includes(blockId)) return
  ignoredBlockIds.value = [...ignoredBlockIds.value, blockId]
}

async function acceptNutrientSuggestion(suggestion: NutrientGapSuggestion) {
  operationLoading.value = `adopt-suggestion:${suggestion.id}`
  workbenchError.value = ''
  try {
    const result = await nutrientApi.adoptGapSuggestion(suggestion.id)
    nutrientSuggestions.value = nutrientSuggestions.value.filter((item) => item.id !== suggestion.id)
    await loadCards()
    await selectCard(result.nutrientCard.id)
    localState.composingMessage = suggestion.bodyMarkdown
    activePane.value = 'agent'
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
  void submitResearchMessage()
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
          <div class="cf-nutrient-workbench-stats" aria-label="营养工作台概览">
            <strong>{{ cards.length }}</strong>
            <span>内容</span>
            <strong>{{ settledCardsCount }}</strong>
            <span>已沉淀</span>
          </div>
          <button class="cf-nutrient-workbench-close" type="button" aria-label="关闭营养工作台" @click="close">×</button>
        </header>

        <div class="cf-nutrient-workbench-tabs" aria-label="营养工作台分区">
          <button type="button" :class="{ 'is-active': activePane === 'cards' }" @click="activePane = 'cards'">内容</button>
          <button type="button" :class="{ 'is-active': activePane === 'agent' }" @click="activePane = 'agent'">Agent</button>
          <button type="button" :class="{ 'is-active': activePane === 'suggestions' }" @click="activePane = 'suggestions'">建议</button>
        </div>

        <p v-if="workbenchError" class="cf-nutrient-workbench-error">{{ workbenchError }}</p>

        <div class="cf-nutrient-workbench-layout">
          <aside class="cf-nutrient-card-rail" :class="{ 'is-active-pane': activePane === 'cards' }" aria-label="营养内容">
            <header class="cf-nutrient-pane-head">
              <strong>营养内容</strong>
              <button class="cf-nutrient-btn cf-nutrient-btn-ghost" type="button" :disabled="cardsLoading" @click="loadCards">刷新</button>
            </header>

            <div v-if="cardsLoading" class="cf-nutrient-workbench-empty">读取营养内容中</div>
            <div v-else-if="cards.length === 0" class="cf-nutrient-workbench-empty">
              <strong>暂无营养内容</strong>
              <span>Agent 研究沉淀后会出现在这里。</span>
            </div>
            <div v-else class="cf-nutrient-card-list">
              <button
                v-for="card in cards"
                :key="card.id"
                class="cf-nutrient-card-item"
                :class="{
                  'is-selected': localState.selectedCardId === card.id,
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
              </button>
            </div>
          </aside>

          <main class="cf-nutrient-agent-panel" :class="{ 'is-active-pane': activePane === 'agent' }" aria-label="Agent 工作区">
            <header class="cf-nutrient-pane-head">
              <div class="cf-nutrient-pane-title">
                <strong>Agent 研究</strong>
                <span>{{ researchSession ? researchSession.title : selectedCard ? '内容会话' : '种子会话' }}</span>
              </div>
              <button class="cf-nutrient-btn cf-nutrient-btn-secondary" type="button" :disabled="sessionLoading || submitLoading" @click="startNewResearchSession">
                {{ sessionLoading ? '创建中' : '新会话' }}
              </button>
            </header>

            <section class="cf-nutrient-agent-thread">
              <div v-if="detailLoading" class="cf-nutrient-workbench-empty">读取营养内容中</div>
              <template v-else>
                <article v-if="selectedCard" class="cf-nutrient-card-preview cf-nutrient-card-context">
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
                  </div>
                  <p v-if="selectedCard.status === 'archived'" class="cf-nutrient-dependency-note">回档营养内容依赖后端更新</p>
                  <p v-if="selectedCard.conversationId" class="cf-nutrient-conversation-note">会话 {{ selectedCard.conversationId }}</p>
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

                <div v-if="sessionLoading" class="cf-nutrient-workbench-empty">读取研究会话中</div>
                <div v-else-if="!hasActiveConversation" class="cf-nutrient-workbench-empty cf-nutrient-chat-empty">
                  <strong>{{ selectedCard ? '继续研究这条营养内容' : '开始种子营养研究' }}</strong>
                  <span>{{ selectedCard ? '输入问题后会为这条营养内容创建或加载研究会话。' : '用模板快速启动，或直接描述要研究的平台和方向。' }}</span>
                </div>

                <div v-else class="cf-nutrient-message-list" aria-live="polite">
                  <article
                    v-for="message in researchMessages"
                    :key="message.id"
                    class="cf-nutrient-message"
                    :class="[`is-${message.role}`, message.localStatus ? `is-${message.localStatus}` : '']"
                  >
                    <header>
                      <strong>{{ message.role === 'user' ? '你' : 'Agent' }}</strong>
                      <span>{{ message.localStatus === 'pending' ? '处理中' : formatTime(message.createdAt) }}</span>
                    </header>
                    <MarkdownViewer :markdown="message.content" />
                    <p v-if="message.failureReason" class="cf-nutrient-message-failure">{{ message.failureReason }}</p>
                    <span v-if="message.localStatus === 'pending' && message.role === 'assistant'" class="cf-nutrient-message-pulse" />
                  </article>

                  <article
                    v-for="block in visibleDepositableBlocks"
                    :key="block.id"
                    class="cf-nutrient-depositable-block"
                  >
                    <header>
                      <div>
                        <span>可沉淀营养</span>
                        <strong>{{ block.title }}</strong>
                      </div>
                    </header>
                    <MarkdownViewer :markdown="block.markdown" />
                    <div class="cf-nutrient-block-actions">
                      <button
                        class="cf-nutrient-btn cf-nutrient-btn-primary"
                        type="button"
                        :disabled="Boolean(operationLoading)"
                        @click="keepSuggestionAsNewCard(block)"
                      >
                        {{ operationLoading === `create-block:${block.id}` ? '生成中' : '保存为草稿' }}
                      </button>
                      <button
                        class="cf-nutrient-btn cf-nutrient-btn-secondary"
                        type="button"
                        :disabled="!selectedCard || selectedCard.status === 'archived' || Boolean(operationLoading)"
                        @click="mergeSuggestionIntoCard(block)"
                      >
                        {{ operationLoading === `merge-block:${block.id}` ? '合并中' : '合并到当前内容' }}
                      </button>
                      <button class="cf-nutrient-btn cf-nutrient-btn-ghost" type="button" @click="ignoreDepositableBlock(block.id)">忽略</button>
                    </div>
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
              </template>
            </section>

            <footer class="cf-nutrient-agent-composer">
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
                <textarea
                  v-model="localState.composingMessage"
                  placeholder="描述要研究的平台、方向或缺口"
                  :disabled="submitLoading"
                  @keydown.enter="submitComposerKeyboard"
                />
                <button class="cf-nutrient-btn cf-nutrient-btn-primary cf-nutrient-send-btn" type="button" :disabled="submitLoading || !localState.composingMessage.trim()" @click="submitResearchMessage">
                  {{ submitLoading ? '发送中' : '发送' }}
                </button>
              </div>
            </footer>
          </main>

          <aside class="cf-nutrient-suggestion-rail" :class="{ 'is-active-pane': activePane === 'suggestions' }" aria-label="营养汲取建议">
            <header class="cf-nutrient-pane-head">
              <strong>汲取建议</strong>
              <span>{{ pendingNutrientSuggestions.length }} 条</span>
            </header>

            <div class="cf-nutrient-suggestion-list">
              <div v-if="suggestionsLoading" class="cf-nutrient-workbench-empty">读取建议中</div>
              <article v-for="suggestion in pendingNutrientSuggestions" :key="suggestion.id" class="cf-nutrient-suggestion-card">
                <span>{{ suggestionSourceLabel(suggestion.sourceType) }}</span>
                <strong>{{ suggestion.title }}</strong>
                <p>{{ suggestionSummary(suggestion) }}</p>
                <div>
                  <button
                    class="cf-nutrient-btn cf-nutrient-btn-primary"
                    type="button"
                    :disabled="Boolean(operationLoading)"
                    @click="acceptNutrientSuggestion(suggestion)"
                  >
                    {{ operationLoading === `adopt-suggestion:${suggestion.id}` ? '采纳中' : '采纳' }}
                  </button>
                  <button
                    class="cf-nutrient-btn cf-nutrient-btn-ghost"
                    type="button"
                    :disabled="Boolean(operationLoading)"
                    @click="ignoreNutrientSuggestion(suggestion)"
                  >
                    {{ operationLoading === `ignore-suggestion:${suggestion.id}` ? '忽略中' : '忽略' }}
                  </button>
                </div>
              </article>
              <div v-if="!suggestionsLoading && pendingNutrientSuggestions.length === 0" class="cf-nutrient-workbench-empty">
                <strong>暂无建议</strong>
                <span>枝化生长或营养研究发现缺口后会进入这里。</span>
              </div>
              <p v-if="feedbackDependencyNames" class="cf-nutrient-suggestion-footnote">
                待后端接入：{{ feedbackDependencyNames }}
              </p>
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
.cf-nutrient-workbench-stats,
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

.cf-nutrient-workbench-stats {
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 8px;
  background: rgba(255, 255, 255, .04);
}

.cf-nutrient-workbench-stats strong {
  color: #fff;
  font-size: 16px;
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
  gap: 10px;
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

.cf-nutrient-card-item:hover,
.cf-nutrient-card-item.is-selected {
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
  padding: 14px 16px 18px;
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

.cf-nutrient-message.is-pending {
  border-color: rgba(127, 247, 221, .22);
}

.cf-nutrient-message.is-failed {
  border-color: rgba(255, 120, 120, .28);
  background: rgba(88, 18, 18, .2);
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
  align-items: center;
  padding: 8px;
  border: 1px solid rgba(139, 156, 255, .16);
  border-radius: 8px;
  background: rgba(255, 255, 255, .035);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .035);
}

.cf-nutrient-agent-composer textarea {
  flex: 1;
  min-height: 52px;
  max-height: 120px;
  resize: vertical;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #f5f7ff;
  padding: 8px 10px;
  outline: 0;
}

.cf-nutrient-agent-composer textarea::placeholder {
  color: rgba(210, 218, 242, .45);
}

.cf-nutrient-send-btn {
  align-self: stretch;
  min-width: 68px;
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

  .cf-nutrient-workbench-stats {
    display: none;
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
