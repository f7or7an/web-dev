---
paths:
  - "**/*Form*.vue"
  - "**/*Booking*"
  - "**/*Registration*"
  - "**/*[Mm]ailing*"
  - "**/*[Ll]ogin*"
  - "**/*[Nn]ewsletter*"
  - "**/rabatt*"
  - "**/server/api/**"
  - "**/shared/**"
  - "**/*[Pp]laceholder*"
  - "**/*[Cc]olor[Mm]ode*"
  - "**/*[Cc]olor[Ss]cheme*"
  - "**/*[Tt]heme*"
  - "**/*[Pp]references*"
  - "**/*[Ss]torage*"
  - "**/datenschutz*"
  - "**/impressum*"
  - "**/cookies*"
  - "**/agb*"
  - "**/legal*"
  - "**/legal/**"
  - "**/privacy*"
---

# Formulare, Datenschutz und Rechtsseiten

Stand: 21.11.2026, ergänzt 24. und 25.11.2026. Keine Rechtsberatung: Grenzfälle an Florian geben, nicht selbst entscheiden.
Nicht hier: Barrierefreiheit von Formularen (Labels, Fehlermeldungen, `autocomplete`, Fokus: `barrierefreiheit.md`), Server-Technik für Rate-Limit, Honeypot, Login, Verschlüsselung und Löschfristen (`server-und-sicherheit.md`), Seite `/barrierefreiheit` (`barrierefreiheit.md`), Zugriffslog-Einstellungen (`SERVER.md`).
„Layer“ meint `@f7or7an/nuxt-base`, sobald veröffentlicht; bis dahin die genannte Projektvorlage bzw. `_bausteine/`. Begründete Abweichungen eines Projekts stehen in der Tabelle „Abweichungen“ seiner `CLAUDE.md` (Regel, Abweichung, Grund, von Florian bestätigt am).

## Formulare allgemein

- Jedes Formular läuft über eine eigene Nitro-Route (Modus B). Kein PHP, kein fremder Formular-Dienst (Grundsätze 1 und 2).
- Ein zod-Schema in `shared/` für Browser und Server, mit `.max()` an jedem Feld.
- Nur Felder abfragen, die für den Zweck nötig sind (Datenminimierung, Art. 5 Abs. 1 lit. c DSGVO). Bereits eingegebene Daten im selben Ablauf nicht erneut abfragen.
- Beim Absende-Button kurz sagen, wofür die Daten genutzt werden, mit Link zur Datenschutzerklärung.

## Schutz vor Spam

**Kontakt-, Newsletter-, Feedback-, Buchungs-, Anmelde-/Registrierungs- und Antragsformulare** haben alle drei Schutzschichten (Technik und Vorlage: `server-und-sicherheit.md`, Abschnitt Formularschutz):
1. **Honeypot-Feld `website`:** für Menschen unsichtbar, für Bots ein normales Feld. Ist es gefüllt, meldet der Server Erfolg und verwirft die Daten still. Markup wie in Vogelperspektive `app/components/ContactForm.vue`: `<input v-model="form.website" type="text" name="website" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true">`.
2. **Signierte Mindestzeit (Baustein `_bausteine/sicherheit/`, `useFormToken`):** Token beim Laden des Formulars, Absenden frühestens nach 3 s und vor Ablauf des Tokens. Läuft das Token ab, bekommt die Person eine verständliche Meldung und kann ohne Datenverlust erneut senden.
3. **Rate-Limit** pro IP und Zweck.

- **Login ist ausgenommen** von Honeypot und Mindestzeit: Passwortmanager füllen und senden automatisch ab (WCAG 3.3.8). Der Login schützt sich per Rate-Limit pro IP und pro Konto (`server-und-sicherheit.md`).
- Kein CAPTCHA mit Rätsel (Barriere, oft fremder Dienst). Erst wenn trotz der drei Schichten echter Spam ankommt: **ALTCHA** (Proof-of-Work ohne Rätsel), nur selbst gehostet über eine eigene Nitro-Route, eingetragen in der Tabelle „Abweichungen“ der Projekt-`CLAUDE.md`.

## Kontakt

- E-Mail-Adresse sichtbar als `mailto:`-Link **und** Kontaktformular. Grund: Manche Menschen können oder wollen kein Formular nutzen.
- Keine Verschleierung der Adresse per JavaScript (schlecht für Screenreader und ohne JS unsichtbar).
- Kontaktdaten zentral in `app/data/` bzw. i18n-Dateien, nicht verstreut.

## Newsletter

Vorlage: Vogelperspektive (`server/utils/newsletter.ts`, `server/api/newsletter/`).
- **Double-Opt-in Pflicht:** Nach der Anmeldung geht eine Bestätigungsmail raus, erst der Klick trägt die Adresse ein.
- Der Bestätigungslink läuft nach **48 Stunden** ab. Unbestätigte Einträge werden nach **30 Tagen** gelöscht (Aufräum-Plugin).
- Zeitpunkte von Anmeldung und Bestätigung speichern: Sie sind der Nachweis der Einwilligung.
- In jeder Newsletter-Mail ein Abmeldelink, dazu die Header `List-Unsubscribe` (Link mit persönlichem Token) und `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058, Gmail und andere erwarten das). Die Ein-Klick-Route ist eine kommentierte Ausnahme vom CSRF-Origin-Check (`server-und-sicherheit.md`).
- Seiten mit persönlichem Token (`/newsletter/**`): `noindex`, `no-store`, `referrer-policy: no-referrer` (Muster Vogelperspektive `nuxt.config.ts`).

## Speicherung im Browser: „Nur Sitzung“ (Grundsatz 3)

Entscheidung vom 21.11.2026: **Kein Tracking, keine Cookies und kein Web-Storage (`localStorage`, `sessionStorage`, IndexedDB) außer technisch nötigen.** Dadurch braucht keine Seite einen Cookie-Banner.

**Websites** – ohne Einwilligung erlaubt sind nur:
- das **Login-Sitzungscookie** (`nuxt-auth-session`, HttpOnly), wo es einen Login gibt;
- der **Farbmodus** als nicht identifizierender Einzelwert (z. B. `dark`), **nur nach aktiver Wahl** und **nur für die Sitzung** in `sessionStorage` (Umsetzung unten).

**Apps mit Login** (Beschluss 21.11.2026):
- Einstellungen eingeloggter Nutzer liegen im **Benutzerkonto in der DB**, nicht im Browser.
- Im Browser nur, was die vom Nutzer gewünschte Funktion in der laufenden Sitzung zwingend braucht (z. B. eine Gast-ID für die Teilnahme an einer Sitzung im Praxisraum), und dann in `sessionStorage`.
- Jeder solche Eintrag steht in der Datenschutzerklärung (Name, Inhalt, Zweck, Dauer).

**Für alle gilt:**
- Ohne Wahl nur `prefers-color-scheme` auswerten und nichts speichern. Keine Client-Hints (`Sec-CH-Prefers-Color-Scheme`) anfordern.
- **Sprache nur über die URL** (i18n `strategy: 'prefix_except_default'`, `detectBrowserLanguage: false`, dadurch kein `i18n_redirected`-Cookie).
- Keine IDs (außer wie oben in Apps), keine Zeitstempel, kein Fingerprinting, kein Zugriff Dritter.
- Alles andere (z. B. Formular-Entwürfe, „Hinweis gesehen“) nicht im Browser speichern. Wenn es wirklich nötig scheint: Florian fragen.
- **Chunk-Reload ohne Speicher (Pflicht in allen Projekten, auch Modus A):** Nuxt schreibt bei Chunk-Ladefehlern nach einem Deploy `nuxt:reload` und `nuxt:reload:state` (den ganzen Payload-State) in den `sessionStorage`. Deshalb `experimental.emitRouteChunkError: 'manual'` und das Plugin aus `_bausteine/chunk-reload/` (im Layer enthalten), geprüft mit dessen Browser-Test `test:chunk-reload`. Für Bots schreibt Nuxt während der Hydration weiter `nuxt:reload` (nur Pfad und Ablaufzeit); das ist hingenommen und wird nicht in der DSE genannt (Entscheidung Florian 27.11.2026). Ob auch das abgestellt werden soll, steht in der README des Bausteins.

Quellen: DSK-Orientierungshilfe Digitale Dienste v1.2 Rn. 21, 74/76, 79–81, 95; WP194 Abschn. 3.6; EDPB Guidelines 2/2023 Rn. 43–44. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG (Bulgarien: чл. 4а Abs. 4 Nr. 2 ЗЕТ).

### Farbmodus: eigener Umschalter statt `@nuxtjs/color-mode`

`@nuxtjs/color-mode` (4.1.0) schreibt bei jedem Seitenaufruf `nuxt-color-mode=system` in den Speicher (`plugin.client.js`, `setPreferenceToStorage` in `onIdleAfterHydration`), auch ohne Wahl. Das widerspricht Grundsatz 3. Deshalb: Modul entfernen (`npm uninstall @nuxtjs/color-mode`, Eintrag in `modules` und `colorMode` in der `nuxt.config.ts` löschen; heute FlowTech) und den eigenen Umschalter aus `_bausteine/farbmodus/` nutzen (Composable `useColorScheme()`, `SiteColorSchemeToggle`; im Layer, sobald veröffentlicht). Nur in Projekten, deren Design einen Dunkelmodus vorsieht.

Verhalten:
1. **Drei Zustände:** `system` (Standard, nichts gespeichert), `light`, `dark`. Dunkel heißt: Klasse `dark` am `<html>` (passt zu Tailwind und shadcn-vue).
2. **Inline-Skript gegen Aufblitzen:** ein kurzes Skript im `<head>` (z. B. über `app.head.script` in der `nuxt.config.ts`), das vor dem ersten Zeichnen läuft. Es liest in `try/catch` `sessionStorage.getItem('color-scheme')`. Bei `light`/`dark` gilt dieser Wert, sonst `matchMedia('(prefers-color-scheme: dark)').matches`. Dann setzt oder entfernt es `dark` an `document.documentElement`. Es schreibt nichts.
3. **Server:** Der Server kennt die Wahl nicht und rendert ohne `dark`. Den Zustand des Umschalters (Beschriftung, `aria-pressed`) erst im Browser setzen (`onMounted` bzw. `<ClientOnly>`), sonst gibt es Hydration-Fehler.
4. **Ohne Wahl** folgt die Seite live dem System (`matchMedia(…).addEventListener('change', …)`).
5. **Erst ein Klick** auf `light` oder `dark` schreibt genau einen Eintrag `color-scheme` in `sessionStorage`. Die Wahl `system` löscht ihn wieder. Der Browser löscht ihn beim Schließen.
6. **CSP:** Das Inline-Skript braucht auf vorgerenderten Seiten den sha256-Hash, bei SSR die Nonce. `nuxt-security` ergänzt beides für Skripte, die Nuxt selbst in den `<head>` schreibt (`server-und-sicherheit.md`, Abschnitt CSP). Den Skripttext nicht pro Seite verändern. Nach jeder Änderung die Konsole auf CSP-Verstöße prüfen.
7. Bedienung als echte `<button>`-Elemente mit sichtbarem Namen in der Seitensprache (`barrierefreiheit.md`).

**Prüfen** (Seite frisch laden, ohne Klick): Cookies, `localStorage` und `sessionStorage` sind leer (`browser_clear_site_data`, dann `browser_storage`). Kein Aufblitzen bei Systemeinstellung dunkel. Erst nach Klick steht genau ein Wert im `sessionStorage`.

### Satz für die Datenschutzerklärung

In jedes Projekt mit Farbmodus-Umschalter, wörtlich (übersetzt in die anderen Sprachen):

> Wenn Sie den Farbmodus selbst wählen, speichern wir nur diese Einstellung (z. B. „dark“) im Sitzungsspeicher Ihres Browsers; er wird beim Schließen gelöscht, enthält keine Kennung und wird nicht übertragen. Rechtsgrundlage § 25 Abs. 2 Nr. 2 TDDDG (BG: чл. 4а Abs. 4 Nr. 2 ЗЕТ).

## Datenschutzerklärung

Jede Speicherung und jede Verarbeitung steht in der Datenschutzerklärung, mit Zweck, Rechtsgrundlage und Frist. Mindestens:
- **Hosting:** Anbieter des Servers, Auftragsverarbeitungsvertrag (AVV, `SERVER.md`). Keine weiteren Empfänger, kein Tracking, keine fremden Dienste.
- **Zugriffslogs (Caddy):** aus, oder nur mit gekürzter IP und Löschung nach höchstens 7 Tagen (Einstellung: `SERVER.md`). Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO (IT-Sicherheit), Zweck und Frist nennen. Es gibt keine gesetzliche Höchstdauer; die 7 Tage stammen aus der TK-Praxis (BGH III ZR 146/10, BfDI-Leitfaden) und gelten als sicher bis vertretbar.
- **App-Logs:** enthalten keine Personendaten (`server-und-sicherheit.md`); Aufbewahrung begrenzt (Docker: 10 MB × 3 Dateien) und genannt.
- **Fehler-Tracking**, falls eingesetzt (optional Bugsink, ohne Personendaten, `SERVER.md`).
- **Jedes Formular:** welche Daten, wofür, wer sie liest, wann sie gelöscht werden. Mailversand über das eigene Postfach (Anbieter nennen).
- **Newsletter:** Double-Opt-in, gespeicherte Nachweise, Abmeldung, Löschfristen.
- **Login:** Sitzungscookie, Zweck, Laufzeit. In Apps zusätzlich jeder `sessionStorage`-Eintrag.
- **Farbmodus:** Satz oben.
- **Sensible Daten** (z. B. Gesundheitsangaben): Verschlüsselung und Löschfristen (Technik: `server-und-sicherheit.md`). Die Fristen kommen aus denselben Konstanten in `shared/`, die das Aufräum-Plugin nutzt, damit Text und Wirklichkeit übereinstimmen.

Staging enthält nie echte Personendaten, nur anonymisierte (`SERVER.md`).

## Impressum und Platzhalter (Grundsatz 5)

- Impressum, Datenschutzerklärung und (im Anwendungsbereich des BFSG) `/barrierefreiheit` sind vor jedem Livegang vollständig. Im Footer jeder Seite verlinkt.
- **Fehlende Inhalte nie erfinden** (keine ausgedachten Adressen, Registernummern, Preise), sondern sichtbar als Platzhalter markieren.
- **Muster `PlaceholderNote`** (`Ortrud/app/components/site/PlaceholderNote.vue`; kommt in den Layer, sobald veröffentlicht):
  - `<aside role="note">` mit gestricheltem Rahmen, Icon mit `aria-hidden="true"`, Titel (Standard „Inhalt fehlt noch“) und Slot für die Erklärung, was fehlt.
  - Sichtbar nur, wenn `runtimeConfig.public.showPlaceholders` wahr ist (`NUXT_PUBLIC_SHOW_PLACEHOLDERS`). Schalter in der `nuxt.config.ts`, Muster `Ortrud/nuxt.config.ts`.
  - Vorgerenderte Seiten lesen den Wert **beim Build**: Für den Livegang `NUXT_PUBLIC_SHOW_PLACEHOLDERS=false` beim Build setzen, nicht erst im Container.
- Platzhalter immer als `PlaceholderNote`, nie als Text in eckigen Klammern im Fließtext: Den blendet der Schalter nicht aus und die Suche findet ihn nicht.
- **Vor dem Livegang:** Schalter aus, dann alle Vorkommen von `PlaceholderNote` suchen, dazu in i18n-JSON und `app/data/` nach `\[[^\]]*(fehlt|TODO|einfügen|Platzhalter)`, und klären, ob der Inhalt fehlt. Eine Startprüfung kann warnen, wenn in Produktion Platzhalter an sind (Muster Praxisraum `startup-check.ts`).
