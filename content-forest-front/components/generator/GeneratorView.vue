<template>
  <div class="relative flex gap-0">
    <!-- 主内容区，detail 面板打开时收窄 -->
    <div
      class="flex-1 min-w-0 transition-all duration-300"
      :class="selectedGenerator ? 'mr-96' : ''"
    >
      <GeneratorCardWall
        ref="cardWallRef"
        @view-detail="selectedGenerator = $event"
        @open-upload="emit('close-upload');"
      />
    </div>

    <!-- 详情侧面板 -->
    <GeneratorDetailPanel
      :generator="selectedGenerator"
      @close="selectedGenerator = null"
      @uninstalled="onUninstalled"
    />

    <!-- 上传 Modal -->
    <GeneratorUploadModal
      :model-value="showUploadModal"
      @update:model-value="emit('close-upload')"
      @uploaded="onUploaded"
    />
  </div>
</template>

<script setup lang="ts">
import type { Generator } from '~/composables/useMyGenerators'

const props = defineProps<{
  showUploadModal: boolean
}>()

const emit = defineEmits<{
  'close-upload': []
}>()

const cardWallRef = ref<{ reload: () => void } | null>(null)
const selectedGenerator = ref<Generator | null>(null)

function onUninstalled(_id: string) {
  selectedGenerator.value = null
  cardWallRef.value?.reload()
}

function onUploaded() {
  cardWallRef.value?.reload()
}

function reload() {
  cardWallRef.value?.reload()
}

defineExpose({ reload })
</script>
