<script setup lang="ts">
import type { SeedSummary } from '../../../src/modules/seed'

const props = defineProps<{
  seed: SeedSummary
  selected: boolean
  summary?: string
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
  <article
    class="cf-seed-card"
    :class="{ 'is-selected': selected, 'is-archived': seed.archiveState === 'archived' }"
  >
    <span class="cf-seed-glyph" aria-hidden="true" />

    <button class="cf-seed-card-main" type="button" @click="$emit('select', seed.id)">
      <span class="cf-seed-card-body">
        <strong>{{ seed.title }}</strong>
        <span>{{ summary || 'Markdown 种子文档。' }}</span>
      </span>
    </button>

    <div class="cf-seed-meta">
      <span>{{ updatedAtLabel }}</span>
      <span class="cf-seed-status">{{ seed.archiveState === 'archived' ? 'archived' : 'active' }}</span>
    </div>
  </article>
</template>
