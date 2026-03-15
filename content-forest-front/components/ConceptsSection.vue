<template>
  <section id="concepts" class="py-32 px-6 md:px-12 relative overflow-hidden">
    <div class="absolute inset-0 hex-pattern opacity-50"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-void via-void-3/30 to-void"></div>

    <div class="relative z-10 max-w-6xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-20">
        <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase mb-4">// Domain Language</div>
        <h2 class="font-serif text-4xl md:text-6xl text-slate-100 mb-4">
          核心概念体系
        </h2>
        <p class="font-mono text-sm text-mist-2 tracking-wide">The Living Vocabulary of Content Evolution</p>
      </div>

      <!-- Concept cards grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="concept in concepts"
          :key="concept.id"
          class="group relative border bg-void-2/60 backdrop-blur p-6 hover:border-opacity-80 transition-all duration-500 cursor-default"
          :class="concept.borderClass"
        >
          <!-- Top tag -->
          <div class="flex items-center justify-between mb-5">
            <span class="font-mono text-xs tracking-widest uppercase px-2 py-1 border"
                  :class="concept.tagClass">{{ concept.tag }}</span>
            <span class="font-mono text-2xl font-light" :class="concept.accentClass">{{ concept.glyph }}</span>
          </div>

          <!-- Name -->
          <div class="mb-1">
            <span class="font-serif text-xl text-slate-100">{{ concept.zh }}</span>
            <span class="font-mono text-xs text-mist-2 ml-2">{{ concept.en }}</span>
          </div>

          <!-- Desc -->
          <p class="text-slate-400 text-sm leading-relaxed mt-3">{{ concept.desc }}</p>

          <!-- Code snippet -->
          <div class="mt-4 font-mono text-xs text-mist-2 bg-void/60 px-3 py-2 border-l-2"
               :class="concept.borderLeftClass">
            {{ concept.snippet }}
          </div>

          <!-- Hover glow -->
          <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
               :style="concept.glowStyle"></div>
        </div>
      </div>

      <!-- Iteration tree visualization -->
      <div class="mt-20 border border-mist-3/30 bg-void-2/40 p-8 md:p-12">
        <div class="flex items-center gap-3 mb-8">
          <div class="font-mono text-xs tracking-widest text-bio-green uppercase">// Iteration Tree · 迭代树</div>
          <div class="flex-1 h-px bg-gradient-to-r from-bio-green/30 to-transparent"></div>
        </div>
        <div class="font-mono text-xs leading-7 text-slate-400 overflow-x-auto">
          <div class="whitespace-pre" v-html="treeText"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const concepts = [
  {
    id: 'seed',
    zh: '种子', en: 'Seed',
    tag: 'Origin',
    glyph: '⬡',
    desc: '创意的起点。存储你的核心意图、品牌价值观与目标受众画像。系统中唯一需要人类深度参与的节点。',
    snippet: 'seed = { intent, audience, platform, tone }',
    borderClass: 'border-bio-green/20 hover:border-bio-green/60',
    tagClass: 'border-bio-green/40 text-bio-green',
    accentClass: 'text-bio-green',
    borderLeftClass: 'border-bio-green/50',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(0,255,159,0.05) 0%, transparent 70%)',
  },
  {
    id: 'nutrient',
    zh: '营养库', en: 'Nutrient Repository',
    tag: 'Knowledge',
    glyph: '◈',
    desc: '三层知识体系：平台营养库（平台规则）+ 领域营养库（垂直知识）+ 种子营养库（历史经验）。让每次生成都站在巨人肩上。',
    snippet: 'nutrients = [platform, domain, seed_history]',
    borderClass: 'border-gene-blue/20 hover:border-gene-blue/60',
    tagClass: 'border-gene-blue/40 text-gene-blue',
    accentClass: 'text-gene-blue',
    borderLeftClass: 'border-gene-blue/50',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(14,165,233,0.05) 0%, transparent 70%)',
  },
  {
    id: 'fruit',
    zh: '果实', en: 'Fruit',
    tag: 'Output',
    glyph: '◉',
    desc: '生成后的可发布内容。包含标题、正文、标签、资源。生命周期：生成 → Pick Up → 投放 → 发布/淘汰。未淘汰的果实永远保留在果实池。',
    snippet: 'fruit.status: generated | picked | published',
    borderClass: 'border-mutation/20 hover:border-mutation/60',
    tagClass: 'border-mutation/40 text-mutation',
    accentClass: 'text-mutation',
    borderLeftClass: 'border-mutation/50',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(245,158,11,0.05) 0%, transparent 70%)',
  },
  {
    id: 'mutation',
    zh: '基因突变', en: 'Mutation',
    tag: 'Exploration',
    glyph: '⟳',
    desc: '引入随机性，防止系统陷入局部最优。三种策略：风格突变（情绪切换）、要素重组（爆款杂交）、反常识探索（反直觉标题）。',
    snippet: 'mutation_rate: 0.10  // 10% randomness',
    borderClass: 'border-death-red/20 hover:border-death-red/60',
    tagClass: 'border-death-red/40 text-death-red',
    accentClass: 'text-death-red',
    borderLeftClass: 'border-death-red/50',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(239,68,68,0.05) 0%, transparent 70%)',
  },
  {
    id: 'pickup',
    zh: 'Pick Up', en: 'Human Selection',
    tag: 'Human-in-Loop',
    glyph: '▲',
    desc: '在"生成"和"投放"之间插入人类判断力。被选中的果实特征会自动反哺种子营养库，让系统越来越懂你的审美。',
    snippet: 'fruit.pickup() → nutrient_bank.learn()',
    borderClass: 'border-bio-green/20 hover:border-bio-green/60',
    tagClass: 'border-bio-green/40 text-bio-green',
    accentClass: 'text-bio-green',
    borderLeftClass: 'border-bio-green/50',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(0,255,159,0.05) 0%, transparent 70%)',
  },
  {
    id: 'extraction',
    zh: '营养汲取', en: 'Nutrient Extraction',
    tag: 'Learning',
    glyph: '↺',
    desc: '从高转化果实中提取成功基因，从低转化果实中记录失败教训。这是系统的自我学习机制——每次循环都比上次聪明。',
    snippet: 'extract(high_fruit) → gene_bank.evolve()',
    borderClass: 'border-gene-blue/20 hover:border-gene-blue/60',
    tagClass: 'border-gene-blue/40 text-gene-blue',
    accentClass: 'text-gene-blue',
    borderLeftClass: 'border-gene-blue/50',
    glowStyle: 'background: radial-gradient(circle at 50% 0%, rgba(14,165,233,0.05) 0%, transparent 70%)',
  },
]

const treeText = `<span class="text-mutation">Seed</span>: <span class="text-slate-300">AI工具推广</span>
├── <span class="text-bio-green">Fruit_A</span> <span class="text-mist-2">(小红书图文, ★ likes:1247)</span>
│   ├── <span class="text-bio-green">Fruit_A1</span> <span class="text-mist-2">(优化标题 → likes:2100)</span>
│   ├── <span class="text-gene-blue">Fruit_A2</span> <span class="text-mist-2">(抖音短视频 → views:85,000)</span>
│   │   └── <span class="text-gene-blue">Fruit_A2a</span> <span class="text-mist-2">(二创版 → views:210,000 🔥)</span>
│   └── <span class="text-mutation">Fruit_A3</span> <span class="text-mist-2">[mutation:anti-logic] (反常识标题 → ctr:12.4%)</span>
├── <span class="text-slate-500">Fruit_B</span> <span class="text-mist-2">(推特长推文, ✗ rejected)</span>
└── <span class="text-bio-green">Fruit_C</span> <span class="text-mist-2">(知乎长文, ★ favorites:580)</span>
    └── <span class="text-bio-green">Fruit_C1</span> <span class="text-mist-2">(精华版 → 待发布)</span>`
</script>
