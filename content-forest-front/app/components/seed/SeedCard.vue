<script setup lang="ts">
import type { SeedSummary } from '../../../src/modules/seed'

const props = defineProps<{
  seed: SeedSummary
  selected: boolean
}>()

defineEmits<{
  select: [seedId: string]
}>()

const updatedAtLabel = computed(() => {
  const date = new Date(props.seed.updatedAt)
  if (Number.isNaN(date.getTime())) return props.seed.updatedAt
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
})
</script>

<template>
  <button
    class="cf-seed-card"
    :class="{ 'is-selected': selected, 'is-archived': seed.archiveState === 'archived' }"
    type="button"
    @click="$emit('select', seed.id)"
  >
    <span class="cf-seed-glyph" aria-hidden="true" />
    <span class="cf-seed-card-body">
      <strong>{{ seed.title }}</strong>
      <span>{{ seed.archiveState === 'archived' ? '已归档种子' : '未归档种子' }}</span>
    </span>
    <span class="cf-seed-meta">
      <span>{{ updatedAtLabel }}</span>
      <span class="cf-seed-status">{{ seed.archiveState === 'archived' ? 'archived' : 'active' }}</span>
    </span>
  </button>
</template>
