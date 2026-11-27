// Herkunft: _bausteine/sicherheit/server/plugins/request-error-log.ts (Stand 24.11.2026)
// Fehlerlog als JSON ohne Tokens (Logik: server/utils/request-error-log.ts).
// Warum der Hook `error`: Nitro ruft ihn bei jedem Anfragefehler synchron vor dem Fehler-Handler auf (geprüft am
// Code von nitropack 2.13.6: `captureError` vor `errorHandler`, hookable 5.5 ruft Hooks synchron). So lässt sich
// Nitros Standardlog abschalten, ohne Nuxts Fehler-Handler (Fehlerseite, JSON-Antwort) zu ersetzen.
// Nuxt-Doku 4.x: Einen eigenen Server-Fehler-Handler gibt es offiziell nicht; `nitro.errorHandler` würde Nuxts
// Handler ersetzen. Bei Nuxt 5 / Nitro 3 neu prüfen.
import { handleRequestError } from '../utils/request-error-log'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    // Fehler außerhalb einer Anfrage (z. B. Tasks) loggt Nitro selbst ohne URL
    if (!event) return
    handleRequestError(error, event, import.meta.dev)
  })
})
