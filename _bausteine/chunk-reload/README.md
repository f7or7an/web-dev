# Baustein Chunk-Reload ohne sessionStorage

Regel: Grundsatz 3 „Nur Sitzung“ (`WebSites/CLAUDE.md`, `formulare-und-datenschutz.md`). Gilt für **alle** Modi (A, B, C).
Kommt in den Layer `@f7or7an/nuxt-base` (dort schon enthalten, aktiv ohne Einstellung). Stand 25.11.2026, übernommen aus dem Praxisraum (dort vom Sicherheitsprüfer bestätigt, Prüfung 24.11.2026, S6).

## Problem

Nach einem Deploy kennt ein offener Tab nur die alten Chunk-Dateinamen. Beim nächsten Seitenwechsel scheitert das Nachladen. Nuxts Standard (`experimental.emitRouteChunkError: 'automatic'`) lädt dann mit `reloadNuxtApp({ persistState: true })` neu und schreibt dafür **`nuxt:reload`** (Pfad und Ablaufzeit) und **`nuxt:reload:state`** (der ganze Payload-State) in den sessionStorage. Das verstößt gegen „Nur Sitzung“ und steht in keiner Datenschutzerklärung.

## Lösung

- `nuxt.config.ts`: `experimental: { emitRouteChunkError: 'manual' }`
- `app/plugins/chunk-reload.client.ts`: Schlägt nach dem ersten Aufbau ein Seitenwechsel wegen eines Chunk-Fehlers fehl, ruft es die Zielseite vollständig neu auf (`window.location.href`). Dabei wird nichts gespeichert. Nach einem Manifest-Update (Nuxt fragt stündlich `/_nuxt/builds/latest.json` ab) wird der nächste Seitenwechsel ebenfalls ein vollständiger Seitenaufruf.
- **Schleifenschutz ohne Speicher:** Das Plugin lädt nur bei einem Seitenwechsel nach dem ersten Aufbau neu. Fehlt der Chunk auch nach dem Neuladen, scheitert schon der erste Aufbau. Nuxt zeigt dann die Fehlerseite, statt erneut zu laden.

## Geprüft am Code von Nuxt 4.6.4

- `'manual'` registriert weder `chunk-reload.client` (`automatic`) noch `chunk-reload-immediate.client`. Nur diese beiden rufen `reloadNuxtApp` mit `persistState` auf, und nur sie reagieren auf `app:manifest:update`. `check-outdated-build.client` ruft den Hook nur auf und lädt nicht selbst neu.
- Der Hook `app:chunkError` bleibt mit `'manual'` aktiv (Nuxt hört auf `vite:preloadError`), das Plugin nutzt ihn.
- `restore-state.client` (liest `nuxt:reload:state`) läuft nur mit `experimental.restoreState: true`. Das bleibt aus.
- **Rest:** `chunk-reload-crawler.client` bleibt bei jedem Wert außer `false` aktiv. Es ruft `reloadNuxtApp()` ohne State auf, aber nur für Bots (User-Agent passt auf `/bot\b|chrome-lighthouse|facebookexternalhit|google\b/i`) und nur bei einem Chunk-Fehler während der Hydration. Dann steht `nuxt:reload` (Pfad und Ablaufzeit, keine Personendaten) im sessionStorage des Bots. Für Menschen schreibt nichts. Mit `false` fiele auch das weg, dafür lädt dann auch Googlebot nicht neu, und das Plugin bräuchte einen eigenen `vite:preloadError`-Listener. Hingenommen, nicht in der DSE nennen (Entscheidung Florian 27.11.2026).
- **Grenze:** Ein Chunk-Fehler schon beim ersten Aufbau führt nicht zum Neuladen, z. B. bei veraltetem, zwischengespeichertem HTML. Darum HTML nicht lange cachen (`SERVER.md` 2.5: HTML ohne langen Cache).

## Dateien

| Datei | Ziel im Projekt |
|---|---|
| `app/plugins/chunk-reload.client.ts` | gleich |
| `tests/browser/chunk-reload.mjs` | gleich (Browser-Test, siehe unten) |

## Übernahme

**Modus A (statisch, FlowTech)** und **Modus B/C** gleich:
1. Plugin kopieren, Kopfkommentar „Herkunft“ stehen lassen.
2. In der `nuxt.config.ts`:
   ```ts
   experimental: {
     // Chunk-Reload ohne sessionStorage (_bausteine/chunk-reload): Nuxts eigenes Neuladen bleibt aus
     emitRouteChunkError: 'manual',
   },
   ```
   Hat das Projekt schon eine andere Lösung (Praxisraum), diese durch die Baustein-Fassung ersetzen. Sie ist inhaltlich gleich.
3. Test kopieren und in `package.json`: `"test:chunk-reload": "node tests/browser/chunk-reload.mjs [Wurzel] [Startseite] [Zielseite]"`. Standard ist `. / /kontakt`. Gora und FlowTech (i18n) wählen eine Zielseite, die es gibt, z. B. `/impressum`.
4. Nach `npm run build` (B/C) bzw. `npm run generate` (A) mit eigenem Port: PowerShell `$env:TEST_PORT=3456; npm run test:chunk-reload`. Ohne `.output/server` (Modus A) startet das Skript selbst einen kleinen statischen Server über `.output/public`. Dann müssen Start- und Zielseite vorgerendert sein.
   Wer das Skript direkt in **Git Bash** aufruft (`node tests/browser/chunk-reload.mjs . / /kontakt`), braucht `MSYS_NO_PATHCONV=1` davor, sonst macht Git Bash aus `/kontakt` einen Windows-Pfad. Über `npm run test:chunk-reload` und in PowerShell ist das nicht nötig.
5. CI: Schritt `npm run test:chunk-reload` nach dem Build bzw. `generate` (`_bausteine/ci/ci.yml`, `ci-static.yml`; Chrome ist auf `ubuntu-24.04` vorhanden).
6. Datenschutzerklärung: nichts zu ergänzen, weil nichts gespeichert wird.

## Browser-Test `tests/browser/chunk-reload.mjs`

Headless Chrome über das DevTools-Protokoll, ohne Zusatzpaket (`CHROME_PATH`, sonst Standardpfad bzw. `google-chrome`). Er prüft zwei Fälle:
1. **Manifest-Update:** Hook `app:manifest:update` auslösen, dann Seitenwechsel. Erwartet: genau ein vollständiger Seitenaufruf der Zielseite.
2. **Chunk fehlt:** Alle Chunks, die das HTML der Startseite nicht nennt, werden umbenannt (danach immer zurück). Das wirkt wie ein Deploy direkt nach dem Ausliefern der Seite. Auch ein Vorab-Laden per NuxtLink scheitert dann, darum darf die Zielseite verlinkt sein. Erwartet: Seitenwechsel → genau ein Neuladen der Zielseite, dort fehlt der Chunk weiter, und in 6 s folgt kein weiteres Neuladen.

In beiden Fällen gilt: sessionStorage und localStorage leer, kein Cookie, und kein einziger Schreibzugriff (CDP-Ereignisse `DOMStorage`). Exit-Code 1 bei Fehlern.

**Ergebnisse (25.11.2026, Port 3466):**
- Testprojekt mit Node-Server und statisch (`TEST_STATIC=1`): bestanden.
- Layer-Spielwiese (`/` → `/ziel`): bestanden.
- Gegenprobe mit Nuxts Standard (`'automatic'`, ohne Plugin): Der Test schlägt fehl. Schreibzugriffe `nuxt:reload` und `nuxt:reload:state` im sessionStorage, in beiden Fällen.
