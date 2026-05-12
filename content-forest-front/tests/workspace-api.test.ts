import assert from 'node:assert/strict'
import test from 'node:test'
import type { WorkspaceSnapshot } from '../src/modules/workspace'
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

test('workspace snapshot type includes seed brief summary from documented contract', () => {
  const snapshot = {
    seed: {
      id: 'seed-1',
      title: 'Seed',
      archiveState: 'active',
      rootNodeId: 'seed-1',
      contentLocation: 'seeds/seed-1.md',
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
    },
    workspaceReadOnly: false,
    seedBrief: {
      seedId: 'seed-1',
      hasBrief: true,
      id: 'brief-1',
      contentLocation: 'seed-briefs/brief-1.md',
      updatedAt: '2026-05-12T00:00:00.000Z',
    },
    nodes: [],
    edges: [],
    resources: {
      generators: [],
      nutrients: [],
      geneInsights: [],
    },
    geneExtractionHub: {
      seedId: 'seed-1',
      geneLibrary: {
        seedId: 'seed-1',
        contentLocation: 'genes/seed-1.md',
        insightCount: 0,
        referableInsightCount: 0,
        updatedAt: '2026-05-12T00:00:00.000Z',
      },
      pendingReminders: [],
      pendingSuggestions: [],
      stats: {
        pendingReminderCount: 0,
        pendingSuggestionCount: 0,
        insightCount: 0,
        referableInsightCount: 0,
      },
      actions: {
        canStartExtraction: true,
        canReviewSuggestions: true,
        canOpenGeneLibrary: true,
      },
    },
  } satisfies WorkspaceSnapshot

  assert.equal(snapshot.seedBrief.hasBrief, true)
  assert.equal(snapshot.seedBrief.contentLocation, 'seed-briefs/brief-1.md')
})
