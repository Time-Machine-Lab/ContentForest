import assert from 'node:assert/strict'
import test from 'node:test'
import { createNutrientApi, type NutrientFetchOptions } from '../src/modules/nutrient/api'

test('nutrient api client uses documented library endpoints', async () => {
  const calls: Array<{ url: string; options?: NutrientFetchOptions }> = []
  const api = createNutrientApi(async (url, options) => {
    calls.push({ url, options })
    return {}
  }, '')

  await api.listLibraries({ scope: 'public', archiveState: 'active' })
  await api.listLibraries({ scope: 'seed_scoped', archiveState: 'active', seedId: 'seed 1' })
  await api.getLibrary('library 1')
  await api.createLibrary({ name: 'Library', description: '', scope: 'public', seedId: null })
  await api.updateLibrary('library 1', { name: 'Library 2', description: 'Desc' })
  await api.archiveLibrary('library 1')
  await api.restoreLibrary('library 1')

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/nutrient-libraries?scope=public&archiveState=active',
    '/api/nutrient-libraries?scope=seed_scoped&archiveState=active&seedId=seed+1',
    '/api/nutrient-libraries/library%201',
    '/api/nutrient-libraries',
    '/api/nutrient-libraries/library%201',
    '/api/nutrient-libraries/library%201/archive',
    '/api/nutrient-libraries/library%201/restore',
  ])

  assert.equal(calls[3]?.options?.method, 'POST')
  assert.equal(calls[4]?.options?.method, 'PATCH')
  assert.equal(calls[5]?.options?.method, 'POST')
  assert.equal(calls[6]?.options?.method, 'POST')
})

test('nutrient api client uses documented content and referable endpoints', async () => {
  const calls: Array<{ url: string; options?: NutrientFetchOptions }> = []
  const api = createNutrientApi(async (url, options) => {
    calls.push({ url, options })
    return {}
  }, '')

  await api.listContents('library 1', { archiveState: 'active' })
  await api.createContent('library 1', { title: 'Content', markdown: '# Body' })
  await api.getContent('content 1')
  await api.updateContent('content 1', { title: 'Content 2', markdown: '# Body 2' })
  await api.archiveContent('content 1')
  await api.restoreContent('content 1')
  await api.listReferableNutrients('seed 1')

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/nutrient-libraries/library%201/contents?archiveState=active',
    '/api/nutrient-libraries/library%201/contents',
    '/api/nutrient-contents/content%201',
    '/api/nutrient-contents/content%201',
    '/api/nutrient-contents/content%201/archive',
    '/api/nutrient-contents/content%201/restore',
    '/api/seeds/seed%201/referable-nutrients',
  ])

  assert.equal(calls[1]?.options?.method, 'POST')
  assert.equal(calls[3]?.options?.method, 'PATCH')
  assert.equal(calls[4]?.options?.method, 'POST')
  assert.equal(calls[5]?.options?.method, 'POST')
})

test('nutrient api client joins optional api base without changing documented paths', async () => {
  const calls: string[] = []
  const api = createNutrientApi(async (url) => {
    calls.push(url)
    return {}
  }, 'https://example.test/')

  await api.listReferableNutrients('seed 1')

  assert.deepEqual(calls, ['https://example.test/api/seeds/seed%201/referable-nutrients'])
})
