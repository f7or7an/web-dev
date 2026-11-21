# Server: Ist-Zustand, Soll-Zustand und Umzug

Stand: 21.11.2026. Gilt zusammen mit [CLAUDE.md](CLAUDE.md). Die Dateien im Projekt-Repo stehen als Vorlagen in `WebSites/.claude/rules/container-und-deployment.md` (Dockerfile, `compose.yml`, Healthcheck, Migrationen beim Start, Caddy-Datei pro Projekt) und `WebSites/.claude/rules/ci-workflow.md` (GitHub Actions). Diese Datei beschreibt die Serverseite.
Quellen: die Projektordner, frühere Claude-Sessions vom 06.11.2026 (dogado-Zugang, FlowTech-Deployment, Vogelperspektive-Neubau, OS-Update des Linux-Servers), Betriebsprüfungen Praxisraum vom 20./21.11.2026, Recherche „Betrieb“, Pilottest und Prüfrunde 1 vom 21.11.2026, LiveKit-Doku (docs.livekit.io, Self-hosting: Ports and firewall, Deployment, Benchmark; abgerufen 21.11.2026).

## 1. Ist-Zustand

### 1.1 dogado Shared Hosting (Plesk)

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
- **Ortrud:** Hoster und Zugang für kuteifan.de sind noch unbekannt.
- **Praxisraum:** Prototyp nur lokal, noch kein Server.
- **Lokal:** Windows 11, Projekte unter `C:\Users\flori\Documents\FlowTech\WebSites`. Installiert sind Node 24.13 und npm 11.6 (21.11.2026). Soll: Node 26 LTS und npm ≥ 12.2.2 (`npm i -g npm@12`, Node 26 bringt nur npm 11 mit). Der Pilottest vom 21.11.2026 lief mit Node 26.13.1 und npm 12.2.2 fehlerfrei.

### 1.4 Stand der Serverdateien in den Projekten

Alle drei App-Projekte haben schon `compose.yml` ohne Proxy und eine Caddy-Datei unter `deploy/`. Sie folgen aber noch dem alten Muster und werden in Phase 2 auf die Vorlagen umgestellt (Einträge in der jeweiligen `STANDARDS-AUDIT.md`).

| Projekt | Abweichungen von den neuen Vorlagen |
|---|---|
| Vogelperspektive | `node:24-alpine`, Healthcheck mit `wget`, `NODE_OPTIONS=--disable-warning…`, Netz `web`, internes Docker-Netz zum Praxisraum (künftig WireGuard, 2.15), `build: .` statt Image aus GHCR, kein `init`/`mem_limit`/`stop_grace_period` |
| Praxisraum | `node:24` Alpine (per Digest), `wget`, Netz `web`, Netz `vogelperspektive-intern` (künftig WireGuard), Rückweg per `:prev`-Tag. Zieht auf den eigenen Praxisraum-Server (2.14). |
| Gora | `node:24-alpine`, `wget`, Netz `web`, Migrationen im Entrypoint-Skript statt Nitro-Plugin, eigene Header ohne `includeSubDomains` (gewollt, siehe 2.5) |

### 1.5 Probleme des Ist-Zustands

1. Vogelperspektive (B), Praxisraum (C) und Gora (C) sind Node-Apps. Sie können auf dogado nicht laufen und haben heute keinen Produktivserver.
2. ~~`Vogelperspektive/webapp/Vogelperspektive/deploy/` bringt einen eigenen Caddy auf 80/443 mit.~~ Erledigt am 09.11.2026: `compose.yml` ohne Proxy und `deploy/vogelperspektive-psychologin.de.caddy` für den zentralen Caddy. Auf `92.205.163.18` hätte ein eigener Caddy mit nginx kollidiert. Außerdem sollen Websites dort nicht mitlaufen: Eine angreifbare Website darf die Zahlungsdienste nicht gefährden, und jedes Wartungsfenster würde beides treffen.
3. Das Hosting ist auf vier Anbieter verteilt (dogado ×2, SiteGround, ChatGPT Sites, dazu der unbekannte Ortrud-Hoster). Deployment, TLS und Backups laufen überall anders.
4. Es gibt keine einheitlichen Backups für Anwendungsdaten (SQLite).
5. ~~Calendly bei Vogelperspektive~~ Erledigt am 08.11.2026: eigene Terminbuchung.

## 2. Soll-Zustand

### 2.1 Überblick

Zwei neue Server, beide getrennt vom Geschäftsserver (entschieden 21.11.2026):
- **Webserver** für alle Websites und Web-Apps außer dem Praxisraum. Ein Caddy verteilt alle Domains: statische Seiten liefert er direkt aus, Apps laufen als Container dahinter. Grundlage für das Hosting-Angebot von FlowTech: Jeder neue Kunde bekommt einen Compose-Stack, ein Netz `<name>-proxy` und eine Caddy-Datei.
- **Praxisraum-Server** nur für den Praxisraum (App + LiveKit-Videoserver), in einem großen deutschen Rechenzentrum mit 1 Gbit/s (Entscheidung 13.1). Grund: Videotelefonie braucht offene Medien-Ports und Bandbreite; auf dem Webserver gilt ausnahmslos „nur Caddy veröffentlicht Ports“.

Die Server bauen nichts: Images entstehen in GitHub Actions und liegen in der privaten GitHub Container Registry (GHCR).

```
                               Internet
                  ┌───────────────┴────────────────────────┐
   DNS: Website-Domains                         DNS: app.… und video.vogelperspektive-psychologin.de
                  │                                         │
┌─────────────────▼─ Webserver (Ubuntu 26.04, Docker 29)   ┌▼─ Praxisraum-Server (großes RZ in DE, 1 Gbit/s)
│ ufw: 22 · 80 · 443/tcp+udp · 51820/udp nur von PR-Srv   │ ufw: 22 · 80 · 443/tcp+udp · 7881/tcp · 7882/udp
│                                                          │      · 3478/udp · 51820/udp nur vom Webserver
│ Caddy (einziger Container mit ports:)                    │ Caddy (eigener Stack, gleiche Snippets)
│  ├─ flow-tech.org          → /srv/static/flow-tech.org   │  ├─ app.…   → praxisraum:3000
│  ├─ vogelperspektive-…     → vogelperspektive:3000       │  └─ video.… → praxisraum-livekit:7880
│  ├─ kuteifan.de            → ortrud:3000                 │ LiveKit: ports 7881/tcp, 7882/udp, 3478/udp
│  ├─ goraosaznanie.com      → gora:3000                   │ Netz praxisraum-intern: App ↔ LiveKit
│  ├─ <name>.staging.…       → <name>-staging:3000         │ /srv/apps/praxisraum/data (SQLite, verschlüsselt)
│  └─ 10.90.0.1:8080 (nur wg0) → /api/internal/*           │ Caddy 10.90.0.2:8080 (nur wg0) → /api/internal/*
│ je App: Netz <name>-proxy, node:26-slim, read-only       │
│ /srv/apps/<name>/data → /app/.data                       │
│ Komodo Periphery · Backup-Timer → restic → Push          │ Komodo Periphery · Backup-Timer → restic → Push
└───────────────────────────┬──────────────────────────────┴──────────┬───────────────
                            └──── WireGuard wg0 10.90.0.1 ↔ 10.90.0.2 ─┘

GitHub Actions:      lint, typecheck, Tests, Build, Image-Scan → ghcr.io/f7or7an/<name>:<git-sha>
dogado:              nur noch E-Mail (SMTP für die Apps)
92.205.163.18:       bleibt Geschäftsserver (Zahlung, VPN), keine Websites;
                     Uptime Kuma überwacht beide neuen Server (und umgekehrt)
```

### 2.2 Webserver

- **Getrennter VPS** in Deutschland (z. B. Hetzner Cloud, netcup, IONOS). Für 10–20 Seiten dieser Größe reichen 2–4 vCPU, 4–8 GB RAM und 80 GB SSD. Snapshots beim Anbieter aktivieren.
- **AVV zuerst:** Den Auftragsverarbeitungsvertrag mit dem VPS-Anbieter und dem Backup-Ziel abschließen, bevor das erste Personendatum auf dem Server liegt. Er entsteht nicht automatisch: Hetzner unter accounts.hetzner.com/account/dpa, netcup im CCP unter Stammdaten → Auftragsverarbeitung.
- **Ubuntu 26.04 LTS** (Upgrade-Pfad seit 29.09.2026 frei, Docker unterstützt 26.04). **Docker Engine 29** + Compose-Plugin aus dem offiziellen Docker-Repo; der containerd-Image-Store ist dort Standard.
- **Grundhärtung:** eigener Benutzer mit sudo, SSH nur per Key (`PasswordAuthentication no`, `PermitRootLogin no`), `ufw`, `fail2ban` für SSH, `unattended-upgrades` für Sicherheitsupdates, Zeit-Sync. CrowdSec ist nicht nötig.
- **Docker-Logs begrenzen** in `/etc/docker/daemon.json`: `"log-driver": "json-file", "log-opts": {"max-size": "10m", "max-file": "3"}`.
- **Firewall:** `ufw allow 22/tcp`, `80/tcp`, `443/tcp`, `443/udp` (HTTP/3), dazu `ufw allow from <IP Praxisraum-Server> to any port 51820 proto udp` (WireGuard).
- **Docker umgeht ufw:** Veröffentlichte Ports schreibt Docker per DNAT in iptables, bevor ufw greift ([docs.docker.com](https://docs.docker.com/engine/network/packet-filtering-firewalls/)). Eine ufw-Sperre wirkt dort nicht. Deshalb gilt auf dem Webserver **ausnahmslos**:
  - Nur der Caddy-Stack setzt `ports:` (80, 443, 443/udp und die interne Schnittstelle auf der WireGuard-Adresse, 2.15). Kein anderer Stack, auch nicht zum Testen.
  - Debug-Zugriff nur an localhost: `127.0.0.1:<port>:3000`, danach wieder entfernen.
  - Von außen prüfen: `nmap -p- <IP>` und `nmap -sU --top-ports 100 <IP>` zeigen nur die Ports oben.
- **Updates:**
  - Ubuntu-Sicherheitsupdates über `unattended-upgrades`. Docker-Pakete aus dem Docker-Repo deckt das vermutlich nicht ab (ungeprüft) → Docker bewusst aktualisieren, nach den Release-Notes.
  - Images: volle Versions-Tags mit Digest (`node:26.13.1-slim@sha256:…`), Renovate aktualisiert sie (Regeln in `WebSites/.claude/rules/abhaengigkeiten-und-layer.md`). Jede Digest-Änderung ist ein Commit, also baut die CI ein neues Image mit den Patches des Basis-Images. Das ist der wöchentliche Neubau.
  - Caddy-Image ebenso mit vollem Tag und Digest (siehe offene Entscheidung 4).
- **Zero-Downtime** ist nicht nötig: `lb_try_duration` in Caddy überbrückt den Neustart eines Containers. `container_name` bleibt.

### 2.3 Verzeichnisse (beide Server)

```
/srv/
  proxy/
    compose.yml            Caddy-Stack
    Caddyfile              globale Einstellungen + Snippets, importiert sites/*.caddy
    sites/<domain>.caddy   eine Datei pro Website (Quelle: deploy/<domain>.caddy im Projekt-Repo)
  static/<domain>/         Modus A: Inhalt von .output/public (nur Webserver)
  apps/<name>/
    data/                  Volume der App (SQLite, Uploads), Besitzer UID 1000 (node)
    .env                   Geheimnisse, chmod 600 (oder in Komodo hinterlegt)
  backup/<name>/           lokale SQLite-Snapshots (Quelle für restic), Besitzer UID 1000, chmod 700
  backup/bin/snapshot.sh   Snapshot-Skript (2.9)
/etc/restic/env            Zugang zum Backup-Ziel + Push-URL, chmod 600
/etc/wireguard/wg0.conf    Tunnel zwischen Webserver und Praxisraum-Server (2.15), chmod 600
```

### 2.4 Netze

- **Jeder App-Stack hat ein eigenes Netz `<name>-proxy`.** Darin hängen nur dieser Stack und Caddy; Caddy hängt in allen. Grund: Im früher geplanten gemeinsamen Netz `web` hätte jeder Container einen Netz-Alias wie `praxisraum` tragen und Anfragen von Caddy abfangen können (Analyse 21.11.2026). Ein Netz `web` gibt es nicht mehr.
- Die Netze legt man einmalig von Hand an (nicht im App-Stack), damit `docker compose down` einer App nicht am Netz scheitert, an dem Caddy hängt:
  ```sh
  docker network create <name>-proxy
  docker network connect <name>-proxy caddy          # sofort, ohne Neustart von Caddy
  ```
  Danach das Netz in `/srv/proxy/compose.yml` eintragen, damit es nach einem Neuanlegen von Caddy wieder dabei ist. `<name>-proxy` ist nicht `internal`, weil die App ausgehend SMTP braucht.
- **Datenaustausch zwischen Stacks auf demselben Server** nie über `<name>-proxy`, sondern über ein eigenes Netz mit `internal: true` und **festen Adressen** statt Containernamen. Grund: Eine feste Adresse in einem Netz, in dem nur die beteiligten Container hängen, kann niemand sonst übernehmen (Prüfung 21.11.2026). Feste Adressen in die untere Hälfte des Subnetzes, `--ip-range` auf die obere, damit Docker nichts doppelt vergibt.
- **Über Servergrenzen** (Website ↔ Praxisraum) geht das nicht: dafür WireGuard (2.15).
- Reservierte Adressen (hier eintragen, bevor ein neues Netz angelegt wird):

  | Netz | Server | Subnetz | Wer | Angelegt von |
  |---|---|---|---|---|
  | `praxisraum-intern` (Docker, `internal`) | Praxisraum-Server | 10.89.21.0/24 | Praxisraum-App .10, LiveKit .11 | Praxisraum-`compose.yml` |
  | `wg0` (WireGuard) | beide | 10.90.0.0/24 | Webserver .1, Praxisraum-Server .2 | `/etc/wireguard/wg0.conf` |
  | ~~`vogelperspektive-intern`~~ | – | ~~10.89.20.0/24~~ | entfällt mit dem eigenen Praxisraum-Server (13.1) | – |

- Proxy-Netze (Liste aktuell halten): Webserver `vogelperspektive-proxy`, `gora-proxy`, `ortrud-proxy`, dazu je `<name>-staging-proxy`; Praxisraum-Server `praxisraum-proxy` (App und LiveKit).

### 2.5 Proxy (Caddy)

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
		Referrer-Policy "strict-origin-when-cross-origin"
		Cross-Origin-Opener-Policy "same-origin"
		Cross-Origin-Resource-Policy "same-site"
		-Server
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
- **Header-Reihenfolge:** Wegen `-Server` wendet Caddy den Header-Block erst beim Schreiben der Antwort an und überschreibt dabei gleichnamige Header der App. Deshalb setzt die App (nuxt-security) nur die CSP, alle anderen Header kommen von hier, jeder aus genau einer Quelle. Nach dem ersten Deployment mit `curl -sI https://<domain>/` prüfen: jeder Header genau einmal.
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

### 2.6 App-Container (Modus B/C)

Dockerfile, `compose.yml`, `.dockerignore`, Healthcheck und Migrationen beim Start: Vorlagen in `WebSites/.claude/rules/container-und-deployment.md`. Für die Server gilt:
- Containername = Projektname = Hostname im Caddy-Block. Intern lauscht jede App auf Port 3000.
- `restart: unless-stopped` ist Pflicht, sonst ist der Container nach einem Reboot weg.
- Beschreibbar ist nur `/srv/apps/<name>/data` (→ `/app/.data`) und `/tmp` (tmpfs). Ordner vorher anlegen: `sudo install -d -o 1000 -g 1000 /srv/apps/<name>/data`.
- Kein Container bekommt `docker.sock`.
- Jede App hat `/api/health`. Docker prüft ihn per `HEALTHCHECK`, Uptime Kuma von außen.
- Absolute URLs (Canonical, Links in Mails, Weiterleitungen) bildet die App aus `runtimeConfig.public.siteUrl`, nicht aus Anfrage-Headern; Nuxt ≥ 4.6.4 vertraut `x-forwarded-proto` nicht automatisch. Details: `WebSites/.claude/rules/server-und-sicherheit.md`.

### 2.7 Deployment

**Modus A (statisch):** lokal bauen und hochladen. `webserver` ist ein Host-Alias in `~/.ssh/config` (Host, Benutzer, Key); beim Einrichten des Servers anlegen.

```bash
npm run generate && rsync -az --delete --delay-updates .output/public/ webserver:/srv/static/flow-tech.org/
```

Bis zum Umzug bleibt der heutige dogado-Weg: `tar` über SSH auf `web250.dogado.net` (Benutzer siehe 1.1) in den Ordner `flow-techorg`. Den genauen Befehl beim Anlegen der FlowTech-`CLAUDE.md` dort eintragen.

**Modus B/C (App):** Der Server baut nichts. Ablauf:
1. Lokal: lint, typecheck, Tests, Build, Browser-Prüfung (Checkliste in `WebSites/.claude/rules/tests-und-qualitaet.md`), dann `git push` (nur auf Florians Wunsch).
2. GitHub Actions: Prüfungen, Image bauen, Image-Scan ohne high/critical, Push nach `ghcr.io/f7or7an/<name>:<git-sha>` (privat, mit Provenance). Workflow-Vorlage in `WebSites/.claude/rules/ci-workflow.md`.
3. Snapshot vor dem Deploy: `sudo /srv/backup/bin/snapshot.sh <name> vor-deploy` (2.9).
4. Komodo: im Stack `TAG=<git-sha>` setzen und deployen (`docker compose pull` + `up -d`). Die App spielt beim Start ihre Migrationen ein und beendet sich bei einem Fehler; der Container wird dann nie `healthy`.
5. Prüfen: `docker compose ps` (healthy), `curl -fsS https://<domain>/api/health`, die wichtigsten Seiten, `curl -sI` auf die Header (2.5).
6. **Rückweg:** `TAG` auf den vorigen SHA setzen und erneut deployen. Ändert eine Migration Daten so, dass der alte Stand nicht mehr darauf läuft, steht das bei der Migration; dann zusätzlich den Snapshot aus Schritt 3 zurückspielen. Das frühere Taggen als `:prev` entfällt.

**Staging:** dasselbe Image als zweiter Stack mit `STACK=<name>-staging` (Container `<name>-staging`, Netz `<name>-staging-proxy`, Daten unter `/srv/apps/<name>-staging/data`), erreichbar unter `<name>.staging.flow-tech.org` mit Passwort. **Keine echten Personendaten** im Staging, nur erfundene oder anonymisierte (bei Gesundheitsdaten Art. 9 DSGVO).

**Neues Projekt auf dem Webserver (Checkliste):**
1. `docker network create <name>-proxy`, `docker network connect <name>-proxy caddy`, Netz in `/srv/proxy/compose.yml` und in 2.4 eintragen.
2. `sudo install -d -o 1000 -g 1000 /srv/apps/<name>/data` und `sudo install -d -o 1000 -g 1000 -m 700 /srv/backup/<name>`.
3. `.env` mit `chmod 600` oder Variablen in Komodo; Schlüssel in den Passwortmanager (2.10).
4. Komodo-Stack aus dem Repo (`compose.yml`), `TAG` setzen, deployen.
5. `deploy/<domain>.caddy` nach `/srv/proxy/sites/`, validieren, neu laden. DNS-TTL vorher auf 300 s.
6. Snapshot-Timer und restic-Pfad ergänzen (2.9), Uptime-Kuma-Monitor für Domain und `/api/health` (2.11).
7. Von außen: `nmap`, `curl -sI`, Netzwerk-Tab ohne fremde Domains.

### 2.8 Zugriff auf private Pakete und Images

- **Layer-Paket `@f7or7an/nuxt-base`** (GitHub Packages, privat; sobald veröffentlicht, bis dahin `_bausteine/`): Der Token gelangt nur als Build-Secret in den Build, nie ins Image und nie in eine `.npmrc` im Repo. Vorschlag, beim Anlegen des Layers prüfen und hier bestätigen:
  - CI: `GITHUB_TOKEN` mit `packages: read`; im Paket unter „Manage Actions access“ jedes Projekt-Repo mit Leserecht eintragen. Kein langlebiger Token in der CI.
  - Docker-Build: Secret `npmrc` mit dem Inhalt `//npm.pkg.github.com/:_authToken=<token>`, im Dockerfile per `RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci`.
  - Lokal: persönlicher Token nur mit `read:packages`, mit Ablaufdatum, in der Benutzer-`.npmrc` (`%USERPROFILE%\.npmrc`), nicht im Projekt.
- **Images aus GHCR ziehen:** Jeder Server braucht einen Token nur mit `read:packages` (Stand Wissen: GHCR verlangt dafür einen klassischen Token; beim Einrichten prüfen), hinterlegt in Komodo bzw. per `docker login ghcr.io` für den Benutzer, unter dem Periphery läuft. Mit Ablaufdatum, Eintrag in der Schlüsselliste.

### 2.9 Backups (beide Server)

- **SQLite-Snapshot** täglich per systemd-Timer und vor jedem Deploy. Nie die laufende Datei kopieren (WAL: neue Daten stehen in `-wal`). Auf dem Host `apt install sqlite3`. Das Skript läuft als UID 1000, damit keine `-wal`/`-shm`-Dateien mit Besitzer root entstehen, die die App danach nicht öffnen kann. Vor Einsatz auf dem Server testen:

  ```sh
  #!/bin/sh
  # /srv/backup/bin/snapshot.sh <name> [<anlass>]   z. B. snapshot.sh vogelperspektive vor-deploy
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
- **Extern mit restic**, nachts nach den Snapshots, verschlüsselt auf das Backup-Ziel (z. B. Storage Box beim VPS-Anbieter), je Server ein eigenes Repository:
  ```sh
  restic backup /srv/backup /srv/apps /srv/proxy /srv/static \
    --exclude '/srv/apps/*/data/*.sqlite*' --exclude '/srv/apps/*/.env'
  restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
  ```
  `/srv/apps` wegen der Uploads (z. B. Blog-Bilder Vogelperspektive), die laufenden Datenbanken nur über die Snapshots. `.env` nicht mitsichern: `NUXT_DATA_KEY` gehört nicht neben die verschlüsselten Daten.
- **Wöchentlich** `restic check --read-data-subset=5%`.
- **Erfolgsmeldung:** Jeder Lauf meldet Erfolg an einen Push-Monitor in Uptime Kuma, z. B. als `ExecStartPost=/usr/bin/curl -fsS -m 10 "${KUMA_PUSH_URL}?status=up&msg=OK"` in der systemd-Unit (läuft nur, wenn `ExecStart` erfolgreich war). Bleibt die Meldung aus, alarmiert Uptime Kuma. Die Push-URL steht in `/etc/restic/env`.
- **Litestream** (v0.5, fortlaufende Replikation) optional für Modus C, wenn ein Tag Datenverlust zu viel ist.
- **Restore-Test** einmal im Quartal auf einem Testsystem (Snapshot und restic-Stand), Ergebnis hier eintragen:

  | Datum | Projekt | Quelle | Ergebnis |
  |---|---|---|---|
  | – | – | – | noch keiner |

### 2.10 Geheimnisse und Schlüsselliste

- `.env` auf dem Server mit `chmod 600` oder als Variablen in Komodo. sops/age nur, falls `.env`-Dateien einmal ins Git sollen.
- **Getrennt im Passwortmanager sichern** (nie neben den Backups):
  - restic-Passwort und Zugang zum Backup-Ziel, je Server
  - `NUXT_DATA_KEY` je App (ohne ihn sind verschlüsselte Daten und Sicherungen wertlos; nach einem Schlüsselwechsel den alten behalten, solange ältere Sicherungen existieren)
  - Sitzungs-Secret je App: heute `NUXT_SESSION_PASSWORD`. Erst beim Update auf nuxt-auth-utils ≥ 0.6 im selben Schritt durch `NUXT_APP_SECRET` (≥ 32 Zeichen) ersetzen, außerhalb der Hauptzeit, weil das alle abmeldet. Nie vorher entfernen.
  - SMTP-Zugänge (`NUXT_SMTP_*`)
  - GHCR-Pull-Token je Server, Layer-Token (lokal), Push-URLs von Uptime Kuma
  - WireGuard-Schlüssel beider Server (2.15)
  - Praxisraum zusätzlich: `NUXT_LIVEKIT_API_SECRET`, SSO-Schlüssel, Dienst-Schlüssel für die interne API
  - Login-Namen der Server (stehen bewusst nicht in dieser Datei)
- Schlüssel erzeugen: `openssl rand -base64 32` (oder der Node-Befehl aus CLAUDE.md).

### 2.11 Überwachung, Logs, Fehler

- **Uptime Kuma** (Container auf `92.205.163.18`) prüft alle Domains, `/api/health` jeder App und `video.vogelperspektive-psychologin.de`, und warnt bei Zertifikaten mit weniger als 14 Tagen Laufzeit. Die Server prüfen sich gegenseitig, damit ein Ausfall auffällt. Gatus wäre eine Alternative.
- **Push-Monitore** für jeden Backup-Lauf beider Server (2.9).
- **Benachrichtigung** über einen zweiten Weg zusätzlich zur dogado-Mail (z. B. Push aufs Handy), damit ein Mail-Ausfall nicht stumm bleibt.
- **Komodo** zeigt Container-Status und Ressourcen.
- **Logs:** Docker json-file 10 MB × 3 (bleibt). App-Logs als JSON auf stdout, ohne Formularinhalte, E-Mail-Adressen, Tokens oder volle IPs. Aufbewahrung begrenzt halten und in der Datenschutzerklärung nennen.
- **Fehler-Tracking** optional: Bugsink (ein Container, versteht Sentry-SDKs) mit `sendDefaultPii: false` und ohne Session Replay. Sentry self-hosted ist für diese Größe zu groß.

### 2.12 Komodo

- Version der vorhandenen Instanz notieren (heute unbekannt) und auf **v2** heben (aktuell 2.3.x), Images mit `:2`-Tags.
- Webserver und Praxisraum-Server als weitere Server aufnehmen. Periphery verbindet sich in v2 **ausgehend** zur Komodo-Instanz: kein offener Port auf den neuen Servern. Anmeldung über Schlüsselpaare.
- Ein Stack pro App (und Staging) aus dem Projekt-Repo, Variable `TAG` pro Stack.

### 2.13 E-Mail und DNS

- Die Postfächer bleiben bei dogado. Bei einem Umzug nur die **A/AAAA-Records** ändern, **MX, SPF, DKIM nicht anfassen**.
- Die Apps verschicken per SMTP-Login über dogado. So bleiben SPF und DKIM gültig.
- Einmal prüfen, ob dogado DKIM signiert und ob DMARC existiert. Fehlendes in dieser Reihenfolge ergänzen: SPF → DKIM → DMARC, DMARC zuerst mit `p=none` und Berichten, später verschärfen.
- Vor jeder DNS-Umstellung die TTL auf 300 Sekunden senken, danach wieder erhöhen.

### 2.14 Praxisraum-Server

- **Zweck:** nur der Praxisraum (`app.vogelperspektive-psychologin.de`, `video.vogelperspektive-psychologin.de`): Videotelefonie von Psychologinnen mit Klient:innen, dazu Gesundheitsdaten (Art. 9 DSGVO, in der App verschlüsselt). Keine anderen Projekte.
- **Ort und Anbindung:** großes Rechenzentrum in Deutschland, 1 Gbit/s (Entscheidung 13.1). Beim Anbieter auf inklusiven Datenverkehr achten (Video erzeugt dauerhaft Traffic). AVV vor dem ersten Personendatum (wie 2.2).
- **Größe (Einschätzung):** 4 dedizierte vCPU, 8 GB RAM, 80 GB SSD. LiveKit ist durch CPU und Bandbreite begrenzt und empfiehlt rechenoptimierte Instanzen (docs.livekit.io, Deployment). Laut LiveKit-Benchmark schafft eine 16-Kern-Maschine (`c2-standard-16`) ein Meeting mit 150 Sendenden und 150 Empfangenden bei 85 % CPU; Sitzungen mit 2–12 Personen brauchen nur einen Bruchteil. Die LiveKit-Empfehlung „10 Gbit/s“ gilt für große Produktionsumgebungen. Nach den ersten echten Sitzungen mit `docker stats` nachmessen.
- **System:** wie der Webserver (2.2): Ubuntu 26.04, Docker 29, Grundhärtung, Docker-Logs begrenzt, `unattended-upgrades`, Snapshots beim Anbieter.
- **Caddy:** eigener Caddy-Stack mit demselben Caddyfile (2.5), Sites `app.…` mit `import app-media praxisraum` und `video.…` → `praxisraum-livekit:7880`. Netz `praxisraum-proxy` für Caddy, App und LiveKit.
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
- **Backups, Monitoring, Komodo:** wie 2.9, 2.11, 2.12, eigenes restic-Repository. Die Sicherungen enthalten die Daten verschlüsselt; ohne den passenden `NUXT_DATA_KEY` sind sie wertlos.

### 2.15 Verbindung Webserver ↔ Praxisraum-Server

Website und Praxisraum tauschen Daten aus (`/api/internal/*`: Namen, E-Mail-Adressen, Termine; gemeinsamer Login). Früher war das ein internes Docker-Netz; über Servergrenzen geht das nicht. Plan (Details beim Aufbau entscheiden, vor Einsatz testen):

- **WireGuard-Tunnel** `wg0` zwischen den Servern: Webserver `10.90.0.1`, Praxisraum-Server `10.90.0.2`, Port 51820/udp in ufw nur von der IP der Gegenstelle. Beispiel Webserver:
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
- **Interne API nur auf der Tunnel-Adresse:** Caddy veröffentlicht `10.90.0.x:8080` (2.5) und leitet dort nur `/api/internal/*` weiter, alles andere 404. Webserver `sites/intern.caddy`:
  ```caddy
  http://:8080 {
  	@internal path /api/internal/*
  	handle @internal {
  		reverse_proxy vogelperspektive:3000
  	}
  	respond 404
  }
  ```
  Auf dem Praxisraum-Server gleich mit `praxisraum:3000`. Die Apps rufen die Gegenseite unter `http://10.90.0.2:8080` bzw. `http://10.90.0.1:8080` auf (Praxisraum: `NUXT_SERVICE_WEBSITE_URL`). Öffentlich bleibt `/api/internal/*` auf beiden Domains 404.
- **Docker erst nach WireGuard starten**, sonst scheitert das Binden an `10.90.0.x`: Drop-in `/etc/systemd/system/docker.service.d/wireguard.conf` mit `[Unit]`, `After=wg-quick@wg0.service`, `Wants=wg-quick@wg0.service`.
- **Nur über `wg0` zulassen:** Docker-DNAT greift unabhängig von der Netzwerkkarte. Zusätzlich in der Kette `DOCKER-USER` (sie sieht weitergeleiteten Verkehr in beide Richtungen) nur neue Verbindungen zur **eigenen** Tunnel-Adresse und zum internen Port verwerfen, die nicht über `wg0` kommen. Webserver: `iptables -I DOCKER-USER -m conntrack --ctdir ORIGINAL --ctorigdst 10.90.0.1 --ctorigdstport 8080 ! -i wg0 -j DROP`, Praxisraum-Server dieselbe Regel mit `10.90.0.2`. Nicht das ganze `10.90.0.0/24` sperren: Sonst verwirft die Regel auch die ausgehenden Aufrufe der eigenen App-Container an die Gegenstelle (die kommen über die Bridge, nicht über `wg0`). Dauerhaft machen und vor Einsatz testen: aus dem App-Container die Gegenstelle unter `http://<Gegenstelle>:8080/api/internal/…` aufrufen (muss gehen) und von außen `nmap -p 8080 <öffentliche IP>` (muss `filtered`/`closed` zeigen). Beim iptables-Standard von Docker bleiben: Das (experimentelle) nftables-Backend von Docker 29 hat keine `DOCKER-USER`-Kette.
- **Anwendungsebene:** Jede interne Anfrage trägt zusätzlich den Dienst-Schlüssel bzw. eine HMAC-Signatur mit Zeitstempel; die App prüft sie, auch wenn die Anfrage über den Tunnel kommt.
- Der Tunnel verschlüsselt; Caddy spricht darin bewusst nur HTTP.

## 3. Umzugsplan

| Schritt | Was | Voraussetzung |
|---|---|---|
| 0 | **Webserver:** AVV mit VPS-Anbieter und Backup-Ziel. VPS bestellen, Ubuntu 26.04, Grundhärtung, Docker 29, Caddy-Stack mit Snippets, Komodo auf v2 heben und Webserver anbinden, GHCR-Pull-Token, Backup-Timer mit Push-Monitoren, ein Restore-Test | Entscheidung für Anbieter |
| 0a | **Praxisraum-Server:** Anbieter mit großem RZ in Deutschland und 1 Gbit/s wählen, AVV, Einrichtung wie Schritt 0, ufw nach 2.14, WireGuard zum Webserver (2.15) | Entscheidung für Anbieter; kann nach Schritt 1 folgen |
| 1 | **Vogelperspektive:** Dateien auf die Vorlagen umstellen (`node:26-slim`, Image aus GHCR, Netz `vogelperspektive-proxy`, CI-Workflow, interne API über 2.15 statt `vogelperspektive-intern`). Auf Staging testen, auch den echten SMTP-Versand. Die 8 Newsletter-Abonnenten aus der alten Datenbank übernehmen. Dann DNS umstellen. Die alte Seite auf dogado noch 4 Wochen als Rückfall behalten. | Schritt 0 |
| 1a | **Praxisraum:** auf die Vorlagen umstellen (Netz `praxisraum-proxy` für App und LiveKit, `praxisraum-intern` bleibt, `vogelperspektive-intern` entfällt, `import app-media`), auf dem Praxisraum-Server deployen, Ports von außen prüfen, Testsitzung mit zwei Geräten (eines im Mobilfunknetz). Termin nach dem Gespräch mit Jara. | Schritte 0a und 1 |
| 2 | **FlowTech:** `.output/public` nach `/srv/static/flow-tech.org`, Caddy-Datei mit `import static`, DNS umstellen. Für die zweite Domain eine Weiterleitung statt einer Kopie. Kann bei Bedarf auch vorerst auf dogado bleiben. | Schritt 0 |
| 3 | **Ortrud:** `kontakt.php` durch `server/api/contact.post.ts` ersetzen (Muster Vogelperspektive), Modus B. Schriften: heute `@nuxt/fonts` mit `provider: 'google'` je Familie → Pakete `@fontsource/…` bzw. `@fontsource-variable/…` (Pinyon Script gibt es nur als `@fontsource/pinyon-script`, Cormorant braucht Kursiv) und npm-Provider (Details in `WebSites/.claude/rules/performance.md`). Hoster und Domain klären, dann live. | Domain-Zugang |
| 4 | **Gora:** auf die Vorlagen umstellen (Build mit `npm run build:server`, Migrationen als Nitro-Plugin statt Entrypoint-Skript, Netz `gora-proxy`), `GORA_DATABASE_PATH=/app/.data/gora.sqlite`. Daten per Admin-Export/-Import aus dem Staging übernehmen. Domain-Umzug von SiteGround mit dem Gora-Team abstimmen, DNS-Zone liegt bei Wix. | Absprache Gora |
| 5 | **Aufräumen:** dogado-Webspaces leeren und ggf. auf ein reines Mail-Paket wechseln. Auf `92.205.163.18` das Docker-29-Update separat erledigen. | Schritte 1–4 |

## 4. Offene Entscheidungen

1. ~~Neuer VPS oder der vorhandene Server `92.205.163.18`?~~ Entschieden 21.11.2026: neuer VPS mit Ubuntu 26.04 LTS, dazu ein eigener Praxisraum-Server (13.1).
2. VPS-Anbieter und Ziel für das externe Backup (Webserver).
3. Anbieter und Rechenzentrum des Praxisraum-Servers, Größe nach den ersten Messungen, inklusiver Datenverkehr.
4. Wo die Serverdateien versioniert liegen (`/srv/proxy/compose.yml`, `Caddyfile`, Snapshot-Skript, systemd-Units, WireGuard ohne Schlüssel), damit Renovate das Caddy-Image aktualisiert. Vorschlag: im Meta-Repo `f7or7an/websites` unter `server/`.
5. Details der Server-Verbindung (2.15): Adressen, HMAC oder Dienst-Schlüssel, Persistenz der `DOCKER-USER`-Regel.
6. LiveKit: Host-Netzwerk ja/nein (nach Messung), TURN über TLS für strenge Firmennetze (443 nur mit zweiter IP oder caddy-l4, sonst 5349).
7. Wo die DNS-Zonen der Domains liegen und wer Zugriff hat (bekannt: Gora bei Wix; offen: Vogelperspektive, FlowTech, Ortrud).
8. Verfahren für den Layer-Token (2.8) beim Anlegen des Layers bestätigen.
9. Zweiter Benachrichtigungsweg für Uptime Kuma.
10. Fehler-Tracking mit Bugsink: ja oder nein.
11. Zugriffslog in Caddy dauerhaft aus oder gefiltert an (2.5).
12. ~~Calendly durch eigene Terminbuchung ersetzen?~~ Erledigt am 08.11.2026.
