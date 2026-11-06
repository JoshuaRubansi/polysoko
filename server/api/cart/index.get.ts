import { getAuthDatabase } from '../../utils/auth-db'
import { requireUser } from '../../utils/require-user'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const items = getAuthDatabase(event).prepare(`
    SELECT products.id, products.name, products.category, products.price, products.location,
      products.seller, products.images_json AS images, products.stock, cart_items.quantity
    FROM cart_items
    JOIN products ON products.id = cart_items.product_id
    WHERE cart_items.user_id = ? AND products.is_active = 1
    ORDER BY cart_items.created_at DESC
  `).all(user.id) as Array<Record<string, unknown> & { images: string }>

  return {
    items: items.map(item => ({
      ...item,
      images: JSON.parse(item.images) as string[]
    }))
  }
})
