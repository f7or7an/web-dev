# WebSites – gemeinsame Regeln für alle Projekte

Diese Regeln gelten für jedes Projekt unter `WebSites/`. Was nur ein Projekt betrifft, steht in dessen `README.md`.
Weicht ein Projekt bewusst ab, wird die Abweichung dort mit Begründung festgehalten.
Server, Hosting und Deployment sind ausführlich in [SERVER.md](SERVER.md) beschrieben. Vor jedem Deployment und jeder Server-Arbeit diese Datei lesen.

**Jedes Projekt hat eine `STANDARDS-AUDIT.md`** im Projektordner (bei Gora in `webapp/`). Sie listet, wo das Projekt noch von diesen Regeln abweicht, mit Fundstelle, Priorität und konkretem Schritt. Vor jeder Arbeit am Projekt lesen. Erledigte Punkte abhaken (`[x]` mit Datum), neue Abweichungen ergänzen. Wer Code anfasst, behebt betroffene Punkte aus der Liste gleich mit.

Stand: 08.11.2026

## Projekte

| Ordner | Domain | Modus (siehe unten) | Heute | Ziel |
|---|---|---|---|---|
| `FlowTech/website` | flow-tech.org (+ zweite Domain im Ordner `flwtchde`) | A statisch, i18n de/en/bg | live auf dogado web250 | bleibt statisch, später auf eigenem Webserver |
| `Vogelperspektive/webapp/Vogelperspektive` | vogelperspektive-psychologin.de | B Hybrid: Formulare, Newsletter, Rabatt-Anträge, Admin, SQLite | neue App fertig, wartet auf Server. Alte Webflow+PHP-Seite noch live auf dogado web116 | Container auf eigenem Webserver |
| `Vogelperspektive/webapp/Vogelperspektive-Praxisraum` | app.vogelperspektive-psychologin.de (geplant) | C Webapp: Online-Sitzungsraum (Video über eigenes LiveKit, 3D-Systembrett, Journal, Klient:innen), Drizzle, Yjs/Hocuspocus | Prototyp lokal fertig und getestet, wartet auf Gespräch mit Jara und eigenen Server | 2 Container (App + LiveKit) auf eigenem Server, später Komodo |
| `Ortrud` | kuteifan.de | A statisch + `kontakt.php` | noch nicht live, Hoster unbekannt | Formular auf Nitro-Route umstellen → B |
| `Gora Ozosnanie/webapp` | goraosaznanie.com | C Webapp: 8 Sprachen, Login, Rollen, Planung, Drizzle | Relaunch auf Branch `relaunch` (Bulgarisch Hauptsprache, Events, Anmeldung). Staging auf ChatGPT Sites (Cloudflare Worker + D1). Alte Seite bei SiteGround, DNS-Zone bei Wix. Repo: github.com/f7or7an/gora-osaznanie | Container auf eigenem Webserver (Node-Build) |

## Grundsätze

1. **Keine fremden Dienste zur Laufzeit.** Schriften, Bilder, Skripte und Styles kommen vom eigenen Server. Kein Google Fonts, kein CDN, kein Analytics, kein Formular-Dienst. Ausnahmen nur bewusst, in der README und in der Datenschutzerklärung festgehalten. Heute: keine (Gora hat das Vimeo-Video am 10.11.2026 durch ein Foto ersetzt). Vogelperspektive bucht Termine seit 08.11.2026 über die eigene Seite statt Calendly.
2. **Kein PHP, kein WordPress.** Serverlogik läuft als Nitro-Route in Nuxt. `Ortrud/public/kontakt.php` ist ein Altlast-Ausnahmefall und wird ersetzt.
3. **Kein Tracking, keine Cookies** außer technisch nötigen (Login-Sitzung). Dadurch braucht es keinen Cookie-Banner.
4. **Sprache:** Oberflächen- und Nutzertexte auf Deutsch (Standardsprache). Code-Bezeichner auf Englisch, Kommentare auf Deutsch.
5. **Rechtliches:** Impressum und Datenschutzerklärung vor jedem Livegang. Fehlende Inhalte sichtbar als Platzhalter markieren und per Schalter ausblenden (Muster: `showPlaceholders` in `Ortrud/nuxt.config.ts`).
6. **Barrierefrei ab der ersten Zeile.** Jedes Projekt erfüllt **WCAG 2.2 Stufe AA**, egal ob das Gesetz es im Einzelfall verlangt. Barrierefreiheit wird beim Bauen berücksichtigt, nicht am Ende nachgerüstet. Details im Abschnitt „Barrierefreiheit (EU-Recht)“.
7. **Aus Bausteinen bauen.** Jedes Projekt besteht aus wiederverwendbaren Komponenten nach festen Ebenen, mit typisiertem, sauberem Code. Details im Abschnitt „Code-Standards“.

## Barrierefreiheit (EU-Recht)

### Rechtsrahmen

| Regelung | Für wen | Was folgt daraus |
|---|---|---|
| **European Accessibility Act** (Richtlinie (EU) 2019/882), in Deutschland umgesetzt durch das **BFSG** und die **BFSGV**, gilt seit 28.06.2025 | Unternehmen, die Verbrauchern online eine Dienstleistung anbieten, die zu einem Vertrag führt (Buchung, Bezahlung, Shop, Anmeldung zu kostenpflichtigen Angeboten, Kundenkonto) | Website bzw. App muss barrierefrei sein. Dazu eine **Erklärung zur Barrierefreiheit** (Informationen nach Anlage 3 BFSG). Bußgeld bis 100.000 €, dazu Abmahnungen durch Mitbewerber und Verbände. |
| Ausnahme **Kleinstunternehmen** | Dienstleister mit weniger als 10 Beschäftigten **und** höchstens 2 Mio. € Jahresumsatz oder Bilanzsumme | Gesetzlich befreit. Für uns **keine** Ausnahme von der Umsetzung: Kunden wachsen, Abmahnrisiko und Nutzer bleiben. |
| **Bulgarien:** Закон за изискванията за достъпност на продукти и услуги (Gesetz über die Barrierefreiheitsanforderungen an Produkte und Dienstleistungen), Държавен вестник бр. 31 vom 11.04.2025, gilt seit 28.06.2025 | wie in Deutschland (Gora, bulgarische Fassung von FlowTech) | Gleiche Anforderungen, da EU-weit dieselbe Richtlinie. Die Ausnahme für Kleinstunternehmen gibt die Richtlinie allen Ländern vor. Welche Behörde Dienstleistungen kontrolliert, vor dem Gora-Livegang klären und auf der Seite `/barrierefreiheit` nennen. |
| Andere EU-Länder | jedes Land hat den EAA eigens umgesetzt | Wer WCAG 2.2 AA einhält, erfüllt die gemeinsame technische Grundlage. Bei weiteren Zielmärkten die nationale Umsetzung vor dem Livegang prüfen. |
| **Web-Accessibility-Richtlinie** (EU) 2016/2102, in Deutschland BITV 2.0 | nur öffentliche Stellen (Behörden, öffentlich finanzierte Einrichtungen) | Falls ein Kunde öffentlich ist: zusätzlich Erklärung zur Barrierefreiheit mit **Feedback-Mechanismus** und Verweis auf die Schlichtungsstelle. |

Technische Grundlage ist die Norm **EN 301 549** (Stand 18.11.2026):
- **V3.2.1** ist die geltende Fassung und beruht auf **WCAG 2.1 AA**.
- **V4.1.1** wurde am 02.09.2026 veröffentlicht und beruht auf **WCAG 2.2**. Sie wird erst verbindlich, wenn die EU-Kommission sie im Amtsblatt nennt. Erwartet ist das Ende 2026; vorher auf EUR-Lex prüfen.

Wir setzen deshalb schon jetzt immer **WCAG 2.2 AA** um. Das erfüllt beide Fassungen, und beim Wechsel muss nichts nachgebaut werden.

Wer einordnet, ob ein Projekt unter das BFSG fällt, schreibt das Ergebnis mit Begründung in die README. Rechtsfragen im Grenzfall an Florian geben, nicht selbst entscheiden.

| Projekt | Einordnung (Stand 18.11.2026, nicht rechtsverbindlich) |
|---|---|
| Vogelperspektive | Online-Buchung kostenpflichtiger Sitzungen für Verbraucher → im Anwendungsbereich. Ob die Kleinstunternehmen-Ausnahme greift, mit Jara klären. Erklärung zur Barrierefreiheit trotzdem veröffentlichen. |
| Vogelperspektive-Praxisraum | Online-Dienstleistung für Verbraucher → im Anwendungsbereich, wie oben. Video braucht eine Text-Alternative (Chat), das 3D-Systembrett eine Bedienung ohne Ziehen. |
| Gora | Anmeldung zu Veranstaltungen: Sobald etwas kostet oder ein Vertrag zustande kommt → im Anwendungsbereich (bulgarisches Recht). |
| FlowTech | richtet sich an Unternehmen (B2B), kein Vertragsabschluss online → nicht im Anwendungsbereich. Trotzdem WCAG 2.2 AA. |
| Ortrud | nur Kontaktformular, kein Vertragsabschluss online → nicht im Anwendungsbereich. Trotzdem WCAG 2.2 AA. |

### Gemeinsame Bausteine

`_bausteine/barrierefreiheit/` enthält die gemeinsame Umsetzung: `SiteSkipLink.vue`, `a11y.css` (Scroll-Abstand für den Sticky-Header, Fokus-Grundstil, reduzierte Bewegung), `kontrast.mjs` (Kontrastrechner für hex und oklch) und `erklaerung-vorlage.md`. Jedes neue Projekt übernimmt sie nach der Checkliste in der dortigen README. Änderungen nur dort pflegen und dann in alle Projekte kopieren.

### Pflichtseite „Barrierefreiheit“

Jedes Projekt im Anwendungsbereich hat eine Seite `/barrierefreiheit`, verlinkt im Footer neben Impressum und Datenschutz. Inhalt:
- welche Dienstleistung angeboten wird, allgemein verständlich beschrieben
- wie die Anforderungen erfüllt werden (WCAG 2.2 AA, Bedienung per Tastatur und Screenreader, Kontraste, Zoom …)
- bekannte Einschränkungen mit Datum und geplanter Lösung
- Kontakt für Hinweise zu Barrieren (E-Mail, Telefon)
- die zuständige Marktüberwachungsbehörde: in Deutschland die Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten und Dienstleistungen (MLBF)
- Datum der letzten Prüfung

Die Seite selbst muss barrierefrei sein. Projekte außerhalb des Anwendungsbereichs bekommen sie freiwillig, wenn es inhaltlich passt.

### Technische Mindestanforderungen (WCAG 2.2 AA)

**Struktur und Semantik**
- Echte HTML-Elemente: `<button>` für Aktionen, `<a>` für Navigation, `<nav>`, `<main>`, `<header>`, `<footer>`. Kein `div` mit `@click`.
- Pro Seite genau ein `<h1>`, Überschriften ohne Sprünge. `lang` am `<html>` (macht i18n), fremdsprachige Passagen mit eigenem `lang`.
- „Zum Inhalt springen“-Link als erstes Element im Layout.
- Jede Seite hat einen eigenen, aussagekräftigen `<title>`. Bei Seitenwechsel in der SPA den Fokus sinnvoll setzen oder den Wechsel ansagen (Nuxt `<NuxtRouteAnnouncer>` in `app.vue`).
- Reka-UI-Komponenten bringen ARIA-Rollen und Fokusverwaltung mit. Beim Anpassen der shadcn-Komponenten diese Attribute nicht entfernen.

**Wahrnehmbar**
- Kontrast mindestens **4,5 : 1** für Text, **3 : 1** für großen Text, Icons, Rahmen von Eingabefeldern und Fokusrahmen. Markenfarben bei der Token-Definition in `main.css` prüfen, in Hell und Dunkel.
- Informationen nie nur über Farbe (Fehler: Farbe + Symbol + Text).
- Alt-Texte für inhaltliche Bilder, `alt=""` für reine Deko. Icon-Buttons brauchen `aria-label`.
- Audio und Video: Untertitel bzw. Transkript (z. B. Hörproben Ortrud: kurze Beschreibung; Video im Praxisraum: Chat als Alternative).
- Bei 200 % Zoom und bei 320 px Breite bleibt alles lesbar und bedienbar, ohne horizontales Scrollen.

**Bedienbar**
- Alles per Tastatur erreichbar und bedienbar, sinnvolle Reihenfolge, keine Tastaturfalle. Dialoge fangen den Fokus und geben ihn beim Schließen zurück (Reka macht das).
- **Fokus immer sichtbar** (`focus-visible`-Ring, nie `outline: none` ohne Ersatz) und **nicht verdeckt**: Bei Sticky-Header `scroll-padding-top` setzen.
- Klickflächen mindestens **24 × 24 px** (für Touch besser 44 × 44 px).
- Jede Zieh-Geste (Drag & Drop, Slider, 3D-Brett) hat eine Alternative mit Klicks oder Tasten.
- Keine Zeitlimits ohne Verlängerung. Karussells und automatische Slider anhalten lassen.
- Animationen und View Transitions respektieren `prefers-reduced-motion`. Nichts blinkt öfter als dreimal pro Sekunde.

**Verständlich**
- Jedes Formularfeld hat ein sichtbares `<label>`. Pflichtfelder im Text kennzeichnen, nicht nur mit `*`.
- Fehlermeldungen als Text direkt am Feld, verknüpft per `aria-describedby`, Feld mit `aria-invalid`. Nach dem Absenden zum ersten Fehler springen (Muster: Rabatt-Fragebogen Vogelperspektive).
- `autocomplete`-Attribute für persönliche Daten (`name`, `email`, `tel`, `street-address` …).
- Bereits eingegebene Daten im selben Ablauf nicht erneut abfragen.
- Login ohne Denkaufgaben: Einfügen erlaubt, Passwortmanager funktionieren, kein CAPTCHA mit Rätsel. Der Honeypot ersetzt das CAPTCHA.
- Hilfe und Kontakt stehen auf jeder Seite an derselben Stelle (Footer).
- Klare, einfache Sprache. Bei Angeboten für breite Zielgruppen eine Seite in Leichter Sprache erwägen.

**Robust**
- Statusmeldungen (gesendet, Fehler, Laden) über `role="status"` bzw. `aria-live` ansagen.
- PDFs zum Download nur barrierefrei (getaggt) oder mit gleichwertigem HTML-Inhalt.

## Render-Modus wählen

| Modus | Wann | Nuxt | Hosting |
|---|---|---|---|
| **A – Statisch** | Reine Info-Seite: kein Formular, kein Login, keine Datenbank | `nuxt generate` bzw. `nitro.preset: 'static'` → `.output/public` | jeder Webspace (dogado) oder Caddy `file_server` |
| **B – Hybrid** (Standard) | Sobald ein Formular, Mailversand, Login oder Daten nötig sind | `nitro.preset: 'node-server'`. Öffentliche Seiten per `routeRules: { prerender: true }`, `/api/**` und `/admin/**` dynamisch | Container auf dem eigenen Webserver |
| **C – Webapp** | Mehrere Nutzer, Rollen, viel Interaktion | wie B, dazu Drizzle-Migrationen und automatische Tests | Container auf dem eigenen Webserver |

- Im Zweifel **B**. Ein Kontaktformular ist nie ein Grund für PHP, sondern ein Grund für B.
- B und C laufen **nicht** auf dogado: CentOS 7 mit glibc 2.17 kann kein Node ≥ 18 ausführen.
- In B/C gilt für `/admin/**`: `ssr: false`, `x-robots-tag: noindex, nofollow`, `cache-control: no-store`. Für `/api/**`: `no-store`. Vorlage ist `Vogelperspektive/webapp/Vogelperspektive/nuxt.config.ts`.

## Stack (verbindlich)

| Bereich | Standard | Hinweise |
|---|---|---|
| Framework | **Nuxt 4 ≥ 4.6.3** mit den Ordnern `app/`, `server/`, `shared/` | 4.6.0–4.6.2 haben Sicherheitswarnungen. `compatibilityDate` setzen, `devtools` aus. |
| Laufzeit | **Node 24 LTS** | `.node-version` und `engines` in `package.json` pflegen. Lokal ist v24.13 installiert, Gora verlangt ≥ 24.15 → lokal aktualisieren. |
| Paketmanager | **npm** mit `package-lock.json` | In Builds `npm ci`. Neue Pakete mit `npm install --before=<Datum vor 2 Wochen>` gegen frisch kompromittierte Versionen. |
| TypeScript | **^5.9 oder ^6**, niemals 7 | TS 7 (Go-Port) hat keine JS-API mehr, der Vue-Compiler bricht ab. `typescript` und `vue-tsc` als devDependency. |
| Styling | **Tailwind CSS 4** über `@tailwindcss/vite`, keine `tailwind.config` | Farben als CSS-Variablen (oklch) in `app/assets/css/main.css`. Markenfarben als eigene Tokens (`brand`, `teal` …). `accent` nicht als Markenfarbe missbrauchen, das ist die shadcn-Hover-Farbe. |
| UI | **shadcn-vue** (Reka UI) über `shadcn-nuxt` | `components.json`: style `new-york`, baseColor `neutral`, iconLibrary `lucide`. Komponenten in `app/components/ui/`, `prefix: ''`. Generierte Komponenten gehören zum Projekt und dürfen angepasst werden. |
| Icons | **`@lucide/vue`** | Nicht `lucide-vue-next` (FlowTech hat beide → aufräumen). |
| Schriften | **`@fontsource-variable/<name>`** bzw. `@fontsource/<name>` als npm-Paket, über `css:` in `nuxt.config.ts` | Kein `@nuxt/fonts` mit Google-Provider: das lädt beim Build bei Google (Ortrud → umstellen). |
| Bilder | **`@nuxt/image`**, WebP, Ziel 200–400 KB pro großem Bild | `sizes` nur mit Breakpoint-Keys (`sm:100vw md:50vw`). Originale (8–13 MB) nicht nach `public/`. Bildrechte in der README oder in `public/images/sources.json` festhalten. |
| Mehrsprachigkeit | **`@nuxtjs/i18n`**, `strategy: 'prefix_except_default'`, `defaultLocale: 'de'`, `detectBrowserLanguage: false`, `baseUrl` setzen | Texte in `i18n/locales/<code>.json`. Übersetzungen kuratiert, nicht maschinell ungeprüft. |
| Validierung | **zod** in `shared/schemas.ts` | Dieselben Schemas im Browser und auf dem Server. |
| Datenbank | **SQLite** über das eingebaute `node:sqlite` (WAL, `foreign_keys=ON`, `busy_timeout`) | Datei unter `.data/`, im Container als Volume. Neue Projekte mit **Drizzle ORM + drizzle-kit**: Schema in `db/schema.ts`, Migrationen in `drizzle/` (Muster Gora). Migrationen enthalten nur Struktur, nie Daten. |
| Login | **`nuxt-auth-utils`** (versiegeltes HttpOnly-Cookie, `NUXT_SESSION_PASSWORD`) | Passwörter nur als Hash in Env oder DB. Keine offene Registrierung. Bei mehreren Nutzern: Rollen in der DB, und jede API prüft Freigabe und Rolle erneut (Muster Gora). |
| Mail | **nodemailer** über SMTP des eigenen Postfachs | Zugangsdaten nur per Env (`NUXT_SMTP_*`). |
| Formularschutz | **Rate-Limit + Honeypot-Feld `website`** bei jedem öffentlichen Formular | Vorlage `Vogelperspektive/webapp/Vogelperspektive/server/utils/security.ts`. Client-IP hinter Caddy = **letzter** Eintrag in `X-Forwarded-For`. |
| Dark Mode | nur wenn das Design es vorsieht: `@nuxtjs/color-mode` mit `classSuffix: ''` | |

## Projektstruktur

```
app/
  assets/css/main.css      Tailwind, Design-Tokens
  components/
    ui/                    shadcn-vue (Grundbausteine)
    site/                  Rahmen: SiteHeader, SiteFooter, SiteSkipLink, SiteLanguageSwitch
    section/               Seitenabschnitte: SectionHero, SectionHeading, SectionCard, SectionCta
    <fachbereich>/         z. B. contact/ContactForm, booking/BookingCalendar, blog/BlogCard
  composables/  layouts/  pages/  middleware/  plugins/
  data/                    Inhalte als TS: Kontakt, Navigation, FAQ, Referenzen …
  lib/utils.ts             cn()
server/
  api/                     <name>.get.ts / <name>.post.ts, health.get.ts
  routes/                  robots.txt.ts, sitemap.xml.ts
  utils/                   db.ts, mail.ts, security.ts
  plugins/                 z. B. Aufräum-Jobs (Löschfristen)
shared/                    schemas.ts, Preise und Konstanten (eine Quelle für Browser und Server)
db/schema.ts + drizzle/    nur wenn Datenbank
i18n/locales/              nur wenn mehrsprachig
public/                    favicon, apple-touch-icon, site.webmanifest, Bilder (WebP)
scripts/                   z. B. admin:hash, Prüfskripte
Dockerfile  .dockerignore  compose.yml       nur Modus B/C, Compose OHNE Proxy (siehe SERVER.md)
.env.example  .node-version  README.md
```

- Inhalte (Texte, Preise, Kontaktdaten) liegen gebündelt in `app/data/`, `shared/` oder den i18n-Dateien, nicht verstreut in Templates.
- Die README jedes Projekts enthält: Zweck, Befehle, alle Env-Variablen, Aufbau, Deployment, BFSG-Einordnung, bekannte Barrieren, offene Punkte.
- Rechtsseiten im Footer: Impressum, Datenschutz, Barrierefreiheit (siehe oben).

## Code-Standards (Vue, Nuxt, shadcn)

Ziel: Jede Seite ist aus wiederverwendbaren Bausteinen zusammengesetzt, jeder Baustein hat genau eine Aufgabe, und ein neues Projekt startet mit dem Bestand der vorigen statt bei null. Lesbar schlägt clever. Kurz ist gut, solange es verständlich bleibt.

### Komponenten-Architektur

Vier Ebenen, Abhängigkeiten nur von oben nach unten:

| Ebene | Ordner | Aufgabe | Regel |
|---|---|---|---|
| 1 Grundbausteine | `components/ui/` | Button, Input, Dialog, Card … von shadcn-vue | Nicht neu erfinden. Eigene Varianten (z. B. Markenbutton) über `cva` in `ui/<name>/index.ts` ergänzen, nicht per Klassen an jeder Verwendungsstelle. |
| 2 Layout-Bausteine | `components/site/`, `components/section/` | Header, Footer, Hero, Abschnittsüberschrift, CTA-Band | Kennen keine Fachlogik. Inhalt kommt über Props und Slots. |
| 3 Fach-Komponenten | `components/<fachbereich>/` | Kontaktformular, Buchung, Blog-Karte | Nutzen Ebene 1–2. Logik steckt in Composables, nicht im Template. |
| 4 Seiten | `pages/` | setzen Bausteine zusammen, laden Daten, setzen `useSeoMeta` | Kein eigenes Markup-Gestrüpp, keine Geschäftslogik. Ziel: unter ca. 150 Zeilen. |

- **Wann eine Komponente?** Sobald Markup ein zweites Mal gebraucht wird, oder sobald eine Datei über ca. 200 Zeilen wächst oder zwei Aufgaben hat.
- **Dateinamen = Komponentenname**, PascalCase, mindestens zwei Wörter: `site/SiteHeader.vue` → `<SiteHeader>`. So ist jede Komponente per Suche sofort auffindbar.
- **Props statt Kopien:** Eine Komponente mit Varianten (`variant`, `size`) über `cva` statt drei fast gleicher Komponenten.
- **Slots statt Prop-Flut:** Für freien Inhalt Slots (Default und benannte), Props nur für Daten und Varianten.
- **`class` durchreichen:** Jeder Baustein nimmt `class?: HTMLAttributes['class']` an und verbindet sie mit `cn()` (shadcn-Muster). So lässt er sich anpassen, ohne ihn zu kopieren.
- **Wiederverwendung über Projekte:** Bausteine, die in zwei Projekten gleich gebraucht werden (SiteSkipLink, SectionHero, ContactForm mit Honeypot, PlaceholderNote …), so allgemein bauen, dass sie ohne Änderung übernommen werden können. Ab dem dritten Projekt kommen sie in einen gemeinsamen **Nuxt Layer** (eigenes Repo, per `extends` eingebunden).

### Vue und TypeScript

- Nur `<script setup lang="ts">` mit Composition API. Keine Options API.
- Props und Events typisiert: `defineProps<{ … }>()` mit `withDefaults`, `defineEmits<{ … }>()`, `defineModel()` für `v-model`.
- Kein `any`. Typen aus den zod-Schemas ableiten (`z.infer<typeof schema>`), gemeinsame Typen in `shared/`.
- Abgeleitete Werte mit `computed`. `watch` nur für Nebenwirkungen.
- Logik, die mehr als ein paar Zeilen hat oder mehrfach gebraucht wird, in ein Composable `useXyz()` in `app/composables/`. Server-Logik in `server/utils/`.
- Daten laden mit `useFetch` bzw. `useAsyncData` (mit Schlüssel), nicht mit `$fetch` im Setup, sonst wird beim SSR doppelt geladen. `$fetch` nur für Aktionen wie Absenden.
- Geteilter Zustand mit `useState`. Pinia nur, wenn es wirklich komplex wird.
- Nuxt-Bordmittel nutzen: `NuxtLink` (bei i18n `NuxtLinkLocale`), `NuxtImg`, `useSeoMeta`, `<ClientOnly>` für reine Browser-Teile, `Lazy`-Präfix für schwere Komponenten (z. B. 3D-Systembrett).
- Was Nuxt automatisch importiert, nicht von Hand importieren.
- `v-for` immer mit stabilem `:key` (ID, nicht Index). Kein `v-if` und `v-for` auf demselben Element.
- `v-html` nur für vertrauenswürdige, bereinigte Inhalte.

### Styling

- Tailwind-Klassen im Template, mobil zuerst (`md:`, `lg:` für größere Bildschirme).
- Keine festen Farbwerte im Template (`text-[#06545a]`), sondern Tokens (`text-primary`, `bg-brand`). Keine willkürlichen Abstände, sondern die Tailwind-Skala.
- Wiederholt sich eine lange Klassenkette, wird daraus eine Komponente oder eine `cva`-Variante, nicht `@apply`.
- Eigenes CSS nur für Tokens und seltene globale Dinge in `main.css`.

### Clean Code

- **KISS, DRY, YAGNI:** einfach bauen, Doppeltes zusammenfassen, nichts auf Vorrat bauen.
- Funktionen klein und mit einer Aufgabe. Früh zurückkehren statt tief verschachteln.
- Sprechende englische Namen (`isSubmitting`, `formatPrice`), keine Abkürzungen außer gängigen (`id`, `url`).
- Kommentare auf Deutsch erklären das **Warum**, nicht das Was.
- Keine Magic Numbers oder Magic Strings: Konstanten in `shared/` oder `app/data/`.
- Kein toter Code, kein auskommentierter Code, kein `console.log` im Commit.
- Fehler: Server wirft `createError({ statusCode, message })` mit verständlicher deutscher Meldung, Client zeigt sie am richtigen Ort an.

### Werkzeuge

- **Lint und Format:** `@nuxt/eslint` mit `stylistic: true` (2 Leerzeichen, einfache Anführungszeichen, keine Semikolons), Skript `npm run lint`. Kein zusätzliches Prettier. Gora nutzt heute einen anderen Stil und wird beim nächsten größeren Umbau umgestellt.
- **Tests:** In Modus C Pflicht, in B für Server-Logik empfohlen. Vitest für Utils und Server-Routen, Playwright für die wichtigsten Abläufe (Formular absenden, Login, Buchung).
- Vor jedem Commit: `npm run lint`, `npm run typecheck`, Tests grün.

## Konfiguration und Geheimnisse

- Alles über `runtimeConfig` und `NUXT_*`-Umgebungsvariablen. Unter `public` steht nur, was der Browser sehen darf.
- `.env` nie committen und nie ins Image kopieren (`.dockerignore`). `.env.example` immer vollständig und kommentiert, Geheimnisse ohne Wert.
- Schlüssel erzeugen: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
- Geheimnisse gehören nicht in Chat, README, Memory oder Commit-Nachrichten.
- Sensible Daten (z. B. Gesundheits- oder Finanzangaben) verschlüsselt speichern (AES-GCM, `NUXT_DATA_KEY`) und mit Löschfristen versehen (Muster: Rabatt-Anträge Vogelperspektive). Den Schlüssel getrennt sichern: Ohne ihn sind die Daten verloren.

## Qualität vor jedem Deployment

- `npm run typecheck` und `npm run build` bzw. `npm run generate` laufen ohne Fehler.
- Im Browser prüfen: Desktop 1440 px und Handy 390 px, ggf. Hell und Dunkel, Bedienung per Tastatur, keine Konsolenfehler, **kein einziger Request an fremde Domains** (Netzwerk-Tab).
- Jedes Formular einmal komplett durchspielen, auch den Fehlerfall.
- Für eigene Tests einen eigenen Port nehmen (z. B. 3456). Florian hat oft `npm run dev` auf Port 3000 laufen. Prozesse, die ich nicht selbst gestartet habe, nie beenden.
- SEO-Grundausstattung: `lang`, `titleTemplate`, Beschreibung, `theme-color`, Favicon und Webmanifest, `robots.txt`, `sitemap.xml`, Canonical und hreflang (i18n), og:image. Beim Relaunch alte URLs per `routeRules` mit 301 umleiten.
- **Barrierefreiheit prüfen** (jedes Deployment, nicht nur beim Livegang):
  1. automatisch: `browser_check_accessibility` (Claude-Manager-Browser) bzw. axe/Lighthouse auf jeder Seitenvorlage. 0 Verstöße der Stufen A und AA.
  2. von Hand: jede Seite nur mit Tastatur durchgehen, 200 % Zoom und 320 px Breite, `prefers-reduced-motion` an, Kontraste der Markenfarben.
  3. Screenreader-Stichprobe (NVDA unter Windows) für Navigation und jedes Formular.
  Automatische Tests finden nur etwa ein Drittel der Probleme. Die Handprüfung ist Pflicht.
- Bekannte Barrieren, die nicht sofort behoben werden, stehen in der README und auf der Seite `/barrierefreiheit`.

## Git

- Jedes Projekt ist ein eigenes Git-Repository, privat auf GitHub (`f7or7an`). Vorhanden: Gora, `vogelperspektive`, `vogelperspektive-praxisraum` (seit 08.11.2026). FlowTech hat ein Repo ohne Commit, Ortrud hat keins → nachholen.
- Nicht ins Repo: `node_modules`, `.nuxt`, `.output`, `dist`, `.data`, `*.sqlite*`, `.env*` (außer `.env.example`), Logs, Arbeitsdateien.
- Arbeitsdateien (Hilfsskripte, Screenshots, Build-Logs) gehören in den Scratchpad der Session, nicht in den Projektordner (Gora: `work/`, `outputs/` aufräumen).

## Bekannte Stolpersteine

- **TypeScript 7** → Vue-Compiler bricht ab. Auf ^5.9 oder ^6 pinnen.
- **Vite 8 / Rolldown:** „No fs option provided to compileScript“ → `vite.vue.script.fs` setzen (siehe `FlowTech/website/nuxt.config.ts`).
- **`shadcn-vue init`** braucht ein echtes Terminal. Stattdessen `components.json` und `app/lib/utils.ts` von Hand anlegen, danach funktioniert `npx shadcn-vue@latest add <name>`.
- Nach jedem `shadcn-vue add` prüfen: Importe `from "cn"` → `@/lib/utils`. Selektoren wie `data-open:` → Reka setzt `data-state` / `data-orientation` (siehe Ortrud-README).
- **`@nuxt/image` 2.2** braucht Nuxt ≥ 4.6.
- **`node:sqlite`** gibt eine ExperimentalWarning aus → `node --disable-warning=ExperimentalWarning`.
- **Windows:** `npm run generate` scheitert, wenn ein Terminal in `.output/public` steht.
- **Git Bash** macht aus Argumenten wie `/` Windows-Pfade → `MSYS_NO_PATHCONV=1` voranstellen.
- **i18n-JSON:** Gerade Anführungszeichen `"` im Text beenden den String → typografische „…“ verwenden und die Datei vor dem Build mit `JSON.parse` prüfen.
- **dogado:** Nach mehreren fehlgeschlagenen SSH-Logins sperrt Fail2Ban die IP für 30–60 Minuten. Nicht wiederholt probieren. Immer `ssh -o BatchMode=yes` mit Key verwenden.
