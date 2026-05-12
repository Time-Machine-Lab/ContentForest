import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

test('workspace opens nutrient workbench without leaving the canvas', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('nutrientWorkbenchOpen'), true)
  assert.equal(workspacePage.includes('title="打开营养工作台"'), true)
  assert.equal(workspacePage.includes('<NutrientWorkbenchDialog'), true)
  assert.equal(workspacePage.includes('@close="nutrientWorkbenchOpen = false"'), true)
  assert.equal(workspacePage.includes('navigateTo(`/nutrients'), false)
})

test('seed scoped nutrient library exposes the same nutrient workbench entry', () => {
  const nutrientPage = readProjectFile('app/pages/nutrients/index.vue')

  assert.equal(nutrientPage.includes('selectedSeedScopedSeedId'), true)
  assert.equal(nutrientPage.includes('canOpenNutrientWorkbench'), true)
  assert.equal(nutrientPage.includes('营养工作台'), true)
  assert.equal(nutrientPage.includes('<NutrientWorkbenchDialog'), true)
})

test('nutrient workbench dialog has three panes and narrow screen tabs', () => {
  const dialog = readProjectFile('app/components/nutrient/NutrientWorkbenchDialog.vue')

  assert.equal(dialog.includes('cf-nutrient-workbench-backdrop'), true)
  assert.equal(dialog.includes('cf-nutrient-workbench-dialog'), true)
  assert.equal(dialog.includes('cf-nutrient-workbench-layout'), true)
  assert.equal(dialog.includes('cf-nutrient-card-rail'), true)
  assert.equal(dialog.includes('cf-nutrient-agent-panel'), true)
  assert.equal(dialog.includes('cf-nutrient-suggestion-rail'), true)
  assert.equal(dialog.includes('cf-nutrient-workbench-tabs'), true)
  assert.equal(dialog.includes('@media (max-width: 900px)'), true)
  assert.equal(dialog.includes('grid-template-columns: minmax(250px, 300px) minmax(0, 1fr) minmax(250px, 320px)'), true)
})

test('nutrient workbench marks missing suggestion queue as backend dependency', () => {
  const nutrientTypes = readProjectFile('src/modules/nutrient/types.ts')

  assert.equal(nutrientTypes.includes('NUTRIENT_WORKBENCH_BACKEND_DEPENDENCIES'), true)
  assert.equal(nutrientTypes.includes('依赖后端更新'), true)
  assert.equal(nutrientTypes.includes('枝化生长缺口建议队列'), true)
})
