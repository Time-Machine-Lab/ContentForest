<template>
  <div
    class="group relative flex flex-col gap-4 p-6 bg-void-2/60 backdrop-blur
           border-t border-r border-b border-bio-green/10
           hover:-translate-y-0.5 cursor-default
           transition-[transform,border-color,background-color,box-shadow]"
    style="transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 500ms"
    :class="cardClass"
  >
    <!-- 左侧 accent bar -->
    <span class="absolute left-0 top-0 bottom-0 w-[3px] transition-opacity duration-500" :class="accentBar" />

    <!-- 悬停顶部光线 -->
    <span
      class="absolute top-0 left-[3px] right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style="background: linear-gradient(90deg, rgba(0,255,159,0.6) 0%, transparent 100%)"
    />

    <!-- 状态标签 + 时间 -->
    <div class="flex items-center justify-between">
      <span class="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 border" :class="statusStyle">{{ statusLabel }}</span>
      <span class="font-mono text-[10px] text-mist-2">{{ timeAgo }}</span>
    </div>

    <!-- 标题 -->
    <h3 class="font-serif text-lg text-slate-100 leading-snug line-clamp-2">{{ seed.title }}</h3>

    <!-- 摘要 -->
    <p class="font-sans text-xs leading-relaxed line-clamp-3 flex-1" :class="seed.excerpt ? 'text-slate-500' : 'text-mist-3 italic font-mono'">
      {{ seed.excerpt || '// 暂无内容摘要' }}
    </p>

    <!-- 标签 -->
    <div v-if="seed.tags?.length" class="flex flex-wrap gap-1.5">
      <span
        v-for="tag in seed.tags"
        :key="tag"
        class="font-mono text-[10px] px-1.5 py-0.5 border border-bio-green/20 text-bio-green/70"
      >{{ tag }}</span>
    </div>

    <!-- 底部：果实数量 + 操作 -->
    <div class="flex items-center justify-between pt-3 border-t border-bio-green/10 mt-auto">
      <span class="font-mono text-[10px] text-mist-2">
        <span class="text-mutation">{{ seed.fruitCount ?? 0 }}</span> 个果实
      </span>
      <div class="flex items-center gap-3">
        <template v-if="seed.status === 'draft'">
          <button class="action-btn hover:text-bio-green" @click="emit('edit', seed)">编辑</button>
          <button class="action-btn text-bio-green hover:text-bio-green/70" @click="emit('publish', seed)">发布</button>
          <button class="action-btn hover:text-death-red" @click="emit('delete', seed)">删除</button>
        </template>
        <template v-else-if="seed.status === 'active'">
          <button class="action-btn hover:text-bio-green" @click="emit('edit', seed)">编辑</button>
          <button class="action-btn hover:text-mutation" @click="emit('archive', seed)">归档</button>
        </template>
        <template v-else-if="seed.status === 'archived'">
          <button class="action-btn hover:text-gene-blue" @click="emit('restore', seed)">回档</button>
          <button class="action-btn hover:text-death-red" @click="emit('delete', seed)">删除</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Seed } from '~/composables/useSeedRepository'

const props = defineProps<{ seed: Seed }>()
const emit = defineEmits<{
  edit: [seed: Seed]; publish: [seed: Seed]
  archive: [seed: Seed]; restore: [seed: Seed]; delete: [seed: Seed]
}>()

const statusLabel = computed(() => ({ draft: '草稿', active: '活跃', archived: '归档' }[props.seed.status] ?? props.seed.status))

const statusStyle = computed(() => ({
  draft: 'border-mist-3 text-mist-2',
  active: 'border-bio-green/40 text-bio-green',
  archived: 'border-mist-3/50 text-mist-3',
}[props.seed.status] ?? 'border-mist-3 text-mist-2'))

const accentBar = computed(() => ({
  draft: 'bg-mist-3',
  active: 'bg-bio-green',
  archived: 'bg-mist-3/30',
}[props.seed.status] ?? 'bg-mist-3'))

const cardClass = computed(() => ({
  draft: 'border-mist-3/30 hover:border-mist-3/60',
  active: 'border-bio-green/20 hover:border-bio-green/50 bg-bio-green/[0.02]',
  archived: 'border-mist-3/20 hover:border-mist-3/40',
}[props.seed.status] ?? 'border-bio-green/20'))

const timeAgo = computed(() => {
  const diff = Date.now() - props.seed.createdAt
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
})
</script>

<style scoped>
.action-btn {
  @apply font-mono text-[10px] tracking-widest uppercase text-slate-400 transition-colors duration-200;
}
</style>
