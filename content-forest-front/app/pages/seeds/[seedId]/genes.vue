<script setup lang="ts">
import ExceptionNotice from '../../../components/base/ExceptionNotice.vue'
import { createGeneApi, type GeneEvidenceSourceType, type GeneInsightDetail, type GeneInsightSummary, type GeneLibrary } from '../../../../src/modules/gene'
import { createSeedApi, type SeedDetail } from '../../../../src/modules/seed'

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const apiBase = String(runtimeConfig.public.apiBase || '')

function fetcher<T>(url: string, options?: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown }) {
  return $fetch<T>(url, {
    method: options?.method,
    body: options?.body as BodyInit | Record<string, unknown> | null | undefined,
  })
}

const geneApi = createGeneApi(fetcher, apiBase)
const seedApi = createSeedApi(fetcher, apiBase)

const seedId = computed(() => String(route.params.seedId || ''))
const seed = ref<SeedDetail | null>(null)
const library = ref<GeneLibrary | null>(null)
const insights = ref<GeneInsightSummary[]>([])
const selectedInsight = ref<GeneInsightDetail | null>(null)
const selectedInsightId = ref('')
const loading = ref(false)
const detailLoading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const detailError = ref('')
const query = ref('')

const activeInsights = computed(() => insights.value.filter((insight) => insight.status === 'active'))
const archivedInsights = computed(() => insights.value.filter((insight) => insight.status === 'archived'))
const filteredInsights = computed(() => {
  const search = query.value.trim().toLowerCase()
  const source = insights.value
  if (!search) return source
  return source.filter((insight) => {
    return [
      insight.title,
      insight.lineage,
      insight.niche,
      insight.status,
    ].join(' ').toLowerCase().includes(search)
  })
})
const lineageStats = computed(() => {
  const counts = new Map<string, number>()
  for (const insight of activeInsights.value) {
    const lineage = cleanSystemText(insight.lineage) || '未分配谱系'
    counts.set(lineage, (counts.get(lineage) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({
      name,
      count,
      ratio: Math.max(Math.round((count / Math.max(activeInsights.value.length, 1)) * 100), 12),
    }))
})

watch(seedId, () => {
  void loadGeneLibrary()
}, { immediate: true })

function errorMessage(errorValue: unknown) {
  if (typeof errorValue === 'object' && errorValue !== null && 'data' in errorValue) {
    const data = (errorValue as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  if (String(errorValue).includes('Failed to fetch')) return '无法连接后端服务，请确认后端已启动'
  if (errorValue instanceof Error) return errorValue.message
  return '操作失败，请稍后重试'
}

function formatDateTime(value?: string | null) {
  if (!value) return '未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function evidenceLabel(sourceType: GeneEvidenceSourceType) {
  const labels: Record<GeneEvidenceSourceType, string> = {
    fruit_selected: '果实选择',
    fruit_eliminated: '果实淘汰',
    publication: '发布验证',
    feedback: '数据反馈',
  }
  return labels[sourceType]
}

function cleanSystemText(value?: string | null) {
  return (value || '')
    .replace(/\b(?:seed|fruit|node|gene|task|suggestion|library)_[0-9a-zA-Z-]{8,}\b/g, '')
    .replace(/[A-Za-z]:\\[^\s，。；、)）]+/g, '')
    .replace(/\s*→\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s·,，;；、-]+|[\s·,，;；、-]+$/g, '')
}

function displayGeneContext(lineage?: string | null, niche?: string | null) {
  return `${cleanSystemText(lineage) || '未分配谱系'} · ${cleanSystemText(niche) || '未分配生态位'}`
}

function plainTextSummary(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 128)
}

async function loadGeneLibrary(preferredInsightId = selectedInsightId.value) {
  if (!seedId.value) return

  loading.value = true
  error.value = ''
  detailError.value = ''

  try {
    const [seedDetail, geneLibrary, geneInsights] = await Promise.all([
      seedApi.getSeed(seedId.value),
      loadOrPrepareLibrary(),
      geneApi.listInsights(seedId.value),
    ])
    seed.value = seedDetail
    library.value = geneLibrary
    insights.value = geneInsights

    const nextSelectedId = preferredInsightId && geneInsights.some((insight) => insight.id === preferredInsightId)
      ? preferredInsightId
      : geneInsights[0]?.id || ''
    selectedInsightId.value = nextSelectedId
    if (nextSelectedId) {
      await loadInsightDetail(nextSelectedId)
    } else {
      selectedInsight.value = null
    }
  } catch (errorValue) {
    error.value = errorMessage(errorValue)
  } finally {
    loading.value = false
  }
}

async function loadOrPrepareLibrary() {
  try {
    return await geneApi.getLibrary(seedId.value)
  } catch {
    return await geneApi.prepareLibrary(seedId.value)
  }
}

async function loadInsightDetail(insightId: string) {
  selectedInsightId.value = insightId
  detailLoading.value = true
  detailError.value = ''

  try {
    selectedInsight.value = await geneApi.getInsight(insightId)
  } catch (errorValue) {
    detailError.value = errorMessage(errorValue)
  } finally {
    detailLoading.value = false
  }
}

async function archiveSelectedInsight() {
  if (!selectedInsight.value || selectedInsight.value.status === 'archived') return

  actionLoading.value = true
  detailError.value = ''

  try {
    await geneApi.archiveInsight(selectedInsight.value.id)
    await loadGeneLibrary(selectedInsight.value.id)
  } catch (errorValue) {
    detailError.value = errorMessage(errorValue)
  } finally {
    actionLoading.value = false
  }
}

async function openWorkspace() {
  if (!seedId.value) return
  const rootNode = await seedApi.getSeedRootNode(seedId.value)
  const queryString = rootNode.workspaceReadOnly
    ? `?node=${encodeURIComponent(rootNode.nodeId)}&readonly=1`
    : `?node=${encodeURIComponent(rootNode.nodeId)}`
  await navigateTo(`/seeds/${encodeURIComponent(rootNode.seedId)}/workspace${queryString}`)
}
</script>

<template>
  <section class="cf-gene-library-page">
    <header class="cf-page-topbar cf-gene-library-topbar">
      <div class="cf-page-title">
        <p class="cf-page-kicker">Seed Gene Library</p>
        <h1>{{ seed?.title || '种子基因库' }}</h1>
        <p>{{ library ? '沉淀、浏览和归档当前种子的表达经验' : '正在读取当前种子的基因沉淀' }}</p>
      </div>
      <div class="cf-seed-top-actions">
        <NuxtLink class="cf-secondary-action" to="/seeds">返回种子库</NuxtLink>
        <button class="cf-primary-action" type="button" @click="openWorkspace">打开工作区</button>
      </div>
    </header>

    <ExceptionNotice
      v-if="error"
      title="基因库读取失败"
      :message="error"
      action-label="重试"
      @action="loadGeneLibrary()"
    />

    <div class="cf-gene-library-layout">
      <aside class="cf-gene-library-overview" aria-label="基因库概览">
        <section class="cf-gene-library-metrics">
          <article>
            <strong>{{ activeInsights.length }}</strong>
            <span>可引用经验</span>
          </article>
          <article>
            <strong>{{ archivedInsights.length }}</strong>
            <span>已归档</span>
          </article>
          <article>
            <strong>{{ lineageStats.length }}</strong>
            <span>活跃谱系</span>
          </article>
        </section>

        <section class="cf-gene-lineage-board" aria-label="基因谱系">
          <header class="cf-panel-headline">
            <strong>谱系分布</strong>
            <span>{{ activeInsights.length }} 条活跃经验</span>
          </header>
          <article v-for="lineage in lineageStats" :key="lineage.name" class="cf-gene-lineage-card">
            <h2>{{ lineage.name }}</h2>
            <p>{{ lineage.count }} 条经验沉淀</p>
            <div class="cf-gene-lineage-meter"><span :style="{ width: `${lineage.ratio}%` }" /></div>
          </article>
          <p v-if="lineageStats.length === 0" class="cf-empty-note">还没有形成稳定谱系。</p>
        </section>
      </aside>

      <section class="cf-gene-insight-browser" aria-label="基因经验列表">
        <header class="cf-panel-headline">
          <div>
            <strong>基因经验</strong>
            <span>{{ filteredInsights.length }} / {{ insights.length }}</span>
          </div>
          <label class="cf-seed-search cf-gene-search">
            <span aria-hidden="true">⌕</span>
            <input v-model="query" type="search" placeholder="搜索标题、谱系、生态位">
          </label>
        </header>

        <div v-if="loading" class="cf-grid-state">正在读取基因库</div>
        <div v-else-if="filteredInsights.length === 0" class="cf-grid-state">
          <strong>暂无基因经验</strong>
          <span>在工作区完成基因汲取后，确认沉淀的经验会进入这里。</span>
        </div>
        <div v-else class="cf-gene-insight-list">
          <button
            v-for="insight in filteredInsights"
            :key="insight.id"
            class="cf-gene-insight-card"
            :class="{ 'is-selected': selectedInsightId === insight.id, 'is-archived': insight.status === 'archived' }"
            type="button"
            @click="loadInsightDetail(insight.id)"
          >
            <span class="cf-gene-insight-head">
              <strong>{{ insight.title }}</strong>
              <span>{{ insight.status === 'archived' ? '已归档' : '可引用' }}</span>
            </span>
            <span class="cf-gene-insight-copy">
              {{ displayGeneContext(insight.lineage, insight.niche) }}
            </span>
            <span class="cf-gene-tag-row">
              <span>{{ insight.evidenceSources.length }} 证据</span>
              <span>{{ formatDateTime(insight.updatedAt) }}</span>
            </span>
          </button>
        </div>
      </section>

      <aside class="cf-gene-insight-detail" aria-label="基因经验详情">
        <div v-if="detailLoading" class="cf-detail-state">正在读取经验详情</div>
        <div v-else-if="!selectedInsight" class="cf-detail-state">选择一条基因经验查看详情</div>
        <template v-else>
          <header class="cf-gene-detail-head">
            <span class="cf-workspace-chip">{{ selectedInsight.status === 'archived' ? '已归档' : '可引用' }}</span>
            <h2>{{ selectedInsight.title }}</h2>
            <p>{{ displayGeneContext(selectedInsight.lineage, selectedInsight.niche) }}</p>
          </header>

          <ExceptionNotice
            v-if="detailError"
            title="基因经验操作失败"
            :message="detailError"
          />

          <section class="cf-gene-detail-doc">
            <MarkdownViewer :markdown="selectedInsight.bodyMarkdown || plainTextSummary(selectedInsight.title)" heading-id-prefix="gene-insight" />
          </section>

          <section class="cf-gene-evidence-list">
            <header class="cf-panel-headline">
              <strong>证据来源</strong>
              <span>{{ selectedInsight.evidenceSources.length }} 条</span>
            </header>
            <article v-for="(source, index) in selectedInsight.evidenceSources" :key="`${source.sourceType}-${source.sourceId}`" class="cf-gene-evidence">
              <span>{{ evidenceLabel(source.sourceType) }}</span>
              <strong>证据 {{ index + 1 }}</strong>
              <em>{{ source.strength }}</em>
            </article>
          </section>

          <footer class="cf-gene-detail-actions">
            <button
              class="cf-secondary-action"
              type="button"
              :disabled="actionLoading || selectedInsight.status === 'archived'"
              @click="archiveSelectedInsight"
            >
              归档经验
            </button>
          </footer>
        </template>
      </aside>
    </div>
  </section>
</template>
