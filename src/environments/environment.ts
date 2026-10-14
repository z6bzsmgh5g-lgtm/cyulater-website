/**
 * Build-time configuration.
 *
 * inquiryEndpoint: URL of a backend that accepts inquiry submissions as JSON (HTTP POST),
 *   e.g. a serverless function that creates a Jira issue. Leave empty ('') to fall back
 *   to opening the visitor's email program (mailto). Payload schema: docs/INQUIRY_API.md
 * contactEmail: PLATZHALTER / PLACEHOLDER – replace with the real address.
 */
export const environment = {
  inquiryEndpoint: '',
  contactEmail: 'kontakt@example.com',
  requestTimeoutMs: 10000,
};
