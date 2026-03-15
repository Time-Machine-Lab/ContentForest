<template>
  <section id="compare" class="py-32 px-6 md:px-12 relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-b from-void via-void-2 to-void"></div>

    <div class="relative z-10 max-w-6xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-20">
        <div class="font-mono text-xs tracking-[0.3em] text-death-red uppercase mb-4">// Natural Selection</div>
        <h2 class="font-serif text-4xl md:text-6xl text-slate-100 mb-4">
          为什么不是普通 AI 工具？
        </h2>
        <p class="font-mono text-sm text-mist-2 tracking-wide">Why Content Forest, not just another AI writer?</p>
      </div>

      <!-- Compare table -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="text-left p-5 font-mono text-xs tracking-wider text-mist-2 uppercase border-b border-mist-3/30 md:w-1/3">Capability</th>
              <th class="text-center p-3 md:p-5 font-mono text-xs tracking-wider text-mist-2 uppercase border-b border-mist-3/30 md:w-1/3">
                <div class="flex items-center justify-center gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-mist-2 shrink-0"></div>
                  <span class="hidden md:inline">普通 AI 写作工具</span>
                  <span class="md:hidden">普通工具</span>
                </div>
              </th>
              <th class="text-center p-3 md:p-5 font-mono text-xs tracking-wider text-bio-green uppercase border-b border-bio-green/30 md:w-1/3 bg-bio-green/5">
                <div class="flex items-center justify-center gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-bio-green animate-pulse shrink-0"></div>
                  Content Forest
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in compareRows" :key="i"
                class="border-b border-mist-3/20 hover:bg-void-3/30 transition-colors group">
              <td class="p-5">
                <div class="font-sans text-sm text-slate-300">{{ row.feature }}</div>
                <div class="font-mono text-xs text-mist-2 mt-0.5">{{ row.featureEn }}</div>
              </td>
              <td class="p-5 text-center">
                <div class="flex items-center justify-center gap-2">
                  <svg v-if="!row.others" class="w-4 h-4 text-death-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  <svg v-else-if="row.others === 'partial'" class="w-4 h-4 text-mutation" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                  </svg>
                  <svg v-else class="w-4 h-4 text-mist-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span class="font-mono text-xs text-mist-2">{{ row.othersText }}</span>
                </div>
              </td>
              <td class="p-5 text-center bg-bio-green/5">
                <div class="flex items-center justify-center gap-2">
                  <svg class="w-4 h-4 text-bio-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span class="font-mono text-xs text-bio-green">{{ row.cfText }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Philosophy block -->
      <div class="mt-20 grid md:grid-cols-2 gap-6">
        <div class="border border-mist-3/30 bg-void-2/40 p-8">
          <div class="font-mono text-xs text-mist-2 uppercase tracking-wider mb-4">// 其他工具的思维模型</div>
          <div class="font-serif text-2xl text-slate-400 leading-relaxed mb-4">"帮我写一篇文章"</div>
          <div class="font-mono text-xs text-slate-500 leading-relaxed">
            Input → Output<br>
            一次性消费<br>
            工具，不是系统<br>
            <span class="text-death-red">// 每次都从零开始</span>
          </div>
        </div>
        <div class="border border-bio-green/30 bg-bio-green/5 p-8 box-glow-green">
          <div class="font-mono text-xs text-bio-green uppercase tracking-wider mb-4">// Content Forest 的思维模型</div>
          <div class="font-serif text-2xl text-slate-100 leading-relaxed mb-4">"让内容自己进化"</div>
          <div class="font-mono text-xs text-bio-green/70 leading-relaxed">
            Seed → Grow → Harvest → Feedback → Evolve<br>
            复利增长，每轮比上轮聪明<br>
            系统，不是工具<br>
            <span class="text-bio-green">// 进化树越来越茂盛</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const compareRows = [
  {
    feature: '内容生成', featureEn: 'Content Generation',
    others: true, othersText: '✓ 一次性生成',
    cfText: '多变体 + 差异化策略',
  },
  {
    feature: '市场反馈闭环', featureEn: 'Market Feedback Loop',
    others: false, othersText: '✗ 无',
    cfText: '数据监控 → 自动汲取',
  },
  {
    feature: '内容自进化', featureEn: 'Self-Evolution',
    others: false, othersText: '✗ 无',
    cfText: '基因提取 + 迭代树',
  },
  {
    feature: '基因突变探索', featureEn: 'Mutation & Exploration',
    others: false, othersText: '✗ 无',
    cfText: '3种突变策略，防局部最优',
  },
  {
    feature: '知识资产沉淀', featureEn: 'Knowledge Asset Accumulation',
    others: 'partial', othersText: '△ 有限历史',
    cfText: '三层营养库持续累积',
  },
  {
    feature: 'Human-in-the-Loop', featureEn: 'Human Judgment Integration',
    others: 'partial', othersText: '△ 仅输入端',
    cfText: 'Pick Up 关键节点介入',
  },
  {
    feature: '多平台适配', featureEn: 'Multi-Platform Adaptation',
    others: 'partial', othersText: '△ 手动调整',
    cfText: '平台营养库自动适配',
  },
  {
    feature: '边际成本', featureEn: 'Marginal Cost',
    others: true, othersText: '逐次付费',
    cfText: '≈ 0，无限规模化',
  },
]
</script>
