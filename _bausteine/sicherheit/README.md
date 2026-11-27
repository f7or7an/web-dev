# Baustein Sicherheit: CSRF, Formularschutz, CSP

Regeln: `WebSites/.claude/rules/server-und-sicherheit.md` (CSRF, Formularschutz, CSP, `nuxt/server`), `formulare-und-datenschutz.md` (welches Formular was braucht).
Kommt in den Layer `@f7or7an/nuxt-base`, sobald er veröffentlicht ist. Gilt für Modus B/C; `csp.ts` auch für Modus A.
Stand 25.11.2026, ergänzt 27.11.2026 (Proxy: Nginx Proxy Manager statt Caddy, nur Texte): vom Sicherheitsprüfer freigegeben (Runde 2), danach vier Soll-Punkte ergänzt, zwei Befunde aus Vogelperspektive behoben (zod-Einstellungen im Server-Bundle, Fehlerlog ohne Token) und die Befunde der Prüfrunde 4 zum Fehlerlog umgesetzt (Änderungen unten).

## Dateien

| Datei | Ziel im Projekt | Zweck |
|---|---|---|
| `server/middleware/origin.ts` | gleich | CSRF (Fetch Metadata + Origin, OWASP): Jede Anfrage außer GET/HEAD/OPTIONS muss von der eigenen Seite kommen, sonst 403. Ausnahmen als exakte Pfade in `EXEMPT_PATHS`, jede mit Grund. Details unten. |
| `server/utils/security.ts` | gleich | `getClientIp` (letzter `X-Forwarded-For`-Eintrag), `rateLimit(event, zweck, { max, windowMs, key? })` → 429 + `Retry-After`, `resetRateLimit`, `readForm(event, formular, schema)` (Honeypot → Mindestzeit → zod). |
| `server/utils/form-token-core.ts` | gleich | Kern der signierten Mindestzeit ohne Nuxt (nur Web Crypto): `createFormToken`, `checkFormToken` (wirft nie), `deriveFormTokenSecret`. Geheimnis wird immer übergeben. |
| `server/utils/form-token.ts` | gleich | Nuxt-Anbindung: Schlüssel aus `NUXT_APP_SECRET` (per `deriveSecret`) oder eigenem Geheimnis, `issueFormToken(formular)`, `requireFormToken(formular, token)`, `formTokenSecretProblem()` für die Startprüfung. |
| `server/plugins/security-startup-check.ts` | gleich | **Startprüfung:** Fehlt der Schlüssel oder fehlt `NUXT_PUBLIC_SITE_URL` bzw. hat sie kein `https`, bricht der Server in Produktion beim Start ab (nicht im Dev-Modus, nicht beim Vorrendern). |
| `server/utils/site-url.ts` | gleich | `siteUrlProblem(siteUrl)` für die Startprüfung (`http` nur für `localhost`, `127.0.0.1`, `[::1]`). |
| `server/api/form-token.get.ts` | gleich | `GET /api/form-token?form=contact` → `{ token }` (`no-store`, Rate-Limit 60 / 10 min je IP). |
| `shared/utils/form-protection.ts` | gleich | Feldnamen `website`/`formToken`, Zeiten, erlaubte Formularnamen, Typ der Ablehnungsgründe. |
| `shared/zod.ts` | gleich | zod 4 mit `jitless` (nötig für die CSP ohne `unsafe-eval`) und deutschen Fehlertexten, `configureZod()`; siehe Schritt 5. |
| `server/plugins/zod-config.ts` | gleich | ruft `configureZod()` beim Serverstart auf. **Pflicht:** Nitro verwirft den Aufruf in `shared/zod.ts` beim Bündeln, ohne das Plugin antwortet der Server mit englischen zod-Texten. |
| `server/plugins/request-error-log.ts`, `server/utils/request-error-log.ts` | gleich | Fehlerlog als JSON-Zeile ohne Tokens, Abschnitt „Fehlerlog“ unten. |
| `error-log-test-env.ts` | neben `nuxt.config.ts` | `errorLogTestEnv()` für `$env`: zwei Test-Builds (`error-log-test` mit Testrouten, `error-log-baseline` ohne das Plugin) in eigenen Ordnern `.output-error-log-*`. |
| `tests/build/error-log.mjs`, `tests/build/fixtures/*` | gleich | Build-Test `npm run test:build`: startet beide gebauten Server und vergleicht (Schritt 11). |
| `app/composables/useFormToken.ts` | gleich | `useFormToken('contact')`: holt das Token beim Einblenden, wartet vor dem Absenden die Mindestzeit ab, erneuert abgelaufene Tokens. |
| `csp.ts` | neben `nuxt.config.ts` | `createSecurityConfig()` für `nuxt-security`: nur CSP, alle anderen Header aus (setzt der Proxy: Nginx Proxy Manager bzw. in Modus A der Nginx-Container, `SERVER.md` 2.5). |
| `tests/unit/*.test.ts`, `tests/unit/nuxt-server-stub.ts`, `vitest.config.ts` | gleich | 70 Unit-Tests; der Stub ersetzt `nuxt/server` per Alias. |

Alle Server-Helfer nehmen ein `RequestEvent` und nutzen nur Helfer aus `nuxt/server`. **Jeder Handler, der sie aufruft, nutzt `defineEventHandler` aus `nuxt/server`** (sonst Typfehler bzw. `NUXT_E8012`). Server-Dateien importieren ausdrücklich (relative Pfade), damit sie ohne Nuxt testbar sind.

## Übernahme

1. Dateien kopieren; Kopfkommentar „Herkunft“ stehen lassen. Alte Fassungen ersetzen (Vogelperspektive `server/utils/security.ts`, Praxisraum `server/middleware/origin.ts`) und ihre Aufrufer umstellen:
   - `rateLimit(event, 'contact', 5, 600_000)` → `rateLimit(event, 'contact', { max: 5, windowMs: 10 * 60 * 1000 })`
   - Handler: `import { defineEventHandler } from 'nuxt/server'`. h3-Helfer (`setResponseHeader`, `readMultipartFormData` …) dort nicht mehr nutzen, sondern `event.res.headers.set()`, `event.req.formData()`.
   - `requireAdmin`/`readAdminBody` aus der alten Vogelperspektive-Datei bleiben projekteigen (nicht Teil des Bausteins).
2. **Pflichtschritt Schlüssel:** `NUXT_APP_SECRET` (≥ 32 Zeichen) ist Pflicht, auch ohne Login (Mindestzeit-Token). In `.env.example`, README und Schlüsselliste (`SERVER.md`) eintragen. Erzeugen: `openssl rand -base64 32`. Im Dev-Modus erzeugt Nuxt einen Wert und warnt (`NUXT_B5028`), in Produktion nicht: Dort bricht `server/plugins/security-startup-check.ts` den Start ab (Log: `{"level":"fatal","scope":"startup",…}`), statt dass Formulare erst später scheitern. Hat das Projekt schon eine Startprüfung (Praxisraum, Ortrud `startup-check.ts`), dort `formTokenSecretProblem()` und `siteUrlProblem(useRuntimeConfig().public.siteUrl)` aufrufen und das Plugin weglassen.
   - Ohne Schlüssel (falls die Startprüfung fehlt) antwortet `/api/form-token` neutral mit 503 „Das Formular ist gerade nicht verfügbar …“; die Einzelheiten stehen nur im Server-Log.
   - Eigenes Geheimnis statt `NUXT_APP_SECRET`: `runtimeConfig: { nuxtBase: { formTokenSecret: '' } }` in der `nuxt.config.ts` und `NUXT_NUXT_BASE_FORM_TOKEN_SECRET` (≥ 32 Zeichen) setzen. Ein zu kurzer Wert wird nicht still ersetzt, sondern führt zum Startabbruch bzw. 503.
3. **Pflichtschritt `runtimeConfig.public.siteUrl`** (`NUXT_PUBLIC_SITE_URL`, z. B. `https://example.org`): Die CSRF-Prüfung vergleicht damit (Regel „Absolute URLs“); ohne sie wiche sie still auf Schema und Host der Anfrage aus. Darum bricht die Startprüfung in Produktion ab, wenn sie fehlt oder nicht mit `https://` beginnt. Einzige Ausnahme: `http` für `localhost`, `127.0.0.1` und `[::1]`, damit der gebaute Server lokal testbar bleibt (`NUXT_PUBLIC_SITE_URL=http://127.0.0.1:<port>`).
4. **CSRF-Ausnahmen** in `EXEMPT_PATHS` eintragen, z. B. Vogelperspektive `'/api/newsletter/unsubscribe'` (RFC 8058), Praxisraum die interne Dienst-API. Kein SSR-`$fetch` per POST an die eigene API (hätte kein `Origin` → 403); stattdessen die Funktion aus `server/utils` direkt aufrufen.
5. **zod:** `shared/zod.ts` **und** `server/plugins/zod-config.ts` kopieren. Alle Schemas importieren `z` aus `shared/zod.ts` (`import { z } from '#shared/zod'` bzw. relativ), nie direkt aus `'zod'`. Grund: zod 4 ruft beim Erstellen jedes Schemas `new Function('')` auf, und die CSP meldet `unsafe-eval` (Fund in Ortrud). `configureZod()` (jitless + `z.locales.de()`; andere Projektsprache dort eintragen) läuft beim Import der Datei, also im Browser vor dem ersten Schema. Im Server-Bundle verwirft Nitro diesen Aufruf: `shared/zod.ts` reicht `z` nur durch, und Rollup hält die Datei wegen `moduleSideEffects` für nebenwirkungsfrei (Fund in Vogelperspektive: englische Texte „Too big: …“). Darum ruft das Server-Plugin `configureZod()` beim Start auf; die Sprache liest zod erst beim Erzeugen der Meldung, sie wirkt also auch für schon erstellte Schemas. Eigene `z.config(…)`-Aufrufe an anderer Stelle entfallen. ESLint erzwingt das (Vorlage für `eslint.config.mjs`, im Layer schon eingebaut, im Testprojekt geprüft):
   ```js
   import withNuxt from './.nuxt/eslint.config.mjs'

   // zod nur über shared/zod.ts: Dort steht z.config({ jitless: true }), sonst meldet die CSP 'unsafe-eval'
   const ZOD_IMPORT_MESSAGE = 'z aus shared/zod.ts importieren (#shared/zod), nicht direkt aus zod: Nur dort ist jitless für die CSP gesetzt.'

   export default withNuxt(
     {
       rules: {
         'no-restricted-imports': ['error', {
           paths: [{ name: 'zod', message: ZOD_IMPORT_MESSAGE }],
           patterns: [{ group: ['zod/*'], message: ZOD_IMPORT_MESSAGE }],
         }],
       },
     },
     { files: ['**/shared/zod.ts'], rules: { 'no-restricted-imports': 'off' } },
   )
   ```
   Hat das Projekt schon eigene Einträge in `withNuxt(…)`, die beiden Objekte dazuschreiben. Typen ebenfalls über `z` nutzen (`z.infer`, `z.ZodType`), denn die Regel sperrt auch `import type … from 'zod'`. Mit dem Layer heißt der Pfad `@f7or7an/nuxt-base/shared/zod`.
6. **Formular-Handler** (Kontakt, Newsletter, Feedback, Buchung, Anmeldung, Antrag). Jedes Formular hat einen festen Namen (`^[a-z][a-z0-9-]{0,39}$`), derselbe im Browser und im Handler:
   ```ts
   import { defineEventHandler } from 'nuxt/server'
   import { rateLimit, readForm } from '../utils/security'

   export default defineEventHandler(async (event) => {
     rateLimit(event, 'contact', { max: 5, windowMs: 10 * 60 * 1000 })
     const data = await readForm(event, 'contact', contactSchema) // contactSchema aus shared/utils/schemas.ts, jedes Feld mit .max()
     if (!data) return { ok: true } // Honeypot: still Erfolg melden, nichts tun
     // … speichern / Mail senden
     return { ok: true }
   })
   ```
7. **Formular im Browser:** Honeypot-Markup wie bisher (`<input v-model="form.website" type="text" name="website" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true">`), dazu:
   ```ts
   const { getToken } = useFormToken('contact')
   async function submit() {
     const formToken = await getToken() // wartet ggf. bis 3 s nach dem Laden
     await $fetch('/api/contact', { method: 'POST', body: { ...form, [FORM_TOKEN_FIELD]: formToken } })
   }
   ```
   Fehler 400 mit `error.data.formToken` (`too-early`, `expired`, `invalid`, `missing`) bzw. `error.data.fieldErrors` am richtigen Ort anzeigen (`role="status"`, Feldfehler per `aria-describedby`). Eingaben dabei nie löschen.
8. **Login** ohne Honeypot und ohne Mindestzeit (WCAG 3.3.8), dafür zweimal Rate-Limit:
   ```ts
   rateLimit(event, 'login-ip', { max: 20, windowMs: 15 * 60 * 1000 })
   rateLimit(event, 'login-account', { max: 5, windowMs: 15 * 60 * 1000, key: email.toLowerCase() })
   // … nach erfolgreichem Login:
   resetRateLimit('login-account', email.toLowerCase())
   ```
   Zahlen sind Vorschläge; Praxisraum zählt nur Fehlversuche je Konto (`server/utils/two-factor.ts`) – dort beibehalten, wenn es das schon gibt.
9. **CSP** (`nuxt-security` ≥ 2.7.0):
   ```ts
   import { createSecurityConfig, IMAGE_ONERROR_HASH } from './csp'
   modules: ['nuxt-security', …],
   // B/C, erste Phase: beobachten (Header Report-Only, kein Meta-Tag)
   security: createSecurityConfig({ mode: 'server', reportOnly: true, scriptSrcAttrHashes: [IMAGE_ONERROR_HASH] }),
   // A (nuxt generate): nur Meta-Tag; frame-ancestors steht in der nginx.conf des Nginx-Containers
   security: createSecurityConfig({ mode: 'static', scriptSrcAttrHashes: [IMAGE_ONERROR_HASH] }),
   ```
   - `IMAGE_ONERROR_HASH` nur mit `@nuxt/image`; nach jedem `@nuxt/image`-Update Konsole prüfen.
   - Praxisraum: `connectSrc: ['wss://<livekit>', 'wss://<hocuspocus>']`.
   - `upgrade-insecure-requests` steht nur in der scharfen CSP: Im Report-Only-Header meldet Chrome die Direktive als Konsolenfehler, und Weglassen reicht nicht (nuxt-security setzt sie sonst als Standard), deshalb ausdrücklich `false` (Lösung aus Ortrud).
   - Nach der Beobachtungsphase ohne Verstöße `reportOnly` entfernen (scharf).
   - Gegenüber der Pilot-Konfiguration ergänzt: `default-src 'self'`, `connect-src`, `manifest-src`, `worker-src`; `script-src-attr 'none'` ohne Hashes.
10. **Tests:** `tests/unit/` und `vitest.config.ts` übernehmen (bzw. den Alias `nuxt/server` → Stub in die vorhandene Konfiguration einbauen), `npm test`.
11. **Fehlerlog:** `server/plugins/request-error-log.ts` und `server/utils/request-error-log.ts` kopieren. Gibt es im Projekt schon einen eigenen Nitro-Hook `error`, prüfen, dass er keine URL mit Token loggt.
    **Build-Test** (Pflicht, weil der Baustein am Zusammenspiel von Nitro-Hook und Nuxt-Fehler-Handler hängt und ein Update das unbemerkt ändern kann):
    - `error-log-test-env.ts` neben die `nuxt.config.ts`, `tests/build/` übernehmen.
    - `nuxt.config.ts`: `import { errorLogTestEnv } from './error-log-test-env'` und direkt nach `modules` `$env: errorLogTestEnv(),` (Kommentar: nur für `test:build`).
    - `package.json`: `"test:build": "nuxt build --envName error-log-baseline && nuxt build --envName error-log-test && node tests/build/error-log.mjs"`.
    - `.output-*` in `.gitignore` und `.dockerignore`.
    - Aufruf mit eigenem Port: PowerShell `$env:TEST_PORT=3456; npm run test:build` (ohne `TEST_PORT` gilt 3456). Verlangt die Startprüfung des Projekts weitere Variablen (SMTP, `NUXT_DATA_KEY` …), sie beim Aufruf bzw. im CI-Schritt mit Testwerten setzen, nie mit echten.
    - Im CI als eigener Schritt nach dem Build (`_bausteine/ci/ci.yml`).
    - Die Testrouten (`/__test/error-log/…`, Seite `/__test/error-log-page/:token`) gibt es nur in diesen beiden Builds, nie in `.output`. Im Docker-Build fehlt `tests/` (`.dockerignore`); die `nuxt.config.ts` lädt daraus nur, wenn `--envName` gesetzt ist.

## CSRF-Prüfung im Einzelnen

| Anfrage (POST/PUT/PATCH/DELETE) | Ergebnis |
|---|---|
| `Sec-Fetch-Site: cross-site` oder `same-site` | 403 |
| `Origin` = eigener Ursprung (Schema + Host + Port) | erlaubt |
| `Origin` fehlt oder `null`, aber `Sec-Fetch-Site: same-origin` | erlaubt (Fetch Metadata nach OWASP) |
| `Origin` fehlt oder `null`, ohne `Sec-Fetch-Site: same-origin` | 403 |
| anderer `Origin` (auch `https` statt `http` oder anderer Port) | 403 |

- **Warum `null` erlaubt sein muss:** `/newsletter/**` hat `referrer-policy: no-referrer` (`formulare-und-datenschutz.md`). Ein echtes `<form method="post">` sendet dort `Origin: null`, nach dem Fetch-Standard auch ein same-origin-`fetch`. Den Header `Sec-Fetch-Site` setzt nur der Browser; Seiten können ihn nicht fälschen. Werkzeuge wie curl können beides fälschen, haben aber keine Cookies der Person: Dagegen schützt CSRF nicht und muss es nicht.
- **Eigener Ursprung** = `new URL(runtimeConfig.public.siteUrl).origin`. Nur wenn `siteUrl` fehlt (und im Dev-Server): Schema und Host der Anfrage, das Schema hinter dem Proxy aus `X-Forwarded-Proto` (NPM übernimmt dafür auch einen vom Client gesendeten Wert; deshalb ist `NUXT_PUBLIC_SITE_URL` in Produktion Pflicht).
- Geprüft wird jeder Pfad, nicht nur `/api/**` (h3 dekodiert den Pfad fürs Routing, `/%61pi/…`).

## Fehlerlog (Nitro-Hook `error`)

Nitro schreibt bei unbehandelten Fehlern standardmäßig `[request error] [unhandled] [GET] <volle URL>` plus mehrzeiligen Stacktrace: kein JSON, und ein Token im Pfad (z. B. `/api/termine/<token>`) oder eine E-Mail in der Query steht im Log (Fund in Vogelperspektive). Der Baustein ersetzt das:

- **Eine JSON-Zeile** je Serverfehler (Status ≥ 500, `unhandled` oder `fatal`), z. B. `{"level":"error","scope":"request","status":500,"method":"GET","route":"/api/termine/:token","error":"TypeError","frames":["at …"]}`. Erwartete Fehler (4xx ohne `fatal`, z. B. Validierung) loggt der Baustein nicht, wie Nitro auch.
- **Ort ohne Token:** Hat die Route ein konkretes Muster (`/api/termine/:token`), steht nur das Muster im Log, kein Pfad. Bei Catch-all-Mustern (`/**`, darunter alle Vue-Seiten) und ohne Muster zusätzlich `path`: ohne Query und Fragment; jeder Wert aus `event.context.params` wird `[maskiert]`, ebenso jedes Segment, das nicht wie ein fester Routenteil aussieht (erlaubt sind nur höchstens 20 Kleinbuchstaben mit `-`/`_`, z. B. `api`, `_nuxt`; Ziffern, Großbuchstaben, `.`, `=`, `@`, `%` werden maskiert).
- **Grenze:** Parameter von Vue-Seiten (`pages/termine/[token].vue`) kennt Nitro nicht (Muster `/**`), dort gilt nur die Segmentregel. Ein Token aus höchstens 20 Kleinbuchstaben bliebe stehen. Die Tokens der Bausteine (base64url, Ziffern) sind nie so; eigene Tokens nicht so bauen.
- **Stack-Frames** im Feld `frames`: nur die Zeilen `at …` (ohne die erste Zeile mit der Meldung), höchstens 10, je höchstens 300 Zeichen; bei unbehandelten Fehlern die des eigentlichen Fehlers (`cause`). Die Fehlermeldung selbst kann Eingaben enthalten und steht nur im Dev-Modus im Log (Feld `message`).
- **Antwort an den Browser unverändert:** Nitro schreibt sein Log nur bei `unhandled`/`fatal`; in Produktion setzt der Hook beide auf `false`. `message` und `data` ändert er nur dort, wo Nitro bzw. Nuxt sie ohnehin nicht senden: bei unbehandelten Fehlern (JSON und HTML: „Server Error“ ohne `data`) und bei `fatal` mit JSON-Antwort. Bei `fatal` mit HTML-Antwort bleiben beide stehen, denn Nuxts Fehlerseite zeigt sie (z. B. `createError({ status: 404, message: 'Diese Seite gibt es nicht', fatal: true })` in einer Seite). JSON oder HTML entscheidet dieselbe Regel wie in Nitro/Nuxt (`isJsonErrorResponse`). Im Dev-Modus bleibt der Fehler unverändert.
- **Belegt im gebauten Server** durch den Build-Test (Schritt 11): Vergleichsbuild ohne das Plugin, Antworten müssen gleich sein.
- **Warum ein Hook statt `nitro.errorHandler`:** Ein eigener `errorHandler` ersetzt Nuxts Handler (Fehlerseite, JSON-Antwort); die Nuxt-Doku 4.x nennt keinen offiziellen Weg für Server-Fehler-Handler. Der Hook `error` läuft bei jedem Anfragefehler synchron vor dem Fehler-Handler (geprüft am Code von nitropack 2.13.6 und hookable 5.5.3, im Build bestätigt). Bei Nuxt 5 / Nitro 3 neu prüfen.

## Grenzen des Mindestzeit-Tokens

- Ein Token gilt nur für sein Formular (Formularname im HMAC), ist aber **mehrfach verwendbar**, solange es gültig ist (3 s bis 2 h nach Ausstellung). Ein Bot, der das Token holt und 3 s wartet, kommt durch; dagegen helfen Rate-Limit (je IP, IPv6 je /64) und Honeypot. Einmal-Tokens bräuchten Speicher auf dem Server und sind bewusst nicht gebaut (YAGNI); bei echtem Spam erst ALTCHA erwägen (`formulare-und-datenschutz.md`).
- Rate-Limit im Arbeitsspeicher: höchstens 10.000 Zähler, danach fallen die ältesten weg; Schlüssel auf 128 Zeichen gekürzt. Reicht für einen Container.
- **Restrisiko:** Ist der Speicher voll, kann jemand mit mehr als 10.000 IPv4-Adressen bzw. IPv6-/64-Netzen (z. B. ein Botnetz) fremde Zähler verdrängen und damit das Rate-Limit für einzelne Adressen zurücksetzen. Die Obergrenze schützt den Speicher, nicht gegen verteilte Angriffe. Dagegen helfen Honeypot und Mindestzeit weiter; bei Bedarf Rate-Limit zusätzlich im Proxy (NPM) oder ein Speicher mit Persistenz (wie Goras DB-Buckets).

## Gora (eigene Architektur, Stand 21.11.2026, nur gelesen)

- Gora leitet alle API-Aufrufe über einen h3-Handler (`server/api/gora/[...path].ts`: `handleApi(toWebRequest(event), runtimeContext(event))`) in einen eigenen, Nuxt-freien Kern (`server/core/`), der auch als Cloudflare Worker läuft. Geheimnis ist `GORA_HASH_SECRET` (`context.hashSecret`), Rate-Limits liegen in der DB (`limitKey`, Buckets), der Honeypot `website` ist schon da (`core/registrations.ts`), die Origin-Prüfung auch (`checkOrigin` in `core/security.ts`).
- **Nutzbar:** `server/utils/form-token-core.ts` und `shared/utils/form-protection.ts`. Sie hängen nur an Web Crypto, nicht an `nuxt/server`, und laufen in Node und im Worker. Schlüssel injizieren, nie `GORA_HASH_SECRET` direkt verwenden:
  ```ts
  const secret = await deriveFormTokenSecret(context.hashSecret, 'gora:form-token') // HKDF, eigener Zweck
  const token = await createFormToken(secret, 'registration', Date.now())          // Route im Kern, z. B. GET form-token
  const check = await checkFormToken(secret, 'registration', body.formToken, Date.now())
  if (!check.ok) fail(400, …)                                                        // Goras eigene Fehlerform
  ```
  Ohne `hashSecret` gilt Goras bestehende Regel (`requireHashSecret` → 503).
- **Nicht nutzbar:** `form-token.ts`, `security.ts` (`readForm`, `rateLimit`), `form-token.get.ts`, `origin.ts`: Sie brauchen ein `RequestEvent` aus `nuxt/server`. Goras Kern bekommt einen Web-`Request`, sein Handler ist ein h3-Handler; ihn auf `nuxt/server` umzustellen hieße, die Worker-Fähigkeit aufzugeben. Die `nuxt/server`-Regel bleibt unverändert: Gora mischt keine `nuxt/server`-Helfer in seinen h3-Handler. Rate-Limit macht Gora weiter in der DB.
- **Hinweis für Gora:** `checkOrigin` lehnt `Origin: null` ab. Für Seiten mit `referrer-policy: no-referrer` dieselbe Regel wie oben übernehmen (`null`/fehlend nur mit `Sec-Fetch-Site: same-origin`). Gehört in Goras `STANDARDS-AUDIT.md`.

## Geprüft (21.11.2026, Testprojekt Nuxt 4.6.4 / nuxt-security 2.7.0 / zod 4.6.7 / Vitest 5.1.0, Port 3466)

- `npm test`: 70 Tests grün; lint, typecheck und Build grün (Testprojekt und Layer `nuxt-base`, zuletzt 25.11.2026 nach Prüfrunde 4).
- Gebauter Server ohne `NUXT_APP_SECRET`: Start bricht mit Exit-Code 1 und Log-Zeile `fatal/startup` ab. Mit Schlüssel und `NUXT_PUBLIC_SITE_URL`:
  - Token `v1.1800000000000.A` → 400 (vorher 500 mit Stack-Trace); Token eines anderen Formulars → 400 `invalid`; `/api/form-token` ohne `form` → 400; passendes Token nach 3 s → 200.
  - `Origin: null` + `Sec-Fetch-Site: same-origin` → 200 (JSON und form-urlencoded); ohne Origin + same-origin → 200; `null` ohne Sec-Fetch-Site → 403; ohne beide → 403; `https://…` gegen `http`-siteUrl → 403; gefälschter Host mit passendem Origin → 403.
  - CSP scharf mit `upgrade-insecure-requests`; Report-Only-Header ohne die Direktive. Browser (Report-Only und scharf): Kontaktformular mit zod-Schema im Browser, keine CSP-Meldung, keine Konsolenfehler.
- Ältere Prüfungen (unverändert gültig): Honeypot 200 still, leeres Pflichtfeld 400 mit `fieldErrors`, 6. Anfrage 429 mit `Retry-After`, `/%61pi/contact` mit fremdem Origin 403; vorgerenderte Seite mit sha256-Hashes, SSR-Seite mit Nonce; Modus `static` mit Meta-Tag ohne `frame-ancestors`.
- Echtes `<form method="post">` von einer Seite mit `referrer-policy: no-referrer`: belegt durch den Prüfer (Runde 2, Headless-Chrome per CDP, Skript `scratchpad/phase2/bausteine/pruefung/cdp-origin2.mjs`; geprüft werden auch `fetch`-POST von derselben Seite und die CSP mit und ohne zod `jitless`).
- Startprüfung (24.11.2026, gebauter Server, Testprojekt und Layer): ohne `NUXT_PUBLIC_SITE_URL` bzw. mit `http://example.org` Exit 1 mit Grund im Log; mit `https://example.org` und `http://127.0.0.1:3466` startet der Server; fehlen Schlüssel und Adresse, stehen beide Gründe im Log.
- **zod im Server-Bundle und Fehlerlog (24.11.2026, frisches Testprojekt `_phase2/bausteine/testapp`, gebauter Server, Skript `_phase2/bausteine/tools/check-built-server.mjs`):**
  - Vergleichsbuild ohne die beiden neuen Plugins: `.max()`-Verstoß → „Too big: expected string to have <=20 characters“; im Log `[request error]`, Token, E-Mail aus der Query und Stacktrace. In `.output/server/chunks` kein `jitless`.
  - Mit den Plugins: „Zu groß: erwartet, dass string <=20 Zeichen hat“; `jitless` und `locales.de` in `chunks/_/nitro.mjs`. Log: je eine JSON-Zeile für die API-Route (`route` `/api/termine/:token`) und für einen SSR-Fehler auf `/fehler/<token>` (`route` `/**`); kein Token, keine E-Mail, kein `[request error]`, kein Stacktrace. Antworten in beiden Builds gleich: API 500 mit `statusMessage`/`message` „Server Error“ ohne `data`, Seite 500 ohne Stacktrace und ohne Fehlermeldung.
  - Dev-Server (vor Prüfrunde 4): JSON-Zeile mit Stacktrace. Seit Runde 4 im Dev-Modus Feld `message`, `frames` immer; nur per Unit-Test geprüft, Dev-Server nicht erneut gestartet.
  - Browser (Headless-Chrome per CDP, `tools/cdp-zod-client.mjs`, scharfe CSP): Im Client-Bundle steht `configureZod()` vor dem ersten Schema; das Formular zeigt bei zu langem Namen „Fehler: Zu groß: erwartet, dass string <=20 Zeichen hat“, keine CSP-Meldung, keine Konsolenausgabe.
  - Layer-Spielwiese gebaut: `/api/demo` mit 101 Zeichen → deutscher Text. Fehlerlog dort seit Runde 4 per Build-Test (nächster Punkt); die Testroute `/api/fehler/<token>` ist entfallen.
- **Build-Test `npm run test:build` (24./25.11.2026, Prüfrunde 4, Testprojekt und Layer-Spielwiese, Port 3466):** 11 Fälle, je Fall Vergleich mit dem Build ohne Plugin: unbehandelt (JSON), Token im Pfad (23 Zeichen mit E-Mail in der Query, `v1.1800000000000.abcDEF`, Base64 mit `=`, kurz `a1b2c3`), `fatal` 422 als JSON und als HTML, 503 mit `data`, 400 (kein Log), Seite `fatal` 404 (HTML, Token im Pfad), Seite unbehandelt (HTML). Ergebnis: Antworten gleich (HTML ohne Nonce und `buildId` verglichen), je Fall genau die erwartete Zahl JSON-Zeilen, kein `[request error]`, keine Zeile `at …` außerhalb des JSON, keine Meldung, E-Mail oder Token im Log. Gegenprobe 1: Der Vergleichsbuild loggt `[request error]` (prüft der Test selbst). Gegenprobe 2: Mit dem alten Verhalten (`fatal` immer neutralisiert) schlägt der Test fehl (fatal 422 HTML, Seite fatal 404 HTML).
- Nicht geprüft: hinter dem echten Proxy (Nginx Proxy Manager: Host-Header, `X-Forwarded-For`/`-Proto`, Trust-Kette der Real-IP, `SERVER.md` 2.5), Gora-Einbau.

## Änderungen 21.11.2026 (nach Prüfung)

`origin.ts` (null-Origin mit same-origin, Vergleich mit siteUrl-Ursprung, `same-site` → 403), `form-token-core.ts` (neu; Längen- und Zeichenprüfung vor dem Dekodieren, Formularname im HMAC, `deriveFormTokenSecret`), `form-token.ts` (injizierbares Geheimnis, neutrale 503, `formTokenSecretProblem`), Startprüfung (neu), `form-token.get.ts` und `useFormToken` (Parameter `form`), `security.ts` (IPv6 /64, höchstens 10.000 Zähler, Schlüssel gekürzt, `readForm(event, form, schema)`), `csp.ts` (`upgrade-insecure-requests` nur scharf), `shared/zod.ts` (neu), `form-protection.ts` (`FORM_NAME_PATTERN`), Tests.

## Änderungen 24.11.2026 (nach Freigabe, Soll-Punkte des Prüfers)

Startprüfung umbenannt in `server/plugins/security-startup-check.ts` (vorher `form-token-check.ts`) und um `NUXT_PUBLIC_SITE_URL` erweitert (`server/utils/site-url.ts`, Tests `site-url.test.ts`); ESLint-Vorlage gegen direkte zod-Importe; Restrisiko des Rate-Limit-Speichers benannt; Browser-Beleg für `Origin: null` eingetragen. `tests/unit/security.test.ts` importiert `z` aus `shared/zod`.

## Änderungen 24.11.2026 (Befunde aus Vogelperspektive)

- `shared/zod.ts`: Einstellungen in `configureZod()` (jitless + deutsche Fehlertexte), beim Import aufgerufen; neu `server/plugins/zod-config.ts`, das sie im Server beim Start einspielt (Nitro verwarf den Aufruf im Server-Bundle). Tests `zod-config.test.ts`.
- Neu `server/plugins/request-error-log.ts` + `server/utils/request-error-log.ts`: JSON-Fehlerlog ohne Token, Stacktrace nur im Dev-Modus, Antwort unverändert. Tests `request-error-log.test.ts`.

## Änderungen 25.11.2026 (Prüfrunde 4, Fehlerlog)

- **Muss:** `silenceDefaultErrorLog(error, jsonResponse)` neutralisiert `message`/`data` nur noch bei `unhandled` oder JSON-Antwort; bei `fatal` als HTML bleiben sie stehen (vorher zeigte Nuxts Fehlerseite „Server Error“ statt der eigenen Meldung). Neu `isJsonErrorResponse` (Regel aus Nuxt/Nitro).
- **Sollte:** Bei konkretem Routenmuster nur das Muster loggen; sonst Pfad mit maskierten `params`-Werten und enger Segmentregel (statt „ab 16 Zeichen“). Stack-Frames (`frames`, ≤ 10, ohne Meldung) auch in Produktion; Meldung nur im Dev-Modus.
- **Sollte:** Build-Test gegen den gebauten Server: `error-log-test-env.ts`, `tests/build/`, Skript `test:build`, CI-Schritt in `_bausteine/ci/ci.yml` und im Layer.
- Tests `request-error-log.test.ts` neu gefasst (70 Unit-Tests insgesamt).
