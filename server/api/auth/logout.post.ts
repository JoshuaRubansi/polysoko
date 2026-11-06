import {
  clearAuthSessionCookie,
  getAuthDatabase,
  getSessionToken,
  hashSessionToken
} from '../../utils/auth-db'

export default defineEventHandler((event) => {
  const token = getSessionToken(event)
  if (token) {
    getAuthDatabase(event).prepare('DELETE FROM sessions WHERE token_hash = ?')
      .run(hashSessionToken(token))
  }

  clearAuthSessionCookie(event)
  return { ok: true }
})
