// Herkunft: _bausteine/sicherheit/server/api/form-token.get.ts (Stand 21.11.2026)
// Liefert das Zeit-Token für ein öffentliches Formular: GET /api/form-token?form=contact.
// Wird beim Laden des Formulars im Browser geholt, nie ins vorgerenderte HTML gebacken
// (sonst wäre die Mindestzeit beim Besuch längst vorbei).
import { defineEventHandler, getQuery } from 'nuxt/server'
import { issueFormToken } from '../utils/form-token'
import { rateLimit } from '../utils/security'

const TOKEN_RATE_LIMIT = { max: 60, windowMs: 10 * 60 * 1000 }

export default defineEventHandler(async (event) => {
  rateLimit(event, 'form-token', TOKEN_RATE_LIMIT)
  const { form } = getQuery<{ form?: string }>(event)
  event.res.headers.set('cache-control', 'no-store')
  return { token: await issueFormToken(typeof form === 'string' ? form : '') }
})
