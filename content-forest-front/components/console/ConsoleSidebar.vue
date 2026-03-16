<template>
  <aside
    class="relative flex flex-col h-full border-r border-bio-green/10 bg-void-2/80 backdrop-blur transition-all duration-300 shrink-0 overflow-hidden"
    :class="collapsed ? 'w-14' : 'w-56'"
  >
    <!-- 顶部光晕 -->
    <div class="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-bio-green/5 to-transparent pointer-events-none" />

    <!-- Logo 区 -->
    <div class="relative flex items-center h-14 border-b border-bio-green/10 px-4 shrink-0">
      <NuxtLink to="/" class="flex items-center gap-3 group min-w-0">
        <div class="w-5 h-5 relative shrink-0">
          <div class="absolute inset-0 border border-bio-green/60 group-hover:border-bio-green transition-colors duration-300" />
          <div class="absolute inset-[3px] bg-bio-green/20 group-hover:bg-bio-green/40 transition-colors duration-300" />
          <div class="absolute inset-[6px] bg-bio-green" />
        </div>
        <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 w-0" enter-to-class="opacity-100" leave-active-class="transition-all duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0 w-0">
          <span v-if="!collapsed" class="font-mono text-xs tracking-widest uppercase whitespace-nowrap overflow-hidden">
            <span class="text-bio-green">Content</span><span class="text-slate-500">.</span><span class="text-slate-300">Forest</span>
          </span>
        </Transition>
      </NuxtLink>
    </div>

    <!-- 导航菜单 -->
    <nav class="relative flex-1 py-4 flex flex-col gap-1 px-2 overflow-hidden">
      <div
        v-for="item in navItems"
        :key="item.id"
        class="relative flex items-center h-9 px-2 cursor-pointer select-none transition-all duration-200"
        :class="[
          item.disabled
            ? 'opacity-40 cursor-not-allowed'
            : activeView === item.id
              ? 'text-bio-green bg-bio-green/5'
              : 'text-slate-400 hover:text-slate-200 hover:bg-void-3/60'
        ]"
        @click="!item.disabled && emit('update:activeView', item.id)"
      >
        <!-- Accent bar -->
        <span
          v-if="activeView === item.id && !item.disabled"
          class="absolute left-0 top-1 bottom-1 w-[2px] bg-bio-green"
        />

        <!-- Icon -->
        <span class="shrink-0 flex items-center justify-center w-5 h-5">
          <Icon :icon="item.icon" class="text-base" />
        </span>

        <!-- Label -->
        <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-all duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
          <span v-if="!collapsed" class="ml-3 font-mono text-xs tracking-widest uppercase whitespace-nowrap overflow-hidden">
            {{ item.label }}
            <span v-if="item.disabled" class="ml-1 text-[9px] text-mist-3">// soon</span>
          </span>
        </Transition>

        <!-- Tooltip when collapsed -->
        <span
          v-if="collapsed"
          class="absolute left-full ml-2 px-2 py-1 bg-void-2 border border-bio-green/20 font-mono text-[10px] tracking-widest uppercase text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity duration-200"
        >{{ item.label }}</span>
      </div>
    </nav>

    <!-- 底部：用户信息 + 折叠按钮 -->
    <div class="relative border-t border-bio-green/10 px-2 py-3 flex flex-col gap-2 shrink-0">
      <!-- 用户信息 -->
      <div class="flex items-center gap-2 px-2 h-8">
        <div class="w-2 h-2 bg-bio-green shrink-0 animate-pulse-slow" />
        <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-all duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
          <span v-if="!collapsed" class="font-mono text-[10px] tracking-widest uppercase text-slate-400 whitespace-nowrap overflow-hidden">local_admin</span>
        </Transition>
      </div>

      <!-- 折叠按钮 -->
      <button
        class="flex items-center justify-center w-full h-8 text-mist-2 hover:text-bio-green border border-transparent hover:border-bio-green/20 transition-all duration-200"
        @click="emit('update:collapsed', !collapsed)"
      >
        <Icon :icon="collapsed ? 'ph:sidebar-simple' : 'ph:sidebar-simple-fill'" class="text-base" />
        <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-all duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
          <span v-if="!collapsed" class="ml-2 font-mono text-[10px] tracking-widest uppercase">收起</span>
        </Transition>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const props = defineProps<{
  activeView: string
  collapsed: boolean
}>()

const emit = defineEmits<{
  'update:activeView': [view: string]
  'update:collapsed': [collapsed: boolean]
}>()

const navItems = [
  { id: 'seeds', label: '种子库', icon: 'ph:plant' },
  { id: 'fruits', label: '果实管理', icon: 'ph:leaf', disabled: true },
  { id: 'workspace', label: '内容工坊', icon: 'ph:tree-structure', disabled: true },
  { id: 'dashboard', label: '数据看板', icon: 'ph:chart-line-up', disabled: true },
  { id: 'settings', label: '设置', icon: 'ph:gear', disabled: true },
]
</script>
