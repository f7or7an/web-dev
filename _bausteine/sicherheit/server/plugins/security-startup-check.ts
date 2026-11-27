// Herkunft: _bausteine/sicherheit/server/plugins/security-startup-check.ts (Stand 24.11.2026)
// Startprüfung (Muster Praxisraum startup-check.ts): In Produktion startet die App nicht, wenn der Schlüssel
// für die Formular-Mindestzeit fehlt oder NUXT_PUBLIC_SITE_URL fehlt bzw. kein https hat – statt erst beim
// ersten Formular mit 503 zu scheitern oder die CSRF-Prüfung still auf die Anfrage-Adresse auszuweichen.
// Im Dev-Modus erzeugt Nuxt selbst einen Schlüssel (Warnung NUXT_B5028). Beim Vorrendern im Build
// wird weder Token noch CSRF-Prüfung gebraucht, deshalb dort keine Prüfung.
// Hat das Projekt schon eine Startprüfung: beide Funktionen dort aufrufen und diese Datei weglassen.
import { useRuntimeConfig } from 'nuxt/server'
import { formTokenSecretProblem } from '../utils/form-token'
import { siteUrlProblem } from '../utils/site-url'

export default defineNitroPlugin(() => {
  if (import.meta.dev || import.meta.prerender) return
  const siteUrl = (useRuntimeConfig().public as { siteUrl?: unknown }).siteUrl
  const problems = [formTokenSecretProblem(), siteUrlProblem(siteUrl)].filter(problem => problem !== null)
  if (problems.length === 0) return
  for (const message of problems) console.error(JSON.stringify({ level: 'fatal', scope: 'startup', message }))
  // Ein Fehler beim Start beendet den Prozess; Docker startet neu und das Log zeigt den Grund
  throw new Error(`[startup] ${problems.join(' ')}`)
})
