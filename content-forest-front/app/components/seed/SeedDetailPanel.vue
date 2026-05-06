<script setup lang="ts">
import type { SeedDetail } from '../../../src/modules/seed'

const props = defineProps<{
  seed: SeedDetail | null
  loading: boolean
  saving: boolean
  operating: boolean
  error: string
}>()

const emit = defineEmits<{
  save: [payload: { title: string; markdown: string }]
  archive: []
  restore: []
  openWorkspace: []
}>()

const titleDraft = ref('')
const markdownDraft = ref('')
const editMode = ref(false)
const fieldError = ref('')

watch(
  () => props.seed,
  (seed) => {
    titleDraft.value = seed?.title ?? ''
    markdownDraft.value = seed?.markdown ?? ''
    editMode.value = false
    fieldError.value = ''
  },
  { immediate: true },
)

function save() {
  if (!titleDraft.value.trim() || !markdownDraft.value.trim()) {
    fieldError.value = '标题和 Markdown 正文都不能为空'
    return
  }

  fieldError.value = ''
  emit('save', {
    title: titleDraft.value.trim(),
    markdown: markdownDraft.value.trim(),
  })
}

function resetDraft() {
  titleDraft.value = props.seed?.title ?? ''
  markdownDraft.value = props.seed?.markdown ?? ''
  editMode.value = false
  fieldError.value = ''
}
</script>

<template>
  <aside class="cf-seed-detail" aria-label="种子详情">
    <div v-if="loading" class="cf-detail-state">读取种子详情中</div>
    <div v-else-if="!seed" class="cf-detail-state">选择一颗种子查看详情</div>
    <div v-else class="cf-detail-content">
      <div class="cf-detail-kicker">
        <span class="cf-detail-dot" :class="{ 'is-archived': seed.archiveState === 'archived' }" aria-hidden="true" />
        <span>{{ seed.archiveState === 'archived' ? '已归档种子' : '未归档种子' }}</span>
      </div>

      <template v-if="editMode">
        <label class="cf-field">
          <span>标题</span>
          <input v-model="titleDraft" type="text">
        </label>
        <label class="cf-field">
          <span>Markdown 正文</span>
          <textarea v-model="markdownDraft" rows="12" />
        </label>
      </template>
      <template v-else>
        <h2 class="cf-detail-title">{{ seed.title }}</h2>
        <MarkdownViewer :markdown="seed.markdown" />
      </template>

      <ExceptionNotice
        v-if="fieldError || error"
        title="种子操作失败"
        :message="fieldError || error"
      />

      <div class="cf-detail-actions">
        <button class="cf-primary-action cf-action-wide" type="button" :disabled="operating" @click="emit('openWorkspace')">
          打开工作区
        </button>

        <template v-if="editMode">
          <button class="cf-secondary-action" type="button" :disabled="saving" @click="save">
            {{ saving ? '保存中' : '保存编辑' }}
          </button>
          <button class="cf-secondary-action" type="button" :disabled="saving" @click="resetDraft">取消编辑</button>
        </template>
        <template v-else>
          <button class="cf-secondary-action" type="button" @click="editMode = true">编辑</button>
          <button
            v-if="seed.archiveState === 'active'"
            class="cf-danger-action"
            type="button"
            :disabled="operating"
            @click="emit('archive')"
          >
            {{ operating ? '处理中' : '归档' }}
          </button>
          <button
            v-else
            class="cf-secondary-action"
            type="button"
            :disabled="operating"
            @click="emit('restore')"
          >
            {{ operating ? '处理中' : '回档' }}
          </button>
        </template>
      </div>

      <section class="cf-detail-section">
        <h3>Meta</h3>
        <div class="cf-info-row">
          <span>内容位置</span>
          <strong>{{ seed.contentLocation }}</strong>
        </div>
        <div class="cf-info-row">
          <span>根节点</span>
          <strong>{{ seed.rootNodeId }}</strong>
        </div>
        <div class="cf-info-row">
          <span>更新时间</span>
          <strong>{{ new Date(seed.updatedAt).toLocaleString('zh-CN') }}</strong>
        </div>
      </section>
    </div>
  </aside>
</template>
