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
  seed: { width: 238, height: 172 },
  fruit: { width: 224, height: 156 },
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
const hideEliminatedNodes = ref(false)
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
const growthTaskFruitCounts = new Map<string, number>()

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

  const shouldFitAfterLoad = nodes.value.length === 0
  workspaceLoading.value = true
  workspaceError.value = ''

  try {
    const nextSnapshot = await workspaceApi.getSeedWorkspace(seedId.value)
    snapshot.value = nextSnapshot
    nodes.value = layoutVisibleTreeNodes(mergeRunningPlaceholders(mapSnapshotNodes(nextSnapshot), nodes.value))

    const routeNodeId = typeof route.query.node === 'string' ? route.query.node : ''
    const nextSelectedId = preferredNodeId || routeNodeId || nextSnapshot.seed.rootNodeId || nodes.value[0]?.id || ''
    selectedNodeId.value = visibleNodes.value.some((node) => node.id === nextSelectedId)
      ? nextSelectedId
      : fallbackVisibleNodeId() || ''

    if (!selectedGeneratorId.value || !nextSnapshot.resources.generators.some((item) => item.id === selectedGeneratorId.value)) {
      selectedGeneratorId.value = nextSnapshot.resources.generators[0]?.id || ''
    }

    referencedResources.value = referencedResources.value.filter((resource) => resourceOptions.value.some((item) => item.id === resource.id && item.kind === resource.kind))
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
  if (node.status === 'growing') return '生长中'
  if (node.status === 'failed') return '最近失败'
  if (node.nodeType === 'seed') return isReadOnly.value ? '只读种子' : '根节点'
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

function addGrowthPlaceholders(source: TreeNode, count: number) {
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
  nodes.value = layoutVisibleTreeNodes([...nodes.value, ...placeholders])
}

function removeGrowthPlaceholders(sourceNodeId: string) {
  nodes.value = nodes.value.filter((node) => !(node.isPlaceholder && node.parentNodeRef?.nodeId === sourceNodeId))
}

function pollGrowthTask(task: GrowthTaskDetail) {
  stopGrowthPolling(task.id)
  growthTaskFruitCounts.set(task.id, task.successfulFruitIds.length)

  if (task.status !== 'running') {
    growthTaskFruitCounts.delete(task.id)
    removeGrowthPlaceholders(task.sourceNodeRef.nodeId)
    void loadWorkspace(task.sourceNodeRef.nodeId)
    return
  }

  const timer = setTimeout(async () => {
    pollTimers.delete(task.id)
    try {
      const nextTask = await growthApi.getGrowthTask(task.id)
      if (nextTask.status === 'running') {
        await syncGrowthTaskProgress(nextTask)
        pollGrowthTask(nextTask)
        return
      }

      growthTaskFruitCounts.delete(nextTask.id)
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
    growthTaskFruitCounts.set(result.task.id, result.task.successfulFruitIds.length)
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
      <div class="cf-header-tree-status" :class="{ 'is-growing': isTreeGrowing }">
        <strong>
          <span>{{ treeStatusTitle }}</span>
          <span>{{ treeStatusValue }}</span>
        </strong>
        <div class="cf-growth-meter"><span /></div>
      </div>
      <div class="cf-workspace-actions">
        <NuxtLink class="cf-secondary-action" to="/seeds">返回种子库</NuxtLink>
        <button class="cf-workspace-tool" type="button" @click="toggleEliminatedNodesVisibility">
          {{ hideEliminatedNodes ? '显示淘汰节点' : '隐藏淘汰节点' }}
        </button>
        <button class="cf-workspace-tool" type="button" @click="resetView">整理树形</button>
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

/* Botanical specimen nodes: sealed seed core and fruit specimen plates. */
.cf-tree-node {
  --node-accent: #d8b46a;
  --node-rgb: 216, 180, 106;
  --node-ink: rgba(244, 249, 245, .94);
  --node-muted: rgba(218, 228, 222, .6);
  position: absolute;
  z-index: 5;
  width: 224px;
  height: 156px;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto 38px minmax(36px, 1fr) auto;
  gap: 9px;
  padding: 13px 14px 12px;
  overflow: hidden;
  color: var(--node-ink);
  text-align: left;
  appearance: none;
  cursor: grab;
  border: 1px solid rgba(255, 255, 255, .13);
  border-radius: 18px 18px 12px 12px;
  background:
    radial-gradient(circle at 16% 0%, rgba(255, 255, 255, .18), transparent 24%),
    radial-gradient(circle at 92% 12%, rgba(var(--node-rgb), .14), transparent 27%),
    linear-gradient(180deg, rgba(30, 37, 36, .94), rgba(14, 18, 18, .96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .12),
    inset 0 -18px 32px rgba(0, 0, 0, .14),
    0 18px 44px rgba(0, 0, 0, .28);
  backdrop-filter: blur(10px) saturate(1.08);
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
  border-color: rgba(var(--node-rgb), .44);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .14),
    inset 0 -18px 32px rgba(0, 0, 0, .12),
    0 22px 56px rgba(0, 0, 0, .34),
    0 0 0 1px rgba(var(--node-rgb), .08);
  transform: translateY(-3px);
}

.cf-tree-node::before {
  inset: 8px;
  z-index: 0;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: inherit;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, .08), transparent 34%),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, .035) 0 1px, transparent 1px 34px);
  opacity: .75;
}

.cf-tree-node::after {
  content: "";
  left: 16px;
  right: 16px;
  bottom: 10px;
  top: auto;
  z-index: 1;
  height: 3px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(var(--node-rgb), .82), transparent);
  box-shadow: 0 0 18px rgba(var(--node-rgb), .22);
  transform: none;
  animation: none;
}

.cf-tree-node.is-seed {
  --node-accent: #80dfce;
  --node-rgb: 128, 223, 206;
  width: 238px;
  height: 172px;
  padding: 14px 16px 14px;
  border-radius: 34px 28px 36px 26px;
  border-color: rgba(128, 223, 206, .28);
  background:
    radial-gradient(ellipse at 30% 10%, rgba(255, 255, 255, .18), transparent 26%),
    radial-gradient(circle at 76% 72%, rgba(128, 223, 206, .18), transparent 34%),
    linear-gradient(155deg, rgba(24, 48, 45, .98), rgba(11, 18, 18, .96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .16),
    inset 0 -22px 42px rgba(0, 0, 0, .16),
    0 20px 54px rgba(0, 0, 0, .3),
    0 0 36px rgba(128, 223, 206, .08);
}

.cf-tree-node.is-fruit {
  width: 224px;
  height: 156px;
}

.cf-tree-node.is-candidate {
  --node-accent: #e1bc72;
  --node-rgb: 225, 188, 114;
}

.cf-tree-node.is-selected {
  --node-accent: #a7df9c;
  --node-rgb: 167, 223, 156;
  border-color: rgba(167, 223, 156, .38);
  background:
    radial-gradient(circle at 16% 0%, rgba(255, 255, 255, .18), transparent 24%),
    radial-gradient(circle at 88% 18%, rgba(167, 223, 156, .18), transparent 28%),
    linear-gradient(180deg, rgba(28, 43, 34, .96), rgba(12, 18, 14, .96));
}

.cf-tree-node.is-eliminated {
  --node-accent: #8e9694;
  --node-rgb: 142, 150, 148;
  --node-muted: rgba(199, 207, 204, .44);
  border-color: rgba(255, 255, 255, .08);
  background:
    repeating-linear-gradient(135deg, rgba(255, 255, 255, .035) 0 1px, transparent 1px 11px),
    linear-gradient(180deg, rgba(31, 35, 35, .92), rgba(14, 16, 16, .96));
  filter: saturate(.36) contrast(.92);
  opacity: .68;
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
  --node-accent: #83d9ff;
  --node-rgb: 131, 217, 255;
  border-color: rgba(131, 217, 255, .36);
  animation: cf-node-soft-pulse 1.65s ease-in-out infinite;
}

.cf-tree-node.is-active {
  border-color: rgba(var(--node-rgb), .58);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .16),
    inset 0 -18px 32px rgba(0, 0, 0, .12),
    0 0 0 2px rgba(var(--node-rgb), .18),
    0 24px 62px rgba(0, 0, 0, .36);
}

.cf-node-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  color: var(--node-muted);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .08em;
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

.cf-node-identity {
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 11px;
  align-items: center;
  min-height: 38px;
}

.cf-node-orb {
  position: relative;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, .15);
  border-radius: 14px 14px 10px 10px;
  background:
    radial-gradient(circle at 32% 24%, rgba(255, 255, 255, .36), transparent 18%),
    radial-gradient(circle at 72% 78%, rgba(var(--node-rgb), .24), transparent 38%),
    rgba(255, 255, 255, .055);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .14),
    inset 0 -9px 16px rgba(0, 0, 0, .16);
  transform: none;
}

.cf-tree-node.is-seed .cf-node-orb {
  width: 40px;
  height: 40px;
  border-radius: 52% 44% 55% 45%;
  background:
    radial-gradient(circle at 34% 24%, rgba(255, 255, 255, .42), transparent 18%),
    radial-gradient(ellipse at center, rgba(128, 223, 206, .28), rgba(12, 34, 32, .88) 70%);
  transform: rotate(-12deg);
}

.cf-orb-core,
.cf-orb-vein {
  position: absolute;
  pointer-events: none;
}

.cf-orb-core {
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--node-accent);
  box-shadow: 0 0 14px rgba(var(--node-rgb), .36);
  transform: translate(-50%, -50%);
}

.cf-orb-vein {
  left: 7px;
  right: 7px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .4), transparent);
  opacity: .18;
  transform-origin: center;
}

.cf-orb-vein.is-a {
  top: 11px;
  transform: rotate(32deg);
}

.cf-orb-vein.is-b {
  bottom: 11px;
  transform: rotate(-34deg);
}

.cf-node-signature {
  display: grid;
  gap: 5px;
  align-content: center;
}

.cf-node-signature span {
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(var(--node-rgb), .5), rgba(255, 255, 255, .08), transparent);
}

.cf-node-signature span:nth-child(2) {
  width: 66%;
  background: linear-gradient(90deg, rgba(255, 255, 255, .16), transparent);
}

.cf-node-signature span:nth-child(3) {
  width: 42%;
  background: linear-gradient(90deg, rgba(var(--node-rgb), .34), transparent);
}

.cf-node-title {
  min-height: 36px;
  overflow: hidden;
  display: -webkit-box;
  color: var(--node-ink);
  font-size: 13px;
  font-weight: 780;
  line-height: 1.42;
  text-shadow: none;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.cf-node-tags,
.cf-tree-node.is-growth-placeholder .cf-node-tags {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
}

.cf-node-tag,
.cf-tree-node.is-growth-placeholder .cf-node-tag {
  overflow: hidden;
  max-width: 100%;
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border: 1px solid rgba(var(--node-rgb), .24);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .07), rgba(255, 255, 255, .018)),
    rgba(var(--node-rgb), .08);
  color: color-mix(in srgb, var(--node-accent) 58%, #e5eee9);
  font-size: 10px;
  text-shadow: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-tree-node.is-eliminated .cf-node-title,
.cf-tree-node.is-eliminated .cf-node-tag,
.cf-tree-node.is-eliminated .cf-node-head {
  color: rgba(214, 220, 218, .5);
}

.cf-growth-vessel {
  position: relative;
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

@keyframes cf-branch-flow {
  to {
    stroke-dashoffset: -22;
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
