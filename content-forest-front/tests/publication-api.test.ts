import assert from 'node:assert/strict'
import test from 'node:test'
import { createPublicationApi, type PublicationFetchOptions } from '../src/modules/publication/api'

test('publication api client uses documented publication endpoints', async () => {
  const calls: Array<{ url: string, options?: PublicationFetchOptions }> = []
  const api = createPublicationApi(async (url, options) => {
    calls.push({ url, options })
    return {}
  }, '')

  await api.createPublicationRecord({
    fruitId: 'fruit 1',
    publicationTarget: 'X post',
    publicationEvidence: 'https://example.test/post/1',
    publicationNote: 'manual',
  })
  await api.listPublicationRecordsByFruit('fruit 1')
  await api.getPublicationRecord('publication 1')
  await api.updatePublicationRecord('publication 1', {
    publicationTarget: 'X thread',
    publicationEvidence: 'https://example.test/thread/1',
    publicationNote: '',
  })

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/publication-records',
    '/api/fruits/fruit%201/publication-records',
    '/api/publication-records/publication%201',
    '/api/publication-records/publication%201',
  ])
  assert.equal(calls[0]?.options?.method, 'POST')
  assert.equal(calls[3]?.options?.method, 'PATCH')
})
