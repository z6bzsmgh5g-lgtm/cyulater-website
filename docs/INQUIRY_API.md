# Inquiry API contract (contact form & project wizard)

Both the contact form and the project-check wizard submit through `InquiryService`
(`src/app/core/inquiry.service.ts`).

## Configuration

`src/environments/environment.ts`

| Key | Meaning |
|---|---|
| `inquiryEndpoint` | Backend URL for submissions. **Empty string = mailto fallback** (current state). |
| `contactEmail` | Address used for mailto fallback and displayed on the page (**placeholder**). |
| `requestTimeoutMs` | Abort the request after this many ms (default 10000). |

After changing the file, push to `main`; GitHub Actions rebuilds and deploys.

## Request

`POST {inquiryEndpoint}` with `Content-Type: application/json`:

```json
{
  "schemaVersion": 1,
  "source": "project-wizard",            // or "contact-form"
  "lang": "de",                           // "de" | "en"
  "submittedAt": "2026-10-15T08:00:00.000Z",
  "contact": { "name": "Erika Muster", "email": "erika@example.com", "company": "Muster GmbH" },
  "subject": "Projekt-Check: Schnittstellen & APIs, Jira Consulting & Schulungen – Erika Muster",
  "message": "Free text (may be empty for the wizard)",
  "details": {                            // machine-readable ids
    "services": ["api", "jira"],          // ai | code | api | data | etl | jira
    "situation": "extend",                // new | extend | modernize | advice
    "scope": "poc",                       // training | poc | project | retainer
    "timeline": "1-3",                    // asap | 1-3 | 3-6 | open
    "budget": "5-15k"                     // optional: <5k | 5-15k | 15-50k | >50k
  },
  "summary": [                            // human-readable lines in the visitor's language
    "Themen: Schnittstellen & APIs, Jira Consulting & Schulungen",
    "Ausgangslage: Bestehendes System erweitern"
  ],
  "pageUrl": "https://z6bzsmgh5g-lgtm.github.io/cyulater-website/"
}
```

For `source: "contact-form"`, `details` contains only `{ "topic": "<service title>" }` when chosen.

## Response

- Any **2xx** → the site shows a success message.
- Non-2xx, network error or timeout → the site shows an error with a prefilled mailto link as fallback.
- The response body is ignored (e.g. `{ "issueKey": "SUP-123" }` is fine).

## Backend notes (for the Jira integration)

- The site is static (GitHub Pages), so the endpoint must allow **CORS** for
  `https://z6bzsmgh5g-lgtm.github.io` (methods `POST, OPTIONS`; header `Content-Type`).
- Never put Jira credentials in the frontend; keep them in the backend (e.g. serverless function).
- Validate input server-side and add spam protection (rate limiting, honeypot or CAPTCHA).
- Suggested Jira mapping: `summary` ← `subject`, `description` ← `summary` lines + `message` + contact,
  `labels` ← `details.services`, custom fields ← `details.*`.
