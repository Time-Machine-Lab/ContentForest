<script setup lang="ts">
import { createNutrientApi, NUTRIENT_WORKBENCH_BACKEND_DEPENDENCIES, type NutrientCardDetail, type NutrientCardStatus, type NutrientCardSummary, type NutrientFetcher, type NutrientWorkbenchPane, type NutrientWorkbenchState } from '../../../src/modules/nutrient'
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
})
const cards = ref<NutrientCardSummary[]>([])
const selectedCard = ref<NutrientCardDetail | null>(null)
const cardsLoading = ref(false)
const detailLoading = ref(false)
const operationLoading = ref('')
const workbenchError = ref('')
const settleLibraryId = ref('')

const suggestionDependencies = computed(() => NUTRIENT_WORKBENCH_BACKEND_DEPENDENCIES.filter((item) => item.status === '依赖后端更新'))
const settledCardsCount = computed(() => cards.value.filter((card) => card.status === 'settled').length)
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
    activePane.value = 'agent'
  }
  catch (error) {
    workbenchError.value = errorMessage(error)
  }
  finally {
    detailLoading.value = false
  }
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
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
              <strong>Agent 工作区</strong>
              <span>{{ selectedCard ? statusLabel(selectedCard.status) : '未选择卡片' }}</span>
            </header>

            <section class="cf-nutrient-agent-thread">
              <div v-if="detailLoading" class="cf-nutrient-workbench-empty">读取卡片内容中</div>
              <article v-else-if="selectedCard" class="cf-nutrient-card-preview">
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
                <MarkdownViewer :markdown="selectedCard.markdown" />
              </article>
              <div v-else class="cf-nutrient-workbench-empty">
                <strong>选择一张营养卡片</strong>
                <span>卡片内容会在这里展开。</span>
              </div>
            </section>

            <footer class="cf-nutrient-agent-composer">
              <textarea v-model="localState.composingMessage" placeholder="和营养研究 Agent 继续交流" />
              <button type="button" disabled>发送</button>
            </footer>
          </main>

          <aside class="cf-nutrient-suggestion-rail" :class="{ 'is-active-pane': activePane === 'suggestions' }" aria-label="营养汲取建议">
            <header class="cf-nutrient-pane-head">
              <strong>汲取建议</strong>
              <span>{{ suggestionDependencies.length }}</span>
            </header>

            <div class="cf-nutrient-suggestion-list">
              <article v-for="dependency in suggestionDependencies" :key="dependency.name" class="cf-nutrient-suggestion-card">
                <span>依赖后端更新</span>
                <strong>{{ dependency.name }}</strong>
                <p>{{ dependency.note }}</p>
                <div>
                  <button type="button" disabled>采纳</button>
                  <button type="button" disabled>忽略</button>
                </div>
              </article>
              <div v-if="suggestionDependencies.length === 0" class="cf-nutrient-workbench-empty">
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

.cf-nutrient-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
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

.cf-nutrient-agent-composer {
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(139, 156, 255, .12);
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
}
</style>
