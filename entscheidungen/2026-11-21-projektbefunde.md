# Projektbefunde für Phase 2 (gesammelt beim Schreiben der Richtlinien, 21.11.2026)

## Alle Projekte
- Node 26 + npm 12, `.npmrc` min-release-age=14, Renovate, Mindestversionen, TS ~6.0, Projekt-CLAUDE.md nach Vorlage, STANDARDS-AUDIT.md gegen neue Regeln neu prüfen.
- Lokal: Node 24.13 / npm 11.6.2 → Node 26 + npm 12 (Florian).

## FlowTech
- `package-lock.json` passt nicht zur package.json (`npm ci`: Missing @emnapi/core@1.11.3).
- Notbehelf `vite.vue.script.fs` entfernen (Pilot: nicht nötig).

## Vogelperspektive (Website)
- `server/utils/crypto.ts` ohne AAD/Schlüsselversion (5.10).
- `createError({ statusCode })` → `status`.
- `session.name: 'vp-session'` – mit nuxt-auth-utils 0.6 prüfen (Cookie heißt dort `nuxt-auth-session`).
- One-Click-Unsubscribe (`List-Unsubscribe-Post`) braucht Ausnahme in der CSRF-Middleware.

## Praxisraum
- Migrationsroutine liest `drizzle/meta/_journal.json` → bricht mit Drizzle 1.0 (kein journal mehr).
- nuxt-auth-utils 0.5.33 → ≥ 0.6 (`NUXT_APP_SECRET`).
- Eigenes Caddy-Snippet (Kamera/Mikrofon, wss für LiveKit/Hocuspocus).

## Gora
- Eigene Routen für sitemap/robots → `@nuxtjs/sitemap` + `@nuxtjs/robots` (mehrsprachig).
- `public/images/sources.json` ohne Feld für Nutzungsrecht.
- `webapp/CLAUDE.md` mit `@AGENTS.md` als erster Zeile (AGENTS.md wird heute nicht gelesen). AGENTS.md und docs/* haben fremde Änderungen → nicht anfassen außer lesen.

## Ortrud
- `@nuxt/fonts` auf `provider: 'npm'` umstellen (statt Google).

## Nachträge aus Prüfrunde 1
- Alle: kein Projekt hat `npm run lint`/eslint.config; FlowTech und Ortrud ohne `typecheck` → Audit-Punkte.
- Alle mit Dark Mode (FlowTech u. a.): `@nuxtjs/color-mode` durch eigenen Umschalter ersetzen (schreibt sonst ohne Klick in den Speicher).
- Praxisraum: `server/middleware/origin.ts` lässt Anfragen ohne Origin durch → 403 + kommentierte Ausnahme `/api/internal`.
- Praxisraum: localStorage (`useAppPreferences.ts`, `board/engine/quality.ts`) → Einstellungen ins Benutzerkonto; `guestId` in sessionStorage ok (in DSE nennen); Zeitstempel in sessionStorage (`mein-bereich/material/[id].vue`) prüfen.
- Praxisraum: eigener Server (Beschluss 13.1) → Verbindung zur Website nicht mehr über `vogelperspektive-intern`, sondern WireGuard/authentifizierte API; compose/Netze anpassen.
- Gora: `work/`, `outputs/` aufräumen; Gora nutzt eigene Session-Tabelle statt nuxt-auth-utils → als Abweichung in Gora-CLAUDE.md prüfen; Gora-AGENTS.md sagt „Sitemap/robots mit Bordmitteln“ und „Projektentscheidungen haben Vorrang“ → mit Florian/Gora-Team klären (Konflikt mit 7.1).
- Ortrud: Schriften Pinyon Script (kein Variable-Paket) und Cormorant kursiv, heute `provider: 'google'` → @fontsource-Pakete + npm-Provider.
- Vogelperspektive: `server/api/newsletter/unsubscribe.get.ts` neben `.post.ts` → prüfen, ob GET etwas ändert (keine zustandsändernden GET).
- FlowTech: dogado-Deploy-Befehl (tar über SSH nach `flow-techorg`) in die neue FlowTech-CLAUDE.md eintragen (SERVER.md verweist darauf).
- Praxisraum: `room/GuestEntry.vue`, `useFollow.ts` (sessionStorage), `board/engine/quality.ts` (localStorage), `EmailLinkRequest.vue` gegen Grundsatz 3/13.2 prüfen.
