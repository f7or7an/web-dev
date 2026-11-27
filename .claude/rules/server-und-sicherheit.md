---
paths:
  - "**/server/**"
  - "**/shared/**"
  - "**/db/**"
  - "**/drizzle/**"
  - "**/drizzle.config.*"
  - "**/scripts/**"
  - "**/nuxt.config.ts"
  - "**/.env.example"
  - "**/.env*.example"
  - "**/middleware/**"
---

# Server und Sicherheit

Stand: 21.11.2026, ergänzt 24., 25. und 27.11.2026 (Proxy des Webservers: Nginx Proxy Manager). Gilt für Modus B und C (Nitro-Server). Bezugsrahmen ist die **OWASP Top 10:2025** (neu dort: A03 Software Supply Chain Failures, A10 Mishandling of Exceptional Conditions).
Nicht hier: Pakete und Lieferkette (`abhaengigkeiten-und-layer.md`), Formular-Regeln, Browser-Speicher und Datenschutzerklärung (`formulare-und-datenschutz.md`), Dockerfile/Compose/Proxy-Beschreibung pro Projekt (`container-und-deployment.md`), Server-Betrieb (`SERVER.md`), Geheimnisse allgemein (Kern `CLAUDE.md`).
„Layer“ meint `@f7or7an/nuxt-base`, sobald veröffentlicht; bis dahin die genannte Projektvorlage bzw. `_bausteine/`.

## Server-Code allgemein

- **`nuxt/server` (geprüft am Code von Nuxt 4.6.4):** Wer Helfer aus `nuxt/server` nutzt (`readValidatedBody`, `getValidatedQuery`, `useSession`, `handleCors` …), definiert den Handler mit `defineEventHandler` **aus `nuxt/server`**. Sonst bekommt der Helfer ein h3-Event, und es kommt Fehler `NUXT_E8012`. Grund für die Regel: Nuxt 5 stellt darauf um.
  - Im Handler aus `nuxt/server` ist das Event ein `RequestEvent` (nur `req`, `url`, `res`, `context`). Dort erlaubt: Nitro-Bordmittel ohne Event (`defineNitroPlugin`, `useStorage`), eigene `server/utils` per Auto-Import, sofern sie `RequestEvent` annehmen, und Modul-Helfer, die `RequestEvent` annehmen (`nuxt-auth-utils` 0.6). Die Baustein-Fassung von `readForm` und `rateLimit` (`_bausteine/sicherheit/`) nimmt `RequestEvent`, gehört also in Handler mit `defineEventHandler` aus `nuxt/server`. Ältere Projekt-Utils mit `H3Event`-Parameter nur im h3-Handler verwenden, bis sie umgestellt sind.
  - h3-Helfer mit `H3Event` (`setResponseHeader`, `readMultipartFormData`, `sendStream` …) nur in Handlern mit dem auto-importierten h3-`defineEventHandler`, nie zusammen mit `nuxt/server`-Helfern. Auf Nuxt 4 läuft das zwar, aber der Typecheck meldet Fehler (README nuxt-auth-utils).
  - Ersatz im `nuxt/server`-Handler: Header über `event.res.headers.set()`, Formulardaten über `event.req.formData()`, Streams als `ReadableStream` zurückgeben.
  - `defineCachedEventHandler` umschließt einen h3-Handler: darin keine `nuxt/server`-Helfer.
- **Nuxt 5 vorbereiten:** Nuxt 5 ist noch nicht erschienen (Roadmap „Q4 2026 estimated“). Vor jedem Minor-Update einmal in einem Branch mit `future: { compatibilityVersion: 5 }` bauen und die Warnungen in der `STANDARDS-AUDIT.md` notieren.
- **Fehler:** `throw createError({ status, statusText, message })` statt `statusCode` (Nuxt 4.6 / Nuxt 5). `statusText` kurz auf Englisch in ASCII (h3 bereinigt es), die verständliche deutsche Meldung steht in `message`. DB- und Upstream-Fehler im Server abfangen und nie roh weitergeben (GHSA-96x6-fvhx-49hg: SSR-Fehlerdetails gingen an den Client).
- **Validierung:** `readValidatedBody(event, schema)` bzw. `getValidatedQuery(event, schema)` mit dem zod-Schema direkt, aber nur in der Fassung aus `nuxt/server` (h3 1.15 erwartet stattdessen eine Funktion `(b) => schema.parse(b)`). Ungültige Eingaben ergeben 400. Öffentliche Formulare nutzen `readForm` (Honeypot zuerst, siehe unten). Zod-Fehlertexte lokalisieren: `z.config(z.locales.de())` (bzw. Projektsprache), im Server und im Client, in `shared/zod.ts` zusammen mit `jitless` (CSP, siehe unten). `z` nur von dort importieren; die ESLint-Regel `no-restricted-imports` aus der README von `_bausteine/sicherheit/` erzwingt das. **Im Server zusätzlich das Plugin `server/plugins/zod-config.ts` (Pflicht):** Nitro verwirft beim Bündeln eine Datei, die `z` nur durchreicht, samt ihrem `z.config(…)`-Aufruf. Ohne das Plugin antwortet der gebaute Server englisch und ohne `jitless` (Fund Vogelperspektive, 24.11.2026). Prüfen im gebauten Server: Ein `.max()`-Verstoß ergibt den deutschen Text.
- **Grenzen in jedem Schema:** Jeder String und jedes Array bekommt `.max()`. Grund: Sonst füllt eine einzige Anfrage Speicher und Datenbank. Die Body-Größe begrenzt zusätzlich der Proxy (Soll 1 MB, Uploads pro Route mehr; das NPM-Image erlaubt global 2000 MB, Umsetzung mit 413-Test vor Live, `SERVER.md` 2.5).
- **Schemas** liegen in `shared/utils/schemas.ts` (automatisch importiert) oder werden per `#shared/…` importiert. Dieselben Schemas im Browser und auf dem Server.
- **Keine zustandsändernden GET-Routen.** Alles, was schreibt, löscht oder Mails verschickt, ist POST/PUT/PATCH/DELETE.
- **Logging:** keine Formularinhalte, E-Mail-Adressen, Tokens oder vollen IPs in App-Logs. Ausgabe als JSON auf stdout (Docker sammelt es). Grund: Logs sind Personendaten mit eigener Frist.
- **Fehlerlog (Pflicht in B/C):** Baustein `request-error-log` aus `_bausteine/sicherheit/` (Nitro-Hook `error`, im Layer enthalten). Grund: Nitros Standard schreibt bei Serverfehlern die volle URL (Tokens im Pfad, E-Mail in der Query) und den Stacktrace als Text (Fund Vogelperspektive, 24.11.2026). Der Baustein schreibt eine JSON-Zeile ohne URL mit Token: das Routenmuster, bei Catch-all den Pfad ohne Query mit maskierten Parametern. Den Stack schreibt er nur als Frames ohne die Meldung (höchstens 10), die Meldung nur im Dev-Modus. Die Antwort bleibt unverändert. Abgesichert durch den Build-Test `npm run test:build` (Vergleichsbuild ohne Baustein, auch im CI, `ci-workflow.md`). Übernahme: README des Bausteins, Schritt 11.
- **Tokens in URLs** (Bestätigungs-, Abmelde-, Termin-, Einladungslinks): mindestens 16 Zufallsbytes (`crypto.getRandomValues` bzw. `randomBytes`), als base64url (22 Zeichen) oder hex (32 Zeichen). Grund: nicht erratbar, und der Fehlerlog maskiert solche Segmente auch ohne Routenmuster. Wörter aus Kleinbuchstaben bis 20 Zeichen ließe er stehen.
- **Sourcemaps und Devtools:** Nuxt-Standard lassen (Server-Sourcemaps an, Client-Sourcemaps aus). `devtools` bleibt aus.
- **Dev-Server nie im Netz:** nie mit `--host` oder `0.0.0.0` starten. Grund: 2026 gab es mehrere Lücken, über die Dritte im selben Netz Dateien lesen konnten (u. a. vite GHSA-p4f5-76q4-ffq7). Für eigene Tests ein eigener Port, z. B. 3456. `HOST=0.0.0.0` im Container ist etwas anderes (Produktions-Server hinter dem Proxy, nur im eigenen Netz `<stack>-proxy`).
- **Absolute URLs** (Mails, Links, Weiterleitungen, Canonical) immer aus `runtimeConfig.public.siteUrl` bilden, nie aus der Anfrage. Grund: Seit Nuxt 4.6.4 vertrauen `getRequestURL`/`getRequestProtocol` aus `nuxt/server` und der Nuxt-Renderer `x-forwarded-proto`/`-host` nicht von selbst, das auto-importierte h3-`getRequestURL` (h3 1.15) dagegen übernimmt `x-forwarded-proto: https` standardmäßig (`x-forwarded-host` nur mit Option). Das Ergebnis hängt also davon ab, welche Fassung ein Handler nutzt; einen globalen Schalter gibt es nicht. Hinter NPM gilt zusätzlich: `X-Forwarded-Proto`/`-Scheme` übernehmen ein vom Client gesendetes `http`/`https`, `X-Forwarded-Host` reicht NPM ungeprüft durch (`SERVER.md` 2.5). Deshalb `getRequestURL(event, { xForwardedProto: true, xForwardedHost: true })` und das h3-`getRequestURL` nie für URLs oder Sicherheitsentscheidungen nutzen; die öffentliche Basis ist immer `NUXT_PUBLIC_SITE_URL`.

## Datenbank (SQLite)

- **`node:sqlite`** (in Node eingebaut, ab Node 24.15/26 „Release candidate“). Datei unter `.data/`, im Container als Volume (`/srv/apps/<stack>/data` → `/app/.data`).
- **Pragmas beim Öffnen:** `journal_mode=WAL`, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout`. Den `busy_timeout` kurz halten (Praxisraum: 1000 ms), weil `node:sqlite` synchron wartet und dabei den ganzen Server anhält. `PRAGMA optimize` beim Schließen bzw. regelmäßig (z. B. im Aufräum-Plugin).
- **Drizzle ORM + drizzle-kit** für neue Projekte: Schema in `db/schema.ts`, Migrationen in `drizzle/` (Muster Gora, Praxisraum). Die bestehende db0-Anbindung (`nitro.database`, Vogelperspektive) darf bleiben.
- **Drizzle-Version:** Drizzle 1.0 ist noch RC; der Treiber `drizzle-orm/node-sqlite` gibt es nur in 1.0. Bis 1.0 stabil ist: `drizzle-orm` 0.45.x (≥ 0.45.2, GHSA-gpj5-g38j-94v9) mit `drizzle-orm/sqlite-proxy` über `node:sqlite`. Vorlage: `Vogelperspektive/webapp/Vogelperspektive-Praxisraum/server/utils/db.ts`.
- **Umstieg auf Drizzle 1.0 einplanen:** `drizzle-kit up`, danach gibt es kein `drizzle/meta/_journal.json` mehr. Eigene Migrations-Routinen, die das Journal lesen (Praxisraum), müssen dann angepasst werden.
- **Migrationen enthalten nur Struktur, nie Daten.**
- **Migrationen beim Start:** Ein Nitro-Plugin spielt die Migrationen beim App-Start ein. Scheitert eine, beendet sich der Prozess (`process.exit(1)`) mit dem Namen der Migration im Log, und Docker startet neu. Vorlage: Praxisraum `server/plugins/startup-check.ts`. Eine Instanz pro App, deshalb keine Race-Condition. Den SQLite-Snapshot davor macht der Deploy-Schritt (`container-und-deployment.md`).
- **SQL nur mit Platzhaltern:** Prepared Statements (`?`), die Drizzle-Query-API oder getaggte Templates (`` sql`… ${wert}` `` bzw. `` db.sql`…` ``), die Werte als Parameter übergeben. Verboten: `sql.raw` und normale Template-Strings oder String-Verkettung mit Nutzereingaben.

## Login und Rollen

- **`nuxt-auth-utils` ≥ 0.6** (versiegeltes HttpOnly-Cookie `nuxt-auth-session`). Das Geheimnis heißt dort **`NUXT_APP_SECRET`** (mindestens 32 Zeichen); `NUXT_SESSION_PASSWORD` und `session.password` werden ignoriert.
  - **Umstieg in einem Schritt:** `NUXT_APP_SECRET` ist in B/C ohnehin Pflicht (Formular-Mindestzeit). Beim Update auf ≥ 0.6 nur noch `NUXT_SESSION_PASSWORD` aus `.env`, `.env.example`, `nuxt.config.ts` und Startprüfungen entfernen. Nie vorher entfernen (ältere Versionen brauchen es).
  - Das Update meldet alle Nutzer einmal ab: außerhalb der Hauptzeit einspielen und die Kundin vorher informieren (README von atinux/nuxt-auth-utils, „Migrate from v0.5“).
  - Erzeugen: `openssl rand -base64 32` oder `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
  - `maxAge` zählt ab dem letzten Schreiben der Sitzung.
- **Passwörter** nur als Hash in Env oder DB: `hashPassword` (scrypt) beim Setzen, `verifyPassword` beim Login, danach `passwordNeedsRehash` prüfen und bei Bedarf neu hashen. Einfügen und Passwortmanager nie blockieren.
- **Sitzung beim Login und bei jedem Rollenwechsel mit `replaceUserSession` neu setzen**, nie die alte ergänzen. Grund: Eine alte Sitzung soll keine neuen Rechte erben.
- **`sessionVersion` pro Nutzer in der DB.** Sie steht auch in der Sitzung, und jede geschützte API vergleicht beide. Erhöhen bei Abmelden-überall, Passwortwechsel, Sperre, Rollenwechsel. So wirkt eine Sperre sofort, nicht erst nach Ablauf des Cookies.
- **Login-Schutz:** Rate-Limit pro IP **und** pro Konto (Fehlversuche je Konto zählen, Muster Praxisraum `server/utils/two-factor.ts`). Kein Honeypot und keine Mindestzeit am Login: Passwortmanager senden automatisch ab (WCAG 3.3.8).
- **Zweiter Faktor:** Admin- und Fachkonten mit sensiblen Daten (z. B. Therapeutin) melden sich mit Passkey (WebAuthn, in `nuxt-auth-utils` eingebaut) oder TOTP mit Notfallcodes an (Muster Praxisraum). WebAuthn braucht `@simplewebauthn/server@13` (≥ 13.3.2) und `@simplewebauthn/browser@13`; Challenges mit `storeChallenge`/`getChallenge` serverseitig speichern (laut README „highly recommended“).
- **Keine offene Registrierung.** Konten legt ein Admin an oder schaltet sie frei.
- **Rollen und Freigaben (Muster Gora, `Gora Ozosnanie/webapp/server/core/security.ts`):**
  - Rollen und Status stehen in der DB (`viewer`, `editor`, `admin`; `status = 'active'`), nicht im Code und nicht nur in der Sitzung.
  - Jede API lädt den Nutzer bei jeder Anfrage aus der DB und prüft Status, Rolle und `credential_version` (= `sessionVersion`) erneut: `requireUser(…, write)` für Lesen/Schreiben, `requireAdmin` für Verwaltung.
  - Seitenschutz im Browser (Middleware) ist nur Bequemlichkeit. Entscheidend ist die Prüfung in jeder API-Route.
- Einstellungen eingeloggter Nutzer liegen im Konto in der DB, nicht im Browser (`formulare-und-datenschutz.md`).
- `/admin/**` und `/api/**` bekommen die Route-Regeln aus dem Kern (Render-Modi: `ssr: false`, `noindex`, `no-store`).

## CSRF-Schutz

**Pflicht in B/C.** Vorlage: Baustein `_bausteine/sicherheit/server/middleware/origin.ts` (geprüft, Freigabe 24.11.2026; im Layer, sobald veröffentlicht). Kopieren statt nachbauen. Verhalten:
- Prüft alle nicht-GET/HEAD/OPTIONS-Anfragen an **alle** Pfade, nicht nur `/api/**` (sonst kämen kodierte Pfade wie `/%61pi/…` durch). Entschieden von Florian am 27.11.2026.
- Erlaubt nur, wenn `Origin` gleich `new URL(runtimeConfig.public.siteUrl).origin` ist (Schema + Host + Port). `NUXT_PUBLIC_SITE_URL` ist deshalb Pflicht.
- Fehlt `Origin` oder ist er `null` (Seiten mit `referrer-policy: no-referrer`, z. B. Newsletter), nur mit `Sec-Fetch-Site: same-origin` erlaubt. Ohne beide Header, bei `same-site` oder `cross-site` → 403 (OWASP CSRF Cheat Sheet, Fetch Metadata).
- Ausnahmen nur als exakte Pfade mit Kommentar und Grund, nur für Routen, die sich selbst per Token oder Dienst-Schlüssel absichern: Ein-Klick-Abmeldung (RFC 8058, Mailanbieter senden ohne Origin), interne Server-zu-Server-API (Website ↔ Praxisraum, `SERVER.md`).
- `SameSite` am Cookie ist nur eine zusätzliche Schicht.
- Projekte mit eigener, mindestens gleich strenger Lösung (Gora) behalten sie, müssen aber dieselben Fälle erfüllen (Tests).
Achtung: Ein POST per `$fetch` während des SSR an die eigene API hat kein `Origin` und bekäme 403. Solche Aufrufe vermeiden und serverseitig direkt die Funktion aus `server/utils` aufrufen.

## Formularschutz (Technik)

Welche Formulare was brauchen, steht in `formulare-und-datenschutz.md`. Vorlage: alle Dateien aus `_bausteine/sicherheit/` (u. a. `server/utils/security.ts`, `form-token.ts`, `form-token-core.ts`, `site-url.ts`, `server/api/form-token.get.ts`, `shared/zod.ts`, `app/composables/useFormToken.ts`; Freigabe 24.11.2026, Anleitung in `STATUS.md` und README des Bausteins). Ohne `form-token.get.ts` scheitert `useFormToken`.
- **Client-IP:** Nginx Proxy Manager (NPM 2.17.1) **hängt an**: `X-Forwarded-For` = `$proxy_add_x_forwarded_for` (ein vom Client mitgeschickter Header bleibt vorn stehen), `X-Real-IP` = `$remote_addr`. Der **letzte** Eintrag ist der von NPM ermittelte Peer; die Vorlage `getClientIp` nimmt ihn. `getRequestIP(event, { xForwardedFor: true })` aus `nuxt/server` nimmt den ersten Eintrag: hinter NPM vom Client fälschbar, deshalb nie verwenden.
  - **Trust-Kette vor Freigabe des Rate-Limits prüfen:** Das NPM-Image vertraut für Real-IP standardmäßig auch privaten Netzen und CDN-Netzen; aus solchen Netzen übernimmt NPM die Adresse aus dem Header. Prüfung von außen und zusätzlich aus einem Backend-Netz mit gefälschtem `X-Forwarded-For`/`X-Real-IP`, dazu mitgesendete `X-Forwarded-Proto`/`-Scheme`/`-Host` (`SERVER.md` 2.5). Steht später ein CDN davor, diese Regel anpassen.
- **Rate-Limit** `rateLimit(event, zweck, { max, windowMs, key? })` im Arbeitsspeicher, Schlüssel = Zweck + IP (IPv6 auf /64 gekürzt; Login zusätzlich + Konto). Höchstens 10.000 Einträge, die ältesten fallen weg. Reicht bei einem Container. Antwort 429 mit `Retry-After` und deutscher Meldung, **jede** 429 (auch zweiter Faktor, Anmeldung).
- **Honeypot, Mindestzeit, Validierung** in `readForm(event, '<formular>', schema)`: zuerst Honeypot (Feld `website` gefüllt → `null`, der Handler meldet stillschweigend Erfolg, ohne zu speichern oder zu senden), dann Mindestzeit, dann zod.
- **Mindestzeit (Pflicht für die Formulare aus `formulare-und-datenschutz.md`):** Das Formular holt beim Laden per `useFormToken('<formular>')` ein signiertes Token (HMAC über Formularname und Ausstellungszeitpunkt, Schlüssel per HKDF aus `NUXT_APP_SECRET`). Der Server lehnt Absendungen unter 3 s, nach 2 h oder für ein anderes Formular mit 400 ab. Bei vorgerenderten Seiten das Token beim Laden holen, nie ins HTML backen. Das Token ist innerhalb der 2 h mehrfach verwendbar; das Rate-Limit begrenzt das.

## Sensible Daten, Verschlüsselung, Löschfristen

- **Was zählt:** z. B. Gesundheits- oder Finanzangaben, Akten, Notizen (Art. 9 DSGVO).
- **AES-256-GCM** mit `NUXT_DATA_KEY` (mindestens 32 Zeichen): zufälliger 12-Byte-IV pro Datensatz, Tabelle + ID als AAD (zusätzlich authentifizierte Daten, damit ein Chiffrat nicht in einen anderen Datensatz kopiert werden kann), Schlüsselversion als Präfix (`v1:`) für eine spätere Rotation.
- `NUXT_DATA_KEY` nie aus `NUXT_APP_SECRET` ableiten. Den Schlüssel getrennt sichern: ohne ihn sind die Daten verloren (Schlüsselliste in `SERVER.md`).
- Vorlage: `Vogelperspektive/webapp/Vogelperspektive/server/utils/crypto.ts` (Format `v1.`; AAD fehlt dort noch → STANDARDS-AUDIT).
- **Startprüfung:** Fehlt ein Pflichtgeheimnis oder passt `NUXT_DATA_KEY` nicht zu den Daten, beendet sich die App in Produktion beim Start (Muster Praxisraum `startup-check.ts`), statt erst beim ersten Zugriff zu scheitern. Dazu gehören `formTokenSecretProblem()` und `siteUrlProblem()` aus dem Baustein (Abbruch ohne Schlüssel oder ohne https-Adresse), entweder über das Plugin `security-startup-check.ts` oder aufgerufen in der vorhandenen `startup-check.ts`.
- **Löschfristen:** Jede gespeicherte Personenangabe hat eine Frist. Fristen als Konstanten in `shared/`, umgesetzt von einem Nitro-Plugin, das beim Start und regelmäßig aufräumt (Muster Vogelperspektive `server/plugins/cleanup.ts`). Die Fristen stehen in der Datenschutzerklärung.

## Uploads und Bilder

- Dateityp per Magic Bytes prüfen (nicht nach Endung oder `Content-Type`), eigenen zufälligen Dateinamen vergeben, Größe pro Route begrenzen.
- Uploads nie unter `public/` ablegen, sondern im Daten-Volume, und über eine eigene Route mit Rechteprüfung ausliefern.
- **`/_ipx`** (Bildbearbeitung von `@nuxt/image` zur Laufzeit) nur mit eigenen Bildern, nie mit Uploads oder fremden Domains (GHSA-p5vf-pjf5-ggj3, `@nuxt/image` ≥ 2.2.1). Wo keine Bearbeitung zur Laufzeit nötig ist, Bilder beim Build erzeugen (`performance.md`).

## Mail (nodemailer)

- **nodemailer ≥ 10.1.4** über SMTP des eigenen Postfachs (bis zum Umzug dogado, `web116.dogado.net:465`; neue Postfächer in Mailcow auf dem Webserver, `SERVER.md` 2.13). Kein Mail-Dienstleister.
- Zugangsdaten nur per Env: `NUXT_SMTP_HOST`, `NUXT_SMTP_PORT`, `NUXT_SMTP_SECURE`, `NUXT_SMTP_USER`, `NUXT_SMTP_PASS`, dazu `NUXT_MAIL_FROM`, `NUXT_MAIL_TO`.
- Einen Transporter wiederverwenden, mit Timeouts (`connectionTimeout: 10_000`, `greetingTimeout: 10_000`, `socketTimeout: 20_000`); die Standardwerte von nodemailer (2 bzw. 10 min) halten eine Anfrage sonst sehr lange fest. Fehlt die Konfiguration, 503 mit deutscher Meldung. Vorlage: `Ortrud/server/utils/mail.ts`.
- **Absender ist immer die eigene Adresse**, die Adresse aus dem Formular kommt nur in `replyTo`. Grund: Sonst scheitern SPF/DKIM/DMARC.
- Immer einen Text-Teil mitschicken, HTML nur zusätzlich. Mailinhalte nicht loggen.

## Nitro-Cache

- `defineCachedEventHandler` nur für öffentliche, teure Abfragen ohne Nutzerbezug, immer mit explizitem `maxAge` (Standard wäre 1 s). Nie für Antworten mit Sitzung oder Personendaten.
- Treiber `memory` reicht bei einem Container. Seiten-Caching (`swr`) siehe `performance.md`.

## Content-Security-Policy (CSP)

- **Eine Quelle je Header:** Die CSP setzt die App über `nuxt-security`, und zwar **nur** `contentSecurityPolicy`; alle anderen Header und Funktionen von `nuxt-security` sind aus. Die übrigen festen Header (HSTS, `X-Content-Type-Options`, `Permissions-Policy`, COOP/CORP, `X-Frame-Options`) setzt der Proxy: auf dem Webserver NPM (gemeinsamer Hook `server_proxy.conf`, Advanced-Feld je Host, HSTS-Schalter), in Modus A der Nginx-Container (Soll-Liste und Prüfung je Host: `SERVER.md` 2.5). `Referrer-Policy` kommt aus einer Quelle; App-Werte haben Vorrang: Seiten mit Token im Link setzen `no-referrer` per `routeRules`, und diese darf der Proxy weder überschreiben noch verdoppeln (Umsetzung in NPM offen, vor Live prüfen). NPM setzt in `location /` selbst ein `add_header`; server-weite Header aus `server_proxy.conf` kommen dort nicht an (`SERVER.md` 2.5). `frame-ancestors` steht in Modus B/C in der App-CSP, in Modus A in der `nginx.conf` des Containers, nie doppelt. Nginx hängt `add_header` an, auch wenn die App den Header schon setzt: Was die App setzt, setzt der Proxy nicht.
- Grund: Nur die App kennt Nonces und Hashes. Ohne `'unsafe-inline'` in `script-src` wird eingeschleustes Skript nicht ausgeführt.
- Prerenderte Seiten bekommen die CSP im Header und als Meta-Tag mit sha256-Hashes der Inline-Skripte und SRI-Hashes; SSR- und `ssr: false`-Seiten bekommen eine Nonce. `sri` und `ssg` von `nuxt-security` an lassen (Standard), sonst greifen die Hashes mit `'strict-dynamic'` nicht.
- **Modus A** (`nuxt generate`): Es gilt die Meta-CSP. `frame-ancestors` entfernt `nuxt-security` aus dem Meta-Tag automatisch (wirkt dort nicht), deshalb als Header aus dem Nginx-Container.
- **Neue oder geänderte CSP (Soll):** zuerst als Report-Only ausrollen, Konsole beobachten, dann scharf schalten. Dafür `security.contentSecurityPolicyReportOnly: true` und während dieser Phase `security.ssg: { meta: false }` (sonst setzt der Meta-Tag beim Prerender die CSP trotzdem durch). In Modus A geht Report-Only nicht (nur Meta-Tag).
- **Vor jedem Deployment** die Browser-Konsole auf CSP-Verstöße prüfen (`tests-und-qualitaet.md`).
- Inline-Skripte im `<head>` (z. B. der Farbmodus-Umschalter gegen Aufblitzen, `formulare-und-datenschutz.md`) brauchen auf vorgerenderten Seiten den Hash bzw. bei SSR die Nonce. Nach jeder Änderung des Skripts Konsole prüfen.
- Echtzeit/Video (Praxisraum, eigener Server laut `SERVER.md`) braucht zusätzlich `connect-src` mit den `wss:`-Adressen von LiveKit und Hocuspocus.

**Vorlage:** `_bausteine/sicherheit/csp.ts` mit `createSecurityConfig({ mode, reportOnly, connectSrc, scriptSrcAttrHashes })` (geprüft 24.11.2026). Sie setzt zusätzlich `default-src`, `connect-src`, `manifest-src` und `worker-src` auf `'self'` und den `script-src-attr`-Hash nur, wenn das Projekt `@nuxt/image` mit `onerror` nutzt. Das Beispiel unten zeigt den Aufbau (Pilottest 21.11.2026, `nuxt-security` 2.7.0, Nuxt 4.6.4), in `nuxt.config.ts` mit `modules: ['nuxt-security', …]`:

```ts
const reportOnly = true // Report-Only-Phase; zum Scharfschalten false (dann auch ssg.meta wieder an)

security: {
  contentSecurityPolicyReportOnly: reportOnly,
  ...(reportOnly ? { ssg: { meta: false } } : {}),
  headers: {
    contentSecurityPolicy: {
      'base-uri': ["'none'"], 'object-src': ["'none'"],
      'script-src': ["'self'", "'strict-dynamic'", "'nonce-{{nonce}}'"],
      'script-src-attr': ["'unsafe-hashes'", "'sha256-bwK6T5wZVTANitXbrTsel7kl/PyCjCd/Dq5Qoz3imjM='"], // onerror von @nuxt/image
      'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:'],
      'font-src': ["'self'"], 'form-action': ["'self'"], 'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': !reportOnly, // im Report-Only-Header meldet Chrome die Direktive als Fehler
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

- `reportOnly` ist dieselbe Konstante wie `contentSecurityPolicyReportOnly` (Muster `_bausteine/sicherheit/csp.ts`). Weglassen der Direktive reicht nicht, weil `nuxt-security` sie sonst als Standard setzt.
- **zod 4 und CSP:** zod prüft beim ersten Schema per `new Function('')`, ob JIT möglich ist; ohne `'unsafe-eval'` meldet die CSP einen Verstoß. Deshalb `z.config({ jitless: true })` vor dem ersten Schema, über die Vorlage `_bausteine/sicherheit/shared/zod.ts`; Schemas importieren `z` von dort.
- `X-Powered-By: Nuxt` entfernt der Proxy (Soll; in NPM vor Live prüfen, `SERVER.md` 2.5), `hidePoweredBy` in `nuxt-security` bleibt aus.
- `@nuxt/image` setzt beim SSR ein `onerror` an `<img>`. Dafür braucht `script-src-attr` `'unsafe-hashes'` und den Hash oben. Der Hash hängt vom genauen Handler-Text ab: nach jedem `@nuxt/image`-Update in der Konsole prüfen.
