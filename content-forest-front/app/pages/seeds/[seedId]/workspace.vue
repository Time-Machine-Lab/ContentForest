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
  seed: { width: 220, height: 104 },
  fruit: { width: 184, height: 92 },
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
const growthDetailOpen = ref(false)
const growthIntent = ref('')
const referencedResources = ref<ResourceRef[]>([])
const selectedGeneratorId = ref('')
const fruitCount = ref(3)
const mutationRate = ref(18)

let pollTimer: ReturnType<typeof setTimeout> | null = null

const isReadOnly = computed(() => Boolean(snapshot.value?.workspaceReadOnly || route.query.readonly === '1'))
const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) ?? nodes.value[0] ?? null)
const canShowGrowthComposer = computed(() => selectedNode.value?.nodeType === 'fruit' && selectedNode.value.selectionState === 'selected')
const visibleComposer = computed(() => Boolean(canShowGrowthComposer.value && !isReadOnly.value && selectedNode.value?.status !== 'growing'))
const selectedCrumb = computed(() => selectedNode.value ? `工作区 / 内容树 / ${selectedNode.value.summary}` : '工作区 / 内容树')
const selectedGenerator = computed(() => snapshot.value?.resources.generators.find((item) => item.id === selectedGeneratorId.value) ?? null)
const generatorName = computed(() => selectedGenerator.value?.name ?? '未选择生成器')
const branchEdges = computed(() => snapshot.value?.edges.map((edge, index) => ({
  parentId: edge.parentNodeRef.nodeId,
  childId: edge.childNodeRef.nodeId,
  className: index === 0 ? 'is-primary' : index % 2 === 0 ? 'is-secondary' : 'is-weak',
})) ?? [])
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
const growthDetailResources = computed(() => referencedResources.value.map((resource) => ({
  ...resource,
  kindLabel: resource.kind === 'gene' ? '基因库' : '营养库',
})))

watch(seedId, () => {
  void loadWorkspace()
}, { immediate: true })

onBeforeUnmount(() => {
  stopPolling()
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
    nodes.value = layoutSnapshot(nextSnapshot, nodes.value)

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
  treeSize.width = Math.max(1180, widestLevel * 250 + 260)
  treeSize.height = Math.max(820, (maxDepth + 2) * 178)

  return nextSnapshot.nodes.map((node) => {
    const previousPosition = previousPositions.get(node.nodeId)
    const depth = depthByNode.get(node.nodeId) ?? 0
    const siblings = levels.get(depth) ?? [node]
    const index = siblings.findIndex((item) => item.nodeId === node.nodeId)
    const size = node.nodeType === 'seed' ? nodeSize.seed : nodeSize.fruit
    const gap = node.nodeType === 'seed' ? 250 : 244
    const levelWidth = (siblings.length - 1) * gap
    const x = treeSize.width / 2 - levelWidth / 2 + Math.max(0, index) * gap - size.width / 2
    const y = treeSize.height - 154 - depth * 172

    return mapWorkspaceNode(node, previousPosition ?? { x, y })
  })
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
  const mention = `@${resource.label}`
  if (!growthIntent.value.includes(mention)) growthIntent.value = `${growthIntent.value.trim()} ${mention}`.trim()
  resourcePopoverOpen.value = false
}

function highlightedIntentSegments() {
  const tokens = growthIntent.value.split(/(@[^\s@]+(?:\s·\s[^\s@]+)?|@[^\s@]+)/g).filter(Boolean)
  return tokens.map((token) => ({ text: token, mention: token.startsWith('@') }))
}

async function startGrowth() {
  const source = selectedNode.value
  if (!source || !visibleComposer.value || !selectedGeneratorId.value) return

  growthLoading.value = true
  growthError.value = ''
  growthDetailOpen.value = false

  try {
    const nutrientRefs = referencedResources.value
      .filter((resource) => resource.kind === 'nutrient')
      .map((resource) => ({ resourceType: 'nutrient' as const, resourceId: resource.id }))
    const geneRefs = referencedResources.value
      .filter((resource) => resource.kind === 'gene')
      .map((resource) => ({ resourceType: 'gene' as const, resourceId: resource.id }))
    const result = await growthApi.startGrowthTask({
      seedId: seedId.value,
      sourceNodeRef: { nodeType: source.nodeType, nodeId: source.id },
      userInput: growthIntent.value.trim(),
      generatorId: selectedGeneratorId.value,
      fruitCount: fruitCount.value,
      nutrientRefs,
      geneRefs,
      detailParams: { mutationRate: mutationRate.value / 100 },
    })

    source.status = 'growing'
    source.taskId = result.task.id
    pollGrowthTask(result.task)
  } catch (error) {
    growthError.value = errorMessage(error)
  } finally {
    growthLoading.value = false
  }
}

function pollGrowthTask(task: GrowthTaskDetail) {
  stopPolling()

  if (task.status !== 'running') {
    void loadWorkspace(task.sourceNodeRef.nodeId)
    return
  }

  pollTimer = setTimeout(async () => {
    try {
      const nextTask = await growthApi.getGrowthTask(task.id)
      if (nextTask.status === 'running') {
        pollGrowthTask(nextTask)
        return
      }

      if (nextTask.status === 'failed') growthError.value = nextTask.failureReason || '枝化生长失败，可恢复输入后重试'
      await loadWorkspace(nextTask.sourceNodeRef.nodeId)
    } catch (error) {
      growthError.value = errorMessage(error)
    }
  }, 1800)
}

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
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
        <span>{{ selectedCrumb }}</span>
      </div>
      <div class="cf-workspace-actions">
        <span class="cf-workspace-chip">{{ isReadOnly ? 'READ ONLY' : 'API LIVE' }}</span>
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
          <span class="cf-node-title">{{ node.title }}</span>
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
            种子作为内容树根节点展示，详情可查看；归档或只读工作区不允许发起新生长。
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
          v-for="resource in resourceOptions"
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
        <p v-if="resourceOptions.length === 0" class="cf-muted">暂无可引用资源</p>
      </div>

      <div class="cf-growth-top">
        <div class="cf-growth-pill is-source">
          <span>生长源</span>
          <strong>{{ selectedNode.summary }}</strong>
        </div>
        <div class="cf-growth-pill">
          <span>生成器</span>
          <strong>{{ generatorName }}</strong>
        </div>
        <div class="cf-growth-pill">
          <span>果实</span>
          <strong>{{ fruitCount }}</strong>
        </div>
        <div class="cf-growth-pill">
          <span>突变</span>
          <strong>{{ mutationRate }}%</strong>
        </div>
      </div>

      <label class="cf-growth-input">
        <span v-for="(segment, index) in highlightedIntentSegments()" :key="`${segment.text}-${index}`" :class="{ 'cf-mention': segment.mention }">
          {{ segment.text }}
        </span>
        <textarea
          v-model="growthIntent"
          aria-label="枝化生长意图"
          placeholder="输入本次枝化生长的想法，或使用 @ 引用营养库和基因库..."
          @focus="resourcePopoverOpen = true"
          @input="resourcePopoverOpen = growthIntent.includes('@')"
        />
      </label>

      <p v-if="growthError" class="cf-inline-error">{{ growthError }}</p>

      <div class="cf-growth-footer">
        <div class="cf-growth-tools">
          <button class="cf-round-tool" type="button" @click="resourcePopoverOpen = !resourcePopoverOpen">+</button>
          <div class="cf-growth-refs">
            <span
              v-for="resource in referencedResources"
              :key="`${resource.kind}-${resource.id}`"
              class="cf-ref-chip"
              :class="`is-${resource.kind}`"
            >
              {{ resource.label }}
            </span>
          </div>
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
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 10px 12px 10px 16px;
  border: 1px solid var(--cf-border-soft);
  border-radius: 8px;
  background: rgba(10, 13, 15, .78);
  backdrop-filter: blur(24px);
}

.cf-workspace-crumb {
  min-width: 0;
}

.cf-workspace-crumb strong,
.cf-workspace-crumb span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-workspace-crumb strong {
  font-size: 14px;
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
}

.cf-branch.is-secondary {
  stroke: rgba(157, 228, 155, .36);
}

.cf-branch.is-weak {
  stroke: rgba(240, 195, 107, .28);
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

.cf-growth-input {
  position: relative;
  display: block;
  min-height: 76px;
  margin: 8px 12px 6px;
  padding: 10px 0;
  color: var(--cf-text);
  font-size: 14px;
  line-height: 1.45;
}

.cf-growth-input textarea {
  position: absolute;
  inset: 0;
  width: 100%;
  min-height: 76px;
  padding: 10px 0;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: var(--cf-text);
  line-height: 1.45;
}

.cf-growth-input textarea::placeholder {
  color: var(--cf-muted);
}

.cf-mention {
  display: inline-flex;
  min-height: 22px;
  padding: 0 6px;
  border: 1px solid rgba(94, 215, 197, .24);
  border-radius: 6px;
  background: rgba(94, 215, 197, .12);
  color: #bffff3;
  font-weight: 700;
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
