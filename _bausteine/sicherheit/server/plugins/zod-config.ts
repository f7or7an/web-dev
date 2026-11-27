// Herkunft: _bausteine/sicherheit/server/plugins/zod-config.ts (Stand 24.11.2026)
// Spielt die zod-Einstellungen aus shared/zod.ts im Server sicher ein. Nitro verwirft beim Bündeln den Aufruf in
// shared/zod.ts (die Datei reicht `z` nur durch, Rollup-`moduleSideEffects`); ohne dieses Plugin antwortet der
// Server mit englischen zod-Texten („Too big: …“). Nitro-Plugins laufen beim Start, vor der ersten Anfrage.
// Die Sprache liest zod erst beim Erzeugen der Fehlermeldung, darum wirkt sie auch für schon erstellte Schemas.
import { configureZod } from '../../shared/zod'

export default defineNitroPlugin(() => {
  configureZod()
})
