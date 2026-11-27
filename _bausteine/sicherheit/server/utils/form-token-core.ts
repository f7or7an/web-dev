// Herkunft: _bausteine/sicherheit/server/utils/form-token-core.ts (Stand 21.11.2026)
// Kern des Zeit-Tokens ohne Nuxt- und Node-Abhängigkeit: nur Web Crypto. Dadurch auch nutzbar in
// Architekturen mit eigenem Request-Kern (z. B. Gora `server/core/`, auch im Cloudflare Worker).
// Das Geheimnis wird immer übergeben (injizierbar), nie hier gelesen.
import type { FormTokenProblem } from '../../shared/utils/form-protection'
import { FORM_NAME_PATTERN, FORM_TOKEN_MAX_AGE_MS, FORM_TOKEN_MIN_AGE_MS } from '../../shared/utils/form-protection'

const TOKEN_VERSION = 'v1'
// HMAC-SHA256 = 32 Byte = genau 43 Zeichen base64url ohne Auffüllung
const SIGNATURE_PATTERN = /^[\w-]{43}$/
const ISSUED_AT_PATTERN = /^\d{1,15}$/
const MAX_TOKEN_LENGTH = 100

export type FormTokenCheck = { ok: true } | { ok: false, problem: FormTokenProblem }

const encoder = new TextEncoder()

function importKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

// Der Formularname ist Teil der Signatur: Ein Token gilt nur für sein Formular.
function signedData(form: string, issuedAt: string) {
  return encoder.encode(`${TOKEN_VERSION}.${form}.${issuedAt}`)
}

function toBase64Url(bytes: ArrayBuffer) {
  let binary = ''
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Nur nach Prüfung auf SIGNATURE_PATTERN aufrufen: Dann kann atob nicht werfen. */
function fromBase64Url(text: string) {
  const binary = atob(`${text.replace(/-/g, '+').replace(/_/g, '/')}=`)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

/**
 * Eigener Schlüssel für Form-Tokens aus einem vorhandenen Hauptgeheimnis (HKDF-SHA256, Zweck als `info`).
 * Für Architekturen ohne `deriveSecret()` aus `nuxt/server`, z. B. Gora mit `GORA_HASH_SECRET`:
 * So wird dasselbe Geheimnis nie direkt für zwei Zwecke benutzt.
 */
export async function deriveFormTokenSecret(masterSecret: string, purpose = 'form-token'): Promise<string> {
  const master = await crypto.subtle.importKey('raw', encoder.encode(masterSecret), 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info: encoder.encode(purpose) },
    master,
    256,
  )
  return toBase64Url(bits)
}

export function isValidFormName(form: unknown): form is string {
  return typeof form === 'string' && FORM_NAME_PATTERN.test(form)
}

/** Token im Format `v1.<Ausstellungszeit in ms>.<HMAC-SHA256 base64url>`; der Formularname steckt in der Signatur. */
export async function createFormToken(secret: string, form: string, issuedAt: number): Promise<string> {
  if (!isValidFormName(form)) throw new TypeError(`Ungültiger Formularname: ${form}`)
  const signature = await crypto.subtle.sign('HMAC', await importKey(secret), signedData(form, String(issuedAt)))
  return `${TOKEN_VERSION}.${issuedAt}.${toBase64Url(signature)}`
}

/** Prüft ein Token ohne Nebenwirkung; wirft nie, jede Eingabe ergibt ein Ergebnis. */
export async function checkFormToken(secret: string, form: string, token: unknown, now: number): Promise<FormTokenCheck> {
  if (typeof token !== 'string' || token === '') return { ok: false, problem: 'missing' }
  if (token.length > MAX_TOKEN_LENGTH || !isValidFormName(form)) return { ok: false, problem: 'invalid' }

  const [version, issuedAtText, signatureText, ...rest] = token.split('.')
  if (version !== TOKEN_VERSION || rest.length > 0) return { ok: false, problem: 'invalid' }
  if (!issuedAtText || !ISSUED_AT_PATTERN.test(issuedAtText)) return { ok: false, problem: 'invalid' }
  if (!signatureText || !SIGNATURE_PATTERN.test(signatureText)) return { ok: false, problem: 'invalid' }

  // verify vergleicht in konstanter Zeit
  const isValid = await crypto.subtle.verify('HMAC', await importKey(secret), fromBase64Url(signatureText), signedData(form, issuedAtText))
  if (!isValid) return { ok: false, problem: 'invalid' }

  const age = now - Number(issuedAtText)
  if (age < FORM_TOKEN_MIN_AGE_MS) return { ok: false, problem: 'too-early' }
  if (age > FORM_TOKEN_MAX_AGE_MS) return { ok: false, problem: 'expired' }
  return { ok: true }
}
