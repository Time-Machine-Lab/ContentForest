<template>
  <main class="bg-void min-h-screen text-slate-200">
    <!-- NAV -->
    <HeroNav />
    <!-- HERO -->
    <HeroSection />
    <!-- LOOP -->
    <LoopSection />
    <!-- CONCEPTS -->
    <ConceptsSection />
    <!-- COMPARE -->
    <CompareSection />
    <!-- CTA -->
    <CtaSection />
    <!-- FOOTER -->
    <SiteFooter />
  </main>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Content Forest — AI Content Evolution Engine',
  description: '让内容像生命一样进化。基于进化算法的 AI 内容引擎，自动生成、筛选、进化你的内容资产。',
  ogTitle: 'Content Forest — AI Content Evolution Engine',
  ogDescription: '让内容像生命一样进化。基于进化算法的 AI 内容引擎。',
  ogImage: '/og-image.svg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogUrl: 'https://contentforest.ai',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Content Forest — AI Content Evolution Engine',
  twitterDescription: '让内容像生命一样进化。',
  twitterImage: '/og-image.png',
})
</script>
