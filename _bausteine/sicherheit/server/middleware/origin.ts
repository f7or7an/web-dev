// Herkunft: _bausteine/sicherheit/server/middleware/origin.ts (Stand 21.11.2026),
// strengere Fassung von Praxisraum/server/middleware/origin.ts (OWASP CSRF Cheat Sheet, Fetch Metadata).
// Schutz gegen Anfragen, die eine fremde Seite im Namen eingeloggter Personen abschickt (CSRF).
// SameSite am Cookie ist nur eine zusätzliche Schicht: Es hält andere Subdomains derselben Website nicht ab.
//
// Regel: Jede Anfrage, die etwas ändern kann (alles außer GET/HEAD/OPTIONS), muss aus dieser Website kommen:
// - `Sec-Fetch-Site: cross-site` oder `same-site` → 403 (same-site = andere Subdomain).
// - `Origin` gesetzt → muss genau der eigene Ursprung sein (Schema + Host + Port).
// - `Origin` fehlt oder ist `null` (z. B. Formular auf einer Seite mit `referrer-policy: no-referrer`)
//   → nur mit `Sec-Fetch-Site: same-origin` erlaubt (Browser setzen den Header selbst, Seiten können ihn nicht fälschen).
// - Ohne beide Header → 403. Geprüft wird jeder Pfad, nicht nur /api/**, damit kodierte Pfade
//   (z. B. /%61pi/…) die Prüfung nicht umgehen.
//
// Eigener Ursprung: runtimeConfig.public.siteUrl (NUXT_PUBLIC_SITE_URL). Fehlt sie oder läuft der Dev-Server,
// gilt Schema + Host der Anfrage (Schema hinter Caddy aus X-Forwarded-Proto). Lokale Tests des Builds
// auf eigenem Port daher mit NUXT_PUBLIC_SITE_URL=http://127.0.0.1:<port> starten.
import type { RequestEvent } from 'nuxt/server'
import { createError, defineEventHandler, getRequestHeader, getRequestHost, getRequestProtocol, useRuntimeConfig } from 'nuxt/server'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Ausnahmen: nur Routen, die sich selbst per Token oder Schlüssel absichern. Exakter Pfad, jede mit Grund.
 * Beispiele (im Projekt einkommentieren, was es gibt):
 *   '/api/newsletter/unsubscribe', // Ein-Klick-Abmeldung (RFC 8058): Mailanbieter senden ohne Origin; Token im Link
 *   '/api/internal/sync',          // Server-zu-Server (Website ↔ Praxisraum) mit Dienst-Schlüssel, kein Cookie
 */
const EXEMPT_PATHS = new Set<string>([])

export interface OriginCheckInput {
  method: string
  pathname: string
  /** Eigener Ursprung, z. B. `https://example.org` */
  expectedOrigin: string
  origin: string | undefined
  secFetchSite: string | undefined
}

function normalizePath(pathname: string) {
  try {
    const decoded = decodeURI(pathname)
    return decoded.length > 1 ? decoded.replace(/\/+$/, '') : decoded
  }
  catch {
    return pathname
  }
}

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin
  }
  catch {
    return undefined
  }
}

/** true = Anfrage zulassen. Reine Funktion für Tests. */
export function isAllowedOrigin(input: OriginCheckInput, exemptPaths: ReadonlySet<string> = EXEMPT_PATHS): boolean {
  if (SAFE_METHODS.has(input.method.toUpperCase())) return true
  if (exemptPaths.has(normalizePath(input.pathname))) return true
  if (input.secFetchSite === 'cross-site' || input.secFetchSite === 'same-site') return false
  if (!input.origin || input.origin === 'null') return input.secFetchSite === 'same-origin'
  return originOf(input.origin) === input.expectedOrigin
}

/** Eigener Ursprung: siteUrl, ersatzweise (und im Dev-Modus) Schema + Host der Anfrage. */
export function expectedOriginFor(siteUrl: unknown, isDev: boolean, requestOrigin: () => string): string {
  const configured = !isDev && typeof siteUrl === 'string' && siteUrl !== '' ? originOf(siteUrl) : undefined
  return configured ?? requestOrigin()
}

export default defineEventHandler((event: RequestEvent) => {
  const siteUrl = (useRuntimeConfig().public as { siteUrl?: unknown }).siteUrl
  const allowed = isAllowedOrigin({
    method: event.req.method,
    pathname: event.url.pathname,
    expectedOrigin: expectedOriginFor(siteUrl, import.meta.dev,
      () => `${getRequestProtocol(event, { xForwardedProto: true })}://${getRequestHost(event)}`),
    origin: getRequestHeader(event, 'origin'),
    secFetchSite: getRequestHeader(event, 'sec-fetch-site'),
  })
  if (allowed) return
  throw createError({
    status: 403,
    statusText: 'Forbidden',
    message: 'Anfrage von einer fremden Seite abgelehnt.',
  })
})
