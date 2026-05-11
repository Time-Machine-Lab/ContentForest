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

test('workspace has one backend-driven gene extraction dialog launched from a bubble', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('class="cf-gene-bubble"'), true)
  assert.equal(workspacePage.includes('class="cf-gene-dialog"'), true)
  assert.equal(workspacePage.includes('geneHubDialogOpen'), true)
  assert.equal(workspacePage.includes('geneReminderActionLoading'), true)
  assert.equal(workspacePage.includes('pollGeneExtractionReminder'), true)
  assert.equal(workspacePage.includes('scheduleGeneExtractionPoll'), true)
  assert.equal(workspacePage.includes('GENE_EXTRACTION_POLL_INTERVAL_MS'), true)
  assert.equal(workspacePage.includes('delete geneReminderActionLoading[reminderId]'), true)
  assert.equal(workspacePage.includes('geneReasonComposerIds'), true)
  assert.equal(workspacePage.includes('reminder?.runningTaskId'), true)
  assert.equal(workspacePage.includes('geneExtractionReasonDrafts'), true)
  assert.equal(workspacePage.includes('cf-gene-reason-field'), true)
  assert.equal(workspacePage.includes('cf-gene-card-loader'), true)
  assert.equal(workspacePage.includes('reason: geneExtractionReasonDrafts[reminderId]?.trim() || undefined'), true)
  assert.equal(workspacePage.includes('geneHub = computed(() => snapshot.value?.geneExtractionHub'), true)
  assert.equal(workspacePage.includes('startGeneExtraction(reminder.id)'), true)
  assert.equal(workspacePage.includes('ignoreGeneReminder(reminder.id)'), true)
  assert.equal(workspacePage.includes('viewGeneSuggestion(suggestion.id)'), true)
  assert.equal(workspacePage.includes('confirmGeneSuggestion'), true)
})

test('workspace gene extraction dialog is a focused suggestion queue', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('cf-gene-dialog-metrics'), true)
  assert.equal(workspacePage.includes('cf-gene-task-badge'), true)
  assert.equal(workspacePage.includes('cf-gene-dialog-empty'), true)
  assert.equal(workspacePage.includes('evidenceSourceSummary(reminder.evidenceSources)'), true)
  assert.equal(workspacePage.includes('cf-gene-evidence-preview'), true)
  assert.equal(workspacePage.includes('cf-gene-reason-panel'), true)
  assert.equal(workspacePage.includes('<strong>{{ source.sourceId }}</strong>'), false)
  assert.equal(workspacePage.includes('cf-gene-library-card'), false)
  assert.equal(workspacePage.includes('geneLibraryExpanded'), false)
})

test('workspace keeps gene extraction out of fruit detail and publication actions', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('await loadWorkspace(node.id)'), true)
  assert.equal(workspacePage.includes('await fruitApi.selectFruit(node.fruitId)'), true)
  assert.equal(workspacePage.includes('await fruitApi.eliminateFruit(node.fruitId)'), true)
  assert.equal(workspacePage.includes('createReminderFromFruitEvidence'), false)
  assert.equal(workspacePage.includes('autoPublish'), false)
  assert.equal(workspacePage.includes('cf-publication'), true)
})
