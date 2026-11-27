// Herkunft: _bausteine/farbmodus/shared/utils/color-scheme.ts (Stand 21.11.2026)
// Farbmodus „Nur Sitzung“ (WebSites/.claude/rules/formulare-und-datenschutz.md):
// ohne Wahl gilt prefers-color-scheme, erst ein Klick speichert genau einen Wert im sessionStorage.

export const COLOR_SCHEME_STORAGE_KEY = 'color-scheme'

export const COLOR_SCHEME_PREFERENCES = ['system', 'light', 'dark'] as const

export type ColorSchemePreference = typeof COLOR_SCHEME_PREFERENCES[number]

/**
 * Inline-Skript für den `<head>` gegen Aufblitzen: läuft vor dem ersten Zeichnen und setzt
 * die Klasse `dark` am `<html>`. Es schreibt nichts.
 * Der Text muss auf jeder Seite gleich bleiben, sonst passt der CSP-Hash nicht mehr
 * (nuxt-security ergänzt Hash bzw. Nonce selbst). Nach jeder Änderung die Konsole auf CSP-Verstöße prüfen.
 */
export const COLOR_SCHEME_HEAD_SCRIPT = `(function(){var s;try{s=sessionStorage.getItem('${COLOR_SCHEME_STORAGE_KEY}')}catch(e){}var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)})()`
