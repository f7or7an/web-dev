# WebSites – gemeinsame Regeln für alle Projekte

Stand: 21.11.2026. Dieser **Kern** gilt für jedes Projekt unter `WebSites/` (`C:\Users\flori\Documents\FlowTech\WebSites`) und lädt in jeder Session.
Detailregeln: `WebSites/.claude/rules/` (Verzeichnis unten). Server und Deployment: `WebSites/SERVER.md` (vor jeder Server-Arbeit lesen).
Was nur ein Projekt betrifft, steht in dessen `CLAUDE.md` und `README.md`.

**Rangfolge:** Die gemeinsamen Regeln gelten. Ein Projekt weicht nur begründet ab, und jede Abweichung steht in der Tabelle „Abweichungen“ der Projekt-`CLAUDE.md` (Regel, Abweichung, Grund, von Florian bestätigt am). Unbestätigte Abweichungen sind Punkte in `STANDARDS-AUDIT.md`. Die README verweist nur darauf.
Projektdokumente (z. B. Goras `AGENTS.md` und `docs/`) gehen nur vor, soweit es dort eingetragen ist.

## Projekte

| Ordner | Domain | Modus | Heute | Ziel |
|---|---|---|---|---|
| `FlowTech/website` | flow-tech.org (+ zweite Domain im Ordner `flwtchde`) | A statisch, i18n de/en/bg | live auf dogado web250 | bleibt statisch, später auf eigenem Webserver |
| `Vogelperspektive/webapp/Vogelperspektive` | vogelperspektive-psychologin.de | B: Formulare, Newsletter, Rabatt-Anträge, Terminbuchung, Admin, SQLite | neue App fertig, wartet auf Server. Alte Webflow+PHP-Seite noch live auf dogado web116 | Container auf eigenem Webserver |
| `Vogelperspektive/webapp/Vogelperspektive-Praxisraum` | app.vogelperspektive-psychologin.de (geplant) | C: Online-Sitzungsraum (Video über eigenes LiveKit, 3D-Systembrett, Journal, Klient:innen), Drizzle, Yjs/Hocuspocus | Prototyp lokal fertig und getestet, wartet auf Gespräch mit Jara und eigenen Server | App + LiveKit auf eigenem **Praxisraum-Server** (RZ in Deutschland), Komodo |
| `Ortrud` | kuteifan.de | A statisch + `kontakt.php` | noch nicht live, Hoster unbekannt | Formular als Nitro-Route → B |
| `Gora Ozosnanie/webapp` | goraosaznanie.com | C: 8 Sprachen, Login, Rollen, Planung, Events, Anmeldung, Drizzle | Relaunch auf Branch `relaunch`. Staging auf ChatGPT Sites (Cloudflare Worker + D1). Alte Seite bei SiteGround, DNS bei Wix. Repo `f7or7an/gora-osaznanie` | Container auf eigenem Webserver (Node-Build) |

## Grundsätze

1. **Keine fremden Dienste zur Laufzeit.** Schriften, Bilder, Skripte, Styles, Icons kommen vom eigenen Server. Kein Google Fonts, kein CDN, kein Analytics, kein Formular-Dienst, keine Icon-API. Ausnahmen nur in der Tabelle „Abweichungen“ der Projekt-`CLAUDE.md` und in der Datenschutzerklärung. Heute: keine (Gora: Vimeo am 10.11.2026 durch Foto ersetzt; Vogelperspektive bucht seit 08.11.2026 selbst statt über Calendly).
2. **Kein PHP, kein WordPress.** Serverlogik läuft als Nitro-Route in Nuxt. `Ortrud/public/kontakt.php` ist Altlast und wird ersetzt.
3. **Nur Sitzung:** Kein Tracking, keine Cookies, kein Web-Storage außer technisch nötigen. Websites: Login-Sitzungscookie; Farbmodus nur nach aktiver Wahl und nur für die Sitzung (`sessionStorage`), ohne Wahl nur `prefers-color-scheme`. Sprache nur über die URL. Keine IDs, kein Fingerprinting, darum kein Cookie-Banner.
   **Apps mit Login:** Einstellungen liegen im Benutzerkonto (DB), nicht im Browser. Im Browser nur, was die gewünschte Funktion in der laufenden Sitzung zwingend braucht (z. B. Gast-ID), in `sessionStorage`. Jeder Eintrag steht in der Datenschutzerklärung. Details: `formulare-und-datenschutz.md`.
4. **Sprache:** Oberflächen- und Nutzertexte auf Deutsch (Standardsprache; Ausnahme Gora: Bulgarisch). Code-Bezeichner Englisch, Kommentare Deutsch.
5. **Rechtliches:** Impressum, Datenschutzerklärung und (im BFSG-Bereich) Erklärung zur Barrierefreiheit vor jedem Livegang. Fehlende Inhalte als Platzhalter markieren und per Schalter ausblenden (Muster `showPlaceholders` in `Ortrud/nuxt.config.ts`).
6. **Barrierefrei ab der ersten Zeile:** jedes Projekt **WCAG 2.2 Stufe AA**, egal ob das Gesetz es verlangt. Beim Bauen berücksichtigen, nicht nachrüsten.
7. **Aus Bausteinen bauen:** wiederverwendbare Komponenten in festen Ebenen (`ui/` → `site/`, `section/` → Fachbereich → `pages/`), typisiert, kein `any`. Details: `vue-und-komponenten.md`.

## Barrierefreiheit kurz

- **Recht:** European Accessibility Act (RL (EU) 2019/882), in DE als BFSG/BFSGV, in BG als Закон за изискванията за достъпност (ДВ бр. 31/2025), gilt seit 28.06.2025 für Online-Dienstleistungen an Verbraucher mit Vertragsschluss. Die Kleinstunternehmen-Ausnahme ist für uns **keine** Ausnahme von der Umsetzung.
- **Technik:** EN 301 549 V3.2.1 (WCAG 2.1) gilt, V4.1.1 (WCAG 2.2) folgt. Wir setzen immer **WCAG 2.2 AA** um, dann muss beim Wechsel nichts nachgebaut werden.
- **Einordnung:** Vogelperspektive, Praxisraum und Gora (sobald etwas kostet) im Anwendungsbereich → Seite `/barrierefreiheit` Pflicht. FlowTech (B2B) und Ortrud nicht, trotzdem AA. Rechtsfragen im Grenzfall an Florian.
- **Nie vergessen:** echte HTML-Elemente, ein `<h1>`, Skip-Link, Fokus immer sichtbar, Kontrast 4,5 : 1 (groß/Rahmen/Icons 3 : 1), alles per Tastatur, sichtbare `<label>`, Fehler als Text am Feld, Klickflächen ≥ 24 × 24 px, `prefers-reduced-motion`, 320 px ohne Querscrollen.
- Vollständige Regeln, Bausteine (`_bausteine/barrierefreiheit/`) und Prüfablauf: `barrierefreiheit.md`.

## Render-Modus wählen

| Modus | Wann | Nuxt | Hosting |
|---|---|---|---|
| **A – Statisch** | Info-Seite ohne Formular, Login, Datenbank | `nuxt generate` bzw. `nitro.preset: 'static'` → `.output/public` | dogado oder Caddy `file_server` |
| **B – Hybrid** (Standard) | sobald Formular, Mail, Login oder Daten nötig | `nitro.preset: 'node-server'`, öffentliche Seiten `prerender: true`, `/api/**` und `/admin/**` dynamisch | Container auf eigenem Webserver |
| **C – Webapp** | mehrere Nutzer, Rollen, viel Interaktion | wie B, dazu Drizzle-Migrationen und Pflicht-Tests | Container auf eigenem Server |

- Im Zweifel **B**. Ein Kontaktformular ist nie ein Grund für PHP, sondern für B. B und C laufen **nicht** auf dogado (CentOS 7, glibc 2.17, kein Node ≥ 18).
- `/admin/**`: `ssr: false`, `x-robots-tag: noindex, nofollow`, `cache-control: no-store`. `/api/**`: `no-store`. Vorlage `Vogelperspektive/webapp/Vogelperspektive/nuxt.config.ts`.
- `swr: <Sekunden>` nur für öffentliche Seiten mit Laufzeitdaten (z. B. Event-Listen), nie bei Login oder Sitzung. `isr` bringt auf `node-server` nichts. Details: `performance.md`.

## Stack (verbindlich, Stand 21.11.2026)

| Bereich | Standard | Hinweise |
|---|---|---|
| Framework | **Nuxt 4 ≥ 4.6.4** (zieht nitropack ≥ 2.13.6), Ordner `app/`, `server/`, `shared/` | 4.6.4 schließt 8 Nuxt- und 3 Nitro-Lücken, u. a. Middleware-Umgehung per `//` (GHSA-r99w-jh2x-3mg9). `compatibilityDate` setzen, `devtools` aus. Nuxt 3 seit 31.07.2026 ohne Support. Nuxt 5 vorbereiten: `server-und-sicherheit.md`. |
| Laufzeit | **Node 26 LTS** für alle Projekte | `.node-version` = `26`, `engines.node` = `">=26"`, lokal Node 26. Container `node:26-slim` (glibc), nicht Alpine (musl bei Node „Experimental“). Nuxt 4.6 verlangt `^22.22.3 \|\| ^24.15.0 \|\| >=26`; Node 24 ist bis 30.04.2028 in Maintenance. |
| Paketmanager | **npm ≥ 12.2.2** mit `package-lock.json` | Node 26 bringt npm 11 mit → `npm i -g npm@12`, auch im Docker-Build (dort exakt gepinnt). Builds mit `npm ci`. Siehe „Lieferkette“. |
| TypeScript | **`typescript@~6.0`**, niemals 7 | Mit TS 7 bricht `vue-tsc` ab (Begründung: `abhaengigkeiten-und-layer.md`). `typescript` und `vue-tsc` als devDependency. |
| Vue | **3.5** | 3.6 ist RC, Vapor nicht in Kundenprojekten. |
| Styling | **Tailwind CSS 4** über `@tailwindcss/vite`, keine `tailwind.config` | Farben als oklch-Variablen in `app/assets/css/main.css`, Markenfarben als eigene Tokens (`brand` …). `accent` ist die shadcn-Hover-Farbe, keine Markenfarbe. |
| UI | **shadcn-vue** (Reka UI) über `shadcn-nuxt` | `components.json`: style `new-york`, baseColor `neutral`, iconLibrary `lucide`, Komponenten in `app/components/ui/`, `prefix: ''`. Reka UI 3 (Alpha) erst mit shadcn-vue-Unterstützung. **Nuxt UI nicht Standard** (lädt Icons von api.iconify.design, bringt @nuxt/fonts, Tiptap, TanStack mit). |
| Icons | **`@lucide/vue`** | Nicht `lucide-vue-next`. |
| Schriften | **`@fontsource-variable/<name>`** (bzw. `@fontsource/<name>`) über **`@nuxt/fonts`** mit `provider: 'npm'`, `npm: { remote: false }` | Kein Remote-Provider (sonst Google bzw. jsdelivr). Preload und Fallback-Metriken gegen Layout-Sprünge. Konfiguration: `performance.md`. |
| Bilder | **`@nuxt/image` ≥ 2.2.1**, WebP/AVIF, LCP-Bild ≤ 200 KB | Originale nicht nach `public/`. `/_ipx` nur für eigene Bilder. Regeln: `performance.md`, Bildrechte: `seo-i18n-inhalte.md`. |
| Mehrsprachigkeit | **`@nuxtjs/i18n` 10.6**, `strategy: 'prefix_except_default'`, `defaultLocale: 'de'`, `detectBrowserLanguage: false`, `baseUrl` als String | Texte in `i18n/locales/<code>.json`, kuratiert. Details: `seo-i18n-inhalte.md`. |
| SEO | mehrsprachig: **`@nuxtjs/sitemap` + `@nuxtjs/robots`** | Nicht das Bündel `@nuxtjs/seo`. Einsprachige Mini-Seiten dürfen eigene Routen behalten. |
| Validierung | **zod ≥ 4.6.6** in `shared/utils/schemas.ts` | Dieselben Schemas im Browser und auf dem Server, jedes String/Array-Feld mit `.max()`. |
| Datenbank | **SQLite** über `node:sqlite` (WAL, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout`) | Datei unter `.data/`, im Container als Volume. **Drizzle ORM 0.45.x (≥ 0.45.2)** über `drizzle-orm/sqlite-proxy` + drizzle-kit, bis Drizzle 1.0 stabil ist. Schema `db/schema.ts`, Migrationen `drizzle/`, nur Struktur. Altbestand: Vogelperspektive nutzt db0 ohne Drizzle. |
| Login | **`nuxt-auth-utils` ≥ 0.6** (Kompatibilität mit Nuxt 4.6, kein Advisory) | Secret `NUXT_APP_SECRET`. Passwörter nur als Hash, keine offene Registrierung. Rollen in der DB, jede API prüft Freigabe und Rolle erneut (Muster Gora). |
| Mail | **nodemailer ≥ 10.1.4** über SMTP des eigenen Postfachs | Zugangsdaten nur per Env (`NUXT_SMTP_*`). |
| Formularschutz | Kontakt-, Newsletter-, Feedback-, Buchungs-, Anmelde- und Antragsformulare: **Honeypot `website` + Rate-Limit**, Soll: signierte Mindestzeit (≥ 3 s), sobald Layer-Baustein vorliegt | **Login** ohne Honeypot und Mindestzeit (Passwortmanager mit Auto-Absenden, WCAG 3.3.8), dafür Rate-Limit pro IP und pro Konto. Client-IP hinter Caddy = **letzter** Eintrag in `X-Forwarded-For`. |
| CSRF | Soll: Middleware prüft `Sec-Fetch-Site`/`Origin` bei allen nicht-GET an `/api/**` | Muster Praxisraum `server/middleware/origin.ts`, aber Anfragen ohne `Origin` → 403 außer begründeten Ausnahmen. |
| Sicherheitsheader | CSP aus der App über **`nuxt-security`** (nur `contentSecurityPolicy`), alle anderen Header in Caddy | Neue CSP zuerst Report-Only (`security.contentSecurityPolicyReportOnly: true` + `ssg: { meta: false }`, in Modus A nicht möglich). Konfiguration: `server-und-sicherheit.md`. |
| Dark Mode | nur wenn das Design es vorsieht: **eigener Umschalter** (Composable, im Layer sobald veröffentlicht) | Liest `prefers-color-scheme`, speichert nur nach Klick in `sessionStorage`, setzt `dark` am `<html>` (Inline-Skript gegen Aufblitzen, CSP-Hash). **Kein `@nuxtjs/color-mode`**: schreibt bei jedem Aufruf in den Speicher. |
| Lint und Tests | **ESLint 10** + `@nuxt/eslint` ≥ 1.17 (`stylistic: true`), **Vitest 5**, `@nuxt/test-utils` ≥ 4.4, Playwright | Kein Prettier, kein Biome. Tests in C Pflicht, in B für Server-Logik plus Rauchtest. Details: `tests-und-qualitaet.md`. |
| Gemeinsamer Layer | **`@f7or7an/nuxt-base`** (privates npm-Paket über GitHub Packages) per `extends`, **sobald veröffentlicht** | Bis dahin ist `_bausteine/` die Quelle (kopieren). Details: `abhaengigkeiten-und-layer.md`. |

**Mindestversionen** (Stand 21.11.2026) wegen Advisories: nuxt ≥ 4.6.4, @nuxt/image ≥ 2.2.1, vite ≥ 8.3.7, vue ≥ 3.5.42, drizzle-orm ≥ 0.45.2, zod ≥ 4.6.6, nodemailer ≥ 10.1.4; wegen Kompatibilität: nuxt-auth-utils ≥ 0.6.
Dauerhaft gilt: immer die aktuelle Patch-Version, und vor jedem Deployment `npm audit --omit=dev` ohne high/critical.

## Lieferkette (kurz)

2026 gab es mehrere npm-Wurm-Wellen (Shai-Hulud). Darum gilt in jedem Projekt:
- `.npmrc` mit `min-release-age=14`: Pakete erst nach 14 Tagen. Ersetzt `--before`, nie beides setzen. Sicherheitsupdate trotz Wartezeit nur bewusst per `--min-release-age-exclude` mit exakter Version.
- npm 12 führt Installationsskripte nur aus, wenn sie in `package.json` → `allowScripts` freigegeben sind (`npm approve-scripts <pkg>`). Freigaben committen, im CI `strict-allow-scripts=true`.
- Keine Git- oder URL-Abhängigkeiten. `npm audit signatures` vor dem Deploy.
- Renovate mit gemeinsamem Preset; die 14 Tage als `packageRule` (sonst gilt aus `config:best-practices` nur 3 Tage). Merge nur bei grünem CI.
- Ablauf „Paket hinzufügen oder aktualisieren“: `abhaengigkeiten-und-layer.md`.

## Projektstruktur (kurz)

```
app/           assets/css/main.css, components/{ui,site,section,<fachbereich>}/, composables/, layouts/,
               pages/, middleware/, plugins/, data/ (Inhalte als TS), lib/utils.ts
server/        api/<name>.<methode>.ts, api/health.get.ts, routes/ (robots, sitemap), utils/, plugins/
shared/        utils/schemas.ts, types/, Preise und Konstanten (eine Quelle für Browser und Server)
db/schema.ts + drizzle/   nur mit Datenbank      i18n/locales/   nur mehrsprachig
public/        favicon, apple-touch-icon, site.webmanifest, og-image (1200×630), Bilder (WebP)
scripts/       Hilfsskripte (z. B. admin:hash)
Dockerfile .dockerignore compose.yml   nur B/C, Compose ohne Proxy und ohne `ports:`; einzige Ausnahme: LiveKit-Medien-Ports auf dem Praxisraum-Server (SERVER.md)
CLAUDE.md README.md STANDARDS-AUDIT.md .env.example .node-version .npmrc renovate.json .github/workflows/
```

- Inhalte (Texte, Preise, Kontakt) gebündelt in `app/data/`, `shared/` oder i18n-Dateien. Footer: Impressum, Datenschutz, Barrierefreiheit.
- README enthält: Zweck, Befehle, alle Env-Variablen, Aufbau, Deployment, BFSG-Einordnung, bekannte Barrieren, offene Punkte.

## Arbeitsweise

- **Umfang:** In einem Projekt nur auf Auftrag arbeiten. Vorher Projekt-`CLAUDE.md` lesen. `README.md` und `STANDARDS-AUDIT.md` nicht komplett lesen (bis über 100 KB): Überblickstabelle lesen, dann per Suche die Punkte zum betroffenen Bereich bzw. zur Datei.
- **Audit-Punkte** in den angefassten Dateien mitbeheben, wenn sie risikoarm sind; Erledigtes abhaken (`[x]` mit Datum), neue Abweichungen ergänzen. Riskantes (Auth-Update, Migrationen, Node-Wechsel, Datenmodell) nie nebenbei, nur als eigener Auftrag.
- **Fehlt ein Skript** (`lint`, `typecheck`, Tests), wird es nicht nebenbei eingeführt, sondern ist ein Audit-Punkt.
- Vor Planung in einem Bereich die passende Regeldatei gezielt lesen. **Nuxt-Fragen** über den Nuxt-MCP-Server bzw. `nuxt docs "<frage>"` (Nuxt CLI v4) klären, nicht aus dem Gedächtnis.
- **Eigene Tests auf eigenem Port** (aus der Projekt-`CLAUDE.md`, sonst 3456). Port 3000 gehört Florians `npm run dev`. **Prozesse, die ich nicht selbst gestartet habe, nie beenden.** Dev-Server nie mit `--host`/`0.0.0.0` (`server-und-sicherheit.md`).
- **Commit und Push nur auf ausdrücklichen Wunsch.** Vor jedem Commit `npm run lint`, `npm run typecheck`, Tests grün.
- **Umsetzungsrunden** (z. B. Phase 2, nicht jede Session): Regeländerungen in allen Projekten nachziehen, `STANDARDS-AUDIT.md` gegen die neuen Regeln neu erstellen bzw. ergänzen. Arbeit in Agententeams; ein Punkt gilt erst nach Freigabe durch unabhängige Prüfer-Agenten als erledigt (`tests-und-qualitaet.md`).

## Qualität vor jedem Deployment (Kurzfassung)

Vollständige Checkliste: `tests-und-qualitaet.md`. Mindestens:
1. `npm run lint`, `npm run typecheck`, Tests, `npm run build` bzw. `generate` fehlerfrei (CI erzwingt das).
2. `npm audit --omit=dev` ohne high/critical, `npm audit signatures` ohne Fehler.
3. Browser: 1440 px und 390 px, ggf. Hell und Dunkel, nur Tastatur, keine Konsolenfehler und keine CSP-Verstöße, **kein Request an fremde Domains**.
4. Jedes Formular komplett durchspielen, auch den Fehlerfall.
5. Barrierefreiheit: automatisch 0 Verstöße A/AA, dazu Handprüfung und NVDA-Stichprobe (`barrierefreiheit.md`).
6. Performance: Lighthouse mobil bzw. `browser_performance` je Seitenvorlage im Budget (`performance.md`).
7. SEO-Grundausstattung und Weiterleitungen beim Relaunch (`seo-i18n-inhalte.md`).
8. Deployment nach `SERVER.md`: B/C als Image aus GitHub Actions (`ghcr.io/f7or7an/<name>:<git-sha>`), der Server baut nichts. A: `generate` und Upload.

## Git

- Jedes Projekt ist ein eigenes privates Repo bei GitHub (`f7or7an`). Vorhanden: Gora, `vogelperspektive`, `vogelperspektive-praxisraum`. FlowTech hat ein Repo ohne Commit, Ortrud keins → nachholen.
- **Meta-Repo** `f7or7an/websites` (lokal angelegt 21.11.2026; für Versionierung und Cloud-Sessions): nur `CLAUDE.md`, `SERVER.md`, `.claude/rules/`, `vorlagen/`, `_bausteine/`, `entscheidungen/` (Beschlusslisten mit Quellen). Projektordner per `.gitignore` ausgeschlossen.
- **Conventional Commits** (`feat:`, `fix:`, `chore(deps):` …), kein commitlint nötig. Für den Layer Pflicht.
- Nicht ins Repo: `node_modules`, `.nuxt`, `.output`, `dist`, `.data`, `*.sqlite*`, `.env*` (außer `.env.example`), Logs, Arbeitsdateien.
- Arbeitsdateien (Hilfsskripte, Screenshots, Build-Logs) gehören in den Scratchpad der Session, nicht in den Projektordner.

## Konfiguration und Geheimnisse

- Alles über `runtimeConfig` und `NUXT_*`-Variablen. Unter `public` nur, was der Browser sehen darf.
- `.env` nie committen und nie ins Image (`.dockerignore`). `.env.example` vollständig und kommentiert, Geheimnisse ohne Wert.
- Login-Secret ab nuxt-auth-utils 0.6: `NUXT_APP_SECRET` (≥ 32 Zeichen). `NUXT_SESSION_PASSWORD` erst **beim** Update auf 0.6 entfernen, im selben Schritt `NUXT_APP_SECRET` setzen, außerhalb der Hauptzeit (meldet alle ab). Nie vorher entfernen.
- Schlüssel erzeugen: `openssl rand -base64 32` oder `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- Geheimnisse nie in Chat, README, Memory, Commit-Nachrichten oder Logs. Tokens für private Pakete nur als Build-Secret, nie im Image oder in einer `.npmrc` im Repo.
- Sensible Daten (Gesundheit, Finanzen) verschlüsselt (AES-256-GCM, `NUXT_DATA_KEY`, nie aus `NUXT_APP_SECRET` abgeleitet) und mit Löschfristen. Schlüssel getrennt sichern. Details: `server-und-sicherheit.md`.

## Regeldateien (`WebSites/.claude/rules/`)

Ort: `C:\Users\flori\Documents\FlowTech\WebSites\.claude\rules\`. Jede Datei beginnt mit YAML-Frontmatter `paths:` (Globs relativ zu `WebSites/`, Liste mit `- "**/*.vue"`, LF-Zeilenenden) und lädt **automatisch**, sobald eine passende Datei gelesen oder geschrieben wird.
Ohne `paths` lädt sie beim Start, mit ungültigem YAML immer. Vor Planungsarbeit in einem Bereich die passende Datei **gezielt lesen**, auch wenn noch keine passende Datei offen ist.

| Datei | Lädt bei (Globs gekürzt, vollständig im Frontmatter) | Inhalt |
|---|---|---|
| `barrierefreiheit.md` | `*.vue`, `assets/css/`, `barrierefreiheit*`, `accessibility*`, `_bausteine/barrierefreiheit/` | EU-Recht, Einordnung, Pflichtseite, WCAG-2.2-AA-Mindestanforderungen, Prüfablauf, falsche Alarme |
| `vue-und-komponenten.md` | `*.vue`, `app/**/*.ts`, `shared/`, `components.json`, `assets/css/`, `tsconfig*.json` | Komponenten-Ebenen, Vue/TS-Regeln, tsconfig, Styling, Clean Code, `cn`-Import, Datenladen |
| `tests-und-qualitaet.md` | `tests/`, `*.test.ts`, `*.spec.ts`, Vitest-/Playwright-/ESLint-Konfiguration, `.github/workflows/`, `STANDARDS-AUDIT.md`, `scripts/integration/`, `scripts/test-*` | Lint, Vitest, Playwright, vollständige Deployment-Checkliste, Audit-Pflege, Freigabe-Ablauf |
| `server-und-sicherheit.md` | `server/`, `shared/`, `db/`, `drizzle/`, `drizzle.config.*`, `scripts/`, `nuxt.config.ts`, `.env*.example`, `middleware/` | `nuxt/server`, Nuxt 5, Login-Härtung, CSRF, CSP, Validierung, SQL, Fehler, Verschlüsselung, Logging, Rate-Limit, Mail |
| `abhaengigkeiten-und-layer.md` | `package.json`, `package-lock.json`, `.npmrc`, `renovate.json*`, `nuxt.config.ts`, `.node-version`, `_bausteine/` | npm 12, Wartezeit, Install-Skripte, Renovate, Paket- und Sicherheitsupdate, TS-Version, Nuxt Layer |
| `formulare-und-datenschutz.md` | `*Form*.vue`, `*Booking*`, `*Registration*`, `*Login*`, `*Mailing*`, `*Newsletter*`, `rabatt*`, `server/api/`, `shared/`, `*Placeholder*`, `*ColorMode*`, `*ColorScheme*`, `*Theme*`, `*Preferences*`, `*Storage*`, `datenschutz*`, `impressum*`, `cookies*`, `agb*`, `legal*`, `legal/`, `privacy*` | Formularschutz, Newsletter, Kontakt, „Nur Sitzung“ mit DSE-Text, Farbmodus-Umschalter, Platzhalter |
| `performance.md` | `nuxt.config.ts`, `*.vue`, `public/`, `assets/` | Render-Regeln, Payload, Lazy Hydration, Bilder, Schriften-Konfiguration, Budgets |
| `seo-i18n-inhalte.md` | `nuxt.config.ts`, `i18n/`, `pages/`, `layouts/`, `app.vue`, `server/routes/`, `content/`, `content.config.ts`, `app/data/`, `*redirects*`, `sources.json`, `*robots*`, `*sitemap*`, `*LanguageSwitch*` | SEO-Grundausstattung, i18n, JSON-LD, og:image, KI-Crawler, Redaktionsinhalte, Weiterleitungen, Bildrechte |
| `container-und-deployment.md` | `Dockerfile`, `.dockerignore`, `compose*.yml`, `deploy/`, `*.caddy`, `Caddyfile`, `*entrypoint*`, `server/api/health*` | Vorlagen Dockerfile, compose.yml, Healthcheck, Migrationen beim Start, Caddy-Datei je Projekt |
| `ci-workflow.md` | `.github/workflows/` | GitHub-Actions-Vorlage: prüfen, Image bauen, scannen, nach GHCR; Hinweis Modus A |

`WebSites/SERVER.md` lädt nicht automatisch: Webserver und Praxisraum-Server (Ist und Soll), Caddy, Backups, Monitoring, Umzugsplan. Vor jeder Server-Arbeit lesen.

## Projektdateien für Agenten

- Jedes Projekt hat eine eigene `CLAUDE.md` im Repo (≤ 60 Zeilen, Vorlage `WebSites/vorlagen/projekt-CLAUDE.md`): Zweck, Modus, Befehle, Test-Port, Besonderheiten, Abweichungen, Verweis auf README und `STANDARDS-AUDIT.md`.
- `AGENTS.md` wird nicht gelesen, sobald eine `CLAUDE.md` im Ordner oder darüber liegt. Gora: Sessions in `Gora Ozosnanie/webapp/` starten; die dortige `CLAUDE.md` beginnt mit `@AGENTS.md` (es gibt eine zweite `AGENTS.md` in `Gora Ozosnanie/`). Keine weiteren `AGENTS.md` anlegen.
- HTML-Kommentare auf Blockebene (`<!-- … -->`) werden vor dem Laden entfernt: gut für Hinweise an Menschen, Regeln nie in Kommentare schreiben.

## Bekannte Stolpersteine

- **TypeScript 7** → `vue-tsc` bricht ab (`ERR_PACKAGE_PATH_NOT_EXPORTED`). `typescript@~6.0` pinnen.
- **„No fs option provided to compileScript“** = der Vue-Compiler findet kein passendes `typescript` → `npm ls typescript`. Der alte Notbehelf `vite.vue.script.fs` ist seit Nuxt 4.6.4 unnötig und wird entfernt (FlowTech).
- **npm 12:** `notarget … with a date before …` heißt: Version jünger als 14 Tage, kein Tippfehler. `npm ci` mit bestehendem Lockfile ist nicht betroffen. Node 26 bringt npm 11 mit → npm 12 separat installieren.
- **nuxt-auth-utils 0.6:** Cookie heißt jetzt `nuxt-auth-session`, das Update meldet alle Nutzer einmal ab.
- **`shadcn-vue init`** braucht ein echtes Terminal → `components.json` und `app/lib/utils.ts` von Hand anlegen, dann `npx shadcn-vue@latest add <name>`.
- **shadcn `from "cn"`** ist seit 10/2026 gewollt (npm-Paket `cn`). Pro Projekt einheitlich: bestehende Projekte bleiben bei `@/lib/utils`, neue folgen dem shadcn-Standard; Festlegung in der Projekt-`CLAUDE.md`. Selektoren wie `data-open:` → Reka setzt `data-state`/`data-orientation`.
- **Windows:** `npm run generate` scheitert, wenn ein Terminal in `.output/public` steht. **Git Bash** macht aus `/` Windows-Pfade → `MSYS_NO_PATHCONV=1`.
- **i18n-JSON:** gerade `"` im Text beenden den String → typografische „…“ verwenden, Datei vor dem Build mit `JSON.parse` prüfen.
- **dogado:** Nach mehreren fehlgeschlagenen SSH-Logins sperrt Fail2Ban die IP für 30–60 Minuten. Nicht wiederholt probieren, immer `ssh -o BatchMode=yes` mit Key.
