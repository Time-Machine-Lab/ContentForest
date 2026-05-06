<script setup lang="ts">
const {
  view,
  query,
  filteredSeeds,
  selectedSeed,
  selectedSeedId,
  listLoading,
  detailLoading,
  createLoading,
  saveLoading,
  operationLoading,
  listError,
  detailError,
  createError,
  operationError,
  loadSeeds,
  selectSeed,
  createSeed,
  updateSeed,
  archiveSelectedSeed,
  restoreSelectedSeed,
  openSelectedWorkspace,
} = useSeedLibrary()

const modalOpen = ref(false)

onMounted(() => {
  void loadSeeds('active')
})

async function changeView(nextView: 'active' | 'archived') {
  if (view.value === nextView) return
  await loadSeeds(nextView)
}

async function handleCreate(payload: { title: string; markdown: string }) {
  const created = await createSeed(payload)
  if (created) modalOpen.value = false
}
</script>

<template>
  <section class="cf-seed-page">
    <header class="cf-page-topbar">
      <div class="cf-page-title">
        <h1>种子库</h1>
        <p>把灵感收纳成可生长的内容根节点</p>
      </div>
      <button class="cf-command-button" type="button" @click="modalOpen = true">
        <span aria-hidden="true">⌕</span>
        <span>新建种子，或继续当前灵感</span>
        <span class="cf-kbd">N</span>
      </button>
      <button class="cf-primary-action" type="button" @click="modalOpen = true">＋ 新建种子</button>
    </header>

    <div class="cf-seed-layout">
      <section class="cf-seed-gallery" aria-label="种子库">
        <div class="cf-seed-toolbar">
          <label class="cf-seed-search">
            <span aria-hidden="true">⌕</span>
            <input v-model="query" type="search" placeholder="筛选当前视图中的种子">
          </label>

          <div class="cf-view-tabs" aria-label="种子视图">
            <button
              class="cf-view-tab"
              :class="{ 'is-active': view === 'active' }"
              type="button"
              @click="changeView('active')"
            >
              未归档
            </button>
            <button
              class="cf-view-tab"
              :class="{ 'is-active': view === 'archived' }"
              type="button"
              @click="changeView('archived')"
            >
              已归档
            </button>
          </div>
        </div>

        <ExceptionNotice
          v-if="listError"
          title="种子列表读取失败"
          :message="listError"
          action-label="重试"
          @action="loadSeeds(view)"
        />

        <div v-if="listLoading" class="cf-grid-state">读取种子中</div>
        <div v-else-if="filteredSeeds.length === 0" class="cf-grid-state">
          <strong>{{ view === 'active' ? '还没有未归档种子' : '还没有已归档种子' }}</strong>
          <span>{{ view === 'active' ? '创建第一颗种子，开始长出内容树。' : '归档后的种子会出现在这里。' }}</span>
          <button v-if="view === 'active'" class="cf-primary-action" type="button" @click="modalOpen = true">新建种子</button>
        </div>
        <div v-else class="cf-seed-grid">
          <SeedCard
            v-for="seed in filteredSeeds"
            :key="seed.id"
            :seed="seed"
            :selected="selectedSeedId === seed.id"
            @select="selectSeed"
          />
        </div>
      </section>

      <SeedDetailPanel
        :seed="selectedSeed"
        :loading="detailLoading"
        :saving="saveLoading"
        :operating="operationLoading"
        :error="detailError || operationError"
        @save="updateSeed"
        @archive="archiveSelectedSeed"
        @restore="restoreSelectedSeed"
        @open-workspace="openSelectedWorkspace"
      />
    </div>

    <SeedCommandModal
      :open="modalOpen"
      :loading="createLoading"
      :error="createError"
      @close="modalOpen = false"
      @create="handleCreate"
    />
  </section>
</template>
