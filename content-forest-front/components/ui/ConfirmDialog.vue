<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center" @click.self="emit('cancel')">
      <div class="bg-void-2 border border-bio-green/20 p-8 max-w-sm w-full mx-4">
        <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase mb-4">// Confirm</div>
        <p class="font-sans text-sm text-slate-300 leading-relaxed mb-8">{{ message }}</p>
        <div class="flex gap-3 justify-end">
          <button
            class="font-mono text-xs tracking-widest uppercase px-6 py-2 border border-bio-green/20 text-slate-400 hover:text-slate-200 hover:border-bio-green/40 transition-all duration-300"
            @click="emit('cancel')"
          >取消</button>
          <button
            class="font-mono text-xs tracking-widest uppercase px-6 py-2 bg-death-red/20 border border-death-red/60 text-death-red hover:bg-death-red/30 transition-all duration-300"
            @click="emit('confirm')"
          >确认删除</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ message: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>
