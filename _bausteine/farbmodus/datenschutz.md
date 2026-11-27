# Textbaustein Datenschutzerklärung: Farbmodus

Pflicht in jedem Projekt mit Farbmodus-Umschalter (Regel: `WebSites/.claude/rules/formulare-und-datenschutz.md`, „Satz für die Datenschutzerklärung“).
Deutsch **wörtlich** übernehmen. Die Übersetzungen sind Entwürfe des Bausteine-Agenten (21.11.2026) und müssen vor dem Livegang kuratiert geprüft werden (Kern: „Übersetzungen kuratiert“). Gesetzesbezeichnungen nicht übersetzen, nur erläutern.

Passende Stelle: Abschnitt über Speicherung im Browser bzw. „Cookies und lokale Speicherung“.

## Deutsch (verbindlich)

> Wenn Sie den Farbmodus selbst wählen, speichern wir nur diese Einstellung (z. B. „dark“) im Sitzungsspeicher Ihres Browsers; er wird beim Schließen gelöscht, enthält keine Kennung und wird nicht übertragen. Rechtsgrundlage § 25 Abs. 2 Nr. 2 TDDDG (BG: чл. 4а Abs. 4 Nr. 2 ЗЕТ).

Für Seiten in Du-Form (z. B. Vogelperspektive, falls die Datenschutzerklärung duzt) nur die Anrede anpassen:

> Wenn du den Farbmodus selbst wählst, speichern wir nur diese Einstellung (z. B. „dark“) im Sitzungsspeicher deines Browsers; er wird beim Schließen gelöscht, enthält keine Kennung und wird nicht übertragen. Rechtsgrundlage § 25 Abs. 2 Nr. 2 TDDDG (BG: чл. 4а Abs. 4 Nr. 2 ЗЕТ).

## English (Entwurf)

> If you choose the colour mode yourself, we store only this setting (e.g. “dark”) in your browser’s session storage; it is deleted when you close the browser, contains no identifier and is not transmitted. Legal basis: Section 25(2) No. 2 of the German TDDDG (Bulgaria: Art. 4a(4) No. 2 ZET).

## Български (Entwurf)

> Ако сами изберете цветовия режим, запазваме само тази настройка (напр. „dark“) в сесийното хранилище на Вашия браузър; то се изтрива при затварянето му, не съдържа идентификатор и не се предава. Правно основание: чл. 4а, ал. 4, т. 2 ЗЕТ (Германия: § 25 Abs. 2 Nr. 2 TDDDG).

## Technische Angaben (falls die Erklärung eine Tabelle führt)

| Name | Speicherort | Inhalt | Zweck | Dauer |
|---|---|---|---|---|
| `color-scheme` | `sessionStorage` | `light` oder `dark` | gewählten Farbmodus beibehalten | bis zum Schließen des Browser-Tabs bzw. -Fensters; Wahl „Wie System“ löscht den Eintrag sofort |
