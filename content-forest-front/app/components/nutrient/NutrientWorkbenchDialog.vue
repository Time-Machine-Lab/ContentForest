<script setup lang="ts">
import { createNutrientApi, NUTRIENT_WORKBENCH_BACKEND_DEPENDENCIES, type NutrientCardDetail, type NutrientCardStatus, type NutrientCardSummary, type NutrientDepositableBlock, type NutrientFetcher, type NutrientGapSuggestion, type NutrientGapSuggestionSourceType, type NutrientResearchMessage, type NutrientResearchSessionDetail, type NutrientResearchTemplate, type NutrientWorkbenchPane, type NutrientWorkbenchState } from '../../../src/modules/nutrient'
import MarkdownViewer from '../markdown/MarkdownViewer.vue'

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
const researchMessages = ref<NutrientResearchMessage[]>([])
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

const suggestionDependencies = computed(() => NUTRIENT_WORKBENCH_BACKEND_DEPENDENCIES.filter((item) => item.status === '依赖后端更新'))
const pendingNutrientSuggestions = computed(() => nutrientSuggestions.value.filter((suggestion) => suggestion.status === 'pending'))
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
  try {
    const session = await ensureResearchSession()
    localState.composingMessage = ''
    const result = await nutrientApi.submitResearchMessage(session.id, { message })
    researchMessages.value = [
      ...researchMessages.value,
      result.userMessage,
      result.assistantMessage,
    ]
    depositableBlocks.value = mergeDepositableBlocks(
      depositableBlocks.value,
      result.depositableBlocks,
    )
    localState.sessionStatus = 'ready'
  }
  catch (error) {
    localState.sessionStatus = 'failed'
    researchError.value = errorMessage(error)
    localState.composingMessage = message
  }
  finally {
    submitLoading.value = false
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
      scope: '未沉淀营养卡片',
      description: '本次枝化生长临时参考',
    })
    return
  }
  if (!card.settledContentId) return
  emit('reference', {
    id: card.settledContentId,
    kind: 'nutrient',
    label: card.title,
    scope: '已沉淀营养',
    description: card.defaultForGrowth ? '常驻营养，可本次移除' : '正式营养内容',
  })
}

function statusLabel(status: NutrientCardStatus) {
  if (status === 'unsettled') return '未沉淀'
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
            <span>卡片</span>
            <strong>{{ settledCardsCount }}</strong>
            <span>已沉淀</span>
          </div>
          <button class="cf-nutrient-workbench-close" type="button" aria-label="关闭营养工作台" @click="close">×</button>
        </header>

        <div class="cf-nutrient-workbench-tabs" aria-label="营养工作台分区">
          <button type="button" :class="{ 'is-active': activePane === 'cards' }" @click="activePane = 'cards'">卡片</button>
          <button type="button" :class="{ 'is-active': activePane === 'agent' }" @click="activePane = 'agent'">Agent</button>
          <button type="button" :class="{ 'is-active': activePane === 'suggestions' }" @click="activePane = 'suggestions'">建议</button>
        </div>

        <p v-if="workbenchError" class="cf-nutrient-workbench-error">{{ workbenchError }}</p>

        <div class="cf-nutrient-workbench-layout">
          <aside class="cf-nutrient-card-rail" :class="{ 'is-active-pane': activePane === 'cards' }" aria-label="营养卡片">
            <header class="cf-nutrient-pane-head">
              <strong>营养卡片</strong>
              <button type="button" :disabled="cardsLoading" @click="loadCards">刷新</button>
            </header>

            <div v-if="cardsLoading" class="cf-nutrient-workbench-empty">读取卡片中</div>
            <div v-else-if="cards.length === 0" class="cf-nutrient-workbench-empty">
              <strong>暂无营养卡片</strong>
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
                <span class="cf-nutrient-card-status" :class="`is-${card.status}`">{{ statusLabel(card.status) }}</span>
                <strong>{{ card.title }}</strong>
                <span>{{ card.defaultForGrowth ? '默认带入' : '更新于 ' + formatDate(card.updatedAt) }}</span>
              </button>
            </div>
          </aside>

          <main class="cf-nutrient-agent-panel" :class="{ 'is-active-pane': activePane === 'agent' }" aria-label="Agent 工作区">
            <header class="cf-nutrient-pane-head">
              <strong>Agent 研究</strong>
              <span>{{ researchSession ? researchSession.title : selectedCard ? '卡片会话' : '种子会话' }}</span>
            </header>

            <section class="cf-nutrient-agent-thread">
              <div v-if="detailLoading" class="cf-nutrient-workbench-empty">读取卡片内容中</div>
              <template v-else>
                <article v-if="selectedCard" class="cf-nutrient-card-preview">
                  <header>
                    <div>
                      <span>{{ selectedCard.defaultForGrowth ? '默认带入' : statusLabel(selectedCard.status) }}</span>
                      <h3>{{ selectedCard.title }}</h3>
                    </div>
                    <button type="button" @click="activePane = 'cards'">查看卡片</button>
                  </header>
                  <div class="cf-nutrient-card-actions" aria-label="营养卡片操作">
                    <button
                      v-if="selectedCard.status === 'unsettled'"
                      type="button"
                      :disabled="Boolean(operationLoading)"
                      @click="settleSelectedCard"
                    >
                      {{ operationLoading === 'settle' ? '沉淀中' : '沉淀' }}
                    </button>
                    <button
                      type="button"
                      :disabled="selectedCard.status === 'archived'"
                      @click="referenceSelectedCard"
                    >
                      {{ selectedCard.status === 'unsettled' ? '临时引用' : '引用' }}
                    </button>
                    <button
                      v-if="selectedCard.status === 'settled'"
                      type="button"
                      :class="{ 'is-active': selectedCard.defaultForGrowth }"
                      :disabled="Boolean(operationLoading)"
                      @click="toggleDefaultForGrowth"
                    >
                      {{ selectedCard.defaultForGrowth ? '取消常驻' : '常驻营养' }}
                    </button>
                    <button
                      v-if="selectedCard.status !== 'archived'"
                      type="button"
                      :disabled="Boolean(operationLoading)"
                      @click="archiveSelectedCard"
                    >
                      {{ operationLoading === 'archive' ? '归档中' : '归档' }}
                    </button>
                    <button v-else type="button" disabled title="依赖后端更新">回档</button>
                  </div>
                  <p v-if="selectedCard.status === 'archived'" class="cf-nutrient-dependency-note">回档营养卡片依赖后端更新</p>
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
                    <summary>查看卡片内容</summary>
                    <MarkdownViewer :markdown="selectedCard.markdown" />
                  </details>
                </article>

                <div v-if="sessionLoading" class="cf-nutrient-workbench-empty">读取研究会话中</div>
                <div v-else-if="!hasActiveConversation" class="cf-nutrient-workbench-empty cf-nutrient-chat-empty">
                  <strong>{{ selectedCard ? '继续研究这张卡片' : '开始种子营养研究' }}</strong>
                  <span>{{ selectedCard ? '输入问题后会为这张卡片创建或加载研究会话。' : '用模板快速启动，或直接描述要研究的平台和方向。' }}</span>
                </div>

                <div v-else class="cf-nutrient-message-list" aria-live="polite">
                  <article
                    v-for="message in researchMessages"
                    :key="message.id"
                    class="cf-nutrient-message"
                    :class="`is-${message.role}`"
                  >
                    <header>
                      <strong>{{ message.role === 'user' ? '你' : 'Agent' }}</strong>
                      <span>{{ formatTime(message.createdAt) }}</span>
                    </header>
                    <MarkdownViewer :markdown="message.content" />
                    <p v-if="message.failureReason" class="cf-nutrient-message-failure">{{ message.failureReason }}</p>
                  </article>

                  <article
                    v-for="block in visibleDepositableBlocks"
                    :key="block.id"
                    class="cf-nutrient-depositable-block"
                  >
                    <header>
                      <span>可沉淀营养</span>
                      <strong>{{ block.title }}</strong>
                    </header>
                    <MarkdownViewer :markdown="block.markdown" />
                    <div v-if="selectedCard && selectedCard.status !== 'archived'" class="cf-nutrient-similar-hint">
                      <strong>相似营养提示</strong>
                      <p>这段内容可能适合合并进当前卡片，也可以保留为新的营养方向。</p>
                    </div>
                    <div class="cf-nutrient-block-actions">
                      <button
                        type="button"
                        :disabled="Boolean(operationLoading)"
                        @click="keepSuggestionAsNewCard(block)"
                      >
                        {{ operationLoading === `create-block:${block.id}` ? '生成中' : '保留为新卡片' }}
                      </button>
                      <button
                        type="button"
                        :disabled="!selectedCard || selectedCard.status === 'archived' || Boolean(operationLoading)"
                        @click="mergeSuggestionIntoCard(block)"
                      >
                        {{ operationLoading === `merge-block:${block.id}` ? '合并中' : '合并到当前卡片' }}
                      </button>
                      <button type="button" @click="ignoreDepositableBlock(block.id)">忽略</button>
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
                  type="button"
                  @click="applyResearchTemplate(template)"
                >
                  {{ template.title }}
                </button>
              </div>
              <div class="cf-nutrient-composer-row">
                <textarea
                  v-model="localState.composingMessage"
                  placeholder="和营养研究 Agent 继续交流"
                  :disabled="submitLoading"
                  @keydown.enter="submitComposerKeyboard"
                />
                <button type="button" :disabled="submitLoading || !localState.composingMessage.trim()" @click="submitResearchMessage">
                  {{ submitLoading ? '发送中' : '发送' }}
                </button>
              </div>
            </footer>
          </main>

          <aside class="cf-nutrient-suggestion-rail" :class="{ 'is-active-pane': activePane === 'suggestions' }" aria-label="营养汲取建议">
            <header class="cf-nutrient-pane-head">
              <strong>汲取建议</strong>
              <span>{{ pendingNutrientSuggestions.length }}</span>
            </header>

            <div class="cf-nutrient-suggestion-list">
              <div v-if="suggestionsLoading" class="cf-nutrient-workbench-empty">读取建议中</div>
              <article v-for="suggestion in pendingNutrientSuggestions" :key="suggestion.id" class="cf-nutrient-suggestion-card">
                <span>{{ suggestionSourceLabel(suggestion.sourceType) }}</span>
                <strong>{{ suggestion.title }}</strong>
                <p>{{ suggestionSummary(suggestion) }}</p>
                <div>
                  <button
                    type="button"
                    :disabled="Boolean(operationLoading)"
                    @click="acceptNutrientSuggestion(suggestion)"
                  >
                    {{ operationLoading === `adopt-suggestion:${suggestion.id}` ? '采纳中' : '采纳' }}
                  </button>
                  <button
                    type="button"
                    :disabled="Boolean(operationLoading)"
                    @click="ignoreNutrientSuggestion(suggestion)"
                  >
                    {{ operationLoading === `ignore-suggestion:${suggestion.id}` ? '忽略中' : '忽略' }}
                  </button>
                </div>
              </article>
              <article v-for="dependency in suggestionDependencies" :key="dependency.name" class="cf-nutrient-suggestion-card">
                <span>依赖后端更新</span>
                <strong>{{ dependency.name }}</strong>
                <p>{{ dependency.note }}</p>
                <div>
                  <button type="button" disabled>采纳</button>
                  <button type="button" disabled>忽略</button>
                </div>
              </article>
              <div v-if="!suggestionsLoading && pendingNutrientSuggestions.length === 0 && suggestionDependencies.length === 0" class="cf-nutrient-workbench-empty">
                <strong>暂无建议</strong>
                <span>新的缺口建议会进入这里。</span>
              </div>
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
  background:
    radial-gradient(circle at 26% 18%, rgba(64, 108, 255, .16), transparent 28%),
    rgba(4, 6, 11, .72);
  backdrop-filter: blur(10px);
}

.cf-nutrient-workbench-dialog {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  width: min(1380px, calc(100vw - 56px));
  height: min(860px, calc(100vh - 56px));
  min-height: 620px;
  overflow: hidden;
  border: 1px solid rgba(138, 154, 255, .22);
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(20, 24, 34, .98), rgba(8, 10, 16, .98)),
    #090b10;
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

.cf-nutrient-workbench-close {
  width: 36px;
  padding: 0;
  font-size: 24px;
  line-height: 1;
}

.cf-nutrient-workbench-tabs {
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
  margin: 10px 16px 0;
  padding: 9px 12px;
  border: 1px solid rgba(255, 120, 120, .24);
  border-radius: 8px;
  background: rgba(88, 18, 18, .26);
  color: #ffc9c9;
  font-size: 13px;
}

.cf-nutrient-workbench-layout {
  display: grid;
  grid-template-columns: minmax(250px, 300px) minmax(0, 1fr) minmax(250px, 320px);
  min-height: 0;
}

.cf-nutrient-card-rail,
.cf-nutrient-agent-panel,
.cf-nutrient-suggestion-rail {
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
  background: rgba(10, 13, 20, .68);
}

.cf-nutrient-pane-head {
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
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
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 12px;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.cf-nutrient-card-item:hover,
.cf-nutrient-card-item.is-selected {
  border-color: rgba(122, 158, 255, .48);
  background: rgba(73, 104, 214, .18);
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
  padding: 16px;
}

.cf-nutrient-card-preview {
  padding: 16px;
}

.cf-nutrient-card-preview header {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
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
  margin: 0 0 14px;
}

.cf-nutrient-feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0 0 14px;
}

.cf-nutrient-freshness,
.cf-nutrient-usage-summary,
.cf-nutrient-similar-hint {
  display: grid;
  gap: 5px;
  padding: 10px;
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
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, .11);
  border-radius: 7px;
  background: rgba(255, 255, 255, .05);
  color: #eef2ff;
  cursor: pointer;
}

.cf-nutrient-card-actions button:hover:not(:disabled),
.cf-nutrient-card-actions button.is-active {
  border-color: rgba(94, 215, 197, .36);
  background: rgba(94, 215, 197, .12);
  color: #c8fff4;
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
  gap: 12px;
}

.cf-nutrient-message,
.cf-nutrient-depositable-block {
  display: grid;
  gap: 10px;
  max-width: min(760px, 100%);
  padding: 13px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 8px;
  background: rgba(255, 255, 255, .04);
}

.cf-nutrient-message.is-user {
  justify-self: end;
  width: min(620px, 92%);
  border-color: rgba(122, 158, 255, .24);
  background: rgba(88, 122, 255, .11);
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

.cf-nutrient-depositable-block {
  border-color: rgba(94, 215, 197, .26);
  background: rgba(42, 166, 143, .08);
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
  padding: 0 10px;
  border: 1px solid rgba(94, 215, 197, .22);
  border-radius: 7px;
  background: rgba(94, 215, 197, .08);
  color: #d7fff8;
  cursor: pointer;
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

.cf-nutrient-agent-composer {
  display: grid;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(139, 156, 255, .12);
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
  padding: 0 9px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 7px;
  background: rgba(255, 255, 255, .04);
  color: rgba(238, 242, 255, .82);
  cursor: pointer;
  font-size: 12px;
}

.cf-nutrient-composer-row {
  align-items: center;
}

.cf-nutrient-agent-composer textarea {
  flex: 1;
  min-height: 54px;
  max-height: 120px;
  resize: vertical;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 8px;
  background: rgba(255, 255, 255, .045);
  color: #f5f7ff;
  padding: 10px 12px;
  outline: 0;
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
}

.cf-nutrient-suggestion-card p {
  margin: 0;
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
</style>
