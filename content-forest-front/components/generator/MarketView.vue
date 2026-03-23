<template>
  <div>
    <!-- Hero 区 -->
    <div class="flex items-end justify-between mb-8">
      <div>
        <div class="font-mono text-xs tracking-[0.3em] text-gene-blue/70 uppercase mb-2">// Generator Market</div>
        <h2 class="font-serif text-3xl text-slate-100 mb-2">生成器市场</h2>
        <p class="font-sans text-sm text-slate-500">把爆款生产方法论，装进一个文件</p>
      </div>
      <!-- 实时统计 -->
      <div v-if="!loading && generators.length > 0" class="text-right">
        <div class="font-mono text-xs text-mist-2 mb-1">
          <span class="text-gene-blue font-mono text-lg">{{ generators.length }}</span> 个生成器
        </div>
        <div class="font-mono text-xs text-mist-2">
          <span class="text-gene-blue">{{ totalInstalls }}</span> 次安装
        </div>
      </div>
    </div>

    <!-- 平台筛选 Tabs -->
    <PlatformFilterTabs
      v-model="activePlatform"
      :counts="platformCounts"
      class="mb-8"
    />

    <!-- 骨架屏 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="i in 6" :key="i" class="border border-gene-blue/10 bg-void-2/40 p-6 animate-pulse">
        <div class="flex justify-between mb-4">
          <div class="h-4 bg-gene-blue/10 w-16"></div>
          <div class="h-4 bg-mist-3/20 w-12"></div>
        </div>
        <div class="h-5 bg-mist-3/20 mb-3 w-4/5"></div>
        <div class="h-3 bg-mist-3/15 mb-2 w-full"></div>
        <div class="h-3 bg-mist-3/15 mb-5 w-3/4"></div>
        <div class="flex justify-between mb-4">
          <div class="h-3 bg-mist-3/20 w-20"></div>
          <div class="h-4 bg-bio-green/10 w-8"></div>
        </div>
        <div class="h-8 bg-gene-blue/10 w-full"></div>
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
    <div v-else-if="generators.length === 0" class="relative py-24 flex flex-col items-center justify-center gap-6 overflow-hidden">
      <!-- 背景装饰网格 -->
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div class="absolute inset-0" style="background-image: linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px); background-size: 40px 40px" />
        <div class="absolute inset-0" style="background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(14,165,233,0.06) 0%, transparent 70%)" />
      </div>

      <!-- 中心图标框 -->
      <div class="relative">
        <div class="w-20 h-20 border border-gene-blue/20 flex items-center justify-center relative">
          <div class="absolute inset-0 border border-gene-blue/10" style="transform: rotate(45deg) scale(0.7)" />
          <div class="font-mono text-3xl text-gene-blue/30 select-none">∅</div>
          <!-- 四角装饰 -->
          <span class="absolute top-0 left-0 w-2 h-2 border-t border-l border-gene-blue/60" />
          <span class="absolute top-0 right-0 w-2 h-2 border-t border-r border-gene-blue/60" />
          <span class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gene-blue/60" />
          <span class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gene-blue/60" />
        </div>
      </div>

      <!-- 文案 -->
      <div class="text-center">
        <div class="font-mono text-[10px] tracking-[0.4em] text-gene-blue/50 uppercase mb-3">// Market · Empty</div>
        <p class="font-serif text-2xl text-slate-300 mb-2">
          {{ activePlatform ? '该平台暂无生成器' : '市场里还没有生成器' }}
        </p>
        <p class="font-sans text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
          {{ activePlatform ? '换个平台看看，或者贡献一个' : '把你的内容方法论打包成 Skill，让更多人用上它' }}
        </p>
      </div>

      <!-- CTA -->
      <div class="flex items-center gap-3 mt-2">
        <button
          v-if="activePlatform"
          class="font-mono text-xs tracking-widest uppercase px-6 py-2 border border-mist-3/30 text-slate-400 hover:text-slate-200 hover:border-mist-3/60 transition-all duration-200"
          @click="activePlatform = ''"
        >查看全部平台</button>
        <NuxtLink
          to="/console"
          class="font-mono text-xs tracking-widest uppercase px-8 py-2.5 bg-gene-blue/15 border border-gene-blue/50 text-gene-blue hover:bg-gene-blue/25 hover:border-gene-blue transition-all duration-300"
        >+ 上传第一个生成器</NuxtLink>
      </div>

      <!-- 底部装饰线 -->
      <div class="flex items-center gap-3 mt-4">
        <div class="h-px w-16 bg-gradient-to-r from-transparent to-gene-blue/20" />
        <span class="font-mono text-[9px] text-mist-3 tracking-widest uppercase">No generators yet</span>
        <div class="h-px w-16 bg-gradient-to-l from-transparent to-gene-blue/20" />
      </div>
    </div>

    <!-- 卡片网格 stagger 入场 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <MarketCard
        v-for="(gen, i) in generators"
        :key="gen.id"
        :generator="gen"
        class="animate-fade-up"
        :style="{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }"
        @installed="onInstalled"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const { generators, loading, error, fetchMarket } = useGeneratorMarket()

const activePlatform = ref('')

const totalInstalls = computed(() =>
  generators.value.reduce((sum, g) => sum + (g.installCount ?? 0), 0)
)

const platformCounts = computed(() => {
  const counts: Record<string, number> = { '': generators.value.length }
  for (const g of generators.value) {
    counts[g.platform] = (counts[g.platform] ?? 0) + 1
  }
  return counts
})

watch(activePlatform, (platform) => {
  fetchMarket(platform || undefined)
})

function onInstalled(_id: string, _skillPath: string) {
  // installCount is optimistically updated inside MarketCard / composable
}

async function reload() {
  await fetchMarket(activePlatform.value || undefined)
}

onMounted(() => fetchMarket())
</script>
