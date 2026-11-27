---
paths:
  - "**/nuxt.config.ts"
  - "**/*.vue"
  - "**/public/**"
  - "**/assets/**"
---

# Performance: Rendern, Bilder, Schriften, Budgets

Gilt für alle Projekte unter `WebSites/`. Stand: 21.11.2026, ergänzt 25. und 27.11.2026.
Render-Modi A/B/C stehen im Kern (`CLAUDE.md`). Nitro-Cache und SQLite-Einstellungen: `WebSites/.claude/rules/server-und-sicherheit.md`. Datenladen mit `useAsyncData`: `WebSites/.claude/rules/vue-und-komponenten.md`. Proxy-Beschreibung und `nginx.conf` pro Projekt: `WebSites/.claude/rules/container-und-deployment.md`; Cache-Header Modus A: `WebSites/SERVER.md` 2.5a (Nginx-Container). Prüfablauf vor dem Deployment: `WebSites/.claude/rules/tests-und-qualitaet.md`.

## Rendern und Cachen

- Öffentliche Seiten bekommen `routeRules: { '<pfad>': { prerender: true } }`, weil fertiges HTML am schnellsten ist und keinen Server braucht.
- `swr: <Sekunden>` nur für öffentliche Seiten mit Laufzeitdaten (z. B. Event-Listen bei Gora). Nie bei Seiten mit Login oder Sitzung, weil sonst Inhalte eines Nutzers im Cache landen können.
- `isr` bringt auf `node-server` nichts gegenüber `swr`, deshalb `swr` nehmen.
- Seit Nuxt 4.6.4 cachen `cache`/`swr`/`isr` nur GET/HEAD und überspringen Antworten mit `Set-Cookie`, `private` oder `no-store` (Fix für GHSA-39r7-wfcx-99xg). Sich trotzdem nicht darauf verlassen: Seiten mit Sitzung nie cachen.
- `/admin/**` und `/api/**` bleiben dynamisch mit `no-store` (Vorlage im Kern unter „Render-Modus wählen“).

```ts
// Muster: Info-Seiten vorrendern, Event-Liste mit kurzem Cache
routeRules: {
  '/': { prerender: true },
  '/kontakt': { prerender: true },
  '/events': { swr: 600 },
  '/admin/**': { ssr: false, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } },
},
```

## Payload und JavaScript

- Payload (die in die Seite eingebetteten Daten von `useAsyncData`/`useFetch`) klein halten: `pick`/`transform`, Details in `vue-und-komponenten.md`. Budget **unter 50 kB** pro Seite (Einschätzung). Eine Nuxt-Warnung ab 100 kB nennt der Nuxt-4.6-Blog; im Code nicht gefunden, also nicht auf eine Warnung warten.
- `experimental.payloadExtraction: 'client'` erwägen (ab `compatibilityVersion: 5` Standard). Soweit bekannt: erste Ansicht ohne zusätzliche Payload-Anfrage, Seitenwechsel nutzen die vorgerenderte `_payload.json`. Wirkung vor dem Einschalten per `nuxt docs "payloadExtraction"` nachlesen und im Build vergleichen (nicht im Pilottest geprüft).
- **Lazy Hydration** (Hydration = Vue macht das Server-HTML im Browser interaktiv): statische Abschnitte unterhalb des sichtbaren Bereichs als `<LazySectionXyz hydrate-on-visible />`, rein statische als `hydrate-never`. `hydrate-never` nur ohne jede Bedienung darin, sonst funktionieren Buttons nicht.
- Islands bzw. `.server.vue` nur bei schweren Abhängigkeiten, die der Browser nicht braucht (z. B. Markdown-Renderer).
- `noScripts` nur für Seiten ganz ohne Interaktion (auch ohne Menü, Sprachumschalter, Formular).
- Schwere Komponenten (3D-Systembrett, Editor) mit `Lazy`-Präfix und in `<ClientOnly>` laden.
- Bundle prüfen: `npx nuxt analyze` vor dem ersten Livegang und nach jeder neuen Abhängigkeit. Budget **Start-JS ≤ 150 kB gzip** für Info-Seiten (Einschätzung). Große Ausreißer begründen oder ersetzen.

## Navigation

- NuxtLink lädt Seiten standardmäßig vor, sobald ein Link sichtbar wird. Bei Seiten mit sehr vielen Links (Listen, Footer mit vielen Zielen) global auf Interaktion umstellen, weil sonst viele unnötige Anfragen entstehen:
  ```ts
  experimental: {
    defaults: { nuxtLink: { prefetchOn: { visibility: false, interaction: true } } },
  },
  ```
  (laut Nuxt-Doku, nicht im Pilottest geprüft)
- View Transitions: `experimental: { viewTransition: true }`, **nie** `'always'`, weil `'always'` `prefers-reduced-motion` übergeht (Barrierefreiheit, siehe `barrierefreiheit.md`).

## Bilder

- Immer `@nuxt/image` (`<NuxtImg>`, `<NuxtPicture>`), Version siehe Stack-Tabelle im Kern. Format WebP; große Fotos als `<NuxtPicture format="avif,webp">`, weil AVIF bei Fotos deutlich kleiner ist und WebP als Rückfall bleibt.
- Zielgrößen: großes Bild 200–400 KB, **LCP-Bild ≤ 200 KB** (LCP = größtes sichtbares Element beim Laden, meist das Hero-Bild).
- **LCP-Bild:** `:preload="{ fetchPriority: 'high' }"`, nie `loading="lazy"`, höchstens eines pro Seite. Alle anderen Bilder `loading="lazy"`.
- Immer `width` und `height` angeben, weil der Browser sonst keinen Platz reserviert und die Seite springt (CLS).
- `sizes`: Standardwert ohne Präfix, danach Breakpoint-Keys, z. B. `sizes="100vw sm:50vw lg:400px"`. Keine eigenen Media-Queries im String. Die Keys sind die `screens` von `@nuxt/image` (`sm`, `md`, `lg` …), deren Standardwerte den Tailwind-Breakpoints entsprechen. (Bisherige Regel „nur Breakpoint-Keys“ gelockert: Die Doku erlaubt den Standardwert ohne Präfix.)
- Originale (oft 8–13 MB) nicht nach `public/`. Nur verkleinerte Fassungen einchecken, Bearbeitung und Herkunft festhalten (Bildrechte: `seo-i18n-inhalte.md`).
- In Modus B/C Bilder für vorgerenderte Seiten möglichst **beim Build** erzeugen, damit der Server zur Laufzeit nichts umrechnen muss. In Modus A geschieht das ohnehin. Ob der Prerender die Varianten mitschreibt, nach dem Build in `.output/public/_ipx/` nachsehen (nicht im Pilottest geprüft).
- `/_ipx` (Bildbearbeitung zur Laufzeit) nur mit eigenen Bildern, nie mit Uploads oder fremden Domains. Begründung und Details: `server-und-sicherheit.md` (Punkt `/_ipx`).
- Alt-Texte und Deko-Bilder: `barrierefreiheit.md`. Icons kommen aus `@lucide/vue` als SVG, nicht als Bilddatei.

```vue
<!-- Muster Hero (LCP) und Galerie-Bild -->
<NuxtPicture src="/images/hero.jpg" format="avif,webp" width="1600" height="900"
  sizes="100vw lg:1280px" :preload="{ fetchPriority: 'high' }" alt="…" />
<NuxtImg src="/images/raum.jpg" width="800" height="600" sizes="100vw md:50vw"
  loading="lazy" alt="…" />
```

## Schriften

Grundsatz 1 (keine fremden Dienste) gilt auch beim Build: Schriften kommen als npm-Paket, nie von Google Fonts oder einem CDN.

- Paket `@fontsource-variable/<name>` (statische Schnitte: `@fontsource/<name>`), eingebunden über **`@nuxt/fonts` mit `provider: 'npm'`**. Warum `@nuxt/fonts`: erzeugt Preload und Fallback-Metriken (angepasste Ersatzschrift gegen Springen beim Nachladen, CLS). Warum `npm`: schaltet die Remote-Provider ab.
- Ersetzt die bisherige Regel „Schrift nur über `css:` einbinden, kein `@nuxt/fonts`“. Verboten bleibt `@nuxt/fonts` mit Google- oder anderem Remote-Provider.
- **Geprüfte Konfiguration** (Pilottest 21.11.2026, `@nuxt/fonts` 1.2.0, Build offline mit null Netzzugriffen):

  ```ts
  modules: ['@nuxt/fonts'],
  fonts: {
    provider: 'npm',
    npm: { remote: false },   // sonst Ausweichen auf cdn.jsdelivr.net möglich
    families: [{ name: 'Montserrat Variable', preload: true }],
  },
  ```

- Fallback-Metriken entstehen automatisch. Preload nur mit `preload: true` an der Familie; nur für die Schrift setzen, die oben auf der Seite sofort sichtbar ist, und im Netzwerk-Tab prüfen, welche Dateien vorgeladen werden.
- `subsets`/`weights`/`styles` in `defaults` werden bei `@fontsource-variable/*` **ignoriert**: Der Provider liest `index.css`, also alle Subsets, nur aufrecht. Das Begrenzen auf genutzte Schriftsysteme (latin, latin-ext, cyrillic) ist damit nicht einstellbar. Der Browser lädt dank `unicode-range` trotzdem nur die Subset-Dateien, die eine Seite wirklich braucht.
- **Kursiv:** zusätzlich `css: ['@fontsource-variable/<name>/wght-italic.css', …]` **und** `features: { inlineStyles: false }`, sonst entfernt das Modul die Kursiv-Regeln.
- Bekannter Schönheitsfehler: Die Fallback-Regeln stehen doppelt im CSS. Harmlos, nicht „reparieren“.
- Nach jeder Änderung an Schriften einmal **ohne Netz bauen** (WLAN aus) bzw. im Build-Log und Netzwerk-Tab prüfen, dass keine Anfrage an fremde Domains geht.
- Nuxt UI bringt eigenes `@nuxt/fonts` mit: nur als begründete Abweichung, dann `ui.fonts: false` (Details in `vue-und-komponenten.md`).
- **Ortrud** (heute `provider: 'google'` an jeder Familie): `provider` an den Familien entfernen, global `provider: 'npm'` wie oben, je Familie das Paket installieren. Pro Familie prüfen, ob es ein Variable-Paket gibt; Pinyon Script hat keins (`@fontsource/pinyon-script`), Cormorant Garamond braucht zusätzlich kursiv. Bei statischen `@fontsource/*`-Paketen wirken `weights`/`styles` möglicherweise (ungeprüft, im Build-CSS nachsehen). Umzugsplan in `SERVER.md`.

## Kompression und Auslieferung

- Modus A: `nitro: { compressPublicAssets: { gzip: true, brotli: true } }`, damit beim Build `.br`- und `.gz`-Dateien entstehen. Der Nginx-Container liefert die `.gz`-Dateien mit `gzip_static on` aus (die Vorlage nutzt nur `gzip_static`, `.br` bleibt ungenutzt). Kompression und Cache-Header auch über den äußeren Proxy (NPM) prüfen (`SERVER.md` 2.5a).
- Dynamische Antworten (Modus B/C): Kompression über NPM, vor Live prüfen (GET mit `curl -sS -D - -o /dev/null -H 'Accept-Encoding: gzip'`, `SERVER.md` 2.5).
- **Audio und Video mit Spulfunktion (Modus B/C):** Nitro liefert `public/` ohne HTTP-Range aus (kein 206, kein `Accept-Ranges`). Der Browser kann dann nicht spulen, auch nicht per Tastatur. Solche Medien deshalb über eine eigene Route mit fester Namensliste ausliefern und den Dateinamen nie als Pfad übernehmen. Muster: Ortrud `server/routes/hoerproben/[file].ts`, `server/utils/byte-range.ts`, `shared/utils/audio-files.ts`. Der E2E-Test prüft, dass `Range: bytes=0-99` 206 mit `Content-Range` ergibt. In Modus A beantwortet Nginx Range-Anfragen selbst.
- Cache-Header in Modus A: HTML und `/_nuxt/builds/` (u. a. `latest.json`) revalidieren, übrige `/_nuxt/`-Assets 365 Tage (`nginx.conf`, `WebSites/SERVER.md` 2.5a).

## Budgets und Messung

Gemessen wird immer der **Produktions-Build** (`npm run build` bzw. `npm run generate`, dann `npx nuxt preview`) auf eigenem Port, z. B. 3456, nie der Dev-Server (unkomprimiert, ungebündelt). Modus B/C direkt: PowerShell `$env:PORT=3456; node .output/server/index.mjs`. Dev-Server nie mit `--host` starten (`server-und-sicherheit.md`).

Werkzeug: Lighthouse mobil bzw. `browser_performance` (Claude-Manager-Browser) auf **jeder Seitenvorlage** (Startseite, Inhaltsseite, Liste, Formularseite …), vor jedem Deployment.

| Messgröße | Labor-Budget (Lighthouse mobil) | Feldziel CWV „gut“ (75. Perzentil, web.dev) |
|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2,0 s | ≤ 2,5 s |
| CLS (Cumulative Layout Shift) | ≤ 0,05 | ≤ 0,1 |
| TBT (Total Blocking Time) | ≤ 200 ms | – |
| INP (Interaction to Next Paint) | – (im Labor nicht messbar) | ≤ 200 ms |
| Lighthouse Performance-Score | ≥ 90 | – |
| Start-JS gzip (Info-Seiten) | ≤ 150 kB (Einschätzung) | – |
| Payload pro Seite | < 50 kB (Einschätzung) | – |
| LCP-Bild | ≤ 200 KB | – |

- Labor-Budget strenger als Feldziel, weil echte Geräte und Netze schlechter sind als die Messung am Entwicklungsrechner.
- **Kein RUM** (Real User Monitoring, Messung bei echten Besuchern): Ein eigener Mess-Endpunkt wäre datenschutzrechtlich zu prüfen und widerspräche Grundsatz 3. Felddaten höchstens aus der Search Console.
- Budget gerissen: Ursache beheben (meist LCP-Bild, Schrift-Preload, zu viel JS) oder als bekannte Abweichung mit Grund in `STANDARDS-AUDIT.md` eintragen.
