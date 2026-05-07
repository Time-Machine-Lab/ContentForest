import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

test('nutrient page is enabled in workbench navigation', () => {
  const shell = readProjectFile('app/components/WorkbenchShell.vue')

  assert.equal(shell.includes("{ label: '营养库', to: '/nutrients', icon: '◎', enabled: true }"), true)
})

test('nutrient page keeps first phase exclusions out of the UI', () => {
  const page = readProjectFile('app/pages/nutrients/index.vue')

  assert.equal(page.includes('文件上传'), false)
  assert.equal(page.includes('网页采集'), false)
  assert.equal(page.includes('知识库问答'), false)
  assert.equal(page.includes('向量检索'), false)
  assert.equal(page.includes('基因库管理'), false)
  assert.equal(page.includes('contentLocation'), false)
  assert.equal(page.includes('seed_scoped'), true)
  assert.equal(page.includes('Markdown 正文'), true)
})

test('nutrient management uses knowledge-base layout and preserves archive semantics', () => {
  const page = readProjectFile('app/pages/nutrients/index.vue')
  const composable = readProjectFile('app/composables/useNutrientLibrary.ts')

  assert.equal(page.includes('<ExceptionNotice'), true)
  assert.equal(page.includes('cf-kb-layout'), true)
  assert.equal(page.includes('cf-kb-sidebar'), true)
  assert.equal(page.includes('cf-kb-docs'), true)
  assert.equal(page.includes('cf-kb-reader'), true)
  assert.equal(page.includes('restoreSelectedLibrary'), true)
  assert.equal(page.includes('restoreSelectedContent'), true)
  assert.equal(page.includes('删除'), false)
  assert.equal(composable.includes('listReferableNutrients'), true)
  assert.equal(composable.includes('listContents(selectedLibraryId.value, { archiveState: nextContentView })'), true)
})
