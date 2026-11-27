// Herkunft: _bausteine/sicherheit/shared/utils/form-protection.ts (Stand 21.11.2026)
// Formularschutz: eine Quelle für Browser und Server (Regel: server-und-sicherheit.md, Formularschutz).

/** Verstecktes Feld, das nur Bots ausfüllen. */
export const HONEYPOT_FIELD = 'website'

/** Feld mit dem signierten Zeit-Token im Formular-Body. */
export const FORM_TOKEN_FIELD = 'formToken'

/** Frühestens so lange nach Ausstellung des Tokens darf abgeschickt werden (Regel: ≥ 3 s). */
export const FORM_TOKEN_MIN_AGE_MS = 3_000

/** Danach ist das Token abgelaufen; der Browser holt dann vor dem Absenden ein neues. */
export const FORM_TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000

/** Formularname, für den ein Token gilt (z. B. `contact`, `newsletter`). */
export const FORM_NAME_PATTERN = /^[a-z][a-z0-9-]{0,39}$/

/** Gründe, aus denen der Server ein Token ablehnt (stehen in `error.data.formToken`). */
export type FormTokenProblem = 'missing' | 'invalid' | 'too-early' | 'expired'
