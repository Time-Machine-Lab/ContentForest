import assert from 'node:assert/strict'
import test from 'node:test'
import { createGeneratorApi, type GeneratorFetchOptions } from '../src/modules/generator/api'

test('generator api client uses documented generator endpoints', async () => {
  const calls: Array<{ url: string; options?: GeneratorFetchOptions }> = []
  const api = createGeneratorApi(async (url, options) => {
    calls.push({ url, options })
    return {}
  }, '')

  await api.listGenerators()
  await api.listSelectableGenerators()
  await api.getGenerator('generator 1')
  await api.importGenerator({ name: 'Generator', description: 'Desc', zipBase64: 'zip' })
  await api.reuploadGenerator('generator 1', { zipBase64: 'zip2' })
  await api.enableGenerator('generator 1')
  await api.disableGenerator('generator 1')

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/generators',
    '/api/generators/selectable',
    '/api/generators/generator%201',
    '/api/generators',
    '/api/generators/generator%201/reupload',
    '/api/generators/generator%201/enable',
    '/api/generators/generator%201/disable',
  ])

  assert.equal(calls[3]?.options?.method, 'POST')
  assert.equal(calls[4]?.options?.method, 'POST')
  assert.equal(calls[5]?.options?.method, 'POST')
  assert.equal(calls[6]?.options?.method, 'POST')
})

test('generator api client joins optional api base without changing documented paths', async () => {
  const calls: string[] = []
  const api = createGeneratorApi(async (url) => {
    calls.push(url)
    return {}
  }, 'https://example.test/')

  await api.listGenerators()

  assert.deepEqual(calls, ['https://example.test/api/generators'])
})
