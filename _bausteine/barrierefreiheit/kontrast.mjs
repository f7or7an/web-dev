#!/usr/bin/env node
// Kontrastrechner nach WCAG 2.x – Quelle: WebSites/_bausteine/barrierefreiheit/kontrast.mjs
//
// Aufruf:  node kontrast.mjs <vordergrund> <hintergrund> [<hintergrund-darunter>]
// Farben:  #rgb, #rrggbb, oklch(L C H), oklch(L% C H / A), white, black
//          Deckkraft am Vordergrund mit /A (0–1 oder %), z. B. "oklch(0.55 0.2 260 / 50%)"
// Beispiel: node kontrast.mjs "oklch(0.55 0.2 260 / 50%)" "#ffffff"
//
// Schwellen: Text 4,5:1 · großer Text 3:1 · Fokusring, Feldrahmen, Icons 3:1

const NAMED = { white: '#ffffff', black: '#000000' }

function parse(input) {
  const value = (NAMED[input.trim().toLowerCase()] ?? input).trim()
  if (value.startsWith('#')) return parseHex(value)
  const oklch = value.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?))?\s*\)$/i)
  if (oklch) return parseOklch(oklch)
  throw new Error(`Unbekanntes Farbformat: ${input}`)
}

function parseHex(hex) {
  let h = hex.slice(1)
  if (h.length === 3) h = [...h].map(c => c + c).join('')
  if (h.length !== 6) throw new Error(`Ungültiger Hex-Wert: ${hex}`)
  const [r, g, b] = [0, 2, 4].map(i => Number.parseInt(h.slice(i, i + 2), 16) / 255)
  return { rgb: [r, g, b], alpha: 1 }
}

const toFraction = v => (v.endsWith('%') ? Number.parseFloat(v) / 100 : Number.parseFloat(v))

function parseOklch([, l, c, h, a]) {
  const L = toFraction(l)
  const C = Number.parseFloat(c)
  const hue = (Number.parseFloat(h) * Math.PI) / 180
  const A = C * Math.cos(hue)
  const B = C * Math.sin(hue)
  const l_ = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m_ = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s_ = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
  ]
  return { rgb: linear.map(v => encode(Math.min(1, Math.max(0, v)))), alpha: a ? toFraction(a) : 1 }
}

// sRGB-Kodierung (Browser mischen Deckkraft im kodierten Raum)
const encode = v => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
const decode = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

function over(top, bottom) {
  return { rgb: top.rgb.map((v, i) => v * top.alpha + bottom.rgb[i] * (1 - top.alpha)), alpha: 1 }
}

function luminance({ rgb }) {
  const [r, g, b] = rgb.map(decode)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const [fgArg, bgArg, baseArg] = process.argv.slice(2)
if (!fgArg || !bgArg) {
  console.error('Aufruf: node kontrast.mjs <vordergrund> <hintergrund> [<hintergrund-darunter>]')
  process.exit(1)
}

let background = parse(bgArg)
if (background.alpha < 1) background = over(background, parse(baseArg ?? '#ffffff'))
const foreground = over(parse(fgArg), background)
const r = ratio(foreground, background)
const hex = ({ rgb }) => `#${rgb.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`

console.log(`${r.toFixed(2)} : 1   (${hex(foreground)} auf ${hex(background)})`)
console.log(`Text ${r >= 4.5 ? 'ok' : 'NEIN'} · großer Text ${r >= 3 ? 'ok' : 'NEIN'} · Rahmen/Fokus/Icons ${r >= 3 ? 'ok' : 'NEIN'}`)
