// Herkunft: _bausteine/sicherheit/error-log-test-env.ts (Stand 24.11.2026)
// Build-Test für den Fehlerlog (npm run test:build → tests/build/error-log.mjs). Liefert zwei Nuxt-Umgebungen für
// `$env` in der nuxt.config.ts, gebaut mit `nuxt build --envName <name>`:
// - error-log-test: mit Testrouten, die gezielt Fehler werfen (nur in diesem Build, nie in Produktion)
// - error-log-baseline: dasselbe ohne das Plugin request-error-log (Vergleich: Antworten müssen gleich sein)
// Eigene Ausgabeordner, damit `.output` (Produktion) unberührt bleibt. Die Testdateien in tests/build/fixtures werden
// nur in diesen Umgebungen geladen; im Docker-Build fehlt tests/ (.dockerignore), dort ist keine Umgebung aktiv.
// Warum ein Vergleichsbuild: Der Baustein hängt am Zusammenspiel von Nitro-Hook und Nuxt-Fehler-Handler. Ändert ein
// Nuxt- oder Nitro-Update das, schlägt dieser Test an (im CI bei jedem Renovate-PR).
import { sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NuxtConfig } from 'nuxt/schema'

export const ERROR_LOG_TEST_ROUTE = '/__test/error-log'
export const ERROR_LOG_OUTPUT_DIRS = { test: '.output-error-log-test', baseline: '.output-error-log-baseline' }
const REQUEST_ERROR_LOG_PLUGIN = 'request-error-log'
// Nitro schreibt Handler-Pfade unverändert in ein erzeugtes Modul: Windows-Backslashes würden dort zu Escapes
const fixture = (name: string) => fileURLToPath(new URL(`./tests/build/fixtures/${name}`, import.meta.url)).split(sep).join('/')
const handler = fixture('error-log-handler.ts')
const page = fixture('ErrorLogTestPage.vue')

function testBuild(outputDir: string, withErrorLog: boolean): NuxtConfig {
  return {
    nitro: {
      output: { dir: outputDir },
      handlers: [
        { route: `${ERROR_LOG_TEST_ROUTE}/token/:token`, handler },
        { route: `${ERROR_LOG_TEST_ROUTE}/**`, handler },
      ],
    },
    hooks: {
      'pages:extend'(pages) {
        pages.push({ name: 'error-log-test', path: `${ERROR_LOG_TEST_ROUTE}-page/:token`, file: page })
      },
      'nitro:init'(nitro) {
        if (withErrorLog) return
        nitro.options.plugins = nitro.options.plugins.filter(plugin => !plugin.includes(REQUEST_ERROR_LOG_PLUGIN))
      },
    },
  }
}

/** In der nuxt.config.ts: `$env: errorLogTestEnv()`. */
export function errorLogTestEnv(): Record<string, NuxtConfig> {
  return {
    'error-log-test': testBuild(ERROR_LOG_OUTPUT_DIRS.test, true),
    'error-log-baseline': testBuild(ERROR_LOG_OUTPUT_DIRS.baseline, false),
  }
}
