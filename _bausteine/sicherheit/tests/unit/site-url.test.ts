// Herkunft: _bausteine/sicherheit/tests/unit/site-url.test.ts (Stand 24.11.2026)
import { describe, expect, it } from 'vitest'
import { siteUrlProblem } from '../../server/utils/site-url'

describe('siteUrlProblem (Startprüfung)', () => {
  it('nimmt https-Adressen an', () => {
    expect(siteUrlProblem('https://example.org')).toBeNull()
    expect(siteUrlProblem('https://www.example.org/de/')).toBeNull()
  })

  it('erlaubt http nur für den lokalen Test des gebauten Servers', () => {
    expect(siteUrlProblem('http://127.0.0.1:3456')).toBeNull()
    expect(siteUrlProblem('http://localhost:3456')).toBeNull()
    expect(siteUrlProblem('http://[::1]:3456')).toBeNull()
    expect(siteUrlProblem('http://example.org')).toMatch(/https/)
    expect(siteUrlProblem('http://127.0.0.1.example.org')).toMatch(/https/)
  })

  it('meldet fehlende, leere und ungültige Werte', () => {
    expect(siteUrlProblem(undefined)).toMatch(/fehlt/)
    expect(siteUrlProblem('')).toMatch(/fehlt/)
    expect(siteUrlProblem(42)).toMatch(/fehlt/)
    expect(siteUrlProblem('example.org')).toMatch(/gültige/)
    expect(siteUrlProblem('ftp://example.org')).toMatch(/https/)
  })
})
