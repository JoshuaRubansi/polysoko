import { getCurrentUser } from '../../utils/auth-db'

export default defineEventHandler(async (event) => {
  return { user: await getCurrentUser(event) }
})
