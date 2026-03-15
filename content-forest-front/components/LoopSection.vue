<template>
  <section id="loop" class="py-32 px-6 md:px-12 relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-b from-void via-void-2 to-void"></div>

    <div class="relative z-10 max-w-6xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-20 section-reveal" ref="headerRef">
        <div class="font-mono text-xs tracking-[0.3em] text-gene-blue uppercase mb-4">// Core Algorithm</div>
        <h2 class="font-serif text-4xl md:text-6xl text-slate-100 mb-4">
          五步进化循环
        </h2>
        <p class="font-mono text-sm text-mist-2 tracking-wide">The 5-Phase Evolution Loop</p>
      </div>

      <!-- Loop diagram - desktop horizontal, mobile vertical -->
      <div class="hidden lg:flex items-center justify-between gap-0 mb-16" ref="loopRef">
        <div
          v-for="(phase, i) in phases"
          :key="phase.id"
          class="flex-1 flex flex-col items-center text-center group cursor-pointer"
          @click="activePhase = i"
        >
          <!-- Node -->
          <div
            class="relative w-16 h-16 rounded-full border-2 flex items-center justify-center mb-4 transition-all duration-500"
            :class="[
              activePhase === i
                ? 'border-bio-green bg-bio-green/10 box-glow-green scale-110'
                : 'border-mist-3 bg-void-3 hover:border-bio-green/50'
            ]"
          >
            <span class="font-mono text-xs font-medium"
                  :class="activePhase === i ? 'text-bio-green' : 'text-mist'"
            >{{ phase.id }}</span>
            <!-- Active pulse -->
            <div v-if="activePhase === i"
                 class="absolute inset-0 rounded-full border border-bio-green/30 animate-ping"></div>
          </div>

          <!-- Arrow between nodes -->
          <div v-if="i < phases.length - 1"
               class="absolute hidden"></div>

          <!-- Label -->
          <div class="font-mono text-xs tracking-wider uppercase mb-1"
               :class="activePhase === i ? 'text-bio-green' : 'text-mist-2'">
            {{ phase.en }}
          </div>
          <div class="font-serif text-lg"
               :class="activePhase === i ? 'text-slate-100' : 'text-slate-500'">
            {{ phase.zh }}
          </div>
        </div>
      </div>

      <!-- Connector line (desktop) -->
      <div class="hidden lg:block relative h-px mb-16 -mt-48">
        <div class="absolute top-0 left-8 right-8" style="top: -88px;">
          <div class="h-px bg-gradient-to-r from-transparent via-bio-green/30 to-transparent"></div>
        </div>
      </div>

      <!-- Detail card -->
      <div class="border border-void-3 bg-void-2/50 backdrop-blur p-8 md:p-10 transition-all duration-500 section-reveal" ref="cardRef">
        <div class="grid md:grid-cols-2 gap-8 items-start">
          <!-- Left: info -->
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 rounded-full border border-bio-green/50 flex items-center justify-center">
                <span class="font-mono text-xs text-bio-green">{{ phases[activePhase].id }}</span>
              </div>
              <div>
                <div class="font-mono text-xs text-bio-green tracking-wider uppercase">Phase {{ activePhase + 1 }}</div>
                <div class="font-serif text-2xl text-slate-100">{{ phases[activePhase].zh }} <span class="text-slate-500 text-lg">{{ phases[activePhase].en }}</span></div>
              </div>
            </div>
            <p class="text-slate-400 leading-relaxed mb-6">{{ phases[activePhase].desc }}</p>
            <p class="text-slate-500 text-sm italic leading-relaxed">{{ phases[activePhase].descEn }}</p>
          </div>

          <!-- Right: code/data preview -->
          <div class="bg-void border border-mist-3/50 rounded p-5 font-mono text-xs">
            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-mist-3/30">
              <div class="w-2 h-2 rounded-full bg-death-red"></div>
              <div class="w-2 h-2 rounded-full bg-mutation"></div>
              <div class="w-2 h-2 rounded-full bg-bio-green"></div>
              <span class="ml-2 text-mist-2 text-xs">evolution.log</span>
            </div>
            <div v-for="(line, li) in phases[activePhase].code" :key="li"
                 class="mb-1.5">
              <span class="text-mist-2">{{ String(li + 1).padStart(2, '0') }} │ </span>
              <span :class="line.color">{{ line.text }}</span>
            </div>
          </div>
        </div>

        <!-- Phase navigation (mobile) -->
        <div class="flex gap-2 mt-8 lg:hidden">
          <button
            v-for="(phase, i) in phases"
            :key="phase.id"
            @click="activePhase = i"
            class="flex-1 py-2 border font-mono text-xs transition-all"
            :class="activePhase === i ? 'border-bio-green text-bio-green bg-bio-green/10' : 'border-mist-3 text-mist-2'"
          >
            {{ phase.id }}
          </button>
        </div>
      </div>

      <!-- Loop arrow hint -->
      <div class="text-center mt-10">
        <div class="inline-flex items-center gap-3 font-mono text-xs text-mist-2">
          <div class="h-px w-16 bg-gradient-to-r from-transparent to-mist-3"></div>
          循环往复，螺旋上升 · Recursive evolution, exponential growth
          <div class="h-px w-16 bg-gradient-to-l from-transparent to-mist-3"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const activePhase = ref(0)
const headerRef = ref<HTMLElement>()
const cardRef = ref<HTMLElement>()

const phases = [
  {
    id: 'P1',
    zh: '播种',
    en: 'Genesis',
    desc: '一切的起点。注入你的核心意图、品牌价值观与目标受众基因。这是系统中唯一需要人类深度参与的部分——你的判断力决定了种子的质量。',
    descEn: 'The origin point. Inject your core intent, brand values, and audience DNA. Your judgment defines the seed quality.',
    code: [
      { text: 'seed.create({', color: 'text-bio-green' },
      { text: '  intent: "AI工具推广",', color: 'text-slate-300' },
      { text: '  platform: "xiaohongshu",', color: 'text-slate-300' },
      { text: '  audience: "效率工具用户",', color: 'text-slate-300' },
      { text: '  tone: "professional + curious"', color: 'text-mutation' },
      { text: '})', color: 'text-bio-green' },
    ],
  },
  {
    id: 'P2',
    zh: '生长',
    en: 'Growth',
    desc: 'AI Agent 作为园丁，基于种子生成多样化的内容变体。裂变出10种标题风格，跨模态转换，并引入10%随机突变，探索未知流量蓝海。',
    descEn: 'AI Agent as gardener generates diverse content variants with 10% mutation probability to explore unknown traffic territory.',
    code: [
      { text: 'generator.run({', color: 'text-gene-blue' },
      { text: '  variants: 5,', color: 'text-slate-300' },
      { text: '  mutation_rate: 0.10,', color: 'text-mutation' },
      { text: '  styles: ["震惊体","干货体","故事体"],', color: 'text-slate-300' },
      { text: '  // → fruit_A (保守) fruit_B (平衡)', color: 'text-mist-2' },
      { text: '  // → fruit_C (激进突变) ✦', color: 'text-mutation' },
    ],
  },
  {
    id: 'P3',
    zh: '收获',
    en: 'Harvest',
    desc: '将果实投入市场。多平台自动化发布，覆盖不同生态位。在这之前，Human-in-the-Loop 的 Pick Up 机制确保人类判断力介入最关键的节点。',
    descEn: 'Deploy fruits to market. Multi-platform publishing with Human-in-the-Loop Pick Up ensuring human judgment at key nodes.',
    code: [
      { text: 'fruits.pickUp(["fruit_A", "fruit_C"])', color: 'text-bio-green' },
      { text: '// Human judgment applied ✓', color: 'text-mist-2' },
      { text: 'platform.publish({', color: 'text-gene-blue' },
      { text: '  targets: ["xhs", "douyin", "twitter"],', color: 'text-slate-300' },
      { text: '  scheduled: "2026-03-15 20:00"', color: 'text-slate-300' },
      { text: '})', color: 'text-gene-blue' },
    ],
  },
  {
    id: 'P4',
    zh: '监控',
    en: 'Feedback',
    desc: '收集平台的客观反馈数据——这是市场的客观真理。显性指标（点赞/播放）与隐性指标（完播率/停留时长）共同构成进化的评判标准。',
    descEn: 'Collect objective market feedback. Explicit metrics (likes/views) and implicit metrics (completion rate/dwell time) form the evolutionary fitness score.',
    code: [
      { text: 'monitor.collect("fruit_A") → {', color: 'text-mutation' },
      { text: '  likes: 1247,  views: 8900,', color: 'text-slate-300' },
      { text: '  favorites: 380,  comments: 45,', color: 'text-slate-300' },
      { text: '  completion_rate: 0.73,  // ↑ high', color: 'text-bio-green' },
      { text: '  profile_clicks: 150', color: 'text-slate-300' },
      { text: '} // fitness_score: 0.89 ★', color: 'text-bio-green' },
    ],
  },
  {
    id: 'P5',
    zh: '进化',
    en: 'Evolution',
    desc: '基因提取、优胜劣汰、基因重组。淘汰数据差的方向，将爆款特征固化为新的优良基因，存入基因库，驱动下一轮生成质量指数级提升。',
    descEn: 'Gene extraction, natural selection, crossover. Extract winning patterns into the Gene Bank, driving exponential quality improvement each cycle.',
    code: [
      { text: 'nutrient.extract("fruit_A") → {', color: 'text-bio-green' },
      { text: '  winning_patterns: [', color: 'text-slate-300' },
      { text: '    "数字+利益点标题",', color: 'text-mutation' },
      { text: '    "晚8-10点发布",  "暖色配图"', color: 'text-mutation' },
      { text: '  ],', color: 'text-slate-300' },
      { text: '}  // → gene_bank.update() ✦', color: 'text-bio-green' },
    ],
  },
]

let autoTimer: ReturnType<typeof setInterval>

onMounted(() => {
  autoTimer = setInterval(() => {
    activePhase.value = (activePhase.value + 1) % phases.length
  }, 3500)

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible')
    })
  }, { threshold: 0.1 })

  if (headerRef.value) observer.observe(headerRef.value)
  if (cardRef.value) observer.observe(cardRef.value)
})

onUnmounted(() => clearInterval(autoTimer))
</script>
