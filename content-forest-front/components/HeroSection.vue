<template>
  <section class="relative min-h-screen flex flex-col items-center justify-center overflow-hidden grid-bg pt-20">
    <!-- Particle field -->
    <div class="absolute inset-0 pointer-events-none">
      <div v-for="p in particles" :key="p.id"
           class="absolute w-1 h-1 rounded-full"
           :style="p.style"></div>
    </div>

    <!-- Central orb -->
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div class="w-96 h-96 rounded-full"
           style="background: radial-gradient(circle, rgba(0,255,159,0.08) 0%, rgba(14,165,233,0.04) 50%, transparent 70%);
                  filter: blur(40px);"></div>
    </div>

    <!-- Orbit rings -->
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 pointer-events-none">
      <div class="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-bio-green orbit"
           style="animation-duration: 9s;"></div>
      <div class="absolute w-2 h-2 -ml-1 -mt-1 rounded-full bg-gene-blue orbit-2"
           style="animation-duration: 14s;"></div>
      <div class="absolute w-1.5 h-1.5 -ml-0.75 -mt-0.75 rounded-full bg-mutation orbit-3"
           style="animation-duration: 19s;"></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 text-center max-w-5xl mx-auto px-6">
      <!-- Eyebrow -->
      <div class="flex items-center justify-center gap-3 mb-8">
        <div class="h-px w-12 bg-gradient-to-r from-transparent to-bio-green"></div>
        <span class="font-mono text-xs tracking-[0.3em] text-bio-green uppercase">AI Content Evolution Engine</span>
        <div class="h-px w-12 bg-gradient-to-l from-transparent to-bio-green"></div>
      </div>

      <!-- Main headline -->
      <h1 class="font-serif text-6xl md:text-8xl lg:text-9xl leading-none mb-4">
        <span class="block text-slate-100">Content</span>
        <span class="block italic text-bio-green glow-green">Forest</span>
      </h1>

      <!-- Subline -->
      <div class="font-mono text-sm md:text-base text-mist mt-6 mb-3 tracking-wider h-6">
        <span>// </span><span class="typing-cursor">{{ currentLine }}</span>
      </div>

      <!-- Description -->
      <p class="max-w-2xl mx-auto text-slate-400 text-base md:text-lg leading-relaxed mt-8 font-light">
        内容不是一次性消耗品。<br class="hidden md:block">
        它是有生命的——<span class="text-slate-200">播种、生长、进化、繁殖</span>。
        <span class="block mt-2 text-sm text-slate-500">Content isn't disposable. It's alive — it seeds, grows, evolves, and breeds.</span>
      </p>

      <!-- Seed input interaction -->
      <div class="mt-12 max-w-xl mx-auto">
        <div class="border border-mist-3/40 bg-void-2/60 backdrop-blur p-1 flex gap-0 group focus-within:border-bio-green/50 transition-colors duration-300">
          <div class="flex items-center px-4 border-r border-mist-3/30">
            <span class="font-mono text-xs text-bio-green/70 whitespace-nowrap">seed =</span>
          </div>
          <input
            v-model="seedInput"
            type="text"
            :placeholder="seedPlaceholder"
            class="flex-1 bg-transparent px-4 py-3 font-mono text-sm text-slate-200 placeholder-mist-2/50 focus:outline-none"
            @keydown.enter="goDemo"
          />
          <button
            @click="goDemo"
            class="px-5 py-3 bg-bio-green text-void font-mono text-xs tracking-widest uppercase hover:bg-bio-green-dim transition-colors duration-200 whitespace-nowrap"
          >
            进化 →
          </button>
        </div>
        <p class="font-mono text-xs text-mist-2/60 mt-2 text-center">输入你的产品/创意，看看内容森林如何让它进化</p>
      </div>

      <!-- CTAs -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
        <a href="#waitlist"
           class="group relative px-8 py-4 bg-bio-green text-void font-mono text-sm tracking-widest uppercase font-medium hover:bg-bio-green-dim transition-all duration-300 overflow-hidden">
          <span class="relative z-10">申请早期访问 / Request Access</span>
        </a>
        <a href="#loop"
           class="px-8 py-4 border border-mist-3 text-mist font-mono text-sm tracking-widest uppercase hover:border-bio-green/50 hover:text-bio-green transition-all duration-300">
          了解原理 / How It Works
        </a>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-8 mt-20 max-w-lg mx-auto">
        <div v-for="stat in stats" :key="stat.label" class="text-center">
          <div class="font-mono text-2xl md:text-3xl text-bio-green font-light">{{ stat.value }}</div>
          <div class="font-mono text-xs text-mist-2 mt-1 tracking-wider">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- Scroll indicator -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
      <span class="font-mono text-xs text-mist-2 tracking-widest uppercase">Scroll</span>
      <div class="w-px h-12 bg-gradient-to-b from-bio-green/50 to-transparent animate-pulse"></div>
    </div>
  </section>
</template>

<script setup lang="ts">
const lines = [
  'let content = seed.evolve(market.feedback)',
  'while (alive) { mutate(); harvest(); iterate(); }',
  '// 适者生存。只有经市场检验的内容才是好内容。',
  'new ContentForest({ mutation: 0.1, iterations: ∞ })',
]
const currentLine = ref('')
const lineIndex = ref(0)
const charIndex = ref(0)
let timer: ReturnType<typeof setTimeout>

function typeNext() {
  const line = lines[lineIndex.value]
  if (charIndex.value < line.length) {
    currentLine.value = line.slice(0, charIndex.value + 1)
    charIndex.value++
    timer = setTimeout(typeNext, 45)
  } else {
    timer = setTimeout(() => {
      charIndex.value = 0
      currentLine.value = ''
      lineIndex.value = (lineIndex.value + 1) % lines.length
      typeNext()
    }, 2400)
  }
}

onMounted(() => { typeNext() })
onUnmounted(() => { clearTimeout(timer) })

const seedInput = ref('')
const seedPlaceholders = [
  '我在做一款 AI 效率工具...',
  'A fitness app for busy professionals...',
  '帮助独立开发者找到第一批用户的产品...',
  'My handmade jewelry brand...',
]
const seedPlaceholder = ref(seedPlaceholders[0])
let phIdx = 0
let phTimer: ReturnType<typeof setInterval>

onMounted(() => {
  phTimer = setInterval(() => {
    phIdx = (phIdx + 1) % seedPlaceholders.length
    seedPlaceholder.value = seedPlaceholders[phIdx]
  }, 3000)
})
onUnmounted(() => clearInterval(phTimer))

function goDemo() {
  const q = seedInput.value.trim() || seedPlaceholder.value
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('cf_seed', q)
    window.location.href = '/demo'
  }
}

const stats = [
  { value: '5', label: 'Phase Loop' },
  { value: '3×', label: 'Mutation Types' },
  { value: '∞', label: 'Iterations' },
]

const particles = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  style: {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    background: i % 3 === 0 ? '#00ff9f' : i % 3 === 1 ? '#0ea5e9' : '#f59e0b',
    opacity: (Math.random() * 0.4 + 0.1).toString(),
    width: `${Math.random() * 2 + 1}px`,
    height: `${Math.random() * 2 + 1}px`,
    animation: `particleFloat ${Math.random() * 6 + 4}s ease-in-out infinite`,
    animationDelay: `${Math.random() * 4}s`,
  }
}))
</script>
