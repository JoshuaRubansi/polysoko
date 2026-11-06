import { randomUUID } from 'node:crypto'
import { createError, readBody } from 'h3'
import { getAuthDatabase, hashPassword } from '../../../utils/auth-db'
import { requireAdmin } from '../../../utils/require-user'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ name?: unknown, email?: unknown, password?: unknown, role?: unknown }>(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const role = body?.role === undefined ? 'user' : body.role

  if (!name || name.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a name of 1 to 100 characters.' })
  }
  if (role !== 'user' && role !== 'admin') {
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid user role.' })
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address.' })
  }
  if (password.length < 8 || password.length > 128) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be 8 to 128 characters.' })
  }

  const database = getAuthDatabase(event)
  const id = randomUUID()
  try {
    database.prepare(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, email, await hashPassword(password), role)
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: users.email')) {
      throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists.' })
    }
    throw error
  }

  return { user: { id, name, email, role } }
})
