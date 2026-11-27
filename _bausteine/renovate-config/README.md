# Renovate-Preset `f7or7an/renovate-config`

Gemeinsames Preset für alle Projekte. Regel und Begründung: `WebSites/.claude/rules/abhaengigkeiten-und-layer.md` (Abschnitt Renovate), Workflow-Zeilen: `ci-workflow.md`.

## Inhalt von `default.json`

- `config:best-practices` (enthält schon `docker:pinDigests`, `:maintainLockFilesWeekly`, Pinnen der Actions per SHA, `security:minimumReleaseAgeNpm`).
- 14 Tage Wartezeit, für npm als `packageRule` (sonst gälten aus `config:best-practices` nur 3 Tage).
- Docker-Digest-Updates 3 Tage (gleitende Tags würden sonst nie alt genug).
- Minor und Patch gruppiert („Minor- und Patch-Updates“). Major einzeln.
- Sicherheitsupdates sofort: `vulnerabilityAlerts` (Renovate-Standard ohne Wartezeit; wirkt nur mit eingeschalteten Dependabot-Alerts im Repo) und `osvVulnerabilityAlerts`.
- `typescript` < 7 (vue-tsc bricht mit TS 7).
- `@f7or7an/*` (eigener Layer) ohne Wartezeit.
- `customManagers`: `ARG NPM_VERSION=…` im Dockerfile und `NPM_VERSION: …` in Workflows (Kommentar `# renovate: datasource=npm depName=npm` in der Zeile davor) sowie Images mit Digest in Workflow-Variablen (`TRIVY_IMAGE: aquasec/trivy:<version>@sha256:<digest>`, Kommentar `# renovate: datasource=docker depName=aquasec/trivy`).

## Geprüft (21.11.2026)

- `npx --package renovate renovate-config-validator --strict default.json` (Renovate 44.257.9): „Config validated successfully“, auch als Repo-Konfiguration (`--no-global`).
- Die drei Regexe mit Beispielzeilen in JavaScript geprüft (Dockerfile `ARG NPM_VERSION=12.2.2`, Workflow `NPM_VERSION: 12.2.2`, Workflow `TRIVY_IMAGE: …@sha256:…`); Dateimuster treffen `Dockerfile`, `deploy/Dockerfile`, `.github/workflows/*.yml|yaml`.
- Hinweis: Der Validator meldet lokal „RE2 not usable“ (natives Modul, Installationsskript von npm 12 blockiert). Er prüft die Regexe dann mit JavaScript-RegExp; für die Prüfung unerheblich.
- Nicht geprüft: echter Lauf gegen ein Repo (geht erst, wenn das Preset-Repo existiert).

## Einrichten (Florian)

1. Auf GitHub ein Repo **`f7or7an/renovate-config`** anlegen. Für `github>`-Presets muss Renovate es lesen können: **privat** (Entscheidung Florian 27.11.2026: alle Repos privat) und der Renovate-App Zugriff darauf geben (Installation der App auf dieses Repo).
2. `default.json` aus diesem Ordner als `default.json` in die Wurzel des Repos legen und committen (`feat: Renovate-Preset`).
3. Renovate-GitHub-App für die Projekt-Repos installieren (bzw. freischalten) und in jedem Repo **Dependabot alerts** einschalten (Settings → Code security), sonst wirken die Sicherheits-PRs nicht.
4. Danach einmal im Dependency Dashboard eines Projekts prüfen, dass das Preset geladen wurde.

## Einbinden im Projekt

`renovate.json` im Projektordner (Vorlage `renovate.json` hier):

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>f7or7an/renovate-config"]
}
```

Bis das Repo existiert, meldet Renovate im Projekt einen Preset-Fehler; das ist erwartet. Merge nur bei grünem CI (lint, typecheck, Tests, Build). Sicherheitsupdates jünger als 14 Tage scheitern im PR am Lockfile (`.npmrc` `min-release-age=14`): dann den Weg von Hand nehmen (`abhaengigkeiten-und-layer.md`, „Sicherheitsupdates“).
