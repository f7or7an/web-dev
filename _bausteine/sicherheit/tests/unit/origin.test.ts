// Herkunft: _bausteine/sicherheit/tests/unit/origin.test.ts (Stand 21.11.2026)
import { afterEach, describe, expect, it } from 'vitest'
import originMiddleware, { expectedOriginFor, isAllowedOrigin } from '../../server/middleware/origin'
import { createTestEvent, resetTestRuntimeConfig, testRuntimeConfig } from './nuxt-server-stub'

const HOST = 'example.org'
const SITE = `https://${HOST}`
const base = { method: 'POST', pathname: '/api/contact', expectedOrigin: SITE, origin: SITE, secFetchSite: 'same-origin' }

afterEach(() => resetTestRuntimeConfig())

describe('isAllowedOrigin', () => {
  it('lässt lesende Anfragen immer durch', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS', 'get']) {
      expect(isAllowedOrigin({ ...base, method, origin: undefined, secFetchSite: 'cross-site' })).toBe(true)
    }
  })

  it('lässt ändernde Anfragen von der eigenen Seite durch', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(isAllowedOrigin({ ...base, method })).toBe(true)
    }
    // ältere Browser ohne Sec-Fetch-Site
    expect(isAllowedOrigin({ ...base, secFetchSite: undefined })).toBe(true)
  })

  it('erlaubt Origin null oder fehlend nur mit Sec-Fetch-Site: same-origin (referrer-policy: no-referrer)', () => {
    expect(isAllowedOrigin({ ...base, origin: 'null' })).toBe(true)
    expect(isAllowedOrigin({ ...base, origin: undefined })).toBe(true)
    expect(isAllowedOrigin({ ...base, origin: '' })).toBe(true)
  })

  it('lehnt Origin null oder fehlend ohne same-origin ab', () => {
    for (const secFetchSite of [undefined, 'none', 'same-site', 'cross-site', '']) {
      expect(isAllowedOrigin({ ...base, origin: undefined, secFetchSite }), String(secFetchSite)).toBe(false)
      expect(isAllowedOrigin({ ...base, origin: 'null', secFetchSite }), String(secFetchSite)).toBe(false)
    }
  })

  it('lehnt fremde Seiten, andere Subdomains, andere Ports und anderes Schema ab', () => {
    expect(isAllowedOrigin({ ...base, origin: 'https://evil.example', secFetchSite: undefined })).toBe(false)
    expect(isAllowedOrigin({ ...base, origin: `https://app.${HOST}`, secFetchSite: undefined })).toBe(false)
    expect(isAllowedOrigin({ ...base, origin: `${SITE}:8443` })).toBe(false)
    expect(isAllowedOrigin({ ...base, origin: `http://${HOST}` })).toBe(false)
    expect(isAllowedOrigin({ ...base, origin: 'kein-url' })).toBe(false)
    // http-Server, Seite kommt per https: Schema zählt mit (Fund des Prüfers)
    expect(isAllowedOrigin({ ...base, expectedOrigin: `http://${HOST}` })).toBe(false)
  })

  it('lehnt Sec-Fetch-Site cross-site und same-site auch bei passendem Origin ab', () => {
    expect(isAllowedOrigin({ ...base, secFetchSite: 'cross-site' })).toBe(false)
    expect(isAllowedOrigin({ ...base, secFetchSite: 'same-site' })).toBe(false)
  })

  it('prüft auch Pfade außerhalb von /api (kodierte Umwege)', () => {
    expect(isAllowedOrigin({ ...base, pathname: '/%61pi/contact', origin: 'https://evil.example' })).toBe(false)
    expect(isAllowedOrigin({ ...base, pathname: '/kontakt', origin: undefined, secFetchSite: undefined })).toBe(false)
  })

  it('lässt nur exakt eingetragene Ausnahmen ohne Origin durch', () => {
    const exempt = new Set(['/api/newsletter/unsubscribe'])
    const unsubscribe = { ...base, pathname: '/api/newsletter/unsubscribe', origin: undefined, secFetchSite: undefined }
    expect(isAllowedOrigin(unsubscribe, exempt)).toBe(true)
    expect(isAllowedOrigin({ ...unsubscribe, pathname: '/api/newsletter/unsubscribe/' }, exempt)).toBe(true)
    expect(isAllowedOrigin({ ...unsubscribe, pathname: '/api/newsletter/unsubscribe-all' }, exempt)).toBe(false)
    expect(isAllowedOrigin({ ...unsubscribe, pathname: '/api/newsletter' }, exempt)).toBe(false)
  })
})

describe('expectedOriginFor', () => {
  const fromRequest = () => 'http://127.0.0.1:3466'

  it('nimmt den Ursprung aus siteUrl (ohne Pfad)', () => {
    expect(expectedOriginFor('https://example.org/de/', false, fromRequest)).toBe(SITE)
  })

  it('nimmt Schema und Host der Anfrage, wenn siteUrl fehlt, ungültig ist oder der Dev-Server läuft', () => {
    expect(expectedOriginFor(undefined, false, fromRequest)).toBe('http://127.0.0.1:3466')
    expect(expectedOriginFor('', false, fromRequest)).toBe('http://127.0.0.1:3466')
    expect(expectedOriginFor('kein-url', false, fromRequest)).toBe('http://127.0.0.1:3466')
    expect(expectedOriginFor(SITE, true, fromRequest)).toBe('http://127.0.0.1:3466')
  })
})

describe('Middleware', () => {
  function post(url: string, headers: Record<string, string>) {
    return createTestEvent(url, { method: 'POST', headers })
  }

  it('wirft 403 bei fremdem Origin', () => {
    const event = post('http://example.org/api/contact', { host: HOST, origin: 'https://evil.example' })
    expect(() => originMiddleware(event)).toThrow(expect.objectContaining({ status: 403, statusText: 'Forbidden' }))
  })

  it('lässt ohne siteUrl die eigene Seite (Schema + Host der Anfrage) durch', () => {
    expect(originMiddleware(post('http://example.org/api/contact', { host: HOST, origin: `http://${HOST}` }))).toBeUndefined()
    expect(() => originMiddleware(post('http://example.org/api/contact', { host: HOST, origin: SITE }))).toThrow()
    // hinter Caddy: Schema aus X-Forwarded-Proto
    expect(originMiddleware(post('http://example.org/api/contact', { 'host': HOST, 'origin': SITE, 'x-forwarded-proto': 'https' }))).toBeUndefined()
  })

  it('vergleicht mit siteUrl, wenn gesetzt', () => {
    testRuntimeConfig.public.siteUrl = SITE
    // Container spricht intern http, die Seite kommt per https
    expect(originMiddleware(post('http://example.org/api/contact', { host: HOST, origin: SITE }))).toBeUndefined()
    expect(() => originMiddleware(post('http://example.org/api/contact', { host: HOST, origin: `http://${HOST}` }))).toThrow()
  })

  it('lässt ein Formular von einer no-referrer-Seite durch (Origin null + same-origin)', () => {
    const event = post('http://example.org/api/newsletter/confirm', { 'host': HOST, 'origin': 'null', 'sec-fetch-site': 'same-origin' })
    expect(originMiddleware(event)).toBeUndefined()
    expect(() => originMiddleware(post('http://example.org/api/newsletter/confirm', { host: HOST, origin: 'null' })))
      .toThrow(expect.objectContaining({ status: 403 }))
  })
})
