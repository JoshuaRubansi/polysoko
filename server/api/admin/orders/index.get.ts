import { getAuthDatabase } from '../../../utils/auth-db'
import { requireAdmin } from '../../../utils/require-user'

type OrderRow = {
  id: string
  customerName: string
  customerEmail: string
  total: number
  createdAt: string
  productName: string
  quantity: number
  unitPrice: number
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const rows = getAuthDatabase(event).prepare(`
    SELECT orders.id, users.name AS customerName, users.email AS customerEmail,
      orders.total, orders.created_at AS createdAt,
      order_items.product_name AS productName, order_items.quantity,
      order_items.unit_price AS unitPrice
    FROM orders
    JOIN users ON users.id = orders.user_id
    JOIN order_items ON order_items.order_id = orders.id
    ORDER BY orders.created_at DESC
  `).all() as OrderRow[]

  const orders = new Map<string, {
    id: string
    customerName: string
    customerEmail: string
    total: number
    createdAt: string
    items: { name: string, quantity: number, unitPrice: number }[]
  }>()
  for (const row of rows) {
    let order = orders.get(row.id)
    if (!order) {
      order = {
        id: row.id,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        total: row.total,
        createdAt: row.createdAt,
        items: []
      }
      orders.set(row.id, order)
    }
    order.items.push({ name: row.productName, quantity: row.quantity, unitPrice: row.unitPrice })
  }

  return { orders: [...orders.values()] }
})
