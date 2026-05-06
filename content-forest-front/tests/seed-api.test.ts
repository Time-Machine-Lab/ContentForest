import assert from 'node:assert/strict'
import test from 'node:test'
import { createSeedApi, type SeedFetchOptions } from '../src/modules/seed/api'

test('seed api client uses documented seed endpoints', async () => {
  const calls: Array<{ url: string; options?: SeedFetchOptions }> = []
  const api = createSeedApi(async (url, options) => {
    calls.push({ url, options })
    return {}
  }, '')

  await api.listActiveSeeds()
  await api.listArchivedSeeds()
  await api.getSeed('seed 1')
  await api.createSeed({ title: 'Seed', markdown: 'Markdown' })
  await api.updateSeed('seed 1', { title: 'Seed 2', markdown: 'Markdown 2' })
  await api.archiveSeed('seed 1')
  await api.restoreSeed('seed 1')
  await api.getSeedRootNode('seed 1')

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/seeds',
    '/api/seeds/archived',
    '/api/seeds/seed%201',
    '/api/seeds',
    '/api/seeds/seed%201',
    '/api/seeds/seed%201/archive',
    '/api/seeds/seed%201/restore',
    '/api/seeds/seed%201/root-node',
  ])

  assert.equal(calls[3]?.options?.method, 'POST')
  assert.equal(calls[4]?.options?.method, 'PATCH')
  assert.equal(calls[5]?.options?.method, 'POST')
  assert.equal(calls[6]?.options?.method, 'POST')
})

test('seed api client joins optional api base without changing documented paths', async () => {
  const calls: string[] = []
  const api = createSeedApi(async (url) => {
    calls.push(url)
    return {}
  }, 'https://example.test/')

  await api.listActiveSeeds()

  assert.deepEqual(calls, ['https://example.test/api/seeds'])
})
