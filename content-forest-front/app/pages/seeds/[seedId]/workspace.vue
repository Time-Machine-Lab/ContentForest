<script setup lang="ts">
import { createFruitApi, type FruitDetail, type FruitSelectionState } from '../../../../src/modules/fruit'
import { createGrowthApi, type GrowthFailedInput, type GrowthNodeType, type GrowthTaskDetail } from '../../../../src/modules/growth'
import { createSeedApi } from '../../../../src/modules/seed'
import { createWorkspaceApi, type WorkspaceNode, type WorkspaceNodeRef, type WorkspaceSnapshot } from '../../../../src/modules/workspace'

type NodeType = 'seed' | 'fruit'
type NodeStatus = 'idle' | 'growing' | 'failed'
type ResourceKind = 'nutrient' | 'gene'

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

const seedId = computed(() => String(route.params.seedId || ''))
const snapshot = ref<WorkspaceSnapshot | null>(null)
const nodes = ref<TreeNode[]>([])
const selectedNodeId = ref('')
const transform = reactive({ x: -620, y: -360, scale: 1 })
const treeSize = reactive({ width: 1180, height: 820 })
const nodeSize = {
  seed: { width: 232, height: 156 },
  fruit: { width: 208, height: 150 },
}

const workspaceLoading = ref(false)
const workspaceError = ref('')
const detailLoading = ref(false)
const detailError = ref('')
const selectionLoading = ref(false)
const growthLoading = ref(false)
const growthError = ref('')
const dragState = ref<DragState | null>(null)
const suppressClickNodeId = ref('')
const resourcePopoverOpen = ref(false)
const resourceQuery = ref('')
const generatorMenuOpen = ref(false)
const fruitCountMenuOpen = ref(false)
const growthDetailOpen = ref(false)
const growthIntent = ref('')
const referencedResources = ref<ResourceRef[]>([])
const selectedGeneratorId = ref('')
const fruitCount = ref(3)
const mutationRate = ref(18)
const fruitCountOptions = [1, 2, 3, 4, 5, 6]

const pollTimers = new Map<string, ReturnType<typeof setTimeout>>()

const isReadOnly = computed(() => Boolean(snapshot.value?.workspaceReadOnly || route.query.readonly === '1'))
const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) ?? nodes.value[0] ?? null)
const canShowGrowthComposer = computed(() => {
  const node = selectedNode.value
  if (!node) return false
  if (node.nodeType === 'seed') return true
  return node.selectionState === 'selected'
})
const visibleComposer = computed(() => Boolean(canShowGrowthComposer.value && !isReadOnly.value && selectedNode.value?.status !== 'growing'))
const selectedGenerator = computed(() => snapshot.value?.resources.generators.find((item) => item.id === selectedGeneratorId.value) ?? null)
const generatorName = computed(() => selectedGenerator.value?.name ?? '未选择生成器')
const branchEdges = computed(() => {
  const snapshotEdges = snapshot.value?.edges.map((edge, index) => ({
    parentId: edge.parentNodeRef.nodeId,
    childId: edge.childNodeRef.nodeId,
    className: index === 0 ? 'is-primary' : index % 2 === 0 ? 'is-secondary' : 'is-weak',
  })) ?? []
  const existing = new Set(snapshotEdges.map((edge) => `${edge.parentId}->${edge.childId}`))
  const runtimeEdges = nodes.value
    .filter((node) => node.parentNodeRef && !existing.has(`${node.parentNodeRef.nodeId}->${node.id}`))
    .map((node) => ({
      parentId: node.parentNodeRef?.nodeId || '',
      childId: node.id,
      className: node.isPlaceholder ? 'is-growth-stream' : 'is-weak',
    }))
  return [...snapshotEdges, ...runtimeEdges]
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
        label: `营养 · ${item.title}`,
        scope: item.library.scope === 'public' ? '公共营养库' : item.library.name,
        description: `${item.library.name} · ${item.contentLocation}`,
      })),
    ...resources.geneInsights
      .filter((item) => item.status === 'active')
      .map((item) => ({
        id: item.id,
        kind: 'gene' as const,
        label: `基因 · ${item.title}`,
        scope: item.niche || '种子基因库',
        description: `${item.lineage || '经验'} · ${item.contentLocation}`,
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
const growthDetailResources = computed(() => referencedResources.value.map((resource) => ({
  ...resource,
  kindLabel: resource.kind === 'gene' ? '基因库' : '营养库',
})))

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

async function loadWorkspace(preferredNodeId = selectedNodeId.value) {
  if (!seedId.value) return

  workspaceLoading.value = true
  workspaceError.value = ''

  try {
    const nextSnapshot = await workspaceApi.getSeedWorkspace(seedId.value)
    snapshot.value = nextSnapshot
    nodes.value = mergeRunningPlaceholders(layoutSnapshot(nextSnapshot, nodes.value), nodes.value)

    const routeNodeId = typeof route.query.node === 'string' ? route.query.node : ''
    const nextSelectedId = preferredNodeId || routeNodeId || nextSnapshot.seed.rootNodeId || nodes.value[0]?.id || ''
    selectedNodeId.value = nodes.value.some((node) => node.id === nextSelectedId)
      ? nextSelectedId
      : nodes.value[0]?.id || ''

    if (!selectedGeneratorId.value || !nextSnapshot.resources.generators.some((item) => item.id === selectedGeneratorId.value)) {
      selectedGeneratorId.value = nextSnapshot.resources.generators[0]?.id || ''
    }

    referencedResources.value = referencedResources.value.filter((resource) => resourceOptions.value.some((item) => item.id === resource.id && item.kind === resource.kind))
    await loadSelectedNodeDetail()
  } catch (error) {
    workspaceError.value = errorMessage(error)
  } finally {
    workspaceLoading.value = false
  }
}

function layoutSnapshot(nextSnapshot: WorkspaceSnapshot, previousNodes: TreeNode[]) {
  const previousPositions = new Map(previousNodes.map((node) => [node.id, { x: node.x, y: node.y }]))
  const depthByNode = calculateDepths(nextSnapshot)
  const maxDepth = Math.max(0, ...Array.from(depthByNode.values()))
  const levels = new Map<number, WorkspaceNode[]>()

  nextSnapshot.nodes.forEach((node) => {
    const depth = depthByNode.get(node.nodeId) ?? 0
    const level = levels.get(depth) ?? []
    level.push(node)
    levels.set(depth, level)
  })

  const widestLevel = Math.max(1, ...Array.from(levels.values()).map((level) => level.length))
  const horizontalGap = 340
  const verticalGap = 228
  treeSize.width = Math.max(1380, widestLevel * horizontalGap + 520)
  treeSize.height = Math.max(960, (maxDepth + 2) * verticalGap)

  return nextSnapshot.nodes.map((node) => {
    const previousPosition = previousPositions.get(node.nodeId)
    const depth = depthByNode.get(node.nodeId) ?? 0
    const siblings = levels.get(depth) ?? [node]
    const index = siblings.findIndex((item) => item.nodeId === node.nodeId)
    const size = node.nodeType === 'seed' ? nodeSize.seed : nodeSize.fruit
    const gap = horizontalGap
    const levelWidth = (siblings.length - 1) * gap
    const x = treeSize.width / 2 - levelWidth / 2 + Math.max(0, index) * gap - size.width / 2
    const y = treeSize.height - 190 - depth * verticalGap

    return mapWorkspaceNode(node, previousPosition ?? { x, y })
  })
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

function calculateDepths(nextSnapshot: WorkspaceSnapshot) {
  const children = new Map<string, string[]>()
  nextSnapshot.edges.forEach((edge) => {
    const list = children.get(edge.parentNodeRef.nodeId) ?? []
    list.push(edge.childNodeRef.nodeId)
    children.set(edge.parentNodeRef.nodeId, list)
  })

  const rootNodeId = nextSnapshot.seed.rootNodeId || nextSnapshot.nodes.find((node) => node.nodeType === 'seed')?.nodeId || ''
  const depths = new Map<string, number>()
  const queue: Array<{ nodeId: string; depth: number }> = rootNodeId ? [{ nodeId: rootNodeId, depth: 0 }] : []

  while (queue.length > 0) {
    const current = queue.shift()!
    if (depths.has(current.nodeId)) continue
    depths.set(current.nodeId, current.depth)
    ;(children.get(current.nodeId) ?? []).forEach((childId) => queue.push({ nodeId: childId, depth: current.depth + 1 }))
  }

  nextSnapshot.nodes.forEach((node) => {
    if (!depths.has(node.nodeId)) depths.set(node.nodeId, node.nodeType === 'seed' ? 0 : 1)
  })

  return depths
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
  if (node.failedInput.hasFailedInput) records.unshift(`最近失败：${node.failedInput.failureReason || '可恢复输入后重试'}`)
  if (node.growth.isGrowing) records.unshift('枝化生长：生成中')
  return records
}

async function loadSelectedNodeDetail() {
  const node = selectedNode.value
  if (!node) return

  detailLoading.value = true
  detailError.value = ''

  try {
    if (node.nodeType === 'seed') {
      const detail = await seedApi.getSeed(seedId.value)
      node.markdown = detail.markdown
      node.title = detail.title
      node.contentLocation = detail.contentLocation
      node.updatedAt = detail.updatedAt
    } else if (node.fruitId) {
      const detail = await fruitApi.getFruit(node.fruitId)
      applyFruitDetail(node, detail)
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
  node.geneTags = detail.geneTags
  node.createdAt = detail.createdAt
  node.updatedAt = detail.updatedAt
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
  if (node.nodeType === 'seed') return isReadOnly.value ? '只读种子' : '根节点'
  if (node.status === 'growing') return '生长中'
  if (node.status === 'failed') return '最近失败'
  if (node.selectionState === 'selected') return '已选择'
  if (node.selectionState === 'eliminated') return '已淘汰'
  return '候选'
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
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
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
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
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
  transform.x = -620
  transform.y = -360
  transform.scale = 1
}

function addResource(resource: ResourceRef) {
  if (!referencedResources.value.some((item) => item.id === resource.id && item.kind === resource.kind)) {
    referencedResources.value = [resource, ...referencedResources.value]
  }
  growthIntent.value = removeActiveMention(growthIntent.value)
  resourcePopoverOpen.value = false
  resourceQuery.value = ''
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
}

function selectGenerator(generatorId: string) {
  selectedGeneratorId.value = generatorId
  generatorMenuOpen.value = false
}

function selectFruitCount(count: number) {
  fruitCount.value = count
  fruitCountMenuOpen.value = false
}

async function startGrowth() {
  const source = selectedNode.value
  if (!source || !visibleComposer.value || !selectedGeneratorId.value) return

  growthLoading.value = true
  growthError.value = ''
  growthDetailOpen.value = false
  generatorMenuOpen.value = false
  fruitCountMenuOpen.value = false

  try {
    const nutrientRefs = referencedResources.value
      .filter((resource) => resource.kind === 'nutrient')
      .map((resource) => ({ resourceType: 'nutrient' as const, resourceId: resource.id }))
    const geneRefs = referencedResources.value
      .filter((resource) => resource.kind === 'gene')
      .map((resource) => ({ resourceType: 'gene' as const, resourceId: resource.id }))
    const payload = {
      seedId: seedId.value,
      sourceNodeRef: { nodeType: source.nodeType, nodeId: source.id },
      userInput: growthIntent.value.trim(),
      generatorId: selectedGeneratorId.value,
      fruitCount: fruitCount.value,
      nutrientRefs,
      geneRefs,
      detailParams: { mutationRate: mutationRate.value / 100 },
    }
    source.status = 'growing'
    source.taskId = 'pending'
    addGrowthPlaceholders(source, fruitCount.value)
    console.info('[ContentForest] start growth task payload', payload)
    const result = await growthApi.startGrowthTask(payload)
    source.status = 'growing'
    source.taskId = result.task.id
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

function addGrowthPlaceholders(source: TreeNode, count: number) {
  removeGrowthPlaceholders(source.id)
  const size = getNodeSize(source)
  const childY = source.y - 218
  const spread = Math.min(560, Math.max(220, count * 132))
  const startX = source.x + size.width / 2 - spread / 2
  const placeholders = Array.from({ length: count }, (_, index): TreeNode => ({
    id: `pending-${source.id}-${Date.now()}-${index}`,
    nodeType: 'fruit',
    title: `果实生成中 ${index + 1}`,
    summary: `生成中 ${index + 1}`,
    markdown: '',
    x: startX + index * (spread / Math.max(1, count - 1)) - nodeSize.fruit.width / 2,
    y: childY,
    selectionState: 'candidate',
    parentNodeRef: { nodeType: source.nodeType, nodeId: source.id },
    contentLocation: '',
    geneTags: ['胚芽装配', '脉冲生成'],
    records: ['枝化生长任务已提交，等待后端返回真实果实'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'growing',
    taskId: null,
    isPlaceholder: true,
    failedInput: {
      hasFailedInput: false,
      taskId: null,
      failureReason: null,
      updatedAt: null,
    },
  }))
  nodes.value = [...nodes.value, ...placeholders]
}

function removeGrowthPlaceholders(sourceNodeId: string) {
  nodes.value = nodes.value.filter((node) => !(node.isPlaceholder && node.parentNodeRef?.nodeId === sourceNodeId))
}

function pollGrowthTask(task: GrowthTaskDetail) {
  stopGrowthPolling(task.id)

  if (task.status !== 'running') {
    removeGrowthPlaceholders(task.sourceNodeRef.nodeId)
    void loadWorkspace(task.sourceNodeRef.nodeId)
    return
  }

  const timer = setTimeout(async () => {
    pollTimers.delete(task.id)
    try {
      const nextTask = await growthApi.getGrowthTask(task.id)
      if (nextTask.status === 'running') {
        pollGrowthTask(nextTask)
        return
      }

      if (nextTask.status === 'failed') growthError.value = nextTask.failureReason || '枝化生长失败，可恢复输入后重试'
      removeGrowthPlaceholders(nextTask.sourceNodeRef.nodeId)
      await loadWorkspace(nextTask.sourceNodeRef.nodeId)
    } catch (error) {
      growthError.value = errorMessage(error)
    }
  }, 1800)
  pollTimers.set(task.id, timer)
}

function stopGrowthPolling(taskId: string) {
  const timer = pollTimers.get(taskId)
  if (timer) clearTimeout(timer)
  pollTimers.delete(taskId)
}

function stopAllPolling() {
  pollTimers.forEach((timer) => clearTimeout(timer))
  pollTimers.clear()
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
  referencedResources.value = [
    ...failedInput.nutrientRefs,
    ...failedInput.geneRefs,
  ].map((ref) => resourceOptions.value.find((resource) => resource.id === ref.resourceId && resource.kind === ref.resourceType))
    .filter((resource): resource is ResourceRef => Boolean(resource))
}

async function retryGrowth() {
  const node = selectedNode.value
  if (!node || !node.failedInput.hasFailedInput) return

  growthLoading.value = true
  growthError.value = ''

  try {
    const result = await growthApi.retryGrowthSource(node.nodeType as GrowthNodeType, node.id)
    node.status = 'growing'
    node.taskId = result.task.id
    addGrowthPlaceholders(node, result.task.fruitCount || fruitCount.value)
    pollGrowthTask(result.task)
  } catch (error) {
    growthError.value = errorMessage(error)
  } finally {
    growthLoading.value = false
  }
}

function formatDateTime(value: string) {
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
      <div class="cf-workspace-crumb">
        <strong>{{ snapshot?.seed.title || '内容森林工作区' }}</strong>
      </div>
      <div class="cf-workspace-actions">
        <NuxtLink class="cf-secondary-action" to="/seeds">返回种子库</NuxtLink>
        <button class="cf-workspace-tool" type="button" @click="resetView">适应视图</button>
      </div>
    </header>

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
      <div class="cf-growth-ribbon">
        <strong>
          <span>{{ selectedNode?.status === 'growing' ? '枝化生长' : workspaceLoading ? '加载工作区' : '树已同步' }}</span>
          <span>{{ selectedNode?.status === 'growing' ? '生成中' : `${nodes.length} 节点` }}</span>
        </strong>
        <div class="cf-growth-meter"><span /></div>
      </div>

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
          v-for="node in nodes"
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
            <span>{{ node.nodeType === 'seed' ? 'SEED' : 'FRUIT' }}</span>
            <span class="cf-node-dot" />
          </span>
          <span class="cf-node-identity" aria-hidden="true">
            <span class="cf-node-orb">
              <span class="cf-orb-core" />
              <span class="cf-orb-vein is-a" />
              <span class="cf-orb-vein is-b" />
            </span>
            <span class="cf-node-signature">
              <span />
              <span />
              <span />
            </span>
          </span>
          <span class="cf-node-title">{{ node.title }}</span>
          <span v-if="node.isPlaceholder" class="cf-growth-vessel" aria-hidden="true">
            <span class="cf-vessel-thread is-a" />
            <span class="cf-vessel-thread is-b" />
            <span class="cf-vessel-core" />
            <span class="cf-vessel-scan" />
          </span>
          <span class="cf-node-tags">
            <span class="cf-node-tag">{{ nodeStateLabel(node) }}</span>
            <span v-if="node.geneTags[0]" class="cf-node-tag">{{ node.geneTags[0] }}</span>
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

      <footer class="cf-node-detail-footer">
        <button class="cf-secondary-action" type="button" disabled>发布器</button>
        <button class="cf-secondary-action" type="button" disabled>监控器</button>
        <button class="cf-secondary-action" type="button" disabled>发布记录</button>
        <button class="cf-secondary-action" type="button" disabled>数据反馈</button>
      </footer>
    </aside>

    <section v-if="visibleComposer && selectedNode" class="cf-growth-composer" aria-label="枝化生长输入框">
      <div v-if="resourcePopoverOpen" class="cf-resource-popover" aria-label="@资源提示">
        <button
          v-for="resource in filteredResourceOptions"
          :key="`${resource.kind}-${resource.id}`"
          class="cf-resource-row"
          type="button"
          @click="addResource(resource)"
        >
          <span class="cf-resource-icon">{{ resource.kind === 'gene' ? '因' : '养' }}</span>
          <span>
            <strong>{{ resource.label }}</strong>
            <em>{{ resource.description }}</em>
          </span>
          <kbd>@</kbd>
        </button>
        <p v-if="filteredResourceOptions.length === 0" class="cf-muted">暂无匹配资源</p>
      </div>

      <div class="cf-growth-top">
        <div class="cf-growth-pill is-source">
          <span>生长源</span>
          <strong>{{ selectedNode.summary }}</strong>
        </div>
        <div class="cf-growth-menu-wrap">
          <button class="cf-growth-pill cf-growth-picker" type="button" @click="generatorMenuOpen = !generatorMenuOpen">
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
              {{ generator.name }}
            </button>
            <span v-if="!snapshot?.resources.generators.length" class="cf-pill-menu-empty">暂无生成器</span>
          </div>
        </div>
        <div class="cf-growth-menu-wrap">
          <button class="cf-growth-pill cf-growth-picker" type="button" @click="fruitCountMenuOpen = !fruitCountMenuOpen">
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
              {{ count }}
            </button>
          </div>
        </div>
        <div class="cf-growth-pill">
          <span>突变</span>
          <strong>{{ mutationRate }}%</strong>
        </div>
      </div>

      <label class="cf-growth-input">
        <span v-if="referencedResources.length > 0" class="cf-inline-refs">
          <span
            v-for="resource in referencedResources"
            :key="`inline-${resource.kind}-${resource.id}`"
            class="cf-mention"
            :class="`is-${resource.kind}`"
          >
            {{ resource.label }}
          </span>
        </span>
        <textarea
          v-model="growthIntent"
          aria-label="枝化生长意图"
          placeholder="输入本次枝化生长的想法，或使用 @ 引用营养库和基因库..."
          @click="updateResourcePopover"
          @keyup="updateResourcePopover"
          @input="updateResourcePopover"
        />
      </label>

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
        <div class="cf-growth-detail-row"><span>突变概率</span><strong>{{ mutationRate }}%</strong></div>
        <div class="cf-growth-detail-row"><span>引用资源</span><strong>{{ referencedResources.length }}</strong></div>
        <div class="cf-growth-detail-refs">
          <span
            v-for="resource in growthDetailResources"
            :key="`${resource.kind}-${resource.id}`"
            class="cf-ref-chip"
            :class="`is-${resource.kind}`"
          >
            {{ resource.kindLabel }} · {{ resource.label.replace(/^.* · /, '') }}
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
  gap: 10px;
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

.cf-workspace-topbar .cf-workspace-tool,
.cf-workspace-topbar .cf-secondary-action {
  position: relative;
  overflow: hidden;
  min-height: 38px;
  padding: 0 14px;
  border-color: rgba(255, 255, 255, .12);
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .075), rgba(255, 255, 255, .035)),
    rgba(10, 13, 15, .7);
  color: #cbd7d5;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08);
  transition:
    transform .22s ease,
    border-color .22s ease,
    background .22s ease,
    box-shadow .22s ease,
    color .22s ease;
}

.cf-workspace-topbar .cf-workspace-tool::before,
.cf-workspace-topbar .cf-secondary-action::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 0%, rgba(94, 215, 197, .2) 42%, transparent 72%);
  opacity: 0;
  transform: translateX(-80%);
  transition: opacity .22s ease, transform .42s ease;
}

.cf-workspace-topbar .cf-workspace-tool:hover,
.cf-workspace-topbar .cf-secondary-action:hover {
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

.cf-workspace-topbar .cf-workspace-tool:hover::before,
.cf-workspace-topbar .cf-secondary-action:hover::before {
  opacity: 1;
  transform: translateX(90%);
}

.cf-workspace-topbar .cf-workspace-tool:active,
.cf-workspace-topbar .cf-secondary-action:active {
  transform: translateY(0) scale(.98);
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

.cf-growth-ribbon {
  position: absolute;
  z-index: 14;
  left: 22px;
  bottom: 22px;
  width: 244px;
  padding: 12px;
  border: 1px solid var(--cf-border-soft);
  border-radius: 8px;
  background: rgba(10, 13, 15, .72);
  backdrop-filter: blur(20px);
}

.cf-growth-ribbon strong {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
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

.cf-tree-node {
  position: absolute;
  z-index: 5;
  width: 184px;
  min-height: 92px;
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--cf-border);
  border-radius: 8px;
  background: var(--cf-panel-strong);
  color: var(--cf-text);
  text-align: left;
  cursor: grab;
  box-shadow: 0 20px 58px rgba(0, 0, 0, .26);
  isolation: isolate;
  transition: border-color .2s ease, background .2s ease, box-shadow .2s ease, opacity .2s ease;
}

.cf-tree-node > * {
  position: relative;
  z-index: 2;
}

.cf-tree-node::before,
.cf-tree-node::after {
  content: "";
  position: absolute;
  pointer-events: none;
}

.cf-tree-node.is-seed {
  width: 220px;
  min-height: 104px;
  border-color: rgba(94, 215, 197, .35);
  background: linear-gradient(180deg, rgba(94, 215, 197, .13), rgba(18, 24, 26, .96));
}

.cf-tree-node.is-selected {
  border-color: rgba(157, 228, 155, .42);
}

.cf-tree-node.is-eliminated {
  opacity: .58;
}

.cf-tree-node.is-growing {
  animation: cf-pulse 1.2s ease-in-out infinite;
}

.cf-tree-node.is-growth-placeholder {
  overflow: hidden;
  border-color: rgba(240, 195, 107, .62);
  background:
    linear-gradient(125deg, rgba(240, 195, 107, .15), transparent 42%),
    linear-gradient(180deg, rgba(24, 29, 30, .98), rgba(13, 18, 18, .94));
  box-shadow:
    0 0 0 1px rgba(240, 195, 107, .16),
    0 0 34px rgba(240, 195, 107, .16),
    0 24px 70px rgba(0, 0, 0, .36);
  animation: cf-growth-breathe 1.4s ease-in-out infinite;
}

.cf-tree-node.is-growth-placeholder::before {
  inset: -1px;
  z-index: 0;
  background:
    linear-gradient(90deg, transparent, rgba(240, 195, 107, .18), transparent),
    repeating-linear-gradient(90deg, transparent 0 13px, rgba(94, 215, 197, .08) 13px 14px),
    repeating-linear-gradient(0deg, transparent 0 11px, rgba(240, 195, 107, .07) 11px 12px);
  transform: translateX(-66%);
  animation: cf-growth-grid-scan 1.8s ease-in-out infinite;
}

.cf-tree-node.is-growth-placeholder::after {
  inset: -7px;
  z-index: -1;
  border: 1px solid rgba(240, 195, 107, .35);
  border-radius: 12px;
  box-shadow:
    0 0 0 1px rgba(94, 215, 197, .08),
    0 0 26px rgba(240, 195, 107, .18);
  animation: cf-growth-shell 1.55s ease-in-out infinite;
}

.cf-tree-node.is-growth-placeholder .cf-node-dot {
  background: #f0c36b;
  animation: cf-dot-breathe .95s ease-in-out infinite;
}

.cf-tree-node.is-growth-placeholder .cf-node-title {
  color: #fff4d2;
  text-shadow: 0 0 18px rgba(240, 195, 107, .18);
}

.cf-tree-node.is-growth-placeholder .cf-node-tags {
  justify-content: flex-start;
}

.cf-tree-node.is-growth-placeholder .cf-node-tag {
  max-width: none;
  border-color: rgba(240, 195, 107, .22);
  background: rgba(240, 195, 107, .07);
  color: #ffe0b2;
}

.cf-tree-node.is-failed {
  border-color: rgba(240, 195, 107, .48);
}

.cf-tree-node.is-active {
  box-shadow: 0 0 0 2px rgba(94, 215, 197, .28), 0 22px 62px rgba(0, 0, 0, .32);
}

.cf-node-head,
.cf-node-tags {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
}

.cf-node-head {
  color: var(--cf-muted);
  font-size: 10px;
  font-weight: 800;
}

.cf-node-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cf-growth);
}

.cf-node-title {
  min-height: 36px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
}

.cf-tree-node {
  min-height: 132px;
  gap: 10px;
  padding: 12px 13px;
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, .06), transparent 34%),
    linear-gradient(180deg, rgba(24, 29, 31, .97), rgba(11, 15, 17, .96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .08),
    0 24px 68px rgba(0, 0, 0, .32);
  transform-origin: center;
  transition:
    transform .22s ease,
    border-color .22s ease,
    background .22s ease,
    box-shadow .22s ease,
    opacity .22s ease,
    filter .22s ease;
}

.cf-tree-node:hover {
  transform: translateY(-3px);
}

.cf-tree-node.is-seed {
  width: 236px;
  min-height: 142px;
  border-radius: 18px;
  border-color: rgba(94, 215, 197, .46);
  background:
    radial-gradient(circle at 22% 18%, rgba(94, 215, 197, .28), transparent 30%),
    linear-gradient(135deg, rgba(94, 215, 197, .18), rgba(157, 228, 155, .05) 44%, rgba(11, 15, 17, .98)),
    rgba(13, 18, 19, .98);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .1),
    0 0 0 1px rgba(94, 215, 197, .08),
    0 26px 76px rgba(0, 0, 0, .36),
    0 0 38px rgba(94, 215, 197, .1);
}

.cf-tree-node.is-seed::before {
  inset: auto 16px 12px 16px;
  height: 26px;
  z-index: 0;
  border-bottom: 1px solid rgba(94, 215, 197, .28);
  border-radius: 0 0 999px 999px;
  background:
    linear-gradient(90deg, transparent, rgba(94, 215, 197, .18), transparent),
    repeating-linear-gradient(90deg, transparent 0 23px, rgba(157, 228, 155, .12) 23px 24px);
  opacity: .86;
}

.cf-tree-node.is-seed::after {
  right: 12px;
  bottom: 12px;
  width: 50px;
  height: 50px;
  z-index: 0;
  border: 1px solid rgba(94, 215, 197, .14);
  border-radius: 50%;
  background: radial-gradient(circle, transparent 42%, rgba(94, 215, 197, .11) 43%, transparent 58%);
}

.cf-tree-node.is-fruit {
  width: 198px;
  min-height: 136px;
  border-radius: 16px 16px 22px 22px;
}

.cf-tree-node.is-fruit::before {
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, .08), transparent 30%),
    radial-gradient(circle at 82% 16%, rgba(255, 255, 255, .08), transparent 23%);
  opacity: .72;
}

.cf-tree-node.is-candidate {
  border-color: rgba(240, 195, 107, .34);
  background:
    radial-gradient(circle at 24% 18%, rgba(240, 195, 107, .18), transparent 31%),
    linear-gradient(160deg, rgba(240, 195, 107, .09), rgba(94, 215, 197, .04) 46%, rgba(14, 17, 20, .98));
}

.cf-tree-node.is-selected {
  border-color: rgba(157, 228, 155, .58);
  background:
    radial-gradient(circle at 25% 17%, rgba(157, 228, 155, .32), transparent 30%),
    linear-gradient(155deg, rgba(157, 228, 155, .18), rgba(94, 215, 197, .08) 44%, rgba(10, 15, 13, .98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .12),
    0 0 0 1px rgba(157, 228, 155, .12),
    0 24px 76px rgba(0, 0, 0, .35),
    0 0 42px rgba(157, 228, 155, .16);
}

.cf-tree-node.is-eliminated {
  border-color: rgba(150, 154, 150, .2);
  background:
    repeating-linear-gradient(135deg, rgba(255, 255, 255, .035) 0 1px, transparent 1px 11px),
    linear-gradient(160deg, rgba(78, 84, 82, .18), rgba(12, 14, 15, .96));
  filter: saturate(.3);
  opacity: .66;
}

.cf-tree-node.is-eliminated::after {
  left: 14px;
  right: 14px;
  top: 50%;
  z-index: 3;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(220, 225, 222, .42), transparent);
  transform: rotate(-8deg);
}

.cf-tree-node.is-growing:not(.is-growth-placeholder) {
  border-color: rgba(94, 215, 197, .64);
  background:
    linear-gradient(90deg, rgba(94, 215, 197, .14), transparent 34%, rgba(240, 195, 107, .1)),
    linear-gradient(180deg, rgba(21, 27, 28, .98), rgba(8, 13, 14, .98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .12),
    0 0 0 1px rgba(94, 215, 197, .16),
    0 0 48px rgba(94, 215, 197, .18),
    0 24px 76px rgba(0, 0, 0, .38);
}

.cf-tree-node.is-growing:not(.is-growth-placeholder)::before {
  inset: -1px;
  z-index: 0;
  border-radius: inherit;
  background:
    linear-gradient(90deg, transparent, rgba(94, 215, 197, .18), transparent),
    repeating-linear-gradient(90deg, transparent 0 16px, rgba(94, 215, 197, .08) 16px 17px);
  transform: translateX(-70%);
  animation: cf-growth-grid-scan 1.65s ease-in-out infinite;
}

.cf-node-identity {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 10px;
  align-items: center;
  min-height: 42px;
}

.cf-node-orb {
  position: relative;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: 50%;
  background:
    radial-gradient(circle at 36% 32%, rgba(255, 255, 255, .35), transparent 17%),
    radial-gradient(circle, rgba(94, 215, 197, .18), rgba(8, 12, 13, .88) 70%);
  box-shadow: inset 0 0 18px rgba(255, 255, 255, .05), 0 0 24px rgba(94, 215, 197, .12);
}

.cf-orb-core,
.cf-orb-vein {
  position: absolute;
  pointer-events: none;
}

.cf-orb-core {
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(94, 215, 197, .72);
  box-shadow: 0 0 18px rgba(94, 215, 197, .55);
  transform: translate(-50%, -50%);
}

.cf-orb-vein {
  left: 8px;
  right: 8px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .42), transparent);
  transform-origin: center;
}

.cf-orb-vein.is-a {
  top: 16px;
  transform: rotate(32deg);
}

.cf-orb-vein.is-b {
  bottom: 15px;
  transform: rotate(-34deg);
}

.cf-node-signature {
  display: grid;
  gap: 5px;
  align-content: center;
}

.cf-node-signature span {
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(94, 215, 197, .42), transparent);
}

.cf-node-signature span:nth-child(2) {
  width: 72%;
  background: linear-gradient(90deg, rgba(255, 255, 255, .2), transparent);
}

.cf-node-signature span:nth-child(3) {
  width: 46%;
  background: linear-gradient(90deg, rgba(240, 195, 107, .32), transparent);
}

.cf-tree-node.is-seed .cf-node-orb {
  border-radius: 48% 52% 46% 54%;
  background:
    radial-gradient(circle at 33% 28%, rgba(255, 255, 255, .38), transparent 16%),
    radial-gradient(ellipse at center, rgba(94, 215, 197, .36), rgba(19, 43, 39, .92) 66%);
  box-shadow: inset 0 -8px 18px rgba(0, 0, 0, .22), 0 0 30px rgba(94, 215, 197, .2);
  transform: rotate(-12deg);
}

.cf-tree-node.is-candidate .cf-node-orb {
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 246, 213, .38), transparent 17%),
    radial-gradient(circle, rgba(240, 195, 107, .34), rgba(38, 27, 13, .92) 69%);
}

.cf-tree-node.is-candidate .cf-orb-core {
  background: rgba(240, 195, 107, .74);
  box-shadow: 0 0 18px rgba(240, 195, 107, .48);
}

.cf-tree-node.is-selected .cf-node-orb {
  border-color: rgba(157, 228, 155, .34);
  background:
    radial-gradient(circle at 34% 28%, rgba(255, 255, 255, .46), transparent 17%),
    radial-gradient(circle, rgba(157, 228, 155, .42), rgba(13, 38, 19, .94) 69%);
  box-shadow: inset 0 -8px 18px rgba(0, 0, 0, .18), 0 0 32px rgba(157, 228, 155, .26);
}

.cf-tree-node.is-selected .cf-orb-core {
  background: rgba(157, 228, 155, .9);
  box-shadow: 0 0 22px rgba(157, 228, 155, .62);
}

.cf-tree-node.is-eliminated .cf-node-orb {
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, .12), transparent 18%),
    radial-gradient(circle, rgba(132, 137, 134, .22), rgba(17, 18, 18, .95) 69%);
  box-shadow: inset 0 -8px 18px rgba(0, 0, 0, .38);
}

.cf-tree-node.is-eliminated .cf-orb-core {
  background: rgba(145, 149, 146, .42);
  box-shadow: none;
}

.cf-tree-node.is-growing .cf-node-orb {
  animation: cf-orb-growing 1.15s ease-in-out infinite;
}

.cf-tree-node.is-growth-placeholder {
  border-color: rgba(240, 195, 107, .72);
  background:
    linear-gradient(125deg, rgba(240, 195, 107, .2), transparent 42%),
    linear-gradient(180deg, rgba(24, 29, 30, .98), rgba(13, 18, 18, .94));
  box-shadow:
    0 0 0 1px rgba(240, 195, 107, .18),
    0 0 42px rgba(240, 195, 107, .18),
    0 24px 70px rgba(0, 0, 0, .36);
}

.cf-tree-node.is-growth-placeholder .cf-node-orb {
  border-color: rgba(240, 195, 107, .34);
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 246, 213, .42), transparent 17%),
    radial-gradient(circle, rgba(240, 195, 107, .38), rgba(38, 27, 13, .94) 69%);
}

.cf-tree-node.is-growth-placeholder .cf-node-signature span {
  background: linear-gradient(90deg, rgba(240, 195, 107, .52), transparent);
}

.cf-tree-node.is-active {
  border-color: rgba(94, 215, 197, .7);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .12),
    0 0 0 2px rgba(94, 215, 197, .3),
    0 24px 82px rgba(0, 0, 0, .4),
    0 0 48px rgba(94, 215, 197, .16);
}

.cf-growth-vessel {
  position: relative;
  height: 24px;
  overflow: hidden;
  border: 1px solid rgba(240, 195, 107, .18);
  border-radius: 7px;
  background:
    linear-gradient(90deg, rgba(94, 215, 197, .08), transparent 35%, rgba(240, 195, 107, .1)),
    rgba(255, 255, 255, .025);
}

.cf-vessel-thread {
  position: absolute;
  left: 10px;
  right: 10px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(240, 195, 107, .72), rgba(94, 215, 197, .55), transparent);
  transform-origin: left center;
}

.cf-vessel-thread.is-a {
  top: 8px;
  animation: cf-thread-grow 1.2s ease-in-out infinite;
}

.cf-vessel-thread.is-b {
  top: 15px;
  animation: cf-thread-grow 1.2s .18s ease-in-out infinite reverse;
}

.cf-vessel-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7px;
  height: 7px;
  border: 1px solid rgba(255, 244, 210, .8);
  border-radius: 50%;
  background: rgba(240, 195, 107, .36);
  box-shadow: 0 0 16px rgba(240, 195, 107, .5);
  transform: translate(-50%, -50%);
  animation: cf-core-seed 1s ease-in-out infinite;
}

.cf-vessel-scan {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .18), transparent);
  transform: translateX(-120%);
  animation: cf-vessel-scan 1.5s ease-in-out infinite;
}

.cf-node-tag {
  overflow: hidden;
  max-width: 84px;
  padding: 4px 6px;
  border: 1px solid var(--cf-border-soft);
  border-radius: 6px;
  color: var(--cf-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Liquid Frost node cards, selected from the preview exploration. */
.cf-tree-node {
  --node-accent: #f5b84e;
  --node-rgb: 245, 184, 78;
  width: 208px;
  min-height: 150px;
  gap: 11px;
  padding: 15px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 24px;
  background:
    radial-gradient(circle at 24% 16%, rgba(255, 255, 255, .26), transparent 18%),
    radial-gradient(circle at 88% 88%, rgba(var(--node-rgb), .22), transparent 35%),
    linear-gradient(145deg, rgba(255, 255, 255, .12), rgba(255, 255, 255, .035) 43%, rgba(255, 255, 255, .015)),
    rgba(18, 22, 24, .72);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .2),
    inset 0 -20px 36px rgba(0, 0, 0, .16),
    0 26px 74px rgba(0, 0, 0, .36);
  backdrop-filter: blur(22px) saturate(1.45);
  transform: translateZ(0);
  transition:
    transform .22s ease,
    border-color .22s ease,
    background .22s ease,
    box-shadow .22s ease,
    opacity .22s ease,
    filter .22s ease;
}

.cf-tree-node:hover {
  border-color: rgba(255, 255, 255, .28);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .24),
    inset 0 -20px 36px rgba(0, 0, 0, .14),
    0 30px 86px rgba(0, 0, 0, .42),
    0 0 0 1px rgba(var(--node-rgb), .1);
  transform: translateY(-4px) scale(1.01);
}

.cf-tree-node::before {
  inset: 10px;
  z-index: 0;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 18px;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, .16), transparent 36%),
    linear-gradient(315deg, rgba(var(--node-rgb), .1), transparent 42%);
  opacity: .82;
}

.cf-tree-node::after {
  content: "";
  left: 18px;
  right: 18px;
  bottom: 12px;
  z-index: 1;
  height: 4px;
  border-radius: 999px;
  background:
    linear-gradient(90deg, transparent, rgba(var(--node-rgb), .86), transparent),
    rgba(255, 255, 255, .08);
  box-shadow: 0 0 18px rgba(var(--node-rgb), .28);
}

.cf-tree-node > * {
  position: relative;
  z-index: 2;
}

.cf-tree-node.is-seed {
  --node-accent: #5ed7c5;
  --node-rgb: 94, 215, 197;
  width: 232px;
  min-height: 156px;
  border-radius: 28px;
}

.cf-tree-node.is-candidate {
  --node-accent: #f0c36b;
  --node-rgb: 240, 195, 107;
}

.cf-tree-node.is-selected {
  --node-accent: #9de49b;
  --node-rgb: 157, 228, 155;
  border-color: rgba(157, 228, 155, .28);
}

.cf-tree-node.is-eliminated {
  --node-accent: #8f9896;
  --node-rgb: 143, 152, 150;
  border-color: rgba(255, 255, 255, .1);
  filter: saturate(.52) contrast(.92);
  opacity: .62;
}

.cf-tree-node.is-eliminated::after {
  top: 50%;
  bottom: auto;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(221, 226, 224, .34), transparent);
  box-shadow: none;
  transform: rotate(-5deg);
}

.cf-tree-node.is-growing:not(.is-growth-placeholder),
.cf-tree-node.is-growth-placeholder {
  --node-accent: #7fcfff;
  --node-rgb: 127, 207, 255;
  border-color: rgba(127, 207, 255, .32);
  animation: cf-liquid-node-breathe 1.9s ease-in-out infinite;
}

.cf-tree-node.is-growth-placeholder::before {
  inset: 10px;
  width: auto;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 18px;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, .16), transparent 36%),
    linear-gradient(315deg, rgba(var(--node-rgb), .1), transparent 42%);
  opacity: .82;
  transform: none;
  animation: none;
}

.cf-tree-node.is-growth-placeholder::after {
  content: "";
  inset: auto 18px 12px;
  height: 4px;
  border: 0;
  border-radius: 999px;
  background:
    linear-gradient(90deg, transparent, rgba(var(--node-rgb), .86), transparent),
    rgba(255, 255, 255, .08);
  box-shadow: 0 0 18px rgba(var(--node-rgb), .28);
  transform: none;
  animation: none;
}

.cf-tree-node.is-active {
  border-color: rgba(var(--node-rgb), .55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .26),
    inset 0 -20px 36px rgba(0, 0, 0, .12),
    0 0 0 2px rgba(var(--node-rgb), .18),
    0 32px 88px rgba(0, 0, 0, .44);
}

.cf-node-head {
  color: rgba(241, 248, 245, .66);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: .08em;
}

.cf-node-dot {
  width: 8px;
  height: 8px;
  background: var(--node-accent);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, .65),
    0 0 16px rgba(var(--node-rgb), .38);
}

.cf-node-identity {
  grid-template-columns: 38px 1fr;
  gap: 12px;
  min-height: 38px;
}

.cf-node-orb {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 14px;
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, .45), transparent 18%),
    radial-gradient(circle at 78% 82%, rgba(var(--node-rgb), .34), transparent 36%),
    rgba(255, 255, 255, .07);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .2),
    inset 0 -8px 14px rgba(0, 0, 0, .12);
}

.cf-tree-node.is-seed .cf-node-orb {
  border-radius: 50% 45% 53% 47%;
  transform: rotate(-10deg);
}

.cf-orb-core {
  width: 8px;
  height: 8px;
  background: var(--node-accent);
  box-shadow: 0 0 14px rgba(var(--node-rgb), .42);
}

.cf-orb-vein {
  opacity: .2;
}

.cf-node-signature {
  gap: 5px;
}

.cf-node-signature span {
  height: 2px;
  background: linear-gradient(90deg, rgba(var(--node-rgb), .48), transparent);
}

.cf-node-signature span:nth-child(2) {
  width: 68%;
}

.cf-node-signature span:nth-child(3) {
  width: 42%;
}

.cf-node-title {
  min-height: 38px;
  color: rgba(250, 253, 251, .95);
  font-size: 13px;
  font-weight: 780;
  line-height: 1.4;
}

.cf-node-tags {
  justify-content: flex-start;
}

.cf-node-tag {
  max-width: 92px;
  min-height: 23px;
  display: inline-flex;
  align-items: center;
  border-color: rgba(255, 255, 255, .14);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .1), rgba(255, 255, 255, .035)),
    rgba(var(--node-rgb), .07);
  color: color-mix(in srgb, var(--node-accent) 55%, #f0f7f4);
  font-size: 10px;
}

.cf-tree-node.is-growth-placeholder .cf-node-title {
  color: rgba(250, 253, 251, .95);
  text-shadow: none;
}

.cf-tree-node.is-growth-placeholder .cf-node-tags {
  justify-content: flex-start;
}

.cf-tree-node.is-growth-placeholder .cf-node-tag {
  max-width: 92px;
  border-color: rgba(255, 255, 255, .14);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .1), rgba(255, 255, 255, .035)),
    rgba(var(--node-rgb), .07);
  color: color-mix(in srgb, var(--node-accent) 55%, #f0f7f4);
}

.cf-tree-node.is-eliminated .cf-node-title,
.cf-tree-node.is-eliminated .cf-node-tag,
.cf-tree-node.is-eliminated .cf-node-head {
  color: rgba(222, 228, 226, .52);
}

.cf-growth-vessel {
  height: 18px;
  border-color: rgba(127, 207, 255, .18);
  border-radius: 999px;
  background: rgba(127, 207, 255, .06);
}

.cf-vessel-thread {
  background: linear-gradient(90deg, transparent, rgba(127, 207, 255, .5), transparent);
}

.cf-vessel-core {
  width: 5px;
  height: 5px;
  border-color: rgba(127, 207, 255, .42);
  background: rgba(127, 207, 255, .38);
  box-shadow: 0 0 10px rgba(127, 207, 255, .3);
}

.cf-vessel-scan {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .13), transparent);
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

.cf-node-detail-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid var(--cf-border-soft);
}

.cf-growth-composer {
  position: absolute;
  z-index: 25;
  left: 50%;
  bottom: 18px;
  width: min(920px, calc(100vw - 556px));
  min-width: 620px;
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: 18px;
  background: rgba(35, 36, 37, .96);
  box-shadow: 0 30px 100px rgba(0, 0, 0, .55);
  transform: translateX(calc(-50% - 190px));
  backdrop-filter: blur(30px);
}

.cf-growth-top {
  padding: 10px 12px 0;
}

.cf-growth-pill {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0 10px;
  border: 1px solid var(--cf-border);
  border-radius: 14px;
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
  border-color: rgba(94, 215, 197, .28);
  background: rgba(94, 215, 197, .07);
}

.cf-picker-caret {
  color: var(--cf-muted);
  font-size: 13px;
}

.cf-pill-menu {
  position: absolute;
  z-index: 35;
  top: calc(100% + 8px);
  left: 0;
  width: 236px;
  display: grid;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  background: rgba(18, 21, 24, .98);
  box-shadow: 0 18px 60px rgba(0, 0, 0, .36);
}

.cf-pill-menu.is-compact {
  width: 84px;
}

.cf-pill-menu-item,
.cf-pill-menu-empty {
  min-height: 30px;
  display: flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 7px;
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

.cf-growth-input {
  position: relative;
  display: grid;
  gap: 8px;
  min-height: 76px;
  margin: 8px 12px 6px;
  padding: 10px 0;
  color: var(--cf-text);
  font-size: 14px;
  line-height: 1.45;
}

.cf-growth-input textarea {
  width: 100%;
  min-height: 76px;
  padding: 10px 0;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: var(--cf-text);
  caret-color: var(--cf-text);
  line-height: 1.45;
}

.cf-growth-input textarea::placeholder {
  color: var(--cf-muted);
}

.cf-inline-refs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cf-mention {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 6px;
  border: 1px solid rgba(94, 215, 197, .24);
  border-radius: 6px;
  background: rgba(94, 215, 197, .12);
  color: #bffff3;
  font-weight: 700;
}

.cf-mention.is-nutrient {
  border-color: rgba(240, 195, 107, .24);
  background: rgba(240, 195, 107, .1);
  color: #ffe0b2;
}

.cf-growth-footer {
  justify-content: space-between;
  padding: 4px 12px 12px;
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
  border-radius: 50%;
  cursor: pointer;
}

.cf-round-tool {
  background: transparent;
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
  padding: 6px 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-ref-chip.is-nutrient {
  border-color: rgba(240, 195, 107, .24);
  background: rgba(240, 195, 107, .08);
  color: #ffe0b2;
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
  bottom: 166px;
  width: 350px;
  display: grid;
  gap: 5px;
  padding: 8px;
  border-radius: 8px;
}

.cf-resource-row {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  gap: 10px;
  align-items: center;
  min-height: 46px;
  padding: 7px;
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

.cf-resource-row strong,
.cf-resource-row em {
  display: block;
}

.cf-resource-row strong {
  font-size: 12px;
}

.cf-resource-row em {
  margin-top: 3px;
  color: var(--cf-muted);
  font-size: 11px;
  font-style: normal;
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

.cf-inline-error {
  margin: 8px 0;
  color: #ffd7c9;
  font-size: 12px;
}

@keyframes cf-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(94, 215, 197, .12), 0 20px 58px rgba(0, 0, 0, .26);
  }

  50% {
    box-shadow: 0 0 0 6px rgba(94, 215, 197, .08), 0 20px 58px rgba(0, 0, 0, .26);
  }
}

@keyframes cf-growth-breathe {
  0%,
  100% {
    transform: translateY(0) scale(1);
    filter: saturate(1);
  }

  50% {
    transform: translateY(-3px) scale(1.018);
    filter: saturate(1.22);
  }
}

@keyframes cf-growth-grid-scan {
  0% {
    opacity: .26;
    transform: translateX(-68%);
  }

  45% {
    opacity: .72;
  }

  100% {
    opacity: .18;
    transform: translateX(68%);
  }
}

@keyframes cf-growth-shell {
  0%,
  100% {
    opacity: .22;
    transform: scale(.98);
  }

  50% {
    opacity: .74;
    transform: scale(1.05);
  }
}

@keyframes cf-branch-flow {
  to {
    stroke-dashoffset: -22;
  }
}

@keyframes cf-dot-breathe {
  0%,
  100% {
    box-shadow: 0 0 0 4px rgba(240, 195, 107, .08);
  }

  50% {
    box-shadow: 0 0 0 10px rgba(240, 195, 107, .18);
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

@keyframes cf-orb-growing {
  0%,
  100% {
    box-shadow: inset 0 0 18px rgba(255, 255, 255, .05), 0 0 18px rgba(94, 215, 197, .16);
    transform: scale(1);
  }

  50% {
    box-shadow: inset 0 0 24px rgba(255, 255, 255, .08), 0 0 34px rgba(94, 215, 197, .34);
    transform: scale(1.08);
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

@keyframes cf-liquid-node-breathe {
  0%,
  100% {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .2),
      inset 0 -20px 36px rgba(0, 0, 0, .16),
      0 26px 74px rgba(0, 0, 0, .36),
      0 0 0 1px rgba(var(--node-rgb), .06);
  }

  50% {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .24),
      inset 0 -20px 36px rgba(0, 0, 0, .14),
      0 30px 82px rgba(0, 0, 0, .4),
      0 0 0 1px rgba(var(--node-rgb), .16);
  }
}

@media (max-width: 1180px) {
  .cf-node-detail {
    width: 360px;
  }

  .cf-workspace-topbar {
    right: 382px;
  }

  .cf-growth-composer {
    min-width: 500px;
    width: calc(100vw - 470px);
    transform: translateX(calc(-50% - 170px));
  }

  .cf-growth-top {
    flex-wrap: wrap;
  }
}
</style>
