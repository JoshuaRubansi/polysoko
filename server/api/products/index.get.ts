import { getAuthDatabase } from '../../utils/auth-db'

export default defineEventHandler((event) => {
  const products = getAuthDatabase(event).prepare(`
    SELECT id, name, category, price, location, seller, images_json AS images, stock
    FROM products
    WHERE is_active = 1 AND stock > 0
    ORDER BY created_at DESC, name ASC
  `).all() as Array<Record<string, unknown> & { images: string }>

  return {
    products: products.map(product => ({
      ...product,
      images: JSON.parse(product.images) as string[]
    }))
  }
})
