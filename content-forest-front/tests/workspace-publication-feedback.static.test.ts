import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

test('workspace shows publication creation only for selected writable fruits', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('canCreatePublicationRecord'), true)
  assert.equal(workspacePage.includes("node.selectionState === 'selected'"), true)
  assert.equal(workspacePage.includes('!isReadOnly.value'), true)
  assert.equal(workspacePage.includes('只有已选择果实才能进入发布验证'), true)
  assert.equal(workspacePage.includes('已淘汰果实不能创建发布记录'), true)
  assert.equal(workspacePage.includes('只读工作区仅允许查看发布记录'), true)
})

test('workspace creates and edits publication records from fruit detail', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('publicationApi.createPublicationRecord'), true)
  assert.equal(workspacePage.includes('publicationApi.updatePublicationRecord'), true)
  assert.equal(workspacePage.includes('publicationApi.listPublicationRecordsByFruit'), true)
  assert.equal(workspacePage.includes('publicationDraft.publicationTarget'), true)
  assert.equal(workspacePage.includes('publicationDraft.publicationEvidence'), true)
  assert.equal(workspacePage.includes('publicationDraft.publicationNote'), true)
  assert.equal(workspacePage.includes('await loadPublicationRecords(node.fruitId)'), true)
})

test('workspace keeps feedback scoped to publication records', () => {
  const workspacePage = readProjectFile('app/pages/seeds/[seedId]/workspace.vue')

  assert.equal(workspacePage.includes('attachManualMonitor(record.id)'), true)
  assert.equal(workspacePage.includes('feedbackApi.getFeedbackHistory(publicationRecordId)'), true)
  assert.equal(workspacePage.includes('feedbackApi.createFeedbackSnapshot(publicationRecordId'), true)
  assert.equal(workspacePage.includes('feedbackApi.updateFeedbackSnapshot'), true)
  assert.equal(workspacePage.includes('feedbackHistories[record.id]'), true)
  assert.equal(workspacePage.includes('挂载人为监控器后可录入反馈快照'), true)
})
