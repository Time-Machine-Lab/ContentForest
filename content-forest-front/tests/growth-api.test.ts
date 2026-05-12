import assert from 'node:assert/strict'
import test from 'node:test'
import { createGrowthApi, type GrowthFetchOptions } from '../src/modules/growth/api'

test('growth api client uses documented growth endpoints', async () => {
  const calls: Array<{ url: string; options?: GrowthFetchOptions }> = []
  const api = createGrowthApi(async (url, options) => {
    calls.push({ url, options })
    return {}
  }, '')

  const payload = {
    seedId: 'seed 1',
    sourceNodeRef: { nodeType: 'fruit' as const, nodeId: 'node 1' },
    userInput: 'grow',
    generatorId: 'generator 1',
    fruitCount: 3,
    nutrientRefs: [{ resourceType: 'nutrient' as const, resourceId: 'nutrient 1' }],
    temporaryNutrientCardRefs: [{ resourceType: 'nutrient_card' as const, resourceId: 'card 1' }],
    geneRefs: [{ resourceType: 'gene' as const, resourceId: 'gene 1' }],
    searchMode: 'broad_exploration' as const,
    mutationIntensity: 'balanced' as const,
  }

  await api.startGrowthTask(payload)
  await api.getGrowthTask('task 1')
  await api.retryGrowthSource('fruit', 'node 1')
  await api.getGrowthSourceStatus('fruit', 'node 1')
  await api.getGrowthFailedInput('fruit', 'node 1')

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/growth-tasks',
    '/api/growth-tasks/task%201',
    '/api/growth-sources/fruit/node%201/retry',
    '/api/growth-sources/fruit/node%201/status',
    '/api/growth-sources/fruit/node%201/failed-input',
  ])
  assert.equal(calls[0]?.options?.method, 'POST')
  assert.deepEqual(calls[0]?.options?.body, payload)
  assert.equal(calls[2]?.options?.method, 'POST')
})
