<template>
  <footer class="border-t border-mist-3/20 py-16 px-6 md:px-12 bg-void">
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-12">
        <!-- Logo -->
        <div>
          <div class="flex items-center gap-3 mb-3">
            <div class="w-6 h-6 relative">
              <div class="absolute inset-0 rounded-full border border-bio-green/60"></div>
              <div class="absolute inset-[5px] rounded-full bg-bio-green"></div>
            </div>
            <span class="font-mono text-sm tracking-widest text-bio-green uppercase">Content<span class="text-slate-500">.</span>Forest</span>
          </div>
          <p class="font-mono text-xs text-mist-2 max-w-xs leading-relaxed">
            以进化论为算法，以 AI 为工蚁，<br>
            构建自动化的内容生态森林。
          </p>
        </div>

        <!-- Links -->
        <div class="flex gap-12">
          <div>
            <div class="font-mono text-xs text-mist-2 uppercase tracking-wider mb-4">Product</div>
            <div class="flex flex-col gap-3">
              <a v-for="l in productLinks" :key="l.label" :href="l.href"
                 class="font-mono text-xs text-slate-400 hover:text-bio-green transition-colors">{{ l.label }}</a>
            </div>
          </div>
          <div>
            <div class="font-mono text-xs text-mist-2 uppercase tracking-wider mb-4">Project</div>
            <div class="flex flex-col gap-3">
              <a v-for="l in projectLinks" :key="l.label" :href="l.href"
                 class="font-mono text-xs text-slate-400 hover:text-bio-green transition-colors">{{ l.label }}</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="border-t border-mist-3/20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="font-mono text-xs text-mist-2">
          <span class="text-bio-green">// </span>Built with evolutionary algorithms &amp; AI agents
        </div>
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-bio-green animate-pulse"></div>
          <span class="font-mono text-xs text-mist-2">System status: <span class="text-bio-green">Evolving</span></span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const productLinks = [
  { label: 'How It Works', href: '#loop' },
  { label: 'Core Concepts', href: '#concepts' },
  { label: 'vs. Others', href: '#compare' },
  { label: 'Request Access', href: '#waitlist' },
]
const projectLinks = [
  { label: 'GitHub', href: 'https://github.com' },
  { label: 'Documentation', href: '#' },
  { label: 'MVP Design', href: '#' },
]
</script>
