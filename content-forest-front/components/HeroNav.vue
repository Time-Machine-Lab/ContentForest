<template>
  <nav class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12"
       :class="{ 'backdrop-blur-md bg-void/80 border-b border-bio-green/10': scrolled }">
    <!-- Logo -->
    <div class="flex items-center gap-3">
      <div class="w-7 h-7 relative">
        <div class="absolute inset-0 rounded-full border border-bio-green/60 animate-pulse-slow"></div>
        <div class="absolute inset-1 rounded-full border border-bio-green/30"></div>
        <div class="absolute inset-[6px] rounded-full bg-bio-green"></div>
      </div>
      <span class="font-mono text-sm tracking-widest text-bio-green uppercase">Content<span class="text-slate-400">.</span>Forest</span>
    </div>

    <!-- Links -->
    <div class="hidden md:flex items-center gap-8">
      <a v-for="link in links" :key="link.href" :href="link.href"
         class="font-mono text-xs tracking-wider text-mist hover:text-bio-green transition-colors uppercase">
        {{ link.label }}
      </a>
    </div>

    <!-- CTA -->
    <a href="#waitlist"
       class="font-mono text-xs tracking-widest uppercase px-4 py-2 border border-bio-green/50 text-bio-green hover:bg-bio-green hover:text-void transition-all duration-300">
      Request Access
    </a>
  </nav>
</template>

<script setup lang="ts">
const scrolled = ref(false)

onMounted(() => {
  window.addEventListener('scroll', () => {
    scrolled.value = window.scrollY > 20
  })
})

const links = [
  { label: 'How It Works', href: '#loop' },
  { label: 'Concepts', href: '#concepts' },
  { label: 'vs. Others', href: '#compare' },
  { label: 'Demo', href: '/demo' },
]
</script>
