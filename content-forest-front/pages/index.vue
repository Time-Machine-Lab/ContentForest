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
  description: 'Let your content evolve like life itself. An AI-powered content engine built on evolutionary algorithms.',
})
</script>
