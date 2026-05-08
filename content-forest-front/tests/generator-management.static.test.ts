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

test('generator management uses worktable structure and card browsing', () => {
  const page = readProjectFile('app/pages/generators/index.vue')

  assert.equal(page.includes('cf-generator-worktable'), true)
  assert.equal(page.includes('Skill Drop Lab'), true)
  assert.equal(page.includes('生成器星图'), true)
  assert.equal(page.includes('cf-generator-card-grid'), true)
  assert.equal(page.includes('filteredGenerators'), true)
  assert.equal(page.includes("changeView('enabled')"), true)
  assert.equal(page.includes("changeView('disabled')"), true)
  assert.equal(page.includes("changeView('all')"), true)
  assert.equal(page.includes('generator.contentLocation'), false)
})

test('generator import supports drag upload and field-level validation', () => {
  const page = readProjectFile('app/pages/generators/index.vue')

  assert.equal(page.includes('@dragover="handleImportDragOver"'), true)
  assert.equal(page.includes('@drop="handleImportDrop"'), true)
  assert.equal(page.includes('importFieldErrors.name'), true)
  assert.equal(page.includes('importFieldErrors.description'), true)
  assert.equal(page.includes('importFieldErrors.file'), true)
  assert.equal(page.includes("importFieldErrors.name = importName.value.trim() ? '' : '请补充生成器名称'"), true)
  assert.equal(page.includes("importFieldErrors.description = importDescription.value.trim() ? '' : '请补充生成器描述'"), true)
  assert.equal(page.includes("importFieldErrors.file = importFile.value ? '' : '请上传 Skill zip 文件'"), true)
})

test('generator reupload supports drag upload without changing api scope', () => {
  const reuploadModal = readProjectFile('app/components/generator/GeneratorReuploadModal.vue')

  assert.equal(reuploadModal.includes('@dragover="handleDragOver"'), true)
  assert.equal(reuploadModal.includes('@drop="handleDrop"'), true)
  assert.equal(reuploadModal.includes("emit('reupload', await readFileAsBase64(file.value))"), true)
  assert.equal(reuploadModal.includes('请选择新的 Skill zip 文件'), true)
})

test('generator detail inspector exposes markdown entries and system facts only', () => {
  const detailPanel = readProjectFile('app/components/generator/GeneratorDetailPanel.vue')

  assert.equal(detailPanel.includes('Skill Markdown'), true)
  assert.equal(detailPanel.includes('文件条目'), true)
  assert.equal(detailPanel.includes('系统事实'), true)
  assert.equal(detailPanel.includes('generator.skillMarkdown'), true)
  assert.equal(detailPanel.includes('generator.entries'), true)
  assert.equal(detailPanel.includes('generator.contentLocation'), true)
  assert.equal(detailPanel.includes('运行生成器'), false)
  assert.equal(detailPanel.includes('测试生成器'), false)
  assert.equal(detailPanel.includes('编辑 Skill'), false)
})
