<script setup lang="ts">
import type { NutrientArchiveState, NutrientLibraryScope } from '../../../src/modules/nutrient'
import ExceptionNotice from '../../components/base/ExceptionNotice.vue'
import MarkdownViewer from '../../components/markdown/MarkdownViewer.vue'

type NutrientView = NutrientLibraryScope | 'archived'
type EditorMode = 'read' | 'create' | 'edit'

const {
  view,
  contentView,
  query,
  filteredLibraries,
  selectedLibrary,
  selectedLibraryId,
  contents,
  selectedContent,
  selectedContentId,
  seedOptions,
  listLoading,
  detailLoading,
  contentListLoading,
  contentDetailLoading,
  createLibraryLoading,
  saveLibraryLoading,
  createContentLoading,
  saveContentLoading,
  operationLoading,
  seedOptionsLoading,
  listError,
  detailError,
  contentError,
  createLibraryError,
  createContentError,
  operationError,
  seedOptionsError,
  loadLibraries,
  loadSeedOptions,
  loadContents,
  selectLibrary,
  selectContent,
  createLibrary,
  updateSelectedLibrary,
  archiveSelectedLibrary,
  restoreSelectedLibrary,
  createContent,
  updateSelectedContent,
  archiveSelectedContent,
  restoreSelectedContent,
} = useNutrientLibrary()

const libraryComposerOpen = ref(false)
const libraryScope = ref<NutrientLibraryScope>('public')
const libraryName = ref('')
const libraryDescription = ref('')
const librarySeedId = ref('')
const libraryFormError = ref('')

const libraryMetaEditing = ref(false)
const libraryNameDraft = ref('')
const libraryDescriptionDraft = ref('')

const editorMode = ref<EditorMode>('read')
const contentTitleDraft = ref('')
const contentMarkdownDraft = ref('')
const contentFormError = ref('')

const canMutateLibrary = computed(() => selectedLibrary.value?.archiveState === 'active')
const canCreateContent = computed(() => canMutateLibrary.value && Boolean(selectedLibrary.value))
const contentBusy = computed(() => createContentLoading.value || saveContentLoading.value || operationLoading.value)

onMounted(() => {
  void loadLibraries('public')
})

watch(
  selectedLibrary,
  (library) => {
    libraryNameDraft.value = library?.name ?? ''
    libraryDescriptionDraft.value = library?.description ?? ''
    libraryMetaEditing.value = false
    if (!library) {
      editorMode.value = 'read'
      contentTitleDraft.value = ''
      contentMarkdownDraft.value = ''
    }
  },
  { immediate: true },
)

watch(
  selectedContent,
  (content) => {
    if (!content || editorMode.value === 'create') return
    contentTitleDraft.value = content.title
    contentMarkdownDraft.value = content.markdown
  },
)

async function changeView(nextView: NutrientView) {
  if (view.value === nextView) return
  editorMode.value = 'read'
  libraryComposerOpen.value = false
  await loadLibraries(nextView)
}

function openLibraryComposer() {
  libraryComposerOpen.value = true
  libraryName.value = ''
  libraryDescription.value = ''
  librarySeedId.value = ''
  libraryFormError.value = ''
  if (libraryScope.value === 'seed_scoped') emitSeedLoad()
}

function emitSeedLoad() {
  void loadSeedOptions()
}

async function submitLibrary() {
  if (!libraryName.value.trim()) {
    libraryFormError.value = '营养库名称不能为空'
    return
  }

  if (libraryScope.value === 'seed_scoped' && !librarySeedId.value) {
    libraryFormError.value = '种子专属营养库需要选择归属种子'
    return
  }

  libraryFormError.value = ''
  const created = await createLibrary({
    name: libraryName.value.trim(),
    description: libraryDescription.value.trim(),
    scope: libraryScope.value,
    seedId: libraryScope.value === 'seed_scoped' ? librarySeedId.value : null,
  })

  if (created) {
    libraryComposerOpen.value = false
    editorMode.value = 'create'
    contentTitleDraft.value = ''
    contentMarkdownDraft.value = ''
  }
}

async function saveLibraryMeta() {
  if (!libraryNameDraft.value.trim()) return
  const saved = await updateSelectedLibrary({
    name: libraryNameDraft.value.trim(),
    description: libraryDescriptionDraft.value.trim(),
  })
  if (saved) libraryMetaEditing.value = false
}

async function handleSelectLibrary(libraryId: string) {
  editorMode.value = 'read'
  await selectLibrary(libraryId)
}

async function handleContentView(nextView: NutrientArchiveState) {
  editorMode.value = 'read'
  await loadContents(nextView)
}

async function handleSelectContent(contentId: string) {
  editorMode.value = 'read'
  await selectContent(contentId)
}

function startCreateContent() {
  if (!canCreateContent.value) return
  editorMode.value = 'create'
  contentTitleDraft.value = ''
  contentMarkdownDraft.value = ''
  contentFormError.value = ''
}

function startEditContent() {
  if (!selectedContent.value || selectedContent.value.archiveState === 'archived') return
  editorMode.value = 'edit'
  contentTitleDraft.value = selectedContent.value.title
  contentMarkdownDraft.value = selectedContent.value.markdown
  contentFormError.value = ''
}

async function submitContent() {
  if (!contentTitleDraft.value.trim() || !contentMarkdownDraft.value.trim()) {
    contentFormError.value = '标题和 Markdown 正文都不能为空'
    return
  }

  contentFormError.value = ''
  const payload = {
    title: contentTitleDraft.value.trim(),
    markdown: contentMarkdownDraft.value.trim(),
  }
  const ok = editorMode.value === 'create'
    ? await createContent(payload)
    : await updateSelectedContent(payload)

  if (ok) editorMode.value = 'read'
}

function scopeLabel(scope: NutrientLibraryScope) {
  return scope === 'public' ? '公共' : '种子专属'
}

function stateLabel(archiveState: NutrientArchiveState) {
  return archiveState === 'active' ? '未归档' : '已归档'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<template>
  <section class="cf-nutrient-page">
    <header class="cf-page-topbar">
      <div class="cf-page-title">
        <h1>营养库</h1>
        <p>像整理知识库一样维护可引用资料</p>
      </div>
      <label class="cf-command-button cf-kb-command">
        <span aria-hidden="true">⌕</span>
        <input v-model="query" type="search" placeholder="搜索营养库">
      </label>
      <button class="cf-secondary-action" type="button" @click="openLibraryComposer">新建库</button>
      <button class="cf-primary-action" type="button" :disabled="!canCreateContent" @click="startCreateContent">新建资料</button>
    </header>

    <div class="cf-kb-layout">
      <aside class="cf-kb-sidebar" aria-label="营养库列表">
        <div class="cf-view-tabs cf-kb-tabs" aria-label="营养库视图">
          <button class="cf-view-tab" :class="{ 'is-active': view === 'public' }" type="button" @click="changeView('public')">公共</button>
          <button class="cf-view-tab" :class="{ 'is-active': view === 'seed_scoped' }" type="button" @click="changeView('seed_scoped')">专属</button>
          <button class="cf-view-tab" :class="{ 'is-active': view === 'archived' }" type="button" @click="changeView('archived')">归档</button>
        </div>

        <section v-if="libraryComposerOpen" class="cf-kb-composer" aria-label="新建营养库">
          <div class="cf-scope-grid">
            <button class="cf-scope-option" :class="{ 'is-active': libraryScope === 'public' }" type="button" @click="libraryScope = 'public'">
              <strong>公共</strong>
              <span>任意种子可引用</span>
            </button>
            <button class="cf-scope-option" :class="{ 'is-active': libraryScope === 'seed_scoped' }" type="button" @click="libraryScope = 'seed_scoped'; emitSeedLoad()">
              <strong>专属</strong>
              <span>绑定一个种子</span>
            </button>
          </div>

          <label class="cf-field">
            <span>库名称</span>
            <input v-model="libraryName" type="text" placeholder="例如：小红书平台资料">
          </label>
          <label class="cf-field">
            <span>描述</span>
            <textarea v-model="libraryDescription" rows="3" placeholder="可选" />
          </label>
          <label v-if="libraryScope === 'seed_scoped'" class="cf-field">
            <span>归属种子</span>
            <select v-model="librarySeedId" class="cf-select-control" :disabled="seedOptionsLoading">
              <option value="">{{ seedOptionsLoading ? '读取种子中' : '选择种子' }}</option>
              <option v-for="seed in seedOptions" :key="seed.id" :value="seed.id">{{ seed.title }}</option>
            </select>
          </label>
          <ExceptionNotice v-if="libraryFormError || createLibraryError || seedOptionsError" title="新建库失败" :message="libraryFormError || createLibraryError || seedOptionsError" />
          <div class="cf-kb-inline-actions">
            <button class="cf-secondary-action" type="button" :disabled="createLibraryLoading" @click="libraryComposerOpen = false">取消</button>
            <button class="cf-primary-action" type="button" :disabled="createLibraryLoading" @click="submitLibrary">
              {{ createLibraryLoading ? '创建中' : '创建' }}
            </button>
          </div>
        </section>

        <ExceptionNotice v-if="listError" title="营养库读取失败" :message="listError" action-label="重试" @action="loadLibraries(view)" />

        <div v-if="listLoading" class="cf-kb-state">读取营养库中</div>
        <div v-else-if="filteredLibraries.length === 0" class="cf-kb-state">
          <strong>{{ query ? '没有匹配的库' : '还没有营养库' }}</strong>
          <span>{{ query ? '换个关键词。' : '先创建一个库，再往里面写资料。' }}</span>
          <button v-if="!query && view !== 'archived'" class="cf-secondary-action" type="button" @click="openLibraryComposer">新建库</button>
        </div>
        <div v-else class="cf-kb-library-list">
          <button
            v-for="library in filteredLibraries"
            :key="library.id"
            class="cf-kb-library-item"
            :class="{ 'is-selected': selectedLibraryId === library.id, 'is-archived': library.archiveState === 'archived' }"
            type="button"
            @click="handleSelectLibrary(library.id)"
          >
            <span class="cf-kb-item-title">{{ library.name }}</span>
            <span class="cf-kb-item-desc">{{ library.description || '暂无描述' }}</span>
            <span class="cf-row-meta">
              <em class="cf-pill" :class="library.scope === 'public' ? 'is-enabled' : ''">{{ scopeLabel(library.scope) }}</em>
              <em class="cf-pill" :class="library.archiveState === 'active' ? 'is-enabled' : 'is-disabled'">{{ stateLabel(library.archiveState) }}</em>
            </span>
          </button>
        </div>
      </aside>

      <section class="cf-kb-docs" aria-label="营养资料列表">
        <div v-if="detailLoading" class="cf-kb-state">读取库详情中</div>
        <div v-else-if="!selectedLibrary" class="cf-kb-state">
          <strong>选择一个库</strong>
          <span>资料列表和正文会在这里展开。</span>
        </div>
        <template v-else>
          <div class="cf-kb-library-head">
            <div v-if="!libraryMetaEditing" class="cf-kb-library-title">
              <strong>{{ selectedLibrary.name }}</strong>
              <span>{{ selectedLibrary.description || '暂无描述' }}</span>
            </div>
            <div v-else class="cf-kb-library-edit">
              <input v-model="libraryNameDraft" type="text" placeholder="库名称">
              <textarea v-model="libraryDescriptionDraft" rows="2" placeholder="描述" />
            </div>

            <div class="cf-kb-inline-actions">
              <template v-if="libraryMetaEditing">
                <button class="cf-secondary-action" type="button" :disabled="saveLibraryLoading" @click="libraryMetaEditing = false">取消</button>
                <button class="cf-primary-action" type="button" :disabled="saveLibraryLoading" @click="saveLibraryMeta">
                  {{ saveLibraryLoading ? '保存中' : '保存' }}
                </button>
              </template>
              <template v-else>
                <button class="cf-secondary-action" type="button" :disabled="!canMutateLibrary" @click="libraryMetaEditing = true">编辑库</button>
                <button v-if="selectedLibrary.archiveState === 'active'" class="cf-danger-action" type="button" :disabled="operationLoading" @click="archiveSelectedLibrary">归档</button>
                <button v-else class="cf-secondary-action" type="button" :disabled="operationLoading" @click="restoreSelectedLibrary">回档</button>
              </template>
            </div>
          </div>

          <ExceptionNotice v-if="detailError || operationError" title="营养库操作失败" :message="detailError || operationError" />

          <div class="cf-kb-doc-toolbar">
            <div class="cf-view-tabs" aria-label="营养内容视图">
              <button class="cf-view-tab" :class="{ 'is-active': contentView === 'active' }" type="button" @click="handleContentView('active')">未归档</button>
              <button class="cf-view-tab" :class="{ 'is-active': contentView === 'archived' }" type="button" @click="handleContentView('archived')">已归档</button>
            </div>
            <button class="cf-primary-action" type="button" :disabled="!canCreateContent" @click="startCreateContent">新建资料</button>
          </div>

          <ExceptionNotice v-if="contentError" title="营养内容读取失败" :message="contentError" action-label="重试" @action="loadContents(contentView)" />

          <div v-if="contentListLoading" class="cf-kb-state">读取资料中</div>
          <div v-else-if="contents.length === 0" class="cf-kb-state">
            <strong>{{ contentView === 'active' ? '还没有资料' : '没有已归档资料' }}</strong>
            <span>{{ contentView === 'active' ? '直接新建一条 Markdown 资料。' : '归档后的资料会在这里。' }}</span>
            <button v-if="contentView === 'active' && canCreateContent" class="cf-secondary-action" type="button" @click="startCreateContent">新建资料</button>
          </div>
          <div v-else class="cf-kb-doc-list">
            <button
              v-for="item in contents"
              :key="item.id"
              class="cf-kb-doc-item"
              :class="{ 'is-selected': selectedContentId === item.id, 'is-archived': item.archiveState === 'archived' }"
              type="button"
              @click="handleSelectContent(item.id)"
            >
              <span class="cf-kb-doc-icon" aria-hidden="true">◇</span>
              <span class="cf-kb-doc-copy">
                <strong>{{ item.title }}</strong>
                <span>
                  {{ stateLabel(item.archiveState) }} · 更新于 {{ formatDate(item.updatedAt) }}
                </span>
              </span>
            </button>
          </div>
        </template>
      </section>

      <main class="cf-kb-reader" aria-label="营养资料正文">
        <div v-if="contentDetailLoading" class="cf-kb-state">读取正文中</div>
        <section v-else-if="editorMode === 'create' || editorMode === 'edit'" class="cf-kb-editor">
          <header class="cf-kb-reader-head">
            <div>
              <strong>{{ editorMode === 'create' ? '新建资料' : '编辑资料' }}</strong>
              <span>{{ selectedLibrary?.name }}</span>
            </div>
            <div class="cf-kb-inline-actions">
              <button class="cf-secondary-action" type="button" :disabled="contentBusy" @click="editorMode = 'read'">取消</button>
              <button class="cf-primary-action" type="button" :disabled="contentBusy" @click="submitContent">
                {{ contentBusy ? '保存中' : '保存资料' }}
              </button>
            </div>
          </header>
          <label class="cf-field">
            <span>标题</span>
            <input v-model="contentTitleDraft" type="text" placeholder="例如：小红书壁纸号标题拆解">
          </label>
          <label class="cf-field cf-kb-markdown-field">
            <span>Markdown 正文</span>
            <textarea v-model="contentMarkdownDraft" class="cf-kb-markdown-editor" placeholder="粘贴或手写营养资料正文。" />
          </label>
          <ExceptionNotice v-if="contentFormError || createContentError || contentError" title="资料保存失败" :message="contentFormError || createContentError || contentError" />
        </section>

        <section v-else-if="selectedContent" class="cf-kb-reader-content">
          <header class="cf-kb-reader-head">
            <div>
              <strong>{{ selectedContent.title }}</strong>
              <span>
                {{ stateLabel(selectedContent.archiveState) }} · 更新于 {{ formatDate(selectedContent.updatedAt) }}
              </span>
            </div>
            <div class="cf-kb-inline-actions">
              <button class="cf-secondary-action" type="button" :disabled="selectedContent.archiveState === 'archived'" @click="startEditContent">编辑</button>
              <button v-if="selectedContent.archiveState === 'active'" class="cf-danger-action" type="button" :disabled="operationLoading" @click="archiveSelectedContent">归档</button>
              <button v-else class="cf-secondary-action" type="button" :disabled="operationLoading" @click="restoreSelectedContent">回档</button>
            </div>
          </header>
          <MarkdownViewer :markdown="selectedContent.markdown" />
        </section>

        <div v-else class="cf-kb-state">
          <strong>{{ selectedLibrary ? '选择或新建资料' : '打开一个营养库' }}</strong>
          <span>{{ selectedLibrary ? '正文会在右侧直接阅读和编辑。' : '先从左侧选择一个库。' }}</span>
          <button v-if="canCreateContent" class="cf-primary-action" type="button" @click="startCreateContent">新建资料</button>
        </div>
      </main>
    </div>
  </section>
</template>
