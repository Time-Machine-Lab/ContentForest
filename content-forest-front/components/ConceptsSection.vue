<template>
  <section id="concepts" class="py-32 px-6 md:px-12 relative overflow-hidden">
    <div class="absolute inset-0 hex-pattern opacity-50"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-void via-void-3/30 to-void"></div>
    <div class="relative z-10 max-w-6xl mx-auto">
      <div class="text-center mb-20">
        <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase mb-4">// Domain Language</div>
        <h2 class="font-serif text-4xl md:text-6xl text-slate-100 mb-4">核心概念体系</h2>
        <p class="font-mono text-sm text-mist-2 tracking-wide">The Living Vocabulary of Content Evolution</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="concept in concepts" :key="concept.id"
             class="group relative border bg-void-2/60 backdrop-blur p-6 hover:border-opacity-80 transition-all duration-500 cursor-default"
             :class="concept.borderClass"
             :data-concept-id="concept.id"
             :ref="el => { if (el) cardRefs[concept.id] = el as HTMLElement }">
          <div class="flex items-center justify-between mb-5">
            <span class="font-mono text-xs tracking-widest uppercase px-2 py-1 border" :class="concept.tagClass">{{ concept.tag }}</span>
            <span class="font-mono text-2xl font-light" :class="concept.accentClass">{{ concept.glyph }}</span>
          </div>
          <div class="mb-1">
            <span class="font-serif text-xl text-slate-100">{{ concept.zh }}</span>
            <span class="font-mono text-xs text-mist-2 ml-2">{{ concept.en }}</span>
          </div>
          <p class="text-slate-400 text-sm leading-relaxed mt-3">{{ concept.desc }}</p>

          <!-- seed: 属性标签组 -->
          <div v-if="concept.id === 'seed'" class="mt-4 bg-void/60 px-3 py-2.5 border-l-2 border-bio-green/50">
            <div class="flex flex-wrap gap-1.5">
              <span v-for="tag in ['意图','受众','平台','语气']" :key="tag"
                    class="font-mono text-xs px-2 py-0.5 border border-bio-green/30 text-bio-green/80 bg-bio-green/5">{{ tag }}</span>
            </div>
            <p class="font-mono text-xs text-mist-2/60 mt-2">播种前唯一需要人类深度思考的时刻</p>
          </div>

          <!-- nutrient: 三层进度条 -->
          <div v-else-if="concept.id === 'nutrient'" class="mt-4 bg-void/60 px-3 py-3 border-l-2 border-gene-blue/50 space-y-2">
            <div v-for="(bar, bi) in nutrientBars" :key="bar.key" class="flex items-center gap-2">
              <span class="font-mono text-xs text-mist-2 w-14 shrink-0">{{ bar.label }}</span>
              <div class="flex-1 h-1.5 bg-void-3 rounded-full overflow-hidden">
                <div class="h-full rounded-full"
                     :style="{ width: firedCards.nutrient ? bar.pct+'%' : '0%', background: bar.color, transition: `width 800ms cubic-bezier(0.4,0,0.2,1) ${bi*120}ms` }"></div>
              </div>
              <span class="font-mono text-xs shrink-0" :style="{color:bar.color}">{{ bar.desc }}</span>
            </div>
          </div>

          <!-- fruit: 生命周期状态流 -->
          <div v-else-if="concept.id === 'fruit'" class="mt-4 bg-void/60 px-3 py-2.5 border-l-2 border-mutation/50">
            <div class="flex items-center gap-1 font-mono text-xs flex-wrap">
              <span class="text-mist-2/50">生成</span><span class="text-mist-2/30">→</span>
              <span class="text-mutation">Pick Up</span><span class="text-mist-2/30">→</span>
              <span class="text-bio-green">发布</span><span class="text-mist-2/30 mx-1">/</span>
              <span class="text-slate-500 line-through text-xs">淘汰</span>
            </div>
            <p class="font-mono text-xs text-mist-2/60 mt-1.5">未淘汰的果实永远留在果实池</p>
          </div>

          <!-- mutation: 点阵频率 -->
          <div v-else-if="concept.id === 'mutation'" class="mt-4 bg-void/60 px-3 py-2.5 border-l-2 border-death-red/50">
            <div class="flex items-center gap-1.5 mb-1.5">
              <span v-for="i in 10" :key="i" class="w-2.5 h-2.5 rounded-full"
                    :class="i<=2 ? 'bg-death-red shadow-[0_0_4px_rgba(239,68,68,0.8)]' : 'bg-void-3 border border-death-red/20'"></span>
              <span class="font-mono text-xs text-mist-2 ml-1">1 / 10</span>
            </div>
            <p class="font-mono text-xs text-mist-2/70">防止系统陷入「聪明的局部最优」</p>
          </div>

          <!-- pickup: 品味进化条 -->
          <div v-else-if="concept.id === 'pickup'" class="mt-4 bg-void/60 px-3 py-3 border-l-2 border-bio-green/50 space-y-2">
            <div v-for="(taste, ti) in tasteBars" :key="taste.key" class="flex items-center gap-2">
              <span class="font-mono text-xs text-mist-2 w-12 shrink-0">{{ taste.label }}</span>
              <div class="flex-1 h-1.5 bg-void-3 rounded-full overflow-hidden">
                <div class="h-full rounded-full"
                     :style="{ width: firedCards.pickup ? taste.pct+'%' : '0%', background: '#00ff9f', transition: `width 700ms cubic-bezier(0.4,0,0.2,1) ${ti*100}ms` }"></div>
              </div>
              <span class="font-mono text-xs text-bio-green/70 shrink-0">{{ taste.trend }}</span>
            </div>
            <p class="font-mono text-xs text-mist-2/60 mt-1">每次选择都在校准系统的审美</p>
          </div>

          <!-- extraction: 收益柱状图 -->
          <div v-else-if="concept.id === 'extraction'" class="mt-4 bg-void/60 px-3 py-2.5 border-l-2 border-gene-blue/50">
            <div class="flex items-center justify-between font-mono text-xs mb-1.5 text-mist-2/60">
              <span>第1轮</span><span class="text-gene-blue">第10轮 ↑</span>
            </div>
            <div class="flex items-end gap-0.5 h-7">
              <div v-for="(h, hi) in extractionBars" :key="hi" class="flex-1 rounded-sm"
                   :style="{ height: firedCards.extraction ? h+'%' : '0%', background: hi>=7 ? '#0ea5e9' : hi>=4 ? 'rgba(14,165,233,0.4)' : 'rgba(14,165,233,0.15)', transition: `height 600ms cubic-bezier(0.4,0,0.2,1) ${hi*50}ms` }"></div>
            </div>
            <p class="font-mono text-xs text-mist-2/60 mt-1.5">每个循环都比上次聪明</p>
          </div>

          <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" :style="concept.glowStyle"></div>
        </div>
      </div>

      <div class="mt-20 border border-mist-3/30 bg-void-2/40 p-8 md:p-12 overflow-x-auto">
        <div class="flex items-center gap-3 mb-8">
          <div class="font-mono text-xs tracking-widest text-bio-green uppercase">// Iteration Tree · 迭代树</div>
          <div class="flex-1 h-px bg-gradient-to-r from-bio-green/30 to-transparent"></div>
          <div class="font-mono text-xs text-mist-2">Hover nodes to explore</div>
        </div>
        <IterationTree />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const cardRefs = reactive<Record<string, HTMLElement>>({})
const firedCards = reactive<Record<string, boolean>>({ nutrient: false, pickup: false, extraction: false })

const nutrientBars = [
  { key: 'platform', label: '平台规则', pct: 100, color: '#00ff9f', desc: '实时规则' },
  { key: 'domain',   label: '垂直知识', pct: 75,  color: '#0ea5e9', desc: '领域积累' },
  { key: 'history',  label: '历史经验', pct: 55,  color: '#f59e0b', desc: '越用越准' },
]

const tasteBars = [
  { key: 'story', label: '故事感', pct: 82, trend: 'UP 强化' },
  { key: 'data',  label: '干货感', pct: 45, trend: '-- 持平' },
  { key: 'shock', label: '震惊体', pct: 18, trend: 'DN 减弱' },
]

const extractionBars = [15, 22, 30, 40, 52, 61, 70, 80, 90, 100]

onMounted(() => {
  const animated = ['nutrient', 'pickup', 'extraction']
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const id = (entry.target as HTMLElement).dataset.conceptId
      if (id && animated.includes(id) && entry.isIntersecting && !firedCards[id]) {
        firedCards[id] = true
      }
    })
  }, { threshold: 0.4 })
  nextTick(() => {
    animated.forEach(id => {
      const el = cardRefs[id]
      if (el) obs.observe(el)
    })
  })
})

const concepts = [
  {
    id: 'seed', zh: '种子', en: 'Seed', tag: 'Origin', glyph: '⬡',
    desc: '创意的起点。存储你的核心意图、品牌价值观与目标受众画像。系统中唯一需要人类深度参与的节点。',
    borderClass: 'border-bio-green/20 hover:border-bio-green/60',
    tagClass: 'border-bio-green/40 text-bio-green',
    accentClass: 'text-bio-green',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(0,255,159,0.05) 0%, transparent 70%)',
  },
  {
    id: 'nutrient', zh: '营养库', en: 'Nutrient Repository', tag: 'Knowledge', glyph: '◈',
    desc: '三层知识体系：平台营养库（平台规则）+ 领域营养库（垂直知识）+ 种子营养库（历史经验）。让每次生成都站在巨人肩上。',
    borderClass: 'border-gene-blue/20 hover:border-gene-blue/60',
    tagClass: 'border-gene-blue/40 text-gene-blue',
    accentClass: 'text-gene-blue',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(14,165,233,0.05) 0%, transparent 70%)',
  },
  {
    id: 'fruit', zh: '果实', en: 'Fruit', tag: 'Output', glyph: '◉',
    desc: '生成后的可发布内容。包含标题、正文、标签、资源。生命周期：生成→Pick Up→投放→发布/淘汰。未淘汰的果实永远保留在果实池。',
    borderClass: 'border-mutation/20 hover:border-mutation/60',
    tagClass: 'border-mutation/40 text-mutation',
    accentClass: 'text-mutation',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(245,158,11,0.05) 0%, transparent 70%)',
  },
  {
    id: 'mutation', zh: '基因突变', en: 'Mutation', tag: 'Exploration', glyph: '⟳',
    desc: '引入随机性，防止系统陷入局部最优。三种策略：风格突变（情绪切换）、要素重组（爆款杂交）、反常识探索（反直觉标题）。',
    borderClass: 'border-death-red/20 hover:border-death-red/60',
    tagClass: 'border-death-red/40 text-death-red',
    accentClass: 'text-death-red',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(239,68,68,0.05) 0%, transparent 70%)',
  },
  {
    id: 'pickup', zh: 'Pick Up', en: 'Human Selection', tag: 'Human-in-Loop', glyph: '▲',
    desc: '在「生成」和「投放」之间插入人类判断力。被选中的果实特征会自动反哺种子营养库，让系统越来越懂你的审美。',
    borderClass: 'border-bio-green/20 hover:border-bio-green/60',
    tagClass: 'border-bio-green/40 text-bio-green',
    accentClass: 'text-bio-green',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(0,255,159,0.05) 0%, transparent 70%)',
  },
  {
    id: 'extraction', zh: '营养汲取', en: 'Nutrient Extraction', tag: 'Learning', glyph: '↺',
    desc: '从高转化果实中提取成功基因，从低转化果实中记录失败教训。这是系统的自我学习机制——每次循环都比上次聪明。',
    borderClass: 'border-gene-blue/20 hover:border-gene-blue/60',
    tagClass: 'border-gene-blue/40 text-gene-blue',
    accentClass: 'text-gene-blue',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(14,165,233,0.05) 0%, transparent 70%)',
  },
]
</script>
