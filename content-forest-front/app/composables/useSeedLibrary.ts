import { createSeedApi, type SeedArchiveState, type SeedDetail, type SeedFetcher, type SeedSummary } from '../../src/modules/seed'

type SeedView = Extract<SeedArchiveState, 'active' | 'archived'>

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

function ensureSeedList(payload: unknown): SeedSummary[] {
  if (Array.isArray(payload)) return payload
  throw new Error('种子列表响应格式异常，请确认后端种子 API 已启动')
}

export function useSeedLibrary() {
  const runtimeConfig = useRuntimeConfig()
  const apiBase = String(runtimeConfig.public.apiBase || '')
  const fetcher: SeedFetcher = (url, options) => $fetch(url, {
    method: options?.method,
    body: options?.body,
  })
  const api = createSeedApi(fetcher, apiBase)

  const view = ref<SeedView>('active')
  const seeds = ref<SeedSummary[]>([])
  const selectedSeed = ref<SeedDetail | null>(null)
  const selectedSeedId = ref('')
  const listLoading = ref(false)
  const detailLoading = ref(false)
  const createLoading = ref(false)
  const saveLoading = ref(false)
  const operationLoading = ref(false)
  const workspaceLoading = ref(false)
  const listError = ref('')
  const detailError = ref('')
  const createError = ref('')
  const operationError = ref('')
  const query = ref('')

  const filteredSeeds = computed(() => {
    const search = query.value.trim().toLowerCase()
    if (!search) return seeds.value
    return seeds.value.filter((seed) => seed.title.toLowerCase().includes(search))
  })

  async function loadSeeds(nextView = view.value) {
    view.value = nextView
    listLoading.value = true
    listError.value = ''
    operationError.value = ''

    try {
      const response = nextView === 'active'
        ? await api.listActiveSeeds()
        : await api.listArchivedSeeds()

      seeds.value = ensureSeedList(response)

      const selectedStillVisible = seeds.value.some((seed) => seed.id === selectedSeedId.value)
      if (!selectedStillVisible) {
        selectedSeedId.value = ''
        selectedSeed.value = null
      }
    } catch (error) {
      listError.value = errorMessage(error)
    } finally {
      listLoading.value = false
    }
  }

  async function selectSeed(seedId: string) {
    selectedSeedId.value = seedId
    detailLoading.value = true
    detailError.value = ''
    operationError.value = ''

    try {
      selectedSeed.value = await api.getSeed(seedId)
    } catch (error) {
      detailError.value = errorMessage(error)
    } finally {
      detailLoading.value = false
    }
  }

  async function createSeed(payload: { title: string; markdown: string }) {
    createLoading.value = true
    createError.value = ''

    try {
      const created = await api.createSeed(payload)
      if (view.value === created.archiveState) {
        seeds.value = [created, ...seeds.value.filter((seed) => seed.id !== created.id)]
      } else {
        await loadSeeds('active')
      }
      selectedSeedId.value = created.id
      selectedSeed.value = created
      return true
    } catch (error) {
      createError.value = errorMessage(error)
      return false
    } finally {
      createLoading.value = false
    }
  }

  async function updateSeed(payload: { title: string; markdown: string }) {
    if (!selectedSeed.value) return false

    saveLoading.value = true
    detailError.value = ''

    try {
      const updated = await api.updateSeed(selectedSeed.value.id, payload)
      selectedSeed.value = updated
      seeds.value = seeds.value.map((seed) => (seed.id === updated.id ? updated : seed))
      return true
    } catch (error) {
      detailError.value = errorMessage(error)
      return false
    } finally {
      saveLoading.value = false
    }
  }

  async function archiveSelectedSeed() {
    if (!selectedSeed.value) return

    operationLoading.value = true
    operationError.value = ''

    try {
      await api.archiveSeed(selectedSeed.value.id)
      seeds.value = seeds.value.filter((seed) => seed.id !== selectedSeed.value?.id)
      selectedSeed.value = null
      selectedSeedId.value = ''
    } catch (error) {
      operationError.value = errorMessage(error)
    } finally {
      operationLoading.value = false
    }
  }

  async function restoreSelectedSeed() {
    if (!selectedSeed.value) return

    operationLoading.value = true
    operationError.value = ''

    try {
      await api.restoreSeed(selectedSeed.value.id)
      seeds.value = seeds.value.filter((seed) => seed.id !== selectedSeed.value?.id)
      selectedSeed.value = null
      selectedSeedId.value = ''
    } catch (error) {
      operationError.value = errorMessage(error)
    } finally {
      operationLoading.value = false
    }
  }

  async function openSelectedWorkspace() {
    if (!selectedSeed.value) return

    workspaceLoading.value = true
    operationError.value = ''

    try {
      const rootNode = await api.getSeedRootNode(selectedSeed.value.id)
      const queryString = rootNode.workspaceReadOnly
        ? `?node=${encodeURIComponent(rootNode.nodeId)}&readonly=1`
        : `?node=${encodeURIComponent(rootNode.nodeId)}`
      await navigateTo(`/seeds/${encodeURIComponent(rootNode.seedId)}/workspace${queryString}`)
    } catch (error) {
      operationError.value = errorMessage(error)
    } finally {
      workspaceLoading.value = false
    }
  }

  async function openSelectedGeneLibrary() {
    if (!selectedSeed.value) return

    await navigateTo(`/seeds/${encodeURIComponent(selectedSeed.value.id)}/genes`)
  }

  return {
    view,
    query,
    seeds,
    filteredSeeds,
    selectedSeed,
    selectedSeedId,
    listLoading,
    detailLoading,
    createLoading,
    saveLoading,
    operationLoading: computed(() => operationLoading.value || workspaceLoading.value),
    listError,
    detailError,
    createError,
    operationError,
    loadSeeds,
    selectSeed,
    createSeed,
    updateSeed,
    archiveSelectedSeed,
    restoreSelectedSeed,
    openSelectedWorkspace,
    openSelectedGeneLibrary,
  }
}
