/**
 * Build-time configuration.
 *
 * inquiryEndpoint: URL of a backend that accepts inquiry submissions as JSON (HTTP POST),
 *   e.g. a serverless function that creates a Jira issue. Leave empty ('') to fall back
 *   to opening the visitor's email program (mailto). Payload schema: docs/INQUIRY_API.md
 * inquiryMode: 'cors' (own backend that sends CORS headers; response status is checked) or
 *   'no-cors' (e.g. Jira Automation incoming webhook URL with secret path segment; the browser sends
 *   the JSON as text/plain without preflight and cannot read the response – treated as sent).
 * rateLimit: client-side throttle per browser (spam brake, not a security boundary).
 * NOTE: the Jira webhook secret (last path segment) is public by design here; it can only trigger the
 *   'Website-Anfragen' rule. Regenerate it in the rule if abused.
 * contactEmail: PLATZHALTER / PLACEHOLDER – replace with the real address.
 */
export const environment = {
  inquiryEndpoint: 'https://api-private.atlassian.com/automation/webhooks/jira/a/f3a3b746-215a-40bc-965b-53b9e1d5669c/01a13e6b-6761-7417-be4b-ead094520b64/ff6413c81c89faaf4d5db0144d9f0a0ebd0fa3f6',
  inquiryMode: 'no-cors' as 'cors' | 'no-cors',
  contactEmail: 'kontakt@example.com',
  requestTimeoutMs: 10000,
  rateLimit: { max: 3, windowMs: 10 * 60 * 1000 },
};
