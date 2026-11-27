// Herkunft: _bausteine/sicherheit/server/utils/site-url.ts (Stand 24.11.2026)
// Prüft runtimeConfig.public.siteUrl (NUXT_PUBLIC_SITE_URL) für die Startprüfung. Ohne gültige Adresse
// vergleicht die CSRF-Middleware still mit Schema und Host der Anfrage; das soll in Produktion nie passieren.

// http nur für den lokalen Test des gebauten Servers (z. B. http://127.0.0.1:3456)
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** Beschreibung des Problems oder null. */
export function siteUrlProblem(siteUrl: unknown): string | null {
  if (typeof siteUrl !== 'string' || siteUrl === '') return 'NUXT_PUBLIC_SITE_URL fehlt (z. B. https://example.org).'
  let url: URL
  try {
    url = new URL(siteUrl)
  }
  catch {
    return 'NUXT_PUBLIC_SITE_URL ist keine gültige Adresse (z. B. https://example.org).'
  }
  if (url.protocol === 'https:') return null
  if (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname)) return null
  return 'NUXT_PUBLIC_SITE_URL muss mit https:// beginnen (http nur für localhost und 127.0.0.1).'
}
