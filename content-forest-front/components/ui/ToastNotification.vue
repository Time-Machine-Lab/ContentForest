<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 translate-y-[-8px]"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-[-8px]"
    >
      <div
        v-if="toast.visible.value"
        class="fixed top-4 right-4 z-50 font-mono text-xs tracking-widest px-4 py-3 bg-void-2 border border-bio-green/40 text-bio-green max-w-xs"
      >
        <span class="text-mutation mr-2">//</span>{{ toast.message.value }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const toast = useToast()
</script>
