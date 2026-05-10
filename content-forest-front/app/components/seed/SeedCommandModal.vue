<script setup lang="ts">
import ExceptionNotice from '../base/ExceptionNotice.vue'

const emit = defineEmits<{
  close: []
  create: [payload: { title: string; markdown: string }]
}>()

const props = defineProps<{
  open: boolean
  loading: boolean
  error: string
}>()

const title = ref('')
const markdown = ref('')
const fieldError = ref('')
const titleInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    fieldError.value = ''
    await nextTick()
    titleInput.value?.focus()
  },
)

function submit() {
  if (!title.value.trim() || !markdown.value.trim()) {
    fieldError.value = '标题和 Markdown 正文都不能为空'
    return
  }

  fieldError.value = ''
  emit('create', {
    title: title.value.trim(),
    markdown: markdown.value.trim(),
  })
}

function close() {
  if (props.loading) return
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="cf-modal-backdrop" role="presentation" @click.self="close">
      <section class="cf-command-modal" role="dialog" aria-modal="true" aria-labelledby="new-seed-title">
        <header class="cf-modal-header">
          <h2 id="new-seed-title">新建种子</h2>
          <button class="cf-icon-button" type="button" :disabled="loading" aria-label="关闭" @click="close">×</button>
        </header>

        <form class="cf-modal-body" @submit.prevent="submit">
          <label class="cf-field">
            <span>标题</span>
            <input ref="titleInput" v-model="title" type="text" placeholder="例如：AI 壁纸产品推广">
          </label>

          <label class="cf-field">
            <span>Markdown 正文</span>
            <textarea
              v-model="markdown"
              rows="8"
              placeholder="写下你的想法、产品、项目或宣传内容。"
            />
          </label>

          <ExceptionNotice
            v-if="fieldError || error"
            title="创建失败"
            :message="fieldError || error"
          />

          <footer class="cf-modal-footer">
            <button class="cf-secondary-action" type="button" :disabled="loading" @click="close">取消</button>
            <button class="cf-primary-action" type="submit" :disabled="loading">
              {{ loading ? '创建中' : '创建种子' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>
