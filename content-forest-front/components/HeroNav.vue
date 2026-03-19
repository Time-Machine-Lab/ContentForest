<template>
  <nav
    class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12"
    :class="{ 'backdrop-blur-md bg-void/80 border-b border-bio-green/10': scrolled }"
  >
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
      <a
        v-for="link in links"
        :key="link.href"
        :href="link.href"
        class="font-mono text-xs tracking-wider text-mist hover:text-bio-green transition-colors uppercase"
      >{{ link.label }}</a>

      <!-- 产品下拉菜单 -->
      <div
        class="relative"
        @mouseenter="productMenuOpen = true"
        @mouseleave="productMenuOpen = false"
      >
        <button
          class="flex items-center gap-1 font-mono text-xs tracking-wider uppercase transition-colors duration-200"
          :class="productMenuOpen ? 'text-bio-green' : 'text-mist hover:text-bio-green'"
          @click="productMenuOpen = !productMenuOpen"
        >
          产品
          <span
            class="inline-block transition-transform duration-200"
            :class="productMenuOpen ? 'rotate-180' : ''"
          >▾</span>
        </button>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <div
            v-show="productMenuOpen"
            class="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 bg-void-2 border border-bio-green/10 py-1"
          >
            <!-- 顶部光晕 -->
            <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gene-blue/40 to-transparent" />

            <NuxtLink
              v-for="item in productMenuItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center justify-between px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase text-slate-400 hover:text-gene-blue hover:bg-gene-blue/5 transition-all duration-150 group"
              @click="productMenuOpen = false"
            >
              <span>{{ item.label }}</span>
              <span class="text-gene-blue/40 group-hover:text-gene-blue transition-colors duration-150">→</span>
            </NuxtLink>
          </div>
        </Transition>
      </div>
    </div>

    <!-- CTA Group -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/console"
        class="font-mono text-xs tracking-widest uppercase px-4 py-2 bg-bio-green text-void hover:bg-bio-green/80 transition-all duration-300"
      >
        进入控制台
      </NuxtLink>
      <a
        href="#waitlist"
        class="hidden md:inline-block font-mono text-xs tracking-widest uppercase px-4 py-2 border border-bio-green/50 text-bio-green hover:bg-bio-green hover:text-void transition-all duration-300"
      >Request Access</a>
    </div>
  </nav>
</template>

<script setup lang="ts">
const scrolled = ref(false)
const productMenuOpen = ref(false)

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

const productMenuItems = [
  { label: '生成器市场', to: '/generators' },
]
</script>
