import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

test('workspace refreshes during running growth when fruits are created incrementally', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('growthTaskFruitCounts'), true)
  assert.equal(workspacePage.includes('await syncGrowthTaskProgress(nextTask)'), true)
  assert.equal(workspacePage.includes('removeGrowthPlaceholders(task.sourceNodeRef.nodeId)'), true)
  assert.equal(workspacePage.includes('await loadWorkspace(task.sourceNodeRef.nodeId)'), true)
  assert.equal(workspacePage.includes('Math.max(task.fruitCount - currentCount, 0)'), true)
})

test('workspace referenced resources can be removed before growth payload mapping', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('function removeResource(resource: ResourceRef)'), true)
  assert.equal(workspacePage.includes('referencedResources.value = referencedResources.value.filter'), true)
  assert.equal(workspacePage.includes('@click.stop="removeResource(resource)"'), true)
  assert.equal(workspacePage.includes(".filter((resource) => resource.kind === 'nutrient')"), true)
  assert.equal(workspacePage.includes(".filter((resource) => resource.kind === 'gene')"), true)
})

test('workspace has one backend-driven gene extraction hub', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('class="cf-gene-hub"'), true)
  assert.equal(workspacePage.includes('geneHub = computed(() => snapshot.value?.geneExtractionHub'), true)
  assert.equal(workspacePage.includes('startGeneExtraction(reminder.id)'), true)
  assert.equal(workspacePage.includes('ignoreGeneReminder(reminder.id)'), true)
  assert.equal(workspacePage.includes('viewGeneSuggestion(suggestion.id)'), true)
  assert.equal(workspacePage.includes('confirmGeneSuggestion'), true)
})

test('workspace gene hub is a focused extraction suggestion queue', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('aria-label="基因汲取建议"'), true)
  assert.equal(workspacePage.includes('cf-gene-hub-summary'), true)
  assert.equal(workspacePage.includes('cf-gene-hub-badge'), true)
  assert.equal(workspacePage.includes('沉淀到基因库'), true)
  assert.equal(workspacePage.includes('cf-gene-library-card'), false)
  assert.equal(workspacePage.includes('geneLibraryExpanded'), false)
})

test('workspace keeps gene extraction out of fruit detail and publication actions', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('await loadWorkspace(node.id)'), true)
  assert.equal(workspacePage.includes('await fruitApi.selectFruit(node.fruitId)'), true)
  assert.equal(workspacePage.includes('await fruitApi.eliminateFruit(node.fruitId)'), true)
  assert.equal(workspacePage.includes('createReminderFromFruitEvidence'), false)
  assert.equal(workspacePage.includes('createPublication'), false)
  assert.equal(workspacePage.includes('autoPublish'), false)
  assert.equal(workspacePage.includes('发布器'), true)
})
