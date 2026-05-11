import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

test('seed-scoped gene library page follows preview structure without sidebar entry', () => {
  const shell = readProjectFile('app/components/WorkbenchShell.vue')
  const page = readProjectFile('app/pages/seeds/[seedId]/genes.vue')
  const styles = readProjectFile('app/assets/styles/workbench.css')

  assert.equal(shell.includes("label: 'gene-library'"), false)
  assert.equal(page.includes('cf-gene-library-layout'), true)
  assert.equal(page.includes('cf-gene-lineage-board'), true)
  assert.equal(page.includes('cf-gene-insight-browser'), true)
  assert.equal(page.includes('cf-gene-insight-detail'), true)
  assert.equal(page.includes('geneApi.listInsights'), true)
  assert.equal(styles.includes('.cf-gene-library-layout'), true)
})

test('gene library page is for confirmed experience browsing, not extraction operations', () => {
  const page = readProjectFile('app/pages/seeds/[seedId]/genes.vue')

  assert.equal(page.includes('startExtractionTask'), false)
  assert.equal(page.includes('ignoreReminder'), false)
  assert.equal(page.includes('cf-gene-library-page'), true)
  assert.equal(page.includes('openWorkspace'), true)
})

test('gene library page does not surface system paths or raw source identifiers', () => {
  const page = readProjectFile('app/pages/seeds/[seedId]/genes.vue')

  assert.equal(page.includes('library?.contentLocation'), false)
  assert.equal(page.includes('insight.contentLocation'), false)
  assert.equal(page.includes('<strong>{{ source.sourceId }}</strong>'), false)
  assert.equal(page.includes('证据 {{ index + 1 }}'), true)
  assert.equal(page.includes('cleanSystemText'), true)
  assert.equal(page.includes('displayGeneContext'), true)
})
