<script setup lang="ts">
const props = defineProps<{
  markdown: string
}>()

type MarkdownBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list-item'; text: string }
  | { kind: 'code'; text: string }

const blocks = computed<MarkdownBlock[]>(() => {
  const lines = props.markdown.split(/\r?\n/)
  const parsed: MarkdownBlock[] = []
  let codeLines: string[] = []
  let inCode = false

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (line.trim().startsWith('```')) {
      if (inCode) {
        parsed.push({ kind: 'code', text: codeLines.join('\n') })
        codeLines = []
        inCode = false
      } else {
        inCode = true
      }
      continue
    }

    if (inCode) {
      codeLines.push(rawLine)
      continue
    }

    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('### ')) {
      parsed.push({ kind: 'heading', level: 3, text: trimmed.slice(4) })
      continue
    }

    if (trimmed.startsWith('## ')) {
      parsed.push({ kind: 'heading', level: 2, text: trimmed.slice(3) })
      continue
    }

    if (trimmed.startsWith('# ')) {
      parsed.push({ kind: 'heading', level: 1, text: trimmed.slice(2) })
      continue
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      parsed.push({ kind: 'list-item', text: trimmed.slice(2) })
      continue
    }

    parsed.push({ kind: 'paragraph', text: trimmed })
  }

  if (codeLines.length > 0) {
    parsed.push({ kind: 'code', text: codeLines.join('\n') })
  }

  return parsed
})
</script>

<template>
  <article class="cf-markdown-viewer">
    <p v-if="!markdown.trim()" class="cf-markdown-empty">暂无正文</p>
    <template v-for="(block, index) in blocks" :key="`${block.kind}-${index}`">
      <h2 v-if="block.kind === 'heading' && block.level === 1">{{ block.text }}</h2>
      <h3 v-else-if="block.kind === 'heading' && block.level === 2">{{ block.text }}</h3>
      <h4 v-else-if="block.kind === 'heading' && block.level === 3">{{ block.text }}</h4>
      <ul v-else-if="block.kind === 'list-item'">
        <li>{{ block.text }}</li>
      </ul>
      <pre v-else-if="block.kind === 'code'"><code>{{ block.text }}</code></pre>
      <p v-else>{{ block.text }}</p>
    </template>
  </article>
</template>
