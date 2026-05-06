<script setup lang="ts">
import type { GeneratorEnableState } from '../../../src/modules/generator'

type GeneratorView = GeneratorEnableState | 'all'

const {
  view,
  query,
  filteredGenerators,
  selectedGenerator,
  selectedGeneratorId,
  listLoading,
  detailLoading,
  importLoading,
  reuploadLoading,
  operationLoading,
  listError,
  detailError,
  importError,
  reuploadError,
  operationError,
  loadGenerators,
  selectGenerator,
  importGenerator,
  reuploadSelectedGenerator,
  enableSelectedGenerator,
  disableSelectedGenerator,
} = useGeneratorManagement()

const importModalOpen = ref(false)
const reuploadModalOpen = ref(false)

onMounted(() => {
  void loadGenerators()
})

function changeView(nextView: GeneratorView) {
  view.value = nextView
}

async function handleImport(payload: { name: string; description: string; zipBase64: string }) {
  const imported = await importGenerator(payload)
  if (imported) importModalOpen.value = false
}

async function handleReupload(zipBase64: string) {
  const uploaded = await reuploadSelectedGenerator(zipBase64)
  if (uploaded) reuploadModalOpen.value = false
}

async function openReuploadFor(generatorId: string) {
  await selectGenerator(generatorId)
  if (selectedGenerator.value) reuploadModalOpen.value = true
}
</script>

<template>
  <section class="cf-generator-page">
    <header class="cf-page-topbar">
      <div class="cf-page-title">
        <h1>生成器</h1>
        <p>管理外部 Skill，让枝化生长拥有可选择的方法论</p>
      </div>
      <button class="cf-command-button" type="button" @click="importModalOpen = true">
        <span aria-hidden="true">⌕</span>
        <span>上传 Skill zip，补充名称和描述</span>
        <span class="cf-kbd">G</span>
      </button>
      <button class="cf-primary-action" type="button" @click="importModalOpen = true">导入生成器</button>
    </header>

    <div class="cf-generator-layout">
      <section class="cf-generator-main" aria-label="生成器资源管理">
        <div class="cf-seed-toolbar">
          <label class="cf-seed-search">
            <span aria-hidden="true">⌕</span>
            <input v-model="query" type="search" placeholder="筛选生成器">
          </label>

          <div class="cf-view-tabs" aria-label="生成器视图">
            <button
              class="cf-view-tab"
              :class="{ 'is-active': view === 'enabled' }"
              type="button"
              @click="changeView('enabled')"
            >
              启用
            </button>
            <button
              class="cf-view-tab"
              :class="{ 'is-active': view === 'disabled' }"
              type="button"
              @click="changeView('disabled')"
            >
              停用
            </button>
            <button
              class="cf-view-tab"
              :class="{ 'is-active': view === 'all' }"
              type="button"
              @click="changeView('all')"
            >
              全部
            </button>
          </div>
        </div>

        <ExceptionNotice
          v-if="listError"
          title="生成器列表读取失败"
          :message="listError"
          action-label="重试"
          @action="loadGenerators"
        />

        <div v-if="listLoading" class="cf-grid-state">读取生成器中</div>
        <div v-else-if="filteredGenerators.length === 0" class="cf-grid-state">
          <strong>{{ query ? '没有匹配的生成器' : '还没有可展示的生成器' }}</strong>
          <span>{{ query ? '换个关键词试试。' : '导入一个 Skill zip，开始建立内容创作方法库。' }}</span>
          <button v-if="!query" class="cf-primary-action" type="button" @click="importModalOpen = true">导入生成器</button>
        </div>
        <div v-else class="cf-generator-list">
          <article
            v-for="generator in filteredGenerators"
            :key="generator.id"
            class="cf-generator-row"
            :class="{ 'is-selected': selectedGeneratorId === generator.id }"
          >
            <button class="cf-generator-pick" type="button" @click="selectGenerator(generator.id)">
              <span class="cf-generator-mark" aria-hidden="true">{{ generator.name.slice(0, 1) }}</span>
              <span class="cf-generator-copy">
                <strong>{{ generator.name }}</strong>
                <span>{{ generator.description }}</span>
                <span class="cf-row-meta">
                  <em class="cf-pill" :class="generator.enableState === 'enabled' ? 'is-enabled' : 'is-disabled'">
                    {{ generator.enableState === 'enabled' ? '启用' : '停用' }}
                  </em>
                  <em class="cf-pill">{{ generator.contentLocation }}</em>
                </span>
              </span>
            </button>

            <div class="cf-row-actions">
              <button
                class="cf-secondary-action"
                type="button"
                @click="openReuploadFor(generator.id)"
              >
                重新上传
              </button>
              <button
                v-if="generator.enableState === 'enabled'"
                class="cf-danger-action"
                type="button"
                :disabled="operationLoading"
                @click="disableSelectedGenerator(generator.id)"
              >
                停用
              </button>
              <button
                v-else
                class="cf-secondary-action"
                type="button"
                :disabled="operationLoading"
                @click="enableSelectedGenerator(generator.id)"
              >
                启用
              </button>
            </div>
          </article>
        </div>
      </section>

      <GeneratorDetailPanel
        :generator="selectedGenerator"
        :loading="detailLoading"
        :operating="operationLoading"
        :error="detailError || operationError"
        @reupload="reuploadModalOpen = true"
        @enable="enableSelectedGenerator"
        @disable="disableSelectedGenerator"
      />
    </div>

    <GeneratorImportModal
      :open="importModalOpen"
      :loading="importLoading"
      :error="importError"
      @close="importModalOpen = false"
      @import="handleImport"
    />

    <GeneratorReuploadModal
      :open="reuploadModalOpen"
      :loading="reuploadLoading"
      :error="reuploadError"
      :generator-name="selectedGenerator?.name ?? ''"
      @close="reuploadModalOpen = false"
      @reupload="handleReupload"
    />
  </section>
</template>
