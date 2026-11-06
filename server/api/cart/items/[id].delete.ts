import { createError, getRouterParam } from 'h3'
import { getAuthDatabase } from '../../../utils/auth-db'
import { requireUser } from '../../../utils/require-user'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const productId = getRouterParam(event, 'id')
  if (!productId) throw createError({ statusCode: 400, statusMessage: 'Product ID is required.' })
  getAuthDatabase(event).prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?')
    .run(user.id, productId)
  return { ok: true }
})
