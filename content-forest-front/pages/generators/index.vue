<template>
  <div class="min-h-screen bg-void text-slate-200">
    <!-- 全局背景光效 -->
    <div class="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      <div class="absolute inset-0" style="background: radial-gradient(ellipse 55% 40% at 80% 10%, rgba(14,165,233,0.06) 0%, transparent 70%)" />
      <div class="absolute inset-0" style="background: radial-gradient(ellipse 40% 35% at 10% 90%, rgba(0,255,159,0.03) 0%, transparent 70%)" />
      <div class="absolute inset-0 bg-hex-pattern opacity-[0.02]" />
    </div>

    <ClientOnly>
      <HeroNav />
    </ClientOnly>

    <main class="relative z-10 pt-28 pb-24 px-6 md:px-12">
      <div class="max-w-6xl mx-auto">
        <ClientOnly>
          <MarketView />
          <template #fallback>
            <!-- 骨架占位 -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-32">
              <div v-for="i in 6" :key="i" class="border border-gene-blue/10 bg-void-2/40 p-6 animate-pulse h-56" />
            </div>
          </template>
        </ClientOnly>
      </div>
    </main>

    <ClientOnly>
      <SiteFooter />
      <ToastNotification />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ ssr: false })

useSeoMeta({
  title: '生成器市场 — Content Forest',
  description: '浏览和安装内容生成器 Skill 包，把爆款生产方法论装进一个文件，在 AI IDE 中直接调用。',
  ogTitle: '生成器市场 — Content Forest',
  ogDescription: '浏览和安装内容生成器 Skill 包。',
})
</script>
