<script setup lang="ts">
import type { GeneratorDetail } from '../../../src/modules/generator'

const props = defineProps<{
  generator: GeneratorDetail | null
  loading: boolean
  operating: boolean
  error: string
  expanded: boolean
}>()

const emit = defineEmits<{
  reupload: []
  enable: []
  disable: []
  toggleExpanded: []
}>()

const statusLabel = computed(() => {
  if (!props.generator) return ''
  return props.generator.enableState === 'enabled' ? '启用生成器' : '停用生成器'
})

function formatDate(value?: string | null) {
  if (!value) return '未提供'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
</script>

<template>
  <aside class="cf-seed-detail cf-generator-detail" aria-label="生成器详情">
    <button
      class="cf-generator-drawer-toggle"
      type="button"
      :aria-expanded="expanded"
      :aria-label="expanded ? '收起生成器详情' : '展开生成器详情'"
      @click="emit('toggleExpanded')"
    >
      <span>{{ expanded ? '>' : '<' }}</span>
      <strong>{{ expanded ? '收起' : '展开' }}</strong>
    </button>

    <div v-if="loading" class="cf-detail-state">读取生成器详情中</div>
    <div v-else-if="!generator" class="cf-detail-state">选择一个生成器查看详情</div>
    <div v-else class="cf-detail-content cf-generator-detail-content">
      <section class="cf-generator-detail-hero">
        <div class="cf-detail-kicker">
          <span
            class="cf-detail-dot"
            :class="{ 'is-disabled': generator.enableState === 'disabled' }"
            aria-hidden="true"
          />
          <span>{{ statusLabel }}</span>
        </div>

        <h2 class="cf-detail-title">{{ generator.name }}</h2>
        <p class="cf-detail-summary">{{ generator.description }}</p>
      </section>

      <ExceptionNotice
        v-if="error"
        title="生成器操作失败"
        :message="error"
      />

      <section class="cf-detail-section">
        <h3>Skill Markdown</h3>
        <MarkdownViewer :markdown="generator.skillMarkdown" />
      </section>

      <section class="cf-detail-section">
        <h3>文件条目</h3>
        <div v-if="generator.entries.length === 0" class="cf-entry-empty">暂无可展示条目</div>
        <div v-else class="cf-generator-file-list">
          <div v-for="entry in generator.entries" :key="entry" class="cf-generator-file-row">
            <span>{{ entry }}</span>
          </div>
        </div>
      </section>

      <section class="cf-detail-section">
        <h3>系统事实</h3>
        <div class="cf-info-row">
          <span>内容位置</span>
          <strong>{{ generator.contentLocation }}</strong>
        </div>
        <div class="cf-info-row">
          <span>状态</span>
          <strong>{{ generator.enableState === 'enabled' ? '启用' : '停用' }}</strong>
        </div>
        <div class="cf-info-row">
          <span>更新时间</span>
          <strong>{{ formatDate(generator.updatedAt) }}</strong>
        </div>
        <div v-if="generator.disabledAt" class="cf-info-row">
          <span>停用时间</span>
          <strong>{{ formatDate(generator.disabledAt) }}</strong>
        </div>
      </section>

      <section class="cf-detail-section">
        <h3>管理动作</h3>
        <div class="cf-detail-actions">
          <button class="cf-secondary-action" type="button" :disabled="operating" @click="emit('reupload')">
            重新上传
          </button>
          <button
            v-if="generator.enableState === 'enabled'"
            class="cf-danger-action"
            type="button"
            :disabled="operating"
            @click="emit('disable')"
          >
            {{ operating ? '处理中' : '停用' }}
          </button>
          <button
            v-else
            class="cf-secondary-action"
            type="button"
            :disabled="operating"
            @click="emit('enable')"
          >
            {{ operating ? '处理中' : '启用' }}
          </button>
        </div>
      </section>
    </div>
  </aside>
</template>
