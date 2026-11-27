# Server: Ist-Zustand, Soll-Zustand und Umzug

Stand: 21.11.2026, ergänzt 24. und 27.11.2026 (Webserver: Nginx Proxy Manager statt Caddy, Entscheidung 47 in `entscheidungen/2026-11-27-phase2-entscheidungen.md`). Gilt zusammen mit [CLAUDE.md](CLAUDE.md). Die Dateien im Projekt-Repo stehen als Vorlagen in `WebSites/.claude/rules/container-und-deployment.md` (Dockerfile, `compose.yml`, Healthcheck, Migrationen beim Start, Proxy-Beschreibung pro Projekt, `nginx.conf` für Modus A) und `WebSites/.claude/rules/ci-workflow.md` (GitHub Actions). Diese Datei beschreibt die Serverseite.
Quellen: die Projektordner, frühere Claude-Sessions vom 06.11.2026 (dogado-Zugang, FlowTech-Deployment, Vogelperspektive-Neubau, OS-Update des Linux-Servers), Betriebsprüfungen Praxisraum vom 20./21.11.2026, Recherche „Betrieb“, Pilottest und Prüfrunde 1 vom 21.11.2026, LiveKit-Doku (docs.livekit.io, Self-hosting: Ports and firewall, Deployment, Benchmark; abgerufen 21.11.2026). Webserver: Stand der Session „FlowTech Server-Einrichtung“ vom 27.11.2026 (`_phase2/server/NPM-STAND.md`, Vorlagen unter `FlowTech/Admin/server/websites/`, außerhalb von `WebSites/`). Diese Session richtet den Webserver ein und ist für die dort offenen Punkte verantwortlich.

## 1. Ist-Zustand

### 1.1 dogado Shared Hosting (Plesk)

dogado wird aufgegeben (Entscheidung 27.11.2026); bis zum Umzug gilt:

| Vertrag | Server | SSH-Benutzer | Ordner → Domain | Inhalt |
|---|---|---|---|---|
| 634057 (WEB S 3.0) | `web250.dogado.net` | `h634057` | `flow-techorg` → flow-tech.org; `flwtchde` → zweite Domain (Kopie); `ams-aide`; `httpdocs` (Platzhalter) | FlowTech, statisch, live mit Let's Encrypt |
| 622978 | `web116.dogado.net` | `h622978` | `vogelperspektive-psychologinde` → vogelperspektive-psychologin.de; `httpdocs` (Platzhalter) | alte Vogelperspektive-Seite (Webflow-Export + PHP), live |

- **Kann:** Apache mit `.htaccess`, PHP, MySQL, SSH/SFTP (Key-Login mit `~/.ssh/id_ed25519` ist auf beiden eingerichtet), Let's Encrypt (nur über das onehome-Panel, nicht per certbot), E-Mail-Postfächer.
- **Kann nicht:** Node-Prozesse (CentOS 7, glibc 2.17 → kein Node ≥ 18), Docker, eigene Dienste. Also nur Modus A.
- **E-Mail:** Die Postfächer liegen hier (z. B. info@vogelperspektive-psychologin.de, info@flow-tech.org). Die Apps verschicken über `web116.dogado.net:465`.
- Fail2Ban sperrt nach gehäuften Fehl-Logins die IP für 30–60 Minuten. Immer `ssh -o BatchMode=yes` mit Key, nicht wiederholt probieren.

### 1.2 Eigener Linux-Server `92.205.163.18`

- VPS bei GoDaddy/Host Europe (Hostname `*.host.secureserver.net`), Ubuntu 24.04.5 LTS, Kernel 6.8.0-149, 386 GB Platte (ca. 10 % belegt). Login `<admin-benutzer>` mit sudo (Name steht im Passwortmanager).
- Docker 28.4: Pakete stehen auf `apt-mark hold`, das Update auf 29 ist noch offen. **Komodo** (Periphery) verwaltet die Container: 11 Container, davon 9 laufend, in 4 Compose-Projekten. Die Komodo-Version ist noch nicht notiert (→ 2.12).
- Systemdienste: **nginx** (belegt vermutlich die Ports 80/443), sendmail, postfix-mta-sts-resolver.
- **Geschäftsdienste:** `drw-payment`, `nydus-ex`, `nydus-ex-api`, OpenVPN-Client `DrWalterExtServerLinux`.
- **Keine der Websites läuft hier**, und das bleibt so. Das System ist ein Produktivserver für Zahlungs- und Schnittstellendienste.

### 1.3 Weitere Orte

- **Gora:** Die Live-Seite goraosaznanie.com liegt bei SiteGround, die DNS-Zone bei Wix. Das Staging läuft auf ChatGPT Sites (Cloudflare Worker + D1): https://gora-nuxt-staging.workspace-vo-7180.chatgpt.site/. Code privat auf GitHub (`f7or7an/gora-osaznanie`, Relaunch auf Branch `relaunch`).
- **Ortrud:** kuteifan.de kommt auf den Webserver (2.2), das Postfach auf den dortigen Mailserver (Entscheidung 36, 27.11.2026).
- **Praxisraum:** Prototyp nur lokal, noch kein Server.
- **Lokal:** Windows 11, Projekte unter `C:\Users\flori\Documents\FlowTech\WebSites`. Installiert sind Node 24.13 und npm 11.6 (21.11.2026). Soll: Node 26 LTS und npm ≥ 12.2.2 (`npm i -g npm@12`, Node 26 bringt nur npm 11 mit). Der Pilottest vom 21.11.2026 lief mit Node 26.13.1 und npm 12.2.2 fehlerfrei.

### 1.4 Stand der Serverdateien in den Projekten

Alle drei App-Projekte haben schon `compose.yml` ohne Proxy und eine Caddy-Datei unter `deploy/`. Die Tabelle zeigt den **historischen Ausgangsstand** vor Phase 2; laut Server-Session (27.11.2026) haben die aktuellen Dockerfiles bereits Node 26, `/api/health` und Images aus GHCR. Offene Punkte stehen in der jeweiligen `STANDARDS-AUDIT.md`. Seit 27.11.2026 sind die Caddy-Dateien des Webservers historische Vorlagen; die Projekte ziehen auf NPM nach (Nachzug-Liste `_phase2/server/PROJEKT-NACHZUG.md`).

| Projekt | Abweichungen von den Vorlagen (historischer Ausgangsstand) |
|---|---|
| Vogelperspektive | `node:24-alpine`, Healthcheck mit `wget`, `NODE_OPTIONS=--disable-warning…`, Netz `web`, internes Docker-Netz zum Praxisraum (künftig WireGuard, 2.15), `build: .` statt Image aus GHCR, kein `init`/`mem_limit`/`stop_grace_period`, Caddy-Datei statt NPM-Beschreibung |
| Praxisraum | `node:24` Alpine (per Digest), `wget`, Netz `web`, Netz `vogelperspektive-intern` (künftig WireGuard), Rückweg per `:prev`-Tag. Zieht auf den eigenen Praxisraum-Server (2.14), Proxy dort offen. |
| Gora | `node:24-alpine`, `wget`, Netz `web`, Migrationen im Entrypoint-Skript statt Nitro-Plugin, eigene Header ohne `includeSubDomains` (gewollt, siehe 2.5), Caddy-Datei statt NPM-Beschreibung |

### 1.5 Probleme des Ist-Zustands

1. Vogelperspektive (B), Praxisraum (C) und Gora (C) sind Node-Apps. Sie können auf dogado nicht laufen und haben heute keinen Produktivserver.
2. ~~`Vogelperspektive/webapp/Vogelperspektive/deploy/` bringt einen eigenen Caddy auf 80/443 mit.~~ Erledigt am 09.11.2026: `compose.yml` ohne Proxy und `deploy/vogelperspektive-psychologin.de.caddy` für den zentralen Caddy (seit 27.11.2026 historisch, 2.5). Auf `92.205.163.18` hätte ein eigener Proxy mit nginx kollidiert. Außerdem sollen Websites dort nicht mitlaufen: Eine angreifbare Website darf die Zahlungsdienste nicht gefährden, und jedes Wartungsfenster würde beides treffen.
3. Das Hosting ist auf vier Anbieter verteilt (dogado ×2, SiteGround, ChatGPT Sites, dazu der unbekannte Ortrud-Hoster). Deployment, TLS und Backups laufen überall anders.
4. Es gibt keine einheitlichen Backups für Anwendungsdaten (SQLite).
5. ~~Calendly bei Vogelperspektive~~ Erledigt am 08.11.2026: eigene Terminbuchung.

## 2. Soll-Zustand

### 2.1 Überblick

Zwei Server, beide getrennt vom Geschäftsserver (entschieden 21.11.2026):
- **Webserver** für alle Websites und Web-Apps außer dem Praxisraum: dedizierter Root-Server bei IPAX (Wien), eingerichtet von der Session „FlowTech Server-Einrichtung“. **Nginx Proxy Manager (NPM)** verteilt alle Domains (Dauerlösung, Entscheidung 47, 27.11.2026). Apps laufen als Container dahinter, statische Seiten in je einem eigenen Nginx-Container. **Arcane** verwaltet die App-Stacks (je App ein Staging- und ein Live-Stack). Grundlage für das Hosting-Angebot von FlowTech: Jeder neue Kunde bekommt Staging- und Live-Stack, je ein Netz `<stack>-proxy` und einen NPM-Proxy-Host.
- **Praxisraum-Server** nur für den Praxisraum (App + LiveKit-Videoserver), in einem großen deutschen Rechenzentrum mit 1 Gbit/s (Entscheidung 13.1). Grund: Videotelefonie braucht offene Medien-Ports und Bandbreite; auf dem Webserver veröffentlicht ausnahmslos nur NPM Web-Ports. **Proxy-Wahl offen (Stand 27.11.2026)**; der Text zum Praxisraum-Server beschreibt weiter den bisherigen Caddy-Plan (2.14, Anhang A).

Die Server bauen nichts: Images entstehen in GitHub Actions und liegen in der privaten GitHub Container Registry (GHCR).

```
                               Internet
                  ┌───────────────┴────────────────────────┐
   DNS: Website-Domains                         DNS: app.… und video.vogelperspektive-psychologin.de
                  │                                         │
┌─────────────────▼─ Webserver (IPAX Wien, Ubuntu, Docker) ┌▼─ Praxisraum-Server (großes RZ in DE, 1 Gbit/s)
│ UFW: Host-SSH · nftables: IPv4 80/443 nur zu NPM          │ ufw: 22 · 80 · 443/tcp+udp · 7881/tcp · 7882/udp
│ Adminoberflächen nur per SSH-Tunnel                       │      · 3478/udp · 51820/udp nur vom Webserver
│                                                          │ Proxy offen (bisheriger Plan: Caddy, Anhang A)
│ NPM (einziger Stack mit Web-Ports)                       │  ├─ app.…   → praxisraum:3000
│  ├─ <domain> (Modus A)     → <site>:8080 (Nginx, ro)     │  └─ video.… → praxisraum-livekit:7880
│  ├─ <domain> (Modus B/C)   → <app>-live:3000             │ LiveKit: ports 7881/tcp, 7882/udp, 3478/udp
│  └─ <app>.staging.flow-tech.org → <app>-staging:3000     │ Netz praxisraum-intern: App ↔ LiveKit
│ je Stack: Netz <stack>-proxy, NPM angehängt              │ /srv/apps/praxisraum/data (SQLite, verschlüsselt)
│ /srv/apps/<stack>/data → /app/.data                      │
│ Arcane (App-Stacks) · Mailcow · Restic stündlich         │ Komodo Periphery · Backup-Timer → restic → Push
└───────────────────────────┬──────────────────────────────┴──────────┬───────────────
                            └──── WireGuard wg0 (geplant) ────────────┘

GitHub Actions:      lint, typecheck, Tests, Build, Image-Scan → ghcr.io/f7or7an/<name>:<git-sha>
Arcane:              zieht ghcr.io/f7or7an/<name>@sha256:… (IMAGE_DIGEST), erst Staging, dann Live
92.205.163.18:       bleibt Geschäftsserver (Zahlung, VPN), keine Websites
```

### 2.2 Webserver

Ist laut Server-Session (27.11.2026):
- **Hoster:** IPAX GmbH, Rechenzentren in Wien, dedizierter Root-Server mit Ubuntu. **AVV/Vertragspartner noch abgleichen** (offen), und zwar bevor das erste Personendatum auf dem Server liegt.
- **Dienste:** Nginx Proxy Manager 2.17.1, Arcane, Mailcow (Mailserver; flwtch.de als Pilotdomain, Postfach kuteifan.de als Ziel), FlowTech-Vorschau. Komodo ist zurückgestellt.
- **Firewall:** UFW für Host-SSH, zusätzliche nftables-Regeln für Docker-WAN-Ingress (IPv4 80/443 nur zu NPM), Adminoberflächen nur per SSH-Tunnel. Bridge-Regeln sperren NPMs Adminport für die Backends.
- **Docker umgeht ufw:** Veröffentlichte Ports schreibt Docker per DNAT in iptables, bevor ufw greift ([docs.docker.com](https://docs.docker.com/engine/network/packet-filtering-firewalls/)). Deshalb gilt auf dem Webserver **ausnahmslos**:
  - Nur der NPM-Stack veröffentlicht Web-Ports. App-Compose und Compose der statischen Seiten ohne `ports:`, auch nicht zum Testen.
  - Debug ohne `ports:`: per SSH-Tunnel zu einer privaten Route oder per Test aus dem Docker-Netz (z. B. aus einem Container im Netz `<stack>-proxy`).
  - Von außen prüfen: `nmap -p- <IP>` und `nmap -sU --top-ports 100 <IP>` zeigen nur die freigegebenen Ports.

Soll (unverändert, Abgleich mit der Server-Session):
- **Grundhärtung:** eigener Benutzer mit sudo, SSH nur per Key (`PasswordAuthentication no`, `PermitRootLogin no`), `fail2ban` für SSH, `unattended-upgrades` für Sicherheitsupdates, Zeit-Sync.
- **Docker-Logs begrenzen** (json-file 10 MB × 3 oder Treiber `local`).
- **Updates:** App-Images mit vollem Versions-Tag und Digest (`node:26.13.1-slim@sha256:…`), Renovate aktualisiert sie (Regeln in `WebSites/.claude/rules/abhaengigkeiten-und-layer.md`). Jede Digest-Änderung ist ein Commit, also baut die CI ein neues Image mit den Patches des Basis-Images. Docker selbst bewusst nach den Release-Notes aktualisieren. NPM-, Arcane- und Mailcow-Updates verantwortet die Server-Session.
- **Zero-Downtime** ist nicht nötig. Beim Neustart eines App-Containers antwortet NPM kurz mit 502 (es gibt kein Gegenstück zu Caddys `lb_try_duration`).

### 2.3 Verzeichnisse

**Webserver** (Ist laut Server-Session):

```
/opt/stacks/<dienst>/compose.yaml                    Infrastruktur per Docker Compose: NPM, Arcane, Mailcow, FlowTech-Vorschau
/opt/stacks/arcane/projects/<stack>/compose.yaml     App-Stacks in Arcane, <stack> = <app>-staging bzw. <app>-live
/opt/stacks/arcane/projects/<stack>/.env             Variablen des Stacks (u. a. IMAGE_DIGEST), chmod 600
/opt/stacks/flowtech-preview/releases/<sha256>/      statischer Pilot: entpacktes Release, schreibgeschützt eingebunden
/srv/apps/<stack>/data/                              Volume der App (SQLite, Uploads) → /app/.data, Besitzer UID 1000
/data/nginx/custom/server_proxy.conf                 im NPM-Container: gemeinsamer Hook für reguläre Proxy-Hosts
```

Angelegt sind sechs App-Stacks: `ortrud-{staging,live}`, `gora-{staging,live}`, `vogelperspektive-{staging,live}`; laufende App-Deployments sind noch nicht bestätigt. Die FlowTech-Vorschau liegt außerhalb des Arcane-Projektbaums (`/opt/stacks/flowtech-preview/`).

**Praxisraum-Server** (bisheriger Plan, Proxy-Wahl offen):

```
/srv/
  proxy/
    compose.yml            Proxy-Stack (bisheriger Plan: Caddy, Anhang A)
    Caddyfile              globale Einstellungen + Snippets, importiert sites/*.caddy
    sites/<domain>.caddy   eine Datei pro Site (Quelle: deploy/<domain>.caddy im Projekt-Repo)
  apps/<name>/
    data/                  Volume der App (SQLite, Uploads), Besitzer UID 1000 (node)
    .env                   Geheimnisse, chmod 600 (oder in Komodo hinterlegt)
  backup/<name>/           lokale SQLite-Snapshots (Quelle für restic), Besitzer UID 1000, chmod 700
  backup/bin/snapshot.sh   Snapshot-Skript (2.9)
/etc/restic/env            Zugang zum Backup-Ziel + Push-URL, chmod 600
/etc/wireguard/wg0.conf    Tunnel zwischen Webserver und Praxisraum-Server (2.15), chmod 600
```

### 2.4 Netze

- **Webserver (Ist):**
  - `web-proxy`: externes Bridge-Netz des NPM-Basis-Stacks.
  - **Jeder App-Stack hat ein eigenes Netz `<stack>-proxy`** (`external: true`, je Staging- und Live-Stack eigenes). Darin hängen nur dieser Stack und NPM. Vorgesehen: NPM wird angehängt und erreicht die App unter `http://<stack>:3000`. Grund: Im früher geplanten gemeinsamen Netz `web` hätte jeder Container einen Netz-Alias wie `praxisraum` tragen und Anfragen des Proxys abfangen können (Analyse 21.11.2026). Ein Netz `web` gibt es nicht.
  - Statische FlowTech-Vorschau: eigenes, extern eingebundenes internes Bridge-Netz `flowtech-preview-proxy`, NPM erreicht `http://flowtech-preview-site:8080`.
  - Die Netze legt man außerhalb des App-Stacks an, damit `docker compose down` einer App nicht am Netz scheitert, an dem NPM hängt. Die dynamische Anbindung per Skript ist bisher nur für die FlowTech-Vorschau bestätigt; für die sechs App-Stacks ist sie vorgesehen. **Vor Live prüfen:** dass die Anbindung Container-Recreates von NPM und App übersteht.
  - `<stack>-proxy` ist nicht `internal`, weil die App ausgehend SMTP braucht.
- **Datenaustausch zwischen Stacks auf demselben Server** nie über `<stack>-proxy`, sondern über ein eigenes Netz mit `internal: true` und **festen Adressen** statt Containernamen. Grund: Eine feste Adresse in einem Netz, in dem nur die beteiligten Container hängen, kann niemand sonst übernehmen (Prüfung 21.11.2026). Feste Adressen in die untere Hälfte des Subnetzes, `--ip-range` auf die obere, damit Docker nichts doppelt vergibt.
- **Über Servergrenzen** (Website ↔ Praxisraum) geht das nicht: dafür WireGuard (2.15).
- Reservierte Adressen (hier eintragen, bevor ein neues Netz angelegt wird):

  | Netz | Server | Subnetz | Wer | Angelegt von |
  |---|---|---|---|---|
  | `praxisraum-intern` (Docker, `internal`) | Praxisraum-Server | 10.89.21.0/24 | Praxisraum-App .10, LiveKit .11 | Praxisraum-`compose.yml` |
  | `wg0` (WireGuard) | beide | 10.90.0.0/24 | Webserver .1, Praxisraum-Server .2 | `/etc/wireguard/wg0.conf` |
  | ~~`vogelperspektive-intern`~~ | – | ~~10.89.20.0/24~~ | entfällt mit dem eigenen Praxisraum-Server (13.1) | – |

- Proxy-Netze (Liste aktuell halten): Webserver `web-proxy`, `flowtech-preview-proxy`, `ortrud-staging-proxy`, `ortrud-live-proxy`, `gora-staging-proxy`, `gora-live-proxy`, `vogelperspektive-staging-proxy`, `vogelperspektive-live-proxy`; Praxisraum-Server `praxisraum-proxy` (App und LiveKit).

### 2.5 Proxy Webserver (Nginx Proxy Manager)

Seit 27.11.2026 Dauerlösung (Entscheidung 47). Die frühere Caddy-Vorlage des Webservers steht als historische Vorlage in Anhang A. Angaben zu NPM 2.17.1 laut Abgleich der Server-Session mit dem Quellstand (27.11.2026).

**Aufbau:**
- Je Domain ein **Proxy-Host** in NPM: Ziel `http://<stack>:3000` (Modus B/C) bzw. `http://<site>:8080` (statischer Nginx-Container, 2.5a). Zertifikat per Let's Encrypt in NPM.
- `/data/nginx/custom/server_proxy.conf` (im NPM-Container) ist der **gemeinsame Hook nur für Proxy-Hosts**. **Redirection-Hosts** (z. B. `www` oder Zweitdomain → Hauptdomain) haben einen eigenen Hook `server_redirect.conf` und ein eigenes Advanced-Feld. „Force SSL“ ist ein `return 301` in der Server-Ebene des Hosts.
- Das **Advanced-Feld** des Proxy-Hosts enthält, was nur für diesen Host gilt: Frame- und Permissions-Policy, Pfadregeln (z. B. `/api/internal` → 404). Quelle ist die Proxy-Beschreibung im Projekt-Repo (`deploy/`, Soll-Vorlage in `container-und-deployment.md`).
- **HSTS** gehört auf jede HTTPS-Antwort, auch auf den HTTPS-Redirect einer Zweitdomain. Der eingebaute HSTS-Schalter von NPM 2.17.1 hängt `preload` an; das Soll unten ist ohne `preload` → ein exakter Header ohne `preload` braucht eine eigene Server-Konfiguration (offen). `includeSubDomains` erst nach TLS-Prüfung aller Subdomains (auch Mail-Webinterfaces); Gora heute ohne, weil die DNS-Zone bei Wix liegt (vor dem Livegang prüfen); FlowTech mit (Entscheidung 14).
- Die **CSP** kommt in B/C aus der App (`nuxt-security`, samt `frame-ancestors`), in Modus A als Meta-Tag, `frame-ancestors` dann als Header aus dem Nginx-Container.
- **Verbindliche globale Live-Policy** für `server_proxy.conf`: noch offen (Server-Session). Kandidaten gemeinsam: `nosniff`, `Referrer-Policy`.

**Header-Soll** (gilt unverändert seit dem Caddy-Plan; jeder Header genau einmal, aus genau einer Quelle):

| Header / Regel | Soll | B/C über NPM | Modus A (Nginx-Container, 2.5a) |
|---|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (ohne `includeSubDomains`, solange nicht alle Subdomains HTTPS können), ohne `preload` | NPM (Schalter setzt `preload`, siehe oben) | NPM (äußerer Proxy) |
| `X-Content-Type-Options` | `nosniff` | Kandidat `server_proxy.conf` | `nginx.conf` |
| `Referrer-Policy` | aus **einer** Quelle: `strict-origin-when-cross-origin` als Vorgabe; App-Werte (z. B. `no-referrer` auf Token-Seiten, `formulare-und-datenschutz.md`) haben Vorrang und erscheinen nie doppelt | Kandidat `server_proxy.conf`; Umsetzung des Vorrangs offen | `nginx.conf` |
| `X-Frame-Options` / `frame-ancestors` | `DENY` bzw. `frame-ancestors 'none'` | `frame-ancestors` in der App-CSP; `X-Frame-Options` im Advanced-Feld | beide in `nginx.conf` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()`; Praxisraum: `camera=(self), microphone=(self), display-capture=(self), fullscreen=(self), geolocation=()` | Advanced-Feld | `nginx.conf` |
| `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy` | `same-origin` / `same-site` | Advanced-Feld oder gemeinsam (offen) | `nginx.conf` |
| `Server`, `X-Powered-By` | keine Versionsangabe, kein `X-Powered-By` (setzt Nitro mit „Nuxt“; `hidePoweredBy` in `nuxt-security` bleibt aus) | NPM setzt `server_tokens off`; Entfernen von `Server`/`X-Powered-By` vor Live prüfen | `server_tokens off` |
| Dotfiles | gesperrt (`.htaccess`, `.git` …) | entfällt (Nitro liefert nur `public/` aus) | `location ~ /\. { return 404; }` |
| Vorkomprimiert | `.gz` aus `nitro.compressPublicAssets` ausliefern | Kompression über NPM vor Live prüfen | `gzip_static on` |
| `X-Robots-Tag` | `noindex, nofollow` nur Staging und Vorschau | Advanced-Feld des Staging-Hosts | nur Vorschau |

**Nginx-Eigenheiten (gelten für NPM und den Nginx-Container):**
- `add_header` ohne `always` gilt nur für Erfolgs- und Redirect-Antworten (2xx, 301–308). Fehlerantworten (404, 5xx) bekommen die Header nur mit `always`. Deshalb jeder Sicherheits-Header mit `always`.
- **`add_header`-Vererbung:** Setzt ein Block ein eigenes `add_header`, erbt er **keinen** `add_header` der äußeren Ebene mehr. **NPM selbst** setzt im Standard-Include in `location /` `add_header X-Served-By`. Deshalb erreichen server-weite `add_header … always` aus `server_proxy.conf` oder dem Advanced-Feld die normalen Antworten **nicht**, auch ohne HSTS. Wo die Header stattdessen stehen müssen, legt die Server-Session fest (offen); entscheidend ist die Prüfung unten.
- `add_header` hängt an, auch wenn die App denselben Header schon setzt. Header, die die App setzt (CSP, ggf. `Referrer-Policy`), nicht zusätzlich im Proxy setzen.

**Weitergereichte Header (NPM 2.17.1):** `Host` = `$forward_host` (ggf. mit Client-Port), `X-Forwarded-Proto` = `$x_forwarded_proto` und `X-Forwarded-Scheme` = `$x_forwarded_scheme`: Beide übernehmen ein eingehendes `http`/`https` vom Client, sonst `$scheme`. `X-Forwarded-Host` setzt bzw. bereinigt NPM nicht (ein vom Client gesendeter Wert kommt durch). Deshalb bilden die Apps URLs und Sicherheitsentscheidungen (CSRF, Weiterleitungen, Links) nur aus `NUXT_PUBLIC_SITE_URL`, nie aus diesen Headern (`server-und-sicherheit.md`).

**Prüfung je veröffentlichtem Host** (nach dem ersten Deployment und nach jeder Änderung an NPM, `server_proxy.conf`, `server_redirect.conf`, Advanced-Feld oder `nginx.conf`; ersetzt `caddy validate`). Erst `nginx -t` im NPM- bzw. Nginx-Container, dann **GET** (nicht nur `HEAD`):

```sh
curl -sS -D - -o /dev/null https://<domain>/                 # normale Antwort
curl -sS -D - -o /dev/null https://<domain>/gibt-es-nicht/   # 404 der App bzw. des Containers
curl -sS -D - -o /dev/null https://<staging-domain>/         # Proxy-Fehler (502) bei gestopptem Backend, nur Staging/Test
curl -sS -D - -o /dev/null http://<domain>/                  # Force SSL: nur Status 301 und Ziel prüfen
curl -sS -D - -o /dev/null https://www.<domain>/             # Redirection-Host: Status, Ziel, HSTS
```

Erwartet: auf allen HTTPS-Antworten (auch 404, Proxy-Fehler und HTTPS-Redirect) die Header aus der Tabelle genau einmal, keine Versionsangabe in `Server`, kein `X-Powered-By`, CSP nur aus der App (B/C) bzw. Meta-Tag plus `frame-ancestors` (A), `X-Robots-Tag` nur auf Staging/Vorschau. HTTP-Antworten nur auf Redirect-Status und Ziel prüfen. Beide Redirect-Typen (Force SSL, Redirection-Host) getrennt prüfen.

**Client-IP:** NPM 2.17.1 setzt `X-Forwarded-For` = `$proxy_add_x_forwarded_for` (hängt an, ersetzt nicht) und `X-Real-IP` = `$remote_addr`. Der **letzte** Eintrag ist der von NPM ermittelte Peer; die Vorlage `getClientIp` nimmt ihn (`server-und-sicherheit.md`). Das NPM-Image vertraut für Real-IP standardmäßig auch privaten Netzen und CDN-Netzen: Kommt eine Anfrage aus einem solchen Netz, übernimmt NPM die Adresse aus deren Header. **Vor Freigabe des Rate-Limits die Vertrauenskette prüfen** (offen, Server-Session):
- von außen Anfragen mit gefälschtem `X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto`/`-Scheme` und `X-Forwarded-Host` senden: Die App muss die echte Adresse zählen (z. B. Anfragen mit wechselnden gefälschten Adressen laufen gemeinsam ins Rate-Limit) und darf aus Proto/Host nichts ableiten;
- zusätzlich derselbe Test **aus einem Backend-Netz** (privater Absender, dem die Real-IP-Konfiguration vertraut).

**Body-Größe:** Das NPM-Image erlaubt global 2000 MB (`client_max_body_size 2000m`); **Soll bleibt 1 MB** je Anfrage, Upload-Routen mehr (Vogelperspektive `/api/admin/upload`). Eine größere Upload-Location nur mit denselben Zugriffs- und Header-Regeln wie der Rest des Hosts. Prüfen: Anfrage über 1 MB ergibt 413. Umsetzung offen, vor Live.

**Zugriffslog:** NPM schreibt Access- und Error-Logs und rotiert sie wöchentlich (4 bzw. 10 Archive); NPM-Logs sind nicht im Backup. Die Standardwerte erfüllen die 7-Tage-Regel **nicht** und loggen die volle IP, die Request-URI samt Query (Tokens!) und den Referer. Soll (`formulare-und-datenschutz.md`): Access-Logs bevorzugt aus, sonst gekürztes Format ohne sensible URLs und mit geprüfter Löschung nach höchstens 7 Tagen. Error-, Fallback- und Redirect-Logs sowie die Logs von App und statischem Container gesondert prüfen. Bis zur Umstellung keine 7 Tage als tatsächliche Live-Aufbewahrung angeben (Datenschutzerklärung).

**Staging:** Zugriffsschutz (bisher Passwort) und `X-Robots-Tag: noindex, nofollow` für `<app>.staging.flow-tech.org` in NPM: Umsetzung vor Live prüfen.

**Offene Server-Arbeit vor Live (verantwortlich: Session „FlowTech Server-Einrichtung“):** verbindliche Header-Policy und Ort der `add_header` (wegen `X-Served-By` in `location /`); HSTS ohne `preload`; effektive Header je veröffentlichtem Host per GET auf normale Antwort, App-404, Proxy-Fehler und beide Redirect-Typen; Vertrauenskette (Client-IP, Proto/Scheme/Host) von außen und aus einem Backend-Netz; 1-MB-Grenze mit 413-Test; Staging-Schutz; Access-Log-Format und Frist; NPM-Anbindung der App-Stacks (2.4). Backup und `NUXT_DATA_KEY`: 2.9, 2.10.

### 2.5a Statische Seiten (Modus A) auf dem Webserver

- Je Stack ein eigener, **nicht privilegierter Nginx-Container** mit **schreibgeschütztem** Build. Kein `ports:`; NPM erreicht ihn über das Netz des Stacks (Vorschau: `http://flowtech-preview-site:8080`).
- Vorlage: `FlowTech/Admin/server/websites/flowtech-preview/nginx.conf` und `compose.yaml` (außerhalb `WebSites/`). Inhalt der `nginx.conf`:
  - `absolute_redirect off`: Weiterleitungen (z. B. `/pfad` → `/pfad/`) relativ; sonst zeigen sie hinter NPM auf `http://<container>:8080/…`,
  - `gzip_static` (liefert die `.gz`-Dateien aus `nitro.compressPublicAssets`),
  - Dotfile-Sperre,
  - Revalidierung für HTML und `/_nuxt/builds/` (sonst erkennt Nuxt keine neuen Deploys), 365 Tage für die übrigen `/_nuxt/`-Assets (Hashes im Namen),
  - Sicherheits-Header nach der Tabelle in 2.5, mit `always`, inklusive `Content-Security-Policy "frame-ancestors 'none'"` (wirkt nicht im Meta-Tag),
  - `noindex, nofollow` nur in der Vorschau.
- Komprimierung und Cache-Header **auch über den äußeren Proxy (NPM) prüfen** (`curl -sS -D - -o /dev/null -H 'Accept-Encoding: gzip' https://<domain>/_nuxt/<datei>.js`).
- Healthcheck: HTTP-Check im Compose (Vorlage).
- Release: 2.7.

### 2.6 App-Container (Modus B/C)

Dockerfile, `compose.yml`, `.dockerignore`, Healthcheck und Migrationen beim Start: Vorlagen in `WebSites/.claude/rules/container-und-deployment.md`. Für die Server gilt:
- Containername = Stackname = Hostname im NPM-Ziel (`<app>-staging` bzw. `<app>-live`). Intern lauscht jede App auf Port 3000.
- `restart: unless-stopped` ist Pflicht, sonst ist der Container nach einem Reboot weg.
- Beschreibbar ist nur `/srv/apps/<stack>/data` (→ `/app/.data`) und `/tmp` (tmpfs). Ordner vorher anlegen: `sudo install -d -m 0700 -o 1000 -g 1000 /srv/apps/<stack>/data`.
- Die App hängt nur im eigenen Netz `<stack>-proxy`. Kein Container bekommt `docker.sock`.
- Jede App hat `/api/health`. Docker prüft ihn per `HEALTHCHECK`; externes Uptime-Monitoring ist offen (2.11).
- Absolute URLs (Canonical, Links in Mails, Weiterleitungen) bildet die App aus `runtimeConfig.public.siteUrl`, nicht aus Anfrage-Headern; Nuxt ≥ 4.6.4 vertraut `x-forwarded-proto` nicht automatisch. Details: `WebSites/.claude/rules/server-und-sicherheit.md`.

### 2.7 Deployment

**Modus A (statisch, Pilot FlowTech-Vorschau):**
1. Lokal bzw. im CI: `npm run generate`, `.output/public` als Archiv, SHA-256 des Archivs notieren.
2. Auf dem Server: Archiv mit SHA-256 prüfen, unter `/opt/stacks/flowtech-preview/releases/<sha256>` entpacken.
3. Compose bindet das Release schreibgeschützt ein (Variable mit dem Release-Ordner), Container neu starten.
4. Prüfen nach 2.5 (Header je Host) und 2.5a (Kompression, Cache).
Rückweg: vorigen Release-Ordner einbinden. Automatische Bereitstellung statischer Releases: offen.

Bis zum Umzug bleibt FlowTech auf dogado (`tar` über SSH auf `web250.dogado.net`, Benutzer siehe 1.1, Ordner `flow-techorg`).

**Modus B/C (App):** Der Server baut nichts. Ablauf:
1. Lokal: lint, typecheck, Tests, Build, Browser-Prüfung (Checkliste in `WebSites/.claude/rules/tests-und-qualitaet.md`), dann `git push` (nur auf Florians Wunsch).
2. GitHub Actions: Prüfungen, Image bauen, Image-Scan ohne high/critical, Push nach `ghcr.io/f7or7an/<name>:<git-sha>` (privat, mit Provenance). Workflow-Vorlage in `WebSites/.claude/rules/ci-workflow.md`.
3. Digest des geprüften Images ermitteln (`docker buildx imagetools inspect ghcr.io/f7or7an/<name>:<git-sha>` bzw. Ausgabe `digest` des Push-Schritts).
4. Snapshot vor dem Deploy: Verfahren für App-Daten offen (2.9, vor Live).
5. **Staging:** im Arcane-Projekt `<app>-staging` `IMAGE_DIGEST=sha256:…` setzen und deployen. Die App spielt beim Start ihre Migrationen ein und beendet sich bei einem Fehler; der Container wird dann nie `healthy`.
6. Prüfen: Container `healthy`, `curl -fsS https://<app>.staging.flow-tech.org/api/health`, die wichtigsten Seiten, Header nach 2.5.
7. **Live (manuelle Freigabe):** im Projekt `<app>-live` **denselben** Digest setzen und deployen, dann Prüfung wie Schritt 6 auf der Live-Domain.
8. **Rückweg:** `IMAGE_DIGEST` auf den vorigen Digest setzen und erneut deployen. Ändert eine Migration Daten so, dass der alte Stand nicht mehr darauf läuft, steht das bei der Migration; dann zusätzlich den Snapshot aus Schritt 4 zurückspielen.
Git Sync in Arcane ist optional; kein Watchtower (keine automatischen Image-Updates).

**Staging:** dasselbe Image als eigener Stack `<app>-staging` (Container `<app>-staging`, Netz `<app>-staging-proxy`, Daten unter `/srv/apps/<app>-staging/data`), erreichbar unter `<app>.staging.flow-tech.org` (Zugriffsschutz 2.5). `NUXT_PUBLIC_SITE_URL` im Staging-Stack zur Laufzeit auf `https://<app>.staging.flow-tech.org` setzen: CSRF-Prüfung und Startprüfung vergleichen zur Laufzeit damit, die beim Build eingebackene Produktions-URL würde jeden POST mit 403 ablehnen. **Keine echten Personendaten** im Staging, nur erfundene oder anonymisierte (bei Gesundheitsdaten Art. 9 DSGVO).

**Neues Projekt auf dem Webserver (Checkliste):**
1. Netze `<app>-staging-proxy` und `<app>-live-proxy` anlegen, NPM anhängen, in 2.4 eintragen.
2. `sudo install -d -m 0700 -o 1000 -g 1000 /srv/apps/<stack>/data` je Stack; Backup ergänzen (2.9).
3. Arcane-Projekte `<app>-staging` und `<app>-live` aus der Projekt-`compose.yml` (Generator der Server-Session trägt den Stacknamen fest ein; Image nur per `@${IMAGE_DIGEST}`); `.env` mit `chmod 600`. Schlüssel in den Passwortmanager (2.10), `NUXT_DATA_KEY` getrennt vom Arcane-Baum.
4. Proxy-Hosts in NPM nach `deploy/` im Projekt-Repo (Ziel, HSTS, Advanced-Feld). DNS-TTL vorher auf 300 s.
5. Deploy nach dem Ablauf oben, Header-Prüfung je Host per GET (2.5), Prüfung der Vertrauenskette vor Freigabe des Rate-Limits.
6. Von außen: `nmap`, Header-Prüfung (2.5), Netzwerk-Tab ohne fremde Domains.

### 2.8 Zugriff auf private Pakete und Images

- **Layer-Paket `@f7or7an/nuxt-base`** (GitHub Packages, privat; sobald veröffentlicht, bis dahin `_bausteine/`): Der Token gelangt nur als Build-Secret in den Build, nie ins Image und nie in eine `.npmrc` im Repo. Vorschlag, beim Anlegen des Layers prüfen und hier bestätigen:
  - CI: `GITHUB_TOKEN` mit `packages: read`; im Paket unter „Manage Actions access“ jedes Projekt-Repo mit Leserecht eintragen. Kein langlebiger Token in der CI.
  - Docker-Build: Secret `npmrc` mit dem Inhalt `//npm.pkg.github.com/:_authToken=<token>`, im Dockerfile per `RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci`.
  - Lokal: persönlicher Token nur mit `read:packages`, mit Ablaufdatum, in der Benutzer-`.npmrc` (`%USERPROFILE%\.npmrc`), nicht im Projekt.
- **Images aus GHCR ziehen:** Jeder Server braucht einen Token nur mit `read:packages` (Stand Wissen: GHCR verlangt dafür einen klassischen Token; beim Einrichten prüfen), hinterlegt in Arcane (Webserver) bzw. Komodo/`docker login ghcr.io` (Praxisraum-Server). Mit Ablaufdatum, Eintrag in der Schlüsselliste.

### 2.9 Backups

**Webserver (Ist laut Server-Session):**
- Restic stündlich, verschlüsselt auf dem Server (48 Stunden-Snapshots), dazu täglicher SFTP-Pull auf den Windows-PC (35 Tages-, 3 Monatssnapshots, bei verfügbarer Sitzung).
- NPM- und Arcane-SQLite werden konsistent gesichert (Python-Sicherung: SQLite Online Backup API, `quick_check` je Kopie), Mailcow samt Datenbank. Restore geprüft. Gesichert wird auch der Arcane-Stack samt Projektordnern und `.env`-Dateien.
- NPM-Logs sind nicht im Backup.

**Offene Server-Arbeit vor Live (verantwortlich: Session „FlowTech Server-Einrichtung“):**
- `/srv/apps` fehlt im laufenden Restic-Job. Die Python-Sicherung (Online Backup API + `quick_check`) ausweiten auf `vogelperspektive.sqlite` und `gora.sqlite` je Stack, dazu Uploads (`uploads/blog`) und die übrigen Dateien des Datenverzeichnisses. Ortrud hat keine SQLite-Datenbank; die Hörproben sind App-Daten, wenn `NUXT_AUDIO_DIR` aufs Datenvolume zeigt. Der Praxisraum (`praxisraum.sqlite`) gehört auf den eigenen Server mit eigenem Backup.
- Snapshot vor jedem Deploy (2.7, Schritt 4) auf demselben Weg.
- Aufbewahrung der App-Snapshots: offen; Grundlage sind die Löschfristen in den Apps.
- **Restore-Test je App** mit Testdaten in einem isolierten Stack, bei Vogelperspektive und Praxisraum mit entschlüsselbaren Testdaten.
- `NUXT_DATA_KEY` nicht im gesicherten Arcane-Baum (2.10).

**Praxisraum-Server (bisheriger Plan):**
- **SQLite-Snapshot** täglich per systemd-Timer und vor jedem Deploy. Nie die laufende Datei kopieren (WAL: neue Daten stehen in `-wal`). Auf dem Host `apt install sqlite3`. Das Skript läuft als UID 1000, damit keine `-wal`/`-shm`-Dateien mit Besitzer root entstehen, die die App danach nicht öffnen kann. Vor Einsatz auf dem Server testen:

  ```sh
  #!/bin/sh
  # /srv/backup/bin/snapshot.sh <name> [<anlass>]   z. B. snapshot.sh praxisraum vor-deploy
  set -eu
  name=$1; anlass=${2:-taeglich}; zeit=$(date +%Y%m%d-%H%M%S)
  for db in /srv/apps/"$name"/data/*.sqlite; do
    [ -e "$db" ] || continue
    ziel="/srv/backup/$name/$(basename "$db" .sqlite)-$anlass-$zeit.sqlite"
    setpriv --reuid=1000 --regid=1000 --clear-groups sqlite3 "$db" ".backup '$ziel'"
    setpriv --reuid=1000 --regid=1000 --clear-groups sqlite3 "$ziel" "PRAGMA integrity_check;" | grep -qx ok
  done
  find "/srv/backup/$name" -name '*.sqlite' -mtime +7 -delete
  ```

  Gleichwertig ist ein Snapshot im Container mit `backup()` aus `node:sqlite` bzw. `VACUUM INTO` (Praxisraum: `docker exec praxisraum node scripts/backup.mjs`, README „Backup und Wiederherstellung“).
- **Extern mit restic**, nachts nach den Snapshots, verschlüsselt auf das Backup-Ziel, eigenes Repository:
  ```sh
  restic backup /srv/backup /srv/apps /srv/proxy \
    --exclude '/srv/apps/*/data/*.sqlite*' --exclude '/srv/apps/*/.env'
  restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
  ```
  `/srv/apps` wegen Uploads, die laufenden Datenbanken nur über die Snapshots. `.env` nicht mitsichern: `NUXT_DATA_KEY` gehört nicht neben die verschlüsselten Daten.
- **Wöchentlich** `restic check --read-data-subset=5%`.
- **Erfolgsmeldung:** Jeder Lauf meldet Erfolg an einen Push-Monitor, z. B. als `ExecStartPost=/usr/bin/curl -fsS -m 10 "${KUMA_PUSH_URL}?status=up&msg=OK"` in der systemd-Unit (läuft nur, wenn `ExecStart` erfolgreich war). Die Push-URL steht in `/etc/restic/env`.
- **Litestream** (v0.5, fortlaufende Replikation) optional für Modus C, wenn ein Tag Datenverlust zu viel ist.

**Restore-Test** einmal im Quartal je Server und je App, Ergebnis hier eintragen:

  | Datum | Projekt | Quelle | Ergebnis |
  |---|---|---|---|
  | bis 27.11.2026 | Webserver: NPM, Arcane, Mailcow | Restic | geprüft (laut Server-Session) |
  | – | Apps | – | noch keiner (offen vor Live) |

### 2.10 Geheimnisse und Schlüsselliste

- Webserver: `.env` je Arcane-Projekt mit `chmod 600`; der Arcane-Baum samt `.env` wird gesichert (2.9). Praxisraum-Server: `.env` mit `chmod 600` oder in Komodo. sops/age nur, falls `.env`-Dateien einmal ins Git sollen.
- **`NUXT_DATA_KEY`** (Website, Praxisraum) **getrennt** ablegen, mit eigener Sicherung: außerhalb des gesicherten Arcane-Baums und seiner gespeicherten Variablen; nicht in Compose-`environment`, Arcane-Datenbank oder `.env`. Vor der ersten Nutzung mit einem Prüfwert kontrollieren, dass der Schlüssel in keiner gesicherten Datei auftaucht.
  - **Vorschlag der Server-Session (Entwurf, vor Einsatz testen):** je Stack eine eigene geschützte Datei auf dem Host außerhalb gesicherter Pfade; nur die App bindet sie schreibgeschützt ein (Dateirechte für die Runtime-UID, ohne automatisches Anlegen des Quellpfads). Ein kleiner Start-Wrapper im Image lädt den Schlüssel ohne Ausgabe in die Prozessumgebung und startet Node per `exec`. Die Apps erwarten `NUXT_DATA_KEY` (kein `*_FILE`-Mechanismus). Vor Live mit einem Dummy-Schlüssel prüfen, dass er weder im Laufzeit- noch im Backup-Inhalt auftaucht. Die Dockerfile-Vorlage (`container-und-deployment.md`) hat diesen Wrapper noch nicht.
- **Getrennt im Passwortmanager sichern** (nie neben den Backups):
  - Restic-Passwort und Zugang zum Backup-Ziel, je Server
  - `NUXT_DATA_KEY` je App (ohne ihn sind verschlüsselte Daten und Sicherungen wertlos; nach einem Schlüsselwechsel den alten behalten, solange ältere Sicherungen existieren)
  - `NUXT_APP_SECRET` je B/C-App (≥ 32 Zeichen): Schlüssel für die Formular-Mindestzeit, deshalb auch ohne Login Pflicht (z. B. Ortrud); mit nuxt-auth-utils ≥ 0.6 zugleich Sitzungs-Secret. Wechsel meldet alle ab, also außerhalb der Hauptzeit. `NUXT_SESSION_PASSWORD` gibt es nach dem Update auf 0.6 nicht mehr (Stand 24.11.2026: alle Projekte umgestellt).
  - SMTP-Zugänge (`NUXT_SMTP_*`)
  - GHCR-Pull-Token je Server, Layer-Token (lokal), Push-URLs der Überwachung
  - WireGuard-Schlüssel beider Server (2.15)
  - Praxisraum zusätzlich: `NUXT_LIVEKIT_API_SECRET`, SSO-Schlüssel, Dienst-Schlüssel für die interne API
  - Login-Namen der Server (stehen bewusst nicht in dieser Datei)
- Schlüssel erzeugen: `openssl rand -base64 32` (oder der Node-Befehl aus CLAUDE.md).

### 2.11 Überwachung, Logs, Fehler

- **Webserver:** Docker-Healthchecks `/api/health` (Node-Apps) und HTTP-Check (statische Seiten). **Externes Uptime-Monitoring: offen.** Bisheriger Plan: Uptime Kuma (Container auf `92.205.163.18`) prüft alle Domains, `/api/health` jeder App und `video.vogelperspektive-psychologin.de` und warnt bei Zertifikaten mit weniger als 14 Tagen Laufzeit; die Server prüfen sich gegenseitig. Gatus wäre eine Alternative.
- **Push-Monitore** für jeden Backup-Lauf (2.9).
- **Benachrichtigung** über einen zweiten Weg zusätzlich zur Mail (z. B. Push aufs Handy), damit ein Mail-Ausfall nicht stumm bleibt.
- **Arcane** (Webserver) bzw. **Komodo** (Praxisraum-Server, bisheriger Plan) zeigen Container-Status und Ressourcen.
- **Logs:** Docker-Logs begrenzt (2.2). App-Logs als JSON auf stdout, ohne Formularinhalte, E-Mail-Adressen, Tokens oder volle IPs. NPM-Logs: 2.5 (Löschfrist offen). Aufbewahrung begrenzt halten und in der Datenschutzerklärung nennen.
- **Fehler-Tracking** optional: Bugsink (ein Container, versteht Sentry-SDKs) mit `sendDefaultPii: false` und ohne Session Replay. Sentry self-hosted ist für diese Größe zu groß.

### 2.12 Arcane und Komodo

- **Webserver:** Arcane verwaltet die App-Projekte (`/opt/stacks/arcane/projects/<stack>/`), Infrastruktur-Stacks laufen per Docker Compose unter `/opt/stacks/<dienst>/`. Komodo ist zurückgestellt.
- **Praxisraum-Server (bisheriger Plan):** Komodo v2 (aktuell 2.3.x, Images mit `:2`-Tags); Periphery verbindet sich **ausgehend** zur Komodo-Instanz, kein offener Port; Anmeldung über Schlüsselpaare. Version der vorhandenen Instanz auf `92.205.163.18` notieren (heute unbekannt). Ob der Praxisraum-Server ebenfalls Arcane bekommt, ist offen.

### 2.13 E-Mail und DNS

- Auf dem Webserver läuft Mailcow (Postfach kuteifan.de, flwtch.de als Pilotdomain). Weitere Postfächer liegen bis zu ihrem Umzug bei dogado; Umzug und Mail-DNS verantwortet die Server-Session.
- Bei einem Website-Umzug nur die **A/AAAA-Records** ändern, **MX, SPF, DKIM nicht anfassen**.
- Die Apps verschicken per SMTP-Login über das Postfach ihrer Domain. So bleiben SPF und DKIM gültig.
- Einmal prüfen, ob DKIM signiert wird und ob DMARC existiert. Fehlendes in dieser Reihenfolge ergänzen: SPF → DKIM → DMARC, DMARC zuerst mit `p=none` und Berichten, später verschärfen.
- Vor jeder DNS-Umstellung die TTL auf 300 Sekunden senken, danach wieder erhöhen.

### 2.14 Praxisraum-Server

**Proxy-Wahl offen (Stand 27.11.2026).** Die NPM-Entscheidung betrifft nur den Webserver. Der Text unten beschreibt den bisherigen Plan mit Caddy (Vorlage in Anhang A).

- **Zweck:** nur der Praxisraum (`app.vogelperspektive-psychologin.de`, `video.vogelperspektive-psychologin.de`): Videotelefonie von Psychologinnen mit Klient:innen, dazu Gesundheitsdaten (Art. 9 DSGVO, in der App verschlüsselt). Keine anderen Projekte.
- **Ort und Anbindung:** großes Rechenzentrum in Deutschland, 1 Gbit/s (Entscheidung 13.1). Beim Anbieter auf inklusiven Datenverkehr achten (Video erzeugt dauerhaft Traffic). AVV vor dem ersten Personendatum.
- **Größe (Einschätzung):** 4 dedizierte vCPU, 8 GB RAM, 80 GB SSD. LiveKit ist durch CPU und Bandbreite begrenzt und empfiehlt rechenoptimierte Instanzen (docs.livekit.io, Deployment). Laut LiveKit-Benchmark schafft eine 16-Kern-Maschine (`c2-standard-16`) ein Meeting mit 150 Sendenden und 150 Empfangenden bei 85 % CPU; Sitzungen mit 2–12 Personen brauchen nur einen Bruchteil. Die LiveKit-Empfehlung „10 Gbit/s“ gilt für große Produktionsumgebungen. Nach den ersten echten Sitzungen mit `docker stats` nachmessen.
- **System:** Ubuntu 26.04 LTS, Docker Engine 29 + Compose-Plugin aus dem offiziellen Docker-Repo, Grundhärtung (2.2), `ufw`, Docker-Logs begrenzt (`/etc/docker/daemon.json`: `"log-driver": "json-file", "log-opts": {"max-size": "10m", "max-file": "3"}`), `unattended-upgrades`, Snapshots beim Anbieter.
- **Caddy (bisheriger Plan):** eigener Caddy-Stack mit dem Caddyfile aus Anhang A, Sites `app.…` mit `import app-media praxisraum` und `video.…` → `praxisraum-livekit:7880`. Netz `praxisraum-proxy` für Caddy, App und LiveKit. Zertifikat fest von Let's Encrypt (`issuer acme`, die Tablet-Brücke vertraut nur ISRG Root X1/X2), `X-Robots-Tag "noindex, nofollow"`, `/api/internal/*` → 404, auf `video.…` `/twirp/*` → 404. Das Header-Soll aus 2.5 gilt unabhängig vom Proxy (mit `security-media`-Permissions-Policy).
- **Ports und Firewall** (LiveKit-Doku „Ports and firewall“, Konfiguration `deploy/livekit.yaml`):

  | Port | Zweck | Wer |
  |---|---|---|
  | 22/tcp | SSH, nur Key | Host |
  | 80/tcp, 443/tcp, 443/udp | HTTPS, HTTP/3, WebSocket für App und LiveKit-Signalisierung | Caddy |
  | 7881/tcp | ICE über TCP (Ausweg, wenn UDP gesperrt ist) | LiveKit |
  | 7882/udp | Medien über UDP, ein Port für alle (`rtc.udp_port`); damit entfällt der Bereich 50000–60000/udp | LiveKit |
  | 3478/udp | TURN/STUN (`turn.udp_port`) | LiveKit |
  | 51820/udp | WireGuard, nur vom Webserver | Host |
  | später ggf. 5349/tcp | TURN über TLS für sehr strenge Firmennetze. Die Doku rät ohne Load-Balancer zu 443; das kollidiert mit Caddy auf derselben IP → nur mit zweiter IP oder Layer-4-SNI-Routing (caddy-l4) | LiveKit |

  7880 (LiveKit-API/WebSocket) wird nicht veröffentlicht, nur Caddy spricht ihn an. In ufw alle Zeilen eintragen. Da Docker ufw umgeht, sind die veröffentlichten Ports trotzdem offen: Hier ist das gewollt, aber auch auf diesem Server setzen nur Caddy und LiveKit `ports:`. Von außen prüfen: `nmap -p- <IP>`, `nmap -sU -p 3478,7882 <IP>`.
- **Host-Netzwerk:** LiveKit empfiehlt in Docker `network_mode: host` für beste Leistung. Heute läuft es im Bridge-Netz mit festen Adressen und einem UDP-Port; das reicht für die geplante Last. Wechsel nur nach Messung. Dann gilt ufw direkt, 7880 muss per ufw gesperrt sein, und Caddy erreicht LiveKit nicht mehr per Docker-DNS, sondern über die Host-Adresse (`extra_hosts: ["host.docker.internal:host-gateway"]` im Caddy-Stack, Ziel `host.docker.internal:7880`). ufw gilt dann auch für Verkehr aus Containern zum Host: `ufw allow in on <Bridge-Schnittstelle des Caddy-/App-Netzes> to any port 7880 proto tcp` (oder das Subnetz des Netzes freigeben).
- **Öffentliche IP:** fest in `LIVEKIT_NODE_IP` (`.env`), keine STUN-Abfrage bei Google (Praxisraum-README „LiveKit und die öffentliche IP“). Bei einem Serverwechsel anpassen.
- **Backups, Monitoring, Komodo:** wie 2.9 (Praxisraum-Server), 2.11, 2.12, eigenes restic-Repository. Die Sicherungen enthalten die Daten verschlüsselt; ohne den passenden `NUXT_DATA_KEY` sind sie wertlos.

### 2.15 Verbindung Webserver ↔ Praxisraum-Server

Website und Praxisraum tauschen Daten aus (`/api/internal/*`: Namen, E-Mail-Adressen, Termine; gemeinsamer Login). Früher war das ein internes Docker-Netz; über Servergrenzen geht das nicht. **Entwurf** (WireGuard-Kopplung geplant laut Server-Session; Tunnel, Listener, Filter und Zugangsdaten-Ablage beim Aufbau entscheiden und vor Einsatz beidseitig testen):

- **WireGuard-Tunnel** `wg0` zwischen den Servern: Webserver `10.90.0.1`, Praxisraum-Server `10.90.0.2`, Port 51820/udp nur von der IP der Gegenstelle. Beispiel Webserver:
  ```ini
  # /etc/wireguard/wg0.conf (chmod 600), Start: systemctl enable --now wg-quick@wg0
  [Interface]
  Address = 10.90.0.1/24
  ListenPort = 51820
  PrivateKey = <aus wg genkey, nur auf diesem Server>
  [Peer]
  PublicKey = <öffentlicher Schlüssel Praxisraum-Server>
  AllowedIPs = 10.90.0.2/32
  Endpoint = <IP Praxisraum-Server>:51820
  PersistentKeepalive = 25
  ```
- **Interne API nur auf der Tunnel-Adresse.** Webserver, **Vorschlag der Server-Session (Entwurf):** eigener kleiner HTTP-Proxy, gebunden an `10.90.0.1:8080`, per nftables auf `wg0` und den bekannten Peer begrenzt; er leitet nur vereinbarte interne Routen an den passenden App-Stack, darunter beidseitig `POST /api/internal/sso/logout` mit Dienst-Schlüssel. Dieser Listener ist **kein** öffentlicher NPM-Proxy-Host. Praxisraum-Server: Proxy offen (bisheriger Caddy-Block in Anhang A).
- **Öffentlich gesperrt:** Der öffentliche Proxy sperrt `/api/internal` und das Präfix `/api/internal/` (Advanced-Feld: exakter Match plus `^~`-Präfix, `container-und-deployment.md`).
- Die Apps rufen die Gegenseite unter `http://10.90.0.2:8080` bzw. `http://10.90.0.1:8080` auf (Praxisraum: `NUXT_SERVICE_WEBSITE_URL`). Öffentlich bleibt `/api/internal/*` auf beiden Domains 404.
- **Docker erst nach WireGuard starten**, sonst scheitert das Binden an `10.90.0.x`: Drop-in `/etc/systemd/system/docker.service.d/wireguard.conf` mit `[Unit]`, `After=wg-quick@wg0.service`, `Wants=wg-quick@wg0.service`.
- **Nur über `wg0` zulassen:** Docker-DNAT greift unabhängig von der Netzwerkkarte. Zusätzlich in der Kette `DOCKER-USER` (sie sieht weitergeleiteten Verkehr in beide Richtungen) nur neue Verbindungen zur **eigenen** Tunnel-Adresse und zum internen Port verwerfen, die nicht über `wg0` kommen. Beispiel Praxisraum-Server: `iptables -I DOCKER-USER -m conntrack --ctdir ORIGINAL --ctorigdst 10.90.0.2 --ctorigdstport 8080 ! -i wg0 -j DROP`. Nicht das ganze `10.90.0.0/24` sperren: Sonst verwirft die Regel auch die ausgehenden Aufrufe der eigenen App-Container an die Gegenstelle (die kommen über die Bridge, nicht über `wg0`). Auf dem Webserver übernehmen das laut Vorschlag die nftables-Regeln (Server-Session). Vor Einsatz testen: aus dem App-Container die Gegenstelle unter `http://<Gegenstelle>:8080/api/internal/…` aufrufen (muss gehen) und von außen `nmap -p 8080 <öffentliche IP>` (muss `filtered`/`closed` zeigen).
- **Anwendungsebene:** Jede interne Anfrage trägt zusätzlich den Dienst-Schlüssel bzw. eine HMAC-Signatur mit Zeitstempel; die App prüft sie, auch wenn die Anfrage über den Tunnel kommt.
- Der Tunnel verschlüsselt; der Proxy spricht darin bewusst nur HTTP.

## 3. Umzugsplan

| Schritt | Was | Voraussetzung |
|---|---|---|
| 0 | **Webserver:** eingerichtet (IPAX, NPM, Arcane, Mailcow, Restic; Session „FlowTech Server-Einrichtung“). Offen vor Live: AVV abgleichen, App-Deployments und NPM-Anbindung der App-Stacks, App-Backup und Restore-Test je App, `NUXT_DATA_KEY`-Ablage, Header-Policy, Vertrauenskette (Client-IP, Proto/Host), 1-MB-Grenze, NPM-Log-Format und -Frist, externes Monitoring | – |
| 0a | **Praxisraum-Server:** Anbieter mit großem RZ in Deutschland und 1 Gbit/s wählen, AVV, Einrichtung, Proxy-Wahl, ufw nach 2.14, WireGuard zum Webserver (2.15) | Entscheidung für Anbieter; kann nach Schritt 1 folgen |
| 1 | **Vogelperspektive:** Dateien auf die Vorlagen umstellen (`node:26-slim`, Image aus GHCR per Digest, Netz `vogelperspektive-{staging,live}-proxy`, NPM-Beschreibung statt Caddy-Datei, CI-Workflow, interne API über 2.15 statt `vogelperspektive-intern`). Auf Staging testen, auch den echten SMTP-Versand. Die 8 Newsletter-Abonnenten aus der alten Datenbank übernehmen. Dann DNS umstellen. Die alte Seite auf dogado noch 4 Wochen als Rückfall behalten. | Schritt 0 |
| 1a | **Praxisraum:** auf die Vorlagen umstellen (Netz `praxisraum-proxy` für App und LiveKit, `praxisraum-intern` bleibt, `vogelperspektive-intern` entfällt, Permissions-Policy für Medien), auf dem Praxisraum-Server deployen, Ports von außen prüfen, Testsitzung mit zwei Geräten (eines im Mobilfunknetz). Termin nach dem Gespräch mit Jara. | Schritte 0a und 1 |
| 2 | **FlowTech:** statischer Nginx-Container nach 2.5a (Pilot: FlowTech-Vorschau), Release nach 2.7, NPM-Proxy-Host, DNS umstellen. Die zweite Domain leitet auf flow-tech.org weiter (Entscheidung 15). Livegang durch die Session „FlowTech Server-Einrichtung“. | Schritt 0 |
| 3 | **Ortrud:** `kontakt.php` durch `server/api/contact.post.ts` ersetzen (Muster Vogelperspektive), Modus B. Schriften: heute `@nuxt/fonts` mit `provider: 'google'` je Familie → Pakete `@fontsource/…` bzw. `@fontsource-variable/…` (Pinyon Script gibt es nur als `@fontsource/pinyon-script`, Cormorant braucht Kursiv) und npm-Provider (Details in `WebSites/.claude/rules/performance.md`). Stacks `ortrud-{staging,live}` auf dem Webserver, Postfach in Mailcow. | Domain-Zugang |
| 4 | **Gora:** auf die Vorlagen umstellen (Build mit `npm run build:server`, Migrationen als Nitro-Plugin statt Entrypoint-Skript, Netz `gora-{staging,live}-proxy`), `GORA_DATABASE_PATH=/app/.data/gora.sqlite`. Daten per Admin-Export/-Import aus dem Staging übernehmen. Domain-Umzug von SiteGround mit dem Gora-Team abstimmen, DNS-Zone liegt bei Wix. | Absprache Gora |
| 5 | **Aufräumen:** dogado-Webspaces leeren; dogado aufgeben, sobald auch die Postfächer umgezogen sind (Entscheidung 27.11.2026). Auf `92.205.163.18` das Docker-29-Update separat erledigen. | Schritte 1–4 |

## 4. Offene Entscheidungen

1. ~~Neuer VPS oder der vorhandene Server `92.205.163.18`?~~ Entschieden 21.11.2026: eigene Server, getrennt vom Geschäftsserver.
2. ~~VPS-Anbieter Webserver~~ IPAX (Wien), dedizierter Root-Server; AVV/Vertragspartner noch abgleichen. Backup: Restic auf dem Server + SFTP-Pull auf den Windows-PC (2.9).
3. Anbieter und Rechenzentrum des Praxisraum-Servers, Größe nach den ersten Messungen, inklusiver Datenverkehr.
4. Wo die Serverdateien versioniert liegen. Webserver: heute unter `FlowTech/Admin/server/` (Server-Session); Praxisraum-Server offen.
5. Details der Server-Verbindung (2.15): Adressen, HMAC oder Dienst-Schlüssel, Persistenz der Firewall-Regeln, interner HTTP-Proxy des Webservers (Entwurf der Server-Session).
6. LiveKit: Host-Netzwerk ja/nein (nach Messung), TURN über TLS für strenge Firmennetze (443 nur mit zweiter IP oder Layer-4-Routing, sonst 5349).
7. Wo die DNS-Zonen der Domains liegen und wer Zugriff hat (bekannt: Gora bei Wix; offen: Vogelperspektive, FlowTech, Ortrud).
8. Verfahren für den Layer-Token (2.8) beim Anlegen des Layers bestätigen.
9. Externes Uptime-Monitoring und zweiter Benachrichtigungsweg.
10. Fehler-Tracking mit Bugsink: ja oder nein.
11. Zugriffslog: Löschfrist der NPM-Logs live (2.5).
12. ~~Calendly durch eigene Terminbuchung ersetzen?~~ Erledigt am 08.11.2026.
13. Proxy des Praxisraum-Servers (Caddy wie bisher geplant, NPM oder anderes).
14. Verbindliche Header-Policy für NPM: Ort der `add_header` (wegen `X-Served-By` in `location /`), HSTS ohne `preload`, Umsetzung der `Referrer-Policy`-Vorgabe (2.5).
15. Automatische Bereitstellung statischer Releases (2.7).

## Anhang A: Historische Caddy-Vorlage (bis 27.11.2026)

Bis zur Entscheidung 47 war Caddy als Proxy des Webservers geplant. Die Vorlage bleibt als Referenz stehen: für den Praxisraum-Server (Proxy-Wahl offen) und als Beschreibung des Header-Solls (2.5). Für den Webserver gilt sie **nicht** mehr. Die Verweise auf Komodo, `TAG` und `/srv/proxy` beziehen sich auf den alten Plan.

### A.1 Caddy-Stack, Caddyfile und Site-Dateien

Beide Server haben denselben Caddy-Stack und dasselbe Caddyfile mit denselben Snippets; es unterscheiden sich nur die Netze, `ports:` und `sites/`.

`/srv/proxy/compose.yml` (Webserver)

```yaml
services:
  caddy:
    image: caddy:2.11.<patch>-alpine@sha256:<digest>   # voller Tag + Digest, Renovate
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
      - "10.90.0.1:8080:8080"           # interne Schnittstelle, nur über WireGuard (2.15)
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./sites:/etc/caddy/sites:ro
      - /srv/static:/srv/static:ro
      - caddy-data:/data
      - caddy-config:/config
    networks: [default, vogelperspektive-proxy, gora-proxy, ortrud-proxy]
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]         # Ports 80/443; vor Einsatz testen
    security_opt: ["no-new-privileges:true"]
    logging:
      options: { max-size: "10m", max-file: "3" }
volumes:
  caddy-data:
  caddy-config:
networks:
  vogelperspektive-proxy: { external: true }
  gora-proxy: { external: true }
  ortrud-proxy: { external: true }
```

Auf dem Praxisraum-Server gleich, aber `10.90.0.2:8080:8080`, ohne `/srv/static` und mit dem Netz `praxisraum-proxy`.

`/srv/proxy/Caddyfile` (Snippet-Argumente, Matcher und Log-Optionen vor Einsatz mit `docker exec caddy caddy validate --config /etc/caddy/Caddyfile` prüfen)

```caddy
{
	email info@flow-tech.org
	# Kein trusted_proxies: Caddy ersetzt ein eingehendes X-Forwarded-For durch die echte Client-IP.
	# Steht später ein CDN davor: trusted_proxies setzen und die Regel zur Client-IP anpassen.
}

# Feste Sicherheits-Header, eine Quelle. Die CSP kommt in B/C aus der App (nuxt-security,
# samt frame-ancestors), in Modus A als Meta-Tag; frame-ancestors setzt dann (static).
(headers-base) {
	header {
		Strict-Transport-Security "max-age=63072000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		?Referrer-Policy "strict-origin-when-cross-origin"   # ? = nur wenn die App keine eigene setzt (z. B. no-referrer auf Token-Seiten)
		Cross-Origin-Opener-Policy "same-origin"
		Cross-Origin-Resource-Policy "same-site"
		-Server
		-X-Powered-By   # setzt Nitro/Nuxt („Nuxt“); nuxt-security bleibt dafür aus
	}
}

(security) {
	import headers-base
	header Permissions-Policy "camera=(), microphone=(), geolocation=()"
}

# Nur Praxisraum: Kamera, Mikrofon, Bildschirmfreigabe. connect-src (wss:) steht in der App-CSP.
(security-media) {
	import headers-base
	header Permissions-Policy "camera=(self), microphone=(self), display-capture=(self), fullscreen=(self), geolocation=()"
}

# Modus B/C. Aufruf: import app <container>
(app) {
	import security
	encode zstd gzip
	request_body {
		max_size 1MB
	}
	reverse_proxy {args[0]}:3000 {
		lb_try_duration 10s   # wartet während eines Neustarts, statt 502 zu liefern
	}
}

# Wie (app), aber mit (security-media). Aufruf: import app-media <container>
(app-media) {
	import security-media
	encode zstd gzip
	request_body {
		max_size 1MB
	}
	reverse_proxy {args[0]}:3000 {
		lb_try_duration 10s
	}
}

# Modus A. Aufruf: import static <domain>
(static) {
	import security
	header Content-Security-Policy "frame-ancestors 'none'"   # wirkt nicht im Meta-Tag
	root * /srv/static/{args[0]}
	encode zstd gzip
	# /_nuxt/* trägt Hashes im Namen → 1 Jahr. Nur latest.json muss frisch sein,
	# sonst erkennt Nuxt keine neuen Deploys.
	@latest path /_nuxt/builds/latest.json
	header @latest Cache-Control "no-cache"
	@hashed {
		path /_nuxt/*
		not path /_nuxt/builds/latest.json
	}
	header @hashed Cache-Control "public, max-age=31536000, immutable"
	# HTML (Pfade auf /, .html oder ohne Dateiendung) immer neu prüfen; Bilder bleiben ohne Regel (ETag)
	@html path_regexp ^(.*/|.*\.html|[^.]*)$
	header @html Cache-Control "no-cache"
	file_server {
		precompressed br zstd gzip   # .br/.gz aus nitro.compressPublicAssets
		hide .htaccess*              # Nitro kopiert .htaccess (dogado) mit .br/.gz in die Ausgabe
	}
	handle_errors {
		rewrite * /404.html
		file_server
	}
}

(staging) {
	basic_auth {
		florian <hash von: docker exec caddy caddy hash-password>
	}
	header X-Robots-Tag "noindex, nofollow"
}

# Zugriffslog: Standard ist AUS (Caddy schreibt ohne log-Direktive keins).
# Nur bei Bedarf und nur so. Aufruf: import accesslog <domain>
(accesslog) {
	log {
		output file /data/access-logs/{args[0]}.log {
			roll_interval 24h
			roll_keep_for 144h   # + bis 24 h im aktiven File = höchstens 7 Tage
		}
		format filter {
			wrap json
			fields {
				request>remote_ip ip_mask 16 32
				request>client_ip ip_mask 16 32
				request>headers>X-Forwarded-For delete
			}
		}
	}
}

import /etc/caddy/sites/*.caddy
```

Hinweise zum Caddyfile:
- **Header-Reihenfolge:** Wegen `-Server` wendet Caddy den Header-Block erst beim Schreiben der Antwort an und überschreibt dabei gleichnamige Header der App. Deshalb setzt die App (nuxt-security) nur die CSP, alle anderen Header kommen von hier, jeder aus genau einer Quelle. Einzige Ausnahme: `Referrer-Policy` steht mit `?` und gilt nur als Vorgabe, weil Seiten mit persönlichem Token im Link (Newsletter, Einladungen, Praxisraum) per `routeRules` `no-referrer` setzen müssen (`formulare-und-datenschutz.md`); ohne `?` würde Caddy das überschreiben. Nach dem ersten Deployment mit `curl -sI https://<domain>/` prüfen: jeder Header genau einmal.
- **Kein Snippet-Mischen:** Eine Site importiert genau eins von `app`, `app-media`, `static` oder schreibt den Block aus. Nie `security` und `security-media` zusammen (zwei `Permissions-Policy`).
- **HSTS mit `includeSubDomains`** nur, wenn alle Subdomains der Domain HTTPS können (auch Mail-Webinterfaces). Sonst eigener `header`-Block ohne `includeSubDomains` statt Snippet (heute Gora: DNS-Zone bei Wix, nicht von uns verwaltet; vor dem Livegang prüfen, ob `includeSubDomains` möglich ist).
- **`Cross-Origin-Resource-Policy: same-site`** sperrt das Einbinden eigener Bilder auf fremden Seiten. Bilder in Newsletter-Mails, die Webmailer direkt laden, brauchen vermutlich einen eigenen Pfad mit `cross-origin` (Einschätzung, beim ersten Newsletter prüfen).
- **Zugriffslog:** nur mit gekürzter IP (IPv4 /16, IPv6 /32), ohne `X-Forwarded-For`, täglich rotiert (`roll_interval`, erst ab Caddy 2.11.0) und nach 6 Tagen gelöscht, ein Eintrag ist also höchstens 7 Tage alt. Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO (IT-Sicherheit); keine gesetzliche Höchstdauer, 7 Tage stammen aus der TK-Praxis (BGH III ZR 146/10, BfDI-Leitfaden). Zweck und Frist in die Datenschutzerklärung. `/data/access-logs` liegt im Volume `caddy-data`.
- **Kompression:** Modus A liefert die beim Build erzeugten `.br`/`.gz`-Dateien (`precompressed`), `encode` komprimiert alles Dynamische. HTTP/3 ist bei Caddy Standard (dafür `443/udp`).
- **Caching:** Die Regeln in `(static)` gelten nur für Modus A. In B/C liefert Nitro `/_nuxt` selbst mit passenden Headern aus; keine eigene Regel.
- **Zertifikate** holt und erneuert Caddy selbst (Let's Encrypt). Uptime Kuma warnt zusätzlich bei Ablauf (2.11).
- **Body-Größe:** `(app)` begrenzt Anfragen auf 1 MB. Projekte mit Uploads schreiben den Block aus und erlauben nur auf der Upload-Route mehr (zwei `request_body` mit sich ausschließenden Matchern, sonst gilt die kleinere Grenze für alle):
  ```caddy
  <domain> {
  	import security
  	encode zstd gzip
  	@upload path /api/admin/upload
  	request_body @upload {
  		max_size 20MB
  	}
  	@normal not path /api/admin/upload
  	request_body @normal {
  		max_size 1MB
  	}
  	reverse_proxy <name>:3000 {
  		lb_try_duration 10s
  	}
  }
  ```

Beispiele für Site-Dateien (projektseitige Vorlagen in `WebSites/.claude/rules/container-und-deployment.md`):

```caddy
# sites/flow-tech.org.caddy (Modus A)
flow-tech.org {
	import static flow-tech.org
}
www.flow-tech.org {
	redir https://flow-tech.org{uri} permanent
}

# sites/vogelperspektive-psychologin.de.caddy (Modus B)
vogelperspektive-psychologin.de {
	@internal path /api/internal/*
	respond @internal 404          # öffentlich nie; der Praxisraum kommt über 2.15
	import app vogelperspektive
}
www.vogelperspektive-psychologin.de {
	redir https://vogelperspektive-psychologin.de{uri} permanent
}

# sites/vogelperspektive.staging.flow-tech.org.caddy (Staging)
vogelperspektive.staging.flow-tech.org {
	import staging
	import app vogelperspektive-staging
}
```

Der Praxisraum (`deploy/praxisraum.caddy`, auf dem Praxisraum-Server): `import app-media praxisraum`, Zertifikat fest von Let's Encrypt (`issuer acme`, die Tablet-Brücke vertraut nur ISRG Root X1/X2), `X-Robots-Tag "noindex, nofollow"`, `/api/internal/*` → 404, dazu `video.vogelperspektive-psychologin.de` → `praxisraum-livekit:7880` mit `/twirp/*` → 404.

Neu laden nach jeder Änderung: `docker exec caddy caddy validate --config /etc/caddy/Caddyfile && docker exec caddy caddy reload --config /etc/caddy/Caddyfile`.

### A.2 Interne Schnittstelle (2.15) mit Caddy

Webserver `sites/intern.caddy`; Caddy veröffentlichte dafür `10.90.0.1:8080` (Praxisraum-Server gleich mit `10.90.0.2:8080` und `praxisraum:3000`):

```caddy
http://:8080 {
	@internal path /api/internal/*
	handle @internal {
		reverse_proxy vogelperspektive:3000
	}
	respond 404
}
```

### A.3 Alter Deploy-Ablauf (Webserver, bis 27.11.2026)

- Modus A: `npm run generate && rsync -az --delete --delay-updates .output/public/ webserver:/srv/static/<domain>/`, Caddy lieferte `/srv/static/<domain>` mit `import static` aus.
- Modus B/C: Komodo-Stack mit `TAG=<git-sha>`, Rückweg = vorigen SHA setzen; Snapshot per `/srv/backup/bin/snapshot.sh` (2.9, Praxisraum-Server).
- Firewall-Plan: `ufw allow 22/tcp`, `80/tcp`, `443/tcp`, `443/udp` (HTTP/3), WireGuard nur von der Gegenstelle; nur der Caddy-Stack setzt `ports:`.
