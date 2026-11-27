// Herkunft: _bausteine/farbmodus/app/composables/useColorScheme.ts (Stand 21.11.2026)
// Farbmodus ohne @nuxtjs/color-mode: Das Modul schreibt bei jedem Aufruf in den Speicher (Grundsatz 3).
// Speicherregel: WebSites/.claude/rules/formulare-und-datenschutz.md, Abschnitt Farbmodus.

/**
 * Gemeinsamer, beschreibbarer Zustand. Nur für das Plugin `color-scheme.client.ts`;
 * Komponenten nutzen `useColorScheme()`.
 * Der Server kennt die Wahl nicht und rendert immer `system` + hell. Die echten Werte setzt
 * das Plugin erst nach dem Hydrieren.
 */
export function useColorSchemeState() {
  return {
    preference: useState<ColorSchemePreference>('color-scheme:preference', () => 'system'),
    systemPrefersDark: useState<boolean>('color-scheme:system-dark', () => false),
    // false bis zum Hydrieren: so lange kein aria-pressed setzen, sonst gibt es Hydration-Fehler
    isReady: useState<boolean>('color-scheme:ready', () => false),
  }
}

function isColorSchemePreference(value: unknown): value is ColorSchemePreference {
  return COLOR_SCHEME_PREFERENCES.includes(value as ColorSchemePreference)
}

/** Liest die Wahl aus dem sessionStorage. Kein Wert, ein fremder Wert oder gesperrter Speicher → `system`. */
export function readStoredColorScheme(): ColorSchemePreference {
  try {
    const stored = sessionStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
    return isColorSchemePreference(stored) ? stored : 'system'
  }
  catch {
    return 'system'
  }
}

export function useColorScheme() {
  const { preference, systemPrefersDark, isReady } = useColorSchemeState()

  const isDark = computed(() =>
    preference.value === 'dark' || (preference.value === 'system' && systemPrefersDark.value),
  )

  /** Nur nach aktiver Wahl: `light`/`dark` schreibt genau einen Eintrag, `system` löscht ihn. */
  function setPreference(value: ColorSchemePreference) {
    preference.value = value
    try {
      if (value === 'system') sessionStorage.removeItem(COLOR_SCHEME_STORAGE_KEY)
      else sessionStorage.setItem(COLOR_SCHEME_STORAGE_KEY, value)
    }
    catch {
      // Speicher gesperrt (z. B. strenge Browser-Einstellung): Die Wahl gilt dann nur bis zum Neuladen.
    }
  }

  return {
    preference: readonly(preference),
    isReady: readonly(isReady),
    isDark,
    setPreference,
  }
}
