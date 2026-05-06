import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

test('seed library keeps archived filter inside seed page instead of sidebar', () => {
  const shell = readProjectFile('app/components/WorkbenchShell.vue')
  const seedPage = readProjectFile('app/pages/seeds/index.vue')

  assert.equal(shell.includes('已归档'), false)
  assert.equal(seedPage.includes('已归档'), true)
  assert.equal(seedPage.includes("changeView('archived')"), true)
})

test('seed library exposes create, edit, archive, restore and workspace actions', () => {
  const seedPage = readProjectFile('app/pages/seeds/index.vue')
  const detailPanel = readProjectFile('app/components/seed/SeedDetailPanel.vue')
  const modal = readProjectFile('app/components/seed/SeedCommandModal.vue')

  assert.equal(seedPage.includes('@create="handleCreate"'), true)
  assert.equal(detailPanel.includes("emit('save'"), true)
  assert.equal(detailPanel.includes("emit('archive'"), true)
  assert.equal(detailPanel.includes("emit('restore'"), true)
  assert.equal(detailPanel.includes("emit('openWorkspace'"), true)
  assert.equal(modal.includes('标题和 Markdown 正文都不能为空'), true)
})

test('seed library uses exception notice component for visible errors', () => {
  const seedPage = readProjectFile('app/pages/seeds/index.vue')
  const detailPanel = readProjectFile('app/components/seed/SeedDetailPanel.vue')
  const modal = readProjectFile('app/components/seed/SeedCommandModal.vue')
  const exceptionNotice = readProjectFile('app/components/base/ExceptionNotice.vue')

  assert.equal(seedPage.includes('<ExceptionNotice'), true)
  assert.equal(detailPanel.includes('<ExceptionNotice'), true)
  assert.equal(modal.includes('<ExceptionNotice'), true)
  assert.equal(exceptionNotice.includes('role="alert"'), true)
})
