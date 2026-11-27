---
paths:
  - "**/tests/**"
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/vitest.config.*"
  - "**/playwright.config.*"
  - "**/eslint.config.*"
  - "**/.github/workflows/**"
  - "**/STANDARDS-AUDIT.md"
  - "**/scripts/integration/**"
  - "**/scripts/test-*"
---

# Tests, Lint und Qualität

Stand: 21.11.2026, ergänzt 25.11.2026. Ergänzt die Kurzfassungen zu Arbeitsweise und Qualität in `WebSites/CLAUDE.md`. Verweise auf `*.md` ohne Pfad meinen `WebSites/.claude/rules/`. CI-Workflow: `ci-workflow.md`. Image-Bau: `container-und-deployment.md`. Barrierefreiheitsprüfung: `barrierefreiheit.md`. Performance-Budget: `performance.md`.

## Lint und Format

- **ESLint 10** mit **`@nuxt/eslint` ≥ 1.17** und `stylistic: true` (2 Leerzeichen, einfache Anführungszeichen, keine Semikolons). Skript `npm run lint`. Grund für 10: ESLint 9 ist laut eslint.org am Ende der Pflege (Quelle nur indirekt geprüft).
- Kein zusätzliches Prettier, kein Biome: zwei Formatierer streiten sich.
- Oxlint höchstens zusätzlich, nie statt ESLint: Es prüft in `.vue`-Dateien nur den `<script>`-Teil.
- Gora nutzt heute einen anderen Stil und wird beim nächsten größeren Umbau umgestellt.
- Eine gemeinsame ESLint-Basis kommt mit dem Layer, sobald er veröffentlicht ist (siehe `abhaengigkeiten-und-layer.md`).
- **Übergang:** Heute hat noch kein Projekt `npm run lint` bzw. `eslint.config`, FlowTech und Ortrud auch kein `typecheck`. Fehlt ein Skript (`lint`, `typecheck`, Tests), wird es nicht nebenbei eingeführt, sondern ist ein Punkt in `STANDARDS-AUDIT.md` und wird als eigener Auftrag umgesetzt. Bis dahin laufen die vorhandenen Prüfungen.

## Tests

**Versionen:** Vitest 5 (`clearMocks` ist dort standardmäßig an, also nicht von Hand zurücksetzen), `@nuxt/test-utils` ≥ 4.4, Playwright aktuell.

**Pflichtumfang je Modus**

| Modus | Pflicht |
|---|---|
| A statisch | keine Unit-Tests; Browser-Test `npm run test:chunk-reload` (`_bausteine/chunk-reload/`), sonst Prüfung nach Checkliste unten |
| B Hybrid | Vitest für `server/utils` (empfohlen für alle Server-Logik) + ein E2E-Rauchtest, der jede API-Route und jedes Formular einmal aufruft + `npm run test:build` (Fehlerlog gegen den gebauten Server, `server-und-sicherheit.md`) + `npm run test:chunk-reload` (alle Modi) |
| C Webapp | wie B, dazu Playwright für Login und die Hauptabläufe (z. B. Buchung, Anmeldung, Sitzungsraum) |

- Vitest für Utils und Server-Routen, Playwright für die wichtigsten Abläufe (Formular absenden, Login, Buchung).
- Formulartests decken auch den Fehlerfall ab (Pflichtfeld leer, Honeypot gefüllt, Rate-Limit). Login-Tests prüfen, dass Einfügen und Auto-Absenden durch Passwortmanager funktionieren (kein Honeypot, keine Mindestzeit) und das Rate-Limit pro IP und pro Konto greift.
- Tests nutzen nur Testdaten, nie echte Personendaten (auch nicht auf Staging).

**Aufbau:** `vitest.config.ts` mit drei Projekten, Playwright über `@nuxt/test-utils/playwright`. Muster nach Nuxt-Doku (im Pilottest vom 21.11.2026 nicht geprüft, beim ersten Einsatz verifizieren):

```ts
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' } },
      await defineVitestProject({ test: { name: 'nuxt', include: ['tests/nuxt/**/*.test.ts'], environment: 'nuxt' } }),
      { test: { name: 'e2e', include: ['tests/e2e/**/*.test.ts'], environment: 'node' } },
    ],
  },
})
```

- `unit`: reine Funktionen und `server/utils`, ohne Nuxt-Umgebung (schnell).
- `nuxt`: Komponenten und Composables, die Nuxt brauchen.
- `e2e`: gegen den gebauten Server; Playwright-Tests importieren `expect` und `test` aus `@nuxt/test-utils/playwright`.
- Eigener Port für Tests (aus der Projekt-`CLAUDE.md`, sonst 3456), nie 3000 (siehe Checkliste).

## Vor jedem Commit

`npm run lint`, `npm run typecheck`, Tests grün (soweit das Projekt die Skripte schon hat, siehe Übergang oben). Das CI erzwingt dasselbe bei jedem Push und jedem Renovate-PR (lint, typecheck, Tests, Build); gemergt wird nur bei grünem CI. Workflow-Vorlage: `ci-workflow.md`.

## Qualität vor jedem Deployment (Checkliste)

**Bauen**
- [ ] `npm run typecheck` und `npm run build` bzw. `npm run generate` laufen ohne Fehler.
- [ ] Tests grün (Modus B/C, siehe oben), dazu `npm run test:build` (B/C) und `npm run test:chunk-reload` (alle Modi). Fehlt ein Skript: Audit-Punkt.
- [ ] `npm audit --omit=dev` ohne high/critical, `npm audit signatures` ohne Fehler (Ablauf bei Funden: `abhaengigkeiten-und-layer.md`).
- [ ] Im CI: Image-Scan ohne high/critical (Modus B/C, `ci-workflow.md`).

**Im Browser**
- [ ] Desktop 1440 px und Handy 390 px, ggf. Hell und Dunkel.
- [ ] Bedienung per Tastatur.
- [ ] Keine Konsolenfehler, **auch keine CSP-Verstöße** (auch nicht im Report-Only-Modus). Nach Updates von `@nuxt/image` besonders auf den `onerror`-Hash achten (Konfiguration: `server-und-sicherheit.md`).
- [ ] **Kein einziger Request an fremde Domains** (Netzwerk-Tab).
- [ ] Ohne Klick werden keine Cookies und kein Web-Storage geschrieben, außer der Login-Sitzung (Speicher-Tab bzw. `browser_storage`; Regel: `formulare-und-datenschutz.md`).
- [ ] Jedes Formular einmal komplett durchspielen, auch den Fehlerfall.

**Barrierefreiheit** (jedes Deployment, nicht nur beim Livegang)
- [ ] Prüfablauf aus `barrierefreiheit.md` vollständig durchlaufen (automatisch 0 Verstöße A/AA, Handprüfung, NVDA-Stichprobe, bekannte Barrieren dokumentiert).

**Performance** (Budget und Werkzeuge: `performance.md`)
- [ ] Lighthouse mobil bzw. `browser_performance` auf jeder Seitenvorlage, Labor-Budget eingehalten.
- [ ] Vor dem ersten Livegang und nach neuen Abhängigkeiten: `npx nuxt analyze`.

**SEO-Grundausstattung** (Details: `seo-i18n-inhalte.md`)
- [ ] `lang`, `titleTemplate`, Beschreibung, `theme-color`, Favicon und Webmanifest, `robots.txt`, `sitemap.xml`, Canonical und hreflang (i18n), og:image.
- [ ] Beim Relaunch alte URLs per 301/308 auf ihr passendstes Ziel umgeleitet.

**Eigene Testläufe**
- **Eigene Tests auf eigenem Port** (aus der Projekt-`CLAUDE.md`, sonst 3456). Port 3000 gehört Florians `npm run dev`. **Prozesse, die ich nicht selbst gestartet habe, nie beenden.**
- Dev-Server nie im Netz freigeben (Regel: `server-und-sicherheit.md`).
- Screenshots, Logs und Hilfsskripte gehören in den Scratchpad der Session, nicht ins Projekt.

## Arbeiten mit `STANDARDS-AUDIT.md`

Jedes Projekt hat eine `STANDARDS-AUDIT.md` im Projektordner (bei Gora in `webapp/`). Sie listet, wo das Projekt noch von den Regeln abweicht.

- **Lesen, aber nicht komplett** (bis über 100 KB): Überblickstabelle lesen, dann per Suche die Punkte zum betroffenen Bereich bzw. zur Datei.
- **Audit-Punkte** in den angefassten Dateien mitbeheben, wenn sie risikoarm sind. Riskantes (Auth-Update, Migrationen, Node-Wechsel, Datenmodell) nie nebenbei, nur als eigener Auftrag.
- In einem Projekt nur auf Auftrag arbeiten; die Liste ist kein Auftrag, alles abzuarbeiten.
- **Aufbau eines Punkts:** ID nach Bereich (`A11Y-3`, `SEC-1`, `STACK-2` …), Priorität (P1 = vor dem nächsten Livegang/Deploy: Recht, Sicherheit, Barrieren, kaputte Funktion; P2 = Abweichung vom Standard; P3 = Verbesserung/Wartbarkeit), dazu Fundstelle (`datei:zeile`), Ist, Soll (Verweis auf die Regel) und konkreter Schritt.
- **Erledigt:** `[x]` setzen, Datum und Commit oder kurze Notiz dahinter (z. B. `[x] … – 20.11.2026, a1b2c3d`).
- **Neue Abweichungen** in der passenden Priorität mit der nächsten freien Nummer ergänzen.
- Kopf der Datei: Stand, Grundlage (Regelfassung), Methode (statisch oder mit Build/Browser), Überblickstabelle nach Bereichen. Browserprüfungen mit Datum und dem, was **nicht** geprüft wurde.

### Umsetzungsrunden (z. B. Phase 2, nicht jede Session)

Gilt nur in geplanten Umsetzungsrunden, nicht in einer normalen Arbeitssession:
- Regeländerungen werden in **allen** Projekten nachgezogen. Die `STANDARDS-AUDIT.md` jedes Projekts wird dafür gegen die neue Fassung neu erstellt bzw. ergänzt; Punkte, die eine geänderte Regel betreffen, werden erneut geprüft.
- Die Umsetzung läuft in Agententeams. Jeder Punkt wird von einem unabhängigen Prüfer-Agenten freigegeben, der die Änderung selbst nachprüft (nicht nur den Bericht liest). Erst nach dieser Freigabe gilt ein Punkt als erledigt und wird abgehakt.
