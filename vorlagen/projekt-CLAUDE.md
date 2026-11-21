<!--
Vorlage für die CLAUDE.md eines Projekts (Stand 21.11.2026). Höchstens 60 Zeilen.
Kopieren nach <Projektordner>/CLAUDE.md, alle <…> ersetzen, nicht zutreffende Zeilen löschen.
Nur Projektspezifisches: Allgemeines steht in WebSites/CLAUDE.md und WebSites/.claude/rules/ und lädt ohnehin.
Dieser Kommentar wird beim Laden entfernt und kostet keinen Kontext.
Gora (Datei in „Gora Ozosnanie/webapp/“): Allererste Zeile, noch vor diesem Kommentar, ist „@AGENTS.md“.
Sie bindet die vorhandene AGENTS.md ein, die sonst nicht gelesen wird. Keine weiteren AGENTS.md anlegen.
-->
# <Projektname>

<Ein bis zwei Sätze: was die Seite/App tut und für wen.> Domain: <domain>. Repo: `f7or7an/<repo>`.
Gemeinsame Regeln: `WebSites/CLAUDE.md` und `WebSites/.claude/rules/` (laden automatisch); sie gelten, außer wo unten unter „Abweichungen“ eingetragen.
Details, Env-Variablen, Deployment: [README.md](README.md). Offene Punkte: [STANDARDS-AUDIT.md](STANDARDS-AUDIT.md) (Überblick lesen, dann gezielt suchen).

## Eckdaten

- Modus: <A statisch | B Hybrid | C Webapp> (<kurz warum>)
- Sprachen: <de | de, en, bg …>, Standardsprache <de>
- BFSG: <im Anwendungsbereich | nicht im Anwendungsbereich>, <ein Halbsatz Begründung>
- Datenbank: <keine | SQLite `.data/<name>.sqlite` mit Drizzle | SQLite über db0 (Altbestand)>
- `cn`-Import: <`@/lib/utils` | Paket `cn`> (einheitlich im ganzen Projekt)
- Gemeinsamer Layer: <`@f7or7an/nuxt-base` <Version> | noch Kopien aus `_bausteine/`>
- KI-Trainings-Crawler in robots.txt: <gesperrt | erlaubt> (<Grund>)

## Befehle

```
npm run dev                          # Port 3000 – gehört Florian, nie selbst beenden
npm run dev -- --port <Test-Port>    # eigene Tests, nie mit --host
npm run lint
npm run typecheck
npm run test                         # <entfällt, falls keine Tests>
npm run build                        # bzw. npm run generate (Modus A)
<weitere, z. B. npm run admin:hash, npm run db:generate>
```

Test-Port für Agenten: **<z. B. 3456>**. Port 3000 und Prozesse, die ich nicht selbst gestartet habe, nicht anfassen.
Fehlt eines der Skripte oben, wird es nicht nebenbei eingeführt: Es ist ein Punkt in `STANDARDS-AUDIT.md`.

## Besonderheiten

- <Was ein Agent wissen muss und nicht im Code sieht: fachliche Regeln, Rollen, Löschfristen, Partner …>
- <Wichtige Dateien, z. B. `shared/prices.ts` = einzige Quelle für Preise>
- <Offene bekannte Barrieren in Kurzform (Details in README und /barrierefreiheit)>

## Abweichungen

| Regel | Abweichung | Grund | von Florian bestätigt am |
|---|---|---|---|
| <z. B. Grundsatz 4: Standardsprache> | <was anders ist> | <warum> | <TT.MM.JJJJ> |

Nur von Florian bestätigte Abweichungen; unbestätigte stehen in `STANDARDS-AUDIT.md`.
<!-- Keine Abweichung → Tabelle durch „Keine.“ ersetzen. Die README verweist nur auf diese Tabelle. -->

## Offene Punkte

- <Kurzliste, was als Nächstes ansteht; ausführlich in README>
