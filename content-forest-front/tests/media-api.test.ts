import assert from 'node:assert/strict'
import test from 'node:test'
import { createMediaApi, type MediaFetchOptions } from '../src/modules/media/api'

test('media api client uses documented media asset endpoints', async () => {
  const calls: Array<{ url: string; options?: MediaFetchOptions }> = []
  const api = createMediaApi(async (url, options) => {
    calls.push({ url, options })
    return {}
  }, '')

  const payload = {
    seedId: 'seed 1',
    fileName: 'reference.png',
    mimeType: 'image/png' as const,
    contentBase64: 'Zm9v',
    sourceType: 'user_upload' as const,
    sourceId: null,
  }

  await api.createMediaAsset(payload)
  await api.getMediaAsset('media 1')
  const contentUrl = api.getMediaAssetContentUrl('media 1')

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/media-assets',
    '/api/media-assets/media%201',
  ])
  assert.equal(calls[0]?.options?.method, 'POST')
  assert.deepEqual(calls[0]?.options?.body, payload)
  assert.equal(contentUrl, '/api/media-assets/media%201/content')
})

test('media api client joins optional api base for content access', () => {
  const api = createMediaApi(async () => ({}), 'https://example.test/')

  assert.equal(api.getMediaAssetContentUrl('media 1'), 'https://example.test/api/media-assets/media%201/content')
})
