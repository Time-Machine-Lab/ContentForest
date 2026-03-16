<template>
  <nav class="sticky top-0 z-40 h-14 flex items-center justify-between px-6 bg-void/90 backdrop-blur border-b border-bio-green/10">
    <!-- Brand Logo -->
    <NuxtLink to="/" class="flex items-center gap-3 group">
      <div class="w-5 h-5 relative">
        <div class="absolute inset-0 border border-bio-green/60 group-hover:border-bio-green transition-colors duration-300"></div>
        <div class="absolute inset-[3px] bg-bio-green/20 group-hover:bg-bio-green/40 transition-colors duration-300"></div>
        <div class="absolute inset-[6px] bg-bio-green"></div>
      </div>
      <span class="font-mono text-sm tracking-widest uppercase">
        <span class="text-bio-green">Content</span><span class="text-slate-500">.</span><span class="text-slate-300">Forest</span>
      </span>
    </NuxtLink>

    <!-- Center: Search placeholder -->
    <div class="hidden md:flex items-center gap-2 px-4 py-1.5 border border-bio-green/10 bg-void-2/40 cursor-not-allowed opacity-40">
      <span class="font-mono text-xs text-slate-500 tracking-widest">// search — coming soon</span>
    </div>

    <!-- Right: User area -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-bio-green animate-pulse-slow"></div>
        <span class="font-mono text-xs text-slate-400 tracking-widest uppercase">{{ userId }}</span>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
const userId = 'local_admin'
</script>
