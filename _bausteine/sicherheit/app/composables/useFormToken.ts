// Herkunft: _bausteine/sicherheit/app/composables/useFormToken.ts (Stand 21.11.2026)
// Zeit-Token für ein öffentliches Formular (nicht Login). Holt das Token beim Einblenden des Formulars,
// wartet vor dem Absenden die Mindestzeit ab und erneuert ein abgelaufenes Token selbst.
// So sieht ein Mensch nie eine Fehlermeldung und verliert keine Eingaben.

// Puffer gegen Uhr- und Laufzeitunterschiede zwischen Browser und Server
const CLOCK_MARGIN_MS = 500

/** @param form Formularname wie im Server-Handler (`readForm(event, 'contact', …)`), z. B. `contact`. */
export function useFormToken(form: string) {
  const token = ref<string>()
  const receivedAt = ref(0)

  async function refresh() {
    const response = await $fetch<{ token: string }>('/api/form-token', { query: { form } })
    token.value = response.token
    receivedAt.value = Date.now()
  }

  // Nur im Browser: Ein Token im vorgerenderten HTML wäre beim Besuch schon alt.
  onMounted(() => {
    refresh().catch(() => {
      // Fehlt das Token, holt getToken() es beim Absenden erneut und zeigt dann den Fehler.
    })
  })

  /** Vor jedem Absenden aufrufen und das Ergebnis als `formToken` mitschicken. */
  async function getToken(): Promise<string> {
    const age = Date.now() - receivedAt.value
    if (!token.value || age > FORM_TOKEN_MAX_AGE_MS - CLOCK_MARGIN_MS) await refresh()

    const wait = receivedAt.value + FORM_TOKEN_MIN_AGE_MS + CLOCK_MARGIN_MS - Date.now()
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))

    if (!token.value) throw new Error('Formular-Token fehlt')
    return token.value
  }

  return { getToken, refresh }
}
