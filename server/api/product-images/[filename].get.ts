import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { createError, getRouterParam, setResponseHeader } from 'h3'
import { getProductImageDirectory } from '../../utils/product-images'

const imageContentTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
}

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')
  if (!filename || !/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(filename)) {
    throw createError({ statusCode: 404, statusMessage: 'Photo not found.' })
  }

  const path = resolve(getProductImageDirectory(event), filename)
  if (!existsSync(path)) {
    throw createError({ statusCode: 404, statusMessage: 'Photo not found.' })
  }

  setResponseHeader(event, 'Content-Type', imageContentTypes[extname(filename)])
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  return readFile(path)
})
