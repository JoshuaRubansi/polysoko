import { randomUUID } from 'node:crypto'
import { createError, getHeader, readBody, readMultipartFormData } from 'h3'
import { getAuthDatabase } from '../../../utils/auth-db'
import { isValidProductImage, removeProductImages, saveProductImages, type UploadedImage } from '../../../utils/product-images'
import { requireAdmin } from '../../../utils/require-user'

const categories = ['Home & living', 'Fashion', 'Electronics', 'Art & craft', 'Food & drink']
const maxImageSize = 5 * 1024 * 1024

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  let body: Record<string, unknown> = {}
  let uploadedImages: UploadedImage[] = []
  if (getHeader(event, 'content-type')?.toLowerCase().includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event) ?? []
    const fields = new Map<string, string>()
    for (const part of parts) {
      if (part.name === 'photos' && part.filename) {
        const type = part.type?.toLowerCase()
        if (type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/webp') {
          throw createError({ statusCode: 400, statusMessage: 'Photos must be JPEG, PNG, or WebP images.' })
        }
        if (part.data.length === 0 || part.data.length > maxImageSize) {
          throw createError({ statusCode: 400, statusMessage: 'Each photo must be larger than 0 bytes and no more than 5 MB.' })
        }
        uploadedImages.push({ type, data: part.data })
        continue
      }

      if (!part.name || part.filename || fields.has(part.name)) {
        throw createError({ statusCode: 400, statusMessage: 'The item form contains an invalid field.' })
      }
      fields.set(part.name, part.data.toString('utf8'))
    }

    body = Object.fromEntries(fields)
    if (typeof body.images === 'string') {
      try {
        body.images = JSON.parse(body.images)
      } catch {
        throw createError({ statusCode: 400, statusMessage: 'The item photo links are invalid.' })
      }
    }
  } else {
    body = await readBody<Record<string, unknown>>(event) ?? {}
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const category = typeof body?.category === 'string' ? body.category : ''
  const location = typeof body?.location === 'string' ? body.location.trim() : ''
  const seller = typeof body?.seller === 'string' ? body.seller.trim() : ''
  const price = Number(body?.price)
  const stock = Number(body?.stock)
  const images = Array.isArray(body?.images) ? body.images : []

  if (!name || name.length > 100 || !categories.includes(category)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter an item name and a valid category.' })
  }
  if (!Number.isSafeInteger(price) || price < 1 || price > 99999999) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid price in KSh.' })
  }
  if (!Number.isSafeInteger(stock) || stock < 1 || stock > 10000) {
    throw createError({ statusCode: 400, statusMessage: 'Stock must be between 1 and 10,000.' })
  }
  if (!location || location.length > 100 || !seller || seller.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid location and seller name.' })
  }
  if (images.length + uploadedImages.length > 5) {
    throw createError({ statusCode: 400, statusMessage: 'Provide up to 5 photos or secure (https) photo links in total.' })
  }
  const imageUrls: string[] = []
  for (const image of images) {
    if (typeof image !== 'string' || image.length > 500 || !/^https:\/\//i.test(image)) {
      throw createError({ statusCode: 400, statusMessage: 'Provide up to 5 photos or secure (https) photo links in total.' })
    }
    imageUrls.push(image)
  }
  if (uploadedImages.some(image => !isValidProductImage(image))) {
    throw createError({ statusCode: 400, statusMessage: 'A photo is not a valid JPEG, PNG, or WebP image.' })
  }

  const uploadedImageUrls = await saveProductImages(event, uploadedImages)
  const productImages = [...imageUrls, ...uploadedImageUrls]
  const id = randomUUID()
  try {
    getAuthDatabase(event).prepare(`
      INSERT INTO products (id, name, category, price, location, seller, images_json, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, category, price, location, seller, JSON.stringify(productImages), stock)
  } catch (error) {
    await removeProductImages(event, uploadedImageUrls)
    throw error
  }

  return {
    product: { id, name, category, price, location, seller, images: productImages, stock }
  }
})
