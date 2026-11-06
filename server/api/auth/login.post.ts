import { createError, readBody } from 'h3'
import { createAuthSession, ensureAdminAccount, getAuthDatabase, verifyPassword } from '../../utils/auth-db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: unknown
    password?: unknown
  }>(event)

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length > 128) {
    throw createError({ statusCode: 401, statusMessage: 'Email or password is incorrect.' })
  }

  await ensureAdminAccount(event)
  const database = getAuthDatabase(event)
  const user = database.prepare('SELECT id, password_hash FROM users WHERE email = ?')
    .get(email) as { id: string, password_hash: string } | undefined

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw createError({ statusCode: 401, statusMessage: 'Email or password is incorrect.' })
  }

  createAuthSession(event, database, user.id)
  const authenticatedUser = database.prepare('SELECT id, name, email, role FROM users WHERE id = ?')
    .get(user.id)
  return { ok: true, user: authenticatedUser }
})
