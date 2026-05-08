<script setup lang="ts">
import { readFileAsBase64 } from '../../../src/modules/generator'

const emit = defineEmits<{
  close: []
  reupload: [zipBase64: string]
}>()

const props = defineProps<{
  open: boolean
  loading: boolean
  error: string
  generatorName: string
}>()

const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const dragActive = ref(false)
const fieldError = ref('')

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    file.value = null
    fieldError.value = ''
    dragActive.value = false
    await nextTick()
    fileInput.value?.focus()
  },
)

const fileName = computed(() => file.value?.name || '尚未选择 Skill zip')

function setFile(nextFile: File | null) {
  file.value = nextFile
  fieldError.value = ''
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  setFile(input.files?.[0] ?? null)
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (props.loading) return
  dragActive.value = true
}

function handleDragLeave() {
  dragActive.value = false
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  dragActive.value = false
  if (props.loading) return
  setFile(event.dataTransfer?.files?.[0] ?? null)
}

async function submit() {
  if (!file.value) {
    fieldError.value = '请选择新的 Skill zip 文件'
    return
  }

  fieldError.value = ''

  try {
    emit('reupload', await readFileAsBase64(file.value))
  } catch (error) {
    fieldError.value = error instanceof Error ? error.message : '文件读取失败，请重新选择 Skill zip'
  }
}

function close() {
  if (props.loading) return
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="cf-modal-backdrop" role="presentation" @click.self="close">
      <section class="cf-command-modal cf-generator-reupload-modal" role="dialog" aria-modal="true" aria-labelledby="reupload-generator-title">
        <header class="cf-modal-header">
          <h2 id="reupload-generator-title">重新上传生成器</h2>
          <button class="cf-icon-button" type="button" :disabled="loading" aria-label="关闭" @click="close">×</button>
        </header>

        <form class="cf-modal-body" @submit.prevent="submit">
          <p class="cf-modal-note">{{ generatorName }}</p>

          <label
            class="cf-generator-dropzone is-compact"
            :class="{ 'is-dragging': dragActive, 'has-file': file, 'is-error': fieldError }"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <span class="cf-drop-core" aria-hidden="true">{{ file ? '✓' : '↻' }}</span>
            <span class="cf-drop-copy">
              <em v-if="file" class="cf-drop-status">文件已选择</em>
              <strong>{{ file ? file.name : '拖拽新的 Skill zip 到这里' }}</strong>
              <span>{{ file ? '点击或重新拖入可替换文件' : '或点击选择 zip 文件' }}</span>
            </span>
            <input
              ref="fileInput"
              class="cf-drop-input"
              type="file"
              accept=".zip,application/zip"
              :disabled="loading"
              @change="handleFileChange"
            >
          </label>
          <p class="cf-file-selected">{{ fileName }}</p>

          <ExceptionNotice
            v-if="fieldError || error"
            title="重新上传失败"
            :message="fieldError || error"
          />

          <footer class="cf-modal-footer">
            <button class="cf-secondary-action" type="button" :disabled="loading" @click="close">取消</button>
            <button class="cf-primary-action" type="submit" :disabled="loading">
              {{ loading ? '上传中' : '确认上传' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>
