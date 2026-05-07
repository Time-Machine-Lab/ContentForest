import assert from 'node:assert/strict'
import test from 'node:test'
import { createWorkspaceApi, type WorkspaceFetchOptions } from '../src/modules/workspace/api'

test('workspace api client uses documented workspace endpoint', async () => {
  const calls: Array<{ url: string; options?: WorkspaceFetchOptions }> = []
  const api = createWorkspaceApi(async (url, options) => {
    calls.push({ url, options })
    return {}
  }, '')

  await api.getSeedWorkspace('seed 1')

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/seeds/seed%201/workspace',
  ])
})

test('workspace api client joins optional api base without changing documented paths', async () => {
  const calls: string[] = []
  const api = createWorkspaceApi(async (url) => {
    calls.push(url)
    return {}
  }, 'https://example.test/')

  await api.getSeedWorkspace('seed 1')

  assert.deepEqual(calls, ['https://example.test/api/seeds/seed%201/workspace'])
})
