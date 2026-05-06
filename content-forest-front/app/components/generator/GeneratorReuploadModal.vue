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
const fieldError = ref('')

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    file.value = null
    fieldError.value = ''
    await nextTick()
    fileInput.value?.focus()
  },
)

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
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
    fieldError.value = error instanceof Error ? error.message : '文件读取失败，请重新选择 zip 文件'
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
      <section class="cf-command-modal" role="dialog" aria-modal="true" aria-labelledby="reupload-generator-title">
        <header class="cf-modal-header">
          <h2 id="reupload-generator-title">重新上传生成器</h2>
          <button class="cf-icon-button" type="button" :disabled="loading" aria-label="关闭" @click="close">×</button>
        </header>

        <form class="cf-modal-body" @submit.prevent="submit">
          <p class="cf-modal-note">{{ generatorName }}</p>

          <label class="cf-field">
            <span>新的 Skill zip</span>
            <input ref="fileInput" class="cf-file-control" type="file" accept=".zip,application/zip" @change="handleFileChange">
          </label>

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
