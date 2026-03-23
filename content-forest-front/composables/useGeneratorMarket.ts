import type { Generator } from './useMyGenerators'

const MOCK_GENERATORS: Generator[] = [
  {
    id: 'mock-1',
    userId: 'official',
    name: '小红书爆款图文生成器',
    description: '专为小红书平台优化，生成高互动率的图文内容，包含标题、正文、标签推荐，风格活泼自然。',
    platform: 'xiaohongshu',
    domain: '生活方式',
    contentTypes: ['图文', '好物分享'],
    outputCapabilities: ['标题生成', '正文撰写', '标签推荐', '封面文案'],
    tags: ['爆款', '种草', '生活'],
    skillPath: 'content-forest-agent/skills/xiaohongshu-graphic/SKILL.md',
    price: 0,
    installCount: 1284,
    isOfficial: true,
    source: 'installed',
    installedAt: Date.now() - 86400000 * 3,
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'mock-2',
    userId: 'official',
    name: '抖音脚本创作助手',
    description: '短视频脚本专家，生成带节奏感的分镜脚本，含开场钩子、内容节奏、结尾 CTA，适配 15~60 秒竖屏。',
    platform: 'douyin',
    domain: '娱乐内容',
    contentTypes: ['短视频脚本', '口播稿'],
    outputCapabilities: ['分镜脚本', '字幕文案', '配乐建议', 'CTA 设计'],
    tags: ['脚本', '短视频', '爆款'],
    skillPath: 'content-forest-agent/skills/douyin-script/SKILL.md',
    price: 0,
    installCount: 876,
    isOfficial: true,
    source: 'installed',
    installedAt: Date.now() - 86400000 * 7,
    createdAt: Date.now() - 86400000 * 25,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'mock-3',
    userId: 'official',
    name: '知乎深度内容分析器',
    description: '面向知乎平台的长文生成器，擅长结构化分析、数据引用、观点论证，文风严谨有深度，适合专业领域创作。',
    platform: 'twitter',
    domain: '科技',
    contentTypes: ['长文回答', '专栏文章'],
    outputCapabilities: ['论点构建', '数据分析', '引用推荐', '结构规划'],
    tags: ['深度', '专业', '分析'],
    skillPath: 'content-forest-agent/skills/zhihu-deep/SKILL.md',
    price: 0,
    installCount: 542,
    isOfficial: false,
    source: 'installed',
    installedAt: undefined,
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'mock-4',
    userId: 'official',
    name: '微信公众号排版专家',
    description: '微信公众号图文排版生成器，生成带分段、小标题、引导语的完整公众号文章，符合平台阅读习惯。',
    platform: 'wechat',
    domain: '内容营销',
    contentTypes: ['公众号文章', '推文'],
    outputCapabilities: ['文章结构', '排版建议', '引导语', '互动设计'],
    tags: ['公众号', '排版', '营销'],
    skillPath: 'content-forest-agent/skills/wechat-article/SKILL.md',
    price: 0,
    installCount: 398,
    isOfficial: true,
    source: 'installed',
    installedAt: undefined,
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 8,
  },
]

export function useGeneratorMarket() {
  const generators = ref<Generator[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const installedIds = ref<Set<string>>(new Set())

  async function fetchMarket(platform?: string) {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, string> = {}
      if (platform) params.platform = platform
      const query = new URLSearchParams(params).toString()
      // Try real API first, fall back to mock
      try {
        const res = await $fetch<{ code: number; data: { list: Generator[] } }>(
          `/api/generators/market${query ? `?${query}` : ''}`,
          { headers: { 'x-user-id': 'local_admin' }, timeout: 3000 }
        )
        const list = res.data?.list ?? []
        // Fallback to mock when API returns empty (dev stage)
        if (list.length === 0) {
          let mock = MOCK_GENERATORS
          if (platform) mock = mock.filter(g => g.platform === platform)
          generators.value = mock
        } else {
          generators.value = list
        }
      } catch {
        // Fallback to mock data during development
        let mock = MOCK_GENERATORS
        if (platform) mock = mock.filter(g => g.platform === platform)
        generators.value = mock
      }
    } catch (e: any) {
      error.value = e?.message ?? '加载失败'
      generators.value = MOCK_GENERATORS
    } finally {
      loading.value = false
    }
  }

  async function install(id: string): Promise<{ skillPath: string }> {
    const res = await $fetch<{ code: number; data: { skillPath: string; installCount: number } }>(
      `/api/generators/${id}/install`,
      { method: 'POST', headers: { 'x-user-id': 'local_admin' } }
    )
    installedIds.value.add(id)
    // Optimistic update installCount
    const gen = generators.value.find(g => g.id === id)
    if (gen) gen.installCount += 1
    return { skillPath: res.data?.skillPath ?? '' }
  }

  function isInstalled(id: string) {
    return installedIds.value.has(id)
  }

  return { generators, loading, error, installedIds, fetchMarket, install, isInstalled }
}
