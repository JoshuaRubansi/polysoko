import { createError } from 'h3'
import { getCurrentUser } from './auth-db'

export async function requireUser(event: Parameters<typeof getCurrentUser>[0]) {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Please sign in to continue.' })
  }
  return user
}

export async function requireAdmin(event: Parameters<typeof getCurrentUser>[0]) {
  const user = await requireUser(event)
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Administrator access is required.' })
  }
  return user
}
