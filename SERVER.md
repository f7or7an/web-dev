# Server: Ist-Zustand, Soll-Zustand und Umzug

Stand: 08.11.2026. Gilt zusammen mit den Regeln in [CLAUDE.md](CLAUDE.md).
Quellen: die Projektordner sowie frühere Claude-Sessions vom 06.11.2026 (dogado-Zugang, FlowTech-Deployment, Vogelperspektive-Neubau, OS-Update des Linux-Servers).

## 1. Ist-Zustand

### 1.1 dogado Shared Hosting (Plesk)

| Vertrag | Server | SSH-Benutzer | Ordner → Domain | Inhalt |
|---|---|---|---|---|
| 634057 (WEB S 3.0) | `web250.dogado.net` | `h634057` | `flow-techorg` → flow-tech.org; `flwtchde` → zweite Domain (Kopie); `ams-aide`; `httpdocs` (Platzhalter) | FlowTech, statisch, live mit Let's Encrypt |
| 622978 | `web116.dogado.net` | `h622978` | `vogelperspektive-psychologinde` → vogelperspektive-psychologin.de; `httpdocs` (Platzhalter) | alte Vogelperspektive-Seite (Webflow-Export + PHP), live |

- **Kann:** Apache mit `.htaccess`, PHP, MySQL, SSH/SFTP (Key-Login mit `~/.ssh/id_ed25519` ist auf beiden eingerichtet), Let's Encrypt (nur über das onehome-Panel, nicht per certbot), E-Mail-Postfächer.
- **Kann nicht:** Node-Prozesse (CentOS 7, glibc 2.17 → kein Node ≥ 18), Docker, eigene Dienste. Also nur Modus A.
- **E-Mail:** Die Postfächer liegen hier (z. B. info@vogelperspektive-psychologin.de, info@flow-tech.org). Die Apps verschicken über `web116.dogado.net:465`.
- Fail2Ban sperrt nach gehäuften Fehl-Logins die IP für 30–60 Minuten.

### 1.2 Eigener Linux-Server `92.205.163.18`

- VPS bei GoDaddy/Host Europe (Hostname `*.host.secureserver.net`), Ubuntu 24.04.5 LTS, Kernel 6.8.0-149, 386 GB Platte (ca. 10 % belegt). Login `aizpunroot` mit sudo.
- Docker 28.4: Pakete stehen auf `apt-mark hold`, das Update auf 29 ist noch offen. **Komodo** (Periphery) verwaltet die Container: 11 Container, davon 9 laufend, in 4 Compose-Projekten.
- Systemdienste: **nginx** (belegt vermutlich die Ports 80/443), sendmail, postfix-mta-sts-resolver.
- **Geschäftsdienste:** `drw-payment`, `nydus-ex`, `nydus-ex-api`, OpenVPN-Client `DrWalterExtServerLinux`.
- **Keine der Websites läuft hier.** Das System ist ein Produktivserver für Zahlungs- und Schnittstellendienste.

### 1.3 Weitere Orte

- **Gora:** Die Live-Seite goraosaznanie.com liegt bei SiteGround. Das Staging läuft auf ChatGPT Sites (Cloudflare Worker + D1): https://gora-nuxt-staging.workspace-vo-7180.chatgpt.site/. Der Code liegt privat auf GitHub.
- **Ortrud:** Hoster und Zugang für kuteifan.de sind noch unbekannt.
- **Lokal:** Windows 11, Node 24.13, Projekte unter `C:\Users\flori\Documents\WebSites`.

### 1.4 Probleme des Ist-Zustands

1. Vogelperspektive (B) und Gora (C) sind Node-Apps. Sie können auf dogado nicht laufen und haben heute keinen Produktivserver.
2. ~~`Vogelperspektive/webapp/Vogelperspektive/deploy/` bringt einen eigenen Caddy auf 80/443 mit.~~ Erledigt am 09.11.2026: Die Website hat jetzt `compose.yml` ohne Proxy und `deploy/vogelperspektive-psychologin.de.caddy` für den zentralen Caddy, wie der Praxisraum. Auf `92.205.163.18` hätte ein eigener Caddy mit nginx kollidiert. Außerdem sollen Websites dort nicht mitlaufen: Eine angreifbare Website darf die Zahlungsdienste nicht gefährden, und jedes Wartungsfenster würde beides treffen.
3. Das Hosting ist auf vier Anbieter verteilt (dogado ×2, SiteGround, ChatGPT Sites, dazu der unbekannte Ortrud-Hoster). Deployment, TLS und Backups laufen überall anders.
4. Es gibt keine einheitlichen Backups für Anwendungsdaten (SQLite).

## 2. Soll-Zustand

### 2.1 Überblick

Ein **eigener Webserver nur für Websites und Web-Apps**, getrennt vom Geschäftsserver. Ein einziger Reverse-Proxy (Caddy) verteilt alle Domains: statische Seiten liefert er direkt aus, Apps laufen als Container dahinter.
Der Server ist zugleich die Grundlage für das Hosting-Angebot von FlowTech: Jeder neue Kunde bekommt einen Compose-Stack und eine Caddy-Datei.

```
                         Internet
                            │
   DNS A/AAAA aller Website-Domains → Webserver     (MX-Records bleiben bei dogado)
                            │
┌───────────────────────────▼──────────── Webserver (neuer VPS, Ubuntu 24.04 LTS) ┐
│ Firewall (ufw): 22/tcp nur mit Key · 80/tcp · 443/tcp+udp                        │
│                                                                                  │
│  Caddy (Container, als einziger auf 80/443, Let's Encrypt automatisch)           │
│   ├─ flow-tech.org                  → file_server /srv/static/flow-tech.org      │
│   ├─ vogelperspektive-psychologin.de → reverse_proxy vogelperspektive:3000       │
│   ├─ kuteifan.de                    → reverse_proxy ortrud:3000                  │
│   ├─ goraosaznanie.com              → reverse_proxy gora:3000                    │
│   └─ <name>.staging.flow-tech.org   → Staging-Container, mit Passwort, noindex   │
│                 │                                                                │
│                 │ Docker-Netz "web" (App-Container veröffentlichen KEINE Ports)  │
│  App-Container: je Projekt ein Compose-Stack, node:24-alpine, User node          │
│   └─ /srv/apps/<name>/data  →  /app/.data   (SQLite)                             │
│                                                                                  │
│  Komodo Periphery → an die bestehende Komodo-Instanz angebunden                  │
│  Backup-Timer: nachts SQLite-Snapshots + restic → externes Backup-Ziel           │
└──────────────────────────────────────────────────────────────────────────────────┘

dogado:              nur noch E-Mail (SMTP für die Apps)
92.205.163.18:       bleibt Geschäftsserver (Zahlung, VPN), keine Websites;
                     überwacht den Webserver per Uptime-Check (und umgekehrt)
```

### 2.2 Server

- **Getrennter VPS** in Deutschland (z. B. Hetzner Cloud, netcup, IONOS). Für 10–20 Seiten dieser Größe reichen 2–4 vCPU, 4–8 GB RAM und 80 GB SSD. Snapshots beim Anbieter aktivieren.
- Ubuntu 24.04 LTS, Docker CE + Compose-Plugin aus dem offiziellen Docker-Repo.
- **Grundhärtung:** eigener Benutzer mit sudo, SSH nur per Key (`PasswordAuthentication no`, `PermitRootLogin no`), `ufw` (22, 80, 443/tcp, 443/udp), `fail2ban`, `unattended-upgrades` für Sicherheitsupdates, Zeit-Sync. Docker-Logs begrenzen (`/etc/docker/daemon.json`: `"log-driver": "json-file", "log-opts": {"max-size": "10m", "max-file": "3"}`).
- **Komodo:** Den Webserver als zweiten Server in die vorhandene Komodo-Instanz aufnehmen. So bleibt eine Oberfläche für alle Container.

### 2.3 Verzeichnisse auf dem Webserver

```
/srv/
  proxy/
    compose.yml            Caddy-Stack
    Caddyfile              globale Einstellungen + Snippets, importiert sites/*.caddy
    sites/<domain>.caddy   eine Datei pro Website
  static/<domain>/         Modus A: Inhalt von .output/public
  apps/<name>/
    data/                  Volume der App (SQLite), Besitzer UID 1000 (node)
    .env                   Geheimnisse, chmod 600 (oder in Komodo hinterlegt)
  backup/                  lokale SQLite-Snapshots (Quelle für restic)
```

Einmalig: `docker network create web`

### 2.4 Proxy (Caddy)

`/srv/proxy/compose.yml`

```yaml
services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy
    restart: unless-stopped
    ports: ["80:80", "443:443", "443:443/udp"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./sites:/etc/caddy/sites:ro
      - /srv/static:/srv/static:ro
      - caddy-data:/data
      - caddy-config:/config
    networks: [web]
volumes:
  caddy-data:
  caddy-config:
networks:
  web:
    external: true
```

`/srv/proxy/Caddyfile`

```caddy
{
	email info@flow-tech.org
}

(security) {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "camera=(), microphone=(), geolocation=()"
		Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
		-Server
	}
}

(staging) {
	basic_auth {
		florian <hash von: docker exec caddy caddy hash-password>
	}
	header X-Robots-Tag "noindex, nofollow"
}

import /etc/caddy/sites/*.caddy
```

Die CSP passt jede Site an, wenn sie eine Ausnahme braucht, z. B. für einen eingebetteten Player (Gora braucht seit 10.11.2026 keine Ausnahme mehr).

`sites/vogelperspektive-psychologin.de.caddy` (App, Modus B/C)

```caddy
vogelperspektive-psychologin.de {
	import security
	reverse_proxy vogelperspektive:3000
}
www.vogelperspektive-psychologin.de {
	redir https://vogelperspektive-psychologin.de{uri} permanent
}
```

`sites/flow-tech.org.caddy` (statisch, Modus A)

```caddy
flow-tech.org {
	import security
	root * /srv/static/flow-tech.org
	@assets path /_nuxt/*
	header @assets Cache-Control "public, max-age=31536000, immutable"
	file_server
	handle_errors {
		rewrite * /404.html
		file_server
	}
}
www.flow-tech.org {
	redir https://flow-tech.org{uri} permanent
}
```

`sites/vogelperspektive.staging.flow-tech.org.caddy` (Staging)

```caddy
vogelperspektive.staging.flow-tech.org {
	import security
	import staging
	reverse_proxy vogelperspektive-staging:3000
}
```

### 2.5 App-Container (Modus B/C)

**Dockerfile:** Vorlage ist `Vogelperspektive/webapp/Vogelperspektive/Dockerfile`. Mehrstufiger Build, `node:24-alpine`, im Laufzeit-Image nur `.output`, User `node`, `VOLUME /app/.data`, `HOST=0.0.0.0`, `PORT=3000`, `HEALTHCHECK`.

**Healthcheck:** Jede App hat `server/api/health.get.ts`. Die Route antwortet mit `{ ok: true }` und prüft dabei kurz die Datenbank. Der Docker-Healthcheck ruft `/api/health` auf.

**`compose.yml` im Projekt-Repo**, ohne Proxy:

```yaml
services:
  app:
    build: .
    container_name: vogelperspektive        # = Name im Caddy-Block
    restart: unless-stopped
    env_file: .env                          # bzw. Variablen aus Komodo
    volumes:
      - /srv/apps/vogelperspektive/data:/app/.data
    networks: [web]
    logging:
      options: { max-size: "10m", max-file: "3" }
networks:
  web:
    external: true
```

Regeln:
- Keine `ports:` in App-Stacks. Nur Caddy ist von außen erreichbar.
- Containername = Projektname = Hostname im Caddy-Block. Intern lauscht jede App auf Port 3000.
- `restart: unless-stopped` ist Pflicht, sonst ist der Container nach einem Reboot weg.
- Daten nur unter `/srv/apps/<name>/data`, sonst nichts Beschreibbares.
- Tauschen zwei Stacks Daten aus (z. B. Website ↔ Praxisraum), dann nicht über `web`, sondern über ein eigenes Netz mit `internal: true` und **festen Adressen** statt Containernamen. Grund: Im gemeinsamen Netz `web` hängen alle Kunden-Stacks, und jeder Container kann sich einen Netz-Alias wie `praxisraum` geben und so Anfragen abfangen. Eine feste Adresse in einem Netz, in dem nur die beteiligten Container hängen, kann niemand sonst übernehmen (Prüfung 21.11.2026). Feste Adressen in die untere Hälfte des Netzes, `--ip-range` auf die obere, damit Docker nichts doppelt vergibt.
- Reservierte interne Netze (hier eintragen, bevor ein neues angelegt wird):
  | Netz | Subnetz | Wer | Angelegt von |
  |---|---|---|---|
  | `vogelperspektive-intern` | 10.89.20.0/24 | Praxisraum .10, Website .20 | von Hand: `docker network create --internal --subnet 10.89.20.0/24 --ip-range 10.89.20.128/25 vogelperspektive-intern` |
  | `praxisraum-intern` | 10.89.21.0/24 | Praxisraum-App .10, LiveKit .11 | Praxisraum-`compose.yml` |
- Offen für den Umzug: Auch der Weg Caddy → Container läuft über `web` und damit über Namen. Wer das absichern will, gibt jedem Stack ein eigenes Netz zu Caddy (Caddy hängt in allen). Entscheidung beim Aufbau des Servers.

### 2.6 Deployment

**Modus A (statisch):**

```bash
npm run generate && rsync -az --delete .output/public/ webserver:/srv/static/flow-tech.org/
```

Bis zum Umzug bleibt der heutige dogado-Weg (`tar` über SSH in den Ordner `flow-techorg`, siehe FlowTech-Memory).

**Modus B/C (App):**
1. Lokal: `npm run typecheck`, `npm run build`, Browser-Prüfung (siehe CLAUDE.md), dann `git push`.
2. Komodo-Stack „Deploy“: Repo holen, `docker compose up -d --build`.
3. Prüfen: `curl -fsS https://<domain>/api/health` und die wichtigsten Seiten aufrufen.
4. Rückweg: Vor dem Build das laufende Image als `<name>:prev` taggen. Bei Problemen dieses Image wieder starten.

Später, wenn es mehr Projekte werden: Images per GitHub Actions bauen, nach `ghcr.io/f7or7an/<name>` (privat) pushen und auf dem Server nur noch pullen. Dann baut der Server nichts mehr selbst.

**Staging:** dasselbe Image als zweiter Container `<name>-staging` mit eigener Datenbank unter `/srv/apps/<name>-staging/data`, erreichbar unter `<name>.staging.flow-tech.org` mit Passwort.

### 2.7 Backups

- **Täglich:** Ein systemd-Timer erstellt pro App einen konsistenten SQLite-Snapshot (`sqlite3 <db> ".backup /srv/backup/<name>-<datum>.sqlite"` oder `VACUUM INTO`). Die Datei nicht im laufenden Betrieb einfach kopieren.
- **Extern:** `restic` sichert `/srv/backup`, `/srv/proxy` und `/srv/static` verschlüsselt auf ein externes Ziel (z. B. Storage Box beim VPS-Anbieter). Aufbewahrung: 7 tägliche, 4 wöchentliche, 6 monatliche Stände.
- **Schlüssel getrennt sichern** (Passwortmanager): restic-Passwort, `NUXT_DATA_KEY`, `NUXT_SESSION_PASSWORD`, SMTP-Zugänge.
- Einmal im Quartal eine Wiederherstellung testen.

### 2.8 Überwachung

- Uptime-Check (z. B. Uptime Kuma als Container auf `92.205.163.18`) für alle Domains und `/api/health`, mit Benachrichtigung per Mail. So prüfen sich die beiden Server gegenseitig, und ein Ausfall des Webservers fällt trotzdem auf.
- Komodo zeigt Container-Status und Ressourcen.
- Zertifikate erneuert Caddy selbst. Eine Warnung bei Ablauf in weniger als 14 Tagen über den Uptime-Check.

### 2.9 E-Mail und DNS

- Die Postfächer bleiben bei dogado. Bei einem Umzug nur die **A/AAAA-Records** ändern, **MX, SPF, DKIM nicht anfassen**.
- Die Apps verschicken per SMTP-Login über dogado. So bleiben SPF und DKIM gültig.
- Vor jeder DNS-Umstellung die TTL auf 300 Sekunden senken, danach wieder erhöhen.

## 3. Umzugsplan

| Schritt | Was | Voraussetzung |
|---|---|---|
| 0 | VPS bestellen, Grundhärtung, Docker, `web`-Netz, Caddy-Stack, Komodo anbinden, Backup-Timer | Entscheidung für Anbieter |
| 1 | **Vogelperspektive:** Git-Repo anlegen. `deploy/` umbauen (Caddy raus, Netz `web` extern, Pfad `/srv/apps/...`). `/api/health` ergänzen. Auf Staging testen, auch den echten SMTP-Versand. Die 8 Newsletter-Abonnenten aus der alten Datenbank übernehmen. Dann DNS umstellen. Die alte Seite auf dogado noch 4 Wochen als Rückfall behalten. | Schritt 0 |
| 2 | **FlowTech:** `.output/public` nach `/srv/static/flow-tech.org`, Caddy-Datei, DNS umstellen. Für die zweite Domain eine Weiterleitung statt einer Kopie. Kann bei Bedarf auch vorerst auf dogado bleiben. | Schritt 0 |
| 3 | **Ortrud:** `kontakt.php` durch `server/api/contact.post.ts` ersetzen (Muster Vogelperspektive), Modus B, `@nuxt/fonts` durch `@fontsource` ersetzen. Hoster und Domain klären, dann live. | Domain-Zugang |
| 4 | **Gora:** Dockerfile für den Node-Build (`npm run build:server`), `GORA_DATABASE_PATH=/app/.data/gora.sqlite`. Daten per Admin-Export/-Import aus dem Staging übernehmen. Domain-Umzug von SiteGround mit dem Gora-Team abstimmen. | Absprache Gora |
| 5 | **Aufräumen:** dogado-Webspaces leeren und ggf. auf ein reines Mail-Paket wechseln. Auf `92.205.163.18` das Docker-29-Update separat erledigen. | Schritte 1–4 |

## 4. Offene Entscheidungen

1. Neuer VPS (empfohlen) oder doch der vorhandene Server `92.205.163.18`? Falls der vorhandene: Dann **kein** zweiter Caddy, sondern das vorhandene nginx als Proxy auf Container an `127.0.0.1:<port>`, und Wartungsfenster werden gemeinsam geplant.
2. VPS-Anbieter und Ziel für das externe Backup.
3. Wo die DNS-Zonen der Domains liegen (dogado, SiteGround, Ortruds Hoster) und wer Zugriff hat.
4. Ob Calendly (Vogelperspektive) später durch eine eigene Terminbuchung ersetzt werden soll.
