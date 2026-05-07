import { createNutrientApi, type NutrientArchiveState, type NutrientContentDetail, type NutrientContentSummary, type NutrientFetcher, type NutrientLibraryDetail, type NutrientLibraryScope, type NutrientLibrarySummary } from '../../src/modules/nutrient'
import { createSeedApi, type SeedFetcher, type SeedSummary } from '../../src/modules/seed'

type NutrientView = NutrientLibraryScope | 'archived'

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }

  if (String(error).includes('Failed to fetch')) {
    return '无法连接后端服务，请确认后端已在 3001 端口启动'
  }
  if (error instanceof Error) return error.message
  return '操作失败，请稍后重试'
}

function ensureLibraryList(payload: unknown): NutrientLibrarySummary[] {
  if (Array.isArray(payload)) return payload
  throw new Error('营养库列表响应格式异常，请确认后端营养库 API 已启动')
}

function ensureContentList(payload: unknown): NutrientContentSummary[] {
  if (Array.isArray(payload)) return payload
  throw new Error('营养内容列表响应格式异常，请确认后端营养内容 API 已启动')
}

function ensureSeedList(payload: unknown): SeedSummary[] {
  if (Array.isArray(payload)) return payload
  throw new Error('种子列表响应格式异常，请确认后端种子 API 已启动')
}

function libraryQuery(view: NutrientView) {
  if (view === 'archived') return { archiveState: 'archived' as NutrientArchiveState }
  return { scope: view, archiveState: 'active' as NutrientArchiveState }
}

function updateLibraryList(libraries: NutrientLibrarySummary[], library: NutrientLibraryDetail, view: NutrientView) {
  const belongsToView = view === 'archived'
    ? library.archiveState === 'archived'
    : library.archiveState === 'active' && library.scope === view
  const rest = libraries.filter((item) => item.id !== library.id)
  return belongsToView
    ? [library, ...rest].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    : rest
}

function updateContentList(contents: NutrientContentSummary[], content: NutrientContentDetail, view: NutrientArchiveState) {
  const rest = contents.filter((item) => item.id !== content.id)
  return content.archiveState === view
    ? [content, ...rest].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    : rest
}

export function useNutrientLibrary() {
  const runtimeConfig = useRuntimeConfig()
  const apiBase = String(runtimeConfig.public.apiBase || '')
  const fetcher: NutrientFetcher = (url, options) => $fetch(url, {
    method: options?.method,
    body: options?.body,
  })
  const seedFetcher: SeedFetcher = (url, options) => $fetch(url, {
    method: options?.method,
    body: options?.body,
  })
  const api = createNutrientApi(fetcher, apiBase)
  const seedApi = createSeedApi(seedFetcher, apiBase)

  const view = ref<NutrientView>('public')
  const contentView = ref<NutrientArchiveState>('active')
  const query = ref('')
  const libraries = ref<NutrientLibrarySummary[]>([])
  const selectedLibrary = ref<NutrientLibraryDetail | null>(null)
  const selectedLibraryId = ref('')
  const contents = ref<NutrientContentSummary[]>([])
  const selectedContent = ref<NutrientContentDetail | null>(null)
  const selectedContentId = ref('')
  const seedOptions = ref<SeedSummary[]>([])

  const listLoading = ref(false)
  const detailLoading = ref(false)
  const contentListLoading = ref(false)
  const contentDetailLoading = ref(false)
  const createLibraryLoading = ref(false)
  const saveLibraryLoading = ref(false)
  const createContentLoading = ref(false)
  const saveContentLoading = ref(false)
  const operationLoading = ref(false)
  const seedOptionsLoading = ref(false)

  const listError = ref('')
  const detailError = ref('')
  const contentError = ref('')
  const createLibraryError = ref('')
  const createContentError = ref('')
  const operationError = ref('')
  const seedOptionsError = ref('')

  const filteredLibraries = computed(() => {
    const search = query.value.trim().toLowerCase()
    if (!search) return libraries.value
    return libraries.value.filter((library) => {
      return library.name.toLowerCase().includes(search)
        || library.description.toLowerCase().includes(search)
        || (library.seedId?.toLowerCase().includes(search) ?? false)
    })
  })

  async function loadLibraries(nextView = view.value) {
    view.value = nextView
    listLoading.value = true
    listError.value = ''
    operationError.value = ''

    try {
      libraries.value = ensureLibraryList(await api.listLibraries(libraryQuery(nextView)))

      const selectedStillVisible = libraries.value.some((library) => library.id === selectedLibraryId.value)
      if (!selectedStillVisible) {
        selectedLibraryId.value = ''
        selectedLibrary.value = null
        contents.value = []
        selectedContentId.value = ''
        selectedContent.value = null
      }
    } catch (error) {
      listError.value = errorMessage(error)
    } finally {
      listLoading.value = false
    }
  }

  async function loadSeedOptions() {
    seedOptionsLoading.value = true
    seedOptionsError.value = ''

    try {
      seedOptions.value = ensureSeedList(await seedApi.listActiveSeeds())
    } catch (error) {
      seedOptionsError.value = errorMessage(error)
    } finally {
      seedOptionsLoading.value = false
    }
  }

  async function loadContents(nextContentView = contentView.value) {
    if (!selectedLibraryId.value) return

    contentView.value = nextContentView
    contentListLoading.value = true
    contentError.value = ''

    try {
      contents.value = ensureContentList(await api.listContents(selectedLibraryId.value, { archiveState: nextContentView }))
      const selectedStillVisible = contents.value.some((content) => content.id === selectedContentId.value)
      if (!selectedStillVisible) {
        selectedContentId.value = ''
        selectedContent.value = null
      }
    } catch (error) {
      contentError.value = errorMessage(error)
    } finally {
      contentListLoading.value = false
    }
  }

  async function selectLibrary(libraryId: string) {
    selectedLibraryId.value = libraryId
    selectedLibrary.value = null
    selectedContentId.value = ''
    selectedContent.value = null
    detailLoading.value = true
    detailError.value = ''
    operationError.value = ''

    try {
      selectedLibrary.value = await api.getLibrary(libraryId)
      contentView.value = 'active'
      await loadContents('active')
    } catch (error) {
      detailError.value = errorMessage(error)
    } finally {
      detailLoading.value = false
    }
  }

  async function selectContent(contentId: string) {
    selectedContentId.value = contentId
    selectedContent.value = null
    contentDetailLoading.value = true
    contentError.value = ''

    try {
      selectedContent.value = await api.getContent(contentId)
    } catch (error) {
      contentError.value = errorMessage(error)
    } finally {
      contentDetailLoading.value = false
    }
  }

  async function createLibrary(payload: { name: string; description: string; scope: NutrientLibraryScope; seedId?: string | null }) {
    createLibraryLoading.value = true
    createLibraryError.value = ''

    try {
      const created = await api.createLibrary({
        name: payload.name,
        description: payload.description,
        scope: payload.scope,
        seedId: payload.scope === 'seed_scoped' ? payload.seedId ?? null : null,
      })
      libraries.value = updateLibraryList(libraries.value, created, view.value)
      selectedLibraryId.value = created.id
      selectedLibrary.value = created
      contentView.value = 'active'
      contents.value = []
      selectedContentId.value = ''
      selectedContent.value = null
      return true
    } catch (error) {
      createLibraryError.value = errorMessage(error)
      return false
    } finally {
      createLibraryLoading.value = false
    }
  }

  async function updateSelectedLibrary(payload: { name: string; description: string }) {
    if (!selectedLibrary.value) return false

    saveLibraryLoading.value = true
    detailError.value = ''

    try {
      const updated = await api.updateLibrary(selectedLibrary.value.id, payload)
      selectedLibrary.value = updated
      libraries.value = updateLibraryList(libraries.value, updated, view.value)
      return true
    } catch (error) {
      detailError.value = errorMessage(error)
      return false
    } finally {
      saveLibraryLoading.value = false
    }
  }

  async function archiveSelectedLibrary() {
    if (!selectedLibrary.value) return

    operationLoading.value = true
    operationError.value = ''

    try {
      const updated = await api.archiveLibrary(selectedLibrary.value.id)
      selectedLibrary.value = updated
      libraries.value = updateLibraryList(libraries.value, updated, view.value)
      if (view.value !== 'archived') {
        selectedLibraryId.value = ''
        selectedLibrary.value = null
        contents.value = []
      }
    } catch (error) {
      operationError.value = errorMessage(error)
    } finally {
      operationLoading.value = false
    }
  }

  async function restoreSelectedLibrary() {
    if (!selectedLibrary.value) return

    operationLoading.value = true
    operationError.value = ''

    try {
      const updated = await api.restoreLibrary(selectedLibrary.value.id)
      selectedLibrary.value = updated
      libraries.value = updateLibraryList(libraries.value, updated, view.value)
      if (view.value === 'archived') {
        selectedLibraryId.value = ''
        selectedLibrary.value = null
        contents.value = []
      }
    } catch (error) {
      operationError.value = errorMessage(error)
    } finally {
      operationLoading.value = false
    }
  }

  async function createContent(payload: { title: string; markdown: string }) {
    if (!selectedLibrary.value) return false

    createContentLoading.value = true
    createContentError.value = ''

    try {
      const created = await api.createContent(selectedLibrary.value.id, payload)
      contents.value = updateContentList(contents.value, created, contentView.value)
      selectedContentId.value = created.id
      selectedContent.value = created
      selectedLibrary.value = { ...selectedLibrary.value, contentCount: selectedLibrary.value.contentCount + 1 }
      return true
    } catch (error) {
      createContentError.value = errorMessage(error)
      return false
    } finally {
      createContentLoading.value = false
    }
  }

  async function updateSelectedContent(payload: { title: string; markdown: string }) {
    if (!selectedContent.value) return false

    saveContentLoading.value = true
    contentError.value = ''

    try {
      const updated = await api.updateContent(selectedContent.value.id, payload)
      selectedContent.value = updated
      contents.value = updateContentList(contents.value, updated, contentView.value)
      return true
    } catch (error) {
      contentError.value = errorMessage(error)
      return false
    } finally {
      saveContentLoading.value = false
    }
  }

  async function archiveSelectedContent() {
    if (!selectedContent.value) return

    operationLoading.value = true
    operationError.value = ''

    try {
      const updated = await api.archiveContent(selectedContent.value.id)
      selectedContent.value = updated
      contents.value = updateContentList(contents.value, updated, contentView.value)
      if (contentView.value !== 'archived') {
        selectedContentId.value = ''
        selectedContent.value = null
      }
    } catch (error) {
      operationError.value = errorMessage(error)
    } finally {
      operationLoading.value = false
    }
  }

  async function restoreSelectedContent() {
    if (!selectedContent.value) return

    operationLoading.value = true
    operationError.value = ''

    try {
      const updated = await api.restoreContent(selectedContent.value.id)
      selectedContent.value = updated
      contents.value = updateContentList(contents.value, updated, contentView.value)
      if (contentView.value === 'archived') {
        selectedContentId.value = ''
        selectedContent.value = null
      }
    } catch (error) {
      operationError.value = errorMessage(error)
    } finally {
      operationLoading.value = false
    }
  }

  async function listReferableNutrients(seedId: string) {
    return api.listReferableNutrients(seedId)
  }

  return {
    view,
    contentView,
    query,
    libraries,
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
    listReferableNutrients,
  }
}
