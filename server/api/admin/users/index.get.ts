import { getAuthDatabase } from '../../../utils/auth-db'
import { requireAdmin } from '../../../utils/require-user'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const users = getAuthDatabase(event).prepare(`
    SELECT id, name, email, role, created_at AS createdAt
    FROM users
    ORDER BY created_at DESC
  `).all()
  return { users }
})
