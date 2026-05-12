<script setup lang="ts">
const props = defineProps<{
  markdown: string
  headingIdPrefix?: string
}>()

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderInline(value: string) {
  let html = escapeHtml(value)

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  html = html.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>')

  return html
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function renderTable(lines: string[]) {
  const [headLine, , ...bodyLines] = lines
  const heads = parseTableRow(headLine ?? '')
  const rows = bodyLines.map(parseTableRow)

  return [
    '<div class="cf-markdown-table-wrap"><table>',
    '<thead><tr>',
    heads.map((cell) => `<th>${renderInline(cell)}</th>`).join(''),
    '</tr></thead>',
    '<tbody>',
    rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join(''),
    '</tbody></table></div>',
  ].join('')
}

function renderList(items: string[], ordered: boolean) {
  const tag = ordered ? 'ol' : 'ul'
  return `<${tag}>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</${tag}>`
}

function renderParagraph(lines: string[]) {
  return `<p>${lines.map((line) => renderInline(line.trim())).join('<br>')}</p>`
}

const renderedMarkdown = computed(() => {
  const lines = props.markdown.split(/\r?\n/)
  const html: string[] = []
  let index = 0
  let blockIndex = 0

  while (index < lines.length) {
    const rawLine = lines[index] ?? ''
    const trimmed = rawLine.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !(lines[index] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[index] ?? '')
        index += 1
      }
      if (index < lines.length) index += 1
      html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
      blockIndex += 1
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed)
    if (heading) {
      const level = Math.min(6, heading[1]?.length ?? 1)
      const tag = level <= 1 ? 'h2' : level === 2 ? 'h3' : 'h4'
      const id = props.headingIdPrefix ? ` id="${props.headingIdPrefix}-${blockIndex}"` : ''
      html.push(`<${tag}${id}>${renderInline(heading[2] ?? '')}</${tag}>`)
      index += 1
      blockIndex += 1
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      html.push('<hr>')
      index += 1
      blockIndex += 1
      continue
    }

    if (index + 1 < lines.length && trimmed.includes('|') && isTableDivider(lines[index + 1] ?? '')) {
      const tableLines = [rawLine, lines[index + 1] ?? '']
      index += 2
      while (index < lines.length && (lines[index] ?? '').trim().includes('|')) {
        tableLines.push(lines[index] ?? '')
        index += 1
      }
      html.push(renderTable(tableLines))
      blockIndex += 1
      continue
    }

    const unorderedItems: string[] = []
    while (index < lines.length) {
      const match = /^\s*[-*]\s+(.+)$/.exec(lines[index] ?? '')
      if (!match) break
      unorderedItems.push(match[1] ?? '')
      index += 1
    }
    if (unorderedItems.length > 0) {
      html.push(renderList(unorderedItems, false))
      blockIndex += 1
      continue
    }

    const orderedItems: string[] = []
    while (index < lines.length) {
      const match = /^\s*\d+[.)]\s+(.+)$/.exec(lines[index] ?? '')
      if (!match) break
      orderedItems.push(match[1] ?? '')
      index += 1
    }
    if (orderedItems.length > 0) {
      html.push(renderList(orderedItems, true))
      blockIndex += 1
      continue
    }

    const quoteLines: string[] = []
    while (index < lines.length) {
      const match = /^\s*>\s?(.+)$/.exec(lines[index] ?? '')
      if (!match) break
      quoteLines.push(match[1] ?? '')
      index += 1
    }
    if (quoteLines.length > 0) {
      html.push(`<blockquote>${renderParagraph(quoteLines)}</blockquote>`)
      blockIndex += 1
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const line = lines[index] ?? ''
      const nextLine = lines[index + 1] ?? ''
      const nextTrimmed = line.trim()
      if (!nextTrimmed) break
      if (nextTrimmed.startsWith('```') || /^(#{1,6})\s+/.test(nextTrimmed) || /^(-{3,}|\*{3,}|_{3,})$/.test(nextTrimmed)) break
      if (/^\s*[-*]\s+/.test(nextTrimmed) || /^\s*\d+[.)]\s+/.test(nextTrimmed) || /^\s*>\s?/.test(nextTrimmed)) break
      if (nextTrimmed.includes('|') && isTableDivider(nextLine)) break
      paragraphLines.push(line)
      index += 1
    }

    if (paragraphLines.length > 0) {
      html.push(renderParagraph(paragraphLines))
      blockIndex += 1
    } else {
      index += 1
    }
  }

  return html.join('\n')
})
</script>

<template>
  <article class="cf-markdown-viewer">
    <p v-if="!markdown.trim()" class="cf-markdown-empty">暂无正文</p>
    <!-- eslint-disable-next-line vue/no-v-html -- renderedMarkdown is generated only from escaped Markdown text. -->
    <div v-else v-html="renderedMarkdown" />
  </article>
</template>

<style scoped>
.cf-markdown-viewer {
  min-width: 0;
  color: inherit;
  font-size: 13px;
  line-height: 1.72;
  overflow-wrap: anywhere;
}

.cf-markdown-viewer :deep(*) {
  box-sizing: border-box;
}

.cf-markdown-viewer :deep(h2),
.cf-markdown-viewer :deep(h3),
.cf-markdown-viewer :deep(h4) {
  margin: 14px 0 8px;
  color: #eef6f7;
  font-weight: 800;
  line-height: 1.35;
}

.cf-markdown-viewer :deep(h2) {
  font-size: 16px;
}

.cf-markdown-viewer :deep(h3) {
  font-size: 14px;
}

.cf-markdown-viewer :deep(h4) {
  font-size: 13px;
}

.cf-markdown-viewer :deep(p),
.cf-markdown-viewer :deep(ul),
.cf-markdown-viewer :deep(ol),
.cf-markdown-viewer :deep(blockquote),
.cf-markdown-viewer :deep(pre),
.cf-markdown-viewer :deep(.cf-markdown-table-wrap) {
  margin: 0 0 12px;
}

.cf-markdown-viewer :deep(strong) {
  color: #f5fbfb;
  font-weight: 800;
}

.cf-markdown-viewer :deep(a) {
  color: #9edcff;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.cf-markdown-viewer :deep(a:hover) {
  text-decoration: underline;
}

.cf-markdown-viewer :deep(ul),
.cf-markdown-viewer :deep(ol) {
  display: grid;
  gap: 6px;
  padding-left: 20px;
}

.cf-markdown-viewer :deep(li) {
  padding-left: 2px;
}

.cf-markdown-viewer :deep(hr) {
  height: 1px;
  margin: 16px 0;
  border: 0;
  background: rgba(255, 255, 255, .12);
}

.cf-markdown-viewer :deep(blockquote) {
  padding: 8px 10px;
  border-left: 2px solid rgba(94, 215, 197, .38);
  border-radius: 6px;
  background: rgba(94, 215, 197, .06);
  color: #c7d2d4;
}

.cf-markdown-viewer :deep(pre) {
  overflow: auto;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 7px;
  background: rgba(0, 0, 0, .28);
}

.cf-markdown-viewer :deep(code) {
  border-radius: 5px;
  background: rgba(255, 255, 255, .08);
  color: #d7fff8;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: .92em;
}

.cf-markdown-viewer :deep(p code),
.cf-markdown-viewer :deep(li code) {
  padding: 1px 4px;
}

.cf-markdown-viewer :deep(pre code) {
  padding: 0;
  background: transparent;
  white-space: pre;
}

.cf-markdown-viewer :deep(.cf-markdown-table-wrap) {
  width: 100%;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 7px;
}

.cf-markdown-viewer :deep(table) {
  width: 100%;
  min-width: 520px;
  border-collapse: collapse;
}

.cf-markdown-viewer :deep(th),
.cf-markdown-viewer :deep(td) {
  padding: 8px 9px;
  border-bottom: 1px solid rgba(255, 255, 255, .08);
  border-right: 1px solid rgba(255, 255, 255, .08);
  text-align: left;
  vertical-align: top;
}

.cf-markdown-viewer :deep(th) {
  background: rgba(255, 255, 255, .055);
  color: #edf4f1;
  font-weight: 800;
}

.cf-markdown-viewer :deep(td) {
  color: #cfd8d9;
}

.cf-markdown-empty {
  margin: 0;
  color: rgba(237, 244, 241, .55);
}
</style>
