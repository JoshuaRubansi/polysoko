import { createError, readBody } from 'h3'
import { getAuthDatabase } from '../../../utils/auth-db'
import { requireUser } from '../../../utils/require-user'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ productId?: unknown, quantity?: unknown }>(event)
  const productId = typeof body?.productId === 'string' ? body.productId : ''
  const quantity = body?.quantity === undefined ? 1 : Number(body.quantity)
  if (!productId || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid item and quantity.' })
  }

  const database = getAuthDatabase(event)
  const product = database.prepare('SELECT stock FROM products WHERE id = ? AND is_active = 1')
    .get(productId) as { stock: number } | undefined
  if (!product) throw createError({ statusCode: 404, statusMessage: 'Item is no longer available.' })

  const existing = database.prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(user.id, productId) as { quantity: number } | undefined
  if ((existing?.quantity ?? 0) + quantity > product.stock) {
    throw createError({ statusCode: 409, statusMessage: 'The cart quantity exceeds available stock.' })
  }

  database.prepare(`
    INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
    ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity
  `).run(user.id, productId, quantity)

  return { ok: true }
})
