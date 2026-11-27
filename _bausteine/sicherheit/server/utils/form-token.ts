// Herkunft: _bausteine/sicherheit/server/utils/form-token.ts (Stand 21.11.2026)
// Signierte Mindestzeit für öffentliche Formulare (Nuxt-Anbindung des Kerns in form-token-core.ts).
// Nicht am Login verwenden (WCAG 3.3.8, Passwortmanager).
//
// Schlüssel: standardmäßig per deriveSecret() aus NUXT_APP_SECRET (HKDF-SHA256, eigener Zweck).
// Eigenes Geheimnis statt dessen: runtimeConfig.nuxtBase.formTokenSecret (NUXT_NUXT_BASE_FORM_TOKEN_SECRET, ≥ 32 Zeichen).
import { createError, deriveSecret, useRuntimeConfig } from 'nuxt/server'
import type { FormTokenProblem } from '../../shared/utils/form-protection'
import { checkFormToken, createFormToken, isValidFormName } from './form-token-core'

const SECRET_PURPOSE = 'nuxt-base:form-token'
const MIN_SECRET_LENGTH = 32

const MESSAGES: Record<FormTokenProblem, string> = {
  'missing': 'Das Formular konnte nicht geprüft werden. Bitte noch einmal senden, Ihre Eingaben bleiben erhalten.',
  'invalid': 'Das Formular konnte nicht geprüft werden. Bitte noch einmal senden, Ihre Eingaben bleiben erhalten.',
  'too-early': 'Das Formular wurde sehr schnell abgeschickt. Bitte einen Moment warten und erneut senden.',
  'expired': 'Das Formular war zu lange geöffnet. Bitte erneut senden, die Eingaben bleiben erhalten.',
}

function configuredSecret(): string | undefined {
  // nuxtBase ist nur im Layer deklariert; in kopierten Projekten optional
  const config = useRuntimeConfig() as { nuxtBase?: { formTokenSecret?: unknown } }
  const secret = config.nuxtBase?.formTokenSecret
  return typeof secret === 'string' && secret !== '' ? secret : undefined
}

/**
 * Prüft ohne Anfrage, ob ein brauchbares Geheimnis konfiguriert ist (für die Startprüfung).
 * Gibt eine Beschreibung des Problems zurück oder null.
 */
export function formTokenSecretProblem(): string | null {
  const own = configuredSecret()
  if (own !== undefined) return own.length >= MIN_SECRET_LENGTH ? null : `NUXT_NUXT_BASE_FORM_TOKEN_SECRET ist kürzer als ${MIN_SECRET_LENGTH} Zeichen.`
  const appSecret = useRuntimeConfig().appSecret
  return typeof appSecret === 'string' && appSecret.length >= MIN_SECRET_LENGTH
    ? null
    : `NUXT_APP_SECRET fehlt oder ist kürzer als ${MIN_SECRET_LENGTH} Zeichen (Schlüssel für die Formular-Mindestzeit).`
}

// Kein Zwischenspeichern: deriveSecret (HKDF) kostet Mikrosekunden, und eine korrigierte Konfiguration wirkt sofort.
async function formTokenSecret(): Promise<string> {
  try {
    const problem = formTokenSecretProblem()
    if (problem) throw new Error(problem)
    return configuredSecret() ?? await deriveSecret(SECRET_PURPOSE)
  }
  catch (error) {
    // Details nur ins Log, nie an den Browser
    console.error(JSON.stringify({ level: 'error', scope: 'form-token', message: error instanceof Error ? error.message : String(error) }))
    throw createError({
      status: 503,
      statusText: 'Service Unavailable',
      message: 'Das Formular ist gerade nicht verfügbar. Bitte später erneut versuchen oder per E-Mail schreiben.',
    })
  }
}

function requireFormName(form: string) {
  if (isValidFormName(form)) return
  throw createError({ status: 400, statusText: 'Bad Request', message: 'Unbekanntes Formular.' })
}

export async function issueFormToken(form: string): Promise<string> {
  requireFormName(form)
  return createFormToken(await formTokenSecret(), form, Date.now())
}

/** Wirft 400 mit `data.formToken = <Grund>`, wenn das Token fehlt, falsch, für ein anderes Formular, zu jung oder abgelaufen ist. */
export async function requireFormToken(form: string, token: unknown): Promise<void> {
  requireFormName(form)
  const result = await checkFormToken(await formTokenSecret(), form, token, Date.now())
  if (result.ok) return
  throw createError({
    status: 400,
    statusText: 'Bad Request',
    message: MESSAGES[result.problem],
    data: { formToken: result.problem },
  })
}
