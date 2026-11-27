// Herkunft: _bausteine/chunk-reload/tests/browser/chunk-reload.mjs (Stand 25.11.2026)
// Browser-Test für den Baustein chunk-reload: headless Chrome über das DevTools-Protokoll, ohne Zusatzpaket.
// Voraussetzung: gebaute App (`npm run build` bzw. `npm run generate`). Aufruf:
//   node tests/browser/chunk-reload.mjs [Wurzel] [Startseite] [Zielseite]   (Standard: . / /kontakt)
// Port über TEST_PORT (sonst 3456), Chrome über CHROME_PATH. Mit .output/server startet der Node-Server (Modus B/C),
// sonst bzw. mit TEST_STATIC=1 ein kleiner statischer Server über .output/public (Modus A, nur vorgerenderte Seiten).
// Startseite: eine Seite ohne nachgeladene Komponenten (Lazy…), Zielseite: eine andere Seite (darf verlinkt sein).
// Geprüft wird:
// 1. Manifest-Update (neue Fassung auf dem Server): Der nächste Seitenwechsel ist ein vollständiger Seitenaufruf.
// 2. Deploy mit fehlendem Chunk: Alle Chunks, die das HTML der Startseite nicht nennt, werden umbenannt (wie ein Deploy
//    direkt nach dem Ausliefern der Seite; danach wieder zurück). Der Seitenwechsel lädt genau einmal neu; auf der
//    Zielseite fehlt der Chunk weiter, trotzdem keine Schleife.
// In beiden Fällen schreibt die Seite nichts in sessionStorage oder localStorage und setzt kein Cookie.
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createReadStream, existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? '.')
const fromPath = process.argv[3] ?? '/'
const toPath = process.argv[4] ?? '/kontakt'
const port = Number(process.env.TEST_PORT ?? 3456)
const base = `http://127.0.0.1:${port}`
const publicDir = join(root, '.output', 'public')
const chunkDir = join(publicDir, '_nuxt')
const serverEntry = join(root, '.output', 'server', 'index.mjs')
const useStaticServer = process.env.TEST_STATIC === '1' || !existsSync(serverEntry)
const chromePath = process.env.CHROME_PATH
  ?? (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'google-chrome')
const HIDDEN_SUFFIX = '.chunk-reload-test'
const LOOP_WAIT_MS = 6000
const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }

const sleep = ms => new Promise(done => setTimeout(done, ms))
const failures = []
let serverLog = ''

async function waitFor(check, timeoutMs, stepMs = 100) {
  for (let waited = 0; waited < timeoutMs; waited += stepMs) {
    if (await check()) return true
    await sleep(stepMs)
  }
  return false
}

// Modus A: liefert .output/public aus wie ein einfacher Webserver (Verzeichnis → index.html)
function startStaticServer() {
  const server = createServer((req, res) => {
    let file = normalize(join(publicDir, decodeURIComponent(new URL(req.url, base).pathname)))
    if (!file.startsWith(publicDir)) return res.writeHead(403).end()
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file)) return res.writeHead(404).end()
    res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
    createReadStream(file).pipe(res)
  })
  return new Promise(done => server.listen(port, '127.0.0.1', () => done(() => server.close())))
}

async function startNodeServer() {
  const server = spawn(process.execPath, [serverEntry], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NUXT_APP_SECRET: randomBytes(32).toString('base64url'), NUXT_PUBLIC_SITE_URL: base },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const collect = (chunk) => {
    serverLog += chunk
  }
  server.stdout.on('data', collect)
  server.stderr.on('data', collect)
  if (!await waitFor(() => serverLog.includes('Listening'), 10000)) throw new Error(`Server startet nicht:\n${serverLog}`)
  return () => server.kill()
}

async function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'chunk-reload-'))
  const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' })
  const portFile = join(profile, 'DevToolsActivePort')
  if (!await waitFor(() => existsSync(portFile) && readFileSync(portFile, 'utf8').includes('\n'), 15000)) throw new Error(`Chrome startet nicht (${chromePath}, CHROME_PATH setzen)`)
  const debugPort = readFileSync(portFile, 'utf8').split('\n')[0]
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()
  const socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
  await new Promise(done => socket.addEventListener('open', done))
  const stop = async () => {
    socket.close()
    chrome.kill()
    await sleep(500)
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
  return { socket, stop }
}

function devtools(socket) {
  let lastId = 0
  const pending = new Map()
  const events = { navigations: [], storageWrites: [] }
  socket.addEventListener('message', (message) => {
    const data = JSON.parse(message.data)
    if (pending.has(data.id)) {
      pending.get(data.id)(data.result)
      pending.delete(data.id)
    }
    if (data.method === 'Page.frameNavigated' && !data.params.frame.parentId) events.navigations.push(data.params.frame.url)
    if (data.method === 'DOMStorage.domStorageItemAdded' || data.method === 'DOMStorage.domStorageItemUpdated') events.storageWrites.push(data.params.key)
  })
  const send = (method, params = {}) => new Promise((done) => {
    pending.set(++lastId, done)
    socket.send(JSON.stringify({ id: lastId, method, params }))
  })
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))?.result?.value
  return { send, evaluate, events }
}

// Die Nuxt-App hängt am Wurzelelement (Vue setzt __vue_app__); fertig, sobald die Hydration abgeschlossen ist
const APP = 'document.querySelector("#__nuxt")?.__vue_app__?.config.globalProperties'
const STORAGE = 'JSON.stringify({ session: Object.keys(sessionStorage), local: Object.keys(localStorage), cookie: document.cookie })'

async function openStartPage(browser) {
  await browser.send('Page.navigate', { url: base + fromPath })
  if (!await waitFor(() => browser.evaluate(`${APP}?.$nuxt?.isHydrating === false`), 15000)) throw new Error(`${fromPath}: Nuxt-App startet nicht`)
}

function checkStorage(name, browser, storage) {
  const { session, local, cookie } = JSON.parse(storage)
  if (session.length + local.length > 0 || cookie !== '') failures.push(`${name}: Speicher nicht leer: ${storage}`)
  if (browser.events.storageWrites.length > 0) failures.push(`${name}: Schreibzugriffe auf Web-Storage: ${browser.events.storageWrites.join(', ')}`)
}

async function manifestUpdate(browser) {
  await openStartPage(browser)
  const before = browser.events.navigations.length
  await browser.evaluate(`${APP}.$nuxt.hooks.callHook('app:manifest:update', { id: 'chunk-reload-test', timestamp: Date.now() })`)
  await browser.evaluate(`void ${APP}.$router.push(${JSON.stringify(toPath)})`)
  await sleep(LOOP_WAIT_MS / 2)
  const loads = browser.events.navigations.slice(before)
  if (loads.length !== 1 || !loads[0].endsWith(toPath)) failures.push(`Manifest-Update: ${loads.length} Seitenaufrufe statt 1 (${loads.join(', ')})`)
  checkStorage('Manifest-Update', browser, await browser.evaluate(STORAGE))
  return loads
}

async function missingChunk(browser) {
  // Wie ein Deploy direkt nach dem Ausliefern der Startseite: Was ihr HTML nicht nennt, gibt es so nicht mehr.
  // Auch ein Vorab-Laden per NuxtLink scheitert dann, darum darf die Zielseite verlinkt sein.
  const html = await (await fetch(base + fromPath)).text()
  const referenced = new Set([...html.matchAll(/\/_nuxt\/([\w.-]+\.js)/g)].map(match => match[1]))
  const hidden = readdirSync(chunkDir).filter(name => name.endsWith('.js') && !referenced.has(name))
  if (hidden.length === 0) throw new Error('Kein Chunk zum Umbenennen gefunden')
  for (const name of hidden) renameSync(join(chunkDir, name), join(chunkDir, name + HIDDEN_SUFFIX))
  try {
    await openStartPage(browser)
    const before = browser.events.navigations.length
    await browser.evaluate(`void ${APP}.$router.push(${JSON.stringify(toPath)})`)
    await sleep(LOOP_WAIT_MS)
    const loads = browser.events.navigations.slice(before)
    if (loads.length === 0) failures.push(`Chunk fehlt: kein Neuladen nach dem Seitenwechsel`)
    else if (loads.length > 1) failures.push(`Chunk fehlt: ${loads.length} Seitenaufrufe statt 1 – Neulade-Schleife (${loads.join(', ')})`)
    else if (!loads[0].endsWith(toPath)) failures.push(`Chunk fehlt: neu geladen, aber nicht ${toPath} (${loads[0]})`)
    checkStorage('Chunk fehlt', browser, await browser.evaluate(STORAGE))
    return { hidden: hidden.length, loads }
  }
  finally {
    for (const name of hidden) renameSync(join(chunkDir, name + HIDDEN_SUFFIX), join(chunkDir, name))
  }
}

const stopServer = useStaticServer ? await startStaticServer() : await startNodeServer()
const chrome = await startChrome().catch((error) => {
  stopServer()
  throw error
})
try {
  const browser = devtools(chrome.socket)
  for (const domain of ['Page', 'Runtime', 'DOMStorage', 'Network']) await browser.send(`${domain}.enable`)
  await browser.send('Network.setCacheDisabled', { cacheDisabled: true })
  const manifest = await manifestUpdate(browser)
  console.log(`Manifest-Update: Seitenaufrufe nach dem Seitenwechsel: ${manifest.join(', ') || '(keine)'}`)
  const chunk = await missingChunk(browser)
  console.log(`Chunk fehlt (${chunk.hidden} Chunks umbenannt): Seitenaufrufe in ${LOOP_WAIT_MS / 1000} s: ${chunk.loads.join(', ') || '(keine)'}`)
}
finally {
  await chrome.stop()
  stopServer()
}

console.log(`Modus: ${useStaticServer ? 'statisch (.output/public)' : 'Node-Server'}, ${base}${fromPath} → ${toPath}`)
if (failures.length > 0) {
  console.error(`\nFEHLER (${failures.length}):\n${failures.join('\n')}`)
  if (serverLog) console.error(`\nServer-Log:\n${serverLog.slice(-2000)}`)
  process.exit(1)
}
console.log('\nChunk-Reload-Test bestanden: kein Web-Storage, genau ein Neuladen, keine Schleife.')
