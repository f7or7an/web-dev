# Baustein Barrierefreiheit

Gemeinsame Lösung für die Barrierefreiheits-Punkte, die in allen Projekten gleich auftreten
(siehe `STANDARDS-AUDIT.md` der Projekte). Regeln: `WebSites/.claude/rules/barrierefreiheit.md` (WCAG 2.2 AA, Pflichtseite, Prüfablauf).

Die Dateien werden in jedes Projekt **kopiert**, nicht verlinkt: Jedes Projekt ist ein eigenes Repo und sein
Docker-Build sieht nur den eigenen Ordner. Änderungen hier pflegen und dann in alle Projekte übernehmen.
`SiteSkipLink.vue` und `a11y.css` wandern in den Layer `@f7or7an/nuxt-base`, sobald er veröffentlicht ist
(Gerüst schon in `WebSites/nuxt-base/`; Regel `abhaengigkeiten-und-layer.md`).

## Inhalt

| Datei | Zweck | Ziel im Projekt |
|---|---|---|
| `SiteSkipLink.vue` | „Zum Inhalt springen“ | `app/components/site/SiteSkipLink.vue` |
| `a11y.css` | Scroll-Abstand für Sticky-Header, Fokus-Grundstil, reduzierte Bewegung (auch View Transitions) | `app/assets/css/a11y.css`, in `main.css` importieren |
| `kontrast.mjs` | Kontrastrechner (hex, oklch, Deckkraft) | nicht kopieren, von hier aufrufen |
| `erklaerung-vorlage.md` | Textvorlage für `/barrierefreiheit` | Inhalt in eine Seite übertragen |

## Übernahme in ein Projekt (Checkliste)

1. **Fokus- und Rahmenfarben** (WCAG 1.4.11, 3 : 1)
   - `--ring` so wählen, dass er auf allen Flächen (background, card, muted, Markenflächen) ≥ 3 : 1 hat, in Hell und Dunkel.
   - `--input` (Rahmen von Eingabefeldern, Checkboxen, Schaltern) ≥ 3 : 1 gegen den Feldhintergrund.
     `--border` für reine Trennlinien darf heller bleiben.
   - Text auf Flächen 4,5 : 1, auch `primary-foreground` auf `primary` (Buttons) in Hell **und** Dunkel.
   - Prüfen: `node <pfad>/_bausteine/barrierefreiheit/kontrast.mjs "<farbe>" "<hintergrund>"`
2. **shadcn-Komponenten** in `app/components/ui/`:
   - `ring-ring/50` → `ring-ring`, `outline-ring/50` → `outline-ring` (auch in `main.css`).
   - Jedes Element mit `outline-none` braucht einen eigenen `focus-visible:`-Stil, sonst den entfernen.
   - Schließen-Buttons mit `sr-only`-Text in der Seitensprache („Schließen“), nie „Close“.
3. **Layout**
   - `<SiteSkipLink />` als erstes Element im Layout (bei i18n `:label="t('a11y.skipToContent')"`).
   - Hauptinhalt: `<main id="main" tabindex="-1">` (nur dort unterdrückt `a11y.css` den Fokusrahmen).
   - `<NuxtRouteAnnouncer />` in `app.vue` (sagt Seitenwechsel an).
   - `--header-height` in `:root` auf die Höhe des Sticky-Headers setzen.
4. **CSS**: `a11y.css` nach `@import "tailwindcss";` importieren. View Transitions nur mit `experimental.viewTransition: true`, nie `'always'`.
5. **Seite `/barrierefreiheit`** nach `erklaerung-vorlage.md`, im Footer neben Impressum und Datenschutz verlinken, in `prerender` und Sitemap aufnehmen (Pflicht im BFSG-Bereich, sonst freiwillig).
6. **Prüfen** nach dem Prüfablauf in `barrierefreiheit.md` (automatisch 0 Verstöße A/AA, Tastatur inkl. Skip-Link, 200 % Zoom, 320 px, reduzierte Bewegung, NVDA-Stichprobe); falsche Alarme des Checkers stehen dort. Erledigte Punkte in `STANDARDS-AUDIT.md` abhaken.

## Änderungen

- 21.11.2026: `a11y.css` entfernt den Fokusrahmen nur noch an `main[tabindex="-1"]` statt an jedem `[tabindex="-1"]` (sonst verlören z. B. per Pfeiltaste fokussierte Einträge mit `tabindex="-1"` den sichtbaren Fokus, WCAG 2.4.7). README an die Regeldatei `.claude/rules/barrierefreiheit.md` angepasst.
