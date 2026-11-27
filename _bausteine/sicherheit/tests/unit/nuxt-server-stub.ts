// Herkunft: _bausteine/sicherheit/tests/unit/nuxt-server-stub.ts (Stand 21.11.2026)
// Ersatz für 'nuxt/server' in Unit-Tests ohne Nuxt-Umgebung (per Alias in vitest.config.ts).
// Bildet die portable Fassung aus Nuxt 4.6.4 nach (nuxt/dist/server/index.js): Event = { req, url, res, context }.
import type { RequestEvent } from 'nuxt/server'

export const TEST_APP_SECRET = 'test-secret-only-for-unit-tests-0123456789'

interface ErrorInput {
  status?: number
  statusText?: string
  message?: string
  data?: unknown
}

export class TestHttpError extends Error {
  status: number
  statusText?: string
  data?: unknown
  constructor(input: ErrorInput) {
    super(input.message ?? input.statusText ?? 'Error')
    this.status = input.status ?? 500
    this.statusText = input.statusText
    this.data = input.data
  }
}

export function createError(input: ErrorInput) {
  return new TestHttpError(input)
}

export function defineEventHandler<T>(handler: (event: RequestEvent) => T) {
  return handler
}

/** Laufzeit-Konfiguration für Tests; einzelne Tests ändern sie und setzen sie mit resetTestRuntimeConfig() zurück. */
export interface TestRuntimeConfig {
  appSecret?: string
  nuxtBase?: { formTokenSecret?: string, csrfExemptPaths?: string[] }
  public: { siteUrl?: string }
}

export const testRuntimeConfig: TestRuntimeConfig = { public: {} }

export function resetTestRuntimeConfig() {
  testRuntimeConfig.appSecret = TEST_APP_SECRET
  testRuntimeConfig.nuxtBase = {}
  testRuntimeConfig.public = {}
}
resetTestRuntimeConfig()

export function useRuntimeConfig() {
  return testRuntimeConfig
}

// Wie Nuxt: ohne ausreichend langes appSecret wirft deriveSecret (mit Konfigurationsdetails in der Meldung)
export async function deriveSecret(purpose: string) {
  const secret = testRuntimeConfig.appSecret
  if (!secret || secret.length < 32) throw new Error('runtimeConfig.appSecret (NUXT_APP_SECRET) fehlt')
  return `${secret}:${purpose}`
}

export function getRequestHeader(event: RequestEvent, name: string) {
  return event.req.headers.get(name) ?? undefined
}

export function getRequestHost(event: RequestEvent) {
  return event.req.headers.get('host') || ''
}

export function getQuery(event: RequestEvent) {
  return Object.fromEntries(event.url.searchParams)
}

export function getRequestProtocol(event: RequestEvent, options: { xForwardedProto?: boolean } = {}) {
  const forwarded = options.xForwardedProto ? event.req.headers.get('x-forwarded-proto') : null
  return forwarded === 'https' ? 'https' : event.url.protocol.slice(0, -1)
}

export function getRequestIP(event: RequestEvent) {
  return (event.context as { clientAddress?: string }).clientAddress
}

export async function readBody(event: RequestEvent) {
  const text = await event.req.text()
  if (!text) return undefined
  return JSON.parse(text) as unknown
}

/** Baut ein Test-Event wie unter Nitro. */
export function createTestEvent(url: string, init: RequestInit & { clientAddress?: string } = {}): RequestEvent {
  const { clientAddress = '203.0.113.7', ...requestInit } = init
  return {
    req: new Request(url, requestInit),
    url: new URL(url),
    res: { headers: new Headers() },
    context: { clientAddress },
  } as unknown as RequestEvent
}
