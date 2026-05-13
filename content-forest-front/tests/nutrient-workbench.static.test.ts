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
  assert.equal(dialog.includes('grid-template-columns: minmax(240px, 280px) minmax(460px, 1fr) minmax(240px, 300px)'), true)
  assert.equal(dialog.includes('grid-template-rows: auto auto auto minmax(0, 1fr)'), true)
  assert.equal(dialog.includes('grid-row: 4'), true)
  assert.equal(dialog.includes('align-items: stretch'), true)
  assert.equal(dialog.includes('align-self: stretch'), true)
  assert.equal(dialog.includes('box-sizing: border-box'), true)
  assert.equal(dialog.includes('height: 100%'), true)
  assert.equal(dialog.includes('overflow: hidden'), true)
  assert.equal(dialog.includes('grid-template-rows: auto minmax(0, 1fr) auto'), true)
})

test('nutrient workbench tracks available suggestions and missing feedback dependencies', () => {
  const nutrientTypes = readProjectFile('src/modules/nutrient/types.ts')
  const nutrientApi = readProjectFile('src/modules/nutrient/api.ts')

  assert.equal(nutrientTypes.includes('NUTRIENT_WORKBENCH_BACKEND_DEPENDENCIES'), true)
  assert.equal(nutrientTypes.includes('NutrientGapSuggestion'), true)
  assert.equal(nutrientApi.includes('listGapSuggestions'), true)
  assert.equal(nutrientApi.includes('adoptGapSuggestion'), true)
  assert.equal(nutrientApi.includes('ignoreGapSuggestion'), true)
  assert.equal(nutrientTypes.includes('依赖后端更新'), true)
  assert.equal(nutrientTypes.includes('营养新鲜度提醒'), true)
  assert.equal(nutrientTypes.includes('营养使用表现摘要'), true)
  assert.equal(nutrientTypes.includes('相似营养检测'), true)
  assert.equal(nutrientTypes.includes('可沉淀营养块合并与忽略'), true)
})

test('nutrient workbench exposes card lifecycle actions and dependency restore state', () => {
  const dialog = readProjectFile('app/components/nutrient/NutrientWorkbenchDialog.vue')

  assert.equal(dialog.includes('settleSelectedCard'), true)
  assert.equal(dialog.includes('archiveSelectedCard'), true)
  assert.equal(dialog.includes('toggleDefaultForGrowth'), true)
  assert.equal(dialog.includes('referenceSelectedCard'), true)
  assert.equal(dialog.includes('回档营养内容依赖后端更新'), true)
  assert.equal(dialog.includes("if (status === 'unsettled') return '草稿'"), true)
  assert.equal(dialog.includes('默认带入'), true)
  assert.equal(dialog.includes("changed: []"), true)
  assert.equal(dialog.includes("emit('reference'"), true)
  assert.equal(dialog.includes("kind: 'nutrient_card'"), true)
  assert.equal(dialog.includes("kind: 'nutrient'"), true)
  assert.equal(dialog.includes('营养卡片'), false)
  assert.equal(dialog.includes('未沉淀'), false)
  assert.equal(dialog.includes('常驻营养'), false)
})

test('nutrient research chat loads sessions and submits messages', () => {
  const dialog = readProjectFile('app/components/nutrient/NutrientWorkbenchDialog.vue')

  assert.equal(dialog.includes('loadResearchSession'), true)
  assert.equal(dialog.includes('createResearchSession'), true)
  assert.equal(dialog.includes('startNewResearchSession'), true)
  assert.equal(dialog.includes('nutrientCardId: null'), true)
  assert.equal(dialog.includes("selectedCard.value = null"), true)
  assert.equal(dialog.includes('新会话'), true)
  assert.equal(dialog.includes('bindCardConversation'), true)
  assert.equal(dialog.includes('submitResearchMessage'), true)
  assert.equal(dialog.includes('streamResearchMessage(session.id, { message }'), true)
  assert.equal(dialog.includes("event.type === 'progress'"), true)
  assert.equal(dialog.includes("event.type === 'assistant_message_delta'"), true)
  assert.equal(dialog.includes("event.type === 'depositable_block'"), true)
  assert.equal(dialog.includes('upsertResearchMessage'), true)
  assert.equal(dialog.includes('ResearchMessageView'), true)
  assert.equal(dialog.includes('createOptimisticResearchTurn'), true)
  assert.equal(dialog.includes("localStatus?: 'pending' | 'failed'"), true)
  assert.equal(dialog.includes("localStatus: 'pending'"), true)
  assert.equal(dialog.includes("localStatus: 'failed'"), true)
  assert.equal(dialog.includes('cf-nutrient-message-pulse'), true)
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
  assert.equal(dialog.includes('cf-nutrient-card-context'), true)
  assert.equal(dialog.includes('cf-nutrient-btn-primary'), true)
  assert.equal(dialog.includes('cf-nutrient-btn-secondary'), true)
  assert.equal(dialog.includes('cf-nutrient-btn-danger'), true)
  assert.equal(dialog.includes('cf-nutrient-btn-ghost'), true)
  assert.equal(dialog.includes('createCardFromBlock'), true)
  assert.equal(dialog.includes('mergeBlockIntoSelectedCard'), true)
  assert.equal(dialog.includes('keepSuggestionAsNewCard'), true)
  assert.equal(dialog.includes('mergeSuggestionIntoCard'), true)
  assert.equal(dialog.includes('ignoreDepositableBlock'), true)
  assert.equal(dialog.includes('保存为草稿'), true)
  assert.equal(dialog.includes('合并到当前内容'), true)
  assert.equal(dialog.includes('忽略'), true)
})

test('nutrient workbench accepts and ignores nutrient suggestions', () => {
  const dialog = readProjectFile('app/components/nutrient/NutrientWorkbenchDialog.vue')

  assert.equal(dialog.includes('nutrientSuggestions'), true)
  assert.equal(dialog.includes('pendingNutrientSuggestions'), true)
  assert.equal(dialog.includes('feedbackDependencyNames'), true)
  assert.equal(dialog.includes('loadGapSuggestions'), true)
  assert.equal(dialog.includes('acceptNutrientSuggestion'), true)
  assert.equal(dialog.includes('ignoreNutrientSuggestion'), true)
  assert.equal(dialog.includes('adoptGapSuggestion'), true)
  assert.equal(dialog.includes('ignoreGapSuggestion'), true)
  assert.equal(dialog.includes('localState.composingMessage = suggestion.bodyMarkdown'), true)
  assert.equal(dialog.includes('cf-nutrient-suggestion-card'), true)
  assert.equal(dialog.includes('cf-nutrient-suggestion-footnote'), true)
  assert.equal(dialog.includes('suggestionSourceLabel'), true)
})

test('nutrient workbench shows feedback placeholders without quality scoring', () => {
  const dialog = readProjectFile('app/components/nutrient/NutrientWorkbenchDialog.vue')
  const nutrientTypes = readProjectFile('src/modules/nutrient/types.ts')

  assert.equal(dialog.includes('cf-nutrient-freshness'), true)
  assert.equal(dialog.includes('cf-nutrient-usage-summary'), true)
  assert.equal(dialog.includes('使用表现摘要'), true)
  assert.equal(nutrientTypes.includes('相似营养检测'), true)
  assert.equal(dialog.includes('质量评分'), false)
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
