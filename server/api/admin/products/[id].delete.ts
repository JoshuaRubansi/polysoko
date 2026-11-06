import { createError, getRouterParam } from 'h3'
import { getAuthDatabase } from '../../../utils/auth-db'
import { requireAdmin } from '../../../utils/require-user'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Product ID is required.' })

  const database = getAuthDatabase(event)
  const result = database.prepare('UPDATE products SET is_active = 0 WHERE id = ? AND is_active = 1').run(id)
  if (result.changes === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found.' })
  }
  database.prepare('DELETE FROM cart_items WHERE product_id = ?').run(id)
  return { ok: true }
})
