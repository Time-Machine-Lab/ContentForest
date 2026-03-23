<template>
  <div>
    <!-- Hero 区 -->
    <div class="flex items-end justify-between mb-8">
      <div>
        <div class="font-mono text-xs tracking-[0.3em] text-gene-blue/70 uppercase mb-2">// Generator Hub</div>
        <h2 class="font-serif text-3xl text-slate-100">我的生成器</h2>
      </div>
      <div v-if="!loading && !error" class="flex items-center gap-4 font-mono text-xs">
        <span><span class="text-gene-blue">{{ generators.length }}</span> <span class="text-mist-2">已安装</span></span>
        <span class="text-mist-3">·</span>
        <span><span class="text-mutation">{{ selfCount }}</span> <span class="text-mist-2">自建</span></span>
      </div>
    </div>

    <!-- 筛选 Tabs -->
    <div class="flex items-center border-b border-gene-blue/10 mb-8">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="relative h-9 px-4 font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-300"
        :class="activeTab === tab.value ? 'text-gene-blue' : 'text-slate-400 hover:text-slate-200'"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="ml-1 text-[9px] opacity-60">({{ tab.count }})</span>
        <span v-if="activeTab === tab.value" class="absolute bottom-0 left-0 right-0 h-[2px] bg-gene-blue -mb-px" />
      </button>
    </div>

    <!-- 骨架屏 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="i in 3" :key="i" class="border border-gene-blue/10 bg-void-2/40 p-6 animate-pulse">
        <div class="h-3 bg-mist-3/30 mb-3 w-2/4"></div>
        <div class="h-5 bg-mist-3/20 mb-3 w-5/6"></div>
        <div class="h-3 bg-mist-3/20 mb-2 w-full"></div>
        <div class="h-3 bg-mist-3/20 mb-5 w-4/6"></div>
        <div class="flex gap-2"><div class="h-5 w-16 bg-gene-blue/10"></div><div class="h-5 w-12 bg-mist-3/20"></div></div>
      </div>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="font-mono text-xs tracking-[0.3em] text-death-red uppercase">// Error</div>
      <p class="font-serif text-xl text-slate-300">加载失败</p>
      <p class="font-sans text-sm text-slate-500">{{ error }}</p>
      <button
        class="font-mono text-xs tracking-widest uppercase px-6 py-2 border border-gene-blue/40 text-gene-blue hover:border-gene-blue transition-colors duration-300"
        @click="reload"
      >重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredGenerators.length === 0" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase">// Empty</div>
      <p class="font-serif text-2xl text-slate-300">还没有生成器</p>
      <p class="font-sans text-sm text-slate-500">安装现成的，或者上传自己的 Skill 包</p>
      <div class="flex items-center gap-3 mt-2">
        <NuxtLink
          to="/generators"
          class="font-mono text-xs tracking-widest uppercase px-6 py-2 border border-gene-blue/40 text-gene-blue hover:border-gene-blue hover:bg-gene-blue/10 transition-all duration-300"
        >去生成器市场</NuxtLink>
        <button
          class="font-mono text-xs tracking-widest uppercase px-6 py-2 bg-gene-blue/20 border border-gene-blue/60 text-gene-blue hover:bg-gene-blue/30 transition-all duration-300"
          @click="emit('open-upload')"
        >上传生成器</button>
      </div>
    </div>

    <!-- 卡片网格 stagger 入场 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <GeneratorCard
        v-for="(gen, i) in filteredGenerators"
        :key="gen.id"
        :generator="gen"
        class="animate-fade-up"
        :style="{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }"
        @view-detail="emit('view-detail', $event)"
        @uninstall="handleUninstall"
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
import type { Generator } from '~/composables/useMyGenerators'

const emit = defineEmits<{
  'view-detail': [generator: Generator]
  'open-upload': []
}>()

const { generators, loading, error, fetchMine, uninstall } = useMyGenerators()
const { showToast } = useToast()

const activeTab = ref<'all' | 'self' | 'installed'>('all')

const selfCount = computed(() => generators.value.filter(g => g.source === 'self').length)
const installedCount = computed(() => generators.value.filter(g => g.source === 'installed').length)

const tabs = computed(() => [
  { label: '全部', value: 'all' as const, count: generators.value.length },
  { label: '自建', value: 'self' as const, count: selfCount.value },
  { label: '已安装', value: 'installed' as const, count: installedCount.value },
])

const filteredGenerators = computed(() => {
  if (activeTab.value === 'self') return generators.value.filter(g => g.source === 'self')
  if (activeTab.value === 'installed') return generators.value.filter(g => g.source === 'installed')
  return generators.value
})

const confirmState = reactive({ visible: false, message: '', onConfirm: () => {} })

function handleUninstall(gen: Generator) {
  confirmState.message = `确认卸载「${gen.name}」？本地 Skill 文件将被删除。`
  confirmState.onConfirm = async () => {
    confirmState.visible = false
    try {
      await uninstall(gen.id)
      showToast('生成器已卸载')
    } catch {
      showToast('卸载失败，请重试')
    }
  }
  confirmState.visible = true
}

async function reload() {
  await fetchMine()
}

onMounted(() => fetchMine())
defineExpose({ reload })
</script>
