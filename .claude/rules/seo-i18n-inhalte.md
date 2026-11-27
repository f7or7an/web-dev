---
paths:
  - "**/nuxt.config.ts"
  - "**/i18n/**"
  - "**/pages/**"
  - "**/layouts/**"
  - "**/app.vue"
  - "**/server/routes/**"
  - "**/content/**"
  - "**/content.config.ts"
  - "**/app/data/**"
  - "**/*[Rr]edirects*"
  - "**/sources.json"
  - "**/*[Rr]obots*"
  - "**/*[Ss]itemap*"
  - "**/*LanguageSwitch*"
---

# SEO, Mehrsprachigkeit und Inhalte

Gilt für alle Projekte unter `WebSites/`. Stand: 21.11.2026.
Nicht hier: Bilder und Schriften (`WebSites/.claude/rules/performance.md`), `lang` an fremdsprachigen Passagen und eigene Seitentitel als Barrierefreiheits-Pflicht (`barrierefreiheit.md`), Kontaktangaben, Formulare und Datenschutzerklärung (`formulare-und-datenschutz.md`), `noindex` für `/admin/**` und Staging (Kern bzw. `SERVER.md`).

## SEO-Grundausstattung (jedes Projekt, vor jedem Livegang)

| Baustein | Wo | Hinweis |
|---|---|---|
| `lang` am `<html>` | i18n bzw. `app.head.htmlAttrs` | bei i18n über `useLocaleHead()` (siehe unten) |
| `titleTemplate` | `app.vue` bzw. `nuxt.config.ts` → `app.head` | z. B. `'%s · Vogelperspektive'` |
| eigener `<title>` und Beschreibung pro Seite | `useSeoMeta({ title, description })` in jeder Seite | Beschreibung ca. 120–160 Zeichen, nicht doppelt über Seiten |
| `theme-color` | `app.head.meta` | Markenfarbe, passend zu `site.webmanifest` |
| Favicon, `apple-touch-icon`, `site.webmanifest` | `public/` | |
| `robots.txt`, `sitemap.xml` | Modul oder `server/routes/` (siehe unten) | |
| Canonical, hreflang, `x-default` | `useLocaleHead()` (i18n) bzw. `useHead` | absolute URLs, daher `baseUrl` bzw. Site-URL setzen |
| `og:image` | `public/og-image.jpg` | siehe unten |
| strukturierte Daten | `useHead` oder `nuxt-schema-org` | siehe unten |
| 301-Weiterleitungen alter URLs | `shared/redirects.ts` | nur beim Relaunch, siehe unten |

## robots.txt und sitemap.xml

- **Mehrsprachige Projekte:** `@nuxtjs/sitemap` + `@nuxtjs/robots`. `@nuxtjs/sitemap` erzeugt die hreflang-Alternativen in der Sitemap aus der i18n-Konfiguration, `@nuxtjs/robots` die `robots.txt` samt Sitemap-Verweis. Vor dem Einbau `npm view <paket> engines` prüfen (Node ≥ 24.15 bzw. 26 muss passen).
- **Einsprachige Mini-Seiten** dürfen eigene Routen behalten: `server/routes/robots.txt.ts` und `server/routes/sitemap.xml.ts` (Muster Vogelperspektive).
- **Nicht** das Bündel `@nuxtjs/seo` (zieht Module mit, die wir nicht brauchen, u. a. og-image-Erzeugung).
- Die Sitemap enthält nur indexierbare, kanonische URLs: kein `/admin/**`, kein `/api/**`, keine Weiterleitungsquellen.
- **Schrägstrich am Ende einheitlich:** `nuxt generate` legt Seiten als `<pfad>/index.html` ab; Apache (dogado) leitet `/pfad` per 301, Caddy `file_server` per 308 auf `/pfad/` um. In Modus A deshalb überall mit Schrägstrich, soweit vorhanden: `site.trailingSlash: true` (mit `@nuxtjs/sitemap`/`robots`), i18n `trailingSlash: true` (mehrsprachig); sonst eigene Sitemap-Route und Canonical mit `/`; `experimental.defaults.nuxtLink.trailingSlash: 'append'`, Einträge in `prerender.routes` mit `/`. Startseite als `https://<domain>/`. Prüfen: Canonical, hreflang, og:url, Sitemap-`<loc>` und interne Links enden auf `/`; nach dem Deploy `curl -sI` auf eine Sitemap-URL ergibt 200 (Muster FlowTech, 21.11.2026). Modus B/C liefern ohne Umleitung aus; dort genügt, dass alle Quellen dieselbe Form nutzen.
- **KI-Crawler:** Kein `llms.txt` als Pflichtbaustein (Google: keine speziellen Dateien nötig, 05/2026). Pro Projekt entscheiden, ob KI-Trainings-Crawler gesperrt werden. Das ist eine Projekteinstellung (keine Abweichung) und steht in der Projekt-`CLAUDE.md`. Beispiel für eine Sperre (Liste nicht vollständig, vor Einsatz aktualisieren):
  ```
  User-agent: GPTBot
  User-agent: Google-Extended
  User-agent: ClaudeBot
  Disallow: /
  ```
  Mit `@nuxtjs/robots` über dessen Konfiguration (Gruppen) statt einer Datei in `public/`; genaue Optionen in der Modul-Doku nachlesen.

## og:image

- Eine statische Datei pro Projekt in `public/` (z. B. `og-image.jpg`), **1200 × 630 px**, per `useSeoMeta({ ogImage: '<absolute URL>' })` im Layout. Einzelne Seiten dürfen ein eigenes Bild setzen.
- `nuxt-og-image` (Bilder zur Laufzeit/beim Build erzeugen) höchstens mit lokalem Font-Provider, weil es sonst Schriften aus dem Netz lädt (Grundsatz 1).

## Strukturierte Daten (JSON-LD)

- Nur was auch sichtbar auf der Seite steht, weil abweichende Auszeichnung gegen die Google-Richtlinien verstößt (manuelle Maßnahme möglich).
- Typen nach Projekt: `Organization` bzw. `LocalBusiness` (Praxis, Firma), `Event` (Gora-Veranstaltungen), `Person`/`ProfilePage` (Ortrud), `BreadcrumbList` bei tiefer Navigation.
- **Kein `FAQPage` mehr:** Google hat diese Rich Results am 07.05.2026 abgeschafft. Kein neues FAQ-Markup anlegen; vorhandenes schadet nicht und muss nicht entfernt werden.
- Einbinden per `useHead` oder `nuxt-schema-org`. Daten aus `app/data/` bzw. i18n speisen, nicht doppelt pflegen.
  ```ts
  useHead({
    script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(organizationJsonLd) }],
  })
  ```
- Prüfen mit dem Rich-Results-Test von Google bzw. validator.schema.org (Werkzeug beim Entwickeln, kein Laufzeit-Dienst).

## Mehrsprachigkeit (`@nuxtjs/i18n`)

Version 10.6 (es gibt kein v11; vor Nuxt 5 prüfen, siehe `abhaengigkeiten-und-layer.md`). Nur in mehrsprachigen Projekten.

- `strategy: 'prefix_except_default'`: Standardsprache ohne Präfix (`/kontakt`), andere mit (`/en/contact`).
- `defaultLocale: 'de'`. Abweichung Gora: Hauptsprache Bulgarisch, steht in der Tabelle „Abweichungen“ der Gora-`CLAUDE.md`.
- `detectBrowserLanguage: false`: Sprache **nur über die URL**, kein Umleiten nach Browsersprache und kein Cookie `i18n_redirected` (Grundsatz 3, „Nur Sitzung“). Wer eine andere Sprache will, nutzt den Sprachumschalter.
- `baseUrl` als **String** (z. B. aus `runtimeConfig`/Konstante), weil Canonical und hreflang absolute URLs brauchen.
- Jede Locale mit `language` als BCP-47-Code (`de-DE`, `bg-BG`, `en-US` …), sonst fehlen `lang` und hreflang.
- Keine `lazy`-Option mehr: In v10 ist Lazy-Loading der Sprachdateien immer an.
- Texte in `i18n/locales/<code>.json` (bei vielen Texten Unterordner pro Sprache wie bei Gora). Übersetzungen kuratiert, nicht maschinell ungeprüft.
- i18n-JSON: Gerade Anführungszeichen `"` im Text beenden den String. Typografische „…“ verwenden und jede Datei vor dem Build mit `JSON.parse` prüfen.

```ts
// Muster nuxt.config.ts (nach i18n-Doku v10, nicht im Pilottest gebaut)
i18n: {
  strategy: 'prefix_except_default',
  defaultLocale: 'de',
  detectBrowserLanguage: false,
  baseUrl: 'https://www.example.de',
  customRoutes: 'meta',
  locales: [
    { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
    { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
  ],
},
```

- **Head-Tags im Layout** mit `useLocaleHead()`: setzt `lang`, Canonical, hreflang-Alternativen und `x-default`. Nicht von Hand pro Seite nachbauen.
  ```ts
  const head = useLocaleHead()
  useHead(() => ({
    htmlAttrs: { lang: head.value.htmlAttrs.lang, dir: head.value.htmlAttrs.dir },
    link: [...(head.value.link ?? [])],
    meta: [...(head.value.meta ?? [])],
  }))
  ```
- **Übersetzte Slugs** per `definePageMeta({ i18n: { paths: { en: '/about', bg: '/za-nas' } } })` zusammen mit `customRoutes: 'meta'`. `defineI18nRoute` laut i18n-Doku nicht mehr empfohlen (in 10.6.0 nicht als `@deprecated` markiert); in neuem Code nicht verwenden.
- Links immer mit `NuxtLinkLocale` bzw. `localePath()`, nie feste Pfade mit Präfix.
- Sprachumschalter (`SiteLanguageSwitch`) als echte Links über `switchLocalePath()`, Sprachname in der eigenen Sprache (`Български`) mit passendem `lang`.

## Redaktionelle Inhalte

Wo Inhalte liegen, entscheidet, wer sie pflegt:

| Fall | Lösung | Warum |
|---|---|---|
| wenige feste Inhalte (Kontakt, Navigation, FAQ, Referenzen, Preise) | TypeScript in `app/data/` bzw. `shared/` (Preise, Konstanten), Texte mehrsprachig in i18n | typisiert, eine Quelle, kein Zusatzpaket |
| Blog, Langtexte, gepflegt über Git | **Nuxt Content v3** mit `content: { experimental: { sqliteConnector: 'native' } }`, Seiten vorgerendert | nutzt `node:sqlite` statt eines nativen Zusatzpakets; vor dem ersten Einsatz testen (nicht im Pilottest geprüft) |
| Kundin pflegt selbst | eigenes Admin mit Drizzle (`server-und-sicherheit.md`) | keine fremden Dienste, Rollen wie bei Gora |

- Inhalte (Texte, Preise, Kontaktdaten) liegen gebündelt in `app/data/`, `shared/` oder den i18n-Dateien, nicht verstreut in Templates.
- Kein Headless-CMS als externer Dienst (Grundsatz 1).

## Relaunch und Weiterleitungen

- **Jede alte URL** bekommt eine 301 (bzw. 308) auf ihr **passendstes** Ziel, nie pauschal auf die Startseite, weil Google Pauschal-Weiterleitungen als Soft-404 behandelt und das Ranking der alten Seite verloren geht.
- Tabelle in `shared/redirects.ts`, daraus erzeugt `nuxt.config.ts` die `routeRules`:
  ```ts
  // shared/redirects.ts
  export const redirects: Record<string, string> = {
    '/ueber-uns.html': '/ueber-mich',
  }
  // nuxt.config.ts
  import { redirects } from './shared/redirects'
  // …
  routeRules: {
    ...Object.fromEntries(Object.entries(redirects)
      .map(([from, to]) => [from, { redirect: { to, statusCode: 301 } }])),
  },
  ```
  `statusCode` ist hier richtig: Das ist die Option von `routeRules.redirect`, nicht `createError` (dort gilt `status`, siehe `server-und-sicherheit.md`).
- Gelöschte Inhalte ohne Ersatz antworten mit **410** (eigene Liste in derselben Datei, Server-Middleware mit `createError({ status: 410 })`).
- Weiterleitungen **mindestens 1 Jahr** behalten. Ketten höchstens 3 Sprünge, besser direkt aufs Endziel.
- Modus A (statisch): Weiterleitungen aus `routeRules` werden beim Generieren voraussichtlich nur als Weiterleitungsseite statt echter 301 ausgegeben (Einschätzung, vor Einsatz prüfen). Echte 301 dann im Webserver (Caddy `redir`, bei dogado `.htaccess`).
- Nach dem Livegang: Search Console (Abdeckung, 404) und 404-Einträge in den Logs prüfen, fehlende Weiterleitungen nachtragen. Log-Fristen: `formulare-und-datenschutz.md`.

## Bildrechte

- Für jedes Bild Herkunft und Rechte festhalten: in der README oder in `public/images/sources.json` (Muster Gora).
- Pro Eintrag mindestens: Datei, Quelle (URL bzw. Fotograf:in oder Kundin), Nutzungsrecht (z. B. „eigenes Foto der Kundin“, Lizenzname), Bearbeitung (z. B. „WebP Qualität 0.82, verkleinert“).
- Bilder ohne geklärte Rechte nicht veröffentlichen. Verlangt die Lizenz einen Bildnachweis, steht er sichtbar auf der Seite.
