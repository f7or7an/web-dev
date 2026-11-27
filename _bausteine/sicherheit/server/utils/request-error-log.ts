// Herkunft: _bausteine/sicherheit/server/utils/request-error-log.ts (Stand 24.11.2026)
// Fehlerlog ohne Personendaten (Regel server-und-sicherheit.md, „Logging“). Nitros Standard schreibt bei
// unbehandelten Fehlern `[request error] [unhandled] [GET] <volle URL>` plus mehrzeiligen Stacktrace: kein JSON,
// und Tokens aus dem Pfad (z. B. /api/termine/<token>) landen im Log.
// Hier: eine JSON-Zeile mit Status, Methode, Routenmuster bzw. maskiertem Pfad, Fehlername und Stack-Frames
// (ohne Fehlermeldung). Die Meldung nur im Dev-Modus. Ohne Nuxt-Abhängigkeit, damit es sich ohne Nuxt testen lässt.

// Ein Pfadsegment bleibt nur stehen, wenn es wie ein fester Routenteil aussieht (z. B. `api`, `termine`, `_nuxt`):
// höchstens 20 Kleinbuchstaben, Binde- oder Unterstriche. Alles andere (Ziffern, Großbuchstaben, Punkt, `=`, `@`, `%`,
// längere Folgen) kann ein Token, eine ID oder eine E-Mail sein und wird maskiert.
const KEEP_SEGMENT = /^_{0,2}[a-z][a-z_-]{0,19}$/
export const MASKED_SEGMENT = '[maskiert]'
// So nennt radix3 (h3 v1) den Parameter einer Catch-all-Route `/**`
const CATCH_ALL_PARAM = '_'
const MAX_FRAMES = 10
const MAX_FRAME_LENGTH = 300
const STACK_FRAME = /^\s*at /
// Nitro meldet diese Fehler von sich aus mit Stacktrace; 4xx (z. B. createError 400) sind erwartete Fehler
const SERVER_ERROR_STATUS = 500
const NEUTRAL_MESSAGE = 'Server Error'

/** Was der Baustein von Nitros H3Error liest bzw. ändert (strukturell, damit kein h3-Typ nötig ist). */
export interface RequestErrorLike {
  name?: string
  message: string
  stack?: string
  statusCode?: number
  status?: number
  unhandled?: boolean
  fatal?: boolean
  data?: unknown
  cause?: unknown
}

/** Was der Baustein vom h3-Event liest. */
export interface RequestEventLike {
  method?: string
  path?: string
  headers?: { get: (name: string) => string | null }
  context?: {
    matchedRoute?: { path?: string }
    params?: Record<string, string | undefined>
  }
}

export interface RequestErrorLogEntry {
  level: 'error'
  scope: 'request'
  status: number
  method: string
  route?: string
  path?: string
  error: string
  frames: string[]
  message?: string
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  }
  catch {
    return segment
  }
}

/**
 * Pfad ohne Query und Fragment. Maskiert jedes Segment, das kein fester Routenteil ist, und zusätzlich jeden
 * Wert aus `params` (Routenparameter wie `:token`, auch kurze wie `a1b2c3`).
 */
export function maskRequestPath(path: string, params: Record<string, string | undefined> = {}): string {
  const pathname = path.split(/[?#]/)[0] ?? ''
  // Catch-all-Parameter (`_` bei `/**`) enthalten den Restpfad; dort entscheidet die Segmentregel
  const paramValues = new Set(Object.entries(params)
    .flatMap(([key, value]) => key !== CATCH_ALL_PARAM && value && !value.includes('/') ? [value] : []))
  return pathname
    .split('/')
    .map((segment) => {
      if (segment === '') return segment
      if (paramValues.has(segment) || paramValues.has(decodeSegment(segment))) return MASKED_SEGMENT
      return KEEP_SEGMENT.test(segment) ? segment : MASKED_SEGMENT
    })
    .join('/')
}

function errorStatus(error: RequestErrorLike): number {
  return error.statusCode ?? error.status ?? SERVER_ERROR_STATUS
}

function isSensitive(error: RequestErrorLike): boolean {
  return Boolean(error.unhandled || error.fatal)
}

/** true = Nitro hätte den Fehler mit URL und Stacktrace geloggt bzw. es ist ein Serverfehler. */
export function shouldLogRequestError(error: RequestErrorLike): boolean {
  return isSensitive(error) || errorStatus(error) >= SERVER_ERROR_STATUS
}

// Unbehandelte Fehler kommen als H3Error mit dem eigentlichen Fehler in `cause`
function originalError(error: RequestErrorLike): RequestErrorLike {
  return error.unhandled && error.cause instanceof Error ? error.cause : error
}

/** Stack-Frames ohne die erste Zeile (die Meldung kann Eingaben enthalten), höchstens 10, gekürzt. */
export function stackFrames(stack: string | undefined): string[] {
  if (!stack) return []
  return stack
    .split('\n')
    .filter(line => STACK_FRAME.test(line))
    .slice(0, MAX_FRAMES)
    .map(line => line.trim().slice(0, MAX_FRAME_LENGTH))
}

function isCatchAll(route: string): boolean {
  return route.includes('**')
}

export function requestErrorLogEntry(error: RequestErrorLike, event: RequestEventLike, isDev: boolean): RequestErrorLogEntry {
  const original = originalError(error)
  const route = event.context?.matchedRoute?.path
  // Ein konkretes Routenmuster (z. B. /api/termine/:token) reicht; den Pfad nur bei Catch-all (Seiten: /**) oder ohne Muster
  const location = route && !isCatchAll(route)
    ? { route }
    : { ...(route ? { route } : {}), path: maskRequestPath(event.path ?? '', event.context?.params) }
  return {
    level: 'error',
    scope: 'request',
    status: errorStatus(error),
    method: event.method ?? 'UNKNOWN',
    ...location,
    error: original.name ?? 'Error',
    frames: stackFrames(original.stack),
    ...(isDev ? { message: original.message } : {}),
  }
}

function hasHeader(event: RequestEventLike, name: string, part: string): boolean {
  return event.headers?.get(name)?.toLowerCase().includes(part) ?? false
}

/**
 * true = die Fehlerantwort ist JSON. Gleiche Regel wie Nitro bzw. Nuxt (`isJsonRequest` in
 * @nuxt/nitro-server 4.6.4, aus Nitro übernommen). Bei JSON schickt Nitro für `fatal` „Server Error“ ohne `data`,
 * die HTML-Fehlerseite von Nuxt zeigt dagegen die echte Meldung.
 */
export function isJsonErrorResponse(event: RequestEventLike): boolean {
  if (hasHeader(event, 'accept', 'text/html')) return false
  const path = event.path ?? ''
  return hasHeader(event, 'accept', 'application/json')
    || hasHeader(event, 'user-agent', 'curl/')
    || hasHeader(event, 'user-agent', 'httpie/')
    || hasHeader(event, 'sec-fetch-mode', 'cors')
    || path.startsWith('/api/')
    || path.endsWith('.json')
}

/**
 * Verhindert Nitros eigenes Log, ohne die Antwort zu ändern. Nitro loggt nur Fehler mit `unhandled`/`fatal`.
 * - unhandled: Nitro und Nuxt schicken „Server Error“ ohne `data` (JSON und HTML) → genau das einstellen.
 * - nur fatal: als JSON „Server Error“ ohne `data`; Nuxts HTML-Fehlerseite zeigt `message`/`data` → dort unverändert.
 * Nur in Produktion; im Dev-Modus bleiben Nuxts Fehlerseite und Ausgabe unverändert.
 */
export function silenceDefaultErrorLog(error: RequestErrorLike, jsonResponse: boolean): void {
  if (!isSensitive(error)) return
  const neutralize = Boolean(error.unhandled) || jsonResponse
  error.unhandled = false
  error.fatal = false
  if (!neutralize) return
  error.message = NEUTRAL_MESSAGE
  error.data = undefined
}

/** Für den Nitro-Hook `error`: loggt eine JSON-Zeile und schaltet in Produktion Nitros Standardlog ab. */
export function handleRequestError(error: RequestErrorLike, event: RequestEventLike, isDev: boolean): void {
  if (!shouldLogRequestError(error)) return
  console.error(JSON.stringify(requestErrorLogEntry(error, event, isDev)))
  if (!isDev) silenceDefaultErrorLog(error, isJsonErrorResponse(event))
}
