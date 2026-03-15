import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DATA_PATH = resolve('./server/data/waitlist.json')

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = (body?.email ?? '').trim().toLowerCase()

  if (!email || !isValidEmail(email)) {
    return { success: false, message: '请输入有效的邮箱地址' }
  }

  let list: { email: string; joinedAt: string }[] = []
  try {
    list = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
  } catch {
    list = []
  }

  // Idempotent: already exists
  if (list.some(item => item.email === email)) {
    return { success: true, message: '你已经在候补名单中了' }
  }

  list.push({ email, joinedAt: new Date().toISOString() })
  writeFileSync(DATA_PATH, JSON.stringify(list, null, 2), 'utf-8')

  return { success: true, message: '已成功加入候补名单' }
})
