<template>
  <section id="waitlist" class="py-32 px-6 md:px-12 relative overflow-hidden">
    <!-- Background glow -->
    <div class="absolute inset-0 bg-void"></div>
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
         style="background: radial-gradient(circle, rgba(0,255,159,0.06) 0%, rgba(14,165,233,0.03) 40%, transparent 70%); filter: blur(60px);"></div>

    <div class="relative z-10 max-w-3xl mx-auto text-center">
      <!-- Tag -->
      <div class="inline-flex items-center gap-2 border border-bio-green/30 px-4 py-2 mb-10">
        <div class="w-1.5 h-1.5 rounded-full bg-bio-green animate-pulse"></div>
        <span class="font-mono text-xs tracking-widest text-bio-green uppercase">Early Access · 早期内测</span>
      </div>

      <!-- Headline -->
      <h2 class="font-serif text-5xl md:text-7xl text-slate-100 leading-none mb-6">
        加入内容进化的<br>
        <span class="italic text-bio-green glow-green">第一批物种</span>
      </h2>
      <p class="font-serif text-xl text-slate-500 italic mb-3">Join the first species of content evolution.</p>

      <p class="text-slate-400 leading-relaxed max-w-xl mx-auto mb-12">
        内容森林现处于 MVP 内测阶段。我们正在寻找第一批敢于用进化论思维
        做内容的创作者与团队。
        <span class="block mt-2 text-sm text-slate-500">Content Forest is in early access. We're looking for the first wave of creators ready to evolve their content strategy.</span>
      </p>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-8">
        <input
          v-model="email"
          type="email"
          placeholder="your@email.com"
          class="flex-1 bg-void-2 border border-mist-3/50 px-5 py-4 font-mono text-sm text-slate-200 placeholder-mist-2 focus:outline-none focus:border-bio-green/60 transition-colors"
          required
        />
        <button
          type="submit"
          :disabled="submitted"
          class="px-8 py-4 font-mono text-sm tracking-widest uppercase transition-all duration-300 whitespace-nowrap"
          :class="submitted
            ? 'bg-bio-green/20 text-bio-green border border-bio-green/30 cursor-default'
            : 'bg-bio-green text-void hover:bg-bio-green-dim cursor-pointer'"
        >
          {{ submitted ? '✓ Joined' : 'Request Access' }}
        </button>
      </form>

      <p class="font-mono text-xs text-mist-2">无垃圾邮件 · No spam. Unsubscribe anytime.</p>

      <!-- Principles -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mt-20 text-left">
        <div v-for="p in principles" :key="p.title" class="border border-mist-3/20 p-5 bg-void-2/30">
          <div class="font-mono text-bio-green text-lg mb-3">{{ p.icon }}</div>
          <div class="font-sans text-sm font-medium text-slate-200 mb-2">{{ p.title }}</div>
          <div class="font-mono text-xs text-mist-2 leading-relaxed">{{ p.desc }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const email = ref('')
const submitted = ref(false)

function handleSubmit() {
  if (!email.value) return
  // TODO: integrate with actual waitlist API
  submitted.value = true
  console.log('Waitlist signup:', email.value)
}

const principles = [
  {
    icon: '◈',
    title: '进化论思维',
    desc: 'Evolution over perfection. Ship fast, learn faster, iterate endlessly.',
  },
  {
    icon: '⬡',
    title: '零边际成本',
    desc: 'Code leverage meets media leverage. Scale to infinity without scaling cost.',
  },
  {
    icon: '↺',
    title: '复利效应',
    desc: 'Every iteration compounds. Your content system grows smarter each cycle.',
  },
]
</script>
