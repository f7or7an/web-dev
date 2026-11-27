// Herkunft: _bausteine/sicherheit/tests/unit/form-token.test.ts (Stand 21.11.2026)
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formTokenSecretProblem, issueFormToken, requireFormToken } from '../../server/utils/form-token'
import { checkFormToken, createFormToken, deriveFormTokenSecret } from '../../server/utils/form-token-core'
import { FORM_TOKEN_MAX_AGE_MS, FORM_TOKEN_MIN_AGE_MS } from '../../shared/utils/form-protection'
import { resetTestRuntimeConfig, testRuntimeConfig } from './nuxt-server-stub'

const SECRET = 'a'.repeat(64)
const FORM = 'contact'
const ISSUED_AT = 1_800_000_000_000

afterEach(() => {
  resetTestRuntimeConfig()
  vi.restoreAllMocks()
})

describe('checkFormToken', async () => {
  const token = await createFormToken(SECRET, FORM, ISSUED_AT)
  const later = ISSUED_AT + 10_000

  it('nimmt ein gültiges Token nach der Mindestzeit an', async () => {
    expect(await checkFormToken(SECRET, FORM, token, ISSUED_AT + FORM_TOKEN_MIN_AGE_MS)).toEqual({ ok: true })
    expect(await checkFormToken(SECRET, FORM, token, ISSUED_AT + FORM_TOKEN_MAX_AGE_MS)).toEqual({ ok: true })
  })

  it('lehnt zu schnelles Absenden ab (Mindestzeit ≥ 3 s)', async () => {
    expect(FORM_TOKEN_MIN_AGE_MS).toBeGreaterThanOrEqual(3_000)
    expect(await checkFormToken(SECRET, FORM, token, ISSUED_AT + FORM_TOKEN_MIN_AGE_MS - 1)).toEqual({ ok: false, problem: 'too-early' })
  })

  it('lehnt abgelaufene Tokens ab', async () => {
    expect(await checkFormToken(SECRET, FORM, token, ISSUED_AT + FORM_TOKEN_MAX_AGE_MS + 1)).toEqual({ ok: false, problem: 'expired' })
  })

  it('lehnt fehlende Tokens ab', async () => {
    expect(await checkFormToken(SECRET, FORM, undefined, later)).toEqual({ ok: false, problem: 'missing' })
    expect(await checkFormToken(SECRET, FORM, '', later)).toEqual({ ok: false, problem: 'missing' })
    expect(await checkFormToken(SECRET, FORM, 42, later)).toEqual({ ok: false, problem: 'missing' })
  })

  it('lässt ein Token nur für sein Formular gelten', async () => {
    expect(await checkFormToken(SECRET, 'newsletter', token, later)).toEqual({ ok: false, problem: 'invalid' })
    expect(await checkFormToken(SECRET, 'Contact', token, later)).toEqual({ ok: false, problem: 'invalid' })
  })

  it('lehnt fremde und manipulierte Tokens ab', async () => {
    const [, , signature] = token.split('.')
    const invalid = [
      // anderes Geheimnis
      await createFormToken('b'.repeat(64), FORM, ISSUED_AT),
      // Zeitpunkt zurückdatiert, Signatur passt nicht mehr
      `v1.${ISSUED_AT - 60_000}.${signature}`,
      `v2.${ISSUED_AT}.${signature}`,
      `${token}.x`,
      `${token.slice(0, -2)}AA`,
      'v1.abc.def',
      'x'.repeat(500),
    ]
    for (const candidate of invalid) {
      expect(await checkFormToken(SECRET, FORM, candidate, later), candidate).toEqual({ ok: false, problem: 'invalid' })
    }
  })

  it('wirft nie bei ungültigen Längen und Zeichen der Signatur (base64url)', async () => {
    const valid = signature43()
    const candidates = [
      // Rest 1 bei Länge mod 4: atob würde werfen (Fund des Prüfers)
      'v1.1800000000000.A',
      `v1.${ISSUED_AT}.${valid.slice(0, 41)}`,
      `v1.${ISSUED_AT}.${valid.slice(0, 42)}`,
      `v1.${ISSUED_AT}.${valid}A`,
      `v1.${ISSUED_AT}.`,
      `v1.${ISSUED_AT}.${valid.slice(0, 42)}+`,
      `v1.${ISSUED_AT}.${valid.slice(0, 42)}/`,
      `v1.${ISSUED_AT}.${valid.slice(0, 42)}=`,
      `v1.${ISSUED_AT}.${valid.slice(0, 42)}ä`,
      `v1.${ISSUED_AT}.${valid.slice(0, 41)}==`,
      `v1.-1.${valid}`,
      `v1.1e12.${valid}`,
      `v1.${'9'.repeat(16)}.${valid}`,
      'v1..',
      '...',
    ]
    for (const candidate of candidates) {
      await expect(checkFormToken(SECRET, FORM, candidate, later), candidate).resolves.toEqual({ ok: false, problem: 'invalid' })
    }
  })

  function signature43() {
    return token.split('.')[2] ?? ''
  }
})

describe('createFormToken', () => {
  it('verlangt einen gültigen Formularnamen', async () => {
    await expect(createFormToken(SECRET, '', ISSUED_AT)).rejects.toThrow(TypeError)
    await expect(createFormToken(SECRET, 'Kontakt', ISSUED_AT)).rejects.toThrow(TypeError)
    await expect(createFormToken(SECRET, 'a.b', ISSUED_AT)).rejects.toThrow(TypeError)
  })
})

describe('deriveFormTokenSecret (z. B. Gora aus GORA_HASH_SECRET)', () => {
  it('leitet einen festen, zweckgebundenen Schlüssel ab', async () => {
    const first = await deriveFormTokenSecret(SECRET)
    expect(first).toMatch(/^[\w-]{43}$/)
    expect(await deriveFormTokenSecret(SECRET)).toBe(first)
    expect(await deriveFormTokenSecret('b'.repeat(64))).not.toBe(first)
    expect(await deriveFormTokenSecret(SECRET, 'anderer-zweck')).not.toBe(first)
    expect(first).not.toContain(SECRET)
  })
})

describe('issueFormToken / requireFormToken', () => {
  it('lehnt ein frisch ausgestelltes Token mit 400 und Grund ab', async () => {
    const token = await issueFormToken(FORM)
    await expect(requireFormToken(FORM, token)).rejects.toMatchObject({ status: 400, data: { formToken: 'too-early' } })
  })

  it('lehnt ein Token für ein anderes Formular ab', async () => {
    const token = await createFormToken(`${testRuntimeConfig.appSecret}:nuxt-base:form-token`, 'newsletter', Date.now() - 10_000)
    await expect(requireFormToken('newsletter', token)).resolves.toBeUndefined()
    await expect(requireFormToken(FORM, token)).rejects.toMatchObject({ status: 400, data: { formToken: 'invalid' } })
  })

  it('meldet ein fehlendes Token verständlich', async () => {
    await expect(requireFormToken(FORM, undefined)).rejects.toMatchObject({
      status: 400,
      statusText: 'Bad Request',
      data: { formToken: 'missing' },
    })
  })

  it('lehnt unbekannte Formularnamen mit 400 ab', async () => {
    await expect(issueFormToken('')).rejects.toMatchObject({ status: 400 })
    await expect(issueFormToken('../admin')).rejects.toMatchObject({ status: 400 })
  })

  it('nutzt ein eigenes Geheimnis aus runtimeConfig.nuxtBase.formTokenSecret', async () => {
    const own = 'c'.repeat(40)
    testRuntimeConfig.nuxtBase = { formTokenSecret: own }
    testRuntimeConfig.appSecret = undefined
    const token = await issueFormToken(FORM)
    expect(await checkFormToken(own, FORM, token, Date.now() + FORM_TOKEN_MIN_AGE_MS)).toEqual({ ok: true })
  })

  it('antwortet ohne Schlüssel neutral mit 503, Details nur im Log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    testRuntimeConfig.appSecret = undefined
    const error = await issueFormToken(FORM).catch((caught: unknown) => caught)
    expect(error).toMatchObject({ status: 503, statusText: 'Service Unavailable' })
    expect(String((error as Error).message)).not.toMatch(/NUXT_APP_SECRET|appSecret|runtimeConfig/)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('NUXT_APP_SECRET'))
  })

  it('meldet einen zu kurzen eigenen Schlüssel mit 503 statt still auszuweichen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    testRuntimeConfig.nuxtBase = { formTokenSecret: 'zu-kurz' }
    await expect(issueFormToken(FORM)).rejects.toMatchObject({ status: 503 })
  })
})

describe('formTokenSecretProblem (Startprüfung)', () => {
  it('ist zufrieden mit NUXT_APP_SECRET ≥ 32 Zeichen', () => {
    expect(formTokenSecretProblem()).toBeNull()
  })

  it('meldet fehlendes oder zu kurzes NUXT_APP_SECRET', () => {
    testRuntimeConfig.appSecret = undefined
    expect(formTokenSecretProblem()).toMatch(/NUXT_APP_SECRET/)
    testRuntimeConfig.appSecret = 'kurz'
    expect(formTokenSecretProblem()).toMatch(/NUXT_APP_SECRET/)
  })

  it('prüft ein eigenes Geheimnis statt NUXT_APP_SECRET', () => {
    testRuntimeConfig.appSecret = undefined
    testRuntimeConfig.nuxtBase = { formTokenSecret: 'd'.repeat(32) }
    expect(formTokenSecretProblem()).toBeNull()
    testRuntimeConfig.nuxtBase = { formTokenSecret: 'd'.repeat(31) }
    expect(formTokenSecretProblem()).toMatch(/FORM_TOKEN_SECRET/)
  })
})
