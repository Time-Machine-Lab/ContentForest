<script setup lang="ts">
import { readFileAsBase64, type GeneratorEnableState, type GeneratorSummary } from '../../../src/modules/generator'

type GeneratorView = GeneratorEnableState | 'all'

interface ImportFieldErrors {
  name: string
  description: string
  file: string
}

const {
  view,
  query,
  generators,
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

const reuploadModalOpen = ref(false)
const importName = ref('')
const importDescription = ref('')
const importFile = ref<File | null>(null)
const importFileInput = ref<HTMLInputElement | null>(null)
const importDragActive = ref(false)
const importReadError = ref('')
const detailExpanded = ref(false)
const importFieldErrors = reactive<ImportFieldErrors>({
  name: '',
  description: '',
  file: '',
})

const enabledCount = computed(() => generators.value.filter((generator) => generator.enableState === 'enabled').length)
const disabledCount = computed(() => generators.value.filter((generator) => generator.enableState === 'disabled').length)
const needsDescriptionCount = computed(() => generators.value.filter((generator) => !generator.description.trim()).length)
const hasSearch = computed(() => Boolean(query.value.trim()))
const importFileName = computed(() => importFile.value?.name || '等待 zip 文件')
const importSubmitDisabled = computed(() => importLoading.value)

onMounted(async () => {
  await loadGenerators()
  if (!selectedGeneratorId.value && filteredGenerators.value[0]) {
    await selectGenerator(filteredGenerators.value[0].id)
  }
})

watch(filteredGenerators, async (nextGenerators) => {
  if (selectedGeneratorId.value || nextGenerators.length === 0) return
  const firstGenerator = nextGenerators[0]
  if (firstGenerator) await selectGenerator(firstGenerator.id)
})

function changeView(nextView: GeneratorView) {
  view.value = nextView
}

function formatDate(value: string) {
  if (!value) return '未知'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function generatorInitial(generator: Pick<GeneratorSummary, 'name'>) {
  return generator.name.trim().slice(0, 2).toUpperCase() || 'SK'
}

function resetImportErrors() {
  importReadError.value = ''
  importFieldErrors.name = ''
  importFieldErrors.description = ''
  importFieldErrors.file = ''
}

function setImportFile(file: File | null) {
  importFile.value = file
  importReadError.value = ''
  importFieldErrors.file = ''
}

function handleImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  setImportFile(input.files?.[0] ?? null)
}

function handleImportDragOver(event: DragEvent) {
  event.preventDefault()
  if (importLoading.value) return
  importDragActive.value = true
}

function handleImportDragLeave() {
  importDragActive.value = false
}

function handleImportDrop(event: DragEvent) {
  event.preventDefault()
  importDragActive.value = false
  if (importLoading.value) return
  setImportFile(event.dataTransfer?.files?.[0] ?? null)
}

function validateImportFields() {
  importFieldErrors.name = importName.value.trim() ? '' : '请补充生成器名称'
  importFieldErrors.description = importDescription.value.trim() ? '' : '请补充生成器描述'
  importFieldErrors.file = importFile.value ? '' : '请上传 Skill zip 文件'
  return !importFieldErrors.name && !importFieldErrors.description && !importFieldErrors.file
}

async function submitImport() {
  importReadError.value = ''
  if (!validateImportFields() || !importFile.value) return

  try {
    const imported = await importGenerator({
      name: importName.value.trim(),
      description: importDescription.value.trim(),
      zipBase64: await readFileAsBase64(importFile.value),
    })

    if (!imported) return
    importName.value = ''
    importDescription.value = ''
    setImportFile(null)
    if (importFileInput.value) importFileInput.value.value = ''
  } catch (error) {
    importReadError.value = error instanceof Error ? error.message : '文件读取失败，请重新选择 Skill zip'
  }
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
    <header class="cf-page-topbar cf-generator-topbar">
      <div class="cf-page-title">
        <h1>生成器铸造台</h1>
        <p>导入、检查和管理外部 Skill，让枝化生长拥有可选择的内容方法论。</p>
      </div>
      <div class="cf-generator-top-actions">
        <span class="cf-generator-top-stat">{{ enabledCount }} 启用</span>
        <button class="cf-secondary-action" type="button" @click="changeView(view === 'disabled' ? 'enabled' : 'disabled')">
          {{ view === 'disabled' ? '查看启用' : '查看停用' }}
        </button>
        <button class="cf-primary-action" type="button" @click="importFileInput?.click()">导入生成器</button>
      </div>
    </header>

    <div class="cf-generator-worktable" :class="{ 'is-detail-expanded': detailExpanded }">
      <aside class="cf-generator-import-panel" aria-label="导入生成器">
        <header class="cf-generator-panel-head">
          <div>
            <h2>Skill Drop Lab</h2>
            <p>拖入 Skill zip，补全名称和描述后即可导入。</p>
          </div>
          <span class="cf-workspace-chip">ZIP</span>
        </header>

        <label
          class="cf-generator-dropzone"
          :class="{ 'is-dragging': importDragActive, 'has-file': importFile, 'is-error': importFieldErrors.file }"
          @dragover="handleImportDragOver"
          @dragleave="handleImportDragLeave"
          @drop="handleImportDrop"
        >
          <span class="cf-drop-orbit" aria-hidden="true" />
          <span class="cf-drop-core" aria-hidden="true">{{ importFile ? '✓' : '+' }}</span>
          <span class="cf-drop-copy">
            <em v-if="importFile" class="cf-drop-status">文件已选择</em>
            <strong>{{ importFile ? importFile.name : '拖拽 Skill zip 到这里' }}</strong>
            <span>{{ importFile ? '点击或重新拖入可替换文件' : '或点击选择文件，导入前不会上传' }}</span>
          </span>
          <input
            ref="importFileInput"
            class="cf-drop-input"
            type="file"
            accept=".zip,application/zip"
            :disabled="importLoading"
            @change="handleImportFileChange"
          >
        </label>
        <p v-if="importFieldErrors.file" class="cf-field-error">{{ importFieldErrors.file }}</p>

        <div class="cf-generator-import-fields">
          <label class="cf-field" :class="{ 'is-invalid': importFieldErrors.name }">
            <span>
              <strong>生成器名称</strong>
              <em v-if="importFieldErrors.name">{{ importFieldErrors.name }}</em>
            </span>
            <input
              v-model="importName"
              type="text"
              placeholder="例如：小红书产品文案生成器"
              :disabled="importLoading"
              @input="resetImportErrors"
            >
          </label>

          <label class="cf-field" :class="{ 'is-invalid': importFieldErrors.description }">
            <span>
              <strong>生成器描述</strong>
              <em v-if="importFieldErrors.description">{{ importFieldErrors.description }}</em>
            </span>
            <textarea
              v-model="importDescription"
              rows="4"
              placeholder="说明适合的平台、内容形态、创作方法论和边界。"
              :disabled="importLoading"
              @input="resetImportErrors"
            />
          </label>
        </div>

        <ExceptionNotice
          v-if="importReadError || importError"
          title="导入失败"
          :message="importReadError || importError"
        />

        <footer class="cf-generator-import-footer">
          <div
            class="cf-generator-import-status"
            :class="{ 'has-file': importFile, 'is-error': importFieldErrors.file || importReadError || importError }"
          >
            <span class="cf-import-status-dot" aria-hidden="true" />
            <span>{{ importFileName }}</span>
          </div>
          <button class="cf-primary-action" type="button" :disabled="importSubmitDisabled" @click="submitImport">
            {{ importLoading ? '导入中' : '确认导入' }}
          </button>
        </footer>
      </aside>

      <section class="cf-generator-browser" aria-label="生成器浏览">
        <header class="cf-generator-panel-head">
          <div>
            <h2>生成器星图</h2>
            <p>快速扫描状态、用途和更新信息，选择一个生成器查看 Skill 详情。</p>
          </div>
          <span class="cf-workspace-chip">{{ filteredGenerators.length }} / {{ generators.length }}</span>
        </header>

        <div class="cf-generator-toolbar">
          <label class="cf-seed-search cf-generator-search">
            <span aria-hidden="true">⌕</span>
            <input v-model="query" type="search" placeholder="搜索名称或描述">
          </label>

          <div class="cf-view-tabs" aria-label="生成器视图">
            <button class="cf-view-tab" :class="{ 'is-active': view === 'enabled' }" type="button" @click="changeView('enabled')">启用</button>
            <button class="cf-view-tab" :class="{ 'is-active': view === 'disabled' }" type="button" @click="changeView('disabled')">停用</button>
            <button class="cf-view-tab" :class="{ 'is-active': view === 'all' }" type="button" @click="changeView('all')">全部</button>
          </div>
        </div>

        <div class="cf-generator-metrics" aria-label="生成器统计">
          <div class="cf-generator-metric">
            <strong>{{ enabledCount }}</strong>
            <span>启用生成器</span>
          </div>
          <div class="cf-generator-metric">
            <strong>{{ disabledCount }}</strong>
            <span>停用生成器</span>
          </div>
          <div class="cf-generator-metric">
            <strong>{{ needsDescriptionCount }}</strong>
            <span>待补充描述</span>
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
          <strong>{{ hasSearch ? '没有匹配的生成器' : '还没有可展示的生成器' }}</strong>
          <span>{{ hasSearch ? '换个关键词或切换状态视图试试。' : '拖入一个 Skill zip，开始建立内容创作方法库。' }}</span>
          <button v-if="!hasSearch" class="cf-primary-action" type="button" @click="importFileInput?.click()">导入生成器</button>
        </div>
        <div v-else class="cf-generator-card-grid">
          <article
            v-for="generator in filteredGenerators"
            :key="generator.id"
            class="cf-generator-card"
            :class="{ 'is-selected': selectedGeneratorId === generator.id, 'is-disabled': generator.enableState === 'disabled' }"
          >
            <button class="cf-generator-card-main" type="button" @click="selectGenerator(generator.id)">
              <span class="cf-generator-card-head">
                <span class="cf-generator-mark" aria-hidden="true">{{ generatorInitial(generator) }}</span>
                <em class="cf-pill" :class="generator.enableState === 'enabled' ? 'is-enabled' : 'is-disabled'">
                  {{ generator.enableState === 'enabled' ? '启用' : '停用' }}
                </em>
              </span>
              <span class="cf-generator-card-copy">
                <strong>{{ generator.name }}</strong>
                <span>{{ generator.description || '暂无描述' }}</span>
              </span>
              <span class="cf-generator-card-meta">
                <em>{{ formatDate(generator.updatedAt) }}</em>
              </span>
            </button>

            <div class="cf-generator-card-actions">
              <button class="cf-secondary-action" type="button" @click="openReuploadFor(generator.id)">重传</button>
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
        class="cf-generator-inspector"
        :generator="selectedGenerator"
        :loading="detailLoading"
        :operating="operationLoading"
        :error="detailError || operationError"
        :expanded="detailExpanded"
        @reupload="reuploadModalOpen = true"
        @enable="enableSelectedGenerator"
        @disable="disableSelectedGenerator"
        @toggle-expanded="detailExpanded = !detailExpanded"
      />
    </div>

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
