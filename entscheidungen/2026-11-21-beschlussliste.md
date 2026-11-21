# Beschlussliste Richtlinien-Neufassung (Stand 21.11.2026)

Grundlage: 6 Recherche-Berichte vom 21.11.2026 (Architektur, Performance, Sicherheit, Ökosystem, Betrieb, SEO/Inhalte), Ladetest Claude Code, Florians Entscheidungen vom 21.11.2026.
Jeder Punkt muss in der Neufassung vorkommen (Ort in Klammern). „F:“ = Florians Entscheidung. Quellen in eckigen Klammern.
Bestehende Inhalte von CLAUDE.md und SERVER.md bleiben erhalten, sofern hier nichts anderes steht (insbesondere Barrierefreiheit/EU-Recht, Projekte-Tabelle, Render-Modi, Code-Standards, Git, Konfiguration).

## 0. Aufbau der Regeln (F: ja)
- 0.1 `WebSites/CLAUDE.md` = Kern, unter 200 Zeilen [code.claude.com/docs/en/memory: „target under 200 lines“]. Enthält: Projekte, Grundsätze, Rechtsrahmen kurz, Render-Modi, Stack-Tabelle, Struktur kurz, Ablauf/Qualität kurz, Git, Geheimnisse, Verzeichnis der Regeldateien, Stolpersteine kurz.
- 0.2 Detailregeln in `WebSites/.claude/rules/*.md` mit `paths:`-Frontmatter (Globs relativ zu `WebSites/`, z. B. `**/*.vue`). Getestet 21.11.2026 mit Claude Code 2.1.330: Session im Projektordner lädt `WebSites/CLAUDE.md` und Regeln ohne `paths` beim Start, Regeln mit `paths` beim Lesen/Schreiben passender Dateien. Regel ohne gültiges YAML lädt immer.
- 0.3 Jedes Projekt bekommt eine eigene `CLAUDE.md` im Repo (≤ 60 Zeilen): Zweck, Modus, Befehle, Port für eigene Tests, Besonderheiten, bewusste Abweichungen, Verweis auf README und STANDARDS-AUDIT.md. Claude Manager/Claude Code lädt sie beim Start jeder Session im Projektordner.
- 0.4 AGENTS.md wird nicht gelesen, sobald eine CLAUDE.md im Ordner oder darüber liegt [memory-Doku]. Gora hat `AGENTS.md` (fremde Änderungen!) → Gora-`CLAUDE.md` beginnt mit `@AGENTS.md`. Keine weiteren AGENTS.md anlegen.
- 0.5 HTML-Kommentare auf Blockebene werden vor dem Laden entfernt (Kontext sparen) [memory-Doku].
- 0.6 F: Meta-Repo (21.11.2026): `WebSites/` wird ein privates Git-Repo `f7or7an/websites` nur für CLAUDE.md, SERVER.md, `.claude/rules/`, `_bausteine/` (Projektordner per `.gitignore` ausgeschlossen). Grund: Versionierung, Cloud-Sessions. Anlegen in Phase 1 nach Freigabe der Richtlinien.
- 0.7 Für Nuxt-Fragen den offiziellen Nuxt-MCP-Server bzw. `nuxt docs "<frage>"` (Nuxt CLI v4) nutzen statt Gedächtnis [nuxt.com/docs/4.x/guide/ai].

## 1. Versionen und Laufzeit (Stack-Tabelle, Stolpersteine)
- 1.1 Nuxt ≥ 4.6.4 (Sicherheitsrelease 02.11.2026: 8 Nuxt- + 3 Nitro-Advisories, u. a. Umgehung von server/middleware per `//`/`%2F` (GHSA-f3x9-2chm-73c8, GHSA-r99w-jh2x-3mg9), SSR-Fehlerdetails an Client (GHSA-96x6-fvhx-49hg), Nitro-Route-Cache gab `Set-Cookie` an alle weiter (GHSA-39r7-wfcx-99xg)); zieht nitropack ≥ 2.13.6. Nuxt 3 seit 31.07.2026 ohne Support. [nuxt.com/changelog, github.com/nuxt/nuxt/releases/tag/v4.6.4]
- 1.2 F: **Node 26 LTS für ALLE Projekte** (Active LTS seit 28.10.2026; Node 24 Maintenance bis 30.04.2028). `.node-version` = 26, `engines.node` = `>=26`. Lokal Node 26 installieren. Nuxt 4.6 verlangt `^22.22.3 || ^24.15.0 || >=26`. [nodejs.org Release-Schedule, npm view nuxt@4.6.4 engines]
- 1.3 Container-Basis `node:26-slim` (glibc) statt Alpine: Node stuft musl als „Experimental“ ein [nodejs/node BUILDING.md]. Alternative Docker Hardened Images (`dhi.io/node:26`, kostenlos seit 12/2025) – optional.
- 1.4 TypeScript ausdrücklich `typescript@~6.0`: npm-`latest` ist seit 08.07.2026 TS 7.0, vue-tsc 3.x läuft damit nicht (`ERR_PACKAGE_PATH_NOT_EXPORTED`). Neu bewerten, wenn TS 7.1 und Vue Language Tools v4 stabil sind. tsconfig: Wurzel-`tsconfig.json` nur `references` (Nuxt erzeugt 4 tsconfigs), eigene Optionen über `typescript.tsConfig` in nuxt.config; `noUncheckedIndexedAccess` (Nuxt-4-Standard) nicht abschalten.
- 1.5 Mindestversionen wegen Advisories (Stand 21.11.2026): @nuxt/image ≥ 2.2.1 (GHSA-p5vf-pjf5-ggj3, /_ipx), vite ≥ 8.3.7 (GHSA-p4f5-76q4-ffq7, Dev-Server im Netz), vue ≥ 3.5.42 (GHSA-g2v6-rqmx-r4w6, SSR-XSS über `v-bind="obj"`), drizzle-orm ≥ 0.45.2 (GHSA-gpj5-g38j-94v9), zod ≥ 4.6.6 (GHSA-mrhx-c7xc-m3w5), nodemailer ≥ 10.1.4, nuxt-auth-utils ≥ 0.6. Als dauerhafte Regel: immer aktuelle Patch-Version; vor jedem Deployment `npm audit --omit=dev` ohne high/critical.
- 1.6 Vue bei 3.5 bleiben; 3.6 ist RC, Vapor nicht in Kundenprojekten. Reka UI 3 (alpha) nicht vor shadcn-vue-Unterstützung.
- 1.7 ESLint 10 mit @nuxt/eslint ≥ 1.17 (ESLint 9 laut eslint.org EOL – Quelle nur indirekt geprüft). Oxlint höchstens zusätzlich (prüft in .vue nur `<script>`). Kein Prettier/Biome.
- 1.8 Vitest 5 (`clearMocks` ist dort Standard an), @nuxt/test-utils ≥ 4.4, Playwright aktuell.
- 1.9 Drizzle: 1.0 noch RC; Treiber `drizzle-orm/node-sqlite` gibt es nur in 1.0. Bis 1.0 stabil: drizzle-orm 0.45.x mit `drizzle-orm/sqlite-proxy` über `node:sqlite` (Muster Gora und Praxisraum). Migration auf v1 (`drizzle-kit up`, kein journal.json mehr) einplanen.
- 1.10 `node:sqlite` ist ab Node 24.15 / 26 „Release candidate“ (Stabilität 1.2) → Stolperstein „ExperimentalWarning / --disable-warning“ streichen (nur Node < 24.15).
- 1.11 Stolperstein Vite „No fs option provided to compileScript“: Ursache = Vue-Compiler findet kein `typescript` mit `sys` (TS 7 oder Auflösung). Erst `npm ls typescript` prüfen, `vite.vue.script.fs` nur Notlösung. (Pilottest klärt, ob noch nötig.)
- 1.12 Stolperstein shadcn: `from "cn"` ist seit Okt. 2026 von shadcn-vue gewollt (npm-Paket `cn`, Befehl `migrate cn`). Regel: einheitlich bleiben – entweder Paket `cn` oder `@/lib/utils` pro Projekt, nicht gemischt. Empfehlung: bei `@/lib/utils` bleiben, solange es dort liegt; neue Projekte folgen shadcn-Standard. (Entscheidung beim Schreiben festlegen, beide Wege dokumentieren.)
- 1.13 Stolperstein „@nuxt/image 2.2 braucht Nuxt ≥ 4.6“ streichen (gegenstandslos).
- 1.14 `createError({ status, statusText, message })` statt `statusCode` (Nuxt 4.6 / Nuxt 5).
- 1.15 Nuxt UI v4: nicht Standard. Grund: lädt per `@nuxt/icon` Icons von api.iconify.design (`fallbackToApi: true`), bringt @nuxt/fonts, Tiptap, TanStack mit. Nur für große C-Webapps als begründete Abweichung, dann `icon.fallbackToApi: false` + `@iconify-json/lucide` + `ui.fonts: false`.
- 1.16 Neue Hilfen: `@nuxt/hints` (Dev-Hinweise) optional; `@nuxt/a11y` ist Alpha, nur Dev-Hilfe, ersetzt keine Handprüfung; `@nuxt/scripts` nicht nötig (keine Fremdskripte).
- 1.17 Nuxt 5 vorbereiten: noch nicht erschienen (Roadmap „Q4 2026 estimated“). Neuer Server-Code importiert aus `nuxt/server` und mischt nicht mit Server-Auto-Imports (Fehler NUXT_E8012). Vor jedem Minor-Update einmal mit `future.compatibilityVersion: 5` in einem Branch bauen, Warnungen notieren. `typedPages` und `routeTypedFetch` in neuen Projekten einschalten (in Nuxt 5 Standard).
- 1.18 `@nuxtjs/i18n` 10.6: kein v11; vor Nuxt 5 prüfen (nutzt h3 v1).

## 2. Lieferkette und Abhängigkeiten (F: „extrem wichtig“)
- 2.1 npm 12 (lokal und im Docker-Build-Stage, separat installiert, da Node 26 npm 11 mitbringt). npm 12 führt Installationsskripte von Abhängigkeiten nur aus, wenn sie in `package.json` → `allowScripts` freigegeben sind; `allow-git`/`allow-remote` stehen auf `none`. Freigaben committen. Im CI `strict-allow-scripts=true`. (Exakter Befehlsname und nötige Freigaben: Pilottest.)
- 2.2 Jedes Projekt hat eine `.npmrc` mit `min-release-age=14` (Tage). Ersetzt `npm install --before=<Datum>`; `before` und `min-release-age` nicht gleichzeitig setzen. Ausnahme für ein einzelnes Sicherheitsupdate bewusst und dokumentiert (Befehl: Pilottest).
- 2.3 `npm ci` in Builds, `npm audit signatures` vor dem Deploy, `npm audit --omit=dev` ohne high/critical.
- 2.4 Renovate in jedem Repo mit gemeinsamem Preset (z. B. `f7or7an/renovate-config`): `config:best-practices`, `minimumReleaseAge: "14 days"`, Patch+Minor gruppiert, Sicherheitsupdates (Advisory) sofort, wöchentliche `lockFileMaintenance`, `docker:pinDigests`. Merge nur bei grünem CI (lint, typecheck, Tests, Build).
- 2.5 Keine Git- oder URL-Abhängigkeiten (npm 12 sperrt sie ohnehin).
- 2.6 Hintergrund in einem Satz: 2026 mehrere npm-Wurm-Wellen (Shai-Hulud), Lehren: Wartezeit, keine Install-Skripte, keine langlebigen Tokens; Provenance allein schützt nicht.

## 3. Gemeinsamer Layer (F: ja, jetzt; alles überall nachziehen)
- 3.1 `_bausteine/` wird ein Nuxt Layer im privaten Repo (Name z. B. `f7or7an/nuxt-base`, Paket `@f7or7an/nuxt-base`), veröffentlicht als privates npm-Paket über GitHub Packages (nicht als Git-Abhängigkeit, da npm 12 Git sperrt und die Nuxt-Doku npm-Pakete empfiehlt [nuxt.com/docs/4.x/guide/going-further/layers]). Projekte: `extends: ['@f7or7an/nuxt-base']`, Version fest, Updates per Renovate.
- 3.2 Inhalt (Startumfang): SiteSkipLink, a11y.css, PlaceholderNote, ContactForm-Grundlage mit Honeypot/Mindestzeit, `server/utils/security.ts` (Rate-Limit, Honeypot, Client-IP), CSRF-Middleware, Health-Route-Muster, eslint-Basis, ggf. Renovate-/Tsconfig-Vorgaben. Nur was in ≥ 2 Projekten gleich gebraucht wird.
- 3.3 Layer-Regeln: Was der Layer importiert, steht in seinen `dependencies`; `package.json` mit `"main": "./nuxt.config.ts"`; im Layer keine `~/`/`@/`-Pfade, sondern relative Pfade oder `#layers/<name>`; Semver-Tags, Changelog, Conventional Commits.
- 3.4 Zugriff im Container-Build/CI auf das private Paket: Token nur als Build-Secret (nie im Image, nie in `.npmrc` im Repo). Genaues Verfahren beim Anlegen des Layers festlegen und in SERVER.md eintragen.
- 3.5 Bis der Layer steht, bleibt `_bausteine/` die Quelle; danach `_bausteine/` auflösen.

## 4. Architektur und Code (Code-Standards ergänzen)
- 4.1 Auto-Imports nur in `app/` nutzen; Server-Code importiert explizit aus `nuxt/server` (siehe 1.17).
- 4.2 `shared/`: automatisch importiert werden nur `shared/utils/` und `shared/types/`. Schemas in `shared/utils/schemas.ts` oder explizit per `#shared/…` importieren.
- 4.3 Datenladen: `useAsyncData` immer mit eigenem, eindeutigem Schlüssel; gleicher Schlüssel = geteilte Daten, dann müssen Optionen gleich sein. Payload mit `pick`/`transform` klein halten; Nuxt 4.6 warnt ab 100 kB; `serialize: false` wo sinnvoll. In `useAsyncData` keine Store-Aktionen, dafür `callOnce`. `data` ist `shallowRef`, Standard `undefined`.
- 4.4 Validierung: `readValidatedBody(event, schema)` / `getValidatedQuery(event, schema)` mit dem zod-Schema direkt; Fehler 400 automatisch. Zod-Fehlertexte lokalisiert (`z.config(z.locales.de())` bzw. Sprache).
- 4.5 State: `useState`; Pinia (v4, ESM) nur bei echter Komplexität; Pinia Colada optional für Client-Query-Caching in Modus C.
- 4.6 Conventional Commits (`feat:`, `fix:`, `chore(deps):` …), kein commitlint nötig; für den Layer Pflicht.

## 5. Sicherheit (Server, Login, Header)
- 5.1 nuxt-auth-utils ≥ 0.6: Secret ist `NUXT_APP_SECRET` (≥ 32 Zeichen, z. B. `openssl rand -base64 32`), `NUXT_SESSION_PASSWORD` wird ignoriert → aus allen `.env`/`.env.example`/SERVER.md entfernen. Cookie heißt `nuxt-auth-session`; `maxAge` zählt ab letztem Schreiben; Update meldet alle Nutzer einmal ab. [github.com/atinux/nuxt-auth-utils README „Migrate from v0.5“]
- 5.2 Login-Härtung: Passwörter mit `hashPassword` (scrypt) + `passwordNeedsRehash`; `replaceUserSession` beim Login und bei jedem Rollenwechsel; `sessionVersion` pro Nutzer in der DB, die jede API prüft (Abmelden überall, Sperre wirkt sofort); Rate-Limit pro IP und pro Konto; Admin- und Fachkonten mit sensiblen Daten (z. B. Therapeutin) mit Passkey (WebAuthn, eingebaut) oder zweitem Faktor. Keine offene Registrierung (bleibt).
- 5.3 CSRF: Server-Middleware für alle nicht-GET/HEAD-Anfragen an `/api/**`: `Sec-Fetch-Site: cross-site` ablehnen, sonst `Origin` gegen eigene Domain prüfen; keine zustandsändernden GET [OWASP CSRF Cheat Sheet]. SameSite nur zusätzliche Schicht. (Baustein im Layer.)
- 5.4 F: CSP über `nuxt-security` nur für `contentSecurityPolicy` (Nonce bei SSR, Hash bei prerenderten Seiten, `'strict-dynamic'`, kein `'unsafe-inline'` in `script-src`); alle anderen Header und Features von nuxt-security aus; feste Header bleiben in Caddy (eine Quelle). Neue CSP zuerst als Report-Only. Modus A: CSP als Meta-Tag, `frame-ancestors` bleibt in Caddy. (Konfiguration: Pilottest.)
- 5.5 Eingaben: jedes zod-Schema mit `.max()` für Strings und Arrays; Body-Größe in Caddy `request_body { max_size 1MB }` (Uploads pro Route mehr). Uploads: MIME per Magic Bytes, eigener Dateiname, nie unter `public/`, nie als `/_ipx`-Quelle.
- 5.6 SQL: nur Platzhalter/Prepared Statements bzw. Drizzle-Query-API; `sql.raw` und Template-Strings mit Nutzereingaben verboten.
- 5.7 Fehler: DB-/Upstream-Fehler im Server abfangen, nur `createError({ status, message })` mit allgemeiner deutscher Meldung. Client-Sourcemaps in Produktion aus (Nuxt-Standard: server true, client false – so lassen). `devtools` aus (bleibt).
- 5.8 Dev-Server nie mit `--host`/`0.0.0.0` starten (Vite-/Nuxt-Dev-Advisories 2026).
- 5.9 `/_ipx` nur mit eigenen Bildern, nie mit Uploads oder fremden Domains; wo keine Bildbearbeitung zur Laufzeit nötig ist, Bilder beim Build erzeugen.
- 5.10 Verschlüsselung sensibler Daten: AES-256-GCM, zufälliger 12-Byte-IV pro Datensatz, Tabelle+ID als AAD, Schlüsselversion als Präfix (`v1:`) für Rotation; `NUXT_DATA_KEY` nie aus `NUXT_APP_SECRET` ableiten.
- 5.11 Logging: keine Formularinhalte, E-Mail-Adressen, Tokens oder vollen IPs in App-Logs; JSON auf stdout.
- 5.12 OWASP Top 10:2025 als Bezugsrahmen (neu: A03 Supply Chain, A10 Exceptional Conditions).
- 5.13 Rate-Limit hinter Caddy: „letzter Eintrag in X-Forwarded-For“ bleibt richtig (Caddy ignoriert eingehendes XFF ohne `trusted_proxies`). Bei CDN davor `trusted_proxies` setzen und Regel anpassen. Seit Nuxt 4.6.4 wird `x-forwarded-proto` nur vertraut, wenn eingeschaltet → hinter Caddy prüfen/konfigurieren (Pilottest bzw. beim Deployment).

## 6. Performance
- 6.1 Render: öffentliche Seiten `prerender: true`; `swr: <Sekunden>` nur für öffentliche Seiten mit Laufzeitdaten (z. B. Event-Listen), nie bei Login/Session; `isr` bringt auf node-server nichts gegenüber `swr`. Seit 4.6.4 cachen cache/swr/isr nur GET/HEAD und überspringen `Set-Cookie`/`private`/`no-store`.
- 6.2 Payload: `experimental.payloadExtraction: 'client'` (Standard ab compat 5) erwägen; Budget Payload < 50 kB (Einschätzung).
- 6.3 Lazy Hydration: statische Abschnitte unterhalb des sichtbaren Bereichs `<LazyX hydrate-on-visible>` bzw. `hydrate-never`; Islands/`.server.vue` nur bei schweren Abhängigkeiten; `noScripts` nur für Seiten ohne jede Interaktion.
- 6.4 Bilder: LCP-Bild mit `:preload="{ fetchPriority: 'high' }"`, nie `loading="lazy"`, höchstens eines pro Seite; alle anderen `loading="lazy"`, immer `width`/`height`; große Fotos `<NuxtPicture format="avif,webp">`; LCP-Bild ≤ 200 KB. `sizes`: Regel „nur Breakpoint-Keys“ prüfen – Doku erlaubt Standardwert ohne Präfix (`100vw sm:50vw`). In Modus B/C Bilder für vorgerenderte Seiten möglichst beim Build.
- 6.5 F: Schriften: Paket `@fontsource-variable/<name>`, eingebunden über `@nuxt/fonts` mit `fonts: { provider: 'npm' }` (schaltet Remote-Provider ab, Preload + Fallback-Metriken gegen CLS); `subsets` auf genutzte Schriftsysteme begrenzen (z. B. latin, latin-ext, cyrillic). Build offline testen. (Konfiguration: Pilottest.) Ortrud: nur Provider umstellen. SERVER.md Schritt 3 anpassen.
- 6.6 Bundle: `npx nuxt analyze` vor dem ersten Livegang und nach neuen Abhängigkeiten; Budget Start-JS ≤ 150 kB gzip für Info-Seiten (Einschätzung).
- 6.7 NuxtLink-Prefetch: bei Seiten mit sehr vielen Links global `prefetchOn: { interaction: true }` (über `experimental.defaults.nuxtLink`).
- 6.8 View Transitions: `experimental.viewTransition: true`, nie `'always'` (sonst kein reduced-motion).
- 6.9 Kompression: Modus A `nitro.compressPublicAssets: { gzip: true, brotli: true }` + Caddy `file_server { precompressed br zstd gzip }`; Caddy `encode zstd gzip` für dynamische Antworten. HTTP/3 ist Caddy-Standard.
- 6.10 Nitro-Cache: `defineCachedEventHandler` nur für öffentliche, teure Abfragen, immer mit explizitem `maxAge` (Standard 1 s); Treiber `memory` reicht bei einem Container.
- 6.11 SQLite: WAL, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout`, `PRAGMA optimize` beim Schließen bzw. regelmäßig.
- 6.12 Qualität vor Deployment, neuer Punkt „Performance“: Lighthouse mobil bzw. `browser_performance` auf jeder Seitenvorlage. Labor-Budget: LCP ≤ 2,0 s, CLS ≤ 0,05, TBT ≤ 200 ms, Score ≥ 90; Feldziel CWV „gut“: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 (75. Perzentil) [web.dev]. Kein RUM (eigener Endpunkt wäre rechtlich zu prüfen).

## 7. SEO, i18n, Inhalte, Formulare, Datenschutz
- 7.1 F: SEO-Module: mehrsprachige Projekte `@nuxtjs/sitemap` + `@nuxtjs/robots` (erzeugen hreflang-Alternativen aus i18n); einsprachige Mini-Seiten dürfen eigene Routen behalten. Nicht das Bündel `@nuxtjs/seo`. Engines der Module prüfen (Node ≥ 24.15).
- 7.2 og:image als statische Datei in `public/` (1200×630) pro Projekt; nuxt-og-image höchstens mit lokalem Font-Provider.
- 7.3 Strukturierte Daten (JSON-LD, passend zum sichtbaren Text): Organization bzw. LocalBusiness, Event (Gora), Person/ProfilePage (Ortrud), BreadcrumbList bei tiefer Navigation. Kein FAQPage mehr (Rich Results seit 07.05.2026 abgeschafft). Per `useHead` oder `nuxt-schema-org`.
- 7.4 KI-Suche: kein llms.txt-Pflichtbaustein (Google: keine speziellen Dateien nötig, 05/2026). Pro Projekt entscheiden und in README festhalten, ob KI-Trainings-Crawler (GPTBot, Google-Extended, ClaudeBot …) in robots.txt gesperrt werden.
- 7.5 i18n 10.6: jede Locale mit `language` (BCP-47, z. B. `de-DE`); `useLocaleHead()` im Layout (Canonical, hreflang, x-default); übersetzte Slugs per `definePageMeta({ i18n: { paths } })` + `customRoutes: 'meta'` (`defineI18nRoute` veraltet); keine `lazy`-Option (immer an); `baseUrl` als String.
- 7.6 Redaktionsinhalte: wenige feste Inhalte → TS in `app/data/`; Blog/Langtexte über Git → Nuxt Content v3 mit `experimental.sqliteConnector: 'native'`, Seiten vorgerendert (vor erstem Einsatz testen); Kundin pflegt selbst → eigenes Admin mit Drizzle.
- 7.7 Formularschutz: Honeypot `website` + signierte Mindestzeit (≥ 3 s, Token mit Ablauf) + Rate-Limit; ALTCHA nur bei echtem Spam und nur selbst gehostet (eigene Nitro-Route).
- 7.8 Newsletter: Double-Opt-in Pflicht; Bestätigungslink läuft nach 48 h ab; unbestätigte Einträge nach 30 Tagen löschen; Zeitpunkte Anmeldung/Bestätigung als Nachweis; Abmeldelink in jeder Mail + `List-Unsubscribe`/`List-Unsubscribe-Post`.
- 7.9 Relaunch: jede alte URL per 301/308 auf ihr passendstes Ziel (nie pauschal Startseite), Tabelle in `shared/redirects.ts`, Weiterleitungen mindestens 1 Jahr, Ketten ≤ 3, gelöschte Inhalte 410; nach Livegang Search Console und 404-Logs prüfen.
- 7.10 Kontakt: E-Mail sichtbar als `mailto:` plus Formular; keine JS-Verschleierung.
- 7.11 F: Grundsatz 3 – „Nur Sitzung“ (21.11.2026): Kein Tracking, keine Cookies und kein Web-Storage außer technisch nötigen. Ohne Einwilligung erlaubt: Login-Sitzungscookie; Farbmodus als nicht identifizierender Einzelwert (z. B. `dark`) nur nach aktiver Wahl und nur für die Sitzung (`sessionStorage` bzw. Sitzungscookie). Ohne Wahl nur `prefers-color-scheme` auswerten, nichts speichern, keine Client-Hints (`Sec-CH-Prefers-Color-Scheme`) anfordern. Sprache nur über die URL (i18n `prefix_except_default`, `detectBrowserLanguage: false`, kein `i18n_redirected`-Cookie). Keine IDs, Zeitstempel, Fingerprinting, kein Drittzugriff. Jede Speicherung in der Datenschutzerklärung (Satz: „Wenn Sie den Farbmodus selbst wählen, speichern wir nur diese Einstellung (z. B. „dark“) im Sitzungsspeicher Ihres Browsers; er wird beim Schließen gelöscht, enthält keine Kennung und wird nicht übertragen. Rechtsgrundlage § 25 Abs. 2 Nr. 2 TDDDG (BG: чл. 4а Abs. 4 Nr. 2 ЗЕТ).“). Konsequenz: `@nuxtjs/color-mode` auf sessionStorage umstellen (`storage: 'sessionStorage'`, prüfen) und prüfen, dass ohne Klick nichts geschrieben wird. Quellen: DSK-OH Digitale Dienste v1.2 Rn. 21, 74/76, 79–81, 95; WP194 Abschn. 3.6; EDPB Guidelines 2/2023 Rn. 43–44. Keine Rechtsberatung.
- 7.12 Zugriffslogs (Caddy): aus, oder nur mit gekürzter IP (`ip_mask` für `remote_ip` und `client_ip`: IPv4 /16, IPv6 /32; Header `X-Forwarded-For` im Log löschen) und Löschung nach höchstens 7 Tagen. Keine gesetzliche Höchstdauer; 7 Tage stammen aus TK-Praxis (BGH III ZR 146/10, BfDI-Leitfaden) und gelten als sicher bis vertretbar. Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO (IT-Sicherheit), Frist und Zweck in der Datenschutzerklärung.

## 8. Tests und Qualität
- 8.1 `vitest.config.ts` mit Projekten `unit` (environment node), `nuxt` (`defineVitestProject`), `e2e`; Playwright über `@nuxt/test-utils/playwright`.
- 8.2 Modus B: Vitest für `server/utils` + E2E-Rauchtest, der jede API-Route und jedes Formular einmal aufruft. Modus C: zusätzlich Playwright für Login und Hauptabläufe.
- 8.3 Vor jedem Commit lint, typecheck, Tests grün (bleibt); im CI erzwungen (siehe 9.3).

## 9. Betrieb, Deployment (SERVER.md)
- 9.1 Neuer Webserver mit Ubuntu 26.04 LTS (Upgrade-Pfad seit 29.09.2026 frei; Docker unterstützt 26.04). Docker Engine 29 (containerd-Image-Store Standard).
- 9.2 Docker umgeht ufw (DNAT vor ufw) → nur der Caddy-Stack veröffentlicht Ports; kein anderer Stack setzt `ports:`, auch nicht zum Testen; Debug-Ports nur `127.0.0.1:<port>:3000`. [docs.docker.com/network/packet-filtering-firewalls]
- 9.3 F: Images baut GitHub Actions: lint, typecheck, Tests, Build, `docker/build-push-action` → `ghcr.io/f7or7an/<name>:<git-sha>` (privat; Provenance standardmäßig, `sbom: true` optional); Image-Scan (Trivy oder Docker Scout) ohne high/critical. Komodo zieht nur das Image, der Server baut nichts. Rückweg: vorigen SHA-Tag deployen (ersetzt `:prev`-Taggen).
- 9.4 Netze: Jeder App-Stack bekommt ein eigenes Netz `<name>-proxy`, Caddy hängt in allen; kein gemeinsames Netz `web` mehr (Alias-Kapern, Analyse 21.11.2026). Bestehende Regel zu internen Netzen mit festen Adressen bleibt.
- 9.5 Dockerfile-Vorlage: Multi-Stage, Build-Stage mit npm 12 und `npm ci`, Laufzeit `node:26-slim`, nur `.output`, User `node`, `CMD ["node", ".output/server/index.mjs"]` in Exec-Form (nie `npm start`), `HEALTHCHECK` per `node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"` (slim hat kein curl/wget).
- 9.6 compose.yml-Vorlage: `restart: unless-stopped`, `init: true`, `stop_grace_period: 35s` (Nitro wartet bis 30 s, `NITRO_SHUTDOWN_TIMEOUT`), `read_only: true` + `tmpfs: [/tmp]`, `cap_drop: [ALL]`, `security_opt: ["no-new-privileges:true"]`, `mem_limit`, `cpus`, `pids_limit`, Logging-Limits; kein `docker.sock` im Container.
- 9.7 Caddy: Image auf Minor pinnen (`caddy:2.11-alpine` o. ä., per Renovate); `lb_try_duration 10s` beim reverse_proxy (statt 502 während Neustart); Zugriffslog nur mit `filter` und `ip_mask 16 32` (Frist siehe 7.12); `request_body { max_size 1MB }`.
- 9.8 Security-Snippet: HSTS `max-age=63072000; includeSubDomains`; `Cross-Origin-Opener-Policy "same-origin"`; `Cross-Origin-Resource-Policy "same-site"`; X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options bleiben; CSP nicht mehr global im Snippet, sondern aus der App (5.4) bzw. für Modus A als Meta-Tag; `frame-ancestors 'none'` als Header bleibt.
- 9.9 Praxisraum braucht eigenes Snippet: `Permissions-Policy camera=(self), microphone=(self)` (ggf. `display-capture=(self)`), CSP `connect-src` mit den `wss:`-Adressen von LiveKit und Hocuspocus.
- 9.10 Caching Modus A: `/_nuxt/*` immutable 1 Jahr AUSSER `/_nuxt/builds/latest.json` (no-cache, sonst erkennt Nuxt keine neuen Deploys); HTML `no-cache`. In B/C liefert Nitro `/_nuxt` selbst korrekt aus, keine eigene Regel.
- 9.11 Migrationen: Drizzle-Migration beim App-Start in einem Nitro-Plugin, bei Fehler Prozess beenden; vorher SQLite-Snapshot (Deploy-Schritt). Eine Instanz → keine Race-Condition.
- 9.12 Staging: keine echten Personendaten (Art. 9 DSGVO), nur anonymisierte.
- 9.13 Backups: Snapshot per `sqlite3` auf dem Host (`apt install sqlite3`, `.backup`) oder `backup()` aus `node:sqlite`; restic mit `forget --prune`, wöchentlich `restic check --read-data-subset=5%`; jeder Lauf meldet Erfolg an einen Push-Monitor in Uptime Kuma (fehlende Meldung = Alarm); Restore-Test im Quartal mit Datum in SERVER.md; Litestream (v0.5) optional für Modus C bei Bedarf.
- 9.14 Schlüsselliste §2.7: `NUXT_APP_SECRET` statt `NUXT_SESSION_PASSWORD`, dazu restic-Passwort, `NUXT_DATA_KEY`, SMTP, GHCR-/Layer-Token.
- 9.15 AVV mit VPS-Anbieter und Backup-Ziel vor dem ersten Personendatum (Hetzner: accounts.hetzner.com/account/dpa, nicht automatisch; netcup: CCP → Stammdaten → Auftragsverarbeitung). In Umzugsplan Schritt 0.
- 9.16 Komodo: Version der vorhandenen Instanz notieren; auf v2 (aktuell 2.3.x) heben; Periphery mit ausgehender Verbindung (kein offener Port auf dem Webserver), Schlüsselpaare; Images `:2`-Tags.
- 9.17 Updates: Renovate (Repos und Image-Digests), wöchentlicher Image-Neubau für Basis-Image-Patches; Docker-Pakete bewusst aktualisieren (unattended-upgrades deckt nur Ubuntu-Security ab – ungeprüft).
- 9.18 Logging Server: json-file 10m×3 bleibt; App-Logs ohne personenbezogene Daten; Aufbewahrung begrenzen und in Datenschutzerklärung nennen.
- 9.19 Fehler-Tracking optional: Bugsink (ein Container, Sentry-SDKs) mit `sendDefaultPii: false`, ohne Session Replay; Sentry self-hosted zu groß.
- 9.20 Monitoring: Uptime Kuma bleibt (Gatus Alternative); Push-Monitore für Backups; zweiter Benachrichtigungsweg zusätzlich zur dogado-Mail.
- 9.21 Mail: einmal prüfen, ob dogado DKIM signiert und DMARC existiert; Reihenfolge SPF → DKIM → DMARC (`p=none` zuerst). „MX/SPF/DKIM nicht anfassen“ bleibt für Umzüge.
- 9.22 Geheimnisse: `.env` chmod 600 oder Komodo bleibt; sops/age nur, falls `.env` ins Git sollen.
- 9.23 Härtung: fail2ban für SSH bleibt; CrowdSec nicht nötig.
- 9.24 Zero-Downtime: nicht nötig; `lb_try_duration` überbrückt Neustarts; `container_name` bleibt.
- 9.25 Stand-Angaben in SERVER.md aktualisieren (Lokal: Node 26 nach Update; Pfad `C:\Users\flori\Documents\FlowTech\WebSites` korrigieren, dort steht noch `Documents\WebSites`).

## 10. Barrierefreiheit (bestehend, nur Ergänzungen)
- 10.1 Bestehender Abschnitt bleibt inhaltlich vollständig erhalten (Rechtsrahmen, Pflichtseite, Mindestanforderungen, Prüfablauf), wandert aber größtenteils in `.claude/rules/barrierefreiheit.md`; im Kern bleiben Grundsatz 6, Kurzfassung Rechtsrahmen und Verweis.
- 10.2 `@nuxt/a11y` (Alpha) und `@nuxt/hints` nur als Dev-Hilfe.
- 10.3 Erkenntnisse vom 18.11.2026 als Prüfhinweise: falsche Alarme des Checkers (Reka-Modal aria-hidden, `aria-hidden`+`tabindex=-1`, v-reveal bei opacity 0, Messung während Animation); Silbentrennung braucht `lang` und greift nicht in `inline-flex`; 320-px-Messung per iframe/scrollWidth.

## 11. Ablauf der Umsetzung in den Projekten (für Phase 2, in Kern oder eigener Regel)
- 11.1 Jede Regeländerung wird in allen Projekten nachgezogen; STANDARDS-AUDIT.md je Projekt wird gegen die neuen Regeln neu erstellt bzw. ergänzt.
- 11.2 Arbeit in Agententeams mit Freigabe durch unabhängige Prüfer-Agenten; erst nach Freigabe gilt ein Punkt als erledigt.

## 12. Ergebnisse Pilottest 21.11.2026 (Kopie Vogelperspektive + FlowTech; Node 26.13.1, npm 12.2.2, Nuxt 4.6.4/Nitro 2.13.6/Vite 8.3.8/Vue 3.5.45/TS 6.0.3) – verbindlich für die Formulierungen
- 12.1 Node 26.13.1 bringt npm 11.20.0 mit → npm 12 separat installieren (`npm i -g npm@12`), Mindestversion npm ≥ 12.2.2. Typecheck und Build liefen mit Node 26 + npm 12 + Nuxt 4.6.4 fehlerfrei.
- 12.2 `.npmrc`: `min-release-age=14` wirkt (Fehler `notarget … with a date before …`). Sperre greift nur beim Neu-Auflösen; `npm ci` und bestehendes Lockfile laufen durch.
- 12.3 Sicherheitsupdate trotz Wartezeit: `npm install <pkg>@<exakte Version> --min-release-age-exclude=<pkg>`; ALLE neu benötigten Abhängigkeiten des Pakets ebenfalls ausnehmen (Beispiel Vite: `--min-release-age-exclude=rolldown --min-release-age-exclude="@rolldown/*"`). Ein ausgenommenes Paket ohne exakte Version geht auf die neueste Version → Zielversion exakt angeben. Dauerhaft möglich per `.npmrc` `min-release-age-exclude[]=<pkg>` (nur bewusst, mit Begründung, danach wieder entfernen).
- 12.4 Installationsskripte: `npm approve-scripts <pkg>` (Alias von `npm install-scripts approve <pkg>`), Ergebnis in package.json `"allowScripts": { "esbuild@0.28.2": true }` (versionsgepinnt; `--no-allow-scripts-pin` nur Name). `npm install-scripts ls` (offene), `deny`, `prune` (veraltete Einträge). Im Pilot wollte nur esbuild ein Skript ausführen; Build lief auch ohne Freigabe. Bei jedem Update `npm install-scripts ls` und `prune`.
- 12.5 `vite.vue.script.fs`-Notbehelf ist mit Nuxt 4.6.4 nicht nötig (Vogelperspektive ohne, FlowTech-Kopie ohne ihn mit TS 5.9.3 und 6.0.3 gebaut) → Stolperstein streichen, in FlowTech entfernen.
- 12.6 Schriften @nuxt/fonts 1.2.0 mit npm-Provider: Build offline verifiziert (null Netzzugriffe). Konfiguration:
  ```ts
  modules: ['@nuxt/fonts'],
  fonts: {
    provider: 'npm',
    npm: { remote: false },   // sonst Ausweichen auf cdn.jsdelivr.net möglich
    families: [{ name: 'Montserrat Variable', preload: true }],
  },
  ```
  Fallback-Metriken entstehen automatisch; Preload nur mit `preload: true` an der Familie. `subsets`/`weights`/`styles` in `defaults` werden bei `@fontsource-variable/*` ignoriert (Provider liest `index.css`: alle Subsets, nur aufrecht). Kursiv: zusätzlich `css: ['@fontsource-variable/<name>/wght-italic.css', …]` UND `features: { inlineStyles: false }` (sonst entfernt das Modul die Kursiv-Regeln). Schönheitsfehler: Fallback-Regeln doppelt.
- 12.7 CSP mit nuxt-security 2.7.0 funktioniert: prerenderte Seiten bekommen CSP im Header und als Meta mit sha256-Hashes der Inline-Skripte und SRI-Hashes; SSR-Seiten und ssr:false-Seiten Nonce. `sri` und `ssg` an lassen (ohne SRI greifen Hashes bei 'strict-dynamic' nicht). @nuxt/image setzt beim SSR `onerror` an `<img>` → `script-src-attr` braucht `'unsafe-hashes'` + Hash. Vor jedem Deployment Konsole auf CSP-Verstöße prüfen. Geprüfte Konfiguration:
  ```ts
  security: {
    headers: {
      contentSecurityPolicy: {
        'base-uri': ["'none'"], 'object-src': ["'none'"],
        'script-src': ["'self'", "'strict-dynamic'", "'nonce-{{nonce}}'"],
        'script-src-attr': ["'unsafe-hashes'", "'sha256-bwK6T5wZVTANitXbrTsel7kl/PyCjCd/Dq5Qoz3imjM='"], // onerror von @nuxt/image
        'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:'],
        'font-src': ["'self'"], 'form-action': ["'self'"], 'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': true,
      },
      crossOriginResourcePolicy: false, crossOriginOpenerPolicy: false, crossOriginEmbedderPolicy: false,
      originAgentCluster: false, referrerPolicy: false, strictTransportSecurity: false,
      xContentTypeOptions: false, xDNSPrefetchControl: false, xDownloadOptions: false,
      xFrameOptions: false, xPermittedCrossDomainPolicies: false, xXSSProtection: false, permissionsPolicy: false,
    },
    requestSizeLimiter: false, rateLimiter: false, xssValidator: false, corsHandler: false,
    allowedMethodsRestricter: false, hidePoweredBy: false, removeLoggers: false,
  },
  ```
  Hinweis: Der onerror-Hash hängt vom genauen Handler-Text ab; nach @nuxt/image-Updates prüfen (Konsole). Für Modus A (nuxt generate) gilt die Meta-CSP; `frame-ancestors` nur per Header (Caddy).
- 12.8 Projektbefund für Phase 2: FlowTech `package-lock.json` passt nicht zur package.json (`npm ci`: `Missing: @emnapi/core@1.11.3 from lock file`).

## 13. Entscheidungen nach Prüfrunde 1 (21.11.2026)
- 13.1 F: KEINE Port-Ausnahme auf dem Website-Webserver. Der Praxisraum (App + LiveKit) bekommt einen EIGENEN Server („Praxisraum-Server“) für Videotelefonie von Psychologinnen: großes Rechenzentrum in Deutschland, 1 Gbit/s Anbindung. In SERVER.md einplanen: eigener Abschnitt (Zweck, Anbindung, Größe grob, eigener Caddy oder Caddy im Stack, Ports dort: 80/443 + LiveKit-Medienports 7881/tcp, 7882/udp, 3478/udp bzw. laut LiveKit-Doku, ufw passend), AVV, Backups, Monitoring, Komodo. Auf dem Website-Webserver gilt „nur Caddy veröffentlicht Ports“ ausnahmslos. Die bisherige Verbindung Website ↔ Praxisraum über ein internes Docker-Netz mit festen Adressen geht über Servergrenzen nicht mehr: planen als verschlüsselte, authentifizierte Verbindung zwischen den Servern (Empfehlung: WireGuard-Tunnel, interne API nur auf der WireGuard-Schnittstelle bzw. per Firewall nur von der Gegenstelle erreichbar, zusätzlich Token/HMAC auf Anwendungsebene); Entscheidung Details beim Aufbau. Reservierte Netze-Tabelle entsprechend anpassen.
- 13.2 F: Apps mit Login: Einstellungen eingeloggter Nutzer liegen im Benutzerkonto auf dem Server (DB), nicht im Browser. Im Browser nur, was die vom Nutzer gewünschte Funktion in der laufenden Sitzung zwingend braucht (z. B. Gast-ID für die Sitzungsteilnahme) – in `sessionStorage`; jeder Eintrag steht in der Datenschutzerklärung. Websites bleiben bei 7.11 (nur Farbmodus pro Sitzung nach aktiver Wahl).
- 13.3 F: SERVER.md ins Meta-Repo: Login-Name des Bestandsservers durch Platzhalter ersetzen (steht im Passwortmanager); IP und Dienstnamen bleiben.
- 13.4 Folge aus Prüfung: `@nuxtjs/color-mode` 4.1.0 schreibt bei jedem Seitenaufruf `nuxt-color-mode=system` in den Speicher (plugin.client.js, `setPreferenceToStorage` in `onIdleAfterHydration`) → mit Grundsatz 3 unvereinbar. Regel: eigener kleiner Farbmodus-Umschalter (Composable im Layer): liest `prefers-color-scheme`, speichert nur nach Klick in `sessionStorage`, setzt Klasse `dark` am `<html>` (inline-Skript gegen Aufblitzen, CSP-Hash beachten). `@nuxtjs/color-mode` aus dem Stack streichen.
- 13.5 Rangfolge: Gemeinsame Regeln gelten. Ein Projekt darf nur begründet abweichen; jede Abweichung steht in einer Tabelle „Abweichungen“ in der Projekt-CLAUDE.md (Regel, Abweichung, Grund, von Florian bestätigt am). README verweist nur darauf. Projektdokumente (z. B. Gora AGENTS.md/docs) gehen nur vor, soweit dort eingetragen.
