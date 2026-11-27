// Herkunft: _bausteine/sicherheit/shared/zod.ts (Stand 24.11.2026)
// zod 4 einmal für Browser und Server einstellen. Alle Schemas importieren `z` von hier, nie direkt aus 'zod'
// (ESLint-Regel no-restricted-imports, README).
// - jitless: zod prüft sonst beim Erstellen jedes Schemas per `new Function('')`, ob eval erlaubt ist; unter der CSP
//   ohne 'unsafe-eval' meldet der Browser einen Verstoß. zod liest den Schalter beim Erstellen jedes Schemas, deshalb
//   läuft configureZod() schon beim Import dieser Datei, also vor dem ersten Schema.
// - Fehlertexte in der Projektsprache (hier Deutsch; Gora: z.locales.bg()).
// Im Server-Bundle verwirft Nitro den Aufruf beim Import: Die Datei reicht `z` nur durch, und Rollup behandelt sie
// wegen `moduleSideEffects` als nebenwirkungsfrei. Deshalb ruft server/plugins/zod-config.ts configureZod() beim
// Start des Servers auf. Im Browser-Bundle bleibt der Aufruf erhalten (im Build geprüft, README).
import { z } from 'zod'

export function configureZod(): void {
  z.config({ jitless: true })
  z.config(z.locales.de())
}

configureZod()

export { z }
