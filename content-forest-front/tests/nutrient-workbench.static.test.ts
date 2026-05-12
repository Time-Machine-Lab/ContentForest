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
  assert.equal(nutrientTypes.includes('可沉淀营养块合并与忽略'), true)
})

test('nutrient workbench exposes card lifecycle actions and dependency restore state', () => {
  const dialog = readProjectFile('app/components/nutrient/NutrientWorkbenchDialog.vue')

  assert.equal(dialog.includes('settleSelectedCard'), true)
  assert.equal(dialog.includes('archiveSelectedCard'), true)
  assert.equal(dialog.includes('toggleDefaultForGrowth'), true)
  assert.equal(dialog.includes('referenceSelectedCard'), true)
  assert.equal(dialog.includes('回档营养卡片依赖后端更新'), true)
  assert.equal(dialog.includes("changed: []"), true)
  assert.equal(dialog.includes("emit('reference'"), true)
  assert.equal(dialog.includes("kind: 'nutrient_card'"), true)
  assert.equal(dialog.includes("kind: 'nutrient'"), true)
})

test('nutrient research chat loads sessions and submits messages', () => {
  const dialog = readProjectFile('app/components/nutrient/NutrientWorkbenchDialog.vue')

  assert.equal(dialog.includes('loadResearchSession'), true)
  assert.equal(dialog.includes('createResearchSession'), true)
  assert.equal(dialog.includes('bindCardConversation'), true)
  assert.equal(dialog.includes('submitResearchMessage'), true)
  assert.equal(dialog.includes('submitResearchMessage(session.id, { message })'), true)
  assert.equal(dialog.includes('retryLastResearchMessage'), true)
  assert.equal(dialog.includes('@keydown.enter="submitComposerKeyboard"'), true)
  assert.equal(dialog.includes('cf-nutrient-message-list'), true)
  assert.equal(dialog.includes('cf-nutrient-message'), true)
  assert.equal(dialog.includes('cf-nutrient-chat-empty'), true)
})

test('nutrient research chat renders depositable blocks with actions', () => {
  const dialog = readProjectFile('app/components/nutrient/NutrientWorkbenchDialog.vue')

  assert.equal(dialog.includes('visibleDepositableBlocks'), true)
  assert.equal(dialog.includes('cf-nutrient-depositable-block'), true)
  assert.equal(dialog.includes('createCardFromBlock'), true)
  assert.equal(dialog.includes('mergeBlockIntoSelectedCard'), true)
  assert.equal(dialog.includes('ignoreDepositableBlock'), true)
  assert.equal(dialog.includes('生成卡片'), true)
  assert.equal(dialog.includes('合并到当前卡片'), true)
  assert.equal(dialog.includes('忽略'), true)
})

test('nutrient research chat exposes editable research templates', () => {
  const dialog = readProjectFile('app/components/nutrient/NutrientWorkbenchDialog.vue')

  assert.equal(dialog.includes('researchTemplates'), true)
  assert.equal(dialog.includes('爆款表达'), true)
  assert.equal(dialog.includes('标题封面'), true)
  assert.equal(dialog.includes('竞品打法'), true)
  assert.equal(dialog.includes('痛点语言'), true)
  assert.equal(dialog.includes('避雷点'), true)
  assert.equal(dialog.includes('趋势变化'), true)
  assert.equal(dialog.includes('applyResearchTemplate'), true)
})
