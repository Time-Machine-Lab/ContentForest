import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

test('generator management page is enabled in workbench navigation', () => {
  const shell = readProjectFile('app/components/WorkbenchShell.vue')

  assert.equal(shell.includes("{ label: '生成器', to: '/generators', icon: '⌘', enabled: true }"), true)
})

test('generator management page keeps growth and deletion out of scope', () => {
  const page = readProjectFile('app/pages/generators/index.vue')
  const detailPanel = readProjectFile('app/components/generator/GeneratorDetailPanel.vue')

  assert.equal(page.includes('用于枝化生长'), false)
  assert.equal(detailPanel.includes('用于枝化生长'), false)
  assert.equal(page.includes('删除'), false)
  assert.equal(detailPanel.includes('删除'), false)
  assert.equal(detailPanel.includes("emit('reupload'"), true)
  assert.equal(detailPanel.includes("emit('enable'"), true)
  assert.equal(detailPanel.includes("emit('disable'"), true)
})

test('generator management uses exception notice for visible errors', () => {
  const page = readProjectFile('app/pages/generators/index.vue')
  const detailPanel = readProjectFile('app/components/generator/GeneratorDetailPanel.vue')
  const importModal = readProjectFile('app/components/generator/GeneratorImportModal.vue')
  const reuploadModal = readProjectFile('app/components/generator/GeneratorReuploadModal.vue')

  assert.equal(page.includes('<ExceptionNotice'), true)
  assert.equal(detailPanel.includes('<ExceptionNotice'), true)
  assert.equal(importModal.includes('<ExceptionNotice'), true)
  assert.equal(reuploadModal.includes('<ExceptionNotice'), true)
})
