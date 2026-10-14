# Cyulater – Website

One-Pager für Cyulater (KI, Softwareentwicklung, APIs, Data Engineering, ETL, Jira Consulting).
Angular 22 · Standalone Components · Signals · SCSS · DE/EN zur Laufzeit umschaltbar.

Live: https://z6bzsmgh5g-lgtm.github.io/cyulater-website/

## Entwicklung (Node ≥ 22.22.3 bzw. 24.15)
```bash
npm ci
npm start                      # http://localhost:4200
npx ng test --watch=false      # Unit-Tests (Vitest)
npm run build                  # Produktions-Build nach dist/
npm run build:pages            # Build für GitHub Pages (Base-Href /cyulater-website/)
```
Deployment erfolgt automatisch per GitHub Actions bei Push auf `main`.

## Features
- Interaktives Integrations-/ETL-Diagramm im Hero (SVG, Tastatur-bedienbar, Reduced-Motion-fähig)
- API-Demo-Konsole mit simulierten Requests/Responses
- Projekt-Check (4-Schritte-Assistent) → strukturierte Anfrage
- Schnellnavigation per Strg/⌘+K, Hell/Dunkel-Design (View Transitions), DE/EN zur Laufzeit
- Anfragen an konfigurierbares Backend (`src/environments/environment.ts`), sonst mailto – siehe `docs/INQUIRY_API.md`

## Platzhalter
- Kontakt-E-Mail: `contactEmail` in `src/environments/environment.ts` und JSON-LD in `src/index.html`
- Backend-Endpunkt für Anfragen: `inquiryEndpoint` in `src/environments/environment.ts`
- Impressum / Datenschutz: Seiten noch anlegen
