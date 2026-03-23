<template>
  <header class="sticky top-0 z-30 h-14 flex items-center justify-between px-6 bg-void/60 backdrop-blur border-b border-bio-green/10 shrink-0">
    <!-- 左侧：面包屑 + 页面标题 -->
    <div class="flex items-center gap-3">
      <span class="font-mono text-[10px] tracking-[0.3em] text-mist-2 uppercase">// Console</span>
      <span class="text-mist-3">/</span>
      <span class="font-mono text-[10px] tracking-[0.3em] uppercase" :class="titleColor">{{ pageTitle }}</span>
    </div>

    <!-- 右侧：上下文操作 -->
    <div class="flex items-center gap-3">
      <button
        v-if="showNewSeed"
        class="flex items-center gap-2 font-mono text-xs tracking-widest uppercase px-4 py-1.5 bg-bio-green text-void hover:bg-bio-green/80 transition-all duration-300"
        @click="emit('new-seed')"
      >
        <Icon icon="ph:plus-bold" class="text-sm" />
        新建种子
      </button>
      <button
        v-if="showUploadGenerator"
        class="flex items-center gap-2 font-mono text-xs tracking-widest uppercase px-4 py-1.5 border border-gene-blue/60 text-gene-blue hover:bg-gene-blue/10 transition-all duration-300"
        @click="emit('upload-generator')"
      >
        <Icon icon="ph:upload-simple-bold" class="text-sm" />
        上传生成器
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const props = defineProps<{
  activeView: string
}>()

const emit = defineEmits<{
  'new-seed': []
  'upload-generator': []
}>()

const viewMeta: Record<string, { title: string; showNewSeed?: boolean; showUploadGenerator?: boolean; titleColor?: string }> = {
  seeds: { title: '种子库', showNewSeed: true },
  generators: { title: '我的生成器', showUploadGenerator: true, titleColor: 'text-gene-blue' },
  fruits: { title: '果实管理' },
  workspace: { title: '内容工坊' },
  dashboard: { title: '数据看板' },
  settings: { title: '设置' },
}

const pageTitle = computed(() => viewMeta[props.activeView]?.title ?? '控制台')
const showNewSeed = computed(() => viewMeta[props.activeView]?.showNewSeed ?? false)
const showUploadGenerator = computed(() => viewMeta[props.activeView]?.showUploadGenerator ?? false)
const titleColor = computed(() => viewMeta[props.activeView]?.titleColor ?? 'text-bio-green')
</script>
