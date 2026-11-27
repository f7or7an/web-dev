# Entscheidungen zum Abschluss von Phase 2 (27.11.2026)

Grundlage: Fragenliste `_phase2/FRAGEN.md` (46 Fragen, alle Projekte von Prüfer-Agenten freigegeben). „F:“ = Florians Antwort.

## A. Alle Projekte
1. Alles committen und pushen (je Projekt ein Commit auf dem aktuellen Branch, dazu das Meta-Repo `web-dev`) – F: ja.
2. Neue GitHub-Repos `flowtech-website`, `ortrud`, `renovate-config`, `nuxt-base` – F: **alle privat**, kein öffentliches Repo. Florian legt sie an. Renovate liest `renovate-config` über die Installation der Renovate-App auf diesem Repo.
3. Lokales Token für GitHub Packages (classic, nur `read:packages`, 30 Tage, Benutzer-`.npmrc`) – F: macht Florian, als zweiter Schritt nach dem Commit gemeinsam.
4. `npm audit signatures` nicht aufweichen; ab 30.11.2026 `unimport` 7.0.3 einspielen – F: ja.
5. Lokal Node 26 + npm 12 installieren – F: ja, als zweiter Schritt nach dem Commit gemeinsam.
6. CSRF-Prüfung an allen Pfaden statt nur `/api/**` – F: ja (Regel ist damit entschieden, nicht mehr Vorschlag).
7. CSP zusätzlich `default-src`, `connect-src`, `manifest-src`, `worker-src 'self'` – F: ja.
8. CSP nach Beobachtung auf Staging scharf schalten (alle B/C) – F: ja.
9. Nuxts Crawler-Plugin schreibt nur bei Bot-User-Agents `nuxt:reload` in den sessionStorage – hinnehmen, nicht in der DSE nennen – F: ja.
10. Englische/bulgarische Texte von Muttersprachler:innen gegenlesen lassen – F: ja.
11. Nach dem Commit `_phase2/` löschen, `_sicherung/2026-11-21-vor-phase2/` erst nach erfolgreichem Push – F: ja.

## B. FlowTech
12. KI-Trainings-Crawler sperren – F: nein.
13. Markenschrift einbauen – F: nein.
14. HSTS `includeSubDomains` – F: alle (Sub-)Domains werden HTTPS können → `includeSubDomains` ist in Ordnung (SRV-4).
15. Zweite Domain (Ordner `flwtchde`) zeigt auf dieselbe Seite (Weiterleitung auf flow-tech.org) – F: ja. **dogado wird nicht mehr genutzt**: FlowTech zieht auf Florians eigenen Root-Server. Livegang/Server-Einrichtung macht die Session „FlowTech Server-Einrichtung“, nicht Phase 2.
16. Impressum um Telefon ergänzen – F: ja (Nummer und Server-Logdauer noch nennen; Hoster ist nicht mehr dogado).
17./18. Fragen mit dogado-Bezug (Log-Dauer dogado, `.htaccess` auf dogado live bringen) – F: entfällt, es gibt nichts mehr bei dogado. Fragen zum Setup an die Session „FlowTech Server-Einrichtung“.
(`typedPages` lassen: Empfehlung, keine Gegenrede.)

## C. Vogelperspektive und Praxisraum
19. `NUXT_APP_SECRET` lokal, in der Review-Instanz und auf dem Server setzen, `NUXT_SESSION_PASSWORD` entfernen (meldet alle einmal ab) – F: ja.
20. Passwort-Login der Website in Produktion abschalten, nur SSO über den Praxisraum mit 2FA – F: ja.
21. Gemeinsames Abmelden (Website ↔ Praxisraum) von GET auf POST umstellen – F: ja.
22. KI-Trainings-Crawler auf der Website sperren – F: ja.
23. Deutsche Status- und Pfadnamen als bestätigte Abweichung (keine Datenmigration) – F: ja.
24. Praxisraum: Tablet-Brücke in Go und `ssr: false` als bestätigte Abweichungen – F: ja.
25. Praxisraum: Übergangs-Login aus der Env auf dem Server verboten (Startprüfung), Ersteinrichtung nur per SMTP-Link – F: ja.
26. Praxisraum vor dem nächsten Review mit Node 26 neu bauen – F: ja.
27. Vogelperspektive: Browser-Tests mit `playwright-core` + installiertem Chrome statt `@playwright/test` als bestätigte Abweichung (CODE-23) – F: ja.
28. Vogelperspektive Rabatt: „Angaben korrigieren“ auch bei Geburtsjahr unter 18 (UX-1) – F: ja.
29. Mit Jara klären: Marktüberwachungsbehörde, Kleinstunternehmen-Ausnahme, Bildrechte – F: merken (Pflicht vor Livegang, offen).

## D. Ortrud
30. `ANALYSE.md` im Projekt lassen – F: ja.
31. `kuteifan.de` ohne www, www leitet um – F: ja.
32. `/barrierefreiheit` indexieren (statt noindex) – F: ja.
33. Bilder vorerst ohne `@nuxt/image` (bis nach dem Livegang) – F: ja (bestätigte Abweichung).
34. KI-Crawler erlauben – F: **nein** → KI-Trainings-Crawler sperren.
35. Kontaktformular: Rechtsgrundlage Art. 6 Abs. 1 lit. b/f mit Hinweis statt Einwilligungs-Checkbox – F: ja (mit rechtlicher Prüfung).
36. Hoster und Postfach – F: Florians eigener Root-Server, dort läuft auch ein Mailserver (Postfach für kuteifan.de dort).

## E. Gora
37. Eigene Session-Tabelle (PBKDF2) statt nuxt-auth-utils als bestätigte Abweichung – F: ja (2FA für Admins bleibt offen).
38. `GORA_*`-Variablen bis Ende des Sites-Stagings, danach `NUXT_*` – F: ja.
39. Catch-all-API mit `fail()` bis zum Entfernen des Workers als Abweichung – F: ja.
40. Kein `@nuxt/image` (WebP per Skript) als Abweichung bis Livegang – F: ja.
41. Eigenes CSS statt Tailwind – F: **nein**. Gora wird nach den Richtlinien umgebaut (Tailwind CSS 4, shadcn-vue, Komponenten-Ebenen), **Design optisch so nah wie möglich am jetzigen**. Eigener Auftrag mit Vorher-/Nachher-Vergleich.
42. KI-Crawler sperren – F: nein (wie empfohlen; Gora-Team fragen).
43. `.tools/` (lokales Node 24) löschen, sobald Node 26 lokal läuft – F: ja.
44. `AGENTS.md` (Vorrangregel, „Sitemap/robots mit Bordmitteln“) als Eigentümer anpassen – F: ja.
45. Kontosperre (10 min) gezielt gegen Owner auslösbar – akzeptabel – F: ja.
46. Bildrechte der 58 Bilder mit Pavlina klären – F: ja, offen (Pflicht vor Livegang).

## F. Server
47. Reverse Proxy: **Nginx Proxy Manager ist die Dauerlösung** (Florians Root-Server bei IPAX, Wien; Einrichtung durch die Session „FlowTech Server-Einrichtung“) – F: ja. Folge: Regeln (`SERVER.md`, `CLAUDE.md`, `container-und-deployment.md` u. a.) und die Projekt-Deploy-Dateien von Caddy auf NPM umstellen; Caddy-Dateien werden historische Vorlagen.
