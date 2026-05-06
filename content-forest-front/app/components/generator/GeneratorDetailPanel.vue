<script setup lang="ts">
import type { GeneratorDetail } from '../../../src/modules/generator'

const props = defineProps<{
  generator: GeneratorDetail | null
  loading: boolean
  operating: boolean
  error: string
}>()

const emit = defineEmits<{
  reupload: []
  enable: []
  disable: []
}>()

const statusLabel = computed(() => {
  if (!props.generator) return ''
  return props.generator.enableState === 'enabled' ? '启用生成器' : '停用生成器'
})

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN')
}
</script>

<template>
  <aside class="cf-seed-detail cf-generator-detail" aria-label="生成器详情">
    <div v-if="loading" class="cf-detail-state">读取生成器详情中</div>
    <div v-else-if="!generator" class="cf-detail-state">选择一个生成器查看详情</div>
    <div v-else class="cf-detail-content">
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

      <ExceptionNotice
        v-if="error"
        title="生成器操作失败"
        :message="error"
      />

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

      <section class="cf-detail-section">
        <h3>Skill 本体</h3>
        <MarkdownViewer :markdown="generator.skillMarkdown" />
      </section>

      <section class="cf-detail-section">
        <h3>文件条目</h3>
        <div v-if="generator.entries.length === 0" class="cf-entry-empty">暂无可展示条目</div>
        <pre v-else class="cf-file-tree">{{ generator.entries.join('\n') }}</pre>
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
    </div>
  </aside>
</template>
