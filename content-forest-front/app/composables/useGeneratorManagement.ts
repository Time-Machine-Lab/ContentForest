import {
  createGeneratorApi,
  type GeneratorDetail,
  type GeneratorFetcher,
  type GeneratorSummary,
  type ImportGeneratorRequest,
} from '../../src/modules/generator'

type GeneratorView = 'enabled' | 'disabled' | 'all'

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

function ensureGeneratorList(payload: unknown): GeneratorSummary[] {
  if (Array.isArray(payload)) return payload
  throw new Error('生成器列表响应格式异常，请确认后端生成器 API 已启动')
}

function updateList(generators: GeneratorSummary[], generator: GeneratorDetail) {
  const next = generators.filter((item) => item.id !== generator.id)
  return [generator, ...next].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export function useGeneratorManagement() {
  const runtimeConfig = useRuntimeConfig()
  const apiBase = String(runtimeConfig.public.apiBase || '')
  const fetcher: GeneratorFetcher = (url, options) => $fetch(url, {
    method: options?.method,
    body: options?.body,
  })
  const api = createGeneratorApi(fetcher, apiBase)

  const view = ref<GeneratorView>('enabled')
  const query = ref('')
  const generators = ref<GeneratorSummary[]>([])
  const selectedGenerator = ref<GeneratorDetail | null>(null)
  const selectedGeneratorId = ref('')
  const listLoading = ref(false)
  const detailLoading = ref(false)
  const importLoading = ref(false)
  const reuploadLoading = ref(false)
  const operationLoading = ref(false)
  const listError = ref('')
  const detailError = ref('')
  const importError = ref('')
  const reuploadError = ref('')
  const operationError = ref('')

  const filteredGenerators = computed(() => {
    const search = query.value.trim().toLowerCase()
    return generators.value.filter((generator) => {
      const matchesView = view.value === 'all' || generator.enableState === view.value
      const matchesSearch = !search
        || generator.name.toLowerCase().includes(search)
        || generator.description.toLowerCase().includes(search)
      return matchesView && matchesSearch
    })
  })

  async function loadGenerators() {
    listLoading.value = true
    listError.value = ''
    operationError.value = ''

    try {
      const response = await api.listGenerators()
      generators.value = ensureGeneratorList(response)

      const selectedStillExists = generators.value.some((generator) => generator.id === selectedGeneratorId.value)
      if (!selectedStillExists) {
        selectedGeneratorId.value = ''
        selectedGenerator.value = null
      }
    } catch (error) {
      listError.value = errorMessage(error)
    } finally {
      listLoading.value = false
    }
  }

  async function selectGenerator(generatorId: string) {
    selectedGeneratorId.value = generatorId
    selectedGenerator.value = null
    detailLoading.value = true
    detailError.value = ''
    operationError.value = ''

    try {
      selectedGenerator.value = await api.getGenerator(generatorId)
    } catch (error) {
      detailError.value = errorMessage(error)
    } finally {
      detailLoading.value = false
    }
  }

  async function importGenerator(payload: ImportGeneratorRequest) {
    importLoading.value = true
    importError.value = ''

    try {
      const created = await api.importGenerator(payload)
      generators.value = updateList(generators.value, created)
      selectedGeneratorId.value = created.id
      selectedGenerator.value = created
      return true
    } catch (error) {
      importError.value = errorMessage(error)
      return false
    } finally {
      importLoading.value = false
    }
  }

  async function reuploadSelectedGenerator(zipBase64: string) {
    if (!selectedGenerator.value) return false

    reuploadLoading.value = true
    reuploadError.value = ''

    try {
      const updated = await api.reuploadGenerator(selectedGenerator.value.id, { zipBase64 })
      selectedGenerator.value = updated
      generators.value = updateList(generators.value, updated)
      return true
    } catch (error) {
      reuploadError.value = errorMessage(error)
      return false
    } finally {
      reuploadLoading.value = false
    }
  }

  async function enableSelectedGenerator(generatorId = selectedGenerator.value?.id) {
    if (!generatorId) return

    operationLoading.value = true
    operationError.value = ''

    try {
      const updated = await api.enableGenerator(generatorId)
      if (selectedGeneratorId.value === updated.id) selectedGenerator.value = updated
      generators.value = updateList(generators.value, updated)
    } catch (error) {
      operationError.value = errorMessage(error)
    } finally {
      operationLoading.value = false
    }
  }

  async function disableSelectedGenerator(generatorId = selectedGenerator.value?.id) {
    if (!generatorId) return

    operationLoading.value = true
    operationError.value = ''

    try {
      const updated = await api.disableGenerator(generatorId)
      if (selectedGeneratorId.value === updated.id) selectedGenerator.value = updated
      generators.value = updateList(generators.value, updated)
    } catch (error) {
      operationError.value = errorMessage(error)
    } finally {
      operationLoading.value = false
    }
  }

  return {
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
  }
}
