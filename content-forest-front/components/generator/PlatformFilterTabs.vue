<template>
  <div class="flex items-center border-b border-gene-blue/10">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="relative h-9 px-4 font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-300 whitespace-nowrap"
      :class="modelValue === tab.value ? 'text-gene-blue' : 'text-slate-400 hover:text-slate-200'"
      @click="emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="ml-1 text-[9px] opacity-60">({{ tab.count }})</span>
      <span v-if="modelValue === tab.value" class="absolute bottom-0 left-0 right-0 h-[2px] bg-gene-blue -mb-px" />
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  counts?: Record<string, number>
}>()
const emit = defineEmits<{ 'update:modelValue': [val: string] }>()

const PLATFORM_LABELS: Record<string, string> = {
  '': '全部',
  xiaohongshu: '小红书',
  douyin: '抖音',
  twitter: '推特',
  wechat: '微信',
  other: '其他',
}

const tabs = computed(() =>
  Object.entries(PLATFORM_LABELS).map(([value, label]) => ({
    value,
    label,
    count: props.counts?.[value],
  }))
)
</script>
