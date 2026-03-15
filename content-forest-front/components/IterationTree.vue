<template>
  <div class="relative w-full overflow-hidden" style="height:340px">
    <svg ref="svgRef" class="absolute inset-0 w-full" viewBox="0 0 860 340" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path v-for="e in edges" :key="e.id" :d="e.path" fill="none"
        :stroke="e.color" stroke-width="1.5" :stroke-dasharray="e.len"
        :stroke-dashoffset="started ? 0 : e.len" stroke-linecap="round"
        :opacity="e.opacity"
        :style="`transition:stroke-dashoffset ${e.dur}ms cubic-bezier(.4,0,.2,1) ${e.delay}ms`"
      />
      <circle v-for="n in pulsingNodes" :key="'p'+n.id"
        :cx="n.x" :cy="n.y" :r="n.r+8" fill="none"
        :stroke="n.color" stroke-width="1" :opacity="pulseOp"
      />
      <circle v-for="n in nodes" :key="n.id"
        :cx="n.x" :cy="n.y" :r="n.r"
        :fill="n.fill" :stroke="n.color" stroke-width="1.5"
        :filter="`url(#glow-${n.glow})`"
        :opacity="started ? 1 : 0"
        :style="`transition:opacity 500ms ease ${n.delay}ms`"
        class="cursor-pointer"
        @mouseenter="hovered=n.id" @mouseleave="hovered=null"
      />
      <text v-for="n in nodes" :key="'l'+n.id"
        :x="n.x" :y="n.y+n.r+14" text-anchor="middle"
        :fill="n.color" font-family="DM Mono,monospace" :font-size="n.fs"
        :opacity="started ? 1 : 0"
        :style="`transition:opacity 500ms ease ${n.delay+100}ms`"
      >{{ n.label }}</text>
      <text v-for="n in metricNodes" :key="'m'+n.id"
        :x="n.x" :y="n.y+n.r+25" text-anchor="middle"
        fill="#64748b" font-family="DM Mono,monospace" font-size="8"
        :opacity="started ? 0.85 : 0"
        :style="`transition:opacity 500ms ease ${n.delay+200}ms`"
      >{{ n.metric }}</text>
    </svg>
    <Transition name="tt">
      <div v-if="hovered && tip" class="absolute z-20 pointer-events-none bg-void-2 border border-mist-3/60 px-3 py-2 text-xs font-mono whitespace-nowrap"
        :style="{left:tip.x+'px',top:tip.y+'px',transform:'translate(-50%,-110%)'}">
        <div class="text-slate-200 mb-1 font-medium">{{ tip.name }}</div>
        <div v-for="m in tip.metrics" :key="m.k" class="flex gap-2 text-mist-2">
          <span>{{ m.k }}</span><span :class="m.c">{{ m.v }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const svgRef = ref<SVGSVGElement | null>(null)
const hovered = ref<string | null>(null)
const started = ref(false)
const pulseOp = ref(0.35)

interface N {
  id: string; label: string; metric?: string
  x: number; y: number; r: number
  color: string; fill: string; glow: string; fs: number
  delay: number; pulsing?: boolean
  tip: { k: string; v: string; c: string }[]
  parent?: string
}

const nodes: N[] = [
  { id:'seed',  label:'SEED',    metric:'AI工具推广',   x:70,  y:170, r:14, color:'#f59e0b', fill:'rgba(245,158,11,0.18)', glow:'amber', fs:9,  delay:0,    pulsing:true,  parent:undefined, tip:[{k:'type',v:'Origin Seed',c:'text-mutation'}] },
  { id:'fA',    label:'Fruit A', metric:'1,247 likes',  x:230, y:85,  r:10, color:'#00ff9f', fill:'rgba(0,255,159,0.14)',  glow:'green', fs:9,  delay:600,  pulsing:true,  parent:'seed',    tip:[{k:'platform',v:'小红书',c:'text-slate-300'},{k:'likes',v:'1,247',c:'text-bio-green'}] },
  { id:'fB',    label:'Fruit B', metric:'rejected',      x:230, y:195, r:7,  color:'#334155', fill:'rgba(51,65,85,0.10)',   glow:'green', fs:8,  delay:700,  parent:'seed',    tip:[{k:'status',v:'rejected',c:'text-death-red'}] },
  { id:'fC',    label:'Fruit C', metric:'580 fav',       x:230, y:290, r:10, color:'#00ff9f', fill:'rgba(0,255,159,0.14)',  glow:'green', fs:9,  delay:800,  pulsing:true,  parent:'seed',    tip:[{k:'platform',v:'知乎长文',c:'text-slate-300'},{k:'favorites',v:'580',c:'text-bio-green'}] },
  { id:'fA1',   label:'A1',      metric:'2,100 likes',  x:400, y:35,  r:7,  color:'#00ff9f', fill:'rgba(0,255,159,0.10)',  glow:'green', fs:8,  delay:1300, parent:'fA',      tip:[{k:'type',v:'优化标题',c:'text-slate-300'},{k:'likes',v:'2,100',c:'text-bio-green'}] },
  { id:'fA2',   label:'A2',      metric:'85K views',    x:400, y:110, r:9,  color:'#0ea5e9', fill:'rgba(14,165,233,0.14)', glow:'blue',  fs:8,  delay:1450, parent:'fA',      tip:[{k:'platform',v:'抖音',c:'text-slate-300'},{k:'views',v:'85,000',c:'text-gene-blue'}] },
  { id:'fA3',   label:'A3 mut',  metric:'ctr:12.4%',    x:400, y:185, r:7,  color:'#ef4444', fill:'rgba(239,68,68,0.14)',  glow:'amber', fs:8,  delay:1600, parent:'fA',      tip:[{k:'mutation',v:'anti-logic',c:'text-death-red'},{k:'ctr',v:'12.4%',c:'text-death-red'}] },
  { id:'fA2a',  label:'A2a hot', metric:'210K views',   x:590, y:75,  r:12, color:'#0ea5e9', fill:'rgba(14,165,233,0.22)', glow:'blue',  fs:8,  delay:2200, pulsing:true,  parent:'fA2',     tip:[{k:'type',v:'二创爆款',c:'text-slate-300'},{k:'views',v:'210,000',c:'text-gene-blue'}] },
  { id:'fA2a1', label:'A2a-1',   metric:'iterating...',  x:760, y:45,  r:5,  color:'#0ea5e9', fill:'rgba(14,165,233,0.08)', glow:'blue',  fs:7,  delay:2900, parent:'fA2a',    tip:[{k:'status',v:'iterating',c:'text-gene-blue'}] },
  { id:'fA2a2', label:'A2a-2',   metric:'iterating...',  x:760, y:115, r:5,  color:'#0ea5e9', fill:'rgba(14,165,233,0.08)', glow:'blue',  fs:7,  delay:3100, parent:'fA2a',    tip:[{k:'status',v:'iterating',c:'text-gene-blue'}] },
  { id:'fC1',   label:'C1',      metric:'待发布',         x:400, y:290, r:7,  color:'#00ff9f', fill:'rgba(0,255,159,0.08)',  glow:'green', fs:8,  delay:1900, parent:'fC',      tip:[{k:'type',v:'精华版',c:'text-slate-300'},{k:'status',v:'待发布',c:'text-mutation'}] },
]

const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))
const pulsingNodes = computed(() => nodes.filter(n => n.pulsing))
const metricNodes = computed(() => nodes.filter(n => n.metric))

function bez(x1:number,y1:number,x2:number,y2:number){
  const cx=(x1+x2)/2
  return `M${x1} ${y1} C${cx} ${y1},${cx} ${y2},${x2} ${y2}`
}

interface E { id:string; path:string; len:number; color:string; opacity:number; dur:number; delay:number }
const edges = computed<E[]>(() =>
  nodes.filter(n => n.parent).map(n => {
    const p = nodeMap[n.parent!]
    const len = Math.hypot(n.x-p.x, n.y-p.y) * 1.3
    return {
      id: `${p.id}-${n.id}`,
      path: bez(p.x, p.y, n.x, n.y),
      len,
      color: n.color === '#334155' ? '#1e293b' : n.color,
      opacity: n.color === '#334155' ? 0.2 : 0.45,
      dur: 550,
      delay: Math.max(0, n.delay - 120),
    }
  })
)

const tip = computed(() => {
  if (!hovered.value) return null
  const n = nodeMap[hovered.value]
  if (!n) return null
  return { x: n.x, y: n.y - n.r - 6, name: n.label, metrics: n.tip }
})

let pulseTimer: ReturnType<typeof setInterval>
onMounted(() => {
  setTimeout(() => { started.value = true }, 300)
  pulseTimer = setInterval(() => {
    const t = Date.now() / 1000
    pulseOp.value = 0.15 + 0.25 * Math.abs(Math.sin(t * 1.8))
  }, 60)
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !started.value) started.value = true
  }, { threshold: 0.2 })
  if (svgRef.value) obs.observe(svgRef.value)
})
onUnmounted(() => clearInterval(pulseTimer))
</script>

<style scoped>
.tt-enter-active, .tt-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.tt-enter-from, .tt-leave-to { opacity: 0; transform: translate(-50%, -90%); }
</style>
