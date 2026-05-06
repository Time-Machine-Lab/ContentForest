<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  message: string
  actionLabel?: string
}>(), {
  title: '出现异常',
  actionLabel: '',
})

defineEmits<{
  action: []
}>()
</script>

<template>
  <section class="cf-exception-notice" role="alert">
    <span class="cf-exception-mark" aria-hidden="true">!</span>
    <div class="cf-exception-copy">
      <strong>{{ title }}</strong>
      <span>{{ message }}</span>
    </div>
    <button
      v-if="actionLabel"
      class="cf-exception-action"
      type="button"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </section>
</template>
