// Herkunft: _bausteine/sicherheit/vitest.config.ts (Stand 21.11.2026). Projekt „unit“ aus tests-und-qualitaet.md;
// die Projekte „nuxt“ (defineVitestProject aus @nuxt/test-utils ≥ 4.4) und „e2e“ im Projekt ergänzen.
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          // 'nuxt/server' braucht sonst die Nuxt-Laufzeit; der Stub bildet die portable Fassung nach
          alias: { 'nuxt/server': fileURLToPath(new URL('./tests/unit/nuxt-server-stub.ts', import.meta.url)) },
        },
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
    ],
  },
})
