// Herkunft: _bausteine/sicherheit/tests/unit/request-error-log.test.ts (Stand 24.11.2026)
// Das Zusammenspiel mit Nitro/Nuxt prüft der Build-Test tests/build/error-log.mjs (npm run test:build).
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RequestErrorLike, RequestEventLike } from '../../server/utils/request-error-log'
import {
  handleRequestError,
  isJsonErrorResponse,
  MASKED_SEGMENT,
  maskRequestPath,
  requestErrorLogEntry,
  shouldLogRequestError,
  silenceDefaultErrorLog,
  stackFrames,
} from '../../server/utils/request-error-log'

const TOKEN = 'Abc123_def-456GHI789jkl'
const SECRET = 'geheim person@example.org'

function unhandledError(): RequestErrorLike {
  // So kommt ein unbehandelter Fehler bei Nitro an: H3Error mit dem eigentlichen Fehler in `cause`
  return Object.assign(new Error(`Datenbank nicht erreichbar: ${SECRET}`), {
    statusCode: 500,
    unhandled: true,
    data: { detail: 'intern' },
    cause: new TypeError(SECRET),
  })
}

function fatalError(): RequestErrorLike {
  return Object.assign(new Error('Diese Seite gibt es nicht'), { statusCode: 404, fatal: true, data: { hint: 'x' } })
}

function eventFor(path: string, init: { route?: string, params?: Record<string, string>, accept?: string } = {}): RequestEventLike {
  return {
    method: 'GET',
    path,
    headers: new Headers(init.accept ? { accept: init.accept } : {}),
    context: { ...(init.route ? { matchedRoute: { path: init.route } } : {}), params: init.params ?? {} },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('maskRequestPath', () => {
  it('entfernt Query und Fragment und lässt feste Routenteile stehen', () => {
    expect(maskRequestPath('/kontakt?mail=person@example.org#x')).toBe('/kontakt')
    expect(maskRequestPath('/newsletter/bestaetigen')).toBe('/newsletter/bestaetigen')
    expect(maskRequestPath('/_nuxt/__nuxt_error')).toBe('/_nuxt/__nuxt_error')
    expect(maskRequestPath('/')).toBe('/')
  })

  it('maskiert alles, was ein Token, eine ID oder eine E-Mail sein kann', () => {
    for (const segment of [TOKEN, 'v1.1800000000000.abcDEF', 'YWJjZGVmZ2hpams=', 'a1b2c3', '42', 'person@example.org', 'person%40example.org', 'abcdefghijklmnopqrstuvwx']) {
      expect(maskRequestPath(`/api/termine/${segment}`), segment).toBe(`/api/termine/${MASKED_SEGMENT}`)
    }
  })

  it('maskiert zusätzlich jeden Routenparameter, auch kurze aus Kleinbuchstaben', () => {
    expect(maskRequestPath('/termine/abcdef/ok', { token: 'abcdef' })).toBe(`/termine/${MASKED_SEGMENT}/ok`)
    // Catch-all-Parameter `_` (Seiten unter /**) enthält den Restpfad: dort gilt nur die Segmentregel
    expect(maskRequestPath('/kontakt', { _: 'kontakt' })).toBe('/kontakt')
  })
})

describe('shouldLogRequestError', () => {
  it('loggt unbehandelte, fatale und 5xx-Fehler, keine erwarteten 4xx', () => {
    expect(shouldLogRequestError(unhandledError())).toBe(true)
    expect(shouldLogRequestError(fatalError())).toBe(true)
    expect(shouldLogRequestError(Object.assign(new Error('x'), { statusCode: 503 }))).toBe(true)
    expect(shouldLogRequestError(Object.assign(new Error('x'), { statusCode: 400 }))).toBe(false)
    expect(shouldLogRequestError(Object.assign(new Error('x'), { status: 404 }))).toBe(false)
  })
})

describe('stackFrames', () => {
  it('liefert höchstens 10 Frames ohne die Meldung', () => {
    const stack = [`TypeError: ${SECRET}`, 'zweite Zeile der Meldung', ...Array.from({ length: 12 }, (_, index) => `    at f${index} (file:///app/.output/server/chunks/x.mjs:${index}:1)`)].join('\n')
    const frames = stackFrames(stack)
    expect(frames).toHaveLength(10)
    expect(frames[0]).toBe('at f0 (file:///app/.output/server/chunks/x.mjs:0:1)')
    expect(frames.join('\n')).not.toContain('example.org')
    expect(stackFrames(undefined)).toEqual([])
  })
})

describe('requestErrorLogEntry', () => {
  it('nimmt bei konkretem Routenmuster nur das Muster, keinen Pfad und keine Meldung', () => {
    const entry = requestErrorLogEntry(unhandledError(), eventFor(`/api/termine/${TOKEN}?mail=x`, { route: '/api/termine/:token', params: { token: TOKEN } }), false)
    expect(entry).toMatchObject({ level: 'error', scope: 'request', status: 500, method: 'GET', route: '/api/termine/:token', error: 'TypeError' })
    expect(entry).not.toHaveProperty('path')
    expect(entry).not.toHaveProperty('message')
    expect(entry.frames.length).toBeGreaterThan(0)
    const line = JSON.stringify(entry)
    expect(line).not.toContain(TOKEN)
    expect(line).not.toContain('example.org')
  })

  it('loggt bei Catch-all (Seiten) zusätzlich den maskierten Pfad', () => {
    const entry = requestErrorLogEntry(unhandledError(), eventFor(`/fehler/${TOKEN}`, { route: '/**', params: { _: `fehler/${TOKEN}` } }), false)
    expect(entry).toMatchObject({ route: '/**', path: `/fehler/${MASKED_SEGMENT}` })
  })

  it('gibt die Meldung nur im Dev-Modus mit', () => {
    expect(requestErrorLogEntry(unhandledError(), eventFor('/x'), true).message).toBe(SECRET)
  })

  it('kommt ohne Routenmuster und Methode aus', () => {
    expect(requestErrorLogEntry(unhandledError(), { path: `/x/${TOKEN}` }, false)).toMatchObject({ method: 'UNKNOWN', path: `/x/${MASKED_SEGMENT}` })
  })
})

describe('isJsonErrorResponse (wie Nuxt/Nitro isJsonRequest)', () => {
  it('erkennt JSON- und HTML-Anfragen', () => {
    expect(isJsonErrorResponse(eventFor('/api/x'))).toBe(true)
    expect(isJsonErrorResponse(eventFor('/daten.json'))).toBe(true)
    expect(isJsonErrorResponse(eventFor('/seite', { accept: 'application/json' }))).toBe(true)
    expect(isJsonErrorResponse(eventFor('/api/x', { accept: 'text/html,application/xhtml+xml' }))).toBe(false)
    expect(isJsonErrorResponse(eventFor('/seite'))).toBe(false)
    expect(isJsonErrorResponse({ path: '/seite', headers: new Headers({ 'sec-fetch-mode': 'cors' }) })).toBe(true)
  })
})

describe('silenceDefaultErrorLog', () => {
  it('neutralisiert unbehandelte Fehler wie Nitro (JSON und HTML)', () => {
    for (const json of [true, false]) {
      const error = unhandledError()
      silenceDefaultErrorLog(error, json)
      expect(error).toMatchObject({ unhandled: false, fatal: false, message: 'Server Error', data: undefined, statusCode: 500 })
    }
  })

  it('lässt bei fatal als HTML Meldung und Daten stehen (Nuxts Fehlerseite zeigt sie)', () => {
    const error = fatalError()
    silenceDefaultErrorLog(error, false)
    expect(error).toMatchObject({ fatal: false, message: 'Diese Seite gibt es nicht', data: { hint: 'x' } })
  })

  it('neutralisiert fatal als JSON wie Nitro', () => {
    const error = fatalError()
    silenceDefaultErrorLog(error, true)
    expect(error).toMatchObject({ fatal: false, message: 'Server Error', data: undefined })
  })

  it('lässt erwartete Fehler unverändert', () => {
    const error = Object.assign(new Error('Später'), { statusCode: 503, data: { retry: true } })
    silenceDefaultErrorLog(error, true)
    expect(error).toMatchObject({ message: 'Später', data: { retry: true } })
  })
})

describe('handleRequestError', () => {
  it('schreibt in Produktion genau eine JSON-Zeile ohne Token und Meldung', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = unhandledError()
    handleRequestError(error, eventFor(`/api/termine/${TOKEN}`, { route: '/api/termine/:token', params: { token: TOKEN } }), false)
    expect(log).toHaveBeenCalledTimes(1)
    const line = String(log.mock.calls[0]?.[0])
    expect(JSON.parse(line)).toMatchObject({ level: 'error', status: 500, error: 'TypeError' })
    expect(line).not.toContain(TOKEN)
    expect(line).not.toContain('example.org')
    expect(error.unhandled).toBe(false)
  })

  it('lässt den Fehler im Dev-Modus unverändert (Nuxts Fehlerseite und Ausgabe)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = unhandledError()
    handleRequestError(error, eventFor('/api/x'), true)
    expect(error.unhandled).toBe(true)
    expect(error.message).toContain('Datenbank')
  })

  it('ignoriert erwartete 4xx-Fehler', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = Object.assign(new Error('Bitte die markierten Eingaben prüfen.'), { statusCode: 400, data: { fieldErrors: {} } })
    handleRequestError(error, eventFor('/api/x'), false)
    expect(log).not.toHaveBeenCalled()
    expect(error.message).toBe('Bitte die markierten Eingaben prüfen.')
  })
})
