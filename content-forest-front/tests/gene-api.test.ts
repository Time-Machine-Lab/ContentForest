import assert from 'node:assert/strict'
import test from 'node:test'
import { createGeneApi, type GeneFetchOptions } from '../src/modules/gene/api'

test('gene api client uses documented gene extraction endpoints', async () => {
  const calls: Array<{ url: string; options?: GeneFetchOptions }> = []
  const api = createGeneApi(async (url, options) => {
    calls.push({ url, options })
    return {}
  }, '')

  const extractionPayload = {
    reminderId: 'reminder 1',
    reason: 'selected because the emotional opening is clearer',
    evidenceSources: [
      {
        sourceType: 'fruit_selected' as const,
        sourceId: 'fruit 1',
        strength: 'weak' as const,
      },
    ],
  }

  await api.getLibrary('seed 1')
  await api.prepareLibrary('seed 1')
  await api.listSuggestions('seed 1')
  await api.startExtractionTask('seed 1', extractionPayload)
  await api.ignoreReminder('reminder 1')
  await api.getSuggestion('suggestion 1')
  await api.editSuggestion('suggestion 1', {
    title: 'title',
    bodyMarkdown: 'body',
    lineage: 'lineage',
    niche: 'niche',
  })
  await api.dismissSuggestion('suggestion 1')
  await api.confirmSuggestion('suggestion 1', {
    title: 'title',
    bodyMarkdown: 'body',
    lineage: 'lineage',
    niche: 'niche',
  })
  await api.listInsights('seed 1')
  await api.listReferableInsights('seed 1')
  await api.getInsight('insight 1')
  await api.editInsight('insight 1', { bodyMarkdown: 'body' })
  await api.archiveInsight('insight 1')

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/seeds/seed%201/gene-library',
    '/api/seeds/seed%201/gene-library',
    '/api/seeds/seed%201/gene-suggestions',
    '/api/seeds/seed%201/gene-extraction-tasks',
    '/api/gene-reminders/reminder%201/ignore',
    '/api/gene-suggestions/suggestion%201',
    '/api/gene-suggestions/suggestion%201',
    '/api/gene-suggestions/suggestion%201/dismiss',
    '/api/gene-suggestions/suggestion%201/confirm',
    '/api/seeds/seed%201/gene-insights',
    '/api/seeds/seed%201/gene-insights/referable',
    '/api/gene-insights/insight%201',
    '/api/gene-insights/insight%201',
    '/api/gene-insights/insight%201/archive',
  ])
  assert.equal(calls[1]?.options?.method, 'POST')
  assert.equal(calls[3]?.options?.method, 'POST')
  assert.deepEqual(calls[3]?.options?.body, extractionPayload)
  assert.equal(calls[4]?.options?.method, 'POST')
  assert.equal(calls[6]?.options?.method, 'PATCH')
  assert.equal(calls[7]?.options?.method, 'POST')
  assert.equal(calls[8]?.options?.method, 'POST')
  assert.equal(calls[12]?.options?.method, 'PATCH')
  assert.equal(calls[13]?.options?.method, 'POST')
})
