// Herkunft: _bausteine/sicherheit/csp.ts (Stand 21.11.2026)
// CSP-Grundkonfiguration für nuxt-security (≥ 2.7.0). Regel: WebSites/.claude/rules/server-und-sicherheit.md, Abschnitt CSP.
// nuxt-security setzt NUR die Content-Security-Policy; alle anderen Header setzt Caddy (eine Quelle je Header).
//
// Einbinden (Datei neben nuxt.config.ts):
//   import { createSecurityConfig } from './csp'
//   modules: ['nuxt-security', …],
//   security: createSecurityConfig({ mode: 'server', reportOnly: true }),
import type { ModuleOptions } from 'nuxt-security'

type ContentSecurityPolicy = Exclude<Exclude<ModuleOptions['headers'], false>['contentSecurityPolicy'], false | undefined>

export interface CspOptions {
  /**
   * `server`: Modus B/C (node-server). CSP im Header, Nonce für SSR, sha256-Hashes für vorgerenderte Seiten.
   * `static`: Modus A (`nuxt generate`). Nur Meta-Tag mit Hashes; `frame-ancestors` setzt dort Caddy.
   */
  mode: 'server' | 'static'
  /**
   * Erst beobachten, dann scharf schalten (Soll bei neuer oder geänderter CSP). Nur in Modus `server`:
   * Der Meta-Tag kennt kein Report-Only, deshalb wird er in dieser Phase abgeschaltet.
   */
  reportOnly?: boolean
  /** Zusätzliche Ziele für fetch/WebSocket, z. B. `wss://livekit.example.de` (Praxisraum). */
  connectSrc?: string[]
  /** Hashes zusätzlicher Inline-Handler (`onerror` usw.), siehe IMAGE_ONERROR_HASH. */
  scriptSrcAttrHashes?: string[]
}

/**
 * `@nuxt/image` setzt beim SSR `onerror="this.setAttribute('data-error', 1)"` an jedes <img>.
 * Der Hash hängt vom genauen Text ab: nach jedem @nuxt/image-Update in der Konsole prüfen
 * (Pilottest 21.11.2026 mit @nuxt/image 2.2.x). Nur übergeben, wenn das Projekt @nuxt/image nutzt.
 */
export const IMAGE_ONERROR_HASH = '\'sha256-bwK6T5wZVTANitXbrTsel7kl/PyCjCd/Dq5Qoz3imjM=\''

export function createSecurityConfig(options: CspOptions): Partial<ModuleOptions> {
  const isStatic = options.mode === 'static'
  const reportOnly = !isStatic && options.reportOnly === true
  const attrHashes = options.scriptSrcAttrHashes ?? []

  const contentSecurityPolicy: ContentSecurityPolicy = {
    'default-src': ['\'self\''],
    'base-uri': ['\'none\''],
    'object-src': ['\'none\''],
    // Nonce (SSR) bzw. Hash (vorgerendert) ergänzt nuxt-security selbst, auch für Inline-Skripte aus app.head
    'script-src': ['\'self\'', '\'strict-dynamic\'', '\'nonce-{{nonce}}\''],
    'script-src-attr': attrHashes.length > 0 ? ['\'unsafe-hashes\'', ...attrHashes] : ['\'none\''],
    // Vue und Tailwind setzen Inline-Styles; ohne Skript-Ausführung ist das Risiko gering
    'style-src': ['\'self\'', '\'unsafe-inline\''],
    'img-src': ['\'self\'', 'data:'],
    'font-src': ['\'self\''],
    'connect-src': ['\'self\'', ...(options.connectSrc ?? [])],
    'form-action': ['\'self\''],
    'manifest-src': ['\'self\''],
    'worker-src': ['\'self\''],
    // Im Report-Only-Header ignoriert der Browser die Direktive und meldet einen Konsolenfehler.
    // Ausdrücklich false: Weglassen reicht nicht, nuxt-security setzt sie sonst als Standard.
    'upgrade-insecure-requests': !reportOnly,
    // Modus A: wirkt im Meta-Tag nicht, steht in Caddy (nie doppelt)
    ...(isStatic ? {} : { 'frame-ancestors': ['\'none\''] }),
  }

  return {
    headers: {
      contentSecurityPolicy,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false,
      originAgentCluster: false,
      referrerPolicy: false,
      strictTransportSecurity: false,
      xContentTypeOptions: false,
      xDNSPrefetchControl: false,
      xDownloadOptions: false,
      xFrameOptions: false,
      xPermittedCrossDomainPolicies: false,
      xXSSProtection: false,
      permissionsPolicy: false,
    },
    contentSecurityPolicyReportOnly: reportOnly,
    // sri und ssg bleiben an (Standard), sonst greifen die Hashes mit 'strict-dynamic' nicht
    ...(reportOnly ? { ssg: { meta: false } } : {}),
    requestSizeLimiter: false,
    rateLimiter: false,
    xssValidator: false,
    corsHandler: false,
    allowedMethodsRestricter: false,
    hidePoweredBy: false,
    removeLoggers: false,
  }
}
