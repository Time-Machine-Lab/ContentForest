<script setup lang="ts">
import { createFruitApi, type FruitDetail, type FruitSelectionState } from '../../../../src/modules/fruit'
import { createFeedbackApi, type FeedbackHistory, type FeedbackSnapshot } from '../../../../src/modules/feedback'
import { createGeneApi, type GeneEvidenceSource, type GeneSuggestion } from '../../../../src/modules/gene'
import { createGrowthApi, type GrowthFailedInput, type GrowthMutationIntensity, type GrowthNodeType, type GrowthPathStep, type GrowthSearchMode, type GrowthTaskDetail } from '../../../../src/modules/growth'
import { createPublicationApi, type PublicationRecord } from '../../../../src/modules/publication'
import { createSeedApi, type SeedBriefDetail } from '../../../../src/modules/seed'
import { createWorkspaceApi, type WorkspaceNode, type WorkspaceNodeRef, type WorkspaceSnapshot } from '../../../../src/modules/workspace'
import NutrientWorkbenchDialog from '../../../components/nutrient/NutrientWorkbenchDialog.vue'

type NodeType = 'seed' | 'fruit'
type NodeStatus = 'idle' | 'growing' | 'failed'
type ResourceKind = 'nutrient' | 'gene' | 'nutrient_card'

interface TreeNode {
  id: string
  nodeType: NodeType
  title: string
  summary: string
  markdown: string
  x: number
  y: number
  fruitId?: string
  selectionState?: FruitSelectionState
  parentNodeRef?: WorkspaceNodeRef
  contentLocation: string
  generatorId?: string | null
  geneTags: string[]
  records: string[]
  createdAt: string
  updatedAt: string
  status: NodeStatus
  taskId: string | null
  isPlaceholder?: boolean
  failedInput: {
    hasFailedInput: boolean
    taskId: string | null
    failureReason: string | null
    updatedAt: string | null
  }
}

interface ResourceRef {
  id: string
  kind: ResourceKind
  label: string
  scope: string
  description: string
}

interface DragState {
  mode: 'canvas' | 'node'
  startX: number
  startY: number
  originX: number
  originY: number
  nodeId?: string
  moved: boolean
}

interface FeedbackMetricDraft {
  key: string
  value: string
}

interface GrowthSearchModeOption {
  value: GrowthSearchMode
  label: string
  hint: string
}

interface GrowthMutationIntensityOption {
  value: GrowthMutationIntensity
  label: string
  hint: string
}

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const apiBase = String(runtimeConfig.public.apiBase || '')

function fetcher<T>(url: string, options?: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown }) {
  return $fetch<T>(url, {
    method: options?.method,
    body: options?.body as BodyInit | Record<string, unknown> | null | undefined,
  })
}

const workspaceApi = createWorkspaceApi(fetcher, apiBase)
const seedApi = createSeedApi(fetcher, apiBase)
const fruitApi = createFruitApi(fetcher, apiBase)
const growthApi = createGrowthApi(fetcher, apiBase)
const geneApi = createGeneApi(fetcher, apiBase)
const publicationApi = createPublicationApi(fetcher, apiBase)
const feedbackApi = createFeedbackApi(fetcher, apiBase)

const seedId = computed(() => String(route.params.seedId || ''))
const snapshot = ref<WorkspaceSnapshot | null>(null)
const nodes = ref<TreeNode[]>([])
const selectedNodeId = ref('')
const transform = reactive({ x: -620, y: -360, scale: 1 })
const treeSize = reactive({ width: 1180, height: 820 })
const nodeSize = {
  seed: { width: 252, height: 184 },
  fruit: { width: 232, height: 168 },
}

const workspaceLoading = ref(false)
const workspaceError = ref('')
const detailLoading = ref(false)
const detailError = ref('')
const seedBriefPanelOpen = ref(false)
const seedBriefDetail = ref<SeedBriefDetail | null>(null)
const seedBriefDraft = ref('')
const seedBriefLoading = ref(false)
const seedBriefGenerating = ref(false)
const seedBriefSaving = ref(false)
const seedBriefRefreshing = ref(false)
const seedBriefEditing = ref(false)
const seedBriefError = ref('')
const selectionLoading = ref(false)
const growthLoading = ref(false)
const growthError = ref('')
const dragState = ref<DragState | null>(null)
const suppressClickNodeId = ref('')
const hideEliminatedNodes = ref(true)
const resourcePopoverOpen = ref(false)
const resourceQuery = ref('')
const generatorMenuOpen = ref(false)
const fruitCountMenuOpen = ref(false)
const mutationIntensityMenuOpen = ref(false)
const searchModeMenuOpen = ref(false)
const growthDetailOpen = ref(false)
const growthIntent = ref('')
const referencedResources = ref<ResourceRef[]>([])
const removedDefaultResourceKeys = ref<string[]>([])
const growthInputEl = ref<HTMLTextAreaElement | null>(null)
const selectedGeneratorId = ref('')
const fruitCount = ref(3)
const fruitCountOptions = [1, 2, 3, 4, 5, 6]
const searchModeOptions: GrowthSearchModeOption[] = [
  { value: 'broad_exploration', label: '广泛探索', hint: '系统推荐' },
  { value: 'directional_strengthening', label: '方向强化', hint: '放大有效路线' },
  { value: 'local_variation', label: '局部变体', hint: '围绕当前表达微调' },
  { value: 'negative_feedback_avoidance', label: '规避负反馈', hint: '避开低效表达' },
]
const mutationIntensityOptions: GrowthMutationIntensityOption[] = [
  { value: 'conservative', label: '保守', hint: '小步调整' },
  { value: 'balanced', label: '均衡', hint: '推荐' },
  { value: 'aggressive', label: '激进', hint: '大步探索' },
]
const defaultSearchModeOption = searchModeOptions[0] as GrowthSearchModeOption
const defaultMutationIntensityOption = mutationIntensityOptions[1] as GrowthMutationIntensityOption
const selectedSearchMode = ref<GrowthSearchMode>('broad_exploration')
const selectedMutationIntensity = ref<GrowthMutationIntensity>('balanced')
const nutrientWorkbenchOpen = ref(false)
const geneHubDialogOpen = ref(false)
const geneActionLoading = ref('')
const geneReminderActionLoading = reactive<Record<string, 'extract' | 'ignore' | undefined>>({})
const geneActionError = ref('')
const geneReasonComposerIds = ref<string[]>([])
const geneExtractionReasonDrafts = reactive<Record<string, string>>({})
const activeGeneSuggestion = ref<GeneSuggestion | null>(null)
const geneSuggestionDraft = reactive({
  title: '',
  bodyMarkdown: '',
  lineage: '',
  niche: '',
})
const publicationRecords = ref<PublicationRecord[]>([])
const publicationLoading = ref(false)
const publicationSaving = ref(false)
const publicationError = ref('')
const publicationDialogOpen = ref(false)
const editingPublicationRecord = ref<PublicationRecord | null>(null)
const publicationDraft = reactive({
  publicationTarget: '',
  publicationEvidence: '',
  publicationNote: '',
})
const feedbackHistories = reactive<Record<string, FeedbackHistory>>({})
const feedbackLoading = ref('')
const feedbackSaving = ref('')
const feedbackError = ref('')
const feedbackDialogOpen = ref(false)
const activeFeedbackPublicationId = ref('')
const editingFeedbackSnapshot = ref<FeedbackSnapshot | null>(null)
const feedbackMetricNameInputOpen = ref(false)
const feedbackMetricNameDraft = ref('')
const feedbackMetricNameInputRef = ref<HTMLInputElement | null>(null)
const feedbackDraft = reactive({
  performanceData: [] as FeedbackMetricDraft[],
  userObservation: '',
  capturedAt: '',
})

const pollTimers = new Map<string, ReturnType<typeof setTimeout>>()
const growthTaskFruitCounts = new Map<string, number>()
const growthPipelineTasks = reactive<Record<string, GrowthTaskDetail | undefined>>({})
const geneExtractionPollAttempts = new Map<string, number>()
const GENE_EXTRACTION_POLL_INTERVAL_MS = 2400
const GENE_EXTRACTION_MAX_POLL_ATTEMPTS = 80

const isReadOnly = computed(() => Boolean(snapshot.value?.workspaceReadOnly || route.query.readonly === '1'))
const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) ?? nodes.value[0] ?? null)
const visibleNodes = computed(() => getVisibleTreeNodes(nodes.value))
const isTreeGrowing = computed(() => nodes.value.some((node) => node.status === 'growing'))
const treeStatusTitle = computed(() => isTreeGrowing.value ? '枝化生长' : workspaceLoading.value ? '加载工作区' : '树已同步')
const treeStatusValue = computed(() => {
  if (isTreeGrowing.value) return '生成中'
  return hideEliminatedNodes.value ? `${visibleNodes.value.length}/${nodes.value.length} 节点` : `${nodes.value.length} 节点`
})
const canShowGrowthComposer = computed(() => {
  const node = selectedNode.value
  if (!node) return false
  if (node.nodeType === 'seed') return true
  return node.selectionState === 'selected'
})
const visibleComposer = computed(() => Boolean(canShowGrowthComposer.value && !isReadOnly.value && selectedNode.value?.status !== 'growing'))
const selectedGenerator = computed(() => snapshot.value?.resources.generators.find((item) => item.id === selectedGeneratorId.value) ?? null)
const generatorName = computed(() => selectedGenerator.value?.name ?? '未选择生成器')
const canCreatePublicationRecord = computed(() => {
  const node = selectedNode.value
  return Boolean(node?.nodeType === 'fruit' && node.selectionState === 'selected' && !isReadOnly.value)
})
const publicationUnavailableReason = computed(() => {
  const node = selectedNode.value
  if (!node || node.nodeType !== 'fruit') return '发布验证仅适用于果实节点'
  if (isReadOnly.value) return '只读工作区仅允许查看发布记录'
  if (node.selectionState === 'eliminated') return '已淘汰果实不能创建发布记录'
  if (node.selectionState !== 'selected') return '只有已选择果实才能进入发布验证'
  return ''
})
const geneHub = computed(() => snapshot.value?.geneExtractionHub ?? null)
const geneHubStats = computed(() => geneHub.value?.stats ?? {
  pendingReminderCount: 0,
  pendingSuggestionCount: 0,
  insightCount: 0,
  referableInsightCount: 0,
})
const hasGeneHubWork = computed(() => geneHubStats.value.pendingReminderCount > 0 || geneHubStats.value.pendingSuggestionCount > 0)
const geneHubReminderBadgeCount = computed(() => geneHubStats.value.pendingReminderCount)
const geneHubStatusText = computed(() => {
  if (!geneHub.value) return '等待同步'
  if (hasGeneHubWork.value) return `${geneHubStats.value.pendingReminderCount} 提醒 / ${geneHubStats.value.pendingSuggestionCount} 建议`
  return `${geneHubStats.value.referableInsightCount} 可引用经验`
})
const seedBriefSummary = computed(() => snapshot.value?.seedBrief ?? {
  seedId: seedId.value,
  hasBrief: false,
  id: null,
  contentLocation: null,
  updatedAt: null,
})
const hasSeedBrief = computed(() => Boolean(seedBriefSummary.value.hasBrief || seedBriefDetail.value?.hasBrief))
const seedBriefStatusText = computed(() => {
  if (seedBriefGenerating.value) return '生成中'
  if (seedBriefRefreshing.value) return '刷新中'
  if (seedBriefSaving.value) return '保存中'
  if (hasSeedBrief.value) return `更新于 ${formatDateTime(seedBriefSummary.value.updatedAt || seedBriefDetail.value?.updatedAt)}`
  return '尚未生成'
})
const canEditSeedBrief = computed(() => Boolean(seedBriefDetail.value?.hasBrief && !seedBriefLoading.value && !seedBriefGenerating.value))
const branchEdges = computed(() => {
  const visibleIds = new Set(visibleNodes.value.map((node) => node.id))
  const snapshotEdges = snapshot.value?.edges.map((edge, index) => ({
    parentId: edge.parentNodeRef.nodeId,
    childId: edge.childNodeRef.nodeId,
    className: index === 0 ? 'is-primary' : index % 2 === 0 ? 'is-secondary' : 'is-weak',
  })) ?? []
  const existing = new Set(snapshotEdges.map((edge) => `${edge.parentId}->${edge.childId}`))
  const visibleSnapshotEdges = snapshotEdges.filter((edge) => visibleIds.has(edge.parentId) && visibleIds.has(edge.childId))
  const runtimeEdges = visibleNodes.value
    .filter((node) => node.parentNodeRef && !existing.has(`${node.parentNodeRef.nodeId}->${node.id}`))
    .filter((node) => visibleIds.has(node.parentNodeRef?.nodeId || ''))
    .map((node) => ({
      parentId: node.parentNodeRef?.nodeId || '',
      childId: node.id,
      className: node.isPlaceholder ? 'is-growth-stream' : 'is-weak',
    }))
  return [...visibleSnapshotEdges, ...runtimeEdges]
})
const branchPaths = computed(() => branchEdges.value.map((edge) => {
  const parent = findNode(edge.parentId)
  const child = findNode(edge.childId)
  if (!parent || !child) return null
  return {
    key: `${edge.parentId}-${edge.childId}`,
    d: makeBranchPath(parent, child),
    className: edge.className,
    joint: getChildPort(child),
  }
}).filter((item): item is NonNullable<typeof item> => Boolean(item)))
const transformedMapStyle = computed(() => ({
  width: `${treeSize.width}px`,
  height: `${treeSize.height}px`,
  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
}))
const resourceOptions = computed<ResourceRef[]>(() => {
  const resources = snapshot.value?.resources
  if (!resources) return []

  return [
    ...resources.nutrients
      .filter((item) => item.archiveState === 'active')
      .map((item) => ({
        id: item.id,
        kind: 'nutrient' as const,
        label: item.title,
        scope: item.defaultForGrowth
          ? `默认带入 · ${item.library.name}`
          : item.library.scope === 'public' ? `公共营养库 · ${item.library.name}` : `种子专属营养库 · ${item.library.name}`,
        description: item.defaultForGrowth ? '默认带入，可在本次移除' : '可作为本次枝化生长参考的营养内容',
      })),
    ...resources.geneInsights
      .filter((item) => item.status === 'active')
      .map((item) => ({
        id: item.id,
        kind: 'gene' as const,
        label: item.title,
        scope: item.niche || '种子基因库',
        description: '已沉淀的表达经验，可作为本次枝化生长参考',
      })),
  ]
})
const filteredResourceOptions = computed(() => {
  const query = resourceQuery.value.trim().toLowerCase()
  if (!query) return resourceOptions.value
  return resourceOptions.value.filter((resource) => {
    return `${resource.label} ${resource.scope} ${resource.description}`.toLowerCase().includes(query)
  })
})
const filteredResourceGroups = computed(() => [
  {
    kind: 'nutrient' as const,
    title: '营养',
    subtitle: '创作素材、默认带入与平台经验',
    resources: filteredResourceOptions.value.filter((resource) => resource.kind === 'nutrient'),
  },
  {
    kind: 'nutrient_card' as const,
    title: '草稿营养',
    subtitle: '草稿营养内容临时参考',
    resources: filteredResourceOptions.value.filter((resource) => resource.kind === 'nutrient_card'),
  },
  {
    kind: 'gene' as const,
    title: '基因',
    subtitle: '已沉淀的有效表达特征',
    resources: filteredResourceOptions.value.filter((resource) => resource.kind === 'gene'),
  },
].filter((group) => group.resources.length > 0))
const growthDetailResources = computed(() => referencedResources.value.map((resource) => ({
  ...resource,
  kindLabel: resource.kind === 'gene' ? '基因' : resource.kind === 'nutrient_card' ? '草稿营养' : '营养',
})))
const selectedSearchModeOption = computed<GrowthSearchModeOption>(() => searchModeOptions.find((option) => option.value === selectedSearchMode.value) ?? defaultSearchModeOption)
const selectedMutationIntensityOption = computed<GrowthMutationIntensityOption>(() => mutationIntensityOptions.find((option) => option.value === selectedMutationIntensity.value) ?? defaultMutationIntensityOption)
const selectedGrowthTask = computed(() => {
  const taskId = selectedNode.value?.taskId
  return taskId ? growthPipelineTasks[taskId] ?? null : null
})
const selectedGrowthPathSteps = computed(() => (selectedGrowthTask.value?.pathGraph ?? []).filter(isUserVisiblePathStep))
const selectedCurrentGrowthPathStep = computed(() => {
  const steps = selectedGrowthPathSteps.value
  return [...steps].reverse().find((step) => step.status === 'running')
    ?? steps.find((step) => step.status === 'pending')
    ?? null
})
const selectedGrowthDirections = computed(() => uniqueStrings(
  selectedGrowthTask.value?.attempts
    .map((attempt) => attempt.mutationPlan?.direction)
    .filter((direction): direction is string => Boolean(direction?.trim())) ?? [],
))

watch(seedId, () => {
  void loadWorkspace()
}, { immediate: true })

onBeforeUnmount(() => {
  stopAllPolling()
})

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  if (String(error).includes('Failed to fetch')) return '无法连接后端服务，请确认后端已启动'
  if (error instanceof Error) return error.message
  return '操作失败，请稍后重试'
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function pathStepStatusLabel(status: GrowthPathStep['status']) {
  if (status === 'running') return '执行中'
  if (status === 'completed') return '已完成'
  if (status === 'failed') return '失败'
  return '等待'
}

const ENGINEERING_PATH_STEP_EVENT_PATTERNS = [
  'task_started',
  'task_completed',
  'task_failed',
  'skill_called',
  'skill_failed',
  'tool_called',
  'tool_failed',
  'llm_called',
  'llm_failed',
  'output_validated',
]

const ENGINEERING_PATH_STEP_LABEL_PATTERNS = [
  /^Agent task /i,
  /^Skill called:/i,
  /^Tool called:/i,
  /^LLM called/i,
  /^Branch growth /i,
  /^Content evolution /i,
  /^Generator payload /i,
]

function isUserVisiblePathStep(step: GrowthPathStep) {
  const text = `${step.id} ${step.label} ${step.detail ?? ''}`.toLowerCase()
  if (step.id.startsWith('trace:')) return false
  if (step.id.startsWith('attempt:')) return false
  if (/^生成第\s*\d+\s*个果实$/.test(step.label)) return false
  if (ENGINEERING_PATH_STEP_EVENT_PATTERNS.some((pattern) => text.includes(pattern))) return false
  return !ENGINEERING_PATH_STEP_LABEL_PATTERNS.some((pattern) => pattern.test(step.label))
}

function growthPathStepDepth(step: GrowthPathStep, steps: GrowthPathStep[], visited = new Set<string>()): number {
  if (!step.parentId) return 0
  if (visited.has(step.id)) return 0
  visited.add(step.id)
  const parent = steps.find((candidate) => candidate.id === step.parentId)
  if (!parent) return 1
  return Math.min(growthPathStepDepth(parent, steps, visited) + 1, 3)
}

function pathStepIndent(step: GrowthPathStep) {
  return growthPathStepDepth(step, selectedGrowthPathSteps.value)
}

async function loadWorkspace(preferredNodeId = selectedNodeId.value) {
  if (!seedId.value) return

  const shouldFitAfterLoad = nodes.value.length === 0
  workspaceLoading.value = true
  workspaceError.value = ''

  try {
    const nextSnapshot = await workspaceApi.getSeedWorkspace(seedId.value)
    snapshot.value = nextSnapshot
    if (seedBriefDetail.value?.seedId && seedBriefDetail.value.seedId !== nextSnapshot.seed.id) {
      seedBriefDetail.value = null
      seedBriefDraft.value = ''
      seedBriefEditing.value = false
    }
    nodes.value = layoutVisibleTreeNodes(mergeRunningPlaceholders(mapSnapshotNodes(nextSnapshot), nodes.value))

    const routeNodeId = typeof route.query.node === 'string' ? route.query.node : ''
    const nextSelectedId = preferredNodeId || routeNodeId || nextSnapshot.seed.rootNodeId || nodes.value[0]?.id || ''
    selectedNodeId.value = visibleNodes.value.some((node) => node.id === nextSelectedId)
      ? nextSelectedId
      : fallbackVisibleNodeId() || ''

    if (!selectedGeneratorId.value || !nextSnapshot.resources.generators.some((item) => item.id === selectedGeneratorId.value)) {
      selectedGeneratorId.value = nextSnapshot.resources.generators[0]?.id || ''
    }

    referencedResources.value = referencedResources.value.filter((resource) => {
      if (resource.kind === 'nutrient_card') return true
      return resourceOptions.value.some((item) => item.id === resource.id && item.kind === resource.kind)
    })
    applyDefaultGrowthNutrients()
    await loadSelectedNodeDetail()
    if (shouldFitAfterLoad) {
      await nextTick()
      fitTreeInView()
    }
  } catch (error) {
    workspaceError.value = errorMessage(error)
  } finally {
    workspaceLoading.value = false
  }
}

function mapSnapshotNodes(nextSnapshot: WorkspaceSnapshot) {
  return nextSnapshot.nodes.map((node) => mapWorkspaceNode(node, { x: 0, y: 0 }))
}

function mergeRunningPlaceholders(nextNodes: TreeNode[], previousNodes: TreeNode[]) {
  const nextNodeIds = new Set(nextNodes.map((node) => node.id))
  const growingSourceIds = new Set(nextNodes.filter((node) => node.status === 'growing').map((node) => node.id))
  const preservedPlaceholders = previousNodes.filter((node) => {
    return Boolean(
      node.isPlaceholder
      && node.parentNodeRef
      && growingSourceIds.has(node.parentNodeRef.nodeId)
      && !nextNodeIds.has(node.id),
    )
  })

  return [...nextNodes, ...preservedPlaceholders]
}

function getVisibleTreeNodes(treeNodes: TreeNode[]) {
  if (!hideEliminatedNodes.value) return treeNodes
  return treeNodes.filter((node) => node.nodeType !== 'fruit' || node.selectionState !== 'eliminated')
}

function layoutVisibleTreeNodes(treeNodes: TreeNode[]) {
  const visibleLayout = layoutTreeNodes(getVisibleTreeNodes(treeNodes))
  const visiblePositions = new Map(visibleLayout.map((node) => [node.id, node]))
  return treeNodes.map((node) => {
    const visibleNode = visiblePositions.get(node.id)
    return visibleNode ? { ...node, x: visibleNode.x, y: visibleNode.y } : node
  })
}

function fallbackVisibleNodeId() {
  const rootId = snapshot.value?.seed.rootNodeId
  if (rootId && visibleNodes.value.some((node) => node.id === rootId)) return rootId
  return visibleNodes.value[0]?.id || ''
}

function ensureSelectedNodeVisible() {
  if (!selectedNodeId.value || visibleNodes.value.some((node) => node.id === selectedNodeId.value)) return false
  selectedNodeId.value = fallbackVisibleNodeId()
  return true
}

function mapWorkspaceNode(node: WorkspaceNode, position: { x: number; y: number }): TreeNode {
  const failedInput = node.failedInput
  const status: NodeStatus = node.growth.isGrowing ? 'growing' : failedInput.hasFailedInput ? 'failed' : 'idle'

  if (node.nodeType === 'seed') {
    return {
      id: node.nodeId,
      nodeType: 'seed',
      title: node.title,
      summary: '根种子',
      markdown: '',
      x: position.x,
      y: position.y,
      contentLocation: snapshot.value?.seed.contentLocation || '',
      geneTags: ['灵感种子', node.archiveState === 'archived' ? '已归档' : '未归档'],
      records: [node.archiveState === 'archived' ? '种子已归档，工作区只读' : '种子可作为内容树根节点查看'],
      createdAt: snapshot.value?.seed.createdAt || '',
      updatedAt: snapshot.value?.seed.updatedAt || '',
      status,
      taskId: node.growth.taskId,
      failedInput,
    }
  }

  return {
    id: node.nodeId,
    nodeType: 'fruit',
    title: node.summary,
    summary: node.summary,
    markdown: '',
    x: position.x,
    y: position.y,
    fruitId: node.fruitId,
    selectionState: node.selectionState,
    parentNodeRef: node.parentNodeRef,
    contentLocation: node.contentLocation,
    generatorId: node.generatorId,
    geneTags: node.geneTags,
    records: buildFruitRecords(node),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    status,
    taskId: node.growth.taskId,
    failedInput,
  }
}

function buildFruitRecords(node: Extract<WorkspaceNode, { nodeType: 'fruit' }>) {
  const records = [`内容路径：${node.contentLocation}`, `更新于：${formatDateTime(node.updatedAt)}`]
  if (node.generatorId) records.unshift(`生成器：${generatorLabel(node.generatorId)}`)
  if (node.failedInput.hasFailedInput) records.unshift(`最近失败：${node.failedInput.failureReason || '可恢复输入后重试'}`)
  if (node.growth.isGrowing) records.unshift('枝化生长：生成中')
  return records
}

function generatorLabel(generatorId: string) {
  const generator = snapshot.value?.resources.generators.find((item) => item.id === generatorId)
  return generator ? `${generator.name} (${generator.id})` : generatorId
}

function buildNodeChildren(treeNodes: TreeNode[]) {
  const nodeIds = new Set(treeNodes.map((node) => node.id))
  const children = new Map<string, TreeNode[]>()

  treeNodes.forEach((node) => {
    const parentId = node.parentNodeRef?.nodeId
    if (!parentId || !nodeIds.has(parentId)) return
    const list = children.get(parentId) ?? []
    list.push(node)
    children.set(parentId, list)
  })

  children.forEach((list) => {
    list.sort((left, right) => {
      if (left.isPlaceholder !== right.isPlaceholder) return left.isPlaceholder ? 1 : -1
      return `${left.createdAt}-${left.id}`.localeCompare(`${right.createdAt}-${right.id}`)
    })
  })

  return children
}

function layoutTreeNodes(treeNodes: TreeNode[]) {
  if (treeNodes.length === 0) return []

  const nextNodes = treeNodes.map((node) => ({ ...node }))
  const byId = new Map(nextNodes.map((node) => [node.id, node]))
  const children = buildNodeChildren(nextNodes)
  const rootId = snapshot.value?.seed.rootNodeId || nextNodes.find((node) => node.nodeType === 'seed')?.id || nextNodes[0]?.id || ''
  const subtreeWidths = new Map<string, number>()
  const visited = new Set<string>()
  const subtreeGap = 104
  const levelGap = 240
  const marginX = 180
  const marginY = 170
  let maxDepth = 0

  function measure(nodeId: string, depth: number): number {
    const node = byId.get(nodeId)
    if (!node || visited.has(nodeId)) return nodeSize.fruit.width
    visited.add(nodeId)
    maxDepth = Math.max(maxDepth, depth)

    const size = getNodeSize(node)
    const childNodes = children.get(nodeId) ?? []
    if (childNodes.length === 0) {
      subtreeWidths.set(nodeId, size.width)
      return size.width
    }

    const childrenWidth = childNodes.reduce((total, child, index) => {
      return total + measure(child.id, depth + 1) + (index > 0 ? subtreeGap : 0)
    }, 0)
    const width = Math.max(size.width, childrenWidth)
    subtreeWidths.set(nodeId, width)
    return width
  }

  const rootWidth = rootId ? measure(rootId, 0) : 0
  const orphanNodes = nextNodes.filter((node) => !visited.has(node.id))
  const orphanWidth = orphanNodes.reduce((total, node, index) => total + getNodeSize(node).width + (index > 0 ? subtreeGap : 0), 0)
  const contentWidth = Math.max(rootWidth, orphanWidth, nodeSize.seed.width)

  treeSize.width = Math.max(1380, contentWidth + marginX * 2)
  treeSize.height = Math.max(960, (maxDepth + 1) * levelGap + marginY * 2)

  function assign(nodeId: string, left: number, depth: number) {
    const node = byId.get(nodeId)
    if (!node) return

    const width = subtreeWidths.get(nodeId) ?? getNodeSize(node).width
    const size = getNodeSize(node)
    node.x = left + width / 2 - size.width / 2
    node.y = treeSize.height - marginY - size.height - depth * levelGap

    const childNodes = children.get(nodeId) ?? []
    const childrenWidth = childNodes.reduce((total, child, index) => {
      return total + (subtreeWidths.get(child.id) ?? getNodeSize(child).width) + (index > 0 ? subtreeGap : 0)
    }, 0)
    let childLeft = left + (width - childrenWidth) / 2
    childNodes.forEach((child) => {
      const childWidth = subtreeWidths.get(child.id) ?? getNodeSize(child).width
      assign(child.id, childLeft, depth + 1)
      childLeft += childWidth + subtreeGap
    })
  }

  if (rootId) {
    assign(rootId, marginX + (contentWidth - rootWidth) / 2, 0)
  }

  let orphanLeft = marginX + (contentWidth - orphanWidth) / 2
  orphanNodes.forEach((node, index) => {
    const size = getNodeSize(node)
    node.x = orphanLeft
    node.y = treeSize.height - marginY - size.height - levelGap
    orphanLeft += size.width + (index < orphanNodes.length - 1 ? subtreeGap : 0)
  })

  return nextNodes
}

function fitTreeInView() {
  if (typeof window === 'undefined' || visibleNodes.value.length === 0) return

  const canvasRect = document.querySelector<HTMLElement>('.cf-tree-canvas')?.getBoundingClientRect()
  const bounds = visibleNodes.value.reduce((current, node) => {
    const size = getNodeSize(node)
    return {
      minX: Math.min(current.minX, node.x),
      minY: Math.min(current.minY, node.y),
      maxX: Math.max(current.maxX, node.x + size.width),
      maxY: Math.max(current.maxY, node.y + size.height),
    }
  }, {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  })

  const detailWidth = selectedNode.value ? (window.innerWidth <= 1180 ? 360 : 406) : 0
  const canvasLeft = canvasRect?.left ?? 0
  const canvasTop = canvasRect?.top ?? 0
  const canvasWidth = canvasRect?.width ?? window.innerWidth
  const canvasHeight = canvasRect?.height ?? window.innerHeight
  const targetLeft = canvasLeft
  const targetRight = canvasLeft + canvasWidth - detailWidth
  const targetTop = canvasTop + 96
  const targetBottom = canvasTop + canvasHeight - (visibleComposer.value ? 240 : 48)
  const availableWidth = Math.max(520, targetRight - targetLeft - 56)
  const availableHeight = Math.max(420, targetBottom - targetTop)
  const boundsWidth = Math.max(1, bounds.maxX - bounds.minX)
  const boundsHeight = Math.max(1, bounds.maxY - bounds.minY)
  const nextScale = Math.min(1.04, Math.max(0.58, Math.min(availableWidth / (boundsWidth + 180), availableHeight / (boundsHeight + 180))))
  const boundsCenterX = bounds.minX + boundsWidth / 2
  const boundsCenterY = bounds.minY + boundsHeight / 2
  const targetCenterX = (targetLeft + targetRight) / 2
  const targetCenterY = (targetTop + targetBottom) / 2
  const mapAnchorX = canvasLeft + canvasWidth / 2
  const mapAnchorY = canvasTop + canvasHeight / 2

  transform.scale = nextScale
  transform.x = targetCenterX - mapAnchorX + (nextScale - 1) * treeSize.width / 2 - boundsCenterX * nextScale
  transform.y = targetCenterY - mapAnchorY + (nextScale - 1) * treeSize.height / 2 - boundsCenterY * nextScale
}

async function arrangeTreeView() {
  nodes.value = layoutVisibleTreeNodes(nodes.value)
  await nextTick()
  fitTreeInView()
}

async function loadSelectedNodeDetail() {
  const node = selectedNode.value
  if (!node) return

  detailLoading.value = true
  detailError.value = ''

  try {
    if (node.nodeType === 'seed') {
      resetPublicationPanel()
      const detail = await seedApi.getSeed(seedId.value)
      node.markdown = detail.markdown
      node.title = detail.title
      node.contentLocation = detail.contentLocation
      node.updatedAt = detail.updatedAt
    } else if (node.fruitId) {
      const detail = await fruitApi.getFruit(node.fruitId)
      applyFruitDetail(node, detail)
      await loadPublicationRecords(node.fruitId)
    }
  } catch (error) {
    detailError.value = errorMessage(error)
  } finally {
    detailLoading.value = false
  }
}

function applyFruitDetail(node: TreeNode, detail: FruitDetail) {
  node.markdown = detail.markdown
  node.summary = detail.summary
  node.title = detail.summary
  node.selectionState = detail.selectionState
  node.parentNodeRef = detail.parentNodeRef
  node.contentLocation = detail.contentLocation
  node.generatorId = detail.generatorId
  node.geneTags = detail.geneTags
  node.createdAt = detail.createdAt
  node.updatedAt = detail.updatedAt
}

function resetPublicationPanel() {
  publicationRecords.value = []
  publicationError.value = ''
  publicationDialogOpen.value = false
  editingPublicationRecord.value = null
  feedbackError.value = ''
  feedbackDialogOpen.value = false
  activeFeedbackPublicationId.value = ''
  editingFeedbackSnapshot.value = null
}

async function openSeedBriefPanel() {
  seedBriefPanelOpen.value = true
  seedBriefError.value = ''
  if (hasSeedBrief.value && !seedBriefDetail.value) {
    await loadSeedBrief()
  }
}

function closeSeedBriefPanel() {
  seedBriefPanelOpen.value = false
  seedBriefEditing.value = false
  seedBriefError.value = ''
}

function applySeedBriefDetail(detail: SeedBriefDetail | null) {
  seedBriefDetail.value = detail
  seedBriefDraft.value = detail?.markdown ?? ''
  seedBriefEditing.value = false
}

async function loadSeedBrief() {
  if (!seedId.value || seedBriefLoading.value) return
  seedBriefLoading.value = true
  seedBriefError.value = ''

  try {
    applySeedBriefDetail(await seedApi.getSeedBrief(seedId.value))
  } catch (error) {
    seedBriefError.value = errorMessage(error)
  } finally {
    seedBriefLoading.value = false
  }
}

async function generateSeedBrief() {
  if (!seedId.value || seedBriefGenerating.value) return
  seedBriefGenerating.value = true
  seedBriefError.value = ''

  try {
    applySeedBriefDetail(await seedApi.generateSeedBrief(seedId.value))
    await loadWorkspace(selectedNodeId.value)
  } catch (error) {
    seedBriefError.value = errorMessage(error)
  } finally {
    seedBriefGenerating.value = false
  }
}

async function refreshSeedBrief() {
  if (!seedId.value || seedBriefRefreshing.value) return
  seedBriefRefreshing.value = true
  seedBriefError.value = ''

  try {
    applySeedBriefDetail(await seedApi.refreshSeedBrief(seedId.value))
    await loadWorkspace(selectedNodeId.value)
  } catch (error) {
    seedBriefError.value = errorMessage(error)
  } finally {
    seedBriefRefreshing.value = false
  }
}

function startSeedBriefEditing() {
  seedBriefDraft.value = seedBriefDetail.value?.markdown ?? ''
  seedBriefEditing.value = true
  seedBriefError.value = ''
}

function cancelSeedBriefEditing() {
  seedBriefDraft.value = seedBriefDetail.value?.markdown ?? ''
  seedBriefEditing.value = false
  seedBriefError.value = ''
}

async function saveSeedBrief() {
  if (!seedId.value || seedBriefSaving.value) return
  const markdown = seedBriefDraft.value.trim()
  if (!markdown) {
    seedBriefError.value = '种子主简报不能为空'
    return
  }

  seedBriefSaving.value = true
  seedBriefError.value = ''

  try {
    applySeedBriefDetail(await seedApi.updateSeedBrief(seedId.value, { markdown }))
    await loadWorkspace(selectedNodeId.value)
  } catch (error) {
    seedBriefError.value = errorMessage(error)
  } finally {
    seedBriefSaving.value = false
  }
}

async function loadPublicationRecords(fruitId: string) {
  publicationLoading.value = true
  publicationError.value = ''

  try {
    publicationRecords.value = await publicationApi.listPublicationRecordsByFruit(fruitId)
    await Promise.all(publicationRecords.value.map((record) => loadFeedbackHistory(record.id, { silent: true })))
  } catch (error) {
    publicationError.value = errorMessage(error)
  } finally {
    publicationLoading.value = false
  }
}

function resetPublicationDraft(record: PublicationRecord | null = null) {
  editingPublicationRecord.value = record
  publicationDraft.publicationTarget = record?.publicationTarget ?? ''
  publicationDraft.publicationEvidence = record?.publicationEvidence ?? ''
  publicationDraft.publicationNote = record?.publicationNote ?? ''
}

function openPublicationDialog(record: PublicationRecord | null = null) {
  if (!record && !canCreatePublicationRecord.value) return
  resetPublicationDraft(record)
  publicationDialogOpen.value = true
  publicationError.value = ''
}

async function savePublicationRecord() {
  const node = selectedNode.value
  if (!node || node.nodeType !== 'fruit' || !node.fruitId || publicationSaving.value || isReadOnly.value) return

  publicationSaving.value = true
  publicationError.value = ''

  try {
    if (editingPublicationRecord.value) {
      await publicationApi.updatePublicationRecord(editingPublicationRecord.value.id, {
        publicationTarget: publicationDraft.publicationTarget,
        publicationEvidence: publicationDraft.publicationEvidence,
        publicationNote: publicationDraft.publicationNote,
      })
    } else {
      await publicationApi.createPublicationRecord({
        fruitId: node.fruitId,
        publicationTarget: publicationDraft.publicationTarget,
        publicationEvidence: publicationDraft.publicationEvidence,
        publicationNote: publicationDraft.publicationNote,
      })
    }
    publicationDialogOpen.value = false
    resetPublicationDraft()
    await loadPublicationRecords(node.fruitId)
  } catch (error) {
    publicationError.value = errorMessage(error)
  } finally {
    publicationSaving.value = false
  }
}

async function loadFeedbackHistory(publicationRecordId: string, options: { silent?: boolean } = {}) {
  feedbackLoading.value = publicationRecordId
  if (!options.silent) feedbackError.value = ''

  try {
    feedbackHistories[publicationRecordId] = await feedbackApi.getFeedbackHistory(publicationRecordId)
  } catch (error) {
    if (!options.silent) feedbackError.value = errorMessage(error)
  } finally {
    if (feedbackLoading.value === publicationRecordId) feedbackLoading.value = ''
  }
}

async function attachManualMonitor(publicationRecordId: string) {
  if (isReadOnly.value || feedbackSaving.value) return
  feedbackSaving.value = `monitor:${publicationRecordId}`
  feedbackError.value = ''

  try {
    await feedbackApi.attachManualMonitor(publicationRecordId)
    await loadFeedbackHistory(publicationRecordId)
  } catch (error) {
    feedbackError.value = errorMessage(error)
  } finally {
    feedbackSaving.value = ''
  }
}

function resetFeedbackDraft(snapshot: FeedbackSnapshot | null = null) {
  editingFeedbackSnapshot.value = snapshot
  feedbackDraft.performanceData = snapshot
    ? Object.entries(snapshot.performanceData).map(([key, value]) => ({
        key,
        value: stringifyFeedbackMetricValue(value),
      }))
    : []
  feedbackDraft.userObservation = snapshot?.userObservation ?? ''
  feedbackDraft.capturedAt = snapshot?.capturedAt ?? ''
  feedbackMetricNameInputOpen.value = false
  feedbackMetricNameDraft.value = ''
}

async function openFeedbackMetricNameInput() {
  feedbackMetricNameInputOpen.value = true
  feedbackMetricNameDraft.value = ''
  await nextTick()
  feedbackMetricNameInputRef.value?.focus()
}

function addFeedbackMetric() {
  const key = feedbackMetricNameDraft.value.trim()
  if (!key) return
  if (feedbackDraft.performanceData.some((item) => item.key === key)) {
    feedbackError.value = '该表现数据字段已经存在'
    return
  }
  feedbackDraft.performanceData.push({ key, value: '' })
  feedbackMetricNameDraft.value = ''
  feedbackMetricNameInputOpen.value = false
  feedbackError.value = ''
}

function closeFeedbackMetricNameInput() {
  feedbackMetricNameInputOpen.value = false
  feedbackMetricNameDraft.value = ''
}

function removeFeedbackMetric(index: number) {
  feedbackDraft.performanceData.splice(index, 1)
}

function openFeedbackDialog(publicationRecordId: string, snapshot: FeedbackSnapshot | null = null) {
  if (isReadOnly.value) return
  activeFeedbackPublicationId.value = publicationRecordId
  resetFeedbackDraft(snapshot)
  feedbackDialogOpen.value = true
  feedbackError.value = ''
}

async function saveFeedbackSnapshot() {
  const publicationRecordId = activeFeedbackPublicationId.value
  if (!publicationRecordId || isReadOnly.value || feedbackSaving.value) return

  const performanceData = buildFeedbackPerformanceData()
  if (Object.keys(performanceData).length === 0) {
    feedbackError.value = '请至少添加一个表现数据字段'
    return
  }

  feedbackSaving.value = editingFeedbackSnapshot.value ? `snapshot:${editingFeedbackSnapshot.value.id}` : `snapshot:${publicationRecordId}`
  feedbackError.value = ''

  try {
    if (editingFeedbackSnapshot.value) {
      await feedbackApi.updateFeedbackSnapshot(editingFeedbackSnapshot.value.id, {
        performanceData,
        userObservation: feedbackDraft.userObservation,
        capturedAt: feedbackDraft.capturedAt || undefined,
      })
    } else {
      await feedbackApi.createFeedbackSnapshot(publicationRecordId, {
        performanceData,
        userObservation: feedbackDraft.userObservation,
        capturedAt: feedbackDraft.capturedAt || undefined,
      })
    }
    feedbackDialogOpen.value = false
    resetFeedbackDraft()
    await loadFeedbackHistory(publicationRecordId)
  } catch (error) {
    feedbackError.value = errorMessage(error)
  } finally {
    feedbackSaving.value = ''
  }
}

function buildFeedbackPerformanceData(): Record<string, unknown> {
  return feedbackDraft.performanceData.reduce<Record<string, unknown>>((result, item) => {
    const key = item.key.trim()
    if (!key) return result
    result[key] = parseFeedbackMetricValue(item.value)
    return result
  }, {})
}

function parseFeedbackMetricValue(value: string): unknown {
  const normalized = value.trim()
  if (normalized === '') return ''
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  if (normalized === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(normalized)) return Number(normalized)
  return value
}

function stringifyFeedbackMetricValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value)
  return JSON.stringify(value)
}

function findNode(nodeId: string) {
  return nodes.value.find((node) => node.id === nodeId)
}

function getNodeSize(node: TreeNode) {
  return node.nodeType === 'seed' ? nodeSize.seed : nodeSize.fruit
}

function getParentPort(node: TreeNode) {
  const size = getNodeSize(node)
  return { x: node.x + size.width / 2, y: node.y + 14 }
}

function getChildPort(node: TreeNode) {
  const size = getNodeSize(node)
  return { x: node.x + size.width / 2, y: node.y + size.height - 12 }
}

function makeBranchPath(parent: TreeNode, child: TreeNode) {
  const from = getParentPort(parent)
  const to = getChildPort(child)
  const distance = Math.max(56, Math.abs(from.y - to.y))
  const bend = distance * 0.5
  const sway = Math.max(-42, Math.min(42, (to.x - from.x) * 0.16))
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} C ${(from.x + sway).toFixed(1)} ${(from.y - bend).toFixed(1)}, ${(to.x - sway).toFixed(1)} ${(to.y + bend).toFixed(1)}, ${to.x.toFixed(1)} ${to.y.toFixed(1)}`
}

function nodeStyle(node: TreeNode) {
  return { left: `${node.x}px`, top: `${node.y}px` }
}

function nodeClasses(node: TreeNode) {
  return [
    `is-${node.nodeType}`,
    node.selectionState ? `is-${node.selectionState}` : '',
    node.status !== 'idle' ? `is-${node.status}` : '',
    node.isPlaceholder ? 'is-growth-placeholder' : '',
    selectedNodeId.value === node.id ? 'is-active' : '',
  ]
}

function nodeStateLabel(node: TreeNode) {
  if (node.status === 'growing') return '生长中'
  if (node.status === 'failed') return '最近失败'
  if (node.nodeType === 'seed') return isReadOnly.value ? '只读种子' : '根节点'
  if (node.selectionState === 'selected') return '已选择'
  if (node.selectionState === 'eliminated') return '已淘汰'
  return '候选'
}

function nodeSecondaryLabel(node: TreeNode) {
  if (node.status === 'growing') return '...'
  if (node.nodeType === 'seed') return 'Root'
  return node.geneTags[0] || node.contentLocation || 'Fruit'
}

async function selectNode(nodeId: string) {
  if (suppressClickNodeId.value === nodeId) {
    suppressClickNodeId.value = ''
    return
  }
  selectedNodeId.value = nodeId
  resourcePopoverOpen.value = false
  generatorMenuOpen.value = false
  fruitCountMenuOpen.value = false
  mutationIntensityMenuOpen.value = false
  searchModeMenuOpen.value = false
  growthDetailOpen.value = false
  growthError.value = ''
  await loadSelectedNodeDetail()
}

async function setSelectionState(state: FruitSelectionState) {
  const node = selectedNode.value
  if (!node || node.nodeType !== 'fruit' || !node.fruitId || isReadOnly.value) return

  selectionLoading.value = true
  detailError.value = ''

  try {
    const detail = state === 'selected'
      ? await fruitApi.selectFruit(node.fruitId)
      : state === 'eliminated'
        ? await fruitApi.eliminateFruit(node.fruitId)
        : await fruitApi.restoreFruitCandidate(node.fruitId)

    applyFruitDetail(node, detail)
    await loadWorkspace(node.id)
  } catch (error) {
    detailError.value = errorMessage(error)
  } finally {
    selectionLoading.value = false
  }
}

function evidenceLabel(sourceType: string) {
  if (sourceType === 'fruit_selected') return '选择果实'
  if (sourceType === 'fruit_eliminated') return '淘汰果实'
  if (sourceType === 'publication') return '发布记录'
  if (sourceType === 'feedback') return '数据反馈'
  return sourceType
}

function evidenceSourceSummary(sources: Array<{ sourceType: string; strength: string }>) {
  const counts = new Map<string, number>()
  sources.forEach((source) => {
    const label = evidenceLabel(source.sourceType)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  })
  return [...counts.entries()]
    .map(([label, count]) => `${label} ${count}`)
    .join(' / ')
}

function evidenceStrengthSummary(sources: Array<{ strength: string }>) {
  const strengths = [...new Set(sources.map((source) => source.strength).filter(Boolean))]
  return strengths.length > 0 ? strengths.join(' / ') : '待补充证据强度'
}

function selectionStateLabel(state?: FruitSelectionState) {
  if (state === 'selected') return '已选择'
  if (state === 'eliminated') return '已淘汰'
  return '候选'
}

function findEvidenceNode(source: GeneEvidenceSource) {
  return nodes.value.find((node) => {
    if (source.sourceType === 'fruit_selected' || source.sourceType === 'fruit_eliminated') {
      return node.fruitId === source.sourceId || node.id === source.sourceId
    }
    return node.id === source.sourceId
  }) ?? null
}

function evidenceSourceTitle(source: GeneEvidenceSource) {
  return findEvidenceNode(source)?.title || evidenceLabel(source.sourceType)
}

function evidenceSourceMeta(source: GeneEvidenceSource) {
  const node = findEvidenceNode(source)
  if (!node) return `${evidenceLabel(source.sourceType)} · ${source.strength}`
  const parts = [
    node.nodeType === 'fruit' ? selectionStateLabel(node.selectionState) : '种子',
    `${source.strength} 证据`,
  ]
  if (node.geneTags[0]) parts.push(node.geneTags[0])
  return parts.join(' · ')
}

function evidenceSourcePreview(source: GeneEvidenceSource) {
  const node = findEvidenceNode(source)
  return node?.summary || '当前证据暂未加载详情，可先根据事件类型说明你的判断原因。'
}

async function focusEvidenceSource(source: GeneEvidenceSource) {
  const node = findEvidenceNode(source)
  if (!node) return
  geneHubDialogOpen.value = false
  await selectNode(node.id)
}

function openGeneReasonComposer(reminderId: string) {
  if (!geneReasonComposerIds.value.includes(reminderId)) {
    geneReasonComposerIds.value = [...geneReasonComposerIds.value, reminderId]
  }
  if (geneExtractionReasonDrafts[reminderId] === undefined) {
    geneExtractionReasonDrafts[reminderId] = ''
  }
}

function cancelGeneReasonComposer(reminderId: string) {
  geneReasonComposerIds.value = geneReasonComposerIds.value.filter((id) => id !== reminderId)
}

function isGeneReasonComposerOpen(reminderId: string) {
  return geneReasonComposerIds.value.includes(reminderId)
}

function geneReminderAction(reminderId: string) {
  const reminder = geneHub.value?.pendingReminders.find((item) => item.id === reminderId)
  if (reminder?.runningTaskId) return 'extract'
  return geneReminderActionLoading[reminderId] ?? ''
}

function isGeneReminderBusy(reminderId: string) {
  return Boolean(geneReminderAction(reminderId))
}

function openGeneLibrary() {
  void navigateTo(`/seeds/${encodeURIComponent(seedId.value)}/genes`)
}

function resetGeneSuggestionDraft(suggestion: GeneSuggestion | null) {
  activeGeneSuggestion.value = suggestion
  geneSuggestionDraft.title = suggestion?.title ?? ''
  geneSuggestionDraft.bodyMarkdown = suggestion?.bodyMarkdown ?? ''
  geneSuggestionDraft.lineage = suggestion?.lineage ?? ''
  geneSuggestionDraft.niche = suggestion?.niche ?? ''
}

async function startGeneExtraction(reminderId: string) {
  const reminder = geneHub.value?.pendingReminders.find((item) => item.id === reminderId)
  if (!reminder || isGeneReminderBusy(reminderId)) return
  if (!isGeneReasonComposerOpen(reminderId)) {
    openGeneReasonComposer(reminderId)
    return
  }

  geneReminderActionLoading[reminderId] = 'extract'
  geneActionError.value = ''
  pollGeneExtractionReminder(reminderId)

  try {
    const result = await geneApi.startExtractionTask(seedId.value, {
      reminderId: reminder.id,
      reason: geneExtractionReasonDrafts[reminderId]?.trim() || undefined,
      evidenceSources: reminder.evidenceSources,
    })
    geneExtractionReasonDrafts[reminderId] = ''
    cancelGeneReasonComposer(reminderId)
    await loadWorkspace(selectedNodeId.value)
    if (!activeGeneSuggestion.value && result.suggestions[0]) {
      resetGeneSuggestionDraft(result.suggestions[0])
    }
  } catch (error) {
    await loadWorkspace(selectedNodeId.value)
    const reminderStillPending = geneHub.value?.pendingReminders.some((item) => item.id === reminderId) ?? false
    geneActionError.value = reminderStillPending ? errorMessage(error) : ''
  } finally {
    geneReminderActionLoading[reminderId] = undefined
    stopGeneExtractionPolling(reminderId)
  }
}

function pollGeneExtractionReminder(reminderId: string) {
  stopGeneExtractionPolling(reminderId)
  geneExtractionPollAttempts.set(reminderId, 0)
  scheduleGeneExtractionPoll(reminderId)
}

function scheduleGeneExtractionPoll(reminderId: string) {
  const key = geneExtractionPollKey(reminderId)
  const timer = setTimeout(async () => {
    pollTimers.delete(key)
    const attempts = (geneExtractionPollAttempts.get(reminderId) ?? 0) + 1
    geneExtractionPollAttempts.set(reminderId, attempts)

    try {
      await loadWorkspace(selectedNodeId.value)
      const reminder = geneHub.value?.pendingReminders.find((item) => item.id === reminderId) ?? null
      if (reminder === null) {
        geneReminderActionLoading[reminderId] = undefined
        geneExtractionReasonDrafts[reminderId] = ''
        cancelGeneReasonComposer(reminderId)
        stopGeneExtractionPolling(reminderId)
        return
      }
      if (attempts >= GENE_EXTRACTION_MAX_POLL_ATTEMPTS) {
        geneReminderActionLoading[reminderId] = undefined
        stopGeneExtractionPolling(reminderId)
        geneActionError.value = '基因汲取仍在处理，请稍后重新打开工作区查看结果'
        return
      }
      if (reminder.runningTaskId || geneReminderActionLoading[reminderId] === 'extract') {
        scheduleGeneExtractionPoll(reminderId)
      }
    } catch (error) {
      geneActionError.value = errorMessage(error)
      scheduleGeneExtractionPoll(reminderId)
    }
  }, GENE_EXTRACTION_POLL_INTERVAL_MS)
  pollTimers.set(key, timer)
}

function geneExtractionPollKey(reminderId: string) {
  return `gene-extraction:${reminderId}`
}

function stopGeneExtractionPolling(reminderId: string) {
  const key = geneExtractionPollKey(reminderId)
  const timer = pollTimers.get(key)
  if (timer) clearTimeout(timer)
  pollTimers.delete(key)
  geneExtractionPollAttempts.delete(reminderId)
}

async function ignoreGeneReminder(reminderId: string) {
  if (isGeneReminderBusy(reminderId)) return
  geneReminderActionLoading[reminderId] = 'ignore'
  geneActionError.value = ''

  try {
    await geneApi.ignoreReminder(reminderId)
    await loadWorkspace(selectedNodeId.value)
  } catch (error) {
    geneActionError.value = errorMessage(error)
  } finally {
    geneReminderActionLoading[reminderId] = undefined
  }
}

async function viewGeneSuggestion(suggestionId: string) {
  if (geneActionLoading.value) return
  geneActionLoading.value = `view:${suggestionId}`
  geneActionError.value = ''

  try {
    resetGeneSuggestionDraft(await geneApi.getSuggestion(suggestionId))
    geneHubDialogOpen.value = true
  } catch (error) {
    geneActionError.value = errorMessage(error)
  } finally {
    geneActionLoading.value = ''
  }
}

async function saveGeneSuggestion() {
  if (!activeGeneSuggestion.value || geneActionLoading.value) return
  geneActionLoading.value = `save:${activeGeneSuggestion.value.id}`
  geneActionError.value = ''

  try {
    resetGeneSuggestionDraft(await geneApi.editSuggestion(activeGeneSuggestion.value.id, {
      title: geneSuggestionDraft.title,
      bodyMarkdown: geneSuggestionDraft.bodyMarkdown,
      lineage: geneSuggestionDraft.lineage,
      niche: geneSuggestionDraft.niche,
    }))
    await loadWorkspace(selectedNodeId.value)
  } catch (error) {
    geneActionError.value = errorMessage(error)
  } finally {
    geneActionLoading.value = ''
  }
}

async function confirmGeneSuggestion() {
  if (!activeGeneSuggestion.value || geneActionLoading.value) return
  geneActionLoading.value = `confirm:${activeGeneSuggestion.value.id}`
  geneActionError.value = ''

  try {
    await geneApi.confirmSuggestion(activeGeneSuggestion.value.id, {
      title: geneSuggestionDraft.title,
      bodyMarkdown: geneSuggestionDraft.bodyMarkdown,
      lineage: geneSuggestionDraft.lineage,
      niche: geneSuggestionDraft.niche,
    })
    resetGeneSuggestionDraft(null)
    await loadWorkspace(selectedNodeId.value)
  } catch (error) {
    geneActionError.value = errorMessage(error)
  } finally {
    geneActionLoading.value = ''
  }
}

async function dismissGeneSuggestion(suggestionId = activeGeneSuggestion.value?.id) {
  if (!suggestionId || geneActionLoading.value) return
  geneActionLoading.value = `dismiss:${suggestionId}`
  geneActionError.value = ''

  try {
    await geneApi.dismissSuggestion(suggestionId)
    if (activeGeneSuggestion.value?.id === suggestionId) resetGeneSuggestionDraft(null)
    await loadWorkspace(selectedNodeId.value)
  } catch (error) {
    geneActionError.value = errorMessage(error)
  } finally {
    geneActionLoading.value = ''
  }
}

function startCanvasDrag(event: PointerEvent) {
  if (event.button !== 0) return
  dragState.value = {
    mode: 'canvas',
    startX: event.clientX,
    startY: event.clientY,
    originX: transform.x,
    originY: transform.y,
    moved: false,
  }
  capturePointer(event)
}

function startNodeDrag(event: PointerEvent, node: TreeNode) {
  if (event.button !== 0) return
  event.stopPropagation()
  dragState.value = {
    mode: 'node',
    nodeId: node.id,
    startX: event.clientX,
    startY: event.clientY,
    originX: node.x,
    originY: node.y,
    moved: false,
  }
  capturePointer(event)
}

function capturePointer(event: PointerEvent) {
  try {
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  } catch {
    // Synthetic pointer events and some embedded browsers may not expose an active pointer.
  }
}

function handlePointerMove(event: PointerEvent) {
  if (!dragState.value) return

  const dx = event.clientX - dragState.value.startX
  const dy = event.clientY - dragState.value.startY
  if (Math.abs(dx) + Math.abs(dy) > 3) dragState.value.moved = true

  if (dragState.value.mode === 'canvas') {
    transform.x = dragState.value.originX + dx
    transform.y = dragState.value.originY + dy
    return
  }

  const node = dragState.value.nodeId ? findNode(dragState.value.nodeId) : null
  if (!node) return
  node.x = dragState.value.originX + dx / transform.scale
  node.y = dragState.value.originY + dy / transform.scale
}

function endDrag() {
  if (dragState.value?.mode === 'node' && dragState.value.moved && dragState.value.nodeId) {
    suppressClickNodeId.value = dragState.value.nodeId
  }
  dragState.value = null
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  const nextScale = transform.scale + (event.deltaY > 0 ? -0.05 : 0.05)
  transform.scale = Math.min(1.28, Math.max(0.72, nextScale))
}

function resetView() {
  void arrangeTreeView()
}

async function toggleEliminatedNodesVisibility() {
  hideEliminatedNodes.value = !hideEliminatedNodes.value
  const selectionChanged = ensureSelectedNodeVisible()
  nodes.value = layoutVisibleTreeNodes(nodes.value)
  await nextTick()
  fitTreeInView()
  if (selectionChanged) await loadSelectedNodeDetail()
}

function addResource(resource: ResourceRef) {
  if (!referencedResources.value.some((item) => item.id === resource.id && item.kind === resource.kind)) {
    referencedResources.value = [resource, ...referencedResources.value]
  }
  removedDefaultResourceKeys.value = removedDefaultResourceKeys.value.filter((key) => key !== resourceKey(resource))
  growthIntent.value = removeActiveMention(growthIntent.value)
  resourcePopoverOpen.value = false
  resourceQuery.value = ''
  void nextTick(() => growthInputEl.value?.focus())
}

function removeResource(resource: ResourceRef) {
  referencedResources.value = referencedResources.value.filter((item) => !(item.id === resource.id && item.kind === resource.kind))
  if (resource.kind === 'nutrient') {
    removedDefaultResourceKeys.value = [...new Set([...removedDefaultResourceKeys.value, resourceKey(resource)])]
  }
}

function resourceKey(resource: Pick<ResourceRef, 'id' | 'kind'>) {
  return `${resource.kind}:${resource.id}`
}

function applyDefaultGrowthNutrients() {
  const defaultResources = resourceOptions.value.filter((resource) => {
    if (resource.kind !== 'nutrient') return false
    if (removedDefaultResourceKeys.value.includes(resourceKey(resource))) return false
    const nutrient = snapshot.value?.resources.nutrients.find((item) => item.id === resource.id)
    return nutrient?.defaultForGrowth === true
  })
  const missing = defaultResources.filter((resource) => !referencedResources.value.some((item) => item.id === resource.id && item.kind === resource.kind))
  if (missing.length > 0) {
    referencedResources.value = [...missing, ...referencedResources.value]
  }
}

function handleNutrientWorkbenchReference(resource: ResourceRef) {
  addResource(resource)
  nutrientWorkbenchOpen.value = false
}

async function handleNutrientWorkbenchChanged() {
  await loadWorkspace(selectedNode.value?.id)
}

function removeActiveMention(value: string) {
  const match = value.match(/(^|\s)@[^\s@]*$/)
  if (!match || typeof match.index !== 'number') return value

  const prefix = value.slice(0, match.index)
  const spacer = match[1] ? ' ' : ''
  return `${prefix}${spacer}`.replace(/\s+$/, ' ')
}

function updateResourcePopover(event: Event) {
  const target = event.target as HTMLTextAreaElement
  const beforeCursor = growthIntent.value.slice(0, target.selectionStart ?? growthIntent.value.length)
  const match = beforeCursor.match(/(?:^|\s)@([^\s@]*)$/)
  resourceQuery.value = match?.[1] ?? ''
  resourcePopoverOpen.value = Boolean(match)
}

function openResourceMention() {
  growthIntent.value = growthIntent.value.endsWith(' ') || !growthIntent.value
    ? `${growthIntent.value}@`
    : `${growthIntent.value} @`
  resourceQuery.value = ''
  resourcePopoverOpen.value = true
  generatorMenuOpen.value = false
  fruitCountMenuOpen.value = false
  mutationIntensityMenuOpen.value = false
  searchModeMenuOpen.value = false
  void nextTick(() => growthInputEl.value?.focus())
}

function toggleGeneratorMenu() {
  generatorMenuOpen.value = !generatorMenuOpen.value
  fruitCountMenuOpen.value = false
  mutationIntensityMenuOpen.value = false
  searchModeMenuOpen.value = false
  resourcePopoverOpen.value = false
}

function toggleFruitCountMenu() {
  fruitCountMenuOpen.value = !fruitCountMenuOpen.value
  generatorMenuOpen.value = false
  mutationIntensityMenuOpen.value = false
  searchModeMenuOpen.value = false
  resourcePopoverOpen.value = false
}

function toggleMutationIntensityMenu() {
  mutationIntensityMenuOpen.value = !mutationIntensityMenuOpen.value
  searchModeMenuOpen.value = false
  generatorMenuOpen.value = false
  fruitCountMenuOpen.value = false
  resourcePopoverOpen.value = false
}

function toggleSearchModeMenu() {
  searchModeMenuOpen.value = !searchModeMenuOpen.value
  mutationIntensityMenuOpen.value = false
  generatorMenuOpen.value = false
  fruitCountMenuOpen.value = false
  resourcePopoverOpen.value = false
}

function selectGenerator(generatorId: string) {
  selectedGeneratorId.value = generatorId
  generatorMenuOpen.value = false
}

function selectFruitCount(count: number) {
  fruitCount.value = count
  fruitCountMenuOpen.value = false
}

function selectSearchMode(mode: GrowthSearchMode) {
  selectedSearchMode.value = mode
  searchModeMenuOpen.value = false
}

function selectMutationIntensity(intensity: GrowthMutationIntensity) {
  selectedMutationIntensity.value = intensity
  mutationIntensityMenuOpen.value = false
}

async function startGrowth() {
  const source = selectedNode.value
  if (!source || !visibleComposer.value || !selectedGeneratorId.value) return

  growthLoading.value = true
  growthError.value = ''
  growthDetailOpen.value = false
  generatorMenuOpen.value = false
  fruitCountMenuOpen.value = false
  mutationIntensityMenuOpen.value = false
  searchModeMenuOpen.value = false

  try {
    const nutrientRefs = referencedResources.value
      .filter((resource) => resource.kind === 'nutrient')
      .map((resource) => ({ resourceType: 'nutrient' as const, resourceId: resource.id }))
    const geneRefs = referencedResources.value
      .filter((resource) => resource.kind === 'gene')
      .map((resource) => ({ resourceType: 'gene' as const, resourceId: resource.id }))
    const temporaryNutrientCardRefs = referencedResources.value
      .filter((resource) => resource.kind === 'nutrient_card')
      .map((resource) => ({ resourceType: 'nutrient_card' as const, resourceId: resource.id }))
    const payload = {
      seedId: seedId.value,
      sourceNodeRef: { nodeType: source.nodeType, nodeId: source.id },
      userInput: growthIntent.value.trim(),
      generatorId: selectedGeneratorId.value,
      fruitCount: fruitCount.value,
      nutrientRefs,
      temporaryNutrientCardRefs,
      geneRefs,
      searchMode: selectedSearchMode.value,
      mutationIntensity: selectedMutationIntensity.value,
    }
    source.status = 'growing'
    source.taskId = 'pending'
    addGrowthPlaceholders(source, fruitCount.value)
    console.info('[ContentForest] start growth task payload', payload)
    const result = await growthApi.startGrowthTask(payload)
    growthPipelineTasks[result.task.id] = result.task
    source.status = 'growing'
    source.taskId = result.task.id
    updateGrowthPlaceholderTaskId(source.id, result.task.id)
    growthTaskFruitCounts.set(result.task.id, result.task.successfulFruitIds.length)
    pollGrowthTask(result.task)
  } catch (error) {
    removeGrowthPlaceholders(source.id)
    source.status = 'failed'
    source.taskId = null
    growthError.value = errorMessage(error)
  } finally {
    growthLoading.value = false
  }
}

function addGrowthPlaceholders(source: TreeNode, count: number, taskId = source.taskId) {
  removeGrowthPlaceholders(source.id)
  const placeholders = Array.from({ length: count }, (_, index): TreeNode => ({
    id: `pending-${source.id}-${Date.now()}-${index}`,
    nodeType: 'fruit',
    title: `果实生成中 ${index + 1}`,
    summary: `生成中 ${index + 1}`,
    markdown: '',
    x: source.x,
    y: source.y - 240,
    selectionState: 'candidate',
    parentNodeRef: { nodeType: source.nodeType, nodeId: source.id },
    contentLocation: '',
    generatorId: selectedGeneratorId.value || null,
    geneTags: ['胚芽装配', '脉冲生成'],
    records: ['枝化生长任务已提交，等待后端返回真实果实'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'growing',
    taskId,
    isPlaceholder: true,
    failedInput: {
      hasFailedInput: false,
      taskId: null,
      failureReason: null,
      updatedAt: null,
    },
  }))
  nodes.value = layoutVisibleTreeNodes([...nodes.value, ...placeholders])
}

function updateGrowthPlaceholderTaskId(sourceNodeId: string, taskId: string) {
  nodes.value.forEach((node) => {
    if (node.isPlaceholder && node.parentNodeRef?.nodeId === sourceNodeId) node.taskId = taskId
  })
}

function removeGrowthPlaceholders(sourceNodeId: string) {
  nodes.value = nodes.value.filter((node) => !(node.isPlaceholder && node.parentNodeRef?.nodeId === sourceNodeId))
}

function pollGrowthTask(task: GrowthTaskDetail) {
  stopGrowthPolling(task.id)
  growthPipelineTasks[task.id] = task
  growthTaskFruitCounts.set(task.id, task.successfulFruitIds.length)

  if (task.status !== 'running') {
    growthTaskFruitCounts.delete(task.id)
    growthPipelineTasks[task.id] = undefined
    removeGrowthPlaceholders(task.sourceNodeRef.nodeId)
    void loadWorkspace(task.sourceNodeRef.nodeId)
    return
  }

  const timer = setTimeout(async () => {
    pollTimers.delete(task.id)
    try {
      const nextTask = await growthApi.getGrowthTask(task.id)
      growthPipelineTasks[nextTask.id] = nextTask
      if (nextTask.status === 'running') {
        await syncGrowthTaskProgress(nextTask)
        pollGrowthTask(nextTask)
        return
      }

      growthTaskFruitCounts.delete(nextTask.id)
      growthPipelineTasks[nextTask.id] = undefined
      if (nextTask.status === 'failed') growthError.value = nextTask.failureReason || '枝化生长失败，可恢复输入后重试'
      removeGrowthPlaceholders(nextTask.sourceNodeRef.nodeId)
      await loadWorkspace(nextTask.sourceNodeRef.nodeId)
    } catch (error) {
      growthError.value = errorMessage(error)
    }
  }, 1800)
  pollTimers.set(task.id, timer)
}

async function syncGrowthTaskProgress(task: GrowthTaskDetail) {
  const previousCount = growthTaskFruitCounts.get(task.id) ?? 0
  const currentCount = task.successfulFruitIds.length
  if (currentCount <= previousCount) return

  growthTaskFruitCounts.set(task.id, currentCount)
  removeGrowthPlaceholders(task.sourceNodeRef.nodeId)
  await loadWorkspace(task.sourceNodeRef.nodeId)

  const source = findNode(task.sourceNodeRef.nodeId)
  const remainingCount = Math.max(task.fruitCount - currentCount, 0)
  if (source && remainingCount > 0) {
    source.status = 'growing'
    source.taskId = task.id
    addGrowthPlaceholders(source, remainingCount)
  }
}

function stopGrowthPolling(taskId: string) {
  const timer = pollTimers.get(taskId)
  if (timer) clearTimeout(timer)
  pollTimers.delete(taskId)
  growthTaskFruitCounts.delete(taskId)
  growthPipelineTasks[taskId] = undefined
}

function stopAllPolling() {
  pollTimers.forEach((timer) => clearTimeout(timer))
  pollTimers.clear()
  Object.keys(growthPipelineTasks).forEach((taskId) => {
    growthPipelineTasks[taskId] = undefined
  })
  geneExtractionPollAttempts.clear()
}

async function restoreFailedInput() {
  const node = selectedNode.value
  if (!node || !node.failedInput.hasFailedInput) return

  growthError.value = ''

  try {
    const failedInput = await growthApi.getGrowthFailedInput(node.nodeType as GrowthNodeType, node.id)
    if (!failedInput) return
    applyFailedInput(failedInput)
  } catch (error) {
    growthError.value = errorMessage(error)
  }
}

function applyFailedInput(failedInput: GrowthFailedInput) {
  growthIntent.value = failedInput.userInput || ''
  selectedGeneratorId.value = failedInput.generatorId
  fruitCount.value = failedInput.fruitCount || 3
  selectedSearchMode.value = failedInput.pipelineParams?.searchMode ?? selectedSearchMode.value
  selectedMutationIntensity.value = failedInput.pipelineParams?.mutationIntensity ?? selectedMutationIntensity.value
  referencedResources.value = [
    ...failedInput.nutrientRefs,
    ...failedInput.temporaryNutrientCardRefs,
    ...failedInput.geneRefs,
  ].map((ref) => {
    const matchedResource = resourceOptions.value.find((resource) => resource.id === ref.resourceId && resource.kind === ref.resourceType)
    if (matchedResource) return matchedResource
    if (ref.resourceType === 'nutrient_card') {
      return {
        id: ref.resourceId,
        kind: 'nutrient_card' as const,
        label: ref.resourceId,
        scope: '草稿营养内容',
        description: '最近失败任务中的临时引用',
      }
    }
    return null
  })
    .filter((resource): resource is ResourceRef => Boolean(resource))
}

async function retryGrowth() {
  const node = selectedNode.value
  if (!node || !node.failedInput.hasFailedInput) return

  growthLoading.value = true
  growthError.value = ''

  try {
    const result = await growthApi.retryGrowthSource(node.nodeType as GrowthNodeType, node.id)
    growthPipelineTasks[result.task.id] = result.task
    node.status = 'growing'
    node.taskId = result.task.id
    addGrowthPlaceholders(node, result.task.fruitCount || fruitCount.value)
    growthTaskFruitCounts.set(result.task.id, result.task.successfulFruitIds.length)
    pollGrowthTask(result.task)
  } catch (error) {
    growthError.value = errorMessage(error)
  } finally {
    growthLoading.value = false
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '未知'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
</script>

<template>
  <section class="cf-workspace-page">
    <header class="cf-workspace-topbar">
      <div class="cf-workspace-nav-zone">
        <NuxtLink class="cf-topbar-icon-action is-home" to="/seeds" aria-label="返回种子库" title="返回种子库">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 11.2 12 5l7 6.2" />
            <path d="M7.5 10.2V19h9v-8.8" />
            <path d="M10 19v-5h4v5" />
          </svg>
          <span>种子库</span>
        </NuxtLink>
        <div class="cf-workspace-crumb">
          <strong>{{ snapshot?.seed.title || '内容森林工作区' }}</strong>
        </div>
      </div>
      <div class="cf-header-tree-status" :class="{ 'is-growing': isTreeGrowing }">
        <strong>
          <span>{{ treeStatusTitle }}</span>
          <span>{{ treeStatusValue }}</span>
        </strong>
        <div class="cf-growth-meter"><span /></div>
      </div>
      <div class="cf-workspace-actions">
        <button class="cf-topbar-icon-action" type="button" :aria-expanded="seedBriefPanelOpen" title="打开种子简报" @click="openSeedBriefPanel">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 4.8h10a1.2 1.2 0 0 1 1.2 1.2v12A1.2 1.2 0 0 1 17 19.2H7A1.2 1.2 0 0 1 5.8 18V6A1.2 1.2 0 0 1 7 4.8Z" />
            <path d="M8.8 8.4h6.4" />
            <path d="M8.8 12h6.4" />
            <path d="M8.8 15.6h3.8" />
          </svg>
          <span>简报</span>
        </button>
        <button class="cf-topbar-icon-action" type="button" :aria-expanded="nutrientWorkbenchOpen" title="打开营养工作台" @click="nutrientWorkbenchOpen = true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4.8c3.9 0 6.8 2.1 6.8 5.3 0 4.9-5.2 7.8-6.8 9.1-1.6-1.3-6.8-4.2-6.8-9.1 0-3.2 2.9-5.3 6.8-5.3Z" />
            <path d="M9.2 10.4c1.5.1 2.4.7 2.8 1.9.4-1.2 1.3-1.8 2.8-1.9" />
            <path d="M12 12.3v4.1" />
          </svg>
          <span>营养</span>
        </button>
        <button
          class="cf-topbar-icon-action"
          type="button"
          :aria-pressed="!hideEliminatedNodes"
          :title="hideEliminatedNodes ? '显示淘汰节点' : '隐藏淘汰节点'"
          @click="toggleEliminatedNodesVisibility"
        >
          <svg v-if="hideEliminatedNodes" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3.8 12s3-5.2 8.2-5.2S20.2 12 20.2 12s-3 5.2-8.2 5.2S3.8 12 3.8 12Z" />
            <path d="M9.8 12a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 0 0-4.4 0Z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3.8 12s3-5.2 8.2-5.2c2 0 3.6.74 4.9 1.7" />
            <path d="M20.2 12s-3 5.2-8.2 5.2c-2 0-3.6-.74-4.9-1.7" />
            <path d="M4.8 4.8 19.2 19.2" />
          </svg>
          <span>{{ hideEliminatedNodes ? '显示淘汰' : '隐藏淘汰' }}</span>
        </button>
        <button class="cf-topbar-icon-action" type="button" title="整理树形布局" @click="resetView">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5.4v4.2" />
            <path d="M7.2 14.4v-2a2.8 2.8 0 0 1 2.8-2.8h4a2.8 2.8 0 0 1 2.8 2.8v2" />
            <path d="M9.2 5.2h5.6v4.4H9.2Z" />
            <path d="M4.6 14.4h5.2v4.4H4.6Z" />
            <path d="M14.2 14.4h5.2v4.4h-5.2Z" />
          </svg>
          <span>整理</span>
        </button>
      </div>
    </header>

    <NutrientWorkbenchDialog
      :open="nutrientWorkbenchOpen"
      :seed-id="seedId"
      :seed-title="snapshot?.seed.title"
      @changed="handleNutrientWorkbenchChanged"
      @close="nutrientWorkbenchOpen = false"
      @reference="handleNutrientWorkbenchReference"
    />

    <button
      v-if="geneHub"
      class="cf-gene-bubble"
      :class="{ 'has-work': hasGeneHubWork }"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="geneHubDialogOpen"
      :aria-label="`基因汲取，${geneHubStatusText}`"
      @click="geneHubDialogOpen = true"
    >
      <span class="cf-gene-bubble-core" aria-hidden="true">
        <span class="cf-dna-helix">
          <span class="cf-dna-pair" />
          <span class="cf-dna-pair" />
          <span class="cf-dna-pair" />
          <span class="cf-dna-pair" />
          <span class="cf-dna-pair" />
          <span class="cf-dna-pair" />
        </span>
      </span>
      <span v-if="geneHubReminderBadgeCount > 0" class="cf-gene-bubble-badge">{{ geneHubReminderBadgeCount }}</span>
    </button>

    <div v-if="geneHub && geneHubDialogOpen" class="cf-gene-dialog-backdrop" @click.self="geneHubDialogOpen = false">
      <aside class="cf-gene-dialog" role="dialog" aria-modal="true" aria-label="基因汲取建议">
        <header class="cf-gene-dialog-head">
          <div class="cf-gene-dialog-title">
            <span>Gene Extraction Event</span>
            <h2>基因汲取建议</h2>
            <p>处理后端推送的汲取提示，确认可沉淀的表达经验。</p>
          </div>
          <div class="cf-gene-dialog-actions">
            <button class="cf-gene-dialog-btn" type="button" @click="openGeneLibrary">查看基因库</button>
            <button class="cf-gene-dialog-close" type="button" aria-label="关闭基因汲取建议" @click="geneHubDialogOpen = false">×</button>
          </div>
        </header>

        <div class="cf-gene-dialog-body">
          <p v-if="geneActionError" class="cf-inline-error">{{ geneActionError }}</p>

          <section class="cf-gene-dialog-metrics" aria-label="基因汲取概览">
            <article>
              <strong>{{ geneHub.stats.pendingReminderCount }}</strong>
              <span>待汲取提示</span>
            </article>
            <article>
              <strong>{{ geneHub.stats.pendingSuggestionCount }}</strong>
              <span>待沉淀建议</span>
            </article>
            <article>
              <strong>{{ geneHub.stats.referableInsightCount }}</strong>
              <span>可引用经验</span>
            </article>
          </section>

          <section v-if="hasGeneHubWork" class="cf-gene-dialog-section">
            <header class="cf-gene-section-head">
              <div>
                <strong>当前需要处理</strong>
                <span>只展示决策需要的信息，系统编号与文件位置不进入操作界面。</span>
              </div>
            </header>

            <div class="cf-gene-task-list">
              <article
                v-for="reminder in geneHub.pendingReminders"
                :key="reminder.id"
                class="cf-gene-task-card is-reminder"
                :class="{ 'is-composing': isGeneReasonComposerOpen(reminder.id), 'is-extracting': geneReminderAction(reminder.id) === 'extract' }"
              >
                <div v-if="geneReminderAction(reminder.id) === 'extract'" class="cf-gene-card-loader" aria-hidden="true">
                  <span class="cf-gene-card-loader-core">
                    <span />
                    <span />
                    <span />
                  </span>
                  <em>基因链路编织中</em>
                </div>
                <div class="cf-gene-task-main">
                  <span class="cf-gene-task-badge">待汲取</span>
                  <strong>{{ evidenceSourceSummary(reminder.evidenceSources) || '新的物竞天择事件' }}</strong>
                  <p>{{ reminder.evidenceSources.length }} 条证据 · {{ evidenceStrengthSummary(reminder.evidenceSources) }}</p>
                  <div class="cf-gene-evidence-preview">
                    <article v-for="source in reminder.evidenceSources" :key="`${source.sourceType}-${source.sourceId}`">
                      <div>
                        <span>{{ evidenceLabel(source.sourceType) }}</span>
                        <strong>{{ evidenceSourceTitle(source) }}</strong>
                        <em>{{ evidenceSourceMeta(source) }}</em>
                      </div>
                      <p>{{ evidenceSourcePreview(source) }}</p>
                      <button type="button" @click="focusEvidenceSource(source)">查看果实</button>
                    </article>
                  </div>

                  <Transition name="cf-gene-compose">
                    <section v-if="isGeneReasonComposerOpen(reminder.id)" class="cf-gene-reason-panel">
                      <header>
                        <div>
                          <strong>补充本次汲取原因</strong>
                          <span>这段说明会作为 Agent 判断“为什么这个事件值得沉淀”的上下文。</span>
                        </div>
                      </header>
                      <label class="cf-gene-reason-field">
                        <span>原因说明</span>
                        <textarea
                          v-model="geneExtractionReasonDrafts[reminder.id]"
                          placeholder="例如：这个果实被选择，是因为标题先给情绪收益，再引出产品价值，用户理解成本更低。"
                        />
                      </label>
                      <div class="cf-gene-reason-actions">
                        <button type="button" :disabled="isGeneReminderBusy(reminder.id)" @click="startGeneExtraction(reminder.id)">
                          确认汲取
                        </button>
                        <button type="button" :disabled="isGeneReminderBusy(reminder.id)" @click="cancelGeneReasonComposer(reminder.id)">取消</button>
                      </div>
                    </section>
                  </Transition>
                </div>
                <div class="cf-gene-task-actions">
                  <button type="button" :disabled="isGeneReminderBusy(reminder.id)" @click="startGeneExtraction(reminder.id)">
                    {{ isGeneReasonComposerOpen(reminder.id) ? '填写中' : '开始汲取' }}
                  </button>
                  <button type="button" :disabled="isGeneReminderBusy(reminder.id)" @click="ignoreGeneReminder(reminder.id)">忽略</button>
                </div>
              </article>

              <article v-for="suggestion in geneHub.pendingSuggestions" :key="suggestion.id" class="cf-gene-task-card is-suggestion">
                <div class="cf-gene-task-main">
                  <span class="cf-gene-task-badge">待沉淀</span>
                  <strong>{{ suggestion.title }}</strong>
                  <p>{{ suggestion.lineage || '未分配谱系' }} · {{ suggestion.niche || '未分配生态位' }} · {{ suggestion.evidenceSources.length }} 条证据</p>
                </div>
                <div class="cf-gene-task-actions">
                  <button type="button" :disabled="Boolean(geneActionLoading)" @click="viewGeneSuggestion(suggestion.id)">查看建议</button>
                  <button type="button" :disabled="Boolean(geneActionLoading)" @click="dismissGeneSuggestion(suggestion.id)">忽略</button>
                </div>
              </article>
            </div>
          </section>

          <section v-else class="cf-gene-dialog-empty">
            <strong>当前没有新的基因汲取提示</strong>
            <span>选择、淘汰或反馈事件产生后，后端会把需要处理的提示推送到这里。</span>
          </section>

          <section class="cf-gene-dialog-basis" aria-label="汲取依据">
            <header>
              <strong>汲取依据</strong>
              <span>Evidence-backed</span>
            </header>
            <div>
              <span>有效性：与选择、淘汰或反馈结果存在稳定关联</span>
              <span>可迁移性：能够跨果实或跨表达场景复用</span>
              <span>可作用性：能转化为后续生成的提示约束</span>
            </div>
          </section>

          <section v-if="activeGeneSuggestion" class="cf-gene-editor" aria-label="基因建议确认">
            <header class="cf-gene-editor-head">
              <strong>确认基因建议</strong>
              <button type="button" @click="resetGeneSuggestionDraft(null)">收起</button>
            </header>
            <label>
              <span>标题</span>
              <input v-model="geneSuggestionDraft.title" type="text">
            </label>
            <label>
              <span>谱系</span>
              <input v-model="geneSuggestionDraft.lineage" type="text">
            </label>
            <label>
              <span>生态位</span>
              <input v-model="geneSuggestionDraft.niche" type="text">
            </label>
            <label class="is-wide">
              <span>建议正文</span>
              <textarea v-model="geneSuggestionDraft.bodyMarkdown" />
            </label>
            <div class="cf-gene-editor-actions">
              <button type="button" :disabled="Boolean(geneActionLoading)" @click="saveGeneSuggestion">保存</button>
              <button type="button" :disabled="Boolean(geneActionLoading)" @click="confirmGeneSuggestion">沉淀到基因库</button>
              <button type="button" :disabled="Boolean(geneActionLoading)" @click="dismissGeneSuggestion()">忽略</button>
            </div>
          </section>
        </div>
      </aside>
    </div>

    <aside v-if="seedBriefPanelOpen" class="cf-seed-brief-panel" aria-label="种子主简报">
      <header class="cf-seed-brief-head">
        <div>
          <span>Seed Brief</span>
          <strong>种子主简报</strong>
        </div>
        <button type="button" aria-label="关闭种子主简报" @click="closeSeedBriefPanel">×</button>
      </header>

      <section class="cf-seed-brief-status" :class="{ 'is-busy': seedBriefGenerating || seedBriefRefreshing || seedBriefSaving }">
        <div>
          <span>{{ hasSeedBrief ? '当前简报' : '尚未生成' }}</span>
          <strong>{{ seedBriefStatusText }}</strong>
        </div>
        <button
          v-if="!hasSeedBrief"
          type="button"
          :disabled="seedBriefGenerating"
          @click="generateSeedBrief"
        >
          {{ seedBriefGenerating ? '生成中...' : '生成' }}
        </button>
        <button
          v-else
          type="button"
          :disabled="seedBriefRefreshing || seedBriefGenerating"
          @click="refreshSeedBrief"
        >
          {{ seedBriefRefreshing ? '刷新中...' : '刷新' }}
        </button>
      </section>

      <p v-if="seedBriefError" class="cf-inline-error cf-error-action">
        <span>{{ seedBriefError }}</span>
        <button v-if="hasSeedBrief" type="button" @click="loadSeedBrief">重试读取</button>
      </p>

      <div v-if="seedBriefLoading" class="cf-seed-brief-empty">正在读取主简报...</div>

      <section v-else-if="seedBriefGenerating" class="cf-seed-brief-empty is-working">
        <span class="cf-brief-loader" aria-hidden="true"><span /><span /><span /></span>
        <strong>正在生成主简报</strong>
        <span>生成完成后会保留在当前种子工作区。</span>
      </section>

      <section v-else-if="!hasSeedBrief" class="cf-seed-brief-empty">
        <strong>还没有主简报</strong>
        <span>可以先生成一份创作地图，也可以直接从当前节点发起枝化生长。</span>
      </section>

      <section v-else class="cf-seed-brief-body">
        <div class="cf-seed-brief-actions">
          <span>{{ seedBriefDetail?.contentLocation || seedBriefSummary.contentLocation || '等待内容位置' }}</span>
          <button v-if="!seedBriefEditing" type="button" :disabled="!canEditSeedBrief" @click="startSeedBriefEditing">编辑</button>
        </div>

        <label v-if="seedBriefEditing" class="cf-seed-brief-editor">
          <span>主简报正文</span>
          <textarea v-model="seedBriefDraft" />
        </label>
        <MarkdownViewer v-else :markdown="seedBriefDetail?.markdown || ''" />

        <div v-if="seedBriefEditing" class="cf-seed-brief-editor-actions">
          <button type="button" :disabled="seedBriefSaving" @click="cancelSeedBriefEditing">取消</button>
          <button type="button" :disabled="seedBriefSaving" @click="saveSeedBrief">{{ seedBriefSaving ? '保存中...' : '保存' }}</button>
        </div>
      </section>
    </aside>

    <section
      class="cf-tree-canvas"
      :class="{ 'is-dragging': dragState?.mode === 'canvas' }"
      aria-label="内容树画布"
      @pointerdown="startCanvasDrag"
      @pointermove="handlePointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @wheel="handleWheel"
    >
      <div v-if="workspaceLoading && nodes.length === 0" class="cf-stage-message">内容树正在从种子向外生长...</div>
      <div v-else-if="workspaceError" class="cf-stage-message is-error">
        <strong>{{ workspaceError }}</strong>
        <button type="button" @click="loadWorkspace()">重新加载</button>
      </div>
      <div v-else-if="nodes.length === 0" class="cf-stage-message">这颗种子还没有形成内容树。</div>

      <div v-else class="cf-tree-map" :style="transformedMapStyle">
        <svg class="cf-branch-layer" :viewBox="`0 0 ${treeSize.width} ${treeSize.height}`" aria-hidden="true">
          <path
            v-for="path in branchPaths"
            :key="path.key"
            class="cf-branch"
            :class="path.className"
            :d="path.d"
          />
          <circle
            v-for="path in branchPaths"
            :key="`${path.key}-joint`"
            class="cf-branch-joint"
            :cx="path.joint.x"
            :cy="path.joint.y"
            r="3.5"
          />
        </svg>

        <button
          v-for="node in visibleNodes"
          :key="node.id"
          class="cf-tree-node"
          :class="nodeClasses(node)"
          :style="nodeStyle(node)"
          type="button"
          @click="selectNode(node.id)"
          @pointerdown="startNodeDrag($event, node)"
          @pointermove="handlePointerMove"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <span class="cf-node-head">
            <span class="cf-node-type">{{ node.nodeType === 'seed' ? 'SEED' : 'FRUIT' }}</span>
            <span class="cf-node-mark" aria-hidden="true" />
          </span>
          <span class="cf-node-title">{{ node.title }}</span>
          <span v-if="node.status === 'growing' || node.isPlaceholder" class="cf-growth-vessel" aria-hidden="true">
            <span class="cf-vessel-thread is-a" />
            <span class="cf-vessel-thread is-b" />
            <span class="cf-vessel-core" />
            <span class="cf-vessel-scan" />
          </span>
          <span class="cf-node-foot">
            <span class="cf-node-tags">
              <span class="cf-node-tag"><span class="cf-node-tag-text">{{ nodeStateLabel(node) }}</span></span>
              <span v-if="node.geneTags[0]" class="cf-node-tag"><span class="cf-node-tag-text">{{ node.geneTags[0] }}</span></span>
            </span>
            <span class="cf-node-score">{{ nodeSecondaryLabel(node) }}</span>
          </span>
        </button>
      </div>
    </section>

    <aside v-if="selectedNode" class="cf-node-detail" aria-label="节点详情">
      <header class="cf-node-detail-header">
        <div class="cf-detail-kicker">
          <span>{{ selectedNode.nodeType === 'seed' ? '种子卡片' : '果实卡片' }}</span>
          <span class="cf-workspace-chip">{{ nodeStateLabel(selectedNode) }}</span>
        </div>
        <h1>{{ selectedNode.title }}</h1>
        <p v-if="detailError" class="cf-inline-error">{{ detailError }}</p>

        <div class="cf-natural-selection" aria-label="物竞天择">
          <div v-if="selectedNode.nodeType === 'seed'" class="cf-state-note">
            种子作为内容树根节点展示，可作为枝化生长来源；归档或只读工作区不允许发起新生长。
          </div>
          <div v-else-if="selectedNode.selectionState === 'selected'" class="cf-state-note is-selected">
            已选择果实，可作为下一次枝化生长来源。
          </div>
          <button
            v-else-if="selectedNode.selectionState === 'eliminated'"
            class="cf-state-action is-primary"
            type="button"
            :disabled="isReadOnly || selectionLoading"
            @click="setSelectionState('candidate')"
          >
            恢复
          </button>
          <template v-else>
            <button class="cf-state-action is-primary" type="button" :disabled="isReadOnly || selectionLoading" @click="setSelectionState('selected')">选择</button>
            <button class="cf-state-action" type="button" :disabled="isReadOnly || selectionLoading" @click="setSelectionState('eliminated')">淘汰</button>
          </template>
        </div>

        <div v-if="selectedNode.failedInput.hasFailedInput" class="cf-failed-bar">
          <span>{{ selectedNode.failedInput.failureReason || '最近一次枝化生长失败' }}</span>
          <button type="button" :disabled="growthLoading" @click="restoreFailedInput">恢复输入</button>
          <button type="button" :disabled="growthLoading" @click="retryGrowth">重试</button>
        </div>

        <div v-if="selectedNode.status === 'growing' && selectedGrowthTask" class="cf-pipeline-panel" aria-label="生成路径图">
          <div class="cf-pipeline-head">
            <span>生成路径</span>
            <strong>{{ pathStepStatusLabel(selectedGrowthTask.status === 'running' ? 'running' : selectedGrowthTask.status === 'failed' ? 'failed' : 'completed') }}</strong>
          </div>
          <div v-if="selectedCurrentGrowthPathStep" class="cf-pipeline-current">
            <span>当前正在</span>
            <strong>{{ selectedCurrentGrowthPathStep.label }}</strong>
            <em v-if="selectedCurrentGrowthPathStep.detail">{{ selectedCurrentGrowthPathStep.detail }}</em>
          </div>
          <div class="cf-pipeline-summary">
            <span>{{ selectedGrowthTask.pipelineParams.searchMode }}</span>
            <span>{{ selectedGrowthTask.pipelineParams.mutationIntensity }}</span>
          </div>
          <div v-if="selectedGrowthDirections.length > 0" class="cf-pipeline-directions">
            <span v-for="direction in selectedGrowthDirections" :key="direction">{{ direction }}</span>
          </div>
          <ol v-if="selectedGrowthPathSteps.length > 0" class="cf-pipeline-steps">
            <li
              v-for="step in selectedGrowthPathSteps"
              :key="step.id"
              :class="`is-${step.status}`"
              :style="{ '--step-indent': pathStepIndent(step) }"
            >
              <span class="cf-step-dot" aria-hidden="true" />
              <div>
                <strong>{{ step.label }}</strong>
                <span>{{ pathStepStatusLabel(step.status) }}</span>
                <em v-if="step.detail">{{ step.detail }}</em>
              </div>
            </li>
          </ol>
          <p v-else class="cf-muted">路径图同步中...</p>
        </div>
      </header>

      <div class="cf-node-detail-body">
        <section class="cf-detail-section">
          <h2>正文</h2>
          <p v-if="detailLoading" class="cf-muted">正在读取 Markdown...</p>
          <MarkdownViewer v-else :markdown="selectedNode.markdown" />
        </section>

        <section class="cf-detail-section">
          <h2>基因标签</h2>
          <div class="cf-gene-grid">
            <span v-for="gene in selectedNode.geneTags" :key="gene" class="cf-gene">{{ gene }}</span>
            <span v-if="selectedNode.geneTags.length === 0" class="cf-muted">暂无基因标签</span>
          </div>
        </section>

        <section class="cf-detail-section">
          <h2>记录</h2>
          <div class="cf-record-list">
            <div v-for="record in selectedNode.records" :key="record" class="cf-record">
              <span>{{ record }}</span>
            </div>
          </div>
        </section>

        <section class="cf-detail-section">
          <h2>Meta</h2>
          <div class="cf-info-row">
            <span>内容路径</span>
            <strong>{{ selectedNode.contentLocation || '未提供' }}</strong>
          </div>
          <div class="cf-info-row">
            <span>更新时间</span>
            <strong>{{ formatDateTime(selectedNode.updatedAt) }}</strong>
          </div>
        </section>
      </div>

      <footer v-if="selectedNode.nodeType === 'fruit'" class="cf-node-detail-footer cf-publication-panel">
        <div class="cf-publication-head">
          <div>
            <span>发布验证</span>
            <strong>人工发布记录</strong>
          </div>
          <button
            v-if="canCreatePublicationRecord"
            class="cf-secondary-action"
            type="button"
            :disabled="publicationSaving"
            @click="openPublicationDialog()"
          >
            新增发布
          </button>
          <em v-else>{{ publicationUnavailableReason }}</em>
        </div>

        <div v-if="publicationError" class="cf-inline-error cf-error-action">
          <span>{{ publicationError }}</span>
          <button v-if="selectedNode.fruitId" type="button" @click="loadPublicationRecords(selectedNode.fruitId)">重试</button>
        </div>
        <p v-if="feedbackError" class="cf-inline-error">{{ feedbackError }}</p>
        <div v-if="publicationLoading" class="cf-publication-empty">正在同步发布记录...</div>
        <div v-else-if="publicationRecords.length === 0" class="cf-publication-empty">
          <strong>暂无发布记录</strong>
          <span>{{ canCreatePublicationRecord ? '记录一次人工发布后，才能挂载监控器并回填数据。' : '需要先选择果实并创建发布记录，才可录入数据反馈。' }}</span>
        </div>

        <div v-else class="cf-publication-list">
          <article v-for="record in publicationRecords" :key="record.id" class="cf-publication-card">
            <div class="cf-publication-card-head">
              <div>
                <span>{{ record.publisherType === 'manual' ? '人工发布器' : record.publisherType }}</span>
                <strong>{{ record.publicationTarget }}</strong>
              </div>
              <button class="cf-mini-action" type="button" :disabled="isReadOnly || publicationSaving" @click="openPublicationDialog(record)">编辑</button>
            </div>
            <div class="cf-publication-meta">
              <span>凭证</span>
              <strong>{{ record.publicationEvidence }}</strong>
              <span>备注</span>
              <strong>{{ record.publicationNote || '无' }}</strong>
              <span>发布时间</span>
              <strong>{{ formatDateTime(record.publishedAt) }}</strong>
            </div>

            <div class="cf-feedback-box">
              <div class="cf-feedback-head">
                <div>
                  <span>数据回流</span>
                  <strong>{{ feedbackHistories[record.id]?.monitorAttachment ? '已挂载人为监控器' : '未挂载监控器' }}</strong>
                </div>
                <button
                  v-if="!feedbackHistories[record.id]?.monitorAttachment"
                  class="cf-mini-action"
                  type="button"
                  :disabled="isReadOnly || feedbackSaving === `monitor:${record.id}`"
                  @click="attachManualMonitor(record.id)"
                >
                  挂载
                </button>
                <button
                  v-else
                  class="cf-mini-action"
                  type="button"
                  :disabled="isReadOnly"
                  @click="openFeedbackDialog(record.id)"
                >
                  追加快照
                </button>
              </div>
              <button class="cf-text-action" type="button" :disabled="feedbackLoading === record.id" @click="loadFeedbackHistory(record.id)">
                {{ feedbackLoading === record.id ? '读取中...' : '刷新反馈历史' }}
              </button>
              <div v-if="feedbackHistories[record.id]?.snapshots.length" class="cf-feedback-snapshots">
                <div v-for="feedbackSnapshot in feedbackHistories[record.id]?.snapshots" :key="feedbackSnapshot.id" class="cf-feedback-snapshot">
                  <div>
                    <span>{{ formatDateTime(feedbackSnapshot.capturedAt) }}</span>
                    <strong>{{ feedbackSnapshot.userObservation || '无观察备注' }}</strong>
                    <code>{{ JSON.stringify(feedbackSnapshot.performanceData) }}</code>
                  </div>
                  <button class="cf-mini-action" type="button" :disabled="isReadOnly || feedbackSaving === `snapshot:${feedbackSnapshot.id}`" @click="openFeedbackDialog(record.id, feedbackSnapshot)">编辑</button>
                </div>
              </div>
              <p v-else class="cf-feedback-empty">
                {{ feedbackHistories[record.id]?.monitorAttachment ? '暂无反馈快照' : '挂载人为监控器后可录入反馈快照' }}
              </p>
            </div>
          </article>
        </div>
      </footer>
    </aside>

    <div v-if="publicationDialogOpen" class="cf-modal-backdrop" @click.self="publicationDialogOpen = false">
      <form class="cf-command-modal" @submit.prevent="savePublicationRecord">
        <header>
          <span>发布验证</span>
          <strong>{{ editingPublicationRecord ? '编辑发布记录' : '新增人工发布' }}</strong>
        </header>
        <label>
          <span>发布目标</span>
          <input v-model="publicationDraft.publicationTarget" required placeholder="例如 X 帖子 / 小红书笔记">
        </label>
        <label>
          <span>发布凭证</span>
          <input v-model="publicationDraft.publicationEvidence" required placeholder="URL、截图说明或外部记录">
        </label>
        <label>
          <span>发布备注</span>
          <textarea v-model="publicationDraft.publicationNote" placeholder="可选" />
        </label>
        <footer>
          <button class="cf-secondary-action" type="button" @click="publicationDialogOpen = false">取消</button>
          <button class="cf-state-action is-primary" type="submit" :disabled="publicationSaving">{{ publicationSaving ? '保存中...' : '保存' }}</button>
        </footer>
      </form>
    </div>

    <div v-if="feedbackDialogOpen" class="cf-modal-backdrop" @click.self="feedbackDialogOpen = false">
      <form class="cf-command-modal" @submit.prevent="saveFeedbackSnapshot">
        <header>
          <span>数据反馈</span>
          <strong>{{ editingFeedbackSnapshot ? '编辑反馈快照' : '追加反馈快照' }}</strong>
        </header>
        <section class="cf-metric-builder" aria-label="表现数据集合">
          <div class="cf-metric-builder-head">
            <span>表现数据</span>
            <button class="cf-metric-add" type="button" aria-label="新增表现数据字段" @click="openFeedbackMetricNameInput">+</button>
          </div>
          <div v-if="feedbackMetricNameInputOpen" class="cf-metric-name-row">
            <input
              ref="feedbackMetricNameInputRef"
              v-model="feedbackMetricNameDraft"
              autofocus
              placeholder="输入字段名称，例如 点赞数"
              @keydown.enter.prevent="addFeedbackMetric"
              @keydown.esc.prevent="closeFeedbackMetricNameInput"
            >
            <button type="button" @click="addFeedbackMetric">添加</button>
          </div>
          <div v-if="feedbackDraft.performanceData.length" class="cf-metric-list">
            <label v-for="(metric, index) in feedbackDraft.performanceData" :key="metric.key" class="cf-metric-row">
              <span>{{ metric.key }}</span>
              <div>
                <input v-model="metric.value" :placeholder="`输入${metric.key}`">
                <button type="button" :aria-label="`删除${metric.key}`" @click="removeFeedbackMetric(index)">×</button>
              </div>
            </label>
          </div>
          <p v-else class="cf-metric-empty">点击右上角 + 添加表现数据字段</p>
        </section>
        <label>
          <span>用户观察</span>
          <textarea v-model="feedbackDraft.userObservation" placeholder="这次发布有哪些表现、异常或启发" />
        </label>
        <label>
          <span>采集时间</span>
          <input v-model="feedbackDraft.capturedAt" placeholder="留空则由系统使用当前时间">
        </label>
        <footer>
          <button class="cf-secondary-action" type="button" @click="feedbackDialogOpen = false">取消</button>
          <button class="cf-state-action is-primary" type="submit" :disabled="Boolean(feedbackSaving)">{{ feedbackSaving ? '保存中...' : '保存' }}</button>
        </footer>
      </form>
    </div>

    <section v-if="visibleComposer && selectedNode" class="cf-growth-composer" aria-label="枝化生长输入框">
      <div v-if="resourcePopoverOpen" class="cf-resource-popover" aria-label="@资源提示">
        <div v-if="filteredResourceGroups.length > 0" class="cf-resource-groups">
          <section
            v-for="group in filteredResourceGroups"
            :key="group.kind"
            class="cf-resource-group"
            :class="`is-${group.kind}`"
          >
            <header class="cf-resource-group-head">
              <span>{{ group.title }}</span>
              <em>{{ group.subtitle }}</em>
            </header>
            <button
              v-for="resource in group.resources"
              :key="`${resource.kind}-${resource.id}`"
              class="cf-resource-row"
              type="button"
              @click="addResource(resource)"
            >
              <span class="cf-resource-icon">{{ resource.kind === 'gene' ? '因' : resource.kind === 'nutrient_card' ? '候' : '养' }}</span>
              <span class="cf-resource-row-main">
                <strong>{{ resource.label }}</strong>
                <span class="cf-resource-meta">{{ resource.scope }}</span>
              </span>
              <kbd>@</kbd>
            </button>
          </section>
        </div>
        <p v-else class="cf-muted">暂无匹配资源</p>
      </div>

      <div class="cf-growth-top">
        <div class="cf-growth-pill is-source">
          <span>生长源</span>
          <strong>{{ selectedNode.summary }}</strong>
        </div>
        <div class="cf-growth-menu-wrap">
          <button class="cf-growth-pill cf-growth-picker" type="button" :aria-expanded="generatorMenuOpen" @click="toggleGeneratorMenu">
          <span>生成器</span>
          <strong>{{ generatorName }}</strong>
          <span class="cf-picker-caret">⌄</span>
          </button>
          <div v-if="generatorMenuOpen" class="cf-pill-menu">
            <button
              v-for="generator in snapshot?.resources.generators || []"
              :key="generator.id"
              class="cf-pill-menu-item"
              :class="{ 'is-active': generator.id === selectedGeneratorId }"
              type="button"
              @click="selectGenerator(generator.id)"
            >
              <span>
                <strong>{{ generator.name }}</strong>
                <em>{{ generator.description }}</em>
              </span>
              <span class="cf-menu-check">{{ generator.id === selectedGeneratorId ? '*' : '' }}</span>
            </button>
            <span v-if="!snapshot?.resources.generators.length" class="cf-pill-menu-empty">暂无生成器</span>
          </div>
        </div>
        <div class="cf-growth-menu-wrap">
          <button class="cf-growth-pill cf-growth-picker" type="button" :aria-expanded="fruitCountMenuOpen" @click="toggleFruitCountMenu">
          <span>果实</span>
          <strong>{{ fruitCount }}</strong>
          <span class="cf-picker-caret">⌄</span>
          </button>
          <div v-if="fruitCountMenuOpen" class="cf-pill-menu is-compact">
            <button
              v-for="count in fruitCountOptions"
              :key="count"
              class="cf-pill-menu-item"
              :class="{ 'is-active': count === fruitCount }"
              type="button"
              @click="selectFruitCount(count)"
            >
              <span>{{ count }}</span>
              <span class="cf-menu-check">{{ count === fruitCount ? '*' : '' }}</span>
            </button>
          </div>
        </div>
        <div class="cf-growth-menu-wrap">
          <button class="cf-growth-pill cf-growth-picker" type="button" :aria-expanded="mutationIntensityMenuOpen" @click="toggleMutationIntensityMenu">
            <span>突变</span>
            <strong>{{ selectedMutationIntensityOption.label }}</strong>
            <span class="cf-picker-caret">⌄</span>
          </button>
          <div v-if="mutationIntensityMenuOpen" class="cf-pill-menu is-compact">
            <button
              v-for="option in mutationIntensityOptions"
              :key="option.value"
              class="cf-pill-menu-item"
              :class="{ 'is-active': option.value === selectedMutationIntensity }"
              type="button"
              @click="selectMutationIntensity(option.value)"
            >
              <span>
                <strong>{{ option.label }}</strong>
                <em>{{ option.hint }}</em>
              </span>
              <span class="cf-menu-check">{{ option.value === selectedMutationIntensity ? '*' : '' }}</span>
            </button>
          </div>
        </div>
        <div class="cf-growth-menu-wrap">
          <button class="cf-growth-pill cf-growth-picker" type="button" :aria-expanded="searchModeMenuOpen" @click="toggleSearchModeMenu">
            <span>搜索</span>
            <strong>{{ selectedSearchModeOption.label }}</strong>
            <span class="cf-picker-caret">⌄</span>
          </button>
          <div v-if="searchModeMenuOpen" class="cf-pill-menu">
            <button
              v-for="option in searchModeOptions"
              :key="option.value"
              class="cf-pill-menu-item"
              :class="{ 'is-active': option.value === selectedSearchMode }"
              type="button"
              @click="selectSearchMode(option.value)"
            >
              <span>
                <strong>{{ option.label }}</strong>
                <em>{{ option.hint }}</em>
              </span>
              <span class="cf-menu-check">{{ option.value === selectedSearchMode ? '*' : '' }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="cf-growth-input">
        <span v-if="referencedResources.length > 0" class="cf-inline-refs">
          <span
            v-for="resource in referencedResources"
            :key="`inline-${resource.kind}-${resource.id}`"
            class="cf-mention"
            :class="`is-${resource.kind}`"
          >
            <span>{{ resource.label }}</span>
            <button
              class="cf-mention-remove"
              type="button"
              :aria-label="`移除引用 ${resource.label}`"
              @click.stop="removeResource(resource)"
            >
              x
            </button>
          </span>
        </span>
        <textarea
          ref="growthInputEl"
          v-model="growthIntent"
          aria-label="枝化生长意图"
          placeholder="输入本次枝化生长的想法，或使用 @ 引用营养库和基因库..."
          @click="updateResourcePopover"
          @keyup="updateResourcePopover"
          @input="updateResourcePopover"
        />
      </div>

      <p v-if="growthError" class="cf-inline-error">{{ growthError }}</p>

      <div class="cf-growth-footer">
        <div class="cf-growth-tools">
          <button class="cf-round-tool" type="button" @click="openResourceMention">+</button>
        </div>
        <div class="cf-growth-actions">
          <button class="cf-secondary-action" type="button" @click="growthDetailOpen = !growthDetailOpen">枝化详情</button>
          <button class="cf-send-button" type="button" :disabled="growthLoading || !selectedGeneratorId" aria-label="发起枝化生长" @click="startGrowth">↑</button>
        </div>
      </div>

      <div v-if="growthDetailOpen" class="cf-growth-detail-panel" aria-label="枝化生长详情">
        <div class="cf-growth-detail-head">
          <strong>枝化生长详情</strong>
          <span>接口参数</span>
        </div>
        <div class="cf-growth-detail-row"><span>生成器</span><strong>{{ generatorName }}</strong></div>
        <div class="cf-growth-detail-row"><span>果实数量</span><strong>{{ fruitCount }}</strong></div>
        <div class="cf-growth-detail-row"><span>搜索模式</span><strong>{{ selectedSearchModeOption.label }} · {{ selectedSearchModeOption.hint }}</strong></div>
        <div class="cf-growth-option-grid" aria-label="搜索模式">
          <button
            v-for="option in searchModeOptions"
            :key="option.value"
            class="cf-growth-option"
            :class="{ 'is-active': option.value === selectedSearchMode }"
            type="button"
            @click="selectSearchMode(option.value)"
          >
            <strong>{{ option.label }}</strong>
            <span>{{ option.hint }}</span>
          </button>
        </div>
        <div class="cf-growth-detail-row"><span>突变强度</span><strong>{{ selectedMutationIntensityOption.label }} · {{ selectedMutationIntensityOption.hint }}</strong></div>
        <div class="cf-growth-option-grid is-compact" aria-label="突变强度">
          <button
            v-for="option in mutationIntensityOptions"
            :key="option.value"
            class="cf-growth-option"
            :class="{ 'is-active': option.value === selectedMutationIntensity }"
            type="button"
            @click="selectMutationIntensity(option.value)"
          >
            <strong>{{ option.label }}</strong>
            <span>{{ option.hint }}</span>
          </button>
        </div>
        <div class="cf-growth-detail-row"><span>引用资源</span><strong>{{ referencedResources.length }}</strong></div>
        <div class="cf-growth-detail-refs">
          <span
            v-for="resource in growthDetailResources"
            :key="`${resource.kind}-${resource.id}`"
            class="cf-ref-chip"
            :class="`is-${resource.kind}`"
          >
            <span>{{ resource.kindLabel }} · {{ resource.label }}</span>
            <button
              class="cf-mention-remove"
              type="button"
              :aria-label="`移除引用 ${resource.label}`"
              @click.stop="removeResource(resource)"
            >
              x
            </button>
          </span>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.cf-workspace-page {
  --cf-bg: #080a0d;
  --cf-panel: rgba(14, 17, 20, .92);
  --cf-panel-strong: rgba(26, 30, 33, .96);
  --cf-border: rgba(255, 255, 255, .13);
  --cf-border-soft: rgba(255, 255, 255, .08);
  --cf-text: #edf4f1;
  --cf-muted: #8f9b9a;
  --cf-growth: #5ed7c5;
  --cf-select: #9de49b;
  --cf-warn: #f0c36b;
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, #0a0d10, #06080a);
  color: var(--cf-text);
}

button,
a {
  border: 0;
  text-decoration: none;
  font: inherit;
}

button:disabled {
  opacity: .48;
  cursor: not-allowed;
}

.cf-workspace-topbar {
  position: absolute;
  z-index: 20;
  top: 14px;
  left: 16px;
  right: 424px;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  overflow: hidden;
  padding: 8px 10px 8px 18px;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 12px;
  background:
    linear-gradient(135deg, rgba(94, 215, 197, .11), transparent 32%),
    linear-gradient(180deg, rgba(21, 25, 27, .84), rgba(9, 12, 14, .72));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .08),
    0 18px 70px rgba(0, 0, 0, .32);
  backdrop-filter: blur(26px) saturate(1.18);
}

.cf-workspace-topbar::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, .08), transparent),
    radial-gradient(circle at 16% 0%, rgba(94, 215, 197, .22), transparent 34%);
  opacity: .74;
}

.cf-workspace-crumb {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.cf-workspace-nav-zone {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.cf-workspace-crumb strong {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  overflow: hidden;
  max-width: 520px;
  color: #f4fbf8;
  font-size: 16px;
  letter-spacing: 0;
  line-height: 1.1;
  text-overflow: ellipsis;
  text-shadow: 0 0 24px rgba(94, 215, 197, .18);
  white-space: nowrap;
}

.cf-workspace-crumb strong::before {
  content: "";
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--cf-growth);
  box-shadow: 0 0 0 5px rgba(94, 215, 197, .09), 0 0 22px rgba(94, 215, 197, .56);
}

.cf-workspace-crumb span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-workspace-crumb span,
.cf-muted {
  color: var(--cf-muted);
  font-size: 12px;
}

.cf-workspace-actions,
.cf-growth-top,
.cf-growth-footer,
.cf-growth-tools,
.cf-growth-actions,
.cf-growth-refs {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cf-workspace-actions {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  gap: 8px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 12px;
  background: rgba(255, 255, 255, .035);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .06);
}

.cf-header-tree-status {
  position: relative;
  z-index: 1;
  flex: 0 1 260px;
  min-width: 180px;
  max-width: 300px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 8px;
  background: rgba(255, 255, 255, .035);
}

.cf-header-tree-status strong {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #dce7e4;
  font-size: 12px;
}

.cf-header-tree-status .cf-growth-meter {
  margin-top: 8px;
}

.cf-header-tree-status:not(.is-growing) .cf-growth-meter span {
  width: 100%;
  background: linear-gradient(90deg, rgba(94, 215, 197, .52), rgba(157, 228, 155, .38));
}

.cf-header-tree-status.is-growing .cf-growth-meter span {
  animation: cf-header-growth 1.35s ease-in-out infinite;
}

.cf-workspace-chip,
.cf-workspace-tool,
.cf-secondary-action,
.cf-state-action {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border: 1px solid var(--cf-border);
  border-radius: 7px;
  background: rgba(255, 255, 255, .045);
  color: var(--cf-muted);
  font-size: 12px;
}

.cf-workspace-tool,
.cf-secondary-action,
.cf-state-action {
  cursor: pointer;
}

.cf-topbar-icon-action {
  position: relative;
  overflow: hidden;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .075), rgba(255, 255, 255, .035)),
    rgba(10, 13, 15, .7);
  color: #cbd7d5;
  font-size: 12px;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08);
  transition:
    transform .22s ease,
    border-color .22s ease,
    background .22s ease,
    box-shadow .22s ease,
    color .22s ease;
}

.cf-topbar-icon-action svg {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  color: currentColor;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
  transition: transform .22s ease;
}

.cf-topbar-icon-action span {
  position: relative;
  z-index: 1;
  font-weight: 760;
  line-height: 1;
  white-space: nowrap;
}

.cf-topbar-icon-action.is-home {
  flex: 0 0 auto;
  min-width: 42px;
  padding: 0 13px 0 11px;
  border-color: rgba(94, 215, 197, .18);
  background:
    linear-gradient(180deg, rgba(94, 215, 197, .12), rgba(255, 255, 255, .035)),
    rgba(10, 13, 15, .66);
  color: #cffff7;
  text-decoration: none;
}

.cf-topbar-icon-action::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 0%, rgba(94, 215, 197, .2) 42%, transparent 72%);
  opacity: 0;
  transform: translateX(-80%);
  transition: opacity .22s ease, transform .42s ease;
}

.cf-topbar-icon-action:hover {
  border-color: rgba(94, 215, 197, .38);
  background:
    linear-gradient(180deg, rgba(94, 215, 197, .14), rgba(255, 255, 255, .045)),
    rgba(12, 16, 17, .82);
  color: #f5fffb;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .14),
    0 10px 34px rgba(94, 215, 197, .13);
  transform: translateY(-2px);
}

.cf-topbar-icon-action:hover svg {
  transform: translateY(-1px) scale(1.06);
}

.cf-topbar-icon-action:hover::before {
  opacity: 1;
  transform: translateX(90%);
}

.cf-topbar-icon-action:focus-visible {
  border-color: rgba(122, 167, 255, .52);
  outline: 2px solid rgba(122, 167, 255, .32);
  outline-offset: 2px;
}

.cf-topbar-icon-action:active {
  transform: translateY(0) scale(.98);
}

.cf-topbar-icon-action[aria-pressed="true"] {
  border-color: rgba(231, 189, 104, .3);
  background:
    linear-gradient(180deg, rgba(231, 189, 104, .13), rgba(255, 255, 255, .04)),
    rgba(10, 13, 15, .74);
  color: #ffe3ac;
}

.cf-tree-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: grab;
  background:
    radial-gradient(circle at 1px 1px, rgba(255, 255, 255, .075) 1px, transparent 0) 0 0 / 28px 28px,
    linear-gradient(180deg, rgba(255, 255, 255, .025), transparent 34%),
    var(--cf-bg);
}

.cf-tree-canvas.is-dragging {
  cursor: grabbing;
}

.cf-stage-message {
  position: absolute;
  top: 45%;
  left: 50%;
  z-index: 8;
  display: grid;
  gap: 12px;
  justify-items: center;
  padding: 18px;
  border: 1px solid var(--cf-border);
  border-radius: 8px;
  background: var(--cf-panel);
  color: var(--cf-muted);
  transform: translate(-50%, -50%);
}

.cf-stage-message button {
  min-height: 30px;
  padding: 0 12px;
  border-radius: 7px;
  background: var(--cf-growth);
  color: #06110d;
  cursor: pointer;
}

.cf-stage-message.is-error {
  color: #ffd7c9;
}

.cf-growth-meter {
  height: 3px;
  margin-top: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, .08);
}

.cf-growth-meter span {
  display: block;
  width: 62%;
  height: 100%;
  background: linear-gradient(90deg, var(--cf-growth), var(--cf-select));
}

.cf-tree-map {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: center;
}

.cf-branch-layer {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.cf-branch {
  fill: none;
  stroke: rgba(94, 215, 197, .42);
  stroke-width: 2;
  stroke-linecap: round;
}

.cf-branch.is-secondary {
  stroke: rgba(157, 228, 155, .36);
}

.cf-branch.is-weak {
  stroke: rgba(240, 195, 107, .28);
}

.cf-branch.is-growth-stream {
  stroke: rgba(240, 195, 107, .72);
  stroke-width: 2.4;
  stroke-dasharray: 10 12;
  filter: drop-shadow(0 0 7px rgba(240, 195, 107, .34));
  animation: cf-branch-flow 1.05s linear infinite;
}

.cf-branch-joint {
  fill: #0b1011;
  stroke: rgba(255, 255, 255, .32);
}

/* Compact command-workspace nodes. */
.cf-tree-node {
  --node-accent: #e7bd68;
  --node-rgb: 231, 189, 104;
  --node-ink: #f4f7f8;
  --node-muted: rgba(238, 243, 245, .54);
  position: absolute;
  z-index: 5;
  width: 232px;
  height: 168px;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: 25px minmax(0, 1fr) 15px 24px;
  gap: 8px;
  padding: 13px 14px 12px;
  overflow: hidden;
  color: var(--node-ink);
  text-align: left;
  appearance: none;
  cursor: grab;
  border: 1px solid rgba(var(--node-rgb), .22);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .07), rgba(255, 255, 255, .018)),
    linear-gradient(135deg, rgba(var(--node-rgb), .08), rgba(20, 24, 31, .96) 34%),
    rgba(17, 20, 26, .96);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .09),
    0 18px 44px rgba(0, 0, 0, .34);
  backdrop-filter: none;
  transform: none;
  transform-origin: center;
  isolation: isolate;
  transition:
    transform .18s ease,
    border-color .18s ease,
    background .18s ease,
    box-shadow .18s ease,
    opacity .18s ease,
    filter .18s ease;
}

.cf-tree-node > * {
  min-width: 0;
  position: relative;
  z-index: 2;
}

.cf-tree-node::before,
.cf-tree-node::after {
  content: "";
  position: absolute;
  pointer-events: none;
}

.cf-tree-node:hover {
  border-color: rgba(var(--node-rgb), .45);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .11),
    0 22px 58px rgba(0, 0, 0, .42),
    0 0 0 1px rgba(var(--node-rgb), .08);
  outline: 0;
  transform: translateY(-3px);
}

.cf-tree-node::before {
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background:
    linear-gradient(90deg, rgba(var(--node-rgb), .28), transparent 46%),
    linear-gradient(180deg, rgba(255, 255, 255, .045), transparent 52%);
  opacity: .42;
  mask: linear-gradient(#000, transparent 62%);
}

.cf-tree-node::after {
  display: none;
}

.cf-tree-node.is-seed {
  --node-accent: #60d5c8;
  --node-rgb: 96, 213, 200;
  width: 252px;
  height: 184px;
}

.cf-tree-node.is-fruit {
  width: 232px;
  height: 168px;
}

.cf-tree-node.is-candidate {
  --node-accent: #e7bd68;
  --node-rgb: 231, 189, 104;
}

.cf-tree-node.is-selected {
  --node-accent: #9cdd8f;
  --node-rgb: 156, 221, 143;
}

.cf-tree-node.is-eliminated {
  --node-accent: #8f989d;
  --node-rgb: 143, 152, 157;
  filter: saturate(.45);
  opacity: .58;
}

.cf-tree-node.is-eliminated::after {
  top: 50%;
  bottom: auto;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(226, 232, 229, .34), transparent);
  transform: rotate(-6deg);
}

.cf-tree-node.is-growing,
.cf-tree-node.is-growth-placeholder {
  --node-accent: #7aa7ff;
  --node-rgb: 122, 167, 255;
  animation: cf-node-soft-pulse 1.65s ease-in-out infinite;
}

.cf-tree-node.is-active {
  border-color: rgba(var(--node-rgb), .72);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .12),
    0 0 0 2px rgba(var(--node-rgb), .16),
    0 24px 62px rgba(0, 0, 0, .45);
}

.cf-node-head {
  grid-row: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cf-node-type {
  min-width: 0;
  overflow: hidden;
  color: var(--node-muted);
  font-size: 10px;
  font-weight: 760;
  letter-spacing: .08em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-node-mark {
  position: relative;
  width: 25px;
  height: 25px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(var(--node-rgb), .24);
  border-radius: 7px;
  background: rgba(var(--node-rgb), .09);
  color: var(--node-accent);
}

.cf-node-mark::before,
.cf-node-mark::after {
  content: "";
  position: absolute;
  width: 11px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.cf-node-mark::after {
  transform: rotate(90deg);
}

.cf-tree-node.is-selected .cf-node-mark::before {
  width: 7px;
  transform: translate(-3px, 2px) rotate(45deg);
}

.cf-tree-node.is-selected .cf-node-mark::after {
  width: 13px;
  transform: translate(2px, 0) rotate(-45deg);
}

.cf-tree-node.is-eliminated .cf-node-mark::before {
  transform: rotate(45deg);
}

.cf-tree-node.is-eliminated .cf-node-mark::after {
  transform: rotate(-45deg);
}

.cf-tree-node.is-growing .cf-node-mark::before,
.cf-tree-node.is-growth-placeholder .cf-node-mark::before {
  width: 13px;
  height: 1px;
  background: transparent;
  border-top: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
}

.cf-tree-node.is-growing .cf-node-mark::after,
.cf-tree-node.is-growth-placeholder .cf-node-mark::after {
  width: 5px;
  height: 5px;
  border: 1px solid currentColor;
  border-radius: 50%;
  background: rgba(var(--node-rgb), .12);
  transform: none;
}

.cf-node-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--node-accent);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, .55),
    0 0 14px rgba(var(--node-rgb), .42);
}

.cf-node-title {
  grid-row: 2;
  min-width: 0;
  min-height: 0;
  max-height: 60px;
  overflow: hidden;
  display: -webkit-box;
  align-self: center;
  color: #f4f7f8;
  font-size: 14px;
  font-weight: 760;
  line-height: 1.42;
  overflow-wrap: anywhere;
  text-shadow: none;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.cf-node-foot {
  grid-row: 4;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.cf-node-tags,
.cf-tree-node.is-growth-placeholder .cf-node-tags {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
}

.cf-node-tag,
.cf-tree-node.is-growth-placeholder .cf-node-tag {
  overflow: hidden;
  min-width: 0;
  max-width: 100%;
  min-height: 22px;
  display: inline-flex;
  flex: 0 1 auto;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border: 1px solid rgba(var(--node-rgb), .2);
  border-radius: 999px;
  background: rgba(var(--node-rgb), .08);
  color: rgba(238, 243, 245, .78);
  font-size: 11px;
  text-shadow: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-node-tag:first-child {
  flex: 0 0 auto;
  max-width: 72px;
}

.cf-node-tag:not(:first-child) {
  flex: 1 1 auto;
}

.cf-node-tag-text {
  min-width: 0;
  overflow: hidden;
  display: block;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-node-score {
  overflow: hidden;
  flex: 0 0 auto;
  min-width: 0;
  max-width: 62px;
  color: rgba(151, 166, 174, .86);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-tree-node.is-eliminated .cf-node-title,
.cf-tree-node.is-eliminated .cf-node-tag,
.cf-tree-node.is-eliminated .cf-node-type,
.cf-tree-node.is-eliminated .cf-node-score {
  color: rgba(214, 220, 218, .5);
}

.cf-growth-vessel {
  position: relative;
  grid-row: 3;
  height: 15px;
  overflow: hidden;
  border: 1px solid rgba(131, 217, 255, .16);
  border-radius: 999px;
  background: rgba(131, 217, 255, .055);
}

.cf-vessel-thread {
  position: absolute;
  left: 10px;
  right: 10px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(131, 217, 255, .54), transparent);
  transform-origin: left center;
}

.cf-vessel-thread.is-a {
  top: 5px;
  animation: cf-thread-grow 1.2s ease-in-out infinite;
}

.cf-vessel-thread.is-b {
  top: 10px;
  animation: cf-thread-grow 1.2s .18s ease-in-out infinite reverse;
}

.cf-vessel-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 5px;
  height: 5px;
  border: 1px solid rgba(131, 217, 255, .4);
  border-radius: 50%;
  border-color: rgba(131, 217, 255, .4);
  background: rgba(131, 217, 255, .36);
  box-shadow: 0 0 10px rgba(131, 217, 255, .28);
  transform: translate(-50%, -50%);
  animation: cf-core-seed 1s ease-in-out infinite;
}

.cf-vessel-scan {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .1), transparent);
  transform: translateX(-120%);
  animation: cf-vessel-scan 1.5s ease-in-out infinite;
}

.cf-gene-bubble {
  position: absolute;
  z-index: 34;
  right: 430px;
  bottom: 22px;
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(106, 236, 215, .34);
  border-radius: 999px;
  background:
    radial-gradient(circle at 36% 24%, rgba(255, 255, 255, .22), transparent 24%),
    radial-gradient(circle at 64% 70%, rgba(139, 156, 255, .2), transparent 34%),
    linear-gradient(145deg, rgba(94, 215, 197, .2), rgba(139, 156, 255, .14)),
    rgba(12, 15, 20, .96);
  color: #dffff9;
  box-shadow:
    0 20px 68px rgba(0, 0, 0, .48),
    0 0 0 1px rgba(94, 215, 197, .08),
    0 0 26px rgba(94, 215, 197, .16);
  cursor: pointer;
  backdrop-filter: blur(20px);
  transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
}

.cf-gene-bubble::before,
.cf-gene-bubble::after {
  content: "";
  position: absolute;
  border-radius: inherit;
  pointer-events: none;
}

.cf-gene-bubble::before {
  inset: -4px;
  border: 1px solid rgba(240, 195, 107, .28);
  border-top-color: rgba(94, 215, 197, .58);
  border-right-color: rgba(139, 156, 255, .38);
  opacity: .85;
  animation: cf-gene-orbit 4.8s linear infinite;
}

.cf-gene-bubble::after {
  inset: 7px;
  background:
    radial-gradient(circle at 50% 0%, rgba(94, 215, 197, .2), transparent 34%),
    radial-gradient(circle at 50% 100%, rgba(139, 156, 255, .18), transparent 34%);
  filter: blur(1px);
  opacity: .72;
}

.cf-gene-bubble:hover,
.cf-gene-bubble[aria-expanded="true"] {
  transform: translateY(-2px) scale(1.04);
  border-color: rgba(94, 215, 197, .6);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, .54),
    0 0 0 1px rgba(94, 215, 197, .16),
    0 0 34px rgba(94, 215, 197, .24);
}

.cf-gene-bubble.has-work {
  border-color: rgba(240, 195, 107, .34);
}

.cf-gene-bubble-core {
  position: relative;
  z-index: 1;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 50%, rgba(94, 215, 197, .12), transparent 58%),
    rgba(255, 255, 255, .055);
  color: #cffff8;
  perspective: 110px;
  box-shadow: inset 0 0 18px rgba(94, 215, 197, .14);
}

.cf-dna-helix {
  position: relative;
  width: 22px;
  height: 31px;
  display: block;
  transform-style: preserve-3d;
  animation: cf-dna-spin 2.4s linear infinite;
}

.cf-dna-helix::before,
.cf-dna-helix::after {
  content: "";
  position: absolute;
  top: 1px;
  bottom: 1px;
  width: 2px;
  border-radius: 999px;
  opacity: .92;
  filter: drop-shadow(0 0 5px rgba(94, 215, 197, .55));
}

.cf-dna-helix::before {
  left: 5px;
  background: linear-gradient(180deg, transparent, #6aecd7 16%, #8b9cff 50%, #6aecd7 84%, transparent);
  transform: rotate(13deg);
}

.cf-dna-helix::after {
  right: 5px;
  background: linear-gradient(180deg, transparent, #8b9cff 16%, #6aecd7 50%, #8b9cff 84%, transparent);
  transform: rotate(-13deg);
}

.cf-dna-pair {
  position: absolute;
  left: 3px;
  right: 3px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(106, 236, 215, .95), rgba(255, 255, 255, .75), rgba(139, 156, 255, .95));
  box-shadow: 0 0 7px rgba(139, 156, 255, .38);
  transform-origin: center;
}

.cf-dna-pair::before,
.cf-dna-pair::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: #d9fff8;
  transform: translateY(-50%);
  box-shadow: 0 0 8px rgba(94, 215, 197, .58);
}

.cf-dna-pair::before {
  left: -2px;
}

.cf-dna-pair::after {
  right: -2px;
  background: #dce2ff;
  box-shadow: 0 0 8px rgba(139, 156, 255, .58);
}

.cf-dna-pair:nth-child(1) {
  top: 3px;
  transform: rotate(-18deg) scaleX(.68);
}

.cf-dna-pair:nth-child(2) {
  top: 8px;
  transform: rotate(14deg) scaleX(.92);
}

.cf-dna-pair:nth-child(3) {
  top: 13px;
  transform: rotate(24deg) scaleX(.7);
}

.cf-dna-pair:nth-child(4) {
  top: 18px;
  transform: rotate(-24deg) scaleX(.7);
}

.cf-dna-pair:nth-child(5) {
  top: 23px;
  transform: rotate(-14deg) scaleX(.92);
}

.cf-dna-pair:nth-child(6) {
  top: 28px;
  transform: rotate(18deg) scaleX(.68);
}

.cf-gene-bubble-badge {
  position: absolute;
  z-index: 2;
  top: -5px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border: 2px solid #11151c;
  border-radius: 999px;
  background: linear-gradient(180deg, #ff5f70, #f82d48);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 6px 16px rgba(248, 45, 72, .34);
}

.cf-gene-dialog-backdrop {
  position: absolute;
  z-index: 70;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(2, 4, 8, .56);
  backdrop-filter: blur(12px);
}

.cf-gene-dialog {
  width: min(760px, calc(100vw - 48px));
  max-height: min(820px, calc(100vh - 48px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(94, 215, 197, .2);
  border-radius: 12px;
  background:
    linear-gradient(145deg, rgba(94, 215, 197, .08), transparent 34%),
    linear-gradient(180deg, rgba(18, 23, 31, .98), rgba(8, 10, 14, .98));
  box-shadow: 0 34px 120px rgba(0, 0, 0, .58);
}

.cf-gene-dialog-head,
.cf-gene-dialog-actions,
.cf-gene-section-head,
.cf-gene-task-actions,
.cf-gene-editor-actions,
.cf-gene-editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cf-gene-dialog-head {
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, .08);
  background:
    linear-gradient(135deg, rgba(94, 215, 197, .08), transparent 42%),
    rgba(255, 255, 255, .02);
}

.cf-gene-dialog-title {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.cf-gene-dialog-title span {
  color: var(--cf-growth);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cf-gene-dialog-title h2 {
  margin: 0;
  font-size: 17px;
  line-height: 23px;
}

.cf-gene-dialog-title p {
  margin: 0;
  color: var(--cf-muted);
  font-size: 12px;
  line-height: 18px;
}

.cf-gene-dialog-btn,
.cf-gene-dialog-close,
.cf-gene-task-actions button,
.cf-gene-editor-actions button {
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 8px;
  background: rgba(255, 255, 255, .045);
  color: var(--cf-text);
  cursor: pointer;
}

.cf-gene-dialog-btn {
  min-height: 34px;
  padding: 0 11px;
  color: #bffff3;
  font-size: 12px;
  font-weight: 700;
}

.cf-gene-dialog-close {
  width: 34px;
  height: 34px;
  color: var(--cf-muted);
  font-size: 20px;
  line-height: 1;
}

.cf-gene-dialog-body {
  min-height: 0;
  overflow: auto;
  display: grid;
  gap: 12px;
  padding: 14px;
  scrollbar-color: rgba(94, 215, 197, .36) rgba(255, 255, 255, .04);
}

.cf-gene-dialog-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.cf-gene-dialog-metrics article {
  min-height: 72px;
  display: grid;
  gap: 5px;
  align-content: center;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 10px;
  background: rgba(255, 255, 255, .035);
}

.cf-gene-dialog-metrics strong {
  font-size: 22px;
  line-height: 1;
}

.cf-gene-dialog-metrics span,
.cf-gene-section-head span,
.cf-gene-task-main p,
.cf-gene-reason-field span,
.cf-gene-editor label span {
  color: var(--cf-muted);
  font-size: 11px;
  line-height: 17px;
}

.cf-gene-dialog-section,
.cf-gene-dialog-basis,
.cf-gene-dialog-empty,
.cf-gene-editor {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 10px;
  background: rgba(255, 255, 255, .035);
}

.cf-gene-section-head strong,
.cf-gene-dialog-basis strong,
.cf-gene-dialog-empty strong {
  color: var(--cf-text);
  font-size: 13px;
}

.cf-gene-task-list {
  display: grid;
  gap: 9px;
}

.cf-seed-brief-panel {
  position: absolute;
  z-index: 32;
  top: 86px;
  left: 18px;
  width: min(620px, calc(100vw - 468px));
  max-height: calc(100vh - 230px);
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(122, 167, 255, .18);
  border-radius: 10px;
  background:
    linear-gradient(145deg, rgba(122, 167, 255, .08), transparent 38%),
    rgba(15, 18, 24, .97);
  box-shadow: 0 26px 88px rgba(0, 0, 0, .48);
  backdrop-filter: blur(24px);
}

.cf-seed-brief-head,
.cf-seed-brief-status,
.cf-seed-brief-actions,
.cf-seed-brief-editor-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cf-seed-brief-head {
  padding: 13px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, .08);
}

.cf-seed-brief-head div,
.cf-seed-brief-status div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.cf-seed-brief-head span,
.cf-seed-brief-status span,
.cf-seed-brief-actions span,
.cf-seed-brief-editor span {
  overflow: hidden;
  color: var(--cf-muted);
  font-size: 11px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-seed-brief-head strong,
.cf-seed-brief-status strong,
.cf-seed-brief-empty strong {
  color: var(--cf-text);
  font-size: 13px;
}

.cf-seed-brief-head button,
.cf-seed-brief-status button,
.cf-seed-brief-actions button,
.cf-seed-brief-editor-actions button {
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 7px;
  background: rgba(255, 255, 255, .045);
  color: var(--cf-text);
  cursor: pointer;
}

.cf-seed-brief-head button {
  width: 30px;
  height: 30px;
  color: var(--cf-muted);
  font-size: 18px;
}

.cf-seed-brief-status {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, .07);
  background: rgba(255, 255, 255, .025);
}

.cf-seed-brief-status.is-busy {
  background:
    linear-gradient(90deg, rgba(122, 167, 255, .1), rgba(94, 215, 197, .075), rgba(122, 167, 255, .1)),
    rgba(255, 255, 255, .025);
  background-size: 220% 100%;
  animation: cf-brief-flow 1.5s ease-in-out infinite;
}

.cf-seed-brief-status button,
.cf-seed-brief-actions button,
.cf-seed-brief-editor-actions button {
  min-height: 30px;
  padding: 0 10px;
  color: #dce8ff;
  font-size: 12px;
  font-weight: 700;
}

.cf-seed-brief-empty {
  display: grid;
  gap: 6px;
  padding: 14px;
  color: var(--cf-muted);
  font-size: 12px;
  line-height: 18px;
}

.cf-seed-brief-empty.is-working {
  place-items: start;
}

.cf-brief-loader {
  width: 42px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.cf-brief-loader span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #a9c2ff;
  animation: cf-brief-dot .9s ease-in-out infinite;
}

.cf-brief-loader span:nth-child(2) {
  animation-delay: .12s;
}

.cf-brief-loader span:nth-child(3) {
  animation-delay: .24s;
}

.cf-seed-brief-body {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  display: grid;
  gap: 12px;
  padding: 14px;
  scrollbar-color: rgba(122, 167, 255, .36) rgba(255, 255, 255, .04);
}

.cf-seed-brief-actions {
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, .07);
}

.cf-seed-brief-editor {
  display: grid;
  gap: 7px;
}

.cf-seed-brief-editor textarea {
  width: 100%;
  min-height: 320px;
  box-sizing: border-box;
  padding: 11px;
  border: 1px solid var(--cf-border-soft);
  border-radius: 8px;
  outline: 0;
  resize: vertical;
  background: rgba(8, 10, 14, .62);
  color: var(--cf-text);
  line-height: 1.5;
}

.cf-seed-brief-editor-actions {
  justify-content: flex-end;
}

.cf-gene-task-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  overflow: hidden;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 10px;
  background: rgba(8, 10, 14, .42);
}

.cf-gene-task-card.is-reminder {
  border-color: rgba(240, 195, 107, .2);
  background:
    linear-gradient(135deg, rgba(240, 195, 107, .07), transparent 48%),
    rgba(8, 10, 14, .48);
}

.cf-gene-task-card.is-suggestion {
  border-color: rgba(94, 215, 197, .2);
}

.cf-gene-task-card.is-composing {
  align-items: start;
  border-color: rgba(94, 215, 197, .34);
  background:
    linear-gradient(135deg, rgba(94, 215, 197, .08), transparent 44%),
    rgba(8, 10, 14, .56);
}

.cf-gene-task-card.is-extracting {
  border-color: rgba(94, 215, 197, .48);
  background:
    radial-gradient(circle at 86% 50%, rgba(94, 215, 197, .14), transparent 14rem),
    linear-gradient(135deg, rgba(94, 215, 197, .1), transparent 42%),
    rgba(8, 10, 14, .62);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .05),
    0 0 0 1px rgba(94, 215, 197, .08),
    0 18px 48px rgba(0, 0, 0, .28);
}

.cf-gene-task-card.is-extracting::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, transparent, rgba(94, 215, 197, .18), transparent);
  animation: cf-gene-card-scan 1.7s ease-in-out infinite;
}

.cf-gene-task-card.is-extracting button:disabled {
  opacity: 1;
}

.cf-gene-card-loader {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 0 9px 0 7px;
  border: 1px solid rgba(94, 215, 197, .3);
  border-radius: 999px;
  background: rgba(4, 10, 13, .82);
  color: #c8fff5;
  box-shadow: 0 10px 28px rgba(0, 0, 0, .28);
  backdrop-filter: blur(12px);
}

.cf-gene-card-loader-core {
  position: relative;
  width: 22px;
  height: 18px;
  display: block;
}

.cf-gene-card-loader-core span {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: var(--cf-growth);
  box-shadow: 0 0 14px rgba(94, 215, 197, .58);
  animation: cf-gene-card-orbit 1.28s linear infinite;
}

.cf-gene-card-loader-core span:nth-child(2) {
  animation-delay: -.42s;
  background: var(--cf-accent);
}

.cf-gene-card-loader-core span:nth-child(3) {
  animation-delay: -.84s;
  background: #f0c36b;
}

.cf-gene-card-loader em {
  color: #dffdf8;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
  white-space: nowrap;
}

.cf-gene-task-main {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.cf-gene-task-main strong {
  overflow: hidden;
  color: var(--cf-text);
  font-size: 13px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-gene-task-main p {
  margin: 0;
}

.cf-gene-evidence-preview {
  display: grid;
  gap: 7px;
  margin-top: 5px;
}

.cf-gene-evidence-preview article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 12px;
  align-items: center;
  padding: 9px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 9px;
  background: rgba(255, 255, 255, .026);
}

.cf-gene-evidence-preview article > div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.cf-gene-evidence-preview span,
.cf-gene-evidence-preview em {
  color: var(--cf-muted);
  font-size: 11px;
  font-style: normal;
  line-height: 16px;
}

.cf-gene-evidence-preview strong {
  overflow: hidden;
  color: var(--cf-text);
  font-size: 12px;
  line-height: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-gene-evidence-preview p {
  grid-column: 1 / -1;
  display: -webkit-box;
  overflow: hidden;
  color: #a7b0bd;
  font-size: 12px;
  line-height: 18px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.cf-gene-evidence-preview button {
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid rgba(139, 156, 255, .18);
  border-radius: 7px;
  background: rgba(139, 156, 255, .07);
  color: #dce2ff;
  font-size: 12px;
  cursor: pointer;
}

.cf-gene-evidence-preview button:hover {
  border-color: rgba(139, 156, 255, .34);
  background: rgba(139, 156, 255, .12);
}

.cf-gene-reason-panel {
  display: grid;
  gap: 10px;
  margin-top: 4px;
  padding: 12px;
  border: 1px solid rgba(94, 215, 197, .22);
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(94, 215, 197, .08), transparent 46%),
    rgba(4, 7, 11, .7);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
}

.cf-gene-reason-panel header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.cf-gene-reason-panel header div {
  display: grid;
  gap: 3px;
}

.cf-gene-reason-panel header strong {
  color: var(--cf-text);
  font-size: 13px;
}

.cf-gene-reason-panel header span {
  color: var(--cf-muted);
  font-size: 11px;
  line-height: 17px;
}

.cf-gene-reason-field {
  display: grid;
  gap: 6px;
}

.cf-gene-reason-field textarea {
  width: 100%;
  min-height: 78px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 9px;
  outline: 0;
  background: rgba(5, 7, 11, .62);
  color: var(--cf-text);
  font-size: 12px;
  line-height: 18px;
  resize: vertical;
}

.cf-gene-reason-field textarea::placeholder {
  color: rgba(143, 152, 168, .74);
}

.cf-gene-reason-field textarea:focus {
  border-color: rgba(94, 215, 197, .42);
  box-shadow: 0 0 0 3px rgba(94, 215, 197, .1);
}

.cf-gene-reason-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cf-gene-reason-actions button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 8px;
  background: rgba(255, 255, 255, .045);
  color: var(--cf-text);
  font-size: 12px;
  cursor: pointer;
}

.cf-gene-reason-actions button:first-child {
  border-color: rgba(94, 215, 197, .28);
  background: rgba(94, 215, 197, .12);
  color: #c0fff4;
}

.cf-gene-compose-enter-active,
.cf-gene-compose-leave-active {
  overflow: hidden;
  transition: opacity .18s ease, transform .18s ease, max-height .18s ease;
}

.cf-gene-compose-enter-from,
.cf-gene-compose-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-5px);
}

.cf-gene-compose-enter-to,
.cf-gene-compose-leave-from {
  max-height: 240px;
  opacity: 1;
  transform: translateY(0);
}

.cf-gene-task-badge {
  width: fit-content;
  min-height: 23px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid rgba(94, 215, 197, .2);
  border-radius: 999px;
  background: rgba(94, 215, 197, .08);
  color: #c0fff4;
  font-size: 11px;
}

.cf-gene-task-actions {
  justify-content: flex-end;
}

.cf-gene-task-actions button,
.cf-gene-editor-actions button {
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.cf-gene-task-actions button:first-child,
.cf-gene-editor-actions button:nth-child(2) {
  border-color: rgba(94, 215, 197, .28);
  background: rgba(94, 215, 197, .12);
  color: #c0fff4;
}

.cf-gene-dialog-empty span {
  color: var(--cf-muted);
  font-size: 12px;
  line-height: 18px;
}

.cf-gene-dialog-basis {
  border-color: rgba(139, 156, 255, .18);
  background:
    linear-gradient(135deg, rgba(139, 156, 255, .08), transparent 42%),
    rgba(255, 255, 255, .03);
}

.cf-gene-dialog-basis header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cf-gene-dialog-basis header span {
  min-height: 23px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid rgba(139, 156, 255, .18);
  border-radius: 999px;
  background: rgba(139, 156, 255, .08);
  color: #d8dfff;
  font-size: 11px;
}

.cf-gene-dialog-basis div {
  display: grid;
  gap: 7px;
}

.cf-gene-dialog-basis div span {
  padding: 8px 9px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 8px;
  background: rgba(255, 255, 255, .03);
  color: var(--cf-muted);
  font-size: 12px;
  line-height: 18px;
}

.cf-gene-editor {
  grid-template-columns: 1fr 1fr;
}

.cf-gene-editor-head {
  grid-column: 1 / -1;
}

.cf-gene-editor-head strong {
  color: var(--cf-text);
  font-size: 12px;
}

.cf-gene-editor-head button {
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 6px;
  background: rgba(255, 255, 255, .045);
  color: var(--cf-muted);
  cursor: pointer;
}

.cf-gene-editor label {
  display: grid;
  gap: 5px;
}

.cf-gene-editor label.is-wide {
  grid-column: 1 / -1;
}

.cf-gene-editor input,
.cf-gene-editor textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--cf-border-soft);
  border-radius: 7px;
  outline: 0;
  background: rgba(8, 10, 14, .62);
  color: var(--cf-text);
}

.cf-gene-editor input {
  min-height: 32px;
  padding: 0 8px;
}

.cf-gene-editor textarea {
  min-height: 118px;
  padding: 8px;
  resize: vertical;
}

.cf-gene-editor-actions {
  grid-column: 1 / -1;
}

.cf-node-detail {
  position: absolute;
  z-index: 22;
  top: 0;
  right: 0;
  width: 406px;
  height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  border-left: 1px solid var(--cf-border-soft);
  background: rgba(10, 13, 15, .94);
  backdrop-filter: blur(28px);
}

.cf-node-detail-header {
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--cf-border-soft);
}

.cf-detail-kicker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--cf-muted);
  font-size: 12px;
}

.cf-node-detail h1 {
  margin: 10px 0 14px;
  font-size: 20px;
  line-height: 1.25;
}

.cf-natural-selection {
  display: flex;
  gap: 8px;
}

.cf-state-note,
.cf-failed-bar {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid rgba(157, 228, 155, .18);
  border-radius: 7px;
  background: rgba(157, 228, 155, .055);
  color: #ccefc9;
  font-size: 12px;
}

.cf-state-action {
  flex: 1;
}

.cf-state-action.is-primary {
  border-color: rgba(157, 228, 155, .32);
  background: #9de49b;
  color: #06110d;
  font-weight: 800;
}

.cf-failed-bar {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
  border-color: rgba(240, 195, 107, .24);
  background: rgba(240, 195, 107, .08);
  color: #ffe0b2;
}

.cf-failed-bar button {
  min-height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, .08);
  color: var(--cf-text);
  cursor: pointer;
}

.cf-node-detail-body {
  overflow: auto;
  padding: 14px 18px;
}

.cf-detail-section {
  padding: 14px 0;
  border-bottom: 1px solid var(--cf-border-soft);
}

.cf-detail-section:first-child {
  padding-top: 0;
}

.cf-detail-section h2 {
  margin: 0 0 10px;
  color: #c0c9cb;
  font-size: 12px;
}

.cf-gene-grid,
.cf-growth-detail-refs {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.cf-gene,
.cf-ref-chip {
  padding: 6px 8px;
  border: 1px solid rgba(94, 215, 197, .2);
  border-radius: 6px;
  background: rgba(94, 215, 197, .08);
  color: #c0fff4;
  font-size: 12px;
}

.cf-record-list {
  display: grid;
  gap: 8px;
}

.cf-record {
  padding: 10px;
  border: 1px solid var(--cf-border-soft);
  border-radius: 8px;
  background: rgba(255, 255, 255, .035);
  color: var(--cf-muted);
  font-size: 12px;
}

.cf-info-row {
  display: grid;
  gap: 5px;
  margin-bottom: 10px;
  font-size: 12px;
}

.cf-info-row span {
  color: var(--cf-muted);
}

.cf-info-row strong {
  overflow-wrap: anywhere;
  font-weight: 600;
}

.cf-pipeline-panel {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid rgba(94, 215, 197, .18);
  border-radius: 8px;
  background: rgba(94, 215, 197, .06);
}

.cf-pipeline-head,
.cf-pipeline-summary,
.cf-pipeline-directions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cf-pipeline-head span,
.cf-pipeline-summary span {
  color: var(--cf-muted);
  font-size: 11px;
}

.cf-pipeline-head strong {
  color: #c0fff4;
  font-size: 12px;
}

.cf-pipeline-current {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid rgba(94, 215, 197, .18);
  border-radius: 8px;
  background: rgba(94, 215, 197, .08);
}

.cf-pipeline-current span {
  color: var(--cf-muted);
  font-size: 11px;
}

.cf-pipeline-current strong {
  overflow-wrap: anywhere;
  color: #c0fff4;
  font-size: 13px;
}

.cf-pipeline-current em {
  color: var(--cf-muted);
  font-size: 11px;
  font-style: normal;
}

.cf-pipeline-summary,
.cf-pipeline-directions {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.cf-pipeline-summary span,
.cf-pipeline-directions span {
  padding: 4px 6px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 6px;
  background: rgba(255, 255, 255, .04);
}

.cf-pipeline-steps {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cf-pipeline-steps li {
  --step-indent: 0;
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: 8px;
  align-items: start;
  margin-left: calc(var(--step-indent) * 14px);
  color: var(--cf-muted);
}

.cf-step-dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .22);
}

.cf-pipeline-steps li.is-running .cf-step-dot {
  background: var(--cf-growth);
  box-shadow: 0 0 14px rgba(94, 215, 197, .36);
}

.cf-pipeline-steps li.is-completed .cf-step-dot {
  background: var(--cf-select);
}

.cf-pipeline-steps li.is-failed .cf-step-dot {
  background: #ff9b7d;
}

.cf-pipeline-steps div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.cf-pipeline-steps strong {
  overflow-wrap: anywhere;
  color: var(--cf-text);
  font-size: 12px;
}

.cf-pipeline-steps span,
.cf-pipeline-steps em {
  color: var(--cf-muted);
  font-size: 11px;
  font-style: normal;
}

.cf-node-detail-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid var(--cf-border-soft);
}

.cf-publication-panel {
  grid-template-columns: 1fr;
  max-height: 45vh;
  overflow: auto;
  scrollbar-color: rgba(122, 167, 255, .3) rgba(255, 255, 255, .04);
}

.cf-publication-head,
.cf-publication-card-head,
.cf-feedback-head,
.cf-command-modal header,
.cf-command-modal footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cf-publication-head span,
.cf-publication-card-head span,
.cf-feedback-head span,
.cf-command-modal header span,
.cf-command-modal label span,
.cf-feedback-snapshot span {
  color: var(--cf-muted);
  font-size: 11px;
}

.cf-publication-head strong,
.cf-publication-card-head strong,
.cf-feedback-head strong,
.cf-command-modal header strong {
  display: block;
  color: var(--cf-text);
  font-size: 13px;
}

.cf-publication-head em {
  max-width: 190px;
  color: var(--cf-muted);
  font-size: 12px;
  font-style: normal;
  line-height: 18px;
  text-align: right;
}

.cf-publication-empty,
.cf-publication-card,
.cf-feedback-box,
.cf-feedback-snapshot {
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 8px;
  background: rgba(255, 255, 255, .035);
}

.cf-publication-empty {
  display: grid;
  gap: 5px;
  padding: 12px;
  color: var(--cf-muted);
  font-size: 12px;
}

.cf-publication-list {
  display: grid;
  gap: 10px;
}

.cf-publication-card {
  display: grid;
  gap: 10px;
  padding: 11px;
  background:
    linear-gradient(135deg, rgba(122, 167, 255, .055), transparent 46%),
    rgba(8, 10, 14, .42);
}

.cf-publication-meta {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 7px 10px;
  font-size: 12px;
}

.cf-publication-meta span {
  color: var(--cf-muted);
}

.cf-publication-meta strong {
  overflow-wrap: anywhere;
  color: #dbe4e8;
  font-weight: 600;
}

.cf-mini-action,
.cf-text-action {
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 7px;
  background: rgba(255, 255, 255, .045);
  color: var(--cf-text);
  font-size: 12px;
  cursor: pointer;
}

.cf-mini-action:hover,
.cf-text-action:hover {
  border-color: rgba(94, 215, 197, .3);
  background: rgba(94, 215, 197, .09);
}

.cf-feedback-box {
  display: grid;
  gap: 8px;
  padding: 9px;
  border-color: rgba(94, 215, 197, .14);
}

.cf-text-action {
  justify-self: start;
  color: #bffff3;
}

.cf-feedback-snapshots {
  display: grid;
  gap: 7px;
}

.cf-feedback-snapshot {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: start;
  padding: 8px;
}

.cf-feedback-snapshot strong,
.cf-feedback-snapshot code {
  display: block;
  margin-top: 4px;
  overflow-wrap: anywhere;
  font-size: 12px;
}

.cf-feedback-snapshot code {
  color: #bffff3;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.cf-feedback-empty {
  margin: 0;
  color: var(--cf-muted);
  font-size: 12px;
}

.cf-error-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cf-error-action button {
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 6px;
  background: rgba(255, 255, 255, .06);
  color: var(--cf-text);
  cursor: pointer;
}

.cf-modal-backdrop {
  position: absolute;
  z-index: 60;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, .42);
  backdrop-filter: blur(10px);
}

.cf-command-modal {
  width: min(440px, calc(100vw - 32px));
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 8px;
  background: rgba(16, 19, 23, .98);
  box-shadow: 0 28px 90px rgba(0, 0, 0, .48);
}

.cf-command-modal label {
  display: grid;
  gap: 6px;
}

.cf-command-modal input,
.cf-command-modal textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--cf-border-soft);
  border-radius: 7px;
  outline: 0;
  background: rgba(8, 10, 14, .68);
  color: var(--cf-text);
}

.cf-command-modal input {
  min-height: 36px;
  padding: 0 10px;
}

.cf-command-modal textarea {
  min-height: 82px;
  padding: 10px;
  resize: vertical;
}

.cf-metric-builder {
  display: grid;
  gap: 10px;
  padding: 11px;
  border: 1px solid rgba(94, 215, 197, .13);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(94, 215, 197, .055), transparent 44%),
    rgba(8, 10, 14, .48);
}

.cf-metric-builder-head,
.cf-metric-name-row,
.cf-metric-row div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cf-metric-builder-head {
  justify-content: space-between;
}

.cf-metric-builder-head span {
  color: var(--cf-muted);
  font-size: 11px;
}

.cf-metric-add {
  width: 30px;
  height: 30px;
  border: 1px solid rgba(94, 215, 197, .28);
  border-radius: 7px;
  background: rgba(94, 215, 197, .11);
  color: #bffff3;
  font-size: 19px;
  line-height: 1;
  cursor: pointer;
  transition: transform .16s ease, border-color .16s ease, background .16s ease;
}

.cf-metric-add:hover {
  border-color: rgba(94, 215, 197, .48);
  background: rgba(94, 215, 197, .17);
  transform: translateY(-1px);
}

.cf-metric-name-row input {
  flex: 1;
}

.cf-metric-name-row button,
.cf-metric-row button {
  min-height: 32px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 7px;
  background: rgba(255, 255, 255, .045);
  color: var(--cf-text);
  cursor: pointer;
}

.cf-metric-name-row button {
  padding: 0 10px;
}

.cf-metric-list {
  display: grid;
  gap: 9px;
}

.cf-metric-row {
  display: grid;
  gap: 6px;
}

.cf-metric-row > span {
  color: #c0fff4;
  font-size: 12px;
  font-weight: 700;
}

.cf-metric-row div {
  align-items: stretch;
}

.cf-metric-row input {
  flex: 1;
}

.cf-metric-row button {
  width: 34px;
  color: #ffd6d6;
}

.cf-metric-row:focus-within > span {
  color: var(--cf-text);
}

.cf-metric-empty {
  margin: 0;
  padding: 10px;
  border: 1px dashed rgba(255, 255, 255, .13);
  border-radius: 7px;
  color: var(--cf-muted);
  font-size: 12px;
}

.cf-growth-composer {
  position: absolute;
  z-index: 25;
  left: calc(50% - 203px);
  bottom: 18px;
  width: min(760px, calc(100vw - 650px));
  min-width: 540px;
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .055), rgba(255, 255, 255, .02)),
    rgba(22, 25, 31, .97);
  box-shadow: 0 28px 90px rgba(0, 0, 0, .46);
  transform: translateX(-50%);
  backdrop-filter: blur(26px);
}

.cf-growth-top {
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid var(--cf-border-soft);
}

.cf-growth-pill {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0 10px;
  border: 1px solid var(--cf-border);
  border-radius: 6px;
  background: rgba(255, 255, 255, .045);
}

.cf-growth-pill.is-source {
  max-width: 270px;
  border-color: rgba(94, 215, 197, .24);
}

.cf-growth-pill span {
  color: var(--cf-muted);
  font-size: 11px;
}

.cf-growth-pill strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-growth-menu-wrap {
  position: relative;
  min-width: 0;
}

.cf-growth-picker {
  cursor: pointer;
}

.cf-growth-picker:hover {
  border-color: rgba(122, 167, 255, .38);
  background: rgba(122, 167, 255, .08);
}

.cf-growth-picker[aria-expanded="true"] {
  border-color: rgba(122, 167, 255, .42);
  background: rgba(122, 167, 255, .09);
}

.cf-picker-caret {
  color: var(--cf-muted);
  font-size: 13px;
}

.cf-pill-menu {
  position: absolute;
  z-index: 35;
  bottom: calc(100% + 8px);
  left: 0;
  width: 286px;
  max-height: 242px;
  display: grid;
  gap: 4px;
  overflow: auto;
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 8px;
  background: rgba(18, 21, 24, .98);
  box-shadow: 0 22px 72px rgba(0, 0, 0, .42);
  scrollbar-color: rgba(122, 167, 255, .42) rgba(255, 255, 255, .04);
  animation: cf-menu-in .16s ease both;
}

.cf-pill-menu.is-compact {
  width: 112px;
}

.cf-pill-menu-item,
.cf-pill-menu-empty {
  min-height: 38px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  color: var(--cf-muted);
  font-size: 12px;
  text-align: left;
}

.cf-pill-menu-item {
  background: transparent;
  cursor: pointer;
}

.cf-pill-menu-item:hover,
.cf-pill-menu-item.is-active {
  background: rgba(94, 215, 197, .12);
  color: var(--cf-text);
}

.cf-pill-menu-item strong,
.cf-pill-menu-item em {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-pill-menu-item strong {
  font-size: 12px;
}

.cf-pill-menu-item em {
  margin-top: 2px;
  color: var(--cf-muted);
  font-size: 11px;
  font-style: normal;
}

.cf-menu-check {
  color: var(--cf-select);
  font-size: 12px;
}

.cf-growth-input {
  position: relative;
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 10px;
  color: var(--cf-text);
  font-size: 14px;
  line-height: 1.45;
}

.cf-growth-input textarea {
  width: 100%;
  min-height: 96px;
  max-height: 180px;
  padding: 12px;
  border: 1px solid var(--cf-border-soft);
  border-radius: 8px;
  outline: 0;
  resize: none;
  background: rgba(8, 10, 14, .62);
  color: var(--cf-text);
  caret-color: var(--cf-text);
  line-height: 1.45;
}

.cf-growth-input textarea::placeholder {
  color: var(--cf-muted);
}

.cf-inline-refs {
  max-height: 62px;
  overflow: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 2px;
  scrollbar-color: rgba(255, 255, 255, .22) transparent;
}

.cf-mention {
  max-width: 260px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 22px;
  padding: 0 5px 0 8px;
  border: 1px solid rgba(94, 215, 197, .24);
  border-radius: 6px;
  background: rgba(94, 215, 197, .12);
  color: #bffff3;
  font-weight: 700;
  white-space: nowrap;
}

.cf-mention span,
.cf-ref-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.cf-mention.is-nutrient {
  border-color: rgba(240, 195, 107, .24);
  background: rgba(240, 195, 107, .1);
  color: #ffe0b2;
}

.cf-mention.is-nutrient_card {
  border-color: rgba(177, 128, 255, .28);
  background: rgba(177, 128, 255, .12);
  color: #dec9ff;
}

.cf-growth-footer {
  justify-content: space-between;
  padding: 0 10px 10px;
}

.cf-growth-refs {
  overflow: hidden;
}

.cf-round-tool,
.cf-send-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  cursor: pointer;
}

.cf-round-tool {
  border: 1px solid var(--cf-border-soft);
  background: rgba(255, 255, 255, .04);
  color: var(--cf-muted);
  font-size: 22px;
}

.cf-round-tool:hover {
  background: rgba(255, 255, 255, .07);
  color: var(--cf-text);
}

.cf-ref-chip {
  max-width: 180px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 5px 6px 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-mention-remove {
  width: 18px;
  height: 18px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  border-radius: 4px;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  opacity: .72;
}

.cf-mention-remove:hover,
.cf-mention-remove:focus-visible {
  background: rgba(255, 255, 255, .1);
  opacity: 1;
  outline: 0;
}

.cf-ref-chip.is-nutrient {
  border-color: rgba(240, 195, 107, .24);
  background: rgba(240, 195, 107, .08);
  color: #ffe0b2;
}

.cf-ref-chip.is-nutrient_card {
  border-color: rgba(177, 128, 255, .28);
  background: rgba(177, 128, 255, .1);
  color: #dec9ff;
}

.cf-send-button {
  background: #f6f7f4;
  color: #151719;
  font-size: 20px;
  font-weight: 800;
}

.cf-resource-popover,
.cf-growth-detail-panel {
  position: absolute;
  border: 1px solid var(--cf-border);
  background: rgba(21, 24, 26, .98);
  box-shadow: 0 22px 72px rgba(0, 0, 0, .42);
}

.cf-resource-popover {
  left: 12px;
  bottom: calc(100% + 10px);
  width: min(470px, calc(100% - 24px));
  max-height: 268px;
  display: grid;
  gap: 8px;
  overflow: auto;
  padding: 8px;
  border-radius: 8px;
  background: rgba(17, 20, 26, .99);
  scrollbar-color: rgba(94, 215, 197, .42) rgba(255, 255, 255, .04);
  animation: cf-menu-in .16s ease both;
}

.cf-resource-groups,
.cf-resource-group {
  display: grid;
  gap: 7px;
}

.cf-resource-group {
  padding: 4px;
}

.cf-resource-group + .cf-resource-group {
  border-top: 1px solid rgba(255, 255, 255, .08);
  padding-top: 8px;
}

.cf-resource-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}

.cf-resource-group-head span {
  color: var(--cf-text);
  font-size: 12px;
  font-weight: 780;
}

.cf-resource-group-head em {
  overflow: hidden;
  color: var(--cf-muted);
  font-size: 11px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-resource-row {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  gap: 10px;
  align-items: center;
  min-height: 50px;
  padding: 8px;
  border-radius: 7px;
  background: transparent;
  color: var(--cf-muted);
  text-align: left;
  cursor: pointer;
}

.cf-resource-row:hover {
  background: rgba(94, 215, 197, .1);
  color: var(--cf-text);
}

.cf-resource-row:focus-visible,
.cf-pill-menu-item:focus-visible,
.cf-round-tool:focus-visible,
.cf-send-button:focus-visible {
  outline: 2px solid rgba(122, 167, 255, .42);
  outline-offset: 2px;
}

.cf-resource-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid var(--cf-border);
  border-radius: 7px;
  background: rgba(94, 215, 197, .06);
  color: var(--cf-growth);
  font-size: 12px;
  font-weight: 800;
}

.cf-resource-group.is-gene .cf-resource-icon {
  border-color: rgba(122, 167, 255, .24);
  background: rgba(122, 167, 255, .08);
  color: #b9ccff;
}

.cf-resource-group.is-nutrient_card .cf-resource-icon {
  border-color: rgba(177, 128, 255, .24);
  background: rgba(177, 128, 255, .08);
  color: #dec9ff;
}

.cf-resource-row strong,
.cf-resource-meta {
  display: block;
}

.cf-resource-row-main {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.cf-resource-row strong {
  overflow: hidden;
  color: var(--cf-text);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-resource-meta {
  overflow: hidden;
  color: rgba(220, 229, 225, .7);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-resource-row kbd {
  padding: 2px 5px;
  border: 1px solid var(--cf-border);
  border-radius: 5px;
  background: rgba(255, 255, 255, .04);
  color: var(--cf-muted);
  font-size: 10px;
}

.cf-growth-detail-panel {
  right: 52px;
  bottom: 50px;
  width: 328px;
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
}

.cf-growth-detail-head,
.cf-growth-detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cf-growth-detail-head {
  font-size: 12px;
  font-weight: 800;
}

.cf-growth-detail-head span,
.cf-growth-detail-row {
  color: var(--cf-muted);
  font-size: 12px;
}

.cf-growth-detail-row strong {
  color: var(--cf-text);
}

.cf-growth-option-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.cf-growth-option-grid.is-compact {
  grid-template-columns: repeat(3, 1fr);
}

.cf-growth-option {
  display: grid;
  gap: 3px;
  padding: 8px;
  border: 1px solid var(--cf-border-soft);
  border-radius: 7px;
  background: rgba(255, 255, 255, .035);
  color: var(--cf-muted);
  text-align: left;
  cursor: pointer;
}

.cf-growth-option:hover,
.cf-growth-option.is-active {
  border-color: rgba(94, 215, 197, .34);
  background: rgba(94, 215, 197, .1);
  color: var(--cf-text);
}

.cf-growth-option strong {
  color: inherit;
  font-size: 12px;
}

.cf-growth-option span {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-inline-error {
  margin: 8px 0;
  color: #ffd7c9;
  font-size: 12px;
}

@keyframes cf-branch-flow {
  to {
    stroke-dashoffset: -22;
  }
}

@keyframes cf-gene-orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes cf-gene-card-orbit {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) translateX(8px) scale(.84);
  }

  50% {
    transform: translate(-50%, -50%) rotate(180deg) translateX(8px) scale(1.15);
  }

  100% {
    transform: translate(-50%, -50%) rotate(360deg) translateX(8px) scale(.84);
  }
}

@keyframes cf-gene-card-scan {
  0% {
    transform: translateX(-120%);
    opacity: 0;
  }

  35%,
  70% {
    opacity: 1;
  }

  100% {
    transform: translateX(120%);
    opacity: 0;
  }
}

@keyframes cf-dna-spin {
  0% {
    transform: rotateY(0deg) rotateZ(-4deg);
  }

  50% {
    transform: rotateY(180deg) rotateZ(4deg);
  }

  100% {
    transform: rotateY(360deg) rotateZ(-4deg);
  }
}

@keyframes cf-menu-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes cf-thread-grow {
  0%,
  100% {
    opacity: .28;
    transform: scaleX(.36);
  }

  50% {
    opacity: 1;
    transform: scaleX(1);
  }
}

@keyframes cf-core-seed {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(.86);
  }

  50% {
    transform: translate(-50%, -50%) scale(1.2);
  }
}

@keyframes cf-vessel-scan {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(120%);
  }
}

@keyframes cf-node-soft-pulse {
  0%,
  100% {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .08),
      0 18px 48px rgba(0, 0, 0, .3),
      0 0 0 1px rgba(94, 215, 197, .06);
  }

  50% {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .09),
      0 20px 54px rgba(0, 0, 0, .32),
      0 0 0 1px rgba(94, 215, 197, .12);
  }
}

@keyframes cf-header-growth {
  0%,
  100% {
    width: 34%;
    transform: translateX(0);
  }

  50% {
    width: 76%;
    transform: translateX(12%);
  }
}

@keyframes cf-brief-flow {
  0%,
  100% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }
}

@keyframes cf-brief-dot {
  0%,
  100% {
    opacity: .35;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cf-tree-node,
  .cf-tree-node.is-growing,
  .cf-tree-node.is-growth-placeholder,
  .cf-branch.is-growth-stream,
  .cf-vessel-thread,
  .cf-vessel-core,
  .cf-vessel-scan,
  .cf-gene-bubble::before,
  .cf-gene-card-loader-core span,
  .cf-gene-task-card.is-extracting::after,
  .cf-dna-helix,
  .cf-pill-menu,
  .cf-resource-popover,
  .cf-topbar-icon-action,
  .cf-topbar-icon-action svg,
  .cf-header-tree-status.is-growing .cf-growth-meter span {
    animation: none;
    transition-duration: .01ms;
  }

  .cf-tree-node:hover,
  .cf-topbar-icon-action:hover,
  .cf-topbar-icon-action:hover svg {
    transform: none;
  }
}

@media (max-width: 1180px) {
  .cf-node-detail {
    width: 360px;
  }

  .cf-workspace-topbar {
    right: 382px;
  }

  .cf-seed-brief-panel {
    width: min(340px, calc(100vw - 400px));
  }

  .cf-growth-composer {
    left: calc(50% - 180px);
    min-width: 500px;
    width: calc(100vw - 650px);
    transform: translateX(-50%);
  }

  .cf-growth-top {
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .cf-seed-brief-panel {
    right: 12px;
    left: 12px;
    width: auto;
    max-height: calc(100vh - 190px);
  }

  .cf-gene-bubble {
    right: 18px;
    bottom: 90px;
  }

  .cf-gene-dialog-backdrop {
    padding: 12px;
  }

  .cf-gene-dialog-head,
  .cf-gene-task-card {
    align-items: stretch;
    flex-direction: column;
    grid-template-columns: minmax(0, 1fr);
  }

  .cf-gene-dialog-metrics {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
