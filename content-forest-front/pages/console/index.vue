<template>
  <div class="flex h-screen overflow-hidden bg-void">
    <!-- 全局背景光效层 -->
    <div class="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      <!-- 左上 bio-green 主光晕 -->
      <div class="absolute inset-0" style="background: radial-gradient(ellipse 55% 40% at 15% 0%, rgba(0,255,159,0.06) 0%, transparent 70%)" />
      <!-- 右下 gene-blue 副光晕 -->
      <div class="absolute inset-0" style="background: radial-gradient(ellipse 40% 35% at 90% 100%, rgba(14,165,233,0.04) 0%, transparent 70%)" />
      <!-- hex pattern -->
      <div class="absolute inset-0 bg-hex-pattern opacity-[0.025]" />
    </div>

    <!-- 左侧边栏 -->
    <ConsoleSidebar
      v-model:active-view="activeView"
      v-model:collapsed="sidebarCollapsed"
      class="relative z-10"
    />

    <!-- 右侧主区 -->
    <div class="relative z-10 flex flex-col flex-1 overflow-hidden">
      <!-- 顶部 Header -->
      <ConsoleHeader
        :active-view="activeView"
        @new-seed="openSeedEditor(null)"
      />

      <!-- 主内容区 -->
      <main class="flex-1 overflow-y-auto">
        <div class="max-w-6xl mx-auto py-8 px-6 md:px-10">
          <Transition
            enter-active-class="transition-opacity duration-300"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-150"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <SeedCardWall
              v-if="activeView === 'seeds'"
              key="seeds"
              ref="seedCardWallRef"
              @edit-seed="openSeedEditor"
            />

            <div v-else :key="activeView" class="flex flex-col items-center justify-center py-32 gap-4">
              <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase">// coming soon</div>
              <p class="font-serif text-2xl text-slate-300">该模块正在建设中</p>
              <p class="font-sans text-sm text-slate-500">先去种子库播下你的第一颗种子</p>
              <button
                class="mt-4 font-mono text-xs tracking-widest uppercase px-6 py-2 border border-bio-green/40 text-bio-green hover:border-bio-green hover:bg-bio-green/10 transition-all duration-300"
                @click="activeView = 'seeds'"
              >前往种子库</button>
            </div>
          </Transition>
        </div>
      </main>
    </div>

    <!-- 种子编辑 Modal -->
    <SeedEditor
      v-if="showSeedEditor"
      :seed="editingSeed"
      @close="closeSeedEditor"
      @saved="onSeedSaved"
    />

    <!-- Toast 通知 -->
    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import type { Seed } from '~/composables/useSeedRepository'

definePageMeta({ ssr: false })

useSeoMeta({
  title: '控制台 — Content Forest',
  description: '内容森林控制台，管理你的种子、果实和内容进化路径。',
})

const seedCardWallRef = ref<{ reload: () => void } | null>(null)
const activeView = ref('seeds')
const sidebarCollapsed = ref(false)

const showSeedEditor = ref(false)
const editingSeed = ref<Seed | null>(null)

function openSeedEditor(seed: Seed | null) {
  editingSeed.value = seed
  showSeedEditor.value = true
}

function closeSeedEditor() {
  showSeedEditor.value = false
  editingSeed.value = null
}

function onSeedSaved() {
  closeSeedEditor()
  seedCardWallRef.value?.reload()
}
</script>
