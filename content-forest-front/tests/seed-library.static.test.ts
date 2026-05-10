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

test('seed library uses reading worktable structure', () => {
  const seedPage = readProjectFile('app/pages/seeds/index.vue')
  const detailPanel = readProjectFile('app/components/seed/SeedDetailPanel.vue')
  const styles = readProjectFile('app/assets/styles/workbench.css')

  assert.equal(seedPage.includes('cf-seed-worktable'), true)
  assert.equal(seedPage.includes('cf-seed-index-panel'), true)
  assert.equal(detailPanel.includes('cf-seed-reader'), true)
  assert.equal(detailPanel.includes('cf-seed-helper'), true)
  assert.equal(detailPanel.includes('文档目录'), true)
  assert.equal(styles.includes('.cf-seed-worktable'), true)
  assert.equal(styles.includes('.cf-seed-reader-area'), true)
})

test('seed library keeps primary workspace action above lower-priority management actions', () => {
  const detailPanel = readProjectFile('app/components/seed/SeedDetailPanel.vue')

  assert.equal(detailPanel.includes("emit('openWorkspace')"), true)
  assert.equal(detailPanel.includes('cf-seed-reader-actions'), true)
  assert.equal(detailPanel.includes('cf-seed-more-menu'), true)
  assert.equal(detailPanel.includes('归档种子'), true)
  assert.equal(detailPanel.includes('回档种子'), true)
})

test('seed library edit mode is separated from markdown reading mode', () => {
  const detailPanel = readProjectFile('app/components/seed/SeedDetailPanel.vue')

  assert.equal(detailPanel.includes('cf-seed-edit-card'), true)
  assert.equal(detailPanel.includes('cf-seed-doc-card'), true)
  assert.equal(detailPanel.includes('MarkdownViewer'), true)
  assert.equal(detailPanel.includes('heading-id-prefix="seed-doc"'), true)
  assert.equal(detailPanel.includes('标题和 Markdown 正文都不能为空'), true)
})
