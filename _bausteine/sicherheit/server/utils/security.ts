// Herkunft: _bausteine/sicherheit/server/utils/security.ts (Stand 21.11.2026),
// weiterentwickelt aus Vogelperspektive/server/utils/security.ts.
// Alle Helfer nehmen ein RequestEvent: Handler, die sie nutzen, mit `defineEventHandler` aus 'nuxt/server'
// definieren (Regel server-und-sicherheit.md, „nuxt/server“).
// Explizite Importe statt Auto-Import, damit die Datei auch in Vitest ohne Nuxt läuft.
import type { RequestEvent } from 'nuxt/server'
import { createError, getRequestHeader, getRequestIP, readBody } from 'nuxt/server'
import { z } from '../../shared/zod'
import { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from '../../shared/utils/form-protection'
import { requireFormToken } from './form-token'

/**
 * Echte Client-IP hinter Caddy: der LETZTE Eintrag in X-Forwarded-For.
 * Caddy ersetzt den Header bei fremden Clients; hängt später ein Proxy davor an,
 * bleibt der letzte Eintrag trotzdem der, den Caddy gesehen hat. Ohne Header (lokal): Socket-Adresse.
 */
export function getClientIp(event: RequestEvent): string {
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  const last = forwarded?.split(',').map(entry => entry.trim()).filter(Boolean).at(-1)
  return last || getRequestIP(event) || 'unknown'
}

const IPV4_MAPPED_PREFIX = '::ffff:'
const IPV6_GROUPS = 8
const IPV6_PREFIX_GROUPS = 4

/**
 * Adresse für das Rate-Limit: IPv4 unverändert, IPv6 gekürzt auf das /64-Netz.
 * Grund: Ein Anschluss bekommt meist ein ganzes /64 und könnte sonst mit jeder Adresse neu zählen.
 */
export function rateLimitAddress(ip: string): string {
  // Zonen-Angabe (fe80::1%eth0) entfernen
  const address = (ip.split('%')[0] ?? ip).toLowerCase()
  if (!address.includes(':')) return address
  if (address.startsWith(IPV4_MAPPED_PREFIX) && address.includes('.')) return address.slice(IPV4_MAPPED_PREFIX.length)
  const [head = '', tail] = address.split('::')
  const headGroups = head ? head.split(':') : []
  const tailGroups = tail ? tail.split(':') : []
  const missing = tail === undefined ? 0 : IPV6_GROUPS - headGroups.length - tailGroups.length
  const groups = [...headGroups, ...Array.from({ length: Math.max(missing, 0) }, () => '0'), ...tailGroups]
  const prefix = groups.slice(0, IPV6_PREFIX_GROUPS).map(group => (Number.parseInt(group, 16) || 0).toString(16))
  return `${prefix.join(':')}::/64`
}

// --- Rate-Limit im Arbeitsspeicher (reicht für einen Container) ---

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000
// Obergrenze gegen Speicherüberlauf durch viele Adressen/Schlüssel (ca. 10.000 × 0,4 kB)
export const MAX_RATE_LIMIT_ENTRIES = 10_000
// Lange Schlüssel (z. B. E-Mail-Adressen) gekürzt speichern
const MAX_KEY_LENGTH = 128
let lastCleanup = 0

function removeExpiredBuckets(now: number) {
  lastCleanup = now
  for (const [id, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(id)
}

/** Zählt einen Versuch. Reine Logik ohne Event, damit sie sich testen lässt. */
export function consumeRateLimit(id: string, max: number, windowMs: number, now = Date.now()) {
  // Abgelaufene Zähler beim Aufruf entfernen statt per Timer (kein setInterval im Server nötig)
  if (now - lastCleanup >= CLEANUP_INTERVAL_MS) removeExpiredBuckets(now)
  const bucket = buckets.get(id)
  if (bucket && bucket.resetAt > now) {
    bucket.count++
    return { allowed: bucket.count <= max, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  buckets.delete(id)
  if (buckets.size >= MAX_RATE_LIMIT_ENTRIES) removeExpiredBuckets(now)
  // Immer noch voll: die ältesten Einträge verwerfen (Map behält die Einfügereihenfolge)
  for (const oldest of buckets.keys()) {
    if (buckets.size < MAX_RATE_LIMIT_ENTRIES) break
    buckets.delete(oldest)
  }
  buckets.set(id, { count: 1, resetAt: now + windowMs })
  return { allowed: true, retryAfterSeconds: 0 }
}

/** Nur für Tests: Anzahl gespeicherter Zähler. */
export function rateLimitEntryCount(): number {
  return buckets.size
}

export interface RateLimitOptions {
  /** Erlaubte Versuche je Zeitfenster. */
  max: number
  windowMs: number
  /** Statt der IP zählen, z. B. das Konto beim Login (`email.toLowerCase()`). Wird auf 128 Zeichen gekürzt. */
  key?: string
}

function bucketId(purpose: string, key: string) {
  return `${purpose}:${key.slice(0, MAX_KEY_LENGTH)}`
}

/**
 * Wirft 429 mit `Retry-After`, wenn `purpose` + IP (IPv6: /64) bzw. + `key` zu oft kam.
 * Login: einmal pro IP und einmal pro Konto aufrufen.
 */
export function rateLimit(event: RequestEvent, purpose: string, options: RateLimitOptions): void {
  const id = bucketId(purpose, options.key ?? rateLimitAddress(getClientIp(event)))
  const result = consumeRateLimit(id, options.max, options.windowMs)
  if (result.allowed) return
  event.res.headers.set('retry-after', String(result.retryAfterSeconds))
  throw createError({
    status: 429,
    statusText: 'Too Many Requests',
    message: 'Zu viele Anfragen. Bitte in einigen Minuten erneut versuchen.',
  })
}

/** Zähler löschen, z. B. nach erfolgreichem Login für das Konto. */
export function resetRateLimit(purpose: string, key: string): void {
  buckets.delete(bucketId(purpose, key))
}

// --- Öffentliche Formulare: Honeypot, Mindestzeit, Validierung ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Gefüllter Honeypot = Bot. Jeder Wert außer leer zählt. */
export function isHoneypotFilled(body: Record<string, unknown>): boolean {
  const value = body[HONEYPOT_FIELD]
  return value !== undefined && value !== null && value !== ''
}

/**
 * Liest ein öffentliches Formular (Kontakt, Newsletter, Buchung, Antrag …), nicht den Login.
 * `form` ist der Formularname, für den das Zeit-Token ausgestellt wurde (`useFormToken('contact')`).
 * Reihenfolge: Honeypot zuerst (gefüllt → `null`, der Handler meldet still Erfolg und tut nichts),
 * dann die signierte Mindestzeit, dann zod. Das Schema muss ein normales `z.object` sein
 * (unbekannte Felder wie `website` und `formToken` werden entfernt), kein `z.strictObject`.
 * Fehler je Feld stehen bei 400 in `error.data.fieldErrors`.
 */
export async function readForm<T extends z.ZodType>(event: RequestEvent, form: string, schema: T): Promise<z.infer<T> | null> {
  const body: unknown = await readBody(event)
  const fields = isRecord(body) ? body : {}
  if (isHoneypotFilled(fields)) return null

  await requireFormToken(form, fields[FORM_TOKEN_FIELD])

  const parsed = schema.safeParse(fields)
  if (!parsed.success) {
    throw createError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Bitte die markierten Eingaben prüfen.',
      data: z.flattenError(parsed.error),
    })
  }
  return parsed.data
}
