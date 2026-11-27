// Herkunft: _bausteine/sicherheit/tests/build/fixtures/error-log-handler.ts (Stand 24.11.2026)
// Nur für den Build-Test (error-log-test-env.ts): wirft gezielt Fehler. Nie in Produktion eingebunden.
import { createError, defineEventHandler } from 'nuxt/server'

// Diese Texte dürfen nie im Log stehen (prüft tests/build/error-log.mjs)
const SECRET = 'geheim person@example.org'

export default defineEventHandler((event) => {
  const path = event.url.pathname
  if (path.startsWith('/__test/error-log/token/')) throw new TypeError(SECRET)
  switch (path) {
    case '/__test/error-log/unhandled':
      throw new TypeError(SECRET)
    case '/__test/error-log/fatal':
      throw createError({ status: 422, statusText: 'Unprocessable', message: 'Fatal-Meldung', data: { hint: 1 }, fatal: true })
    case '/__test/error-log/503':
      throw createError({ status: 503, statusText: 'Service Unavailable', message: 'Später', data: { retry: true } })
    case '/__test/error-log/400':
      throw createError({ status: 400, statusText: 'Bad Request', message: 'Feld fehlt', data: { field: 'name' } })
    default:
      throw createError({ status: 404, statusText: 'Not Found', message: 'Unbekannter Testfall' })
  }
})
