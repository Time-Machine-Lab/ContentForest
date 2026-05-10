<script setup lang="ts">
import ExceptionNotice from '../base/ExceptionNotice.vue'
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
const menuOpen = ref(false)

watch(
  () => props.seed,
  (seed) => {
    titleDraft.value = seed?.title ?? ''
    markdownDraft.value = seed?.markdown ?? ''
    editMode.value = false
    fieldError.value = ''
    menuOpen.value = false
  },
  { immediate: true },
)

const statusLabel = computed(() => {
  if (!props.seed) return ''
  return props.seed.archiveState === 'archived' ? '已归档种子' : '未归档种子'
})

const updatedAtLabel = computed(() => formatDateTime(props.seed?.updatedAt))

const tableOfContents = computed(() => {
  const markdown = props.seed?.markdown ?? ''
  const lines = markdown.split(/\r?\n/)
  const headings: Array<{ id: string; text: string; level: 1 | 2 | 3 }> = []
  let blockIndex = 0
  let inCode = false
  let hasCodeLines = false

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      if (inCode) {
        if (hasCodeLines) blockIndex += 1
        inCode = false
        hasCodeLines = false
      } else {
        inCode = true
      }
      continue
    }

    if (inCode) {
      hasCodeLines = true
      continue
    }

    if (!trimmed) continue

    if (trimmed.startsWith('### ')) {
      headings.push({ id: `seed-doc-${blockIndex}`, text: trimmed.slice(4), level: 3 })
      blockIndex += 1
      continue
    }

    if (trimmed.startsWith('## ')) {
      headings.push({ id: `seed-doc-${blockIndex}`, text: trimmed.slice(3), level: 2 })
      blockIndex += 1
      continue
    }

    if (trimmed.startsWith('# ')) {
      headings.push({ id: `seed-doc-${blockIndex}`, text: trimmed.slice(2), level: 1 })
      blockIndex += 1
      continue
    }

    blockIndex += 1
  }

  if (headings.length <= 1) return []
  return headings.filter((heading) => heading.level > 1)
})

function formatDateTime(value?: string | null) {
  if (!value) return '未提供'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

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

function startEdit() {
  menuOpen.value = false
  editMode.value = true
}

function toggleArchiveState() {
  menuOpen.value = false
  if (props.seed?.archiveState === 'archived') {
    emit('restore')
  } else {
    emit('archive')
  }
}
</script>

<template>
  <section class="cf-seed-detail cf-seed-reader-area" aria-label="种子详情">
    <div v-if="loading" class="cf-detail-state">读取种子详情中</div>
    <div v-else-if="!seed" class="cf-detail-state">选择一颗种子查看详情</div>
    <template v-else>
      <section class="cf-seed-reader" aria-label="种子阅读器">
        <div class="cf-seed-reader-shell">
          <header class="cf-seed-reader-head">
            <div class="cf-seed-reader-title">
              <div class="cf-detail-kicker">
                <span class="cf-detail-dot" :class="{ 'is-archived': seed.archiveState === 'archived' }" aria-hidden="true" />
                <span>{{ statusLabel }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ updatedAtLabel }}</span>
              </div>

              <h2 class="cf-detail-title">{{ seed.title }}</h2>
            </div>

            <div class="cf-seed-reader-actions">
              <button class="cf-primary-action" type="button" :disabled="operating" @click="emit('openWorkspace')">
                {{ operating ? '处理中' : '打开工作区' }}
              </button>
              <button class="cf-icon-button" type="button" aria-label="编辑种子" @click="startEdit">✎</button>
              <div class="cf-seed-more">
                <button
                  class="cf-icon-button"
                  type="button"
                  aria-label="种子更多操作"
                  :aria-expanded="menuOpen"
                  @click="menuOpen = !menuOpen"
                >
                  ⋯
                </button>
                <div v-if="menuOpen" class="cf-seed-more-menu">
                  <button type="button" @click="startEdit">编辑种子</button>
                  <button
                    type="button"
                    :class="{ 'is-danger': seed.archiveState === 'active' }"
                    :disabled="operating"
                    @click="toggleArchiveState"
                  >
                    {{ seed.archiveState === 'archived' ? '回档种子' : '归档种子' }}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <ExceptionNotice
            v-if="fieldError || error"
            title="种子操作失败"
            :message="fieldError || error"
          />

          <section v-if="editMode" class="cf-seed-edit-card" aria-label="编辑种子">
            <label class="cf-field">
              <span>标题</span>
              <input v-model="titleDraft" type="text" :disabled="saving">
            </label>
            <label class="cf-field">
              <span>Markdown 正文</span>
              <textarea v-model="markdownDraft" rows="18" :disabled="saving" />
            </label>
            <footer class="cf-seed-edit-actions">
              <button class="cf-secondary-action" type="button" :disabled="saving" @click="resetDraft">取消</button>
              <button class="cf-primary-action" type="button" :disabled="saving" @click="save">
                {{ saving ? '保存中' : '保存编辑' }}
              </button>
            </footer>
          </section>

          <article v-else class="cf-seed-doc-card">
            <MarkdownViewer :markdown="seed.markdown" heading-id-prefix="seed-doc" />
          </article>
        </div>
      </section>

      <aside class="cf-seed-helper" aria-label="种子辅助信息">
        <section v-if="tableOfContents.length > 0" class="cf-seed-helper-card">
          <h3>文档目录</h3>
          <nav class="cf-seed-toc" aria-label="文档目录">
            <a
              v-for="item in tableOfContents"
              :key="item.id"
              :href="`#${item.id}`"
              :class="`is-level-${item.level}`"
            >
              {{ item.text }}
            </a>
          </nav>
        </section>

        <section class="cf-seed-helper-card">
          <h3>系统事实</h3>
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
            <strong>{{ updatedAtLabel }}</strong>
          </div>
        </section>
      </aside>
    </template>
  </section>
</template>
