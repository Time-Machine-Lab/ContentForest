import assert from 'node:assert/strict'
import test from 'node:test'
import { createFruitApi, type FruitFetchOptions } from '../src/modules/fruit/api'

test('fruit api client uses documented fruit endpoints', async () => {
  const calls: Array<{ url: string; options?: FruitFetchOptions }> = []
  const api = createFruitApi(async (url, options) => {
    calls.push({ url, options })
    return {}
  }, '')

  await api.getFruit('fruit 1')
  await api.updateFruitContent('fruit 1', { markdown: 'hello' })
  await api.selectFruit('fruit 1')
  await api.eliminateFruit('fruit 1')
  await api.restoreFruitCandidate('fruit 1')

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/fruits/fruit%201',
    '/api/fruits/fruit%201/content',
    '/api/fruits/fruit%201/select',
    '/api/fruits/fruit%201/eliminate',
    '/api/fruits/fruit%201/restore-candidate',
  ])
  assert.equal(calls[1]?.options?.method, 'PATCH')
  assert.deepEqual(calls[1]?.options?.body, { markdown: 'hello' })
  assert.equal(calls[2]?.options?.method, 'POST')
  assert.equal(calls[3]?.options?.method, 'POST')
  assert.equal(calls[4]?.options?.method, 'POST')
})

test('fruit detail type includes media attachments from documented contract', () => {
  const detail = {
    id: 'fruit-1',
    selectionState: 'candidate',
    parentNodeRef: { nodeId: 'seed-1', nodeType: 'seed' },
    contentLocation: 'fruits/fruit-1.md',
    generatorId: null,
    summary: '媒体果实',
    geneTags: [],
    media: [
      {
        id: 'media-1',
        mediaType: 'image',
        mimeType: 'image/png',
        fileName: 'cover.png',
        sizeBytes: 2048,
        contentUrl: '/api/media-assets/media-1/content',
        displayRole: 'primary',
        sortOrder: 1,
      },
    ],
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
    markdown: '# fruit',
  } satisfies import('../src/modules/fruit').FruitDetail

  assert.equal(detail.media[0]?.contentUrl, '/api/media-assets/media-1/content')
})
