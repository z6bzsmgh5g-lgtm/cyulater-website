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

## Platzhalter
- Kontakt-E-Mail: `CONTACT_EMAIL` in `src/app/contact/contact-form.component.ts` und JSON-LD in `src/index.html`
- Impressum / Datenschutz: Seiten noch anlegen
