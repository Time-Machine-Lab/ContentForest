<script setup lang="ts">
const route = useRoute()

const isReadOnly = computed(() => route.query.readonly === '1')
</script>

<template>
  <section class="cf-placeholder-page">
    <header class="cf-page-topbar">
      <div>
        <h1>种子工作区</h1>
        <p>{{ isReadOnly ? '当前种子已归档，工作区以只读语义进入。' : '内容树画布会在后续变更中实现。' }}</p>
      </div>
      <NuxtLink class="cf-secondary-action" to="/seeds">返回种子库</NuxtLink>
    </header>
    <div class="cf-placeholder-panel">
      <span class="cf-placeholder-icon" aria-hidden="true">◇</span>
      <h2>{{ isReadOnly ? '只读工作区占位' : '工作区占位' }}</h2>
      <p>已完成根节点读取和路由承接；内容树、枝化生长和果实节点不属于本次实现范围。</p>
    </div>
  </section>
</template>
