// Herkunft: _bausteine/farbmodus/app/plugins/color-scheme.client.ts (Stand 21.11.2026)
// Übernimmt nach dem Hydrieren, was das Inline-Skript im <head> schon vor dem ersten Zeichnen gesetzt hat,
// folgt ohne Wahl live dem System und hält die Klasse `dark` am <html> aktuell. Schreibt nichts.

export default defineNuxtPlugin((nuxtApp) => {
  const state = useColorSchemeState()
  const { isDark } = useColorScheme()
  const media = window.matchMedia('(prefers-color-scheme: dark)')

  // Erst nach dem Hydrieren: Vorher muss der Zustand dem Server-HTML entsprechen.
  nuxtApp.hook('app:mounted', () => {
    state.preference.value = readStoredColorScheme()
    state.systemPrefersDark.value = media.matches
    state.isReady.value = true
  })

  media.addEventListener('change', (event) => {
    state.systemPrefersDark.value = event.matches
  })

  watch(isDark, (dark) => {
    document.documentElement.classList.toggle('dark', dark)
  })
})
