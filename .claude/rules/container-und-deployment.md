---
paths:
  - "**/Dockerfile"
  - "**/.dockerignore"
  - "**/compose*.yml"
  - "**/compose*.yaml"
  - "**/deploy/**"
  - "**/nginx.conf"
  - "**/*.caddy"
  - "**/Caddyfile"
  - "**/*entrypoint*"
  - "**/server/api/health*"
---

# Container und Deployment (projektseitig)

Stand 21.11.2026, ergänzt 27.11.2026 (Webserver: Nginx Proxy Manager statt Caddy). Vorlagen für die Dateien im Projekt-Repo, Modus B und C, dazu der Nginx-Container für Modus A. GitHub-Actions-Workflow: `WebSites/.claude/rules/ci-workflow.md`. Serverseite (NPM, Header-Soll, Netze, Arcane, Backups, Schlüssel, Praxisraum-Server): `WebSites/SERVER.md`. Prüfschritte vor dem Deployment: `WebSites/.claude/rules/tests-und-qualitaet.md`. Platzhalter: `<name>` = Projektname (= Image-Name), `<stack>` = `<name>-staging` bzw. `<name>-live` (= Arcane-Projekt = Containername = Hostname für NPM), `<domain>` = Hauptdomain.

## Grundregeln

- Der Server baut nichts. GitHub Actions baut das Image und legt es als `ghcr.io/f7or7an/<name>:<git-sha>` ab (privat). Arcane zieht es per Digest (`IMAGE_DIGEST`), erst Staging, dann Live mit demselben Digest. Rückweg = vorigen Digest deployen (`SERVER.md` 2.7).
- Basis-Image `node:26-slim` (Debian, glibc) mit **vollem Versions-Tag und Digest** (`node:26.13.1-slim@sha256:…`), Renovate aktualisiert beides (Regeln in `WebSites/.claude/rules/abhaengigkeiten-und-layer.md`). Nicht Alpine: Node stuft musl als „Experimental“ ein (nodejs/node `BUILDING.md`). Optional Docker Hardened Images (`dhi.io/node:26`).
- Build-Stage mit npm ≥ 12.2.2 (Node 26 bringt npm 11 mit) und `npm ci`. Nicht freigegebene Installationsskripte von Abhängigkeiten sind ein Fehler (`strict-allow-scripts`). Freigaben in `package.json` → `allowScripts`.
- Token für das private Layer-Paket `@f7or7an/nuxt-base` (sobald veröffentlicht; bis dahin `_bausteine/`) nur als Build-Secret: nie per `ARG`/`ENV`, nie in einer Image-Schicht, nie in der `.npmrc` im Repo.
- Laufzeit nur `.output`, User `node`, `CMD` in Exec-Form direkt auf Node (nie `npm start`: npm leitet SIGTERM nicht sauber weiter). Für `NUXT_DATA_KEY` gibt es einen Entwurf der Server-Session mit Start-Wrapper (lädt den Schlüssel aus einer eingebundenen Datei, dann `exec node`; `SERVER.md` 2.10): noch keine Vorlage, vor Einsatz testen. Healthcheck mit Node selbst, slim hat weder curl noch wget.
- Keine `ports:` im App-Stack (Docker umgeht ufw). Auf dem Webserver veröffentlicht ausnahmslos nur Nginx Proxy Manager (NPM) Web-Ports. Einzige Ausnahme überhaupt: die LiveKit-Medien-Ports im Praxisraum-Stack auf dem Praxisraum-Server (`SERVER.md` 2.14), nie entfernen. Debug auch ohne `ports:`: per SSH-Tunnel zu einer privaten Route oder per Test aus dem Docker-Netz (`SERVER.md` 2.2).
- Eigenes Netz `<stack>-proxy` je Staging- und Live-Stack (`external: true`, auf dem Server angelegt, NPM angehängt), kein gemeinsames Netz `web`: Ein fremder Container könnte sich dort den Alias `<stack>` geben. Die App hängt nur in diesem Netz.
- Daten nur in `/app/.data` (Volume `/srv/apps/<stack>/data`). Dateisystem sonst schreibgeschützt.

## Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
# Vorlage: WebSites/.claude/rules/container-und-deployment.md (27.11.2026)
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
# HOST=0.0.0.0: im Container nötig, damit der Proxy (NPM) die App erreicht.
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
- Werte, die beim Build eingebacken werden (z. B. `NUXT_PUBLIC_SITE_URL` für Canonical vorgerenderter Seiten), als `ARG` mit Standardwert, nie Geheimnisse. `NUXT_PUBLIC_SITE_URL` zusätzlich zur Laufzeit je Stack setzen (CSRF und Startprüfung lesen sie zur Laufzeit; Staging `https://<name>.staging.flow-tech.org`, `SERVER.md`).
- `npm_config_strict_allow_scripts` setzt die npm-Einstellung `strict-allow-scripts` per Umgebungsvariable (allgemeiner npm-Mechanismus; der Schalter war nicht Teil des Pilottests → beim ersten Build prüfen, dass ein nicht freigegebenes Skript den Build abbricht).
- Kein Entrypoint-Skript für Migrationen oder Start (siehe unten).
- `.dockerignore` mindestens: `node_modules`, `.nuxt`, `.output`, `.data`, `.git`, `.env`, `.env.*` mit `!.env.example`, `*.log`, `tests`. Sonst gelangen Geheimnisse und lokale Daten über `COPY . .` ins Build-Stage.

## compose.yml

```yaml
# Stack <stack> ohne Proxy (SERVER.md 2.4–2.7). NPM erreicht die App über das Netz <stack>-proxy
# unter http://<stack>:3000. Arcane setzt IMAGE_DIGEST (sha256:… des geprüften Images; der SHA-Tag
# ist nur der Veröffentlichungsname in GHCR). Den Stacknamen trägt der Generator der Server-Session fest ein.
services:
  app:
    image: ghcr.io/f7or7an/<name>@${IMAGE_DIGEST:?IMAGE_DIGEST fehlt (sha256:… des geprüften Images)}
    container_name: ${STACK:-<name>}          # = Hostname im NPM-Ziel
    restart: unless-stopped
    init: true                                # leitet Signale weiter, räumt Zombie-Prozesse ab
    env_file: .env                            # .env im Arcane-Projekt, chmod 600
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
- Image **nur** per `@${IMAGE_DIGEST:?…}`, kein Tag. `${STACK:-<name>}` an genau drei Stellen (Containername, Datenpfad, Netzname). Arcane setzt kein `STACK`: Der Generator der Server-Session macht daraus `<name>-staging` bzw. `<name>-live` und schreibt die Arcane-Ausgabe mit Digest und festem Stacknamen. Daten je Stack unter `/srv/apps/<stack>/data` (→ `/app/.data`), Besitzer UID 1000.
- Das Installationsskript der Server-Session stoppt, wenn eine vorhandene Arcane-Compose abweicht: Änderungen an dieser Datei gezielt mit der Server-Session abgleichen.
- Healthcheck: `HEALTHCHECK` aus dem Dockerfile (`/api/health`). Das Anbindeskript der Server-Session hängt NPM erst an, wenn der Container `healthy` ist und keine `ports:` hat.
- Bei `mem_limit` ab 1 GB den Node-Heap darunter halten: `environment: { NODE_OPTIONS: --max-old-space-size=768 }` (Muster Praxisraum).
- Datenaustausch mit einem anderen Stack auf demselben Server nur über ein eigenes `internal`-Netz mit festen Adressen, eingetragen in `SERVER.md` 2.4. Über Servergrenzen (Website ↔ Praxisraum) über WireGuard und die interne Schnittstelle (`SERVER.md` 2.15, auf dem Webserver mit NPM noch offen), nie über ein veröffentlichtes App-Port.
- Lokal testen (selten nötig): `docker build --secret id=npmrc,src=$HOME/.npmrc -t ghcr.io/f7or7an/<name>:local .`, `docker network create <name>-proxy`, für den Test die Image-Zeile vorübergehend auf `ghcr.io/f7or7an/<name>:local` setzen (nicht committen), dann `docker compose up`.

## Healthcheck `/api/health`

```ts
// server/api/health.get.ts – für Docker-Healthcheck und externes Monitoring
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

## Proxy-Beschreibung pro Projekt (Nginx Proxy Manager)

Auf dem Webserver gibt es keine Proxy-Datei zum Kopieren: Die Proxy-Hosts legt man in der NPM-Oberfläche an (`SERVER.md` 2.5). Das Projekt-Repo hält fest, was dort einzutragen ist, damit es versioniert und prüfbar bleibt:

- `deploy/<domain>.npm.md`: je Host (Live, `www`, Staging) Domain, Ziel (`http://<name>-live:3000` bzw. `http://<name>-staging:3000`), Netz `<stack>-proxy`, SSL- und HSTS-Schalter (`includeSubDomains` ja/nein mit Grund), `www` → Hauptdomain, Staging mit Zugriffsschutz und `X-Robots-Tag: noindex, nofollow`.
- `deploy/<domain>.advanced.conf`: Inhalt des Advanced-Felds (nginx-Syntax), nur was nicht schon im gemeinsamen Hook `server_proxy.conf` steht. Für Redirection-Hosts (`www`, Zweitdomain) gilt `server_redirect.conf` und deren eigenes Advanced-Feld. **Soll-Vorlage**, nicht geprüft: NPM setzt in `location /` selbst `add_header X-Served-By`, deshalb erreichen server-weite `add_header` wie unten die normalen Antworten nicht (`SERVER.md` 2.5). Wo die Header stehen, legt die Server-Session fest; maßgeblich ist die Prüfung per GET. Beispiel Modus B/C:

```nginx
# deploy/<domain>.advanced.conf – Advanced-Feld des NPM-Proxy-Hosts <domain> (SERVER.md 2.5)
# Soll-Vorlage: Header-Soll aus SERVER.md 2.5, jeder mit always (auch 404/5xx), keiner doppelt.
# Achtung: wirkt nicht in NPMs location / (eigenes add_header X-Served-By) – Ort mit der Server-Session klären.
add_header X-Frame-Options "DENY" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-site" always;

# nur wenn die App interne Routen hat; die gehen über SERVER.md 2.15 (exakt + Präfix)
location = /api/internal { return 404; }
location ^~ /api/internal/ { return 404; }
```

- **Mit der Server-Session abgleichen** (offen, `SERVER.md` 2.5): welche Header `server_proxy.conf` schon setzt (dann hier weglassen), wie `X-Powered-By` entfernt und die Body-Größe begrenzt wird (Soll 1 MB statt der globalen 2000 MB des Images, 413-Test; eine größere Upload-Location nur mit denselben Zugriffs- und Header-Regeln), HSTS ohne `preload` (der NPM-Schalter hängt es an).
- **`add_header`-Vererbung:** Ein Block mit eigenem `add_header` erbt die `add_header` der Ebene darüber nicht; dort alle Header wiederholen.
- **Keine CSP** im Proxy in B/C (kommt samt `frame-ancestors` aus der App, `WebSites/.claude/rules/server-und-sicherheit.md`) und keine Cache-Header für `/_nuxt` (setzt Nitro).
- **Kamera/Mikrofon (Praxisraum):** Permissions-Policy `camera=(self), microphone=(self), display-capture=(self), fullscreen=(self), geolocation=()`; die `wss:`-Adressen von LiveKit und Hocuspocus stehen in der CSP der App (`connect-src`). Proxy des Praxisraum-Servers offen (`SERVER.md` 2.14).
- Kommentar am Dateianfang: wohin eintragen, jede Abweichung mit Grund (Beispiel Gora: HSTS ohne `includeSubDomains`, weil die DNS-Zone bei Wix liegt). Abweichungen zusätzlich in die Tabelle „Abweichungen“ der Projekt-`CLAUDE.md`.
- **Prüfen** nach jeder Änderung (ersetzt `caddy validate`): `nginx -t`, dann GET mit `curl -sS -D - -o /dev/null` auf normale Antwort, App-404, Proxy-Fehler (Staging) und beide Redirect-Typen getrennt (Force SSL, Redirection-Host; `SERVER.md` 2.5). Auf HTTPS jeder Header genau einmal, auch auf 404, Proxy-Fehler und HTTPS-Redirect; HTTP nur Status und Ziel.
- Alte Caddy-Dateien (`deploy/*.caddy`) sind seit 27.11.2026 historisch (Vorlage: `SERVER.md` Anhang A).

## Modus A: statischer Nginx-Container

Statische Seiten laufen auf dem Webserver in je einem eigenen, nicht privilegierten Nginx-Container mit schreibgeschütztem Build hinter NPM (`SERVER.md` 2.5a, 2.7). Vorlage: `FlowTech/Admin/server/websites/flowtech-preview/` (`compose.yaml`, `nginx.conf`, außerhalb `WebSites/`). Im Projekt-Repo:

- `deploy/nginx.conf`: `server_tokens off`, `absolute_redirect off` (sonst zeigen 301 wie `/pfad` → `/pfad/` hinter NPM auf `http://<container>:8080/…`), `gzip_static on`, Dotfile-Sperre (`location ~ /\. { return 404; }`), HTML und `/_nuxt/builds/` revalidieren, übrige `/_nuxt/`-Assets 365 Tage, `error_page 404 /404.html`, Sicherheits-Header nach `SERVER.md` 2.5 **mit `always`**, dazu `Content-Security-Policy "frame-ancestors 'none'"` (wirkt im Meta-Tag nicht). `X-Robots-Tag: noindex, nofollow` nur in einer Vorschau.
- `deploy/compose.yaml`: Image mit Tag und Digest, `read_only: true`, nicht-root-Benutzer, `cap_drop: [ALL]`, `no-new-privileges`, tmpfs `/tmp`, Release schreibgeschützt eingebunden, eigenes Netz extern, **kein `ports:`**, HTTP-Healthcheck.
- `add_header` in einer `location` hebt alle `add_header` der `server`-Ebene auf: Locations mit eigenem `add_header` wiederholen alle Header (`expires` ist kein `add_header`).
- `nitro.compressPublicAssets` erzeugt die `.gz`-Dateien (`performance.md`). Komprimierung und Cache-Header auch über NPM prüfen.
- Weiterleitungen alter URLs als echte 301 in `nginx.conf` oder als Redirection-Host in NPM (`seo-i18n-inhalte.md`).
- Proxy-Host für die Domain wie oben (`deploy/<domain>.npm.md`), Ziel `http://<site>:8080`.
