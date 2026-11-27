# CI-Vorlagen (GitHub Actions)

Regel: `WebSites/.claude/rules/ci-workflow.md`. Ziel im Projekt: `.github/workflows/ci.yml`.

| Datei | Modus | Inhalt |
|---|---|---|
| `ci.yml` | B/C | `check` (npm 12, `npm ci`, `audit signatures`, `audit --omit=dev --audit-level=high`, lint, typecheck, test, build, `test:build`, `test:chunk-reload`), `image` (nur bei Push/Dispatch: Build als Tar, Trivy-Scan ohne `docker.sock`, Push nach GHCR mit Provenance) |
| `ci-static.yml` | A | nur `check` mit `generate` und `test:chunk-reload`, kein Image, kein Deployment |

## Übernahme

1. Passende Datei als `.github/workflows/ci.yml` kopieren.
2. `ci.yml`: `<name>` in `IMAGE` durch den Repo-Namen ersetzen (klein, z. B. `ghcr.io/f7or7an/vogelperspektive`).
3. Projekt braucht die Skripte `lint`, `typecheck`, `test` (B/C), `build` bzw. `generate` und eine `.node-version` (`26`).
   B/C mit dem Fehlerlog-Baustein (`_bausteine/sicherheit/`, `request-error-log`) zusätzlich `test:build`: baut die App zweimal (mit und ohne Baustein, eigene Ausgabeordner `.output-error-log-*`) und prüft den gebauten Server (eine JSON-Zeile je Serverfehler, kein `[request error]`, Antworten unverändert). Fehlt das Skript, den Schritt weglassen und als Audit-Punkt eintragen. Braucht die Startprüfung des Projekts weitere Variablen, im Schritt unter `env:` Testwerte setzen.
4. Renovate liest `NPM_VERSION` und `TRIVY_IMAGE` über das gemeinsame Preset (Kommentarzeilen `# renovate: …` nicht entfernen) und hält die Action-SHAs aktuell.
5. Gemeinsamer Layer: Erst wenn `@f7or7an/nuxt-base` veröffentlicht ist, die mit „Layer:“ markierten Zeilen ergänzen (Regel `ci-workflow.md`, Vorlage mit `registry-url`, `NODE_AUTH_TOKEN`, Build-Secret `npmrc`).

## Gepinnte Versionen (Stand 21.11.2026, alle älter als 14 Tage)

| Action / Image | Version | SHA / Digest | erschienen |
|---|---|---|---|
| actions/checkout | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` | 20.07.2026 |
| actions/setup-node | v7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` | 08.10.2026 |
| docker/setup-buildx-action | v4.4.1 | `f87e5991a6d7451dcb8d9637bfbc97413f497069` | 16.09.2026 |
| docker/login-action | v4.8.0 | `8aa5831fb8d48d8f76594c7ddde61ae58019f550` | 05.11.2026 |
| docker/build-push-action | v7.4.0 | `c3c9e263c25d99ce0380d002d59b67737d91b0dc` | 15.09.2026 |
| aquasec/trivy | 0.76.2 | `sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb` (OCI-Index) | 05.11.2026 |

SHAs per `git ls-remote https://github.com/<repo> refs/tags/<tag>`, Digest per Registry-API (`docker-content-digest` des Manifests, entspricht `docker buildx imagetools inspect`).

## Geprüft (21.11.2026)

- Beide Dateien mit `action-validator` 0.6.0 (Schema von GitHub Actions) gültig; Gegenprobe mit fehlerhafter Datei wird abgelehnt.
- YAML geparst: alle `uses:` auf 40-stellige SHAs gepinnt, global `permissions: contents: read`, nur `image` mit `packages: write`.
- Renovate-Regexe des Presets finden `NPM_VERSION: 12.2.2` und `TRIVY_IMAGE: …@sha256:…` in den Dateien.
- Nicht geprüft: echter Lauf auf GitHub (braucht Repo, Dockerfile, GHCR-Rechte).

## Änderungen

- 26.11.2026: Schritt `npm run test:chunk-reload` in `ci.yml` und `ci-static.yml` (Baustein `chunk-reload`, headless Chrome auf `ubuntu-24.04`). `action-validator` 0.6.0 (npm `@action-validator/cli`): beide Dateien und die Layer-Workflows gültig, Gegenprobe mit fehlerhafter Datei abgelehnt.
- 24.11.2026: `ci.yml` mit Schritt `npm run test:build` (Fehlerlog-Build-Test, `TEST_PORT` 3456), lokal in Testprojekt und Layer grün (Port 3466).
