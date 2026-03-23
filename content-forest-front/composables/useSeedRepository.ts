export interface Seed {
  id: string
  userId: string
  title: string
  content: string
  excerpt?: string
  status: 'draft' | 'active' | 'archived'
  tags: string[]
  createdAt: number
  updatedAt: number
  fruitCount?: number
}

export type SeedStatus = Seed['status']

export interface SeedFilter {
  status?: SeedStatus
  tags?: string[]
}

export function useSeedRepository() {
  const seeds = ref<Seed[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSeeds(filter?: SeedFilter) {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, string> = {}
      if (filter?.status) params.status = filter.status
      if (filter?.tags?.length) params.tags = filter.tags.join(',')
      const query = new URLSearchParams(params).toString()
      const res = await $fetch<{ code: number; data: { list: Seed[] } }>(
        `/api/seeds${query ? `?${query}` : ''}`
      )
      seeds.value = res.data?.list ?? []
    } catch (e: any) {
      error.value = e?.message ?? '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function saveDraft(data: { id?: string; title: string; content: string; tags: string[] }) {
    const res = await $fetch<{ code: number; data: Seed }>('/api/seeds/draft', {
      method: 'POST',
      body: data,
    })
    return res.data
  }

  async function publishSeed(data: { id?: string; title: string; content: string; tags: string[] }) {
    const res = await $fetch<{ code: number; data: Seed }>('/api/seeds/publish', {
      method: 'POST',
      body: data,
    })
    return res.data
  }

  async function updateSeed(id: string, data: Partial<Pick<Seed, 'title' | 'content' | 'tags'>>) {
    const res = await $fetch<{ code: number; data: Seed }>(`/api/seeds/${id}`, {
      method: 'PATCH',
      body: data,
    })
    return res.data
  }

  async function archiveSeed(id: string) {
    await $fetch(`/api/seeds/${id}/archive`, { method: 'PUT' })
  }

  async function restoreSeed(id: string) {
    await $fetch(`/api/seeds/${id}/restore`, { method: 'PUT' })
  }

  async function deleteSeed(id: string) {
    await $fetch(`/api/seeds/${id}`, { method: 'DELETE' })
  }

  return {
    seeds,
    loading,
    error,
    fetchSeeds,
    saveDraft,
    publishSeed,
    updateSeed,
    archiveSeed,
    restoreSeed,
    deleteSeed,
  }
}
