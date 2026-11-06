import { randomUUID } from 'node:crypto'
import { createError } from 'h3'
import { getAuthDatabase } from '../utils/auth-db'
import { requireUser } from '../utils/require-user'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const database = getAuthDatabase(event)
  const items = database.prepare(`
    SELECT products.id, products.name, products.price, products.stock, cart_items.quantity
    FROM cart_items
    JOIN products ON products.id = cart_items.product_id
    WHERE cart_items.user_id = ? AND products.is_active = 1
  `).all(user.id) as Array<{
    id: string
    name: string
    price: number
    stock: number
    quantity: number
  }>
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'Your cart is empty.' })
  if (items.some(item => item.quantity > item.stock)) {
    throw createError({ statusCode: 409, statusMessage: 'An item in your cart no longer has enough stock.' })
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const orderId = randomUUID()
  const checkout = database.transaction(() => {
    database.prepare('INSERT INTO orders (id, user_id, total) VALUES (?, ?, ?)').run(orderId, user.id, total)
    const insertOrderItem = database.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const decrementStock = database.prepare(`
      UPDATE products SET stock = stock - ? WHERE id = ? AND is_active = 1 AND stock >= ?
    `)

    for (const item of items) {
      insertOrderItem.run(randomUUID(), orderId, item.id, item.name, item.quantity, item.price)
      const update = decrementStock.run(item.quantity, item.id, item.quantity)
      if (update.changes !== 1) throw createError({ statusCode: 409, statusMessage: 'An item just sold out. Please refresh your cart.' })
    }

    database.prepare('DELETE FROM cart_items WHERE user_id = ?').run(user.id)
  })

  checkout()
  return { ok: true, orderId, total }
})
