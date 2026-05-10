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
