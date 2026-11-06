import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'

const imageTypes = {
  'image/jpeg': { extension: 'jpg', matches: (data: Buffer) => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff },
  'image/png': { extension: 'png', matches: (data: Buffer) => data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { extension: 'webp', matches: (data: Buffer) => data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP' }
}

export type UploadedImage = {
  type: keyof typeof imageTypes
  data: Buffer
}

export function isValidProductImage(image: UploadedImage) {
  return imageTypes[image.type].matches(image.data)
}

export function getProductImageDirectory(event: H3Event) {
  const configuredPath = process.env.SQLITE_DB_PATH || useRuntimeConfig(event).sqlitePath
  const workingDirectory = process.cwd()
  const applicationRoot = basename(workingDirectory) === '.output'
    ? dirname(workingDirectory)
    : workingDirectory
  const databaseDirectory = isAbsolute(configuredPath)
    ? dirname(configuredPath)
    : resolve(applicationRoot, dirname(configuredPath))

  return resolve(databaseDirectory, 'product-images')
}

export async function saveProductImages(event: H3Event, images: UploadedImage[]) {
  if (images.length === 0) return []
  if (images.some(image => !isValidProductImage(image))) {
    throw new Error('An uploaded image has invalid image data.')
  }

  const directory = getProductImageDirectory(event)
  await mkdir(directory, { recursive: true })
  const savedFiles: string[] = []

  try {
    const urls: string[] = []
    for (const image of images) {
      const imageType = imageTypes[image.type]
      const filename = `${randomUUID()}.${imageType.extension}`
      await writeFile(resolve(directory, filename), image.data, { flag: 'wx' })
      savedFiles.push(filename)
      urls.push(`/api/product-images/${filename}`)
    }
    return urls
  } catch (error) {
    await Promise.all(savedFiles.map(filename => unlink(resolve(directory, filename))))
    throw error
  }
}

export async function removeProductImages(event: H3Event, images: string[]) {
  const directory = getProductImageDirectory(event)
  await Promise.all(images
    .filter(image => /^\/api\/product-images\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(image))
    .map(image => unlink(resolve(directory, image.slice('/api/product-images/'.length)))))
}
