# Baustein Farbmodus (ohne `@nuxtjs/color-mode`)

Eigener Hell/Dunkel-Umschalter nach Grundsatz 3 „Nur Sitzung“. Regeln: `WebSites/.claude/rules/formulare-und-datenschutz.md` (Abschnitt Farbmodus), `vue-und-komponenten.md` (Styling), `server-und-sicherheit.md` (CSP).
Nur für Projekte, deren Design einen Dunkelmodus vorsieht. Kommt in den Layer `@f7or7an/nuxt-base`, sobald er veröffentlicht ist.

## Verhalten

- Drei Zustände: `system` (Standard, nichts gespeichert), `light`, `dark`. Dunkel = Klasse `dark` am `<html>`.
- Ein Inline-Skript im `<head>` setzt die Klasse vor dem ersten Zeichnen (kein Aufblitzen). Es schreibt nichts.
- Der Server rendert immer hell und ohne `aria-pressed`. Das Plugin übernimmt den echten Zustand erst nach dem Hydrieren (keine Hydration-Fehler) und folgt ohne Wahl live dem System.
- Erst ein Klick auf „Hell“ oder „Dunkel“ schreibt genau einen Eintrag `color-scheme` in `sessionStorage`; „Wie System“ löscht ihn.

## Dateien

| Datei | Ziel im Projekt |
|---|---|
| `shared/utils/color-scheme.ts` | `shared/utils/color-scheme.ts` (Konstanten, Typ, Inline-Skript; in `app/` automatisch importiert) |
| `app/composables/useColorScheme.ts` | `app/composables/useColorScheme.ts` |
| `app/plugins/color-scheme.client.ts` | `app/plugins/color-scheme.client.ts` |
| `app/components/site/SiteColorSchemeToggle.vue` | `app/components/site/SiteColorSchemeToggle.vue` (braucht `@lucide/vue` und `cn` aus `@/lib/utils`) |
| `datenschutz.md` | Text für die Datenschutzerklärung (de wörtlich, en/bg als Entwurf) |

## Übernahme (Checkliste)

1. `@nuxtjs/color-mode` entfernen: `npm uninstall @nuxtjs/color-mode`, Eintrag in `modules` und den Block `colorMode` aus der `nuxt.config.ts` löschen, alle `useColorMode()`/`$colorMode` ersetzen.
2. Die vier Dateien kopieren. Kopfkommentar „Herkunft“ stehen lassen. Projekte mit dem Paket `cn` statt `@/lib/utils`: Import in der Komponente anpassen.
3. Inline-Skript in der `nuxt.config.ts`:
   ```ts
   import { COLOR_SCHEME_HEAD_SCRIPT } from './shared/utils/color-scheme'
   // …
   app: { head: { script: [{ innerHTML: COLOR_SCHEME_HEAD_SCRIPT, tagPosition: 'head' }] } },
   ```
4. Tailwind: `@custom-variant dark (&:is(.dark *));` in `main.css` (shadcn-Standard) und die Tokens unter `.dark`. Optional `.dark { color-scheme: dark; }`, damit Scrollleisten und native Felder mitziehen.
5. Umschalter einsetzen, z. B. im Header: `<SiteColorSchemeToggle />`. Bei i18n die Texte übergeben:
   ```vue
   <SiteColorSchemeToggle :labels="{ group: t('colorScheme.group'), system: t('colorScheme.system'), light: t('colorScheme.light'), dark: t('colorScheme.dark') }" />
   ```
   Die Namen stehen standardmäßig sichtbar neben den Icons (Regel: sichtbarer Name; geprüft bei 320 px ohne Querscrollen, Ziele ≥ 32 px hoch). `:show-labels="false"` zeigt nur Icons mit `sr-only`-Namen, nur als begründete Ausnahme für sehr enge Kopfzeilen. Der gewählte Button hat `aria-pressed="true"` und vertauscht Vorder- und Hintergrundfarbe (Kontrast unabhängig von den Markenfarben).
6. Wer den Zustand braucht: `const { isDark, preference, setPreference } = useColorScheme()`. `isDark` ist auf dem Server immer `false`; für Darstellung, die davon abhängt, `<ClientOnly>` bzw. CSS (`dark:`) nehmen.
7. Datenschutzerklärung: Satz aus `datenschutz.md` einfügen.
8. CSP (Modus B/C mit `nuxt-security`, Modus A per Meta-Tag): Hash bzw. Nonce ergänzt `nuxt-security` selbst, weil Nuxt das Skript in den `<head>` schreibt. Skripttext nicht pro Seite verändern.

## Prüfen

- Seite frisch laden (`browser_clear_site_data`), ohne Klick: Cookies, `localStorage` und `sessionStorage` leer (`browser_storage`).
- Systemeinstellung dunkel (`browser_emulate colorScheme: dark`) → Seite dunkel ohne Aufblitzen; auf hell umstellen → folgt live.
- Klick auf „Dunkel“ → genau `color-scheme = dark` im `sessionStorage`; Neuladen und andere Seite bleiben dunkel; „Wie System“ → Eintrag weg.
- Konsole ohne Hydration-Fehler und ohne CSP-Verstöße; `browser_check_accessibility` ohne Befund (Kontrastmeldungen zu `sr-only`-Texten bzw. während der Farbübergänge sind falsche Alarme).
- Tastatur: Tab erreicht alle drei Buttons, Enter/Leertaste schaltet, Fokusrahmen sichtbar.

## Geprüft (21.11.2026, Testprojekt Nuxt 4.6.4, nuxt-security 2.7.0, Port 3466)

Ohne Klick kein Speicher; System dunkel/hell live gefolgt; Klick schreibt genau einen Wert, „Wie System“ löscht ihn; vorgerenderte Seite (CSP mit sha256-Hash des Skripts) und SSR-Seite (Nonce) ohne CSP-Verstoß und ohne Konsolenmeldung; `browser_check_accessibility` 0 Befunde in Hell und Dunkel; Tastatur und Fokusrahmen ok, Buttons 32 × 32 px; lint und typecheck grün.
