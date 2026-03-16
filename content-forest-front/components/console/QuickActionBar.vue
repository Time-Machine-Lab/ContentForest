<template>
  <div class="h-12 flex items-center justify-between px-6 bg-void-2/60 backdrop-blur border-b border-bio-green/10">
    <!-- View Tabs -->
    <div class="flex items-center h-full">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :disabled="tab.disabled"
        class="relative h-full px-4 font-mono text-xs tracking-widest uppercase transition-colors duration-300"
        :class="[
          tab.disabled
            ? 'text-mist-2 opacity-40 cursor-not-allowed'
            : activeView === tab.id
              ? 'text-bio-green'
              : 'text-slate-400 hover:text-slate-200 cursor-pointer'
        ]"
        @click="!tab.disabled && emit('update:activeView', tab.id)"
      >
        {{ tab.label }}
        <!-- Active indicator -->
        <span
          v-if="activeView === tab.id && !tab.disabled"
          class="absolute bottom-0 left-0 right-0 h-[2px] bg-bio-green"
        />
        <!-- Coming soon badge -->
        <span
          v-if="tab.disabled"
          class="ml-2 font-mono text-[9px] text-mist-3 tracking-[0.15em]"
        >// soon</span>
      </button>
    </div>

    <!-- CTA: New Seed -->
    <button
      class="flex items-center gap-2 font-mono text-xs tracking-widest uppercase px-4 py-1.5 bg-bio-green text-void hover:bg-bio-green/80 transition-all duration-300"
      @click="emit('new-seed')"
    >
      <span class="text-base leading-none">+</span>
      新建种子
    </button>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  id: string
  label: string
  disabled?: boolean
}

const tabs: Tab[] = [
  { id: 'seeds', label: '种子库' },
  { id: 'fruits', label: '果实管理', disabled: true },
  { id: 'dashboard', label: '数据看板', disabled: true },
]

const props = defineProps<{
  activeView: string
}>()

const emit = defineEmits<{
  'update:activeView': [view: string]
  'new-seed': []
}>()
</script>
