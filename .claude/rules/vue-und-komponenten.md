---
paths:
  - "**/*.vue"
  - "**/app/**/*.ts"
  - "**/shared/**"
  - "**/components.json"
  - "**/assets/css/**"
  - "**/tsconfig*.json"
---

# Vue, TypeScript und Komponenten

Stand: 21.11.2026. Ergänzt Grundsatz 7 in `WebSites/CLAUDE.md`. Verweise auf `*.md` ohne Pfad meinen `WebSites/.claude/rules/`. Server-Code: `server-und-sicherheit.md`. Lint und Tests: `tests-und-qualitaet.md`. Barrierefreiheit der Bausteine: `barrierefreiheit.md`. Lazy Hydration und Bilder: `performance.md`.

Ziel: Jede Seite ist aus wiederverwendbaren Bausteinen zusammengesetzt, jeder Baustein hat genau eine Aufgabe, und ein neues Projekt startet mit dem Bestand der vorigen statt bei null. Lesbar schlägt clever. Kurz ist gut, solange es verständlich bleibt.

## Komponenten-Architektur

Vier Ebenen, Abhängigkeiten nur von oben nach unten:

| Ebene | Ordner | Aufgabe | Regel |
|---|---|---|---|
| 1 Grundbausteine | `components/ui/` | Button, Input, Dialog, Card … von shadcn-vue | Nicht neu erfinden. Eigene Varianten (z. B. Markenbutton) über `cva` in `ui/<name>/index.ts` ergänzen, nicht per Klassen an jeder Verwendungsstelle. |
| 2 Layout-Bausteine | `components/site/`, `components/section/` | Header, Footer, Hero, Abschnittsüberschrift, CTA-Band (z. B. `SiteHeader`, `SiteFooter`, `SiteSkipLink`, `SiteLanguageSwitch`, `SectionHero`, `SectionHeading`, `SectionCard`, `SectionCta`) | Kennen keine Fachlogik. Inhalt kommt über Props und Slots. |
| 3 Fach-Komponenten | `components/<fachbereich>/` | Kontaktformular, Buchung, Blog-Karte | Nutzen Ebene 1–2. Logik steckt in Composables, nicht im Template. |
| 4 Seiten | `pages/` | setzen Bausteine zusammen, laden Daten, setzen `useSeoMeta` | Kein eigenes Markup-Gestrüpp, keine Geschäftslogik. Ziel: unter ca. 150 Zeilen. |

- **Wann eine Komponente?** Sobald Markup ein zweites Mal gebraucht wird, oder sobald eine Datei über ca. 200 Zeilen wächst oder zwei Aufgaben hat.
- **Dateinamen = Komponentenname**, PascalCase, mindestens zwei Wörter: `site/SiteHeader.vue` → `<SiteHeader>`. So ist jede Komponente per Suche sofort auffindbar.
- **Props statt Kopien:** Eine Komponente mit Varianten (`variant`, `size`) über `cva` statt drei fast gleicher Komponenten.
- **Slots statt Prop-Flut:** Für freien Inhalt Slots (Default und benannte), Props nur für Daten und Varianten.
- **`class` durchreichen:** Jeder Baustein nimmt `class?: HTMLAttributes['class']` an und verbindet sie mit `cn()` (shadcn-Muster). So lässt er sich anpassen, ohne ihn zu kopieren.
- **Wiederverwendung über Projekte:** Bausteine, die in zwei Projekten gleich gebraucht werden (SiteSkipLink, SectionHero, ContactForm mit Honeypot, PlaceholderNote …), so allgemein bauen, dass sie ohne Änderung übernommen werden können. Sie kommen in den gemeinsamen Nuxt Layer `@f7or7an/nuxt-base` (per `extends` eingebunden), sobald er veröffentlicht ist; bis dahin liegen sie in `_bausteine/` und werden kopiert. Nur was in mindestens zwei Projekten gleich gebraucht wird. Layer-Regeln und Startumfang: `abhaengigkeiten-und-layer.md`.

## shadcn-vue und UI

- **shadcn-vue** (Reka UI) über `shadcn-nuxt`. `components.json`: style `new-york`, baseColor `neutral`, iconLibrary `lucide`. Komponenten in `app/components/ui/`, `prefix: ''`. Generierte Komponenten gehören zum Projekt und dürfen angepasst werden; ARIA-Attribute von Reka dabei nicht entfernen.
- `shadcn-vue init` braucht ein echtes Terminal. Stattdessen `components.json` und `app/lib/utils.ts` von Hand anlegen, danach funktioniert `npx shadcn-vue@latest add <name>`.
- Nach jedem `shadcn-vue add` prüfen: Selektoren wie `data-open:` → Reka setzt `data-state` / `data-orientation` (siehe Ortrud-README).
- **`cn()`-Import, eine Quelle pro Projekt:** Seit Okt. 2026 erzeugt shadcn-vue gewollt `import { cn } from 'cn'` (npm-Paket `cn`, Umstellung per `npx shadcn-vue@latest migrate cn`). Festlegung:
  - **Bestehende Projekte** bleiben bei `@/lib/utils`, solange `cn()` dort liegt. Importe `from 'cn'` nach jedem `add` auf `@/lib/utils` umschreiben.
  - **Neue Projekte** folgen dem shadcn-Standard (Paket `cn`), dann überall `from 'cn'`.
  - Nie gemischt. Der Weg steht in der Projekt-`CLAUDE.md`.
- **Icons:** `@lucide/vue`. Nicht `lucide-vue-next` (FlowTech hat beide → aufräumen). Dekorative Icons `aria-hidden`, Icon-Buttons mit `aria-label`.
- **Nuxt UI v4 ist nicht Standard.** Grund: lädt über `@nuxt/icon` Icons von `api.iconify.design` nach (`fallbackToApi: true`), bringt `@nuxt/fonts`, Tiptap und TanStack mit. Nur für große C-Webapps als begründete Abweichung (Tabelle „Abweichungen“ in der Projekt-`CLAUDE.md`), dann `icon.fallbackToApi: false` + `@iconify-json/lucide` + `ui.fonts: false`.
- **Reka UI 3** (Alpha) erst, wenn shadcn-vue es unterstützt. Vue bleibt bei 3.5 (3.6 ist RC, Vapor nicht in Kundenprojekten).

## Vue und TypeScript

- Nur `<script setup lang="ts">` mit Composition API. Keine Options API.
- Props und Events typisiert: `defineProps<{ … }>()` mit `withDefaults`, `defineEmits<{ … }>()`, `defineModel()` für `v-model`.
- Kein `any`. Typen aus den zod-Schemas ableiten (`z.infer<typeof schema>`), gemeinsame Typen in `shared/`.
- Abgeleitete Werte mit `computed`. `watch` nur für Nebenwirkungen.
- Logik, die mehr als ein paar Zeilen hat oder mehrfach gebraucht wird, in ein Composable `useXyz()` in `app/composables/`. Server-Logik in `server/utils/`.
- Nuxt-Bordmittel nutzen: `NuxtLink` (bei i18n `NuxtLinkLocale`), `NuxtImg`, `useSeoMeta`, `<ClientOnly>` für reine Browser-Teile, `Lazy`-Präfix für schwere Komponenten (z. B. 3D-Systembrett; `hydrate-on-visible`/`hydrate-never` siehe `performance.md`).
- `v-for` immer mit stabilem `:key` (ID, nicht Index). Kein `v-if` und `v-for` auf demselben Element.
- `v-html` nur für vertrauenswürdige, bereinigte Inhalte.

### Auto-Imports und `shared/`

- In `app/` Auto-Imports frei nutzen; was Nuxt dort automatisch importiert, nicht von Hand importieren. Im Server gilt die `nuxt/server`-Regel aus `server-und-sicherheit.md` (Kurzfassung im nächsten Punkt).
- Server-Code: Wer Helfer aus `nuxt/server` nutzt (`readValidatedBody`, `getValidatedQuery`, `useSession`, `handleCors` …), definiert den Handler mit `defineEventHandler` aus `nuxt/server`; sonst bekommt der Helfer ein h3-Event und bricht mit `NUXT_E8012` ab. Dort ist das Event ein `RequestEvent` (nur `req`/`url`/`res`/`context`). Erlaubt im `nuxt/server`-Handler: Nitro-Bordmittel ohne Event (`defineNitroPlugin`, `useStorage`), eigene `server/utils` (auto-importiert), Modul-Helfer, die `RequestEvent` annehmen (nuxt-auth-utils 0.6). h3-Helfer mit `H3Event` (`setResponseHeader`, `readMultipartFormData`, `sendStream`) nur in Handlern mit dem h3-`defineEventHandler`, nie zusammen mit `nuxt/server`-Helfern (läuft auf Nuxt 4, aber typecheck meldet Fehler). Im `nuxt/server`-Handler stattdessen `event.res.headers.set()`, `event.req.formData()`, für Streams einen `ReadableStream` zurückgeben. `defineCachedEventHandler` umschließt einen h3-Handler; darin keine `nuxt/server`-Helfer. Details: `server-und-sicherheit.md`.
- In `shared/` werden nur `shared/utils/` und `shared/types/` automatisch importiert. Schemas liegen in `shared/utils/schemas.ts` oder werden explizit per `#shared/…` importiert. (Ersetzt das bisherige `shared/schemas.ts`; bestehende Projekte beim nächsten Umbau umziehen.)
- Dieselben zod-Schemas im Browser und auf dem Server (Grundsatz: eine Quelle).

### Daten laden

- Daten laden mit `useFetch` bzw. `useAsyncData`, nicht mit `$fetch` im Setup, sonst wird beim SSR doppelt geladen. `$fetch` nur für Aktionen wie Absenden.
- `useAsyncData` immer mit eigenem, eindeutigem Schlüssel. Gleicher Schlüssel = geteilte Daten; dann müssen auch die Optionen gleich sein.
- Payload klein halten: mit `pick` bzw. `transform` nur die nötigen Felder übernehmen; Warnung ab 100 kB laut Nuxt-4.6-Blog (im Code nicht gefunden, nicht darauf verlassen). `serialize: false`, wo die Daten nicht in den Payload müssen. Budget siehe `performance.md`.
- In `useAsyncData` keine Store-Aktionen oder Nebenwirkungen; einmalige Initialisierung mit `callOnce`.
- `data` ist ein `shallowRef` und startet mit `undefined` (nicht `null`). Tief verschachtelte Änderungen lösen keine Reaktivität aus → Objekt ersetzen.

### Zustand

- Geteilter Zustand mit `useState`.
- Pinia (v4, nur ESM) nur bei echter Komplexität.
- Pinia Colada optional für Client-Query-Caching in Modus C.

### TypeScript und tsconfig

- `typescript@~6.0` ausdrücklich pinnen, dazu `vue-tsc` als devDependency, weil `vue-tsc` mit TS 7 (npm-`latest`) abbricht (Begründung: `abhaengigkeiten-und-layer.md`).
- Die Wurzel-`tsconfig.json` enthält nur `references` auf die von Nuxt erzeugten tsconfigs (Nuxt 4 erzeugt vier: app, server, shared, node). Eigene Compiler-Optionen nicht dort, sondern über `typescript.tsConfig` in `nuxt.config.ts`.
- `noUncheckedIndexedAccess` (Nuxt-4-Standard) nicht abschalten; Array- und Record-Zugriffe sauber prüfen.
- Neue Projekte schalten `experimental.typedPages` und `experimental.routeTypedFetch` ein (in Nuxt 5 Standard). Bestehende beim nächsten Umbau. (Weitere Nuxt-5-Vorbereitung: `server-und-sicherheit.md`.)

### Hilfen im Dev-Modus

- `@nuxt/hints` (Hinweise zu Performance und Hydration) optional.
- `@nuxt/a11y` ist Alpha, nur Dev-Hilfe, ersetzt keine Handprüfung (siehe `barrierefreiheit.md`).
- `@nuxt/scripts` nicht nötig: Wir binden keine Fremdskripte ein (Grundsatz 1).

## Styling

- **Tailwind CSS 4** über `@tailwindcss/vite`, keine `tailwind.config`.
- Farben als CSS-Variablen (oklch) in `app/assets/css/main.css`. Markenfarben als eigene Tokens (`brand`, `teal` …). `accent` nicht als Markenfarbe missbrauchen, das ist die shadcn-Hover-Farbe. Kontraste der Tokens beim Definieren prüfen (`barrierefreiheit.md`).
- Tailwind-Klassen im Template, mobil zuerst (`md:`, `lg:` für größere Bildschirme).
- Keine festen Farbwerte im Template (`text-[#06545a]`), sondern Tokens (`text-primary`, `bg-brand`). Keine willkürlichen Abstände, sondern die Tailwind-Skala.
- Wiederholt sich eine lange Klassenkette, wird daraus eine Komponente oder eine `cva`-Variante, nicht `@apply`.
- Eigenes CSS nur für Tokens und seltene globale Dinge in `main.css`.
- Dark Mode nur, wenn das Design es vorsieht. **Kein `@nuxtjs/color-mode`:** Es schreibt bei jedem Seitenaufruf `nuxt-color-mode=system` in den Speicher (Version 4.1.0), unvereinbar mit Grundsatz 3. Stattdessen der eigene Umschalter aus `_bausteine/farbmodus/` (im Layer, sobald veröffentlicht): liest `prefers-color-scheme`, speichert nur nach Klick in `sessionStorage`, setzt die Klasse `dark` am `<html>`. Gegen Aufblitzen ein kleines Inline-Skript im `<head>`; dessen CSP-Hash beachten (`server-und-sicherheit.md`). In Apps mit Login liegt die Einstellung eingeloggter Nutzer im Benutzerkonto (DB), nicht im Browser. Speicherregeln und Text für die Datenschutzerklärung: `formulare-und-datenschutz.md`.
- Schriften: siehe `performance.md` (`@nuxt/fonts` mit npm-Provider).

## Clean Code

- **KISS, DRY, YAGNI:** einfach bauen, Doppeltes zusammenfassen, nichts auf Vorrat bauen.
- Funktionen klein und mit einer Aufgabe. Früh zurückkehren statt tief verschachteln.
- Sprechende englische Namen (`isSubmitting`, `formatPrice`), keine Abkürzungen außer gängigen (`id`, `url`).
- Kommentare auf Deutsch erklären das **Warum**, nicht das Was.
- Keine Magic Numbers oder Magic Strings: Konstanten in `shared/` oder `app/data/`.
- Inhalte (Texte, Preise, Kontaktdaten) liegen gebündelt in `app/data/`, `shared/` oder den i18n-Dateien, nicht verstreut in Templates.
- Kein toter Code, kein auskommentierter Code, kein `console.log` im Commit.
- Fehler: Server wirft `createError({ status, statusText, message })` (nicht mehr `statusCode`, Nuxt 4.6 / Nuxt 5). `statusText` kurz, englisch, nur ASCII (h3 bereinigt ihn), die verständliche deutsche Meldung steht in `message`. Der Client zeigt sie am richtigen Ort an (am Feld bzw. per `role="status"`).
