---
paths:
  - "**/.github/workflows/**"
---

# CI-Workflow (GitHub Actions)

Stand 21.11.2026. Vorlage `.github/workflows/ci.yml` für Modus B und C: prüfen, Image bauen, scannen, nach GHCR schieben. Dockerfile und `compose.yml`: `WebSites/.claude/rules/container-und-deployment.md`. Weitere Prüf-Jobs (E2E, Playwright, Integration) und was vor einem Deployment zu prüfen ist: `WebSites/.claude/rules/tests-und-qualitaet.md`. Deploy auf dem Server: `WebSites/SERVER.md` 2.7.

## Regeln

- Actions immer per Commit-SHA pinnen, Version als Kommentar; Renovate aktualisiert sie (`config:best-practices`). Tags lassen sich umbiegen: Im März 2026 waren die Trivy-Actions betroffen und auch die Docker-Hub-Images `aquasec/trivy` 0.69.4–0.69.6 und `latest` (GHSA-69fq-xp46-6x23). Schutz: Digest statt Tag und Wartezeit (14 Tage für neue Versionen).
- `<sha>` beim Anlegen von der Release-Seite bzw. per `git ls-remote` eintragen, `<digest>` per `docker buildx imagetools inspect <image>:<tag>`.
- `permissions` so knapp wie möglich: global `contents: read`, nur der Image-Job `packages: write`.
- Keine langlebigen Geheimnisse: `GITHUB_TOKEN` reicht für GHCR und (sobald veröffentlicht) das Layer-Paket.
- Nicht freigegebene Installationsskripte sind ein Fehler (`npm_config_strict_allow_scripts`).
- Der Image-Scan läuft gegen eine Tar-Datei, nicht gegen `docker.sock`: Ein Scanner mit `docker.sock` hätte volle Kontrolle über den Runner.

## Vorlage

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
  workflow_dispatch:
permissions: { contents: read }
concurrency: { group: 'ci-${{ github.ref }}', cancel-in-progress: true }
env:
  npm_config_strict_allow_scripts: 'true'
  IMAGE: ghcr.io/f7or7an/<name>:${{ github.sha }}
  # renovate: datasource=npm depName=npm
  NPM_VERSION: 12.2.2
  # renovate: datasource=docker depName=aquasec/trivy
  TRIVY_IMAGE: aquasec/trivy:<version>@sha256:<digest>
jobs:
  check:
    runs-on: ubuntu-24.04
    permissions: { contents: read, packages: read }   # packages: Layer-Paket lesen
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with: { node-version-file: .node-version, cache: npm, registry-url: 'https://npm.pkg.github.com', scope: '@f7or7an' }
      - run: npm install -g "npm@$NPM_VERSION"
      - run: npm ci
        env: { NODE_AUTH_TOKEN: '${{ secrets.GITHUB_TOKEN }}' }
      - run: npm audit signatures
      - run: npm audit --omit=dev --audit-level=high
      - run: npm run lint && npm run typecheck && npm test && npm run build
  image:
    needs: check
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-24.04
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - uses: docker/setup-buildx-action@<sha> # v<x>
      - uses: docker/login-action@<sha> # v<x>
        with: { registry: ghcr.io, username: '${{ github.actor }}', password: '${{ secrets.GITHUB_TOKEN }}' }
      - name: Bauen (als Tar-Datei, noch nicht hochladen)
        uses: docker/build-push-action@<sha> # v<x>
        with:
          outputs: type=docker,dest=${{ runner.temp }}/image.tar
          provenance: false   # Attestierung erst beim Hochladen
          tags: ${{ env.IMAGE }}
          secrets: |
            "npmrc=//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}"
          cache-from: type=gha
          cache-to: type=gha,mode=max
      # Bei TOOMANYREQUESTS von ghcr.io: --db-repository public.ecr.aws/aquasecurity/trivy-db ergänzen
      - name: Image-Scan ohne high/critical (ohne docker.sock)
        run: >
          docker run --rm -v "$RUNNER_TEMP/image.tar:/image.tar:ro" "$TRIVY_IMAGE"
          image --input /image.tar --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed
      - name: Hochladen (mit Provenance)
        uses: docker/build-push-action@<sha> # v<x>
        with:
          push: true
          tags: ${{ env.IMAGE }}
          secrets: |
            "npmrc=//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}"
          cache-from: type=gha
```

## Hinweise

- Provenance hängt `build-push-action` beim Push standardmäßig an; `sbom: true` ist optional.
- `--ignore-unfixed`: Lücken im Basis-Image ohne verfügbaren Fix brechen nicht ab; sie verschwinden mit dem nächsten Digest-Update. Docker Scout ist als Scanner gleichwertig.
- Ohne Layer-Paket entfallen `registry-url`/`scope`, `NODE_AUTH_TOKEN` und `secrets:`. Ob `GITHUB_TOKEN` das Paket eines anderen Repos lesen darf, regelt das Paket („Manage Actions access“). Beim Anlegen des Layers prüfen, ebenso ob `npm audit signatures` mit GitHub Packages sauber durchläuft.
- Der wöchentliche Image-Neubau für Patches des Basis-Images entsteht über die Digest-Updates von Renovate (jedes Update = Commit = neues Image).
- **Renovate:** `NPM_VERSION` liest der `customManagers`-Eintrag des Presets (`WebSites/.claude/rules/abhaengigkeiten-und-layer.md`, gilt für Dockerfile und Workflows; Kommentar `# renovate: datasource=npm depName=npm` direkt darüber). So laufen Dockerfile und CI nicht auseinander. Für `TRIVY_IMAGE` (Image mit Digest) braucht das Preset einen zweiten Eintrag. Die Regex ist gegen diese Vorlage getestet (JavaScript, 21.11.2026); beim Anlegen mit `renovate-config-validator` und einem Probelauf prüfen:
  ```json
  {
    "customType": "regex",
    "managerFilePatterns": ["/(^|/)\\.github/workflows/[^/]+\\.ya?ml$/"],
    "matchStrings": [
      "# renovate: datasource=(?<datasource>docker) depName=(?<depName>\\S+)\\s+\\w+: \\S+?:(?<currentValue>[^@\\s]+)@(?<currentDigest>sha256:[a-f0-9]{64})"
    ]
  }
  ```
- **Modus A** (statisch) baut kein Image: `npm run generate` und Upload nach `SERVER.md` 2.7. Ein eigener schlanker Workflow (lint, typecheck, generate) ist möglich, deployt aber nicht automatisch.
