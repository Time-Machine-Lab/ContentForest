export interface Generator {
  id: string
  userId: string
  name: string
  description: string
  platform: 'xiaohongshu' | 'douyin' | 'twitter' | 'wechat' | 'other'
  domain: string
  contentTypes: string[]
  outputCapabilities: string[]
  tags: string[]
  skillPath: string
  price: number
  installCount: number
  isOfficial: boolean
  source: 'self' | 'installed'
  installedAt?: number
  createdAt: number
  updatedAt: number
}

export function useMyGenerators() {
  const generators = ref<Generator[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMine() {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ code: number; data: { list: Generator[] } }>(
        '/api/generators/mine',
        { headers: { 'x-user-id': 'local_admin' } }
      )
      generators.value = res.data?.list ?? []
    } catch (e: any) {
      error.value = e?.message ?? '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function uninstall(id: string) {
    await $fetch(`/api/generators/${id}/uninstall`, {
      method: 'DELETE',
      headers: { 'x-user-id': 'local_admin' },
    })
    generators.value = generators.value.filter(g => g.id !== id)
  }

  return { generators, loading, error, fetchMine, uninstall }
}
