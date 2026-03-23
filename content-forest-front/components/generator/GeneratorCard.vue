<template>
  <div
    class="group relative flex flex-col gap-4 p-6 bg-void-2/60 backdrop-blur
           border-t border-r border-b border-gene-blue/10
           hover:-translate-y-0.5 cursor-default
           transition-[transform,border-color,background-color,box-shadow]"
    style="transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 500ms"
    :class="cardHover"
  >
    <!-- 左侧 gene-blue accent bar -->
    <span class="absolute left-0 top-0 bottom-0 w-[3px] bg-gene-blue transition-opacity duration-500" />

    <!-- 悬停顶部光线 -->
    <span
      class="absolute top-0 left-[3px] right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style="background: linear-gradient(90deg, rgba(14,165,233,0.6) 0%, transparent 100%)"
    />

    <!-- 头部：来源徽章 + 时间 -->
    <div class="flex items-center justify-between">
      <span
        class="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 border"
        :class="generator.source === 'self'
          ? 'border-mutation/40 text-mutation'
          : 'border-gene-blue/40 text-gene-blue'"
      >{{ generator.source === 'self' ? '// 自建' : '// 已安装' }}</span>
      <span class="font-mono text-[10px] text-mist-2">{{ timeAgo }}</span>
    </div>

    <!-- 名称 -->
    <h3 class="font-serif text-lg text-slate-100 leading-snug line-clamp-2">{{ generator.name }}</h3>

    <!-- 描述 -->
    <p class="font-sans text-xs leading-relaxed line-clamp-2 text-slate-500 flex-1">{{ generator.description }}</p>

    <!-- 平台 + 内容类型标签 -->
    <div class="flex flex-wrap gap-1.5">
      <span class="font-mono text-[10px] px-1.5 py-0.5 border border-gene-blue/30 text-gene-blue/80">
        {{ platformLabel }}
      </span>
      <span
        v-for="ct in generator.contentTypes.slice(0, 2)"
        :key="ct"
        class="font-mono text-[10px] px-1.5 py-0.5 border border-mist-3/40 text-mist-2"
      >{{ ct }}</span>
    </div>

    <!-- outputCapabilities -->
    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="cap in generator.outputCapabilities.slice(0, 3)"
        :key="cap"
        class="font-mono text-[9px] px-1.5 py-0.5 bg-gene-blue/5 border border-gene-blue/15 text-gene-blue/60 uppercase tracking-wider"
      >OUTPUT · {{ cap }}</span>
      <span
        v-if="generator.outputCapabilities.length > 3"
        class="font-mono text-[9px] px-1.5 py-0.5 text-mist-3"
      >+{{ generator.outputCapabilities.length - 3 }}</span>
    </div>

    <!-- 底部操作 -->
    <div class="flex items-center justify-between pt-3 border-t border-gene-blue/10 mt-auto">
      <button
        class="font-mono text-[10px] tracking-widest uppercase text-death-red/70 hover:text-death-red transition-colors duration-200 cursor-pointer"
        @click.stop="emit('uninstall', generator)"
      >卸载</button>
      <button
        class="font-mono text-[10px] tracking-widest uppercase text-gene-blue/70 hover:text-gene-blue transition-colors duration-200 cursor-pointer"
        @click.stop="emit('view-detail', generator)"
      >查看详情 →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Generator } from '~/composables/useMyGenerators'

const props = defineProps<{ generator: Generator }>()
const emit = defineEmits<{
  'view-detail': [generator: Generator]
  'uninstall': [generator: Generator]
}>()

const PLATFORM_LABELS: Record<string, string> = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  twitter: '推特',
  wechat: '微信',
  other: '其他',
}
const platformLabel = computed(() => PLATFORM_LABELS[props.generator.platform] ?? props.generator.platform)

const cardHover = computed(() => 'border-gene-blue/20 hover:border-gene-blue/50 bg-gene-blue/[0.02]')

const timeAgo = computed(() => {
  const ts = props.generator.installedAt ?? props.generator.createdAt
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
})
</script>
