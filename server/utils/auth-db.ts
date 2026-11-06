import { mkdirSync } from 'node:fs'
import { basename, dirname, isAbsolute, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { getCookie, setCookie } from 'h3'
import type { H3Event } from 'h3'
import { randomUUID } from 'node:crypto'

const scryptAsync = promisify(scrypt)
const sessionCookieName = 'polysoko_session'
const sessionLifetimeSeconds = 60 * 60 * 24 * 30
let db: Database.Database | undefined
let adminSetup: Promise<void> | undefined

const starterProducts = [
  ['Handwoven market basket', 'Home & living', 1800, 'Westlands, Nairobi', 'Woven by Wanjiku', 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=85'],
  ['Everyday leather sandals', 'Fashion', 2400, 'Kilimani, Nairobi', 'Mtaa Studio', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=85'],
  ['Speckled ceramic mug set', 'Home & living', 3200, 'Lavington, Nairobi', 'Earth & Kiln', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85'],
  ['Vintage film camera', 'Electronics', 8500, 'Karen, Nairobi', 'Second Story', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85'],
  ['Wildflower art print', 'Art & craft', 1500, 'Runda, Nairobi', 'Nia Creates', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=85'],
  ['Small-batch coffee beans', 'Food & drink', 950, 'Kileleshwa, Nairobi', 'Kahawa Collective', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=900&q=85'],
  ['Linen weekend shirt', 'Fashion', 2800, 'Parklands, Nairobi', 'Soko Sunday', 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85'],
  ['Sculptural clay vase', 'Home & living', 4100, 'Ngong Road, Nairobi', 'Earth & Kiln', 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=85']
]

export function getAuthDatabase(event: H3Event) {
  if (db) return db

  const configuredPath = process.env.SQLITE_DB_PATH || useRuntimeConfig(event).sqlitePath
  const workingDirectory = process.cwd()
  const applicationRoot = basename(workingDirectory) === '.output'
    ? dirname(workingDirectory)
    : workingDirectory
  const databasePath = isAbsolute(configuredPath)
    ? configuredPath
    : resolve(applicationRoot, configuredPath)

  mkdirSync(dirname(databasePath), { recursive: true })
  db = new Database(databasePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price > 0),
      location TEXT NOT NULL,
      seller TEXT NOT NULL,
      images_json TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 100 CHECK (stock >= 0),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      total INTEGER NOT NULL CHECK (total > 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price INTEGER NOT NULL CHECK (unit_price > 0)
    );

    CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);
    CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
  `)

  const userColumns = db.pragma('table_info(users)') as { name: string }[]
  if (!userColumns.some(column => column.name === 'role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'))")
  }

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (id, name, category, price, location, seller, images_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const seedProducts = db.transaction(() => {
    starterProducts.forEach(([name, category, price, location, seller, image], index) => {
      insertProduct.run(
        `starter-${index + 1}`,
        name,
        category,
        price,
        location,
        seller,
        JSON.stringify([image])
      )
    })
  })
  seedProducts()

  return db
}

export async function ensureAdminAccount(event: H3Event) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) return
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128) {
    throw new Error('ADMIN_EMAIL must be valid and ADMIN_PASSWORD must contain 8 to 128 characters.')
  }

  adminSetup ??= (async () => {
    const database = getAuthDatabase(event)
    const passwordHash = await hashPassword(password)
    database.prepare(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, 'Administrator', ?, ?, 'admin')
      ON CONFLICT(email) DO UPDATE SET
        password_hash = excluded.password_hash,
        role = 'admin'
    `).run(randomUUID(), email, passwordHash)
  })()

  await adminSetup
}

export async function getCurrentUser(event: H3Event) {
  await ensureAdminAccount(event)
  const token = getSessionToken(event)
  if (!token) return null

  const database = getAuthDatabase(event)
  const user = database.prepare(`
    SELECT users.id, users.name, users.email, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(hashSessionToken(token), Date.now()) as {
    id: string
    name: string
    email: string
    role: 'user' | 'admin'
  } | undefined

  return user ?? null
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [saltHex, keyHex] = storedHash.split(':')
  if (!saltHex || !keyHex || !/^[a-f\d]+$/i.test(saltHex) || !/^[a-f\d]+$/i.test(keyHex)) {
    return false
  }

  const salt = Buffer.from(saltHex, 'hex')
  const expectedKey = Buffer.from(keyHex, 'hex')
  if (expectedKey.length !== 64) return false

  const actualKey = await scryptAsync(password, salt, expectedKey.length) as Buffer
  return timingSafeEqual(actualKey, expectedKey)
}

export function createAuthSession(event: H3Event, database: Database.Database, userId: string) {
  const previousToken = getCookie(event, sessionCookieName)
  if (previousToken) {
    database.prepare('DELETE FROM sessions WHERE token_hash = ?')
      .run(hashSessionToken(previousToken))
  }

  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = Date.now() + sessionLifetimeSeconds * 1000

  database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
  database.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(tokenHash, userId, expiresAt)

  setCookie(event, sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionLifetimeSeconds,
    expires: new Date(expiresAt)
  })
}

export function getSessionToken(event: H3Event) {
  return getCookie(event, sessionCookieName)
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function clearAuthSessionCookie(event: H3Event) {
  setCookie(event, sessionCookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0)
  })
}
