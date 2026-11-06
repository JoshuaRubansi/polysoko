import { getAuthDatabase } from '../../utils/auth-db'
import { requireAdmin } from '../../utils/require-user'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const summary = getAuthDatabase(event).prepare(`
    SELECT COALESCE(SUM(total), 0) AS balance, COUNT(*) AS orderCount
    FROM orders
  `).get() as { balance: number, orderCount: number }
  return summary
})
