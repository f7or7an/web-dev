# Baustein Barrierefreiheit

Gemeinsame Lösung für die Barrierefreiheits-Punkte, die in allen Projekten gleich auftreten
(siehe `STANDARDS-AUDIT.md` der Projekte). Regeln: `../../CLAUDE.md`, Abschnitt „Barrierefreiheit (EU-Recht)“.

Die Dateien werden in jedes Projekt **kopiert**, nicht verlinkt: Jedes Projekt ist ein eigenes Repo und sein
Docker-Build sieht nur den eigenen Ordner. Änderungen hier pflegen und dann in alle Projekte übernehmen.
Ab einem gemeinsamen Nuxt Layer (siehe CLAUDE.md, Code-Standards) wandert dieser Ordner dorthin.

## Inhalt

| Datei | Zweck | Ziel im Projekt |
|---|---|---|
| `SiteSkipLink.vue` | „Zum Inhalt springen“ | `app/components/site/SiteSkipLink.vue` |
| `a11y.css` | Scroll-Abstand für Sticky-Header, Fokus-Grundstil, reduzierte Bewegung | `app/assets/css/a11y.css`, in `main.css` importieren |
| `kontrast.mjs` | Kontrastrechner (hex, oklch, Deckkraft) | nicht kopieren, von hier aufrufen |
| `erklaerung-vorlage.md` | Textvorlage für `/barrierefreiheit` | Inhalt in eine Seite übertragen |

## Übernahme in ein Projekt (Checkliste)

1. **Fokus- und Rahmenfarben** (WCAG 1.4.11, 3 : 1)
   - `--ring` so wählen, dass er auf allen Flächen (background, card, muted, Markenflächen) ≥ 3 : 1 hat, in Hell und Dunkel.
   - `--input` (Rahmen von Eingabefeldern, Checkboxen, Schaltern) ≥ 3 : 1 gegen den Feldhintergrund.
     `--border` für reine Trennlinien darf heller bleiben.
   - Prüfen: `node <pfad>/_bausteine/barrierefreiheit/kontrast.mjs "<farbe>" "<hintergrund>"`
2. **shadcn-Komponenten** in `app/components/ui/`:
   - `ring-ring/50` → `ring-ring`, `outline-ring/50` → `outline-ring` (auch in `main.css`).
   - Jedes Element mit `outline-none` braucht einen eigenen `focus-visible:`-Stil, sonst den entfernen.
   - Schließen-Buttons mit deutschem `sr-only`-Text („Schließen“), nicht „Close“.
3. **Layout**
   - `<SiteSkipLink />` als erstes Element im Layout (bei i18n `:label="t('a11y.skipToContent')"`).
   - Hauptinhalt: `<main id="main" tabindex="-1">`.
   - `<NuxtRouteAnnouncer />` in `app.vue` (sagt Seitenwechsel an).
   - `--header-height` in `:root` auf die Höhe des Sticky-Headers setzen.
4. **CSS**: `a11y.css` nach `@import "tailwindcss";` importieren.
5. **Seite `/barrierefreiheit`** nach `erklaerung-vorlage.md`, im Footer verlinken, in `prerender`/Sitemap aufnehmen.
6. **Prüfen**: typecheck, build, Seite aufrufen, mit Tab den Skip-Link testen, Fokus auf allen Bedienelementen sichtbar,
   `browser_check_accessibility` ohne Verstöße A/AA. Erledigte Punkte in `STANDARDS-AUDIT.md` abhaken.
