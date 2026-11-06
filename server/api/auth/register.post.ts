import { randomUUID } from 'node:crypto'
import { createError, readBody } from 'h3'
import { createAuthSession, getAuthDatabase, hashPassword } from '../../utils/auth-db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: unknown
    email?: unknown
    password?: unknown
  }>(event)

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!name || name.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a name of 1 to 100 characters.' })
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address.' })
  }

  if (password.length < 8 || password.length > 128) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be 8 to 128 characters.' })
  }

  const database = getAuthDatabase(event)
  const passwordHash = await hashPassword(password)
  const userId = randomUUID()
  const result = database.prepare(`
    INSERT INTO users (id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, 'user')
    ON CONFLICT(email) DO NOTHING
  `).run(userId, name, email, passwordHash)

  if (result.changes === 0) {
    throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists.' })
  }

  createAuthSession(event, database, userId)
  return { ok: true, user: { id: userId, name, email, role: 'user' } }
})
