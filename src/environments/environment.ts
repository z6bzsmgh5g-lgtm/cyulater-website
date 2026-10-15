/**
 * Build-time configuration.
 *
 * inquiryEndpoint: URL of a backend that accepts inquiry submissions as JSON (HTTP POST),
 *   e.g. a serverless function that creates a Jira issue. Leave empty ('') to fall back
 *   to opening the visitor's email program (mailto). Payload schema: docs/INQUIRY_API.md
 * inquiryMode: 'cors' (own backend that sends CORS headers; response status is checked) or
 *   'no-cors' (e.g. Jira Automation incoming webhook URL with secret path segment; the browser sends
 *   the JSON as text/plain without preflight and cannot read the response – treated as sent).
 * contactEmail: PLATZHALTER / PLACEHOLDER – replace with the real address.
 */
export const environment = {
  inquiryEndpoint: '',
  inquiryMode: 'cors' as 'cors' | 'no-cors',
  contactEmail: 'kontakt@example.com',
  requestTimeoutMs: 10000,
};
