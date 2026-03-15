<template>
  <section id="loop" class="py-32 px-6 md:px-12 relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-b from-void via-void-2 to-void"></div>
    <div class="relative z-10 max-w-6xl mx-auto">
      <div class="text-center mb-20 section-reveal" ref="headerRef">
        <div class="font-mono text-xs tracking-[0.3em] text-gene-blue uppercase mb-4">// Core Algorithm</div>
        <h2 class="font-serif text-4xl md:text-6xl text-slate-100 mb-4">五步进化循环</h2>
        <p class="font-mono text-sm text-mist-2 tracking-wide">The 5-Phase Evolution Loop</p>
      </div>
      <div class="hidden lg:flex items-center justify-between gap-0 mb-16">
        <div v-for="(phase, i) in phases" :key="phase.id"
             class="flex-1 flex flex-col items-center text-center cursor-pointer"
             @click="activePhase = i; clearAuto()">
          <div class="relative w-16 h-16 rounded-full border-2 flex items-center justify-center mb-4 transition-all duration-500"
               :class="activePhase===i ? 'border-bio-green bg-bio-green/10 box-glow-green scale-110' : 'border-mist-3 bg-void-3 hover:border-bio-green/50'">
            <span class="font-mono text-xs font-medium" :class="activePhase===i ? 'text-bio-green' : 'text-mist'">{{ phase.id }}</span>
            <div v-if="activePhase===i" class="absolute inset-0 rounded-full border border-bio-green/30 animate-ping"></div>
          </div>
          <div class="font-mono text-xs tracking-wider uppercase mb-1" :class="activePhase===i ? 'text-bio-green' : 'text-mist-2'">{{ phase.en }}</div>
          <div class="font-serif text-lg" :class="activePhase===i ? 'text-slate-100' : 'text-slate-500'">{{ phase.zh }}</div>
        </div>
      </div>
      <div class="hidden lg:block relative h-px mb-16 -mt-48">
        <div class="absolute left-8 right-8" style="top:-88px">
          <div class="h-px bg-gradient-to-r from-transparent via-bio-green/30 to-transparent"></div>
        </div>
      </div>
      <div class="border border-void-3 bg-void-2/50 backdrop-blur p-8 md:p-10 transition-all duration-500 section-reveal" ref="cardRef">
        <div class="grid md:grid-cols-2 gap-8 items-start">
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
          <div class="bg-void border border-mist-3/50 rounded p-5">
            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-mist-3/30">
              <div class="w-2 h-2 rounded-full bg-death-red"></div>
              <div class="w-2 h-2 rounded-full bg-mutation"></div>
              <div class="w-2 h-2 rounded-full bg-bio-green"></div>
              <span class="ml-2 text-mist-2 font-mono text-xs">{{ phases[activePhase].dashTitle }}</span>
            </div>
            <div class="space-y-3">
              <div v-for="m in phases[activePhase].dashboard" :key="m.key" class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-base leading-none">{{ m.icon }}</span>
                  <span class="font-mono text-xs text-mist-2">{{ m.key }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <div v-if="m.bar" class="w-20 h-1.5 bg-void-3 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-1000" :style="{width:m.bar+'%',background:m.barColor||'#00ff9f'}"></div>
                  </div>
                  <span class="font-mono text-xs font-medium" :class="m.valueClass">{{ m.value }}</span>
                </div>
              </div>
            </div>
            <div v-if="phases[activePhase].dashNote" class="mt-4 pt-3 border-t border-mist-3/20 font-mono text-xs text-mist-2">{{ phases[activePhase].dashNote }}</div>
          </div>
        </div>
        <div class="flex gap-2 mt-8 lg:hidden">
          <button v-for="(phase,i) in phases" :key="phase.id" @click="activePhase=i;clearAuto()"
                  class="flex-1 py-2 border font-mono text-xs transition-all"
                  :class="activePhase===i ? 'border-bio-green text-bio-green bg-bio-green/10':'border-mist-3 text-mist-2'">{{ phase.id }}</button>
        </div>
      </div>
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

interface M { key:string; icon:string; value:string; valueClass:string; bar?:number; barColor?:string }
interface Phase { id:string; zh:string; en:string; desc:string; descEn:string; dashTitle:string; dashNote?:string; dashboard:M[] }

const phases: Phase[] = [
  {
    id:'P1', zh:'播种', en:'Genesis',
    desc:'一切的起点。注入你的核心意图、品牌价值观与目标受众基因。这是系统中唯一需要人类深度参与的部分——你的判断力决定了种子的质量。',
    descEn:'The origin point. Inject your core intent, brand values, and audience DNA. Your judgment defines the seed quality.',
    dashTitle:'seed.config', dashNote:'// 种子质量决定进化上限',
    dashboard:[
      {key:'platform',    icon:'[TGT]', value:'小红书',       valueClass:'text-slate-300'},
      {key:'audience',    icon:'[USR]', value:'效率工具用户',  valueClass:'text-slate-300'},
      {key:'tone',        icon:'[ART]', value:'professional', valueClass:'text-mutation'},
      {key:'seed quality',icon:'[D]',  value:'92 / 100',    valueClass:'text-bio-green', bar:92, barColor:'#00ff9f'},
    ],
  },
  {
    id:'P2', zh:'生长', en:'Growth',
    desc:'AI Agent 作为园丁，基于种子生成多样化的内容变体。裂变出10种标题风格，跨模态转换，并引入10%随机突变，探索未知流量蓝海。',
    descEn:'AI Agent as gardener generates diverse content variants with 10% mutation probability to explore unknown traffic territory.',
    dashTitle:'generator.run · live', dashNote:'// 4 variants + 1 mutation generated',
    dashboard:[
      {key:'variants',     icon:'[PLT]', value:'5 fruits',           valueClass:'text-bio-green'},
      {key:'mutation rate',icon:'[O]',  value:'10%',                valueClass:'text-death-red', bar:10, barColor:'#ef4444'},
      {key:'styles tried', icon:'[*]',  value:'震惊体 干货体 故事体', valueClass:'text-slate-400'},
      {key:'gen time',     icon:'[ZAP]', value:'4.2s',               valueClass:'text-mutation'},
    ],
  },
  {
    id:'P3', zh:'收获', en:'Harvest',
    desc:'将果实投入市场。多平台自动化发布，覆盖不同生态位。在这之前，Human-in-the-Loop 的 Pick Up 机制确保人类判断力介入最关键的节点。',
    descEn:'Deploy fruits to market. Multi-platform publishing with Human-in-the-Loop Pick Up ensuring human judgment at key nodes.',
    dashTitle:'publish.status', dashNote:'// Human picked 2/5 fruits',
    dashboard:[
      {key:'picked',     icon:'[^]',  value:'2 / 5',        valueClass:'text-bio-green'},
      {key:'platforms',  icon:'[WEB]', value:'xhs + douyin', valueClass:'text-slate-300'},
      {key:'scheduled',  icon:'[i]',  value:'20:00 tonight',valueClass:'text-mutation'},
      {key:'reach est.', icon:'[SIG]', value:'~12,000',      valueClass:'text-gene-blue', bar:60, barColor:'#0ea5e9'},
    ],
  },
  {
    id:'P4', zh:'监控', en:'Feedback',
    desc:'收集平台的客观反馈数据——这是市场的客观真理。显性指标（点赞/播放）与隐性指标（完播率/停留时长）共同构成进化的评判标准。',
    descEn:'Collect objective market feedback. Explicit metrics (likes/views) and implicit metrics (completion rate/dwell time) form the evolutionary fitness score.',
    dashTitle:'fruit_A · live metrics', dashNote:'// fitness 0.89 — triggering iteration',
    dashboard:[
      {key:'views',           icon:'[EYE]', value:'8,900', valueClass:'text-slate-300', bar:89, barColor:'#0ea5e9'},
      {key:'likes',           icon:'[i]',  value:'1,247', valueClass:'text-bio-green', bar:72, barColor:'#00ff9f'},
      {key:'completion rate', icon:'[P]',  value:'73%',   valueClass:'text-bio-green', bar:73, barColor:'#00ff9f'},
      {key:'fitness score',   icon:'[D]',  value:'0.89★', valueClass:'text-mutation',  bar:89, barColor:'#f59e0b'},
    ],
  },
  {
    id:'P5', zh:'进化', en:'Evolution',
    desc:'基因提取、优胜劣汰、基因重组。淘汰数据差的方向，将爆款特征固化为新的优良基因，存入基因库，驱动下一轮生成质量指数级提升。',
    descEn:'Gene extraction, natural selection, crossover. Extract winning patterns into the Gene Bank, driving exponential quality improvement each cycle.',
    dashTitle:'gene_bank.update', dashNote:'// Next gen quality +34% predicted',
    dashboard:[
      {key:'patterns extracted',icon:'[D]', value:'3 genes',    valueClass:'text-bio-green'},
      {key:'top pattern',       icon:'[*]', value:'数字+利益点', valueClass:'text-mutation'},
      {key:'pruned branches',   icon:'[X]', value:'2 removed',  valueClass:'text-death-red'},
      {key:'next gen quality',  icon:'[U]', value:'+34%',       valueClass:'text-bio-green', bar:34, barColor:'#00ff9f'},
    ],
  },
]

let autoTimer: ReturnType<typeof setInterval>
function clearAuto() { clearInterval(autoTimer) }

onMounted(() => {
  autoTimer = setInterval(() => {
    activePhase.value = (activePhase.value + 1) % phases.length
  }, 3500)
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
  }, { threshold: 0.1 })
  if (headerRef.value) obs.observe(headerRef.value)
  if (cardRef.value) obs.observe(cardRef.value)
})
onUnmounted(() => clearInterval(autoTimer))
</script>
