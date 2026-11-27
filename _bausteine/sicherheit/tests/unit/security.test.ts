// Herkunft: _bausteine/sicherheit/tests/unit/security.test.ts (Stand 24.11.2026)
import { describe, expect, it } from 'vitest'
import { z } from '../../shared/zod'
import { createFormToken } from '../../server/utils/form-token-core'
import { consumeRateLimit, getClientIp, MAX_RATE_LIMIT_ENTRIES, rateLimit, rateLimitAddress, rateLimitEntryCount, readForm, resetRateLimit } from '../../server/utils/security'
import { FORM_TOKEN_MIN_AGE_MS } from '../../shared/utils/form-protection'
import { createTestEvent, TEST_APP_SECRET } from './nuxt-server-stub'

const URL_CONTACT = 'http://localhost/api/contact'
const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(5000),
})

function postJson(body: unknown, headers: Record<string, string> = {}) {
  return createTestEvent(URL_CONTACT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

/** Token, das die Mindestzeit schon hinter sich hat (Secret wie im Stub abgeleitet). */
function readyToken(form = 'contact') {
  return createFormToken(`${TEST_APP_SECRET}:nuxt-base:form-token`, form, Date.now() - FORM_TOKEN_MIN_AGE_MS - 1_000)
}

describe('getClientIp', () => {
  it('nimmt den letzten Eintrag aus X-Forwarded-For (hinter Caddy)', () => {
    const event = createTestEvent('http://localhost/', { headers: { 'x-forwarded-for': '1.2.3.4, 198.51.100.9' } })
    expect(getClientIp(event)).toBe('198.51.100.9')
  })

  it('nutzt ohne Header die Socket-Adresse', () => {
    expect(getClientIp(createTestEvent('http://localhost/', { clientAddress: '192.0.2.1' }))).toBe('192.0.2.1')
  })
})

describe('rateLimit', () => {
  it('lässt max Versuche zu und gibt dann 429 mit Retry-After', () => {
    const options = { max: 2, windowMs: 60_000 }
    const event = createTestEvent('http://localhost/', { clientAddress: '192.0.2.50' })
    rateLimit(event, 'test-limit', options)
    rateLimit(event, 'test-limit', options)
    expect(() => rateLimit(event, 'test-limit', options)).toThrow(expect.objectContaining({ status: 429 }))
    expect(Number(event.res.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('zählt je Zweck und IP getrennt', () => {
    const options = { max: 1, windowMs: 60_000 }
    rateLimit(createTestEvent('http://localhost/', { clientAddress: '192.0.2.60' }), 'a', options)
    expect(() => rateLimit(createTestEvent('http://localhost/', { clientAddress: '192.0.2.61' }), 'a', options)).not.toThrow()
    expect(() => rateLimit(createTestEvent('http://localhost/', { clientAddress: '192.0.2.60' }), 'b', options)).not.toThrow()
  })

  it('zählt beim Login zusätzlich pro Konto und lässt sich zurücksetzen', () => {
    const options = { max: 1, windowMs: 60_000, key: 'person@example.org' }
    rateLimit(createTestEvent('http://localhost/', { clientAddress: '192.0.2.70' }), 'login-account', options)
    // andere IP, gleiches Konto → gesperrt
    expect(() => rateLimit(createTestEvent('http://localhost/', { clientAddress: '192.0.2.71' }), 'login-account', options))
      .toThrow(expect.objectContaining({ status: 429 }))
    resetRateLimit('login-account', 'person@example.org')
    expect(() => rateLimit(createTestEvent('http://localhost/'), 'login-account', options)).not.toThrow()
  })

  it('öffnet nach Ablauf des Zeitfensters wieder', () => {
    const now = 1_800_000_000_000
    expect(consumeRateLimit('window', 1, 1_000, now).allowed).toBe(true)
    expect(consumeRateLimit('window', 1, 1_000, now + 500).allowed).toBe(false)
    expect(consumeRateLimit('window', 1, 1_000, now + 1_000).allowed).toBe(true)
  })
})

describe('rateLimitAddress', () => {
  it('lässt IPv4 unverändert und kürzt IPv6 auf das /64-Netz', () => {
    expect(rateLimitAddress('192.0.2.1')).toBe('192.0.2.1')
    expect(rateLimitAddress('2001:db8:1:2:3:4:5:6')).toBe('2001:db8:1:2::/64')
    expect(rateLimitAddress('2001:DB8:1:2::ffff')).toBe('2001:db8:1:2::/64')
    expect(rateLimitAddress('2001:0db8:0001:0002:aaaa::1')).toBe('2001:db8:1:2::/64')
    expect(rateLimitAddress('2001:db8::1')).toBe('2001:db8:0:0::/64')
    expect(rateLimitAddress('::1')).toBe('0:0:0:0::/64')
    expect(rateLimitAddress('fe80::1%eth0')).toBe('fe80:0:0:0::/64')
    expect(rateLimitAddress('::ffff:192.0.2.1')).toBe('192.0.2.1')
  })

  it('zählt zwei Adressen aus demselben /64 gemeinsam', () => {
    const options = { max: 1, windowMs: 60_000 }
    rateLimit(createTestEvent('http://localhost/', { clientAddress: '2001:db8:aa:bb::1' }), 'v6', options)
    expect(() => rateLimit(createTestEvent('http://localhost/', { clientAddress: '2001:db8:aa:bb::2' }), 'v6', options))
      .toThrow(expect.objectContaining({ status: 429 }))
  })
})

describe('Speichergrenze des Rate-Limits', () => {
  it('hält höchstens MAX_RATE_LIMIT_ENTRIES Einträge und verwirft die ältesten', () => {
    const now = 1_900_000_000_000
    for (let index = 0; index < MAX_RATE_LIMIT_ENTRIES + 500; index++) consumeRateLimit(`flood:${index}`, 1, 60 * 60 * 1000, now)
    expect(rateLimitEntryCount()).toBe(MAX_RATE_LIMIT_ENTRIES)
    // ältester Eintrag ist weg (zählt neu), neuester noch da (gesperrt)
    expect(consumeRateLimit('flood:0', 1, 60 * 60 * 1000, now).allowed).toBe(true)
    expect(consumeRateLimit(`flood:${MAX_RATE_LIMIT_ENTRIES + 499}`, 1, 60 * 60 * 1000, now).allowed).toBe(false)
  })

  it('kürzt lange Schlüssel', () => {
    const options = { max: 1, windowMs: 60_000 }
    const event = createTestEvent('http://localhost/')
    rateLimit(event, 'long-key', { ...options, key: `${'x'.repeat(128)}A` })
    // gleiche ersten 128 Zeichen → derselbe Zähler
    expect(() => rateLimit(event, 'long-key', { ...options, key: `${'x'.repeat(128)}B` })).toThrow(expect.objectContaining({ status: 429 }))
  })
})

describe('readForm', () => {
  it('gibt bei gefülltem Honeypot null zurück, noch vor Token und Validierung', async () => {
    await expect(readForm(postJson({ website: 'http://spam.example' }), 'contact', contactSchema)).resolves.toBeNull()
    await expect(readForm(postJson({ website: ['x'] }), 'contact', contactSchema)).resolves.toBeNull()
  })

  it('verlangt das Zeit-Token', async () => {
    await expect(readForm(postJson({ name: 'A', message: 'Hallo', website: '' }), 'contact', contactSchema))
      .rejects.toMatchObject({ status: 400, data: { formToken: 'missing' } })
  })

  it('lehnt das Token eines anderen Formulars ab', async () => {
    const event = postJson({ name: 'A', message: 'Hallo', website: '', formToken: await readyToken('newsletter') })
    await expect(readForm(event, 'contact', contactSchema)).rejects.toMatchObject({ status: 400, data: { formToken: 'invalid' } })
  })

  it('validiert mit zod und liefert Fehler je Feld', async () => {
    const event = postJson({ name: '', message: 'Hallo', website: '', formToken: await readyToken() })
    await expect(readForm(event, 'contact', contactSchema)).rejects.toMatchObject({
      status: 400,
      data: { fieldErrors: { name: expect.any(Array) } },
    })
  })

  it('liefert die geprüften Daten ohne Honeypot und Token', async () => {
    const event = postJson({ name: ' Anna ', message: 'Hallo', website: '', formToken: await readyToken() })
    await expect(readForm(event, 'contact', contactSchema)).resolves.toEqual({ name: 'Anna', message: 'Hallo' })
  })
})
