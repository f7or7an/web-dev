// Herkunft: _bausteine/sicherheit/tests/build/error-log.mjs (Stand 24.11.2026)
// Build-Test für den Fehlerlog (Baustein request-error-log). Voraussetzung: beide Test-Builds aus
// error-log-test-env.ts, siehe Skript `test:build` in der package.json. Aufruf: node tests/build/error-log.mjs [Wurzel]
// Startet beide gebauten Server nacheinander, schickt dieselben Anfragen und prüft:
// - Antworten gleich wie ohne den Baustein (Status, Text, Typ, Inhalt; HTML-Fehlerseite inkl. fatal)
// - im Log je Serverfehler genau eine JSON-Zeile, kein `[request error]`, kein Stacktrace, keine Tokens/Geheimnisse
// Weitere Pflicht-Variablen der eigenen Startprüfung (z. B. SMTP, NUXT_DATA_KEY) im CI-Schritt setzen.
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { join, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? '.')
const port = process.env.TEST_PORT ?? '3456'
const base = `http://127.0.0.1:${port}`
const OUTPUT_DIRS = { test: '.output-error-log-test', baseline: '.output-error-log-baseline' }
const SECRETS = ['geheim', 'example.org', 'Fatal-Meldung', 'Diese Seite gibt es nicht']
const LONG_TOKEN = 'Abc123_def-456GHI789jkl'
const json = { accept: 'application/json' }
const html = { accept: 'text/html' }

// [Name, Pfad, Header, Tokens im Pfad, erwartete JSON-Logzeilen]
const REQUESTS = [
  ['unbehandelt (JSON)', '/__test/error-log/unhandled', json, [], 1],
  ['Token lang + Query', `/__test/error-log/token/${LONG_TOKEN}?mail=person@example.org`, json, [LONG_TOKEN], 1],
  ['Token mit Punkt', '/__test/error-log/token/v1.1800000000000.abcDEF', json, ['v1.1800000000000.abcDEF'], 1],
  ['Token Base64 mit =', '/__test/error-log/token/YWJjZGVmZ2hpams=', json, ['YWJjZGVmZ2hpams='], 1],
  ['Token kurz', '/__test/error-log/token/a1b2c3', json, ['a1b2c3'], 1],
  ['fatal 422 (JSON)', '/__test/error-log/fatal', json, [], 1],
  ['fatal 422 (HTML)', '/__test/error-log/fatal', html, [], 1],
  ['503 mit data', '/__test/error-log/503', json, [], 1],
  ['400 mit data', '/__test/error-log/400', json, [], 0],
  ['Seite fatal 404 (HTML)', `/__test/error-log-page/${LONG_TOKEN}`, html, [LONG_TOKEN], 1],
  ['Seite unbehandelt (HTML)', '/__test/error-log-page/boom', html, [], 1],
]

const sleep = ms => new Promise(done => setTimeout(done, ms))

// Ganze Antwort ohne Werte, die sich je Anfrage (url, CSP-Nonce) oder je Build (buildId) ändern
function normalize(contentType, text) {
  if (contentType?.includes('application/json')) {
    const body = JSON.parse(text)
    delete body.url
    return JSON.stringify(body)
  }
  return text.replace(/ nonce="[^"]*"/g, '').replace(/buildId:"[^"]*"/g, 'buildId:""')
}

async function runServer(outputDir) {
  let log = ''
  const server = spawn(process.execPath, [join(root, outputDir, 'server', 'index.mjs')], {
    env: { ...process.env, PORT: port, HOST: '127.0.0.1', NUXT_APP_SECRET: randomBytes(32).toString('base64url'), NUXT_PUBLIC_SITE_URL: base },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const collect = (chunk) => {
    log += chunk
  }
  server.stdout.on('data', collect)
  server.stderr.on('data', collect)
  const results = []
  try {
    for (let attempt = 0; attempt < 100 && !log.includes('Listening'); attempt++) await sleep(100)
    if (!log.includes('Listening')) throw new Error(`Server ${outputDir} startet nicht:\n${log}`)
    for (const [name, path, headers] of REQUESTS) {
      const before = log.length
      const response = await fetch(base + path, { headers, redirect: 'manual' })
      const contentType = response.headers.get('content-type')
      const body = normalize(contentType, await response.text())
      await sleep(150)
      results.push({ name, response: { status: response.status, statusText: response.statusText, contentType, body }, log: log.slice(before) })
    }
  }
  finally {
    server.kill()
    await sleep(300)
  }
  return results
}

const baseline = await runServer(OUTPUT_DIRS.baseline)
const tested = await runServer(OUTPUT_DIRS.test)
const failures = []

REQUESTS.forEach(([name, , , tokens, expectedLines], index) => {
  const before = baseline[index]
  const after = tested[index]
  if (JSON.stringify(before.response) !== JSON.stringify(after.response)) {
    failures.push(`${name}: Antwort anders als ohne Baustein\n  ohne: ${JSON.stringify(before.response).slice(0, 400)}\n  mit:  ${JSON.stringify(after.response).slice(0, 400)}`)
  }
  const lines = after.log.split('\n').filter(Boolean)
  const jsonLines = lines.filter(line => line.includes('"scope":"request"'))
  if (jsonLines.length !== expectedLines) failures.push(`${name}: ${jsonLines.length} JSON-Zeilen statt ${expectedLines}`)
  if (after.log.includes('[request error]')) failures.push(`${name}: Nitros [request error]-Zeile im Log`)
  if (lines.some(line => /^\s+at /.test(line))) failures.push(`${name}: Stacktrace-Zeilen im Log`)
  for (const secret of [...SECRETS, ...tokens]) {
    if (after.log.includes(secret)) failures.push(`${name}: „${secret}“ steht im Log`)
  }
})

// Gegenprobe: Ohne Baustein muss Nitro für unbehandelte Fehler loggen, sonst prüft der Test nichts mehr
if (!baseline[0].log.includes('[request error]')) failures.push('Gegenprobe: Der Vergleichsbuild loggt kein [request error] mehr – Nitro hat sich geändert, Baustein prüfen')

for (const [index, [name]] of REQUESTS.entries()) {
  console.log(`${name}: ${tested[index].response.status}, Log: ${tested[index].log.trim().split('\n').filter(Boolean).join(' | ').slice(0, 200) || '(leer)'}`)
}
if (failures.length > 0) {
  console.error(`\nFEHLER (${failures.length}):\n${failures.join('\n')}`)
  process.exit(1)
}
console.log('\nFehlerlog-Build-Test bestanden.')
