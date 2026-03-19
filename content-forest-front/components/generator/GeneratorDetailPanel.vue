<template>
  <Teleport to="body">
    <!-- 遮罩（移动端） -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="generator"
        class="fixed inset-0 bg-void/50 backdrop-blur-sm z-40 md:hidden"
        @click="emit('close')"
      />
    </Transition>

    <!-- 侧面板 -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-250 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="generator"
        class="fixed right-0 top-0 bottom-0 w-96 z-50 flex flex-col bg-void-2 border-l border-gene-blue/20 overflow-hidden"
      >
        <!-- 顶部光晕 -->
        <div class="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gene-blue/5 to-transparent pointer-events-none" />

        <!-- Header -->
        <div class="relative flex items-center justify-between h-14 px-6 border-b border-gene-blue/15 shrink-0">
          <span class="font-mono text-[10px] tracking-[0.3em] text-gene-blue/70 uppercase">// Generator Detail</span>
          <button
            class="w-7 h-7 flex items-center justify-center border border-mist-3/30 text-mist-2 hover:text-slate-200 hover:border-gene-blue/40 transition-all duration-200 font-mono text-sm"
            @click="emit('close')"
          >×</button>
        </div>

        <!-- 内容 -->
        <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <!-- 名称 -->
          <div>
            <div class="font-mono text-[9px] tracking-[0.3em] text-mist-3 uppercase mb-1">Name</div>
            <h2 class="font-serif text-xl text-slate-100 leading-snug">{{ generator.name }}</h2>
          </div>

          <!-- 描述 -->
          <div>
            <div class="font-mono text-[9px] tracking-[0.3em] text-mist-3 uppercase mb-1">Description</div>
            <p class="font-sans text-sm text-slate-400 leading-relaxed">{{ generator.description }}</p>
          </div>

          <!-- 平台 / 领域 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="font-mono text-[9px] tracking-[0.3em] text-mist-3 uppercase mb-1">Platform</div>
              <span class="font-mono text-xs px-2 py-0.5 border border-gene-blue/30 text-gene-blue">{{ platformLabel }}</span>
            </div>
            <div>
              <div class="font-mono text-[9px] tracking-[0.3em] text-mist-3 uppercase mb-1">Domain</div>
              <span class="font-sans text-sm text-slate-300">{{ generator.domain || '—' }}</span>
            </div>
          </div>

          <!-- 内容类型 -->
          <div>
            <div class="font-mono text-[9px] tracking-[0.3em] text-mist-3 uppercase mb-2">Content Types</div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="ct in generator.contentTypes"
                :key="ct"
                class="font-mono text-[10px] px-2 py-0.5 border border-mist-3/40 text-mist-2"
              >{{ ct }}</span>
            </div>
          </div>

          <!-- Output Capabilities -->
          <div>
            <div class="font-mono text-[9px] tracking-[0.3em] text-mist-3 uppercase mb-2">Output Capabilities</div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="cap in generator.outputCapabilities"
                :key="cap"
                class="font-mono text-[9px] px-2 py-0.5 bg-gene-blue/5 border border-gene-blue/20 text-gene-blue/70 uppercase tracking-wider"
              >OUTPUT · {{ cap }}</span>
            </div>
          </div>

          <!-- Skill 路径 -->
          <div>
            <div class="font-mono text-[9px] tracking-[0.3em] text-mist-3 uppercase mb-2">Skill Path</div>
            <div class="bg-void border border-gene-blue/15 p-3 flex items-start gap-3">
              <span class="font-mono text-[11px] text-gene-blue/80 break-all leading-relaxed flex-1">
                {{ generator.skillPath }}
              </span>
              <button
                class="shrink-0 font-mono text-[9px] tracking-widest uppercase px-2 py-1 border border-gene-blue/30 text-gene-blue/70 hover:text-gene-blue hover:border-gene-blue transition-all duration-200 whitespace-nowrap"
                @click="copyPath"
              >{{ copied ? '已复制 ✓' : '复制' }}</button>
            </div>
          </div>

          <!-- 来源 + 时间 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="font-mono text-[9px] tracking-[0.3em] text-mist-3 uppercase mb-1">来源</div>
              <span
                class="font-mono text-[10px] px-2 py-0.5 border"
                :class="generator.source === 'self' ? 'border-mutation/40 text-mutation' : 'border-gene-blue/40 text-gene-blue'"
              >{{ generator.source === 'self' ? '// 自建' : '// 已安装' }}</span>
            </div>
            <div v-if="generator.installedAt">
              <div class="font-mono text-[9px] tracking-[0.3em] text-mist-3 uppercase mb-1">安装时间</div>
              <span class="font-mono text-xs text-slate-400">{{ installDate }}</span>
            </div>
          </div>
        </div>

        <!-- 底部：卸载按钮 -->
        <div class="relative border-t border-gene-blue/10 p-6 shrink-0">
          <button
            class="w-full font-mono text-xs tracking-widest uppercase py-2.5 border border-death-red/40 text-death-red/80 hover:bg-death-red/10 hover:border-death-red hover:text-death-red transition-all duration-300"
            @click="handleUninstall"
          >
            卸载此生成器
          </button>
        </div>
      </aside>
    </Transition>

    <!-- 卸载确认 -->
    <ConfirmDialog
      v-if="showConfirm"
      :message="`确认卸载「${generator?.name}」？本地 Skill 文件将被删除。`"
      @confirm="doUninstall"
      @cancel="showConfirm = false"
    />
  </Teleport>
</template>

<script setup lang="ts">
import type { Generator } from '~/composables/useMyGenerators'

const props = defineProps<{ generator: Generator | null }>()
const emit = defineEmits<{
  close: []
  uninstalled: [id: string]
}>()

const { uninstall } = useMyGenerators()
const { showToast } = useToast()

const copied = ref(false)
const showConfirm = ref(false)

const PLATFORM_LABELS: Record<string, string> = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  twitter: '推特',
  wechat: '微信',
  other: '其他',
}
const platformLabel = computed(() => PLATFORM_LABELS[props.generator?.platform ?? ''] ?? props.generator?.platform ?? '')

const installDate = computed(() => {
  if (!props.generator?.installedAt) return ''
  return new Date(props.generator.installedAt).toLocaleDateString('zh-CN')
})

async function copyPath() {
  if (!props.generator?.skillPath) return
  try {
    await navigator.clipboard.writeText(props.generator.skillPath)
    copied.value = true
    showToast('路径已复制')
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    showToast('复制失败，请手动复制')
  }
}

function handleUninstall() {
  showConfirm.value = true
}

async function doUninstall() {
  showConfirm.value = false
  if (!props.generator) return
  try {
    await uninstall(props.generator.id)
    showToast('生成器已卸载')
    emit('uninstalled', props.generator.id)
    emit('close')
  } catch {
    showToast('卸载失败，请重试')
  }
}

// Escape 关闭
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.generator) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>
