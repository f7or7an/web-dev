---
paths:
  - "**/Dockerfile"
  - "**/.dockerignore"
  - "**/compose*.yml"
  - "**/deploy/**"
  - "**/*.caddy"
  - "**/Caddyfile"
  - "**/*entrypoint*"
  - "**/server/api/health*"
---

# Container und Deployment (projektseitig)

Stand 21.11.2026. Vorlagen für die Dateien im Projekt-Repo, Modus B und C. GitHub-Actions-Workflow: `WebSites/.claude/rules/ci-workflow.md`. Serverseite (Caddy-Snippets, Netze anlegen, Komodo, Backups, Schlüssel, Praxisraum-Server): `WebSites/SERVER.md`. Prüfschritte vor dem Deployment: `WebSites/.claude/rules/tests-und-qualitaet.md`. Platzhalter: `<name>` = Projektname = Containername, `<domain>` = Hauptdomain.

## Grundregeln

- Der Server baut nichts. GitHub Actions baut das Image und legt es als `ghcr.io/f7or7an/<name>:<git-sha>` ab (privat). Rückweg = vorigen SHA deployen.
- Basis-Image `node:26-slim` (Debian, glibc) mit **vollem Versions-Tag und Digest** (`node:26.13.1-slim@sha256:…`), Renovate aktualisiert beides (Regeln in `WebSites/.claude/rules/abhaengigkeiten-und-layer.md`). Nicht Alpine: Node stuft musl als „Experimental“ ein (nodejs/node `BUILDING.md`). Optional Docker Hardened Images (`dhi.io/node:26`).
- Build-Stage mit npm ≥ 12.2.2 (Node 26 bringt npm 11 mit) und `npm ci`. Nicht freigegebene Installationsskripte von Abhängigkeiten sind ein Fehler (`strict-allow-scripts`). Freigaben in `package.json` → `allowScripts`.
- Token für das private Layer-Paket `@f7or7an/nuxt-base` (sobald veröffentlicht; bis dahin `_bausteine/`) nur als Build-Secret: nie per `ARG`/`ENV`, nie in einer Image-Schicht, nie in der `.npmrc` im Repo.
- Laufzeit nur `.output`, User `node`, `CMD` in Exec-Form direkt auf Node (nie `npm start`: npm leitet SIGTERM nicht sauber weiter). Healthcheck mit Node selbst, slim hat weder curl noch wget.
- Keine `ports:` im App-Stack (Docker umgeht ufw). Auf dem Webserver veröffentlicht ausnahmslos nur Caddy Ports. Einzige Ausnahme überhaupt: die LiveKit-Medien-Ports im Praxisraum-Stack auf dem Praxisraum-Server (`SERVER.md` 2.14), nie entfernen. Debug nur `127.0.0.1:<port>:3000`, danach entfernen.
- Eigenes Netz `<name>-proxy` (extern, auf dem Server angelegt), kein gemeinsames Netz `web`: Ein fremder Container könnte sich dort den Alias `<name>` geben.
- Daten nur in `/app/.data` (Volume). Dateisystem sonst schreibgeschützt.

## Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
# Vorlage: WebSites/.claude/rules/container-und-deployment.md (21.11.2026)
# Tag + Digest pflegt Renovate (Digest-Updates nach 3 Tagen, neue Versionen nach 14)

# --- Build ---
FROM node:26.13.1-slim@sha256:<digest> AS build
# renovate: datasource=npm depName=npm
ARG NPM_VERSION=12.2.2
ENV NUXT_TELEMETRY_DISABLED=1 \
    npm_config_strict_allow_scripts=true
# Node 26 bringt npm 11 mit; npm 12 prüft allowScripts (Pilottest 21.11.2026)
RUN npm install -g npm@${NPM_VERSION}
WORKDIR /app
# Quellcode vor npm ci: postinstall (nuxt prepare) braucht ihn, und der Build verhält sich wie die CI
COPY . .
# Token nur während dieses Schritts als Datei; ohne Layer-Paket die --mount-Zeile weglassen
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci
RUN npm run build

# --- Laufzeit: nur die gebaute App ---
FROM node:26.13.1-slim@sha256:<digest>
# HOST=0.0.0.0: im Container nötig, damit Caddy die App erreicht.
# Die Regel „Dev-Server nie mit --host“ betrifft nur nuxt dev auf dem eigenen Rechner.
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
# Gehört root, für node nur lesbar; beschreibbar ist nur /app/.data
COPY --from=build /app/.output ./.output
RUN mkdir -p /app/.data && chown node:node /app/.data
USER node
VOLUME ["/app/.data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", ".output/server/index.mjs"]
```

- `NPM_VERSION` steht als `ARG` mit `renovate:`-Kommentar davor, damit Renovate sie über den `customManagers`-Eintrag des gemeinsamen Presets findet; sonst veraltet sie stillschweigend. Der Name muss auf `_VERSION` enden.
- `NODE_OPTIONS=--disable-warning=ExperimentalWarning` entfällt (`node:sqlite` ist ab Node 24.15/26 „Release candidate“).
- Werte, die beim Build eingebacken werden (z. B. `NUXT_PUBLIC_SITE_URL` für Canonical), als `ARG` mit Standardwert, nie Geheimnisse.
- `npm_config_strict_allow_scripts` setzt die npm-Einstellung `strict-allow-scripts` per Umgebungsvariable (allgemeiner npm-Mechanismus; der Schalter war nicht Teil des Pilottests → beim ersten Build prüfen, dass ein nicht freigegebenes Skript den Build abbricht).
- Kein Entrypoint-Skript für Migrationen oder Start (siehe unten).
- `.dockerignore` mindestens: `node_modules`, `.nuxt`, `.output`, `.data`, `.git`, `.env`, `.env.*` mit `!.env.example`, `*.log`, `tests`. Sonst gelangen Geheimnisse und lokale Daten über `COPY . .` ins Build-Stage.

## compose.yml

```yaml
# Stack <name> ohne Proxy (SERVER.md 2.4–2.7). Caddy erreicht die App über das Netz <name>-proxy.
# Komodo setzt TAG (Git-SHA) und für Staging STACK=<name>-staging.
services:
  app:
    image: ghcr.io/f7or7an/<name>:${TAG:?TAG fehlt (Git-SHA des Images)}
    container_name: ${STACK:-<name>}          # = Hostname in deploy/<domain>.caddy
    restart: unless-stopped
    init: true                                # leitet Signale weiter, räumt Zombie-Prozesse ab
    env_file: .env                            # bzw. Variablen aus Komodo
    volumes:
      - /srv/apps/${STACK:-<name>}/data:/app/.data
    networks: [proxy]
    read_only: true
    tmpfs:
      - /tmp:size=64m,mode=1777
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    mem_limit: 512m                           # Einschätzung: B 512m, C 1g
    cpus: "1.0"
    pids_limit: 256
    stop_grace_period: 35s                    # Nitro wartet bis 30 s (NITRO_SHUTDOWN_TIMEOUT)
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "3" }
networks:
  proxy:
    name: ${STACK:-<name>}-proxy
    external: true
```

- Kein `build:` (der Server baut nicht), kein `ports:` (einzige Ausnahme siehe Grundregeln) und kein `docker.sock`.
- Bei `mem_limit` ab 1 GB den Node-Heap darunter halten: `environment: { NODE_OPTIONS: --max-old-space-size=768 }` (Muster Praxisraum).
- Datenaustausch mit einem anderen Stack auf demselben Server nur über ein eigenes `internal`-Netz mit festen Adressen, eingetragen in `SERVER.md` 2.4. Über Servergrenzen (Website ↔ Praxisraum) über WireGuard und die interne Caddy-Schnittstelle (`SERVER.md` 2.15), nie über ein veröffentlichtes App-Port.
- Lokal testen (selten nötig): `docker build --secret id=npmrc,src=$HOME/.npmrc -t ghcr.io/f7or7an/<name>:local .`, `docker network create <name>-proxy`, dann `TAG=local docker compose up`.

## Healthcheck `/api/health`

```ts
// server/api/health.get.ts – für Docker-Healthcheck und Uptime Kuma
import { createError, defineEventHandler } from 'nuxt/server'

// pingDb: eigene Funktion aus server/utils (darf auto-importiert sein),
// z. B. rawDb().prepare('SELECT 1').get() nach den Migrationen
export default defineEventHandler(async () => {
  try { await pingDb() }
  // Einzelheiten nur ins Server-Log, nie in die öffentliche Antwort
  catch { throw createError({ status: 503, message: 'Dienst nicht bereit.' }) }
  return { ok: true }
})
```

- Prüft Datenbank und Migrationen (in Modus C auch, ob `NUXT_DATA_KEY` zu den Daten passt, Muster Praxisraum). Keine Anmeldung, keine Daten in der Antwort, `/api/**` mit `cache-control: no-store`.
- Regel zu `nuxt/server` (Fehler NUXT_E8012): Wer Helfer aus `nuxt/server` nutzt, definiert den Handler mit `defineEventHandler` aus `nuxt/server`. Eigene `server/utils` und Nitro-Bordmittel, die `nuxt/server` nicht exportiert (`defineNitroPlugin`, `useStorage` …), bleiben auto-importiert. Deutsche Meldung in `message`, `statusText` nur ASCII. Details: `WebSites/.claude/rules/server-und-sicherheit.md`.

## Migrationen beim Start

- Drizzle-Migrationen laufen beim App-Start in einem Nitro-Plugin (`defineNitroPlugin`, auto-importiert), nicht in einem Entrypoint-Skript und nicht beim ersten Zugriff. Eine Instanz pro App → keine Race-Condition. In den Server-Build einbetten: `nitro.serverAssets: [{ baseName: 'migrations', dir: '../drizzle' }]`. Jede Migration in einer Transaktion, ihr Name in der Fehlermeldung.
- Scheitert eine Migration (oder fehlt ein Pflichtwert aus `.env`), meldet das Plugin den Grund auf Deutsch und beendet den Prozess mit `process.exit(1)`. Docker startet neu, `/api/health` wird nie grün, das Log zeigt den Grund. Im Dev-Betrieb nur melden.
- Vorlage: Praxisraum `server/utils/db.ts` (`migrate()`) und `server/plugins/startup-check.ts`.
- Vor dem Deploy legt der Server einen SQLite-Snapshot an (`SERVER.md` 2.7). Migrationen nur additiv (Spalten mit Standardwert, neue Tabellen), damit der vorige SHA auf der neuen Datenbank weiterläuft. Geht das nicht, steht es als Kommentar in der Migration, und der Rückweg braucht den Snapshot.

## Caddy-Datei pro Projekt

`deploy/<domain>.caddy`, wird nach `/srv/proxy/sites/` kopiert. Snippets `app`, `app-media`, `static`, `security`, `staging` stehen im zentralen Caddyfile (`SERVER.md` 2.5). Vor Einsatz `caddy validate`.

```caddy
# deploy/<domain>.caddy – Modus B/C, nach /srv/proxy/sites/ kopieren (SERVER.md 2.5)
<domain> {
	@internal path /api/internal/*
	respond @internal 404        # nur wenn die App interne Routen hat; die gehen über SERVER.md 2.15
	import app <name>
}
www.<domain> {
	redir https://<domain>{uri} permanent
}
```

- Genau ein Snippet pro Site: `app`, `app-media` oder `static`, nie `security` und `security-media` gemischt (sonst zwei `Permissions-Policy`).
- **Modus A:** `import static <domain>` statt `import app` (setzt auch `frame-ancestors` per Header, weil der CSP-Meta-Tag es nicht kann).
- **Staging:** zweiter Block `<name>.staging.flow-tech.org` mit `import staging` und `import app <name>-staging`.
- **Uploads:** `import app` begrenzt jeden Body auf 1 MB. Mit Upload-Route den Block ausschreiben und nur dort mehr erlauben (Vorlage in `SERVER.md` 2.5).
- **Kamera/Mikrofon (Praxisraum):** `import app-media <name>`; die `wss:`-Adressen von LiveKit und Hocuspocus stehen in der CSP der App (`connect-src`).
- Keine CSP in B/C (kommt samt `frame-ancestors` aus der App, `WebSites/.claude/rules/server-und-sicherheit.md`) und keine Cache-Header für `/_nuxt` (setzt Nitro).
- Kommentar am Dateianfang: wohin kopieren, welches Snippet, jede Abweichung mit Grund (Beispiel Gora: eigener Header-Block, HSTS ohne `includeSubDomains`, weil die DNS-Zone bei Wix liegt). Abweichungen zusätzlich in die Tabelle „Abweichungen“ der Projekt-`CLAUDE.md`.
