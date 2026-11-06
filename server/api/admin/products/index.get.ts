import { getAuthDatabase } from '../../../utils/auth-db'
import { requireAdmin } from '../../../utils/require-user'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const products = getAuthDatabase(event).prepare(`
    SELECT id, name, category, price, location, seller, images_json AS images, stock, is_active AS active
    FROM products
    ORDER BY created_at DESC, name ASC
  `).all() as Array<Record<string, unknown> & { images: string, active: number }>

  return {
    products: products.map(product => ({
      ...product,
      images: JSON.parse(product.images) as string[],
      active: Boolean(product.active)
    }))
  }
})
