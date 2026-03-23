// 单例标签缓存
const cachedTags = ref<string[]>([])
let fetched = false

export function useTagRepository() {
  async function fetchTags(): Promise<string[]> {
    if (fetched) return cachedTags.value
    try {
      const res = await $fetch<{ code: number; data: { tags: string[] } }>('/api/tags')
      cachedTags.value = res.data?.tags ?? []
      fetched = true
    } catch {
      // 静默失败，标签自动补全不影响主流程
    }
    return cachedTags.value
  }

  function invalidate() {
    fetched = false
  }

  return { tags: cachedTags, fetchTags, invalidate }
}
