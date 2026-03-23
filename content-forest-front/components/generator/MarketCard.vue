<template>
  <div
    class="group relative flex flex-col gap-4 p-6 bg-void-2/60 backdrop-blur
           border-t border-r border-b border-gene-blue/10
           hover:-translate-y-0.5 cursor-default
           transition-[transform,border-color,background-color,box-shadow]"
    style="transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 500ms"
  >
    <!-- 左侧 gene-blue accent bar -->
    <span class="absolute left-0 top-0 bottom-0 w-[3px] bg-gene-blue transition-opacity duration-500" />

    <!-- 悬停顶部光线 -->
    <span
      class="absolute top-0 left-[3px] right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style="background: linear-gradient(90deg, rgba(14,165,233,0.6) 0%, transparent 100%)"
    />

    <!-- 头部：平台标签 + 官方徽章 -->
    <div class="flex items-center justify-between">
      <span class="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 border border-gene-blue/30 text-gene-blue">
        {{ platformLabel }}
      </span>
      <span
        v-if="generator.isOfficial"
        class="font-mono text-[9px] tracking-widest uppercase px-2 py-0.5 border border-mutation/40 text-mutation"
      >// Official</span>
    </div>

    <!-- 名称 -->
    <h3 class="font-serif text-lg text-slate-100 leading-snug line-clamp-2">{{ generator.name }}</h3>

    <!-- 描述 -->
    <p class="font-sans text-xs leading-relaxed line-clamp-2 text-slate-500 flex-1">{{ generator.description }}</p>

    <!-- 安装次数 + 价格 -->
    <div class="flex items-center justify-between">
      <span class="font-mono text-[10px] text-mist-2">↓ <span class="text-gene-blue">{{ generator.installCount }}</span> 次安装</span>
      <span class="font-mono text-[10px] text-bio-green border border-bio-green/30 px-2 py-0.5">免费</span>
    </div>

    <!-- 底部：安装按钮 -->
    <div class="pt-3 border-t border-gene-blue/10">
      <button
        v-if="isInstalled"
        disabled
        class="w-full font-mono text-xs tracking-widest uppercase py-2 border border-bio-green/30 text-bio-green/80 cursor-default"
      >已安装 ✓</button>
      <button
        v-else
        :disabled="installing"
        class="w-full font-mono text-xs tracking-widest uppercase py-2 border transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="installing
          ? 'border-gene-blue/30 text-gene-blue/50'
          : 'border-gene-blue/50 text-gene-blue hover:bg-gene-blue/10 hover:border-gene-blue'"
        @click="handleInstall"
      >
        <span v-if="installing">安装中...</span>
        <span v-else>安装</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Generator } from '~/composables/useMyGenerators'

const props = defineProps<{ generator: Generator }>()
const emit = defineEmits<{ installed: [id: string, skillPath: string] }>()

const { install, isInstalled: checkInstalled } = useGeneratorMarket()
const { showToast } = useToast()

const installing = ref(false)
const localInstalled = ref(false)

const isInstalled = computed(() => localInstalled.value || checkInstalled(props.generator.id))

const PLATFORM_LABELS: Record<string, string> = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  twitter: '推特',
  wechat: '微信',
  other: '其他',
}
const platformLabel = computed(() => PLATFORM_LABELS[props.generator.platform] ?? props.generator.platform)

async function handleInstall() {
  if (installing.value || isInstalled.value) return
  installing.value = true
  try {
    const { skillPath } = await install(props.generator.id)
    localInstalled.value = true
    showToast(`安装成功！Skill 路径：${skillPath}`)
    emit('installed', props.generator.id, skillPath)
  } catch (e: any) {
    const status = e?.response?.status ?? e?.status
    if (status === 409) {
      localInstalled.value = true
      showToast('已安装')
    } else {
      showToast('安装失败，请重试')
    }
  } finally {
    installing.value = false
  }
}
</script>
