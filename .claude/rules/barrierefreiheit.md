---
paths:
  - "**/*.vue"
  - "**/assets/css/**"
  - "**/barrierefreiheit*"
  - "**/accessibility*"
  - "**/_bausteine/barrierefreiheit/**"
---

# Barrierefreiheit (EU-Recht und WCAG 2.2 AA)

Stand: 21.11.2026, ergänzt 24.11.2026. Ergänzt Grundsatz 6 in `WebSites/CLAUDE.md`. Verweise auf `*.md` ohne Pfad meinen `WebSites/.claude/rules/`. Jedes Projekt erfüllt **WCAG 2.2 Stufe AA**, egal ob das Gesetz es im Einzelfall verlangt. Barrierefreiheit wird beim Bauen berücksichtigt, nicht am Ende nachgerüstet.

## Rechtsrahmen

| Regelung | Für wen | Was folgt daraus |
|---|---|---|
| **European Accessibility Act** (Richtlinie (EU) 2019/882), in Deutschland umgesetzt durch das **BFSG** und die **BFSGV**, gilt seit 28.06.2025 | Unternehmen, die Verbrauchern online eine Dienstleistung anbieten, die zu einem Vertrag führt (Buchung, Bezahlung, Shop, Anmeldung zu kostenpflichtigen Angeboten, Kundenkonto) | Website bzw. App muss barrierefrei sein. Dazu eine **Erklärung zur Barrierefreiheit** (Informationen nach Anlage 3 BFSG). Bußgeld bis 100.000 €, dazu Abmahnungen durch Mitbewerber und Verbände. |
| Ausnahme **Kleinstunternehmen** | Dienstleister mit weniger als 10 Beschäftigten **und** höchstens 2 Mio. € Jahresumsatz oder Bilanzsumme | Gesetzlich befreit. Für uns **keine** Ausnahme von der Umsetzung: Kunden wachsen, Abmahnrisiko und Nutzer bleiben. |
| **Bulgarien:** Закон за изискванията за достъпност на продукти и услуги (Gesetz über die Barrierefreiheitsanforderungen an Produkte und Dienstleistungen), Държавен вестник бр. 31 vom 11.04.2025, gilt seit 28.06.2025 | wie in Deutschland (Gora, bulgarische Fassung von FlowTech) | Gleiche Anforderungen, da EU-weit dieselbe Richtlinie. Die Ausnahme für Kleinstunternehmen gibt die Richtlinie allen Ländern vor. Welche Behörde Dienstleistungen kontrolliert, vor dem Gora-Livegang klären und auf der Seite `/barrierefreiheit` nennen. |
| Andere EU-Länder | jedes Land hat den EAA eigens umgesetzt | Wer WCAG 2.2 AA einhält, erfüllt die gemeinsame technische Grundlage. Bei weiteren Zielmärkten die nationale Umsetzung vor dem Livegang prüfen. |
| **Web-Accessibility-Richtlinie** (EU) 2016/2102, in Deutschland BITV 2.0 | nur öffentliche Stellen (Behörden, öffentlich finanzierte Einrichtungen) | Falls ein Kunde öffentlich ist: zusätzlich Erklärung zur Barrierefreiheit mit **Feedback-Mechanismus** und Verweis auf die Schlichtungsstelle. |

Technische Grundlage ist die Norm **EN 301 549** (Stand 18.11.2026):
- **V3.2.1** ist die geltende Fassung und beruht auf **WCAG 2.1 AA**.
- **V4.1.1** wurde am 02.09.2026 veröffentlicht und beruht auf **WCAG 2.2**. Sie wird erst verbindlich, wenn die EU-Kommission sie im Amtsblatt nennt. Erwartet ist das Ende 2026; vorher auf EUR-Lex prüfen.

Wir setzen deshalb schon jetzt immer **WCAG 2.2 AA** um. Das erfüllt beide Fassungen, und beim Wechsel muss nichts nachgebaut werden.

Wer einordnet, ob ein Projekt unter das BFSG fällt, schreibt das Ergebnis mit Begründung in die README. Rechtsfragen im Grenzfall an Florian geben, nicht selbst entscheiden.

| Projekt | Einordnung (Stand 18.11.2026, nicht rechtsverbindlich) |
|---|---|
| Vogelperspektive | Online-Buchung kostenpflichtiger Sitzungen für Verbraucher → im Anwendungsbereich. Ob die Kleinstunternehmen-Ausnahme greift, mit Jara klären. Erklärung zur Barrierefreiheit trotzdem veröffentlichen. |
| Vogelperspektive-Praxisraum | Online-Dienstleistung für Verbraucher → im Anwendungsbereich, wie oben. Video braucht eine Text-Alternative (Chat), das 3D-Systembrett eine Bedienung ohne Ziehen. |
| Gora | Anmeldung zu Veranstaltungen: Sobald etwas kostet oder ein Vertrag zustande kommt → im Anwendungsbereich (bulgarisches Recht). |
| FlowTech | richtet sich an Unternehmen (B2B), kein Vertragsabschluss online → nicht im Anwendungsbereich. Trotzdem WCAG 2.2 AA. |
| Ortrud | nur Kontaktformular, kein Vertragsabschluss online → nicht im Anwendungsbereich. Trotzdem WCAG 2.2 AA. |

## Gemeinsame Bausteine

`_bausteine/barrierefreiheit/` enthält die gemeinsame Umsetzung: `SiteSkipLink.vue`, `a11y.css` (Scroll-Abstand für den Sticky-Header, Fokus-Grundstil, reduzierte Bewegung), `kontrast.mjs` (Kontrastrechner für hex und oklch) und `erklaerung-vorlage.md`. Jedes neue Projekt übernimmt sie nach der Checkliste in der dortigen README. Änderungen nur dort pflegen und dann in alle Projekte kopieren.

- SiteSkipLink und `a11y.css` wandern in den gemeinsamen Nuxt Layer `@f7or7an/nuxt-base`, sobald er veröffentlicht ist; bis dahin bleibt `_bausteine/` die Quelle. Danach wird `_bausteine/` aufgelöst (siehe `abhaengigkeiten-und-layer.md`).
- `kontrast.mjs` wird nicht kopiert, sondern von dort aufgerufen: `node <pfad>/_bausteine/barrierefreiheit/kontrast.mjs "<farbe>" "<hintergrund>"`.

## Pflichtseite „Barrierefreiheit“

Jedes Projekt im Anwendungsbereich hat eine Seite `/barrierefreiheit`, verlinkt im Footer neben Impressum und Datenschutz. Inhalt:
- welche Dienstleistung angeboten wird, allgemein verständlich beschrieben
- wie die Anforderungen erfüllt werden (WCAG 2.2 AA, Bedienung per Tastatur und Screenreader, Kontraste, Zoom …)
- bekannte Einschränkungen mit Datum und geplanter Lösung
- Kontakt für Hinweise zu Barrieren (E-Mail, Telefon)
- die zuständige Marktüberwachungsbehörde: in Deutschland die Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten und Dienstleistungen (MLBF)
- Datum der letzten Prüfung

Die Seite selbst muss barrierefrei sein. Projekte außerhalb des Anwendungsbereichs bekommen sie freiwillig, wenn es inhaltlich passt. Vorlage: `_bausteine/barrierefreiheit/erklaerung-vorlage.md`. Die Seite in `prerender` und Sitemap aufnehmen.

## Technische Mindestanforderungen (WCAG 2.2 AA)

**Struktur und Semantik**
- Echte HTML-Elemente: `<button>` für Aktionen, `<a>` für Navigation, `<nav>`, `<main>`, `<header>`, `<footer>`. Kein `div` mit `@click`.
- Pro Seite genau ein `<h1>`, Überschriften ohne Sprünge. `lang` am `<html>` (macht i18n), fremdsprachige Passagen mit eigenem `lang`.
- „Zum Inhalt springen“-Link als erstes Element im Layout (`<SiteSkipLink />`, Hauptinhalt `<main id="main" tabindex="-1">`).
- Jede Seite hat einen eigenen, aussagekräftigen `<title>`. Bei Seitenwechsel in der SPA den Fokus sinnvoll setzen oder den Wechsel ansagen (Nuxt `<NuxtRouteAnnouncer>` in `app.vue`).
- Reka-UI-Komponenten bringen ARIA-Rollen und Fokusverwaltung mit. Beim Anpassen der shadcn-Komponenten diese Attribute nicht entfernen.

**Wahrnehmbar**
- Kontrast mindestens **4,5 : 1** für Text, **3 : 1** für großen Text, Icons, Rahmen von Eingabefeldern und Fokusrahmen. Markenfarben bei der Token-Definition in `main.css` prüfen, in Hell und Dunkel.
  - `--ring` hat auf allen Flächen (background, card, muted, Markenflächen) ≥ 3 : 1. `--input` (Rahmen von Feldern, Checkboxen, Schaltern) ≥ 3 : 1 gegen den Feldhintergrund. `--border` für reine Trennlinien darf heller bleiben.
  - In shadcn-Komponenten `ring-ring/50` → `ring-ring`, `outline-ring/50` → `outline-ring` (auch in `main.css`), weil halbe Deckkraft die 3 : 1 meist verfehlt.
- Informationen nie nur über Farbe (Fehler: Farbe + Symbol + Text).
- Alt-Texte für inhaltliche Bilder, `alt=""` für reine Deko. Icon-Buttons brauchen `aria-label`. Schließen-Buttons mit `sr-only`-Text in der Seitensprache (z. B. „Schließen“ auf Deutsch), nie das englische „Close“ aus der shadcn-Vorlage.
- Audio und Video: Untertitel bzw. Transkript (z. B. Hörproben Ortrud: kurze Beschreibung; Video im Praxisraum: Chat als Alternative).
- Bei 200 % Zoom und bei 320 px Breite bleibt alles lesbar und bedienbar, ohne horizontales Scrollen.

**Bedienbar**
- Alles per Tastatur erreichbar und bedienbar, sinnvolle Reihenfolge, keine Tastaturfalle. Dialoge fangen den Fokus und geben ihn beim Schließen zurück (Reka macht das).
- **Fokus immer sichtbar** (`focus-visible`-Ring, nie `outline: none` ohne Ersatz) und **nicht verdeckt**: Bei Sticky-Header `scroll-padding-top` setzen (`a11y.css`, `--header-height` in `:root` auf die Header-Höhe). Jedes Element mit `outline-none` braucht einen eigenen `focus-visible:`-Stil, sonst `outline-none` entfernen.
- Klickflächen mindestens **24 × 24 px** (für Touch besser 44 × 44 px).
- Jede Zieh-Geste (Drag & Drop, Slider, 3D-Brett) hat eine Alternative mit Klicks oder Tasten.
- Keine Zeitlimits ohne Verlängerung. Karussells und automatische Slider anhalten lassen.
- Animationen und View Transitions respektieren `prefers-reduced-motion`. Nichts blinkt öfter als dreimal pro Sekunde. View Transitions nur mit `experimental.viewTransition: true`, nie `'always'`, weil `'always'` reduzierte Bewegung übergeht (siehe `performance.md`).

**Verständlich**
- Jedes Formularfeld hat ein sichtbares `<label>`. Pflichtfelder im Text kennzeichnen, nicht nur mit `*`.
- Fehlermeldungen als Text direkt am Feld, verknüpft per `aria-describedby`, Feld mit `aria-invalid`. Nach dem Absenden zum ersten Fehler springen (Muster: Rabatt-Fragebogen Vogelperspektive).
- `autocomplete`-Attribute für persönliche Daten (`name`, `email`, `tel`, `street-address` …).
- Bereits eingegebene Daten im selben Ablauf nicht erneut abfragen.
- Login ohne Denkaufgaben (WCAG 3.3.8): Einfügen erlaubt, Passwortmanager funktionieren, auch mit Auto-Absenden, kein CAPTCHA mit Rätsel. Deshalb hat das Login weder Honeypot noch Mindestzeit, sondern schützt sich per Rate-Limit pro IP und pro Konto. Honeypot und Mindestzeit (≥ 3 s, Baustein `_bausteine/sicherheit/`) gelten nur für Kontakt-, Newsletter-, Feedback-, Buchungs-, Anmelde-/Registrierungs- und Antragsformulare und ersetzen dort das CAPTCHA (Technik: `server-und-sicherheit.md`, Formularschutz).
- Hilfe und Kontakt stehen auf jeder Seite an derselben Stelle (Footer).
- Klare, einfache Sprache. Bei Angeboten für breite Zielgruppen eine Seite in Leichter Sprache erwägen.

**Robust**
- Statusmeldungen (gesendet, Fehler, Laden) über `role="status"` bzw. `aria-live` ansagen.
- PDFs zum Download nur barrierefrei (getaggt) oder mit gleichwertigem HTML-Inhalt.

## Prüfablauf (jedes Deployment, nicht nur beim Livegang)

1. **Automatisch:** `browser_check_accessibility` (Claude-Manager-Browser) bzw. axe/Lighthouse auf jeder Seitenvorlage. 0 Verstöße der Stufen A und AA.
2. **Von Hand:** jede Seite nur mit Tastatur durchgehen (Skip-Link mit Tab testen, Fokus auf allen Bedienelementen sichtbar), 200 % Zoom und 320 px Breite, `prefers-reduced-motion` an, Kontraste der Markenfarben.
3. **Screenreader-Stichprobe** (NVDA unter Windows) für Navigation und jedes Formular.

Automatische Tests finden nur etwa ein Drittel der Probleme. Die Handprüfung ist Pflicht.
Bekannte Barrieren, die nicht sofort behoben werden, stehen in der README und auf der Seite `/barrierefreiheit`. Offene Punkte zusätzlich in `STANDARDS-AUDIT.md` (siehe `tests-und-qualitaet.md`). Dieser Prüfablauf ist die einzige ausführliche Fassung; die Deployment-Checkliste verweist hierher.

### Hilfsmittel beim Entwickeln

- `@nuxt/a11y` ist Alpha und nur eine Dev-Hilfe; `@nuxt/hints` ebenso. Beide ersetzen weder `browser_check_accessibility` noch die Handprüfung. Nur als `devDependency` bzw. nur im Dev-Modus einbinden.

### Prüfhinweise aus dem Rollout vom 18.11.2026

Falsche Alarme des Checkers erkennen, statt sie „wegzureparieren“:
- **Reka-Modal (Dialog, Sheet, Mobilmenü):** Solange er offen ist, blendet Reka den Hintergrund per `aria-hidden` aus, die Fokusfalle hält die Tastatur im Dialog. „aria-hidden mit fokussierbarem Inhalt“ (z. B. Skip-Link) ist dann ein falscher Alarm. Prüfung mit geschlossenem Dialog wiederholen.
- **`aria-hidden` mit `tabindex="-1"`** (z. B. doppelte Bild-Links neben dem Text-Link): per Tab nicht erreichbar, also falscher Alarm. Echte Fehler sind nur per Tab erreichbare Elemente in `aria-hidden`.
- **Einblend-Animationen (`v-reveal`):** Elemente mit `opacity: 0` vor dem Einblenden ergeben „Kontrast 1 : 1“. Erst messen, wenn alles sichtbar ist (hineinscrollen).
- **Messung während einer Animation** liefert Zwischenfarben. Animation abwarten oder `prefers-reduced-motion` per `browser_emulate` einschalten.
- **`sr-only`-Texte** (z. B. unsichtbarer Titel im Mobilmenü) erzeugen Kontrastmeldungen, die niemand sieht: falscher Alarm.

Weitere Erkenntnisse:
- **Silbentrennung** (`hyphens-auto`, dazu `break-words`) braucht ein passendes `lang` am Element oder einem Vorfahren und greift nicht in `inline-flex`-Elementen. Lange Wörter („Marktüberwachungsbehörde“, Bulgarisch) bei 320 px prüfen; Rechtsseiten laufen sonst über.
- **320-px-Messung:** Der Browser lässt sich nicht immer schmal genug stellen. Die Seite in einem `iframe` mit 320 px Breite laden bzw. `document.documentElement.scrollWidth` gegen `clientWidth` vergleichen; größer heißt horizontales Scrollen.
