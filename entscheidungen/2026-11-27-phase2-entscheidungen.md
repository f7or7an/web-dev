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

## B.–E. Projektfragen
Offen (Antwort folgt).
