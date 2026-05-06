<script setup lang="ts">
import { readFileAsBase64 } from '../../../src/modules/generator'

const emit = defineEmits<{
  close: []
  import: [payload: { name: string; description: string; zipBase64: string }]
}>()

const props = defineProps<{
  open: boolean
  loading: boolean
  error: string
}>()

const name = ref('')
const description = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
const fieldError = ref('')

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    name.value = ''
    description.value = ''
    file.value = null
    fieldError.value = ''
    await nextTick()
    nameInput.value?.focus()
  },
)

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
}

async function submit() {
  if (!name.value.trim() || !description.value.trim() || !file.value) {
    fieldError.value = '名称、描述和 zip 文件都不能为空'
    return
  }

  fieldError.value = ''

  try {
    emit('import', {
      name: name.value.trim(),
      description: description.value.trim(),
      zipBase64: await readFileAsBase64(file.value),
    })
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
      <section class="cf-command-modal" role="dialog" aria-modal="true" aria-labelledby="import-generator-title">
        <header class="cf-modal-header">
          <h2 id="import-generator-title">导入生成器</h2>
          <button class="cf-icon-button" type="button" :disabled="loading" aria-label="关闭" @click="close">×</button>
        </header>

        <form class="cf-modal-body" @submit.prevent="submit">
          <label class="cf-field">
            <span>名称</span>
            <input ref="nameInput" v-model="name" type="text" placeholder="例如：小红书产品文案生成器">
          </label>

          <label class="cf-field">
            <span>描述</span>
            <textarea
              v-model="description"
              rows="5"
              placeholder="简要说明这个生成器适合什么内容创作方法。"
            />
          </label>

          <label class="cf-field">
            <span>Skill zip</span>
            <input ref="fileInput" class="cf-file-control" type="file" accept=".zip,application/zip" @change="handleFileChange">
          </label>

          <ExceptionNotice
            v-if="fieldError || error"
            title="导入失败"
            :message="fieldError || error"
          />

          <footer class="cf-modal-footer">
            <button class="cf-secondary-action" type="button" :disabled="loading" @click="close">取消</button>
            <button class="cf-primary-action" type="submit" :disabled="loading">
              {{ loading ? '导入中' : '确认导入' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>
