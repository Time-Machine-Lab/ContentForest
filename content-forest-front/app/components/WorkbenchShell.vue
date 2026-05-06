<script setup lang="ts">
const route = useRoute()

const navItems = [
  { label: '种子库', to: '/seeds', icon: '◇', enabled: true },
  { label: '生成器', to: '/generators', icon: '⌘', enabled: true },
  { label: '营养库', to: '/nutrients', icon: '◎', enabled: false },
]

function isActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <div class="cf-app-shell">
    <aside class="cf-sidebar" aria-label="内容森林主导航">
      <NuxtLink class="cf-brand" to="/seeds" aria-label="内容森林">
        <span class="cf-brand-mark" aria-hidden="true" />
        <span class="cf-brand-copy">
          <strong>Content Forest</strong>
          <span>Quiet Growth Workspace</span>
        </span>
      </NuxtLink>

      <nav class="cf-nav-section" aria-label="工作台">
        <p class="cf-nav-label">Workspace</p>
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          class="cf-nav-item"
          :class="{ 'is-active': isActive(item.to), 'is-disabled': !item.enabled }"
          :to="item.to"
          :aria-disabled="!item.enabled"
        >
          <span class="cf-nav-icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="cf-nav-text">{{ item.label }}</span>
          <span v-if="!item.enabled" class="cf-nav-state">soon</span>
        </NuxtLink>
      </nav>

      <nav class="cf-nav-section" aria-label="快速入口">
        <p class="cf-nav-label">Quick Access</p>
        <button class="cf-nav-item is-disabled" type="button" disabled>
          <span class="cf-nav-icon" aria-hidden="true">↵</span>
          <span class="cf-nav-text">最近工作区</span>
          <span class="cf-nav-state">soon</span>
        </button>
        <button class="cf-nav-item is-disabled" type="button" disabled>
          <span class="cf-nav-icon" aria-hidden="true">⌕</span>
          <span class="cf-nav-text">全局搜索</span>
          <span class="cf-nav-state">soon</span>
        </button>
      </nav>

      <section class="cf-sidebar-note" aria-label="当前阶段">
        <span class="cf-note-dot" aria-hidden="true" />
        <div>
          <strong>Phase One</strong>
          <span>种子与生成器建设中</span>
        </div>
      </section>
    </aside>

    <main class="cf-main">
      <slot />
    </main>
  </div>
</template>
