---
paths:
  - "**/package.json"
  - "**/package-lock.json"
  - "**/.npmrc"
  - "**/renovate.json*"
  - "**/nuxt.config.ts"
  - "**/.node-version"
  - "**/_bausteine/**"
---

# Abhängigkeiten, Lieferkette und gemeinsamer Layer

Stand: 21.11.2026. Die Stack-Tabelle mit Versionen steht im Kern (`CLAUDE.md`). Hier: wie Pakete hinzukommen, aktualisiert und abgesichert werden, und wie der gemeinsame Layer funktioniert.
Nicht hier: Docker-Build (`container-und-deployment.md`), CI-Workflow (`ci-workflow.md`), Prüfschritte vor dem Deployment (`tests-und-qualitaet.md`).

**Warum so streng:** 2026 gab es mehrere npm-Wurm-Wellen (Shai-Hulud), die über frisch kompromittierte Versionen und Installationsskripte liefen. Lehren: Wartezeit vor neuen Versionen, keine Installationsskripte ohne Freigabe, keine langlebigen Tokens. Provenance allein schützt nicht.

## npm 12

- **npm ≥ 12.2.2** lokal und in der Build-Stage des Dockerfiles. Node 26 bringt npm 11 mit (26.13.1 → npm 11.20.0), deshalb separat installieren: `npm i -g npm@12` (Pilottest 21.11.2026). Prüfen mit `npm -v`.
- Vorschlag (ungeprüft): `"engines": { "node": ">=26", "npm": ">=12.2.2" }` in `package.json`, damit Werkzeuge wie Renovate die richtige npm-Version wählen.
- **Installationsskripte** von Abhängigkeiten laufen unter npm 12 nur, wenn sie in `package.json` → `allowScripts` freigegeben sind. Freigaben committen. Im CI zusätzlich `strict-allow-scripts=true` (`ci-workflow.md`).
- **Keine Git- oder URL-Abhängigkeiten.** npm 12 sperrt sie ohnehin (`allow-git` und `allow-remote` stehen auf `none`). Nichts davon wieder freischalten.

### Installationsskripte freigeben (Pilottest 21.11.2026)

| Befehl | Wirkung |
|---|---|
| `npm install-scripts ls` | zeigt Pakete, die ein Skript ausführen wollen und noch nicht entschieden sind |
| `npm approve-scripts <pkg>` | gibt frei (Alias von `npm install-scripts approve <pkg>`), Eintrag versionsgenau, z. B. `"allowScripts": { "esbuild@0.28.2": true }` |
| `npm approve-scripts <pkg> --no-allow-scripts-pin` | gibt nur nach Namen frei (Ausnahme, begründen) |
| `npm install-scripts deny <pkg>` | lehnt dauerhaft ab |
| `npm install-scripts prune` | entfernt veraltete Einträge |

- Nur freigeben, was ohne Skript nicht funktioniert. Im Pilot wollte nur `esbuild` ein Skript ausführen, und der Build lief auch ohne Freigabe.
- Bei jedem Update `npm install-scripts ls` und `npm install-scripts prune` ausführen.

## Wartezeit für neue Versionen (`.npmrc`)

Jedes Projekt hat eine `.npmrc` im Repo:

```ini
min-release-age=14
```

- Wirkung: npm löst keine Version auf, die jünger als 14 Tage ist (Fehler `notarget … with a date before …`). Die Sperre greift nur beim Neu-Auflösen; `npm ci` und ein bestehendes Lockfile laufen durch (Pilottest).
- Ersetzt das frühere `npm install --before=<Datum>`. `before` und `min-release-age` nie gleichzeitig setzen.
- Keine Tokens in die `.npmrc` im Repo.

## Paket hinzufügen (Schrittfolge)

1. **Braucht es das?** Erst Nuxt-Bordmittel, vorhandene Pakete und den Layer prüfen (KISS, YAGNI). Kein Paket, das zur Laufzeit fremde Domains anspricht (Grundsatz 1), z. B. Icon- oder Font-APIs.
2. **Paket prüfen:** gepflegt (letzte Version, offene Advisories auf github.com/advisories), Lizenz, Zahl der Abhängigkeiten, Installationsskripte, `engines` passt zu Node 26.
3. **Installieren:** `npm install <pkg>` bzw. `npm install -D <pkg>`. Die Wartezeit aus der `.npmrc` wirkt automatisch.
4. **Skripte:** `npm install-scripts ls`. Nur freigeben, was nötig ist (siehe oben).
5. **Prüfen:** `npm audit --omit=dev` ohne high/critical, `npm audit signatures`, dann `npm run lint`, `npm run typecheck`, Tests, Build. Bei Frontend-Paketen `npx nuxt analyze` (`performance.md`). Im Browser: kein Request an fremde Domains.
6. **Lockfile prüfen:** `npm ci` muss mit der neuen `package-lock.json` durchlaufen. (Gegenbeispiel FlowTech 21.11.2026: `Missing: @emnapi/core@1.11.3 from lock file`.)
7. **Committen:** `package.json`, `package-lock.json` und `allowScripts` zusammen, z. B. `feat: …` oder `chore(deps): …`. Neue Env-Variablen in `.env.example` und README.

## Pakete aktualisieren

- **Normalfall Renovate** (unten): Pull Requests mit Wartezeit, Merge nur bei grünem CI (lint, typecheck, Tests, Build).
- **Von Hand:** `npm outdated`, dann `npm install <pkg>@<version>`. Danach `npm install-scripts ls` und `prune`, Schritte 5–7 von oben.
- **Immer die aktuelle Patch-Version** der Mindestversionen unten. Vor jedem Deployment `npm audit --omit=dev` ohne high/critical und `npm audit signatures`.
- **Nuxt-Minor-Update:** vorher den Probe-Build mit `compatibilityVersion: 5` (`server-und-sicherheit.md`).
- **Bewusst nicht aktualisieren:**
  - `typescript` bleibt auf `~6.0` (npm-`latest` ist seit 08.07.2026 TS 7.0, `vue-tsc` 3.x scheitert damit mit `ERR_PACKAGE_PATH_NOT_EXPORTED`). Neu bewerten, wenn TS 7.1 und Vue Language Tools v4 stabil sind.
  - Vue bleibt bei 3.5 (3.6 ist RC, Vapor nicht in Kundenprojekten). Reka UI 3 (alpha) erst mit shadcn-vue-Unterstützung.
  - `@nuxtjs/i18n` bleibt bei 10.6 (es gibt kein v11). Vor dem Umstieg auf Nuxt 5 prüfen, ob es läuft (nutzt noch h3 v1).
- Sicherheitsupdates mit high/critical gehen in **alle** Projekte. Andere Regeländerungen werden in geplanten Umsetzungsrunden nachgezogen (Kern, Abschnitt „Arbeitsweise“), nicht nebenbei in jeder Session.

## Sicherheitsupdates

1. **Quellen:** Renovate-PRs mit Advisory, `npm audit`, Nuxt-Changelog (nuxt.com/changelog), GitHub-Advisories.
2. **Einordnen:** Betrifft es Laufzeit-Code (Server, Client-Bundle) mit high/critical → sofort, in allen Projekten. Nur Dev-Werkzeug → mit dem nächsten Update, solange die Regel „Dev-Server nie im Netz“ eingehalten ist.
3. **Trotz Wartezeit installieren** (Pilottest 21.11.2026):
   ```bash
   npm install <pkg>@<exakte Version> --min-release-age-exclude=<pkg>
   ```
   - Alle neu benötigten Abhängigkeiten des Pakets ebenfalls ausnehmen, Beispiel Vite: `--min-release-age-exclude=rolldown --min-release-age-exclude="@rolldown/*"`.
   - Immer die exakte Zielversion angeben: Ein ausgenommenes Paket ohne Version geht auf die neueste, auch auf eine gerade erst erschienene.
   - Dauerhaft nur per `.npmrc` `min-release-age-exclude[]=<pkg>`, bewusst, mit Kommentar und Begründung, und danach wieder entfernen.
4. **Dokumentieren:** Commit `fix(deps): <pkg> <version> (GHSA-…)`, Punkt in der `STANDARDS-AUDIT.md` abhaken.
5. **Transitive Abhängigkeit**, deren Elternpaket noch nicht nachzieht: als Notlösung `overrides` in `package.json`, mit Kommentar in der README, und wieder entfernen, sobald das Elternpaket aktualisiert ist.
6. Danach `npm ci`, Tests, Build, Deployment.

### Mindestversionen wegen Advisories (Stand 21.11.2026)

| Paket | mindestens | Grund |
|---|---|---|
| `nuxt` | 4.6.4 (zieht `nitropack` ≥ 2.13.6) | 8 Nuxt- + 3 Nitro-Advisories, u. a. `%2F` umgeht Route-Rules bei Catch-all-Seiten (GHSA-f3x9-2chm-73c8), Umgehung von `server/middleware` per `//` (GHSA-r99w-jh2x-3mg9), SSR-Fehlerdetails (GHSA-96x6-fvhx-49hg), Route-Cache gab `Set-Cookie` weiter (GHSA-39r7-wfcx-99xg) |
| `@nuxt/image` | 2.2.1 | GHSA-p5vf-pjf5-ggj3 (`/_ipx`) |
| `vite` | 8.3.7 | GHSA-p4f5-76q4-ffq7 (Dev-Server im Netz) |
| `vue` | 3.5.42 | GHSA-g2v6-rqmx-r4w6 (SSR-XSS über `v-bind="obj"`) |
| `drizzle-orm` | 0.45.2 | GHSA-gpj5-g38j-94v9 |
| `zod` | 4.6.6 | GHSA-mrhx-c7xc-m3w5 |
| `nodemailer` | 10.1.4 | Advisory |

Mindestversion aus anderem Grund: `nuxt-auth-utils` ≥ 0.6 (Kompatibilität mit Nuxt 4.6 und `nuxt/server`; neues Secret `NUXT_APP_SECRET`, Umstieg in `server-und-sicherheit.md`).

## Renovate

Jedes Repo nutzt Renovate mit einem gemeinsamen Preset im Repo `f7or7an/renovate-config`. Beschluss: `config:best-practices`, Wartezeit 14 Tage für npm, Patch und Minor gruppiert, Sicherheitsupdates sofort, wöchentliche Lockfile-Pflege, Basis-Images per Digest. Merge nur bei grünem CI (lint, typecheck, Tests, Build).

Zu beachten (Belege: renovatebot/renovate `lib/config/presets/internal/config.preset.ts` und `security.preset.ts`):
- `config:best-practices` enthält schon `docker:pinDigests` und `:maintainLockFilesWeekly`: nicht doppelt eintragen.
- Es enthält auch `security:minimumReleaseAgeNpm` als packageRule (npm: 3 Tage). Eine packageRule schlägt das oberste `minimumReleaseAge`, deshalb stehen die 14 Tage für npm selbst als packageRule.
- **Docker:** Digest-Updates altern gegen `tag_last_pushed`. Gleitende Tags wie `node:26-slim` werden oft neu gepusht und würden mit 14 Tagen womöglich nie aktualisiert; dhi.io und GHCR liefern keinen Zeitstempel. Deshalb **volle Versions-Tags mit Digest** (`node:26.13.1-slim@sha256:…`) und für Digest-Updates 3 Tage (abgestimmt mit `container-und-deployment.md`).
- `vulnerabilityAlerts` wirkt nur, wenn im GitHub-Repo die Dependabot-Alerts eingeschaltet sind.
- Sicherheitsupdates, die jünger als 14 Tage sind, scheitern im Renovate-PR am Lockfile, weil die `.npmrc` die Wartezeit erzwingt. Dann den Weg von Hand nehmen (Abschnitt „Sicherheitsupdates“, Schritt 3). `minimumReleaseAgePackageManagerSync` ist experimentell: nicht nutzen.
- Versionen, die Renovate sonst nicht sieht (z. B. `ARG NPM_VERSION=12.2.2` im Dockerfile), bekommen in der Zeile davor den Kommentar `# renovate: datasource=npm depName=npm`; der `customManagers`-Eintrag unten liest sie.

Entwurf des Presets (`default.json`; Einzelpunkte nach den Belegen oben, als Ganzes **ungeprüft**, beim Anlegen mit `npx --package renovate renovate-config-validator` prüfen):

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:best-practices"],
  "minimumReleaseAge": "14 days",
  "osvVulnerabilityAlerts": true,
  "packageRules": [
    { "matchDatasources": ["npm"], "minimumReleaseAge": "14 days" },
    { "matchDatasources": ["docker"], "matchUpdateTypes": ["digest"], "minimumReleaseAge": "3 days" },
    { "matchUpdateTypes": ["minor", "patch"], "groupName": "Minor- und Patch-Updates" },
    { "matchPackageNames": ["typescript"], "allowedVersions": "<7" },
    { "matchPackageNames": ["@f7or7an/*"], "minimumReleaseAge": null }
  ],
  "customManagers": [
    {
      "customType": "regex",
      "managerFilePatterns": ["/(^|/)Dockerfile$/", "/(^|/)\\.github/workflows/[^/]+\\.ya?ml$/"],
      "matchStrings": ["# renovate: datasource=(?<datasource>[a-z-]+) depName=(?<depName>\\S+)\\s+(?:(?:ARG|ENV) )?[A-Z_]*VERSION(?:=|: )(?<currentValue>[^\\s\"']+)"]
    }
  ]
}
```

- `npm.minimumReleaseAgePackageManager` bewusst weggelassen: wirkt nur zusammen mit dem experimentellen `minimumReleaseAgePackageManagerSync`.
- Der `customManagers`-Eintrag liest Dockerfile-Zeilen (`ARG NPM_VERSION=12.2.2`) und Workflow-Zeilen (`NPM_VERSION: 12.2.2`), jeweils mit dem `# renovate:`-Kommentar in der Zeile davor. So laufen Dockerfile und CI nicht auseinander.
- Die `@f7or7an/*`-Regel steht nach der npm-Regel, damit eigene Layer-Versionen nicht warten.
- Images in `run:`-Zeilen von Workflows (z. B. Trivy) brauchen einen eigenen `matchStrings`-Eintrag; Muster in `ci-workflow.md`.

Im Projekt (`renovate.json`): `{ "extends": ["github>f7or7an/renovate-config"] }`.

## Gemeinsamer Layer `@f7or7an/nuxt-base`

**Ziel:** Was in mindestens zwei Projekten gleich gebraucht wird, liegt einmal im Nuxt Layer (ein Nuxt-Projekt, das andere Projekte per `extends` erben) statt als Kopie in jedem Projekt.

- **Repo und Paket:** privates Repo (Vorschlag `f7or7an/nuxt-base`), veröffentlicht als privates npm-Paket `@f7or7an/nuxt-base` über GitHub Packages. Nicht als Git-Abhängigkeit, weil npm 12 Git sperrt und die Nuxt-Doku npm-Pakete empfiehlt (nuxt.com/docs/4.x/guide/going-further/layers).
- **Einbinden:** `extends: ['@f7or7an/nuxt-base']` in der `nuxt.config.ts`. In `package.json` mit **fester Version** ohne `^` (z. B. `"@f7or7an/nuxt-base": "1.2.0"`). Updates kommen per Renovate.
- **Stand (24.11.2026):** Das Gerüst liegt lokal in `WebSites/nuxt-base/` (eigenes Git-Repo, geprüft, nicht veröffentlicht). Veröffentlichen erst, wenn Florian Repo `f7or7an/nuxt-base` und Token-Verfahren angelegt hat (README dort). Bis dahin ist `_bausteine/` die Quelle (kopieren).
- **Startumfang:** `SiteSkipLink`, `a11y.css`, `PlaceholderNote`, `ContactForm`-Grundlage mit Honeypot und Mindestzeit, `server/utils/security.ts` (Rate-Limit, Honeypot, Client-IP), CSRF-Middleware, Muster für die Health-Route, ESLint-Basis, ggf. Renovate- und tsconfig-Vorgaben.
- **Nur was in ≥ 2 Projekten gleich gebraucht wird.** Projektspezifisches bleibt im Projekt.

### Regeln im Layer

- Was der Layer importiert, steht in seinen eigenen `dependencies` (nicht darauf verlassen, dass das Projekt es installiert hat).
- `package.json` mit `"main": "./nuxt.config.ts"`.
- Keine `~/`- oder `@/`-Pfade (sie zeigen im Projekt auf das Projekt, nicht auf den Layer), sondern relative Pfade oder `#layers/<name>`.
- Semver-Tags (Breaking Change = Major), Changelog, Conventional Commits Pflicht (`feat:`, `fix:`, `chore(deps):` …).
- Für den Layer gelten alle Regeln dieser Datei (npm 12, `.npmrc`, `allowScripts`, Renovate, Mindestversionen).

Entwurf der Layer-`package.json` (ungeprüft):

```json
{
  "name": "@f7or7an/nuxt-base",
  "version": "0.1.0",
  "type": "module",
  "main": "./nuxt.config.ts",
  "publishConfig": { "registry": "https://npm.pkg.github.com" }
}
```

### Zugriff auf das private Paket

- Projekte brauchen in der `.npmrc` die Zuordnung des Scopes (Vorschlag, ungeprüft): `@f7or7an:registry=https://npm.pkg.github.com`. Ohne Token, das ist kein Geheimnis.
- Das Token nur als Build-Secret im CI bzw. Docker-Build, nie im Image, nie in der `.npmrc` im Repo, kein langlebiges persönliches Token, wo ein kurzlebiges reicht. Das genaue Verfahren beim Anlegen des Layers festlegen und in `SERVER.md` (Schlüsselliste) und `container-und-deployment.md` eintragen.
- Eigene Layer-Versionen sollen nicht 14 Tage warten. Vorschlag: `.npmrc` `min-release-age-exclude[]=@f7or7an/*` (eigenes Paket, begründete Dauerausnahme) und die Renovate-Regel oben. Beim Anlegen entscheiden. Den Scope `@f7or7an` zusätzlich auf npmjs.com sichern (npm-Doku empfiehlt das gegen Namensverwechslung: sonst könnte ein fremdes Paket gleichen Namens ohne Wartezeit durchrutschen).

### Übergang

- Bis der Layer veröffentlicht ist, bleibt `_bausteine/` die Quelle: Änderungen nur dort pflegen und in alle Projekte kopieren.
- Danach wandert der Inhalt in den Layer, die Projekte binden ihn per `extends` ein, die Kopien werden gelöscht, und `_bausteine/` wird aufgelöst.
