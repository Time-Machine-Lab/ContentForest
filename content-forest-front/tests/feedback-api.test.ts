import assert from 'node:assert/strict'
import test from 'node:test'
import { createFeedbackApi, type FeedbackFetchOptions } from '../src/modules/feedback/api'

test('feedback api client uses documented feedback endpoints', async () => {
  const calls: Array<{ url: string, options?: FeedbackFetchOptions }> = []
  const api = createFeedbackApi(async (url, options) => {
    calls.push({ url, options })
    return {}
  }, '')

  await api.attachManualMonitor('publication 1')
  await api.getFeedbackHistory('publication 1')
  await api.createFeedbackSnapshot('publication 1', {
    performanceData: { views: 100 },
    userObservation: 'manual pull',
  })
  await api.updateFeedbackSnapshot('snapshot 1', {
    performanceData: { views: 120 },
  })

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/publication-records/publication%201/monitor',
    '/api/publication-records/publication%201/feedback',
    '/api/publication-records/publication%201/feedback-snapshots',
    '/api/feedback-snapshots/snapshot%201',
  ])
  assert.equal(calls[0]?.options?.method, 'POST')
  assert.equal(calls[2]?.options?.method, 'POST')
  assert.equal(calls[3]?.options?.method, 'PATCH')
})
