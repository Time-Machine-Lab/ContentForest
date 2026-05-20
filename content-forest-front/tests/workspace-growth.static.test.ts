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
  assert.equal(workspacePage.includes(".filter((resource) => resource.kind === 'media')"), true)
})

test('workspace submits nutrient card temporary refs and restores failed input refs', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')
  const growthTypes = readProjectFile('src/modules/growth/types.ts')

  assert.equal(growthTypes.includes("GrowthTemporaryResourceType = 'nutrient_card'"), true)
  assert.equal(growthTypes.includes('temporaryNutrientCardRefs'), true)
  assert.equal(workspacePage.includes('temporaryNutrientCardRefs'), true)
  assert.equal(workspacePage.includes(".filter((resource) => resource.kind === 'nutrient_card')"), true)
  assert.equal(workspacePage.includes("resourceType: 'nutrient_card' as const"), true)
  assert.equal(workspacePage.includes("...failedInput.temporaryNutrientCardRefs"), true)
  assert.equal(workspacePage.includes("scope: '草稿营养内容'"), true)
  assert.equal(workspacePage.includes("description: '最近失败任务中的临时引用'"), true)
})

test('workspace applies default nutrients and accepts workbench references', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('applyDefaultGrowthNutrients'), true)
  assert.equal(workspacePage.includes('removedDefaultResourceKeys'), true)
  assert.equal(workspacePage.includes('item.defaultForGrowth'), true)
  assert.equal(workspacePage.includes('handleNutrientWorkbenchReference'), true)
  assert.equal(workspacePage.includes('handleNutrientWorkbenchChanged'), true)
  assert.equal(workspacePage.includes('@reference="handleNutrientWorkbenchReference"'), true)
  assert.equal(workspacePage.includes('@changed="handleNutrientWorkbenchChanged"'), true)
  assert.equal(workspacePage.includes('resourceKindLabel(resource.kind)'), true)
  assert.equal(workspacePage.includes('默认带入 · ${item.library.name}'), true)
  assert.equal(workspacePage.includes('.cf-mention.is-nutrient_card'), true)
  assert.equal(workspacePage.includes('.cf-ref-chip.is-nutrient_card'), true)
})

test('workspace renders fruit media attachments outside markdown content', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')
  const fruitTypes = readProjectFile('src/modules/fruit/types.ts')
  const workspaceTypes = readProjectFile('src/modules/workspace/types.ts')

  assert.equal(fruitTypes.includes('FruitMediaAttachment'), true)
  assert.equal(workspaceTypes.includes('WorkspaceFruitMediaSummary'), true)
  assert.equal(workspacePage.includes('selectedNode.nodeType === \'fruit\' && selectedNode.media.length > 0'), true)
  assert.equal(workspacePage.includes('class="cf-media-grid"'), true)
  assert.equal(workspacePage.includes('media.mediaType === \'image\''), true)
  assert.equal(workspacePage.includes('<video'), true)
  assert.equal(workspacePage.includes('<MarkdownViewer v-else :markdown="selectedNode.markdown" />'), true)
})

test('workspace uploads media assets and adds media references', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')
  const mediaApi = readProjectFile('src/modules/media/api.ts')

  assert.equal(mediaApi.includes('/api/media-assets'), true)
  assert.equal(mediaApi.includes('/content'), true)
  assert.equal(workspacePage.includes('createMediaApi'), true)
  assert.equal(workspacePage.includes('mediaApi.createMediaAsset(payload)'), true)
  assert.equal(workspacePage.includes('contentBase64: await fileToBase64(file)'), true)
  assert.equal(workspacePage.includes('upsertMediaAssetIntoSnapshot(asset)'), true)
  assert.equal(workspacePage.includes('addResource(mediaAssetToResource(asset))'), true)
  assert.equal(workspacePage.includes('mediaUploading'), true)
  assert.equal(workspacePage.includes('mediaUploadError'), true)
})

test('workspace submits media refs with usage without changing existing mappings', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')
  const growthTypes = readProjectFile('src/modules/growth/types.ts')

  assert.equal(growthTypes.includes('GrowthMediaRef'), true)
  assert.equal(growthTypes.includes('mediaRefs'), true)
  assert.equal(workspacePage.includes('mediaUsageOptions'), true)
  assert.equal(workspacePage.includes('updateMediaUsage(resource, eventValue($event))'), true)
  assert.equal(workspacePage.includes('updateMediaUsageNote(resource, eventValue($event))'), true)
  assert.equal(workspacePage.includes('usage: buildMediaUsage(resource)'), true)
  assert.equal(workspacePage.includes('nutrientRefs,'), true)
  assert.equal(workspacePage.includes('temporaryNutrientCardRefs,'), true)
  assert.equal(workspacePage.includes('mediaRefs,'), true)
  assert.equal(workspacePage.includes('geneRefs,'), true)
})

test('workspace media resources coexist in mention picker and failed input recovery', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('resources.mediaAssets'), true)
  assert.equal(workspacePage.includes("kind: 'media' as const"), true)
  assert.equal(workspacePage.includes("title: '媒体'"), true)
  assert.equal(workspacePage.includes('.cf-resource-group.is-media .cf-resource-icon'), true)
  assert.equal(workspacePage.includes('.cf-mention.is-media'), true)
  assert.equal(workspacePage.includes('.cf-ref-chip.is-media'), true)
  assert.equal(workspacePage.includes('const failedMediaRefs = failedInput.mediaRefs ?? []'), true)
  assert.equal(workspacePage.includes('restoreMediaUsage(matchedResource, ref.usage)'), true)
  assert.equal(workspacePage.includes('已跳过 ${skippedMediaRefs} 个不可访问媒体引用'), true)
})

test('workspace mention picker includes temporary nutrient cards', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('createNutrientApi'), true)
  assert.equal(workspacePage.includes('temporaryNutrientCards'), true)
  assert.equal(workspacePage.includes("nutrientApi.listCards(seedId.value, { status: 'unsettled' })"), true)
  assert.equal(workspacePage.includes("kind: 'nutrient_card' as const"), true)
  assert.equal(workspacePage.includes('title: \'临时营养\''), true)
  assert.equal(workspacePage.includes('还未沉淀进营养库，可临时参与本次枝化生长'), true)
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
  assert.equal(workspacePage.includes('geneReminderActionLoading[reminderId] = undefined'), true)
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

test('workspace exposes seed brief panel without blocking growth composer', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('seedBriefPanelOpen'), true)
  assert.equal(workspacePage.includes('seedBriefSummary = computed(() => snapshot.value?.seedBrief'), true)
  assert.equal(workspacePage.includes('openSeedBriefPanel'), true)
  assert.equal(workspacePage.includes('generateSeedBrief'), true)
  assert.equal(workspacePage.includes('refreshSeedBrief'), true)
  assert.equal(workspacePage.includes('saveSeedBrief'), true)
  assert.equal(workspacePage.includes('cf-seed-brief-panel'), true)
  assert.equal(workspacePage.includes('还没有主简报'), true)
  assert.equal(workspacePage.includes('可以先生成一份创作地图，也可以直接从当前节点发起枝化生长。'), true)
  assert.equal(workspacePage.includes('v-if="visibleComposer && selectedNode"'), true)
})

test('workspace seed brief failures are local to the seed brief panel', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('seedBriefError = ref'), true)
  assert.equal(workspacePage.includes('seedBriefError.value = errorMessage(error)'), true)
  assert.equal(workspacePage.includes('growthError.value = errorMessage(error)'), true)
  assert.equal(workspacePage.includes('seedBriefError'), true)
  assert.equal(workspacePage.includes('visibleComposer'), true)
})

test('workspace submits branch growth pipeline parameters without numeric mutation rate', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('searchModeOptions'), true)
  assert.equal(workspacePage.includes('mutationIntensityOptions'), true)
  assert.equal(workspacePage.includes('toggleSearchModeMenu'), true)
  assert.equal(workspacePage.includes('toggleMutationIntensityMenu'), true)
  assert.equal(workspacePage.includes('searchModeMenuOpen'), true)
  assert.equal(workspacePage.includes('mutationIntensityMenuOpen'), true)
  assert.equal(workspacePage.includes('selectedSearchMode'), true)
  assert.equal(workspacePage.includes('selectedMutationIntensity'), true)
  assert.equal(workspacePage.includes('searchMode: selectedSearchMode.value'), true)
  assert.equal(workspacePage.includes('mutationIntensity: selectedMutationIntensity.value'), true)
  assert.equal(workspacePage.includes('mutationRate'), false)
})

test('workspace renders running growth pipeline path graph from polled task detail', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('growthPipelineTasks'), true)
  assert.equal(workspacePage.includes('selectedGrowthPathSteps'), true)
  assert.equal(workspacePage.includes('selectedGrowthDirections'), true)
  assert.equal(workspacePage.includes('class="cf-pipeline-panel"'), true)
  assert.equal(workspacePage.includes('v-for="step in selectedGrowthPathSteps"'), true)
  assert.equal(workspacePage.includes('growthPipelineTasks[nextTask.id] = nextTask'), true)
  assert.equal(workspacePage.includes('pathStepStatusLabel(step.status)'), true)
})

test('workspace filters engineering trace from growth path graph', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('isUserVisiblePathStep'), true)
  assert.equal(workspacePage.includes('ENGINEERING_PATH_STEP_EVENT_PATTERNS'), true)
  assert.equal(workspacePage.includes('ENGINEERING_PATH_STEP_LABEL_PATTERNS'), true)
  assert.equal(workspacePage.includes("step.id.startsWith('trace:')"), true)
  assert.equal(workspacePage.includes("step.id.startsWith('attempt:')"), true)
  assert.equal(workspacePage.includes('生成第\\s*\\d+\\s*个果实'), true)
  assert.equal(workspacePage.includes('task_started'), true)
  assert.equal(workspacePage.includes('skill_called'), true)
  assert.equal(workspacePage.includes('tool_called'), true)
  assert.equal(workspacePage.includes('llm_called'), true)
  assert.equal(workspacePage.includes('selectedCurrentGrowthPathStep'), true)
  assert.equal(workspacePage.includes('当前正在'), true)
  assert.equal(workspacePage.includes('growthPathStepDepth'), true)
  assert.equal(workspacePage.includes('Math.min(growthPathStepDepth(parent, steps, visited) + 1, 3)'), true)
})

test('workspace keeps generated seed brief visible while snapshot summary catches up', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('hasSeedBrief = computed'), true)
  assert.equal(workspacePage.includes('v-if="!hasSeedBrief"'), true)
  assert.equal(workspacePage.includes('seedBriefDetail.value?.seedId && seedBriefDetail.value.seedId !== nextSnapshot.seed.id'), true)
  assert.equal(workspacePage.includes('cf-brief-loader'), true)
  assert.equal(workspacePage.includes('is-working'), true)
})

test('workspace seed brief uses full markdown rendering and wider reading panel', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')
  const markdownViewer = readProjectFile('app/components/markdown/MarkdownViewer.vue')

  assert.equal(workspacePage.includes('width: min(620px, calc(100vw - 468px))'), true)
  assert.equal(markdownViewer.includes('renderTable'), true)
  assert.equal(markdownViewer.includes('<hr>'), true)
  assert.equal(markdownViewer.includes('<strong>$1</strong>'), true)
  assert.equal(markdownViewer.includes('cf-markdown-table-wrap'), true)
})
