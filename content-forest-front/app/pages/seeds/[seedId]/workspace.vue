<script setup lang="ts">
type NodeType = 'seed' | 'fruit'
type SelectionState = 'candidate' | 'selected' | 'eliminated'
type NodeStatus = 'idle' | 'growing' | 'failed'
type ResourceKind = 'nutrition' | 'gene'

interface TreeNode {
  id: string
  nodeType: NodeType
  title: string
  summary: string
  markdown: string
  x: number
  y: number
  selectionState?: SelectionState
  parentNodeRef?: {
    nodeId: string
    nodeType: NodeType
  }
  contentLocation: string
  geneTags: string[]
  records: string[]
  createdAt: string
  updatedAt: string
  status: NodeStatus
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

const seedId = computed(() => String(route.params.seedId || 'mock-seed'))
const isReadOnly = computed(() => route.query.readonly === '1')

const treeSize = {
  width: 1180,
  height: 820,
}

const nodeSize = {
  seed: { width: 220, height: 104 },
  fruit: { width: 182, height: 92 },
}

const generatorName = '小红书产品文案'
const fruitCount = 3
const mutationRate = '18%'

const resourceOptions: ResourceRef[] = [
  {
    id: 'nutrition-hot-samples',
    kind: 'nutrition',
    label: '营养 · 爆款样本',
    scope: '公共营养库',
    description: '小红书情绪价值爆款样本 · 12 篇资料',
  },
  {
    id: 'gene-emotion-lineage',
    kind: 'gene',
    label: '基因 · 情绪价值谱系',
    scope: '种子基因库',
    description: '收藏型标题与低噪声承诺 · 已验证',
  },
  {
    id: 'nutrition-kol-watch',
    kind: 'nutrition',
    label: '营养 · KOL 观察',
    scope: '种子营养库',
    description: '壁纸账号 KOL 观察 · 8 条案例',
  },
]

const nodes = ref<TreeNode[]>([
  {
    id: 'seed-root',
    nodeType: 'seed',
    title: '用壁纸产品做一组有收藏欲的内容',
    summary: '根种子',
    markdown: [
      '# 壁纸产品增长种子',
      '我想把壁纸产品从“图片资源”表达成一种低噪声的生活方式。',
      '目标不是直接硬卖，而是让用户觉得：这组壁纸能帮我整理情绪、屏幕和注意力。',
      '第一期先探索小红书图文和短视频脚本。',
    ].join('\n\n'),
    x: 486,
    y: 640,
    contentLocation: `runtime/seeds/${seedId.value}/seed.md`,
    geneTags: ['低噪声审美', '收藏动机', '屏幕场景', '生活方式表达'],
    records: ['种子专属基因库已创建', '可作为内容树根节点查看'],
    createdAt: '2026-05-07T10:00:00+08:00',
    updatedAt: '2026-05-07T20:10:00+08:00',
    status: 'idle',
  },
  {
    id: 'fruit-emotion-open',
    nodeType: 'fruit',
    title: '情绪价值开场：给手机一个安静角落',
    summary: '情绪价值开场',
    markdown: [
      '你每天打开手机 120 次，它不应该每次都把你拉回噪声里。',
      '这组壁纸不是为了“好看一下”，而是为了让屏幕安静下来。低饱和、少信息、留白充分，适合想把注意力拿回来的人。',
      '收藏这组，今晚先换一张。',
    ].join('\n\n'),
    x: 314,
    y: 452,
    selectionState: 'selected',
    parentNodeRef: { nodeId: 'seed-root', nodeType: 'seed' },
    contentLocation: `runtime/seeds/${seedId.value}/fruits/fruit-emotion-open.md`,
    geneTags: ['情绪价值', '低噪声承诺', '收藏 CTA', '场景化痛点'],
    records: ['小红书 / 人为发布：收藏 312 · 点赞 890 · 评论质量较高', '人为监控器：最近快照 2026-05-07 20:18'],
    createdAt: '2026-05-07T11:20:00+08:00',
    updatedAt: '2026-05-07T20:18:00+08:00',
    status: 'idle',
  },
  {
    id: 'fruit-niche-piece',
    nodeType: 'fruit',
    title: '小众精品路线：不是壁纸，是审美切片',
    summary: '小众精品路线',
    markdown: [
      '如果你讨厌满屏信息，这组壁纸会更像一块干净的审美切片。',
      '它不抢注意力，只在你点亮屏幕的几秒里给一点秩序感。',
    ].join('\n\n'),
    x: 594,
    y: 438,
    selectionState: 'candidate',
    parentNodeRef: { nodeId: 'seed-root', nodeType: 'seed' },
    contentLocation: `runtime/seeds/${seedId.value}/fruits/fruit-niche-piece.md`,
    geneTags: ['小众精品', '审美切片', '低干扰', '产品高级感'],
    records: ['候选果实：等待物竞天择'],
    createdAt: '2026-05-07T11:24:00+08:00',
    updatedAt: '2026-05-07T11:24:00+08:00',
    status: 'idle',
  },
  {
    id: 'fruit-feature-list',
    nodeType: 'fruit',
    title: '功能介绍路线：4K、无水印、每日更新',
    summary: '功能介绍路线',
    markdown: [
      '4K 高清、无水印、每日更新。',
      '这条路线信息明确，但缺少情绪钩子，和种子目标偏离较大。',
    ].join('\n\n'),
    x: 816,
    y: 472,
    selectionState: 'eliminated',
    parentNodeRef: { nodeId: 'seed-root', nodeType: 'seed' },
    contentLocation: `runtime/seeds/${seedId.value}/fruits/fruit-feature-list.md`,
    geneTags: ['功能卖点', '直接促销', '信息密度高'],
    records: ['物竞天择：人工淘汰 · 原因：传播记忆点弱'],
    createdAt: '2026-05-07T11:28:00+08:00',
    updatedAt: '2026-05-07T18:40:00+08:00',
    status: 'idle',
  },
  {
    id: 'fruit-sleep-scene',
    nodeType: 'fruit',
    title: '睡前换一张屏幕，像换一种心情',
    summary: '睡前使用场景',
    markdown: [
      '睡前别再刷到最后一秒。',
      '把屏幕换成更安静的一张图，像给今天收一个柔和的尾。',
    ].join('\n\n'),
    x: 204,
    y: 232,
    selectionState: 'candidate',
    parentNodeRef: { nodeId: 'fruit-emotion-open', nodeType: 'fruit' },
    contentLocation: `runtime/seeds/${seedId.value}/fruits/fruit-sleep-scene.md`,
    geneTags: ['睡前场景', '情绪收束', '轻 CTA'],
    records: ['候选果实：等待选择或淘汰'],
    createdAt: '2026-05-07T13:04:00+08:00',
    updatedAt: '2026-05-07T13:04:00+08:00',
    status: 'idle',
  },
  {
    id: 'fruit-low-noise-desk',
    nodeType: 'fruit',
    title: '把桌面整理成一个低噪声空间',
    summary: '低噪声空间',
    markdown: [
      '手机桌面也需要整理。',
      '不是把 App 摆整齐，而是让第一眼看到的东西不再刺激你。',
    ].join('\n\n'),
    x: 462,
    y: 192,
    selectionState: 'selected',
    parentNodeRef: { nodeId: 'fruit-emotion-open', nodeType: 'fruit' },
    contentLocation: `runtime/seeds/${seedId.value}/fruits/fruit-low-noise-desk.md`,
    geneTags: ['整理感', '低噪声空间', '注意力回收'],
    records: ['微博 / 人为发布：转发 42 · 收藏 119', '数据反馈：评论中多次出现“舒服”“想换”'],
    createdAt: '2026-05-07T13:18:00+08:00',
    updatedAt: '2026-05-07T19:15:00+08:00',
    status: 'idle',
  },
  {
    id: 'fruit-minimal-failed',
    nodeType: 'fruit',
    title: '极简黑白系列：失败后可重试',
    summary: '失败重试样例',
    markdown: [
      '最近一次枝化生长失败，前端可从这个节点恢复上次输入。',
      '失败不回滚已生成果实，只让用户感知并允许重试。',
    ].join('\n\n'),
    x: 704,
    y: 198,
    selectionState: 'candidate',
    parentNodeRef: { nodeId: 'fruit-niche-piece', nodeType: 'fruit' },
    contentLocation: `runtime/seeds/${seedId.value}/fruits/fruit-minimal-failed.md`,
    geneTags: ['失败恢复', '重试入口', '工作流体验'],
    records: ['最近失败任务：超时 · 可重试'],
    createdAt: '2026-05-07T14:12:00+08:00',
    updatedAt: '2026-05-07T14:18:00+08:00',
    status: 'failed',
  },
  {
    id: 'fruit-anxiety-screen',
    nodeType: 'fruit',
    title: '给焦虑的人一张不会打扰的屏幕',
    summary: '焦虑人群钩子',
    markdown: [
      '焦虑的时候，屏幕最好不要继续喊你。',
      '这组壁纸做了一件很小的事：让手机先安静一点。',
    ].join('\n\n'),
    x: 916,
    y: 268,
    selectionState: 'candidate',
    parentNodeRef: { nodeId: 'fruit-niche-piece', nodeType: 'fruit' },
    contentLocation: `runtime/seeds/${seedId.value}/fruits/fruit-anxiety-screen.md`,
    geneTags: ['焦虑人群', '不打扰', '情绪钩子'],
    records: ['候选果实：适合继续枝化'],
    createdAt: '2026-05-07T14:30:00+08:00',
    updatedAt: '2026-05-07T14:30:00+08:00',
    status: 'idle',
  },
])

const selectedNodeId = ref('fruit-emotion-open')
const transform = reactive({ x: -660, y: -430, scale: 1 })
const dragState = ref<DragState | null>(null)
const suppressClickNodeId = ref('')
const growthDetailOpen = ref(false)
const resourcePopoverOpen = ref(false)
const growthIntent = ref('继续沿着 @情绪价值 的方向生长，强调收藏和睡前使用场景')
const referencedResources = ref<ResourceRef[]>([resourceOptions[0]!, resourceOptions[1]!])
let nextFruitIndex = 1
let growthTimer: ReturnType<typeof setTimeout> | null = null

const selectedNode = computed<TreeNode>(() => nodes.value.find((node) => node.id === selectedNodeId.value) ?? nodes.value[0]!)
const canShowGrowthComposer = computed(() => selectedNode.value.nodeType === 'fruit' && selectedNode.value.selectionState === 'selected')
const visibleComposer = computed(() => canShowGrowthComposer.value && !isReadOnly.value)
const treeEdges = computed(() => nodes.value.filter((node) => node.parentNodeRef).map((node) => ({
  parentId: node.parentNodeRef?.nodeId || '',
  childId: node.id,
})))

const branchPaths = computed(() => treeEdges.value.map((edge, index) => {
  const parent = findNode(edge.parentId)
  const child = findNode(edge.childId)
  if (!parent || !child) return null
  return {
    key: `${edge.parentId}-${edge.childId}`,
    d: makeBranchPath(parent, child),
    className: index > 2 ? 'is-weak' : index === 0 ? 'is-primary' : 'is-secondary',
    joint: getChildJoint(child),
  }
}).filter((path): path is NonNullable<typeof path> => Boolean(path)))

const transformedMapStyle = computed(() => ({
  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
}))

const selectedCrumb = computed(() => `工作区 / 内容树 / 当前选中：${selectedNode.value.summary}`)

const growthDetailResources = computed(() => referencedResources.value.map((resource) => ({
  ...resource,
  kindLabel: resource.kind === 'gene' ? '基因库' : '营养库',
})))

onBeforeUnmount(() => {
  if (growthTimer) clearTimeout(growthTimer)
})

function findNode(nodeId: string) {
  return nodes.value.find((node) => node.id === nodeId)
}

function getNodeSize(node: TreeNode) {
  return node.nodeType === 'seed' ? nodeSize.seed : nodeSize.fruit
}

function getNodeCenter(node: TreeNode) {
  const size = getNodeSize(node)
  return {
    x: node.x + size.width / 2,
    y: node.y + size.height / 2,
  }
}

function getParentPort(node: TreeNode) {
  const size = getNodeSize(node)
  return {
    x: node.x + size.width / 2,
    y: node.y + Math.min(18, size.height * 0.22),
  }
}

function getChildPort(node: TreeNode) {
  const size = getNodeSize(node)
  return {
    x: node.x + size.width / 2,
    y: node.y + size.height - Math.min(12, size.height * 0.16),
  }
}

function getChildJoint(node: TreeNode) {
  return getChildPort(node)
}

function makeBranchPath(parent: TreeNode, child: TreeNode) {
  const from = getParentPort(parent)
  const to = getChildPort(child)
  const distance = Math.max(54, Math.abs(from.y - to.y))
  const bend = distance * 0.52
  const sway = Math.max(-42, Math.min(42, (to.x - from.x) * 0.16))
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} C ${(from.x + sway).toFixed(1)} ${(from.y - bend).toFixed(1)}, ${(to.x - sway).toFixed(1)} ${(to.y + bend).toFixed(1)}, ${to.x.toFixed(1)} ${to.y.toFixed(1)}`
}

function nodeStyle(node: TreeNode) {
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
  }
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

function selectNode(nodeId: string) {
  if (suppressClickNodeId.value === nodeId) {
    suppressClickNodeId.value = ''
    return
  }
  selectedNodeId.value = nodeId
  resourcePopoverOpen.value = false
  if (!canShowGrowthComposer.value) growthDetailOpen.value = false
}

function setSelectionState(state: SelectionState) {
  if (selectedNode.value.nodeType !== 'fruit') return
  selectedNode.value.selectionState = state
  selectedNode.value.status = 'idle'
  if (state !== 'selected') growthDetailOpen.value = false
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
  transform.x = -660
  transform.y = -430
  transform.scale = 1
}

function hasResource(resourceId: string) {
  return referencedResources.value.some((resource) => resource.id === resourceId)
}

function addResource(resource: ResourceRef) {
  if (!hasResource(resource.id)) referencedResources.value = [resource, ...referencedResources.value]
  const mention = `@${resource.label}`
  if (!growthIntent.value.includes(mention)) {
    growthIntent.value = `${growthIntent.value.trim()} ${mention}`.trim()
  }
  resourcePopoverOpen.value = false
}

function highlightedIntentSegments() {
  const tokens = growthIntent.value.split(/(@[^\s@]+(?:\s·\s[^\s@]+)?|@[^\s@]+)/g).filter(Boolean)
  return tokens.map((token) => ({
    text: token,
    mention: token.startsWith('@'),
  }))
}

function triggerMockGrowth() {
  if (!visibleComposer.value || selectedNode.value.status === 'growing') return

  const source = selectedNode.value
  source.status = 'growing'
  growthDetailOpen.value = false

  if (growthTimer) clearTimeout(growthTimer)
  growthTimer = setTimeout(() => {
    source.status = 'idle'
    const sourceCenter = getNodeCenter(source)
    const newId = `mock-fruit-${nextFruitIndex}`
    const newFruit: TreeNode = {
      id: newId,
      nodeType: 'fruit',
      title: nextFruitIndex % 2 === 1 ? '新果实：把注意力还给自己' : '新果实：今晚只换一张安静的屏幕',
      summary: `新生果实 ${nextFruitIndex}`,
      markdown: [
        '这是一颗由当前生长源模拟生成的新果实。',
        '真实产品中它会由枝化生长 Agent 调用生成器、营养库和基因库后落库。',
      ].join('\n\n'),
      x: Math.max(90, Math.min(treeSize.width - nodeSize.fruit.width - 40, sourceCenter.x + 120 + nextFruitIndex * 18)),
      y: Math.max(40, source.y - 190),
      selectionState: 'candidate',
      parentNodeRef: { nodeId: source.id, nodeType: source.nodeType },
      contentLocation: `runtime/seeds/${seedId.value}/fruits/${newId}.md`,
      geneTags: ['模拟生成', '候选果实', '可继续枝化'],
      records: ['枝化生长：预览模式生成'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'idle',
    }
    nextFruitIndex += 1
    nodes.value = [...nodes.value, newFruit]
    selectedNodeId.value = newFruit.id
  }, 1100)
}
</script>

<template>
  <section class="cf-workspace-page">
    <header class="cf-workspace-topbar">
      <div class="cf-workspace-crumb">
        <strong>壁纸产品增长种子</strong>
        <span>{{ selectedCrumb }}</span>
      </div>
      <div class="cf-workspace-actions">
        <span class="cf-workspace-chip">{{ isReadOnly ? 'READ ONLY' : 'MOCK UX' }}</span>
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
          <span>{{ selectedNode.status === 'growing' ? '枝化生长' : '树加载完成' }}</span>
          <span>{{ selectedNode.status === 'growing' ? '生成中' : `${nodes.length} 节点` }}</span>
        </strong>
        <div class="cf-growth-meter"><span /></div>
      </div>

      <div class="cf-tree-map" :style="transformedMapStyle">
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
            <span class="cf-node-tag">{{ node.geneTags[0] }}</span>
          </span>
        </button>
      </div>

      <aside class="cf-tree-minimap" aria-label="内容树小地图">
        <svg viewBox="0 0 150 96" aria-hidden="true">
          <path d="M76 84 C70 60 44 52 36 28" stroke="#5ed7c5" fill="none" stroke-width="1.5" />
          <path d="M76 84 C82 54 100 46 122 30" stroke="#8b9cff" fill="none" stroke-width="1.2" />
          <circle cx="76" cy="84" r="4" fill="#5ed7c5" />
          <circle cx="36" cy="28" r="3" fill="#85d88b" />
          <circle cx="82" cy="44" r="3" fill="#5ed7c5" />
          <circle cx="122" cy="30" r="3" fill="#f0c36b" />
        </svg>
      </aside>
    </section>

    <aside class="cf-node-detail" aria-label="节点详情">
      <header class="cf-node-detail-header">
        <div class="cf-detail-kicker">
          <span>{{ selectedNode.nodeType === 'seed' ? '种子卡片' : '果实卡片' }}</span>
          <span class="cf-workspace-chip">{{ nodeStateLabel(selectedNode) }}</span>
        </div>
        <h1>{{ selectedNode.title }}</h1>
        <div class="cf-natural-selection" aria-label="物竞天择">
          <div v-if="selectedNode.nodeType === 'seed'" class="cf-state-note">
            种子作为根节点展示，本次 mock 不展示枝化输入框
          </div>
          <div v-else-if="selectedNode.selectionState === 'selected'" class="cf-state-note is-selected">
            已选择果实：进入发布验证与数据回流
          </div>
          <button
            v-else-if="selectedNode.selectionState === 'eliminated'"
            class="cf-state-action is-primary"
            type="button"
            @click="setSelectionState('candidate')"
          >
            恢复
          </button>
          <template v-else>
            <button class="cf-state-action is-primary" type="button" @click="setSelectionState('selected')">选择</button>
            <button class="cf-state-action" type="button" @click="setSelectionState('eliminated')">淘汰</button>
          </template>
        </div>
      </header>

      <div class="cf-node-detail-body">
        <section class="cf-detail-section">
          <h2>正文</h2>
          <MarkdownViewer :markdown="selectedNode.markdown" />
        </section>

        <section class="cf-detail-section">
          <h2>基因标签</h2>
          <div class="cf-gene-grid">
            <span v-for="gene in selectedNode.geneTags" :key="gene" class="cf-gene">{{ gene }}</span>
          </div>
        </section>

        <section class="cf-detail-section">
          <h2>发布与反馈</h2>
          <div class="cf-record-list">
            <div v-for="record in selectedNode.records" :key="record" class="cf-record">
              <strong>{{ record.split('：')[0] }}</strong>
              <span>{{ record.split('：')[1] || '暂无更多数据' }}</span>
            </div>
          </div>
        </section>

        <section class="cf-detail-section">
          <h2>Mock Meta</h2>
          <div class="cf-info-row">
            <span>内容路径</span>
            <strong>{{ selectedNode.contentLocation }}</strong>
          </div>
          <div class="cf-info-row">
            <span>更新时间</span>
            <strong>{{ selectedNode.updatedAt }}</strong>
          </div>
        </section>
      </div>

      <footer class="cf-node-detail-footer">
        <button class="cf-secondary-action" type="button">发布器</button>
        <button class="cf-secondary-action" type="button">监控器</button>
        <button class="cf-secondary-action" type="button">发布记录</button>
        <button class="cf-secondary-action" type="button">数据反馈</button>
      </footer>
    </aside>

    <section v-if="visibleComposer" class="cf-growth-composer" aria-label="枝化生长输入框">
      <div v-if="resourcePopoverOpen" class="cf-resource-popover" aria-label="@资源提示">
        <button
          v-for="resource in resourceOptions"
          :key="resource.id"
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
          <strong>{{ mutationRate }}</strong>
        </div>
      </div>

      <label class="cf-growth-input">
        <span v-for="(segment, index) in highlightedIntentSegments()" :key="`${segment.text}-${index}`" :class="{ 'cf-mention': segment.mention }">
          {{ segment.text }}
        </span>
        <textarea
          v-model="growthIntent"
          aria-label="枝化生长意图"
          @focus="resourcePopoverOpen = true"
          @input="resourcePopoverOpen = growthIntent.includes('@')"
        />
      </label>

      <div class="cf-growth-footer">
        <div class="cf-growth-tools">
          <button class="cf-round-tool" type="button" @click="resourcePopoverOpen = !resourcePopoverOpen">+</button>
          <div class="cf-growth-refs">
            <span
              v-for="resource in referencedResources"
              :key="resource.id"
              class="cf-ref-chip"
              :class="`is-${resource.kind}`"
            >
              {{ resource.label }}
            </span>
          </div>
        </div>
        <div class="cf-growth-actions">
          <button class="cf-secondary-action" type="button" @click="growthDetailOpen = !growthDetailOpen">
            枝化生长详情
          </button>
          <button class="cf-send-button" type="button" aria-label="发起 mock 生长" @click="triggerMockGrowth">↑</button>
        </div>
      </div>

      <div v-if="growthDetailOpen" class="cf-growth-detail-panel" aria-label="枝化生长详情">
        <div class="cf-growth-detail-head">
          <strong>枝化生长详情</strong>
          <span>只读预览</span>
        </div>
        <div class="cf-growth-detail-row"><span>生成器</span><strong>{{ generatorName }}</strong></div>
        <div class="cf-growth-detail-row"><span>果实数量</span><strong>{{ fruitCount }}</strong></div>
        <div class="cf-growth-detail-row"><span>突变概率</span><strong>{{ mutationRate }}</strong></div>
        <div class="cf-growth-detail-row"><span>引用资源</span><strong>{{ referencedResources.length }}</strong></div>
        <div class="cf-growth-detail-refs">
          <span
            v-for="resource in growthDetailResources"
            :key="resource.id"
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
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 42% 18%, rgba(94, 215, 197, .09), transparent 34%),
    radial-gradient(circle at 72% 64%, rgba(240, 195, 107, .065), transparent 30%),
    #080a0d;
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
  box-shadow: 0 18px 58px rgba(0, 0, 0, .2);
}

.cf-workspace-crumb {
  min-width: 0;
}

.cf-workspace-crumb strong,
.cf-workspace-crumb span {
  display: block;
}

.cf-workspace-crumb strong {
  overflow: hidden;
  color: #f7faf8;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-workspace-crumb span {
  margin-top: 3px;
  color: var(--cf-text-muted);
  font-size: 12px;
}

.cf-workspace-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.cf-workspace-chip,
.cf-workspace-tool {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid var(--cf-border);
  border-radius: 7px;
  background: rgba(255, 255, 255, .045);
  color: var(--cf-text-muted);
  font-size: 12px;
}

.cf-workspace-tool {
  cursor: pointer;
}

.cf-tree-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: grab;
  background:
    radial-gradient(circle at 1px 1px, rgba(255, 255, 255, .075) 1px, transparent 0) 0 0 / 28px 28px,
    linear-gradient(180deg, rgba(255, 255, 255, .018), transparent 36%),
    #080a0d;
}

.cf-tree-canvas.is-dragging {
  cursor: grabbing;
}

.cf-tree-canvas::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(8, 10, 13, .78), transparent 14%, transparent 76%, rgba(8, 10, 13, .58)),
    linear-gradient(0deg, rgba(8, 10, 13, .88), transparent 28%, transparent 82%, rgba(8, 10, 13, .42));
}

.cf-tree-map {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 50%;
  width: 1180px;
  height: 820px;
  transform-origin: 50% 50%;
  will-change: transform;
}

.cf-branch-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  filter: drop-shadow(0 0 22px rgba(94, 215, 197, .12));
}

.cf-branch {
  fill: none;
  stroke: rgba(118, 190, 176, .55);
  stroke-linecap: round;
  stroke-width: 2;
  pointer-events: none;
  vector-effect: non-scaling-stroke;
}

.cf-branch.is-secondary {
  stroke: rgba(139, 156, 255, .42);
  stroke-width: 1.4;
}

.cf-branch.is-weak {
  stroke: rgba(255, 255, 255, .16);
  stroke-width: 1.2;
}

.cf-branch-joint {
  fill: rgba(94, 215, 197, .92);
  stroke: rgba(8, 10, 13, .75);
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
}

.cf-tree-node {
  position: absolute;
  width: 182px;
  min-height: 92px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px;
  border: 1px solid rgba(255, 255, 255, .15);
  border-radius: 8px;
  background:
    linear-gradient(150deg, rgba(255, 255, 255, .065), transparent 42%),
    rgba(18, 22, 25, .88);
  color: inherit;
  box-shadow: 0 28px 90px rgba(0, 0, 0, .46);
  isolation: isolate;
  text-align: left;
  touch-action: none;
  backdrop-filter: blur(18px);
}

.cf-tree-node::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: 8px;
  background:
    linear-gradient(132deg, rgba(255, 255, 255, .14), transparent 24%),
    radial-gradient(circle at 88% 22%, rgba(240, 195, 107, .16), transparent 26%);
  opacity: .82;
}

.cf-tree-node > * {
  position: relative;
  z-index: 2;
}

.cf-tree-node.is-seed {
  width: 220px;
  min-height: 104px;
  padding-left: 72px;
  border-color: rgba(94, 215, 197, .48);
  background:
    radial-gradient(circle at 32px 50%, rgba(94, 215, 197, .24), transparent 37px),
    linear-gradient(180deg, rgba(27, 39, 37, .95), rgba(13, 18, 19, .92));
}

.cf-tree-node.is-seed::before {
  left: 20px;
  top: 24px;
  width: 34px;
  height: 50px;
  inset: auto;
  border: 1px solid rgba(184, 255, 217, .58);
  border-radius: 60% 40% 52% 48%;
  background:
    radial-gradient(circle at 50% 28%, rgba(255, 255, 255, .52), transparent 16%),
    linear-gradient(160deg, rgba(184, 255, 217, .45), rgba(94, 215, 197, .16));
  box-shadow: 0 0 36px rgba(94, 215, 197, .24);
  transform: rotate(-14deg);
}

.cf-tree-node.is-active {
  border-color: rgba(94, 215, 197, .9);
  box-shadow: 0 0 0 1px rgba(94, 215, 197, .22), 0 22px 86px rgba(0, 0, 0, .58);
}

.cf-tree-node.is-selected {
  border-color: rgba(133, 216, 139, .56);
}

.cf-tree-node.is-eliminated {
  border-style: dashed;
  filter: saturate(.55);
}

.cf-tree-node.is-eliminated .cf-node-title,
.cf-tree-node.is-eliminated .cf-node-tags {
  opacity: .58;
}

.cf-tree-node.is-growing {
  border-color: rgba(94, 215, 197, .7);
}

.cf-tree-node.is-growing::after {
  content: "";
  position: absolute;
  inset: -6px;
  z-index: -1;
  border: 1px solid rgba(94, 215, 197, .38);
  border-radius: 10px;
  animation: cfPulse 1.2s ease-in-out infinite;
}

.cf-tree-node.is-failed {
  border-color: rgba(255, 107, 122, .55);
}

@keyframes cfPulse {
  0%, 100% {
    opacity: .18;
    transform: scale(.98);
  }
  50% {
    opacity: .76;
    transform: scale(1.04);
  }
}

.cf-node-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--cf-text-muted);
  font-size: 11px;
}

.cf-node-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--cf-warning);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, .035);
}

.cf-tree-node.is-seed .cf-node-dot,
.cf-tree-node.is-growing .cf-node-dot {
  background: var(--cf-growth);
}

.cf-tree-node.is-selected .cf-node-dot {
  background: #85d88b;
}

.cf-tree-node.is-eliminated .cf-node-dot,
.cf-tree-node.is-failed .cf-node-dot {
  background: var(--cf-danger);
}

.cf-node-title {
  color: #f4f7f6;
  font-size: 13px;
  font-weight: 760;
  line-height: 1.36;
}

.cf-node-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.cf-node-tag {
  min-height: 21px;
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0 7px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 6px;
  background: rgba(255, 255, 255, .045);
  color: #b9c5c8;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-growth-ribbon,
.cf-tree-minimap {
  position: absolute;
  z-index: 10;
  border: 1px solid var(--cf-border-soft);
  border-radius: 8px;
  background: rgba(12, 15, 18, .72);
  backdrop-filter: blur(20px);
}

.cf-growth-ribbon {
  left: 18px;
  top: 88px;
  width: 238px;
  padding: 11px;
}

.cf-growth-ribbon strong {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
  font-size: 12px;
}

.cf-growth-meter {
  height: 4px;
  overflow: hidden;
  border-radius: 99px;
  background: rgba(255, 255, 255, .08);
}

.cf-growth-meter span {
  display: block;
  width: 76%;
  height: 100%;
  background: linear-gradient(90deg, var(--cf-growth), var(--cf-accent));
  animation: cfMeter 2.2s ease-in-out infinite;
}

@keyframes cfMeter {
  0%, 100% { width: 64%; }
  50% { width: 92%; }
}

.cf-tree-minimap {
  left: 18px;
  bottom: 162px;
  width: 154px;
  height: 104px;
  padding: 10px;
}

.cf-tree-minimap svg {
  width: 100%;
  height: 100%;
  opacity: .78;
}

.cf-node-detail {
  position: absolute;
  z-index: 30;
  right: 14px;
  top: 14px;
  bottom: 14px;
  width: 398px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--cf-border-soft);
  border-radius: 8px;
  background: rgba(13, 16, 19, .9);
  box-shadow: 0 28px 90px rgba(0, 0, 0, .46);
  backdrop-filter: blur(28px);
}

.cf-node-detail-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 15px 16px 12px;
  border-bottom: 1px solid var(--cf-border-soft);
}

.cf-detail-kicker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--cf-text-muted);
  font-size: 12px;
}

.cf-node-detail h1 {
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
}

.cf-natural-selection {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
}

.cf-state-note,
.cf-state-action {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  font-size: 12px;
}

.cf-state-note {
  width: 100%;
  padding: 0 10px;
  border: 1px solid rgba(133, 216, 139, .18);
  background: rgba(133, 216, 139, .055);
  color: #b9eeb8;
  justify-content: flex-start;
}

.cf-state-action {
  flex: 1;
  border: 1px solid var(--cf-border);
  background: rgba(255, 255, 255, .04);
  color: var(--cf-text-muted);
  cursor: pointer;
}

.cf-state-action.is-primary {
  border-color: rgba(133, 216, 139, .26);
  background: linear-gradient(180deg, #9de49b, #78c984);
  color: #06110d;
  font-weight: 800;
}

.cf-node-detail-body {
  overflow: auto;
  padding: 15px 16px 132px;
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
  text-transform: none;
}

.cf-gene-grid,
.cf-growth-detail-refs {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.cf-gene {
  padding: 6px 8px;
  border: 1px solid rgba(94, 215, 197, .18);
  border-radius: 6px;
  background: rgba(94, 215, 197, .06);
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
}

.cf-record strong,
.cf-record span {
  display: block;
  font-size: 12px;
}

.cf-record strong {
  margin-bottom: 5px;
}

.cf-record span {
  color: var(--cf-text-muted);
}

.cf-node-detail-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--cf-border-soft);
  background: rgba(13, 16, 19, .94);
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
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .045), transparent 52%),
    rgba(35, 36, 37, .96);
  box-shadow: 0 30px 100px rgba(0, 0, 0, .55);
  transform: translateX(calc(-50% - 190px));
  backdrop-filter: blur(30px);
}

.cf-growth-top,
.cf-growth-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cf-growth-top {
  padding: 10px 12px 0;
}

.cf-growth-pill {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding: 0 10px;
  border: 1px solid var(--cf-border);
  border-radius: 14px;
  background: rgba(255, 255, 255, .045);
  color: var(--cf-text);
  cursor: default;
  user-select: none;
}

.cf-growth-pill.is-source {
  max-width: 250px;
  border-color: rgba(94, 215, 197, .22);
  background:
    radial-gradient(circle at 18% 50%, rgba(94, 215, 197, .16), transparent 38%),
    rgba(255, 255, 255, .045);
}

.cf-growth-pill span {
  color: var(--cf-text-muted);
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

.cf-growth-input textarea::selection {
  color: var(--cf-text);
  background: rgba(139, 156, 255, .32);
}

.cf-mention {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 6px;
  border: 1px solid rgba(94, 215, 197, .2);
  border-radius: 6px;
  background: rgba(94, 215, 197, .1);
  color: #bffff3;
  font-weight: 700;
  white-space: nowrap;
}

.cf-growth-footer {
  justify-content: space-between;
  padding: 0 12px 12px;
}

.cf-growth-tools,
.cf-growth-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cf-growth-refs {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  overflow: hidden;
}

.cf-round-tool {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: transparent;
  color: var(--cf-text-muted);
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}

.cf-round-tool:hover {
  background: rgba(255, 255, 255, .07);
  color: var(--cf-text);
}

.cf-ref-chip {
  height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 6px;
  background: rgba(255, 255, 255, .055);
  color: #cbd8d9;
  font-size: 11px;
  white-space: nowrap;
}

.cf-ref-chip.is-nutrition {
  border-color: rgba(240, 195, 107, .22);
  background: rgba(240, 195, 107, .08);
  color: #ffe0b2;
}

.cf-ref-chip.is-gene {
  border-color: rgba(94, 215, 197, .22);
  background: rgba(94, 215, 197, .08);
  color: #c0fff4;
}

.cf-send-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #f6f7f4;
  color: #151719;
  cursor: pointer;
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
  bottom: 164px;
  width: 342px;
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
  color: var(--cf-text-muted);
  text-align: left;
  cursor: pointer;
}

.cf-resource-row:hover {
  background: rgba(139, 156, 255, .12);
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
  color: var(--cf-text-muted);
  font-size: 11px;
  font-style: normal;
}

.cf-resource-row kbd {
  padding: 2px 5px;
  border: 1px solid var(--cf-border);
  border-radius: 5px;
  background: rgba(255, 255, 255, .04);
  color: var(--cf-text-muted);
  font-size: 10px;
}

.cf-growth-detail-panel {
  right: 52px;
  bottom: 48px;
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
  color: #dce4e4;
  font-size: 12px;
  font-weight: 800;
}

.cf-growth-detail-head span,
.cf-growth-detail-row {
  color: var(--cf-text-muted);
  font-size: 12px;
}

.cf-growth-detail-row strong {
  color: var(--cf-text);
  font-weight: 700;
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
