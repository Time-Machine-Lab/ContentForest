<template>
  <div>
    <!-- Hero 区 -->
    <div class="flex items-end justify-between mb-8">
      <div>
        <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase mb-2">// Seed Repository</div>
        <h2 class="font-serif text-3xl text-slate-100">种子库</h2>
      </div>
      <!-- 实时统计 -->
      <div v-if="!loading && !error" class="flex items-center gap-4 font-mono text-xs">
        <span><span class="text-bio-green">{{ statusCounts.active }}</span> <span class="text-mist-2">活跃</span></span>
        <span class="text-mist-3">·</span>
        <span><span class="text-mutation">{{ statusCounts.draft }}</span> <span class="text-mist-2">草稿</span></span>
        <span class="text-mist-3">·</span>
        <span><span class="text-mist-3">{{ statusCounts.archived }}</span> <span class="text-mist-2">归档</span></span>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <!-- 状态 Tabs -->
      <div class="flex items-center border-b border-bio-green/10">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          class="relative h-9 px-4 font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-300"
          :class="activeStatus === tab.value ? 'text-bio-green' : 'text-slate-400 hover:text-slate-200'"
          @click="switchStatus(tab.value)"
        >
          {{ tab.label }}
          <span v-if="tab.count !== undefined" class="ml-1 text-[9px] opacity-60">({{ tab.count }})</span>
          <span v-if="activeStatus === tab.value" class="absolute bottom-0 left-0 right-0 h-[2px] bg-bio-green -mb-px" />
        </button>
      </div>
      <!-- 搜索框 -->
      <div class="relative">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索标题或标签..."
          class="w-full md:w-56 font-mono text-xs bg-void border border-bio-green/20 focus:border-bio-green/60 focus:outline-none px-3 py-2 text-slate-300 placeholder:text-mist-3 transition-colors duration-300"
        />
        <button v-if="searchKeyword" class="absolute right-2 top-1/2 -translate-y-1/2 text-mist-2 hover:text-slate-300 transition-colors" @click="searchKeyword = ''">✕</button>
      </div>
    </div>

    <!-- 骨架屏 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="i in 3" :key="i" class="border border-bio-green/10 bg-void-2/40 p-6 animate-pulse">
        <div class="h-3 bg-mist-3/30 mb-3 w-3/4"></div>
        <div class="h-4 bg-mist-3/20 mb-3 w-full"></div>
        <div class="h-3 bg-mist-3/20 mb-2 w-5/6"></div>
        <div class="h-3 bg-mist-3/20 w-4/6"></div>
        <div class="mt-6 flex gap-2"><div class="h-5 w-14 bg-mist-3/20"></div><div class="h-5 w-14 bg-mist-3/20"></div></div>
      </div>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="font-mono text-xs tracking-[0.3em] text-death-red uppercase">// Error</div>
      <p class="font-serif text-xl text-slate-300">加载失败</p>
      <p class="font-sans text-sm text-slate-500">{{ error }}</p>
      <button class="font-mono text-xs tracking-widest uppercase px-6 py-2 border border-bio-green/40 text-bio-green hover:border-bio-green transition-colors duration-300" @click="reload">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredSeeds.length === 0" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase">// Empty</div>
      <p class="font-serif text-2xl text-slate-300">{{ emptyTitle }}</p>
      <p class="font-sans text-sm text-slate-500">{{ emptyDesc }}</p>
      <button
        v-if="activeStatus === 'active' && !searchKeyword"
        class="mt-2 font-mono text-xs tracking-widest uppercase px-8 py-3 bg-bio-green text-void hover:bg-bio-green/80 transition-all duration-300"
        @click="emit('edit-seed', null)"
      >+ 播下第一颗种子</button>
    </div>

    <!-- 卡片网格（stagger 入场） -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <SeedCard
        v-for="(seed, i) in filteredSeeds"
        :key="seed.id"
        :seed="seed"
        class="animate-fade-up"
        :style="{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }"
        @edit="emit('edit-seed', $event)"
        @publish="handlePublish"
        @archive="handleArchive"
        @restore="handleRestore"
        @delete="handleDelete"
      />
    </div>

    <ConfirmDialog
      v-if="confirmState.visible"
      :message="confirmState.message"
      @confirm="confirmState.onConfirm"
      @cancel="confirmState.visible = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { Seed, SeedStatus } from '~/composables/useSeedRepository'

const emit = defineEmits<{ 'edit-seed': [seed: Seed | null] }>()

const { seeds, loading, error, fetchSeeds, publishSeed, archiveSeed, restoreSeed, deleteSeed } = useSeedRepository()
const { showToast } = useToast()

// 各状态计数缓存
const statusCounts = reactive({ active: 0, draft: 0, archived: 0 })

async function loadCounts() {
  const [a, d, r] = await Promise.all([
    $fetch<{ code: number; data: { total: number } }>('/api/seeds?status=active&size=1'),
    $fetch<{ code: number; data: { total: number } }>('/api/seeds?status=draft&size=1'),
    $fetch<{ code: number; data: { total: number } }>('/api/seeds?status=archived&size=1'),
  ]).catch(() => [null, null, null])
  if (a) statusCounts.active = a.data?.total ?? 0
  if (d) statusCounts.draft = d.data?.total ?? 0
  if (r) statusCounts.archived = r.data?.total ?? 0
}

const activeStatus = ref<string>('active')
const searchKeyword = ref('')

const statusTabs = computed(() => [
  { label: '活跃', value: 'active', count: statusCounts.active },
  { label: '草稿', value: 'draft', count: statusCounts.draft },
  { label: '归档', value: 'archived', count: statusCounts.archived },
  { label: '全部', value: '' },
])

const filteredSeeds = computed(() => {
  if (!searchKeyword.value) return seeds.value
  const kw = searchKeyword.value.toLowerCase()
  return seeds.value.filter(s =>
    s.title.toLowerCase().includes(kw) || s.tags?.some(t => t.toLowerCase().includes(kw))
  )
})

const emptyTitle = computed(() => {
  if (searchKeyword.value) return `没有匹配「${searchKeyword.value}」的种子`
  return ({ active: '还没有活跃的种子', draft: '没有草稿', archived: '没有归档的种子', '': '还没有任何种子' }[activeStatus.value] ?? '暂无内容')
})

const emptyDesc = computed(() => {
  if (searchKeyword.value) return '换个关键词试试'
  if (activeStatus.value === 'active') return '从一颗种子开始，让内容自然生长'
  return ''
})

async function switchStatus(status: string) {
  activeStatus.value = status
  await fetchSeeds(status ? { status: status as SeedStatus } : undefined)
}

async function reload() {
  await Promise.all([
    fetchSeeds(activeStatus.value ? { status: activeStatus.value as SeedStatus } : undefined),
    loadCounts(),
  ])
}

const confirmState = reactive({ visible: false, message: '', onConfirm: () => {} })

function showConfirm(message: string, onConfirm: () => void) {
  confirmState.message = message
  confirmState.onConfirm = async () => { confirmState.visible = false; await onConfirm() }
  confirmState.visible = true
}

async function handlePublish(seed: Seed) {
  try { await publishSeed({ id: seed.id, title: seed.title, content: '', tags: seed.tags }); showToast('种子已发布'); await reload() }
  catch { showToast('发布失败，请重试') }
}
async function handleArchive(seed: Seed) {
  try { await archiveSeed(seed.id); showToast('种子已归档'); await reload() }
  catch { showToast('归档失败，请重试') }
}
async function handleRestore(seed: Seed) {
  try { await restoreSeed(seed.id); showToast('种子已回档'); await reload() }
  catch { showToast('回档失败，请重试') }
}
function handleDelete(seed: Seed) {
  showConfirm(`确认删除「${seed.title}」？此操作不可撤销。`, async () => {
    try { await deleteSeed(seed.id); showToast('种子已删除'); await reload() }
    catch { showToast('删除失败，请重试') }
  })
}

onMounted(() => {
  fetchSeeds({ status: 'active' })
  loadCounts()
})

defineExpose({ reload })
</script>
