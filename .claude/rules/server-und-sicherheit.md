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

Stand: 21.11.2026. Gilt für Modus B und C (Nitro-Server). Bezugsrahmen ist die **OWASP Top 10:2025** (neu dort: A03 Software Supply Chain Failures, A10 Mishandling of Exceptional Conditions).
Nicht hier: Pakete und Lieferkette (`abhaengigkeiten-und-layer.md`), Formular-Regeln, Browser-Speicher und Datenschutzerklärung (`formulare-und-datenschutz.md`), Dockerfile/Compose/Caddy pro Projekt (`container-und-deployment.md`), Server-Betrieb (`SERVER.md`), Geheimnisse allgemein (Kern `CLAUDE.md`).
„Layer“ meint `@f7or7an/nuxt-base`, sobald veröffentlicht; bis dahin die genannte Projektvorlage bzw. `_bausteine/`.

## Server-Code allgemein

- **`nuxt/server` (geprüft am Code von Nuxt 4.6.4):** Wer Helfer aus `nuxt/server` nutzt (`readValidatedBody`, `getValidatedQuery`, `useSession`, `handleCors` …), definiert den Handler mit `defineEventHandler` **aus `nuxt/server`**. Sonst bekommt der Helfer ein h3-Event, und es kommt Fehler `NUXT_E8012`. Grund für die Regel: Nuxt 5 stellt darauf um.
  - Im Handler aus `nuxt/server` ist das Event ein `RequestEvent` (nur `req`, `url`, `res`, `context`). Dort erlaubt: Nitro-Bordmittel ohne Event (`defineNitroPlugin`, `useStorage`), eigene `server/utils` per Auto-Import, sofern sie `RequestEvent` annehmen, und Modul-Helfer, die `RequestEvent` annehmen (`nuxt-auth-utils` 0.6). Heutige Utils mit `H3Event`-Parameter (z. B. `readForm`, `rateLimit` aus dem Vogelperspektive-Muster) nur im h3-Handler verwenden, bis sie umgestellt sind.
  - h3-Helfer mit `H3Event` (`setResponseHeader`, `readMultipartFormData`, `sendStream` …) nur in Handlern mit dem auto-importierten h3-`defineEventHandler`, nie zusammen mit `nuxt/server`-Helfern. Auf Nuxt 4 läuft das zwar, aber der Typecheck meldet Fehler (README nuxt-auth-utils).
  - Ersatz im `nuxt/server`-Handler: Header über `event.res.headers.set()`, Formulardaten über `event.req.formData()`, Streams als `ReadableStream` zurückgeben.
  - `defineCachedEventHandler` umschließt einen h3-Handler: darin keine `nuxt/server`-Helfer.
- **Nuxt 5 vorbereiten:** Nuxt 5 ist noch nicht erschienen (Roadmap „Q4 2026 estimated“). Vor jedem Minor-Update einmal in einem Branch mit `future: { compatibilityVersion: 5 }` bauen und die Warnungen in der `STANDARDS-AUDIT.md` notieren.
- **Fehler:** `throw createError({ status, statusText, message })` statt `statusCode` (Nuxt 4.6 / Nuxt 5). `statusText` kurz auf Englisch in ASCII (h3 bereinigt es), die verständliche deutsche Meldung steht in `message`. DB- und Upstream-Fehler im Server abfangen und nie roh weitergeben (GHSA-96x6-fvhx-49hg: SSR-Fehlerdetails gingen an den Client).
- **Validierung:** `readValidatedBody(event, schema)` bzw. `getValidatedQuery(event, schema)` mit dem zod-Schema direkt, aber nur in der Fassung aus `nuxt/server` (h3 1.15 erwartet stattdessen eine Funktion `(b) => schema.parse(b)`). Ungültige Eingaben ergeben 400. Öffentliche Formulare nutzen `readForm` (Honeypot zuerst, siehe unten). Zod-Fehlertexte lokalisieren: `z.config(z.locales.de())` (bzw. Projektsprache), im Server und im Client.
- **Grenzen in jedem Schema:** Jeder String und jedes Array bekommt `.max()`. Grund: Sonst füllt eine einzige Anfrage Speicher und Datenbank. Die Body-Größe begrenzt zusätzlich Caddy (`request_body { max_size 1MB }`, Uploads pro Route mehr).
- **Schemas** liegen in `shared/utils/schemas.ts` (automatisch importiert) oder werden per `#shared/…` importiert. Dieselben Schemas im Browser und auf dem Server.
- **Keine zustandsändernden GET-Routen.** Alles, was schreibt, löscht oder Mails verschickt, ist POST/PUT/PATCH/DELETE.
- **Logging:** keine Formularinhalte, E-Mail-Adressen, Tokens oder vollen IPs in App-Logs. Ausgabe als JSON auf stdout (Docker sammelt es). Grund: Logs sind Personendaten mit eigener Frist.
- **Sourcemaps und Devtools:** Nuxt-Standard lassen (Server-Sourcemaps an, Client-Sourcemaps aus). `devtools` bleibt aus.
- **Dev-Server nie im Netz:** nie mit `--host` oder `0.0.0.0` starten. Grund: 2026 gab es mehrere Lücken, über die Dritte im selben Netz Dateien lesen konnten (u. a. vite GHSA-p4f5-76q4-ffq7). Für eigene Tests ein eigener Port, z. B. 3456. `HOST=0.0.0.0` im Container ist etwas anderes (Produktions-Server hinter Caddy).
- **Absolute URLs** (Mails, Links, Weiterleitungen, Canonical) immer aus `runtimeConfig.public.siteUrl` bilden, nie aus der Anfrage. Grund: Seit Nuxt 4.6.4 vertrauen `getRequestURL`/`getRequestProtocol` aus `nuxt/server` und der Nuxt-Renderer `x-forwarded-proto`/`-host` nicht von selbst, das auto-importierte h3-`getRequestURL` (h3 1.15) dagegen übernimmt `x-forwarded-proto: https` standardmäßig (`x-forwarded-host` nur mit Option). Das Ergebnis hängt also davon ab, welche Fassung ein Handler nutzt; einen globalen Schalter gibt es nicht. Wo die Anfrage-URL doch gebraucht wird: `getRequestURL(event, { xForwardedProto: true, xForwardedHost: true })` aus `nuxt/server` (nur hinter Caddy).

## Datenbank (SQLite)

- **`node:sqlite`** (in Node eingebaut, ab Node 24.15/26 „Release candidate“). Datei unter `.data/`, im Container als Volume (`/srv/apps/<name>/data` → `/app/.data`).
- **Pragmas beim Öffnen:** `journal_mode=WAL`, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout`. Den `busy_timeout` kurz halten (Praxisraum: 1000 ms), weil `node:sqlite` synchron wartet und dabei den ganzen Server anhält. `PRAGMA optimize` beim Schließen bzw. regelmäßig (z. B. im Aufräum-Plugin).
- **Drizzle ORM + drizzle-kit** für neue Projekte: Schema in `db/schema.ts`, Migrationen in `drizzle/` (Muster Gora, Praxisraum). Die bestehende db0-Anbindung (`nitro.database`, Vogelperspektive) darf bleiben.
- **Drizzle-Version:** Drizzle 1.0 ist noch RC; der Treiber `drizzle-orm/node-sqlite` gibt es nur in 1.0. Bis 1.0 stabil ist: `drizzle-orm` 0.45.x (≥ 0.45.2, GHSA-gpj5-g38j-94v9) mit `drizzle-orm/sqlite-proxy` über `node:sqlite`. Vorlage: `Vogelperspektive/webapp/Vogelperspektive-Praxisraum/server/utils/db.ts`.
- **Umstieg auf Drizzle 1.0 einplanen:** `drizzle-kit up`, danach gibt es kein `drizzle/meta/_journal.json` mehr. Eigene Migrations-Routinen, die das Journal lesen (Praxisraum), müssen dann angepasst werden.
- **Migrationen enthalten nur Struktur, nie Daten.**
- **Migrationen beim Start:** Ein Nitro-Plugin spielt die Migrationen beim App-Start ein. Scheitert eine, beendet sich der Prozess (`process.exit(1)`) mit dem Namen der Migration im Log, und Docker startet neu. Vorlage: Praxisraum `server/plugins/startup-check.ts`. Eine Instanz pro App, deshalb keine Race-Condition. Den SQLite-Snapshot davor macht der Deploy-Schritt (`container-und-deployment.md`).
- **SQL nur mit Platzhaltern:** Prepared Statements (`?`), die Drizzle-Query-API oder getaggte Templates (`` sql`… ${wert}` `` bzw. `` db.sql`…` ``), die Werte als Parameter übergeben. Verboten: `sql.raw` und normale Template-Strings oder String-Verkettung mit Nutzereingaben.

## Login und Rollen

- **`nuxt-auth-utils` ≥ 0.6** (versiegeltes HttpOnly-Cookie `nuxt-auth-session`). Das Geheimnis heißt dort **`NUXT_APP_SECRET`** (mindestens 32 Zeichen); `NUXT_SESSION_PASSWORD` und `session.password` werden ignoriert.
  - **Umstieg in einem Schritt:** Beim Update auf ≥ 0.6 `NUXT_APP_SECRET` setzen und im selben Schritt `NUXT_SESSION_PASSWORD` aus `.env`, `.env.example`, `nuxt.config.ts` und Startprüfungen entfernen. Nie vorher entfernen (ältere Versionen brauchen es).
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

**Soll, sobald der Layer-Baustein vorliegt**; bis dahin in neuen Projekten nach der Skizze unten. Vorlage: Praxisraum `server/middleware/origin.ts`, aber strenger: Anfragen **ohne** `Origin` an zustandsändernde Routen werden abgelehnt (OWASP CSRF Cheat Sheet). `SameSite` am Cookie ist nur eine zusätzliche Schicht.

```ts
// server/middleware/origin.ts – Skizze, ungetestet
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])
// Nur Routen, die sich selbst per Token/Schlüssel absichern. Jede mit Grund.
const EXEMPT = [
  '/api/newsletter/unsubscribe', // Ein-Klick-Abmeldung (RFC 8058): Mailanbieter senden ohne Origin
]

export default defineEventHandler((event) => {
  if (SAFE.has(event.method) || !event.path.startsWith('/api/')) return
  if (EXEMPT.some(path => event.path.startsWith(path))) return
  const origin = getRequestHeader(event, 'origin')
  let host = ''
  try { host = origin ? new URL(origin).host : '' } catch {}
  // Hinter Caddy kommt der Host-Header unverändert an
  if (getRequestHeader(event, 'sec-fetch-site') === 'cross-site' || host !== getRequestHost(event)) {
    throw createError({ status: 403, statusText: 'Forbidden', message: 'Anfrage von einer fremden Seite abgelehnt.' })
  }
})
```

Weitere Ausnahmen nur kommentiert, z. B. eine interne Server-zu-Server-API mit Dienst-Schlüssel (Website ↔ Praxisraum, `SERVER.md`).
Achtung: Ein POST per `$fetch` während des SSR an die eigene API hat kein `Origin` und bekäme 403. Solche Aufrufe vermeiden und serverseitig direkt die Funktion aus `server/utils` aufrufen.

## Formularschutz (Technik)

Welche Formulare was brauchen, steht in `formulare-und-datenschutz.md`. Vorlage: `Vogelperspektive/webapp/Vogelperspektive/server/utils/security.ts` (kommt in den Layer).
- **Client-IP:** Caddy **ersetzt** `X-Forwarded-For` bei nicht vertrauenswürdigen Clients; der Header enthält dann nur die echte Client-IP. Die Vorlage nimmt den **letzten** Eintrag: Das ist hinter Caddy dasselbe und bleibt auch dann richtig, wenn ein Proxy davor anhängt. `getRequestIP(event, { xForwardedFor: true })` aus `nuxt/server` nimmt den ersten Eintrag: hinter Caddy identisch, ohne Caddy fälschbar. Steht später ein CDN davor: `trusted_proxies` in Caddy setzen und diese Regel anpassen.
- **Rate-Limit** `rateLimit(event, key, max, windowMs)` im Arbeitsspeicher, Schlüssel = Zweck + IP (Login zusätzlich + Konto). Reicht bei einem Container. Antwort 429 mit `Retry-After` und deutscher Meldung.
- **Honeypot** `readForm(event, schema)`: Ist das versteckte Feld `website` gefüllt, gibt die Funktion `null` zurück, und der Handler meldet stillschweigend Erfolg, ohne etwas zu speichern oder zu senden. Erst danach validiert zod.
- **Mindestzeit (Soll, sobald der Layer-Baustein vorliegt):** Das Formular holt beim Laden ein signiertes Token (HMAC über den Ausstellungszeitpunkt, mit Ablauf). Der Server lehnt Absendungen ab, die schneller als 3 s nach Ausstellung oder nach Ablauf kommen. Bei vorgerenderten Seiten das Token per Anfrage beim Laden holen, nie ins HTML backen.

## Sensible Daten, Verschlüsselung, Löschfristen

- **Was zählt:** z. B. Gesundheits- oder Finanzangaben, Akten, Notizen (Art. 9 DSGVO).
- **AES-256-GCM** mit `NUXT_DATA_KEY` (mindestens 32 Zeichen): zufälliger 12-Byte-IV pro Datensatz, Tabelle + ID als AAD (zusätzlich authentifizierte Daten, damit ein Chiffrat nicht in einen anderen Datensatz kopiert werden kann), Schlüsselversion als Präfix (`v1:`) für eine spätere Rotation.
- `NUXT_DATA_KEY` nie aus `NUXT_APP_SECRET` ableiten. Den Schlüssel getrennt sichern: ohne ihn sind die Daten verloren (Schlüsselliste in `SERVER.md`).
- Vorlage: `Vogelperspektive/webapp/Vogelperspektive/server/utils/crypto.ts` (Format `v1.`; AAD fehlt dort noch → STANDARDS-AUDIT).
- **Startprüfung:** Fehlt ein Pflichtgeheimnis oder passt `NUXT_DATA_KEY` nicht zu den Daten, beendet sich die App in Produktion beim Start (Muster Praxisraum `startup-check.ts`), statt erst beim ersten Zugriff zu scheitern.
- **Löschfristen:** Jede gespeicherte Personenangabe hat eine Frist. Fristen als Konstanten in `shared/`, umgesetzt von einem Nitro-Plugin, das beim Start und regelmäßig aufräumt (Muster Vogelperspektive `server/plugins/cleanup.ts`). Die Fristen stehen in der Datenschutzerklärung.

## Uploads und Bilder

- Dateityp per Magic Bytes prüfen (nicht nach Endung oder `Content-Type`), eigenen zufälligen Dateinamen vergeben, Größe pro Route begrenzen.
- Uploads nie unter `public/` ablegen, sondern im Daten-Volume, und über eine eigene Route mit Rechteprüfung ausliefern.
- **`/_ipx`** (Bildbearbeitung von `@nuxt/image` zur Laufzeit) nur mit eigenen Bildern, nie mit Uploads oder fremden Domains (GHSA-p5vf-pjf5-ggj3, `@nuxt/image` ≥ 2.2.1). Wo keine Bearbeitung zur Laufzeit nötig ist, Bilder beim Build erzeugen (`performance.md`).

## Mail (nodemailer)

- **nodemailer ≥ 10.1.4** über SMTP des eigenen Postfachs (heute dogado, `web116.dogado.net:465`). Kein Mail-Dienstleister.
- Zugangsdaten nur per Env: `NUXT_SMTP_HOST`, `NUXT_SMTP_PORT`, `NUXT_SMTP_SECURE`, `NUXT_SMTP_USER`, `NUXT_SMTP_PASS`, dazu `NUXT_MAIL_FROM`, `NUXT_MAIL_TO`.
- Einen Transporter wiederverwenden. Fehlt die Konfiguration, 503 mit deutscher Meldung. Vorlage: `Vogelperspektive/webapp/Vogelperspektive/server/utils/mail.ts`.
- **Absender ist immer die eigene Adresse**, die Adresse aus dem Formular kommt nur in `replyTo`. Grund: Sonst scheitern SPF/DKIM/DMARC.
- Immer einen Text-Teil mitschicken, HTML nur zusätzlich. Mailinhalte nicht loggen.

## Nitro-Cache

- `defineCachedEventHandler` nur für öffentliche, teure Abfragen ohne Nutzerbezug, immer mit explizitem `maxAge` (Standard wäre 1 s). Nie für Antworten mit Sitzung oder Personendaten.
- Treiber `memory` reicht bei einem Container. Seiten-Caching (`swr`) siehe `performance.md`.

## Content-Security-Policy (CSP)

- **Eine Quelle je Header:** Die CSP setzt die App über `nuxt-security`, und zwar **nur** `contentSecurityPolicy`; alle anderen Header und Funktionen von `nuxt-security` sind aus. Die übrigen festen Header (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, `X-Frame-Options`) setzt Caddy (`SERVER.md`). `frame-ancestors` steht in Modus B/C in der App-CSP, in Modus A in Caddy, nie doppelt.
- Grund: Nur die App kennt Nonces und Hashes. Ohne `'unsafe-inline'` in `script-src` wird eingeschleustes Skript nicht ausgeführt.
- Prerenderte Seiten bekommen die CSP im Header und als Meta-Tag mit sha256-Hashes der Inline-Skripte und SRI-Hashes; SSR- und `ssr: false`-Seiten bekommen eine Nonce. `sri` und `ssg` von `nuxt-security` an lassen (Standard), sonst greifen die Hashes mit `'strict-dynamic'` nicht.
- **Modus A** (`nuxt generate`): Es gilt die Meta-CSP. `frame-ancestors` entfernt `nuxt-security` aus dem Meta-Tag automatisch (wirkt dort nicht), deshalb in Caddy.
- **Neue oder geänderte CSP (Soll):** zuerst als Report-Only ausrollen, Konsole beobachten, dann scharf schalten. Dafür `security.contentSecurityPolicyReportOnly: true` und während dieser Phase `security.ssg: { meta: false }` (sonst setzt der Meta-Tag beim Prerender die CSP trotzdem durch). In Modus A geht Report-Only nicht (nur Meta-Tag).
- **Vor jedem Deployment** die Browser-Konsole auf CSP-Verstöße prüfen (`tests-und-qualitaet.md`).
- Inline-Skripte im `<head>` (z. B. der Farbmodus-Umschalter gegen Aufblitzen, `formulare-und-datenschutz.md`) brauchen auf vorgerenderten Seiten den Hash bzw. bei SSR die Nonce. Nach jeder Änderung des Skripts Konsole prüfen.
- Echtzeit/Video (Praxisraum, eigener Server laut `SERVER.md`) braucht zusätzlich `connect-src` mit den `wss:`-Adressen von LiveKit und Hocuspocus.

Geprüfte Konfiguration (Pilottest 21.11.2026, `nuxt-security` 2.7.0, Nuxt 4.6.4), in `nuxt.config.ts` mit `modules: ['nuxt-security', …]`:

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

- `@nuxt/image` setzt beim SSR ein `onerror` an `<img>`. Dafür braucht `script-src-attr` `'unsafe-hashes'` und den Hash oben. Der Hash hängt vom genauen Handler-Text ab: nach jedem `@nuxt/image`-Update in der Konsole prüfen.
