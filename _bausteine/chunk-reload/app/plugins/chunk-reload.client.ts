// Herkunft: _bausteine/chunk-reload/app/plugins/chunk-reload.client.ts (Stand 25.11.2026)
// Lädt die Seite neu, wenn nach einem Deploy ein Seiten-Chunk fehlt (der offene Tab kennt nur die alten Dateinamen),
// und zwar ohne Web-Storage (Grundsatz 3, „Nur Sitzung“). Übernommen aus dem Praxisraum (Prüfung 24.11.2026, S6).
// Voraussetzung in der nuxt.config.ts: experimental.emitRouteChunkError: 'manual'. Sonst registriert Nuxt sein eigenes
// Plugin, das vor dem Neuladen `nuxt:reload` und den Payload-State (`nuxt:reload:state`) in den sessionStorage schreibt
// (reloadNuxtApp mit persistState, geprüft am Code von Nuxt 4.6.4).
// Schleifenschutz ohne Speicher: neu geladen wird nur bei einem Seitenwechsel nach dem ersten Aufbau. Fehlt der Chunk
// auch nach dem Neuladen, scheitert schon der erste Aufbau, und Nuxt zeigt die Fehlerseite statt erneut zu laden.
export default defineNuxtPlugin({
  name: 'chunk-reload',
  setup(nuxtApp) {
    const router = useRouter()
    const baseURL = useRuntimeConfig().app.baseURL.replace(/\/+$/, '')
    const chunkErrors = new Set<unknown>()
    let mounted = false

    // Vollständiger Seitenaufruf statt reloadNuxtApp(): Der Zustand kommt neu vom Server bzw. aus dem HTML
    const loadPage = (to: { fullPath: string }) => {
      window.location.href = `${baseURL}${to.fullPath}`
    }

    nuxtApp.hook('app:mounted', () => {
      mounted = true
    })
    router.beforeEach(() => {
      chunkErrors.clear()
    })
    // Nuxt meldet Ladefehler von Chunks (vite:preloadError) über diesen Hook, auch mit 'manual'
    nuxtApp.hook('app:chunkError', ({ error }) => {
      chunkErrors.add(error)
    })
    router.onError((error, to) => {
      if (mounted && chunkErrors.has(error)) loadPage(to)
    })
    // Neue Fassung auf dem Server (App-Manifest, Nuxt fragt stündlich nach): beim nächsten Seitenwechsel vollständig laden
    nuxtApp.hook('app:manifest:update', () => {
      router.beforeResolve(loadPage)
    })
  },
})
