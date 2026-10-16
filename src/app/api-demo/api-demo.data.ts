/** Mock request/response pairs for the API demo. Sample data only – no real systems. */
export interface DemoCall {
  id: 'orders' | 'classify' | 'issue' | 'etl' | 'ratelimit';
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  status: number;
  statusText: string;
  latencyMs: number;
  response: unknown;
}

export const DEMO_CALLS: DemoCall[] = [
  {
    id: 'orders', method: 'GET', path: '/v1/orders?status=open&limit=2',
    status: 200, statusText: 'OK', latencyMs: 84,
    response: {
      data: [
        { id: 'ORD-1042', customer: 'Beispiel GmbH', total: { amount: 1290.0, currency: 'EUR' }, status: 'open', updatedAt: '2026-10-14T08:12:00Z' },
        { id: 'ORD-1043', customer: 'Muster AG', total: { amount: 455.5, currency: 'EUR' }, status: 'open', updatedAt: '2026-10-14T08:19:00Z' },
      ],
      pagination: { limit: 2, nextCursor: 'eyJvZmZzZXQiOjJ9' },
    },
  },
  {
    id: 'classify', method: 'POST', path: '/v1/ai/classify',
    body: { text: 'Unsere Rechnung vom September wurde doppelt abgebucht.', categories: ['billing', 'technical', 'sales'] },
    status: 200, statusText: 'OK', latencyMs: 412,
    response: { category: 'billing', confidence: 0.93, suggestedPriority: 'high', reasoning: 'Mentions invoice and duplicate charge.' },
  },
  {
    id: 'issue', method: 'POST', path: '/v1/integrations/jira/issues',
    body: { project: 'SUP', type: 'Task', summary: 'Doppelte Abbuchung prüfen', labels: ['billing', 'auto-created'] },
    status: 201, statusText: 'Created', latencyMs: 236,
    response: { key: 'SUP-128', url: 'https://example.atlassian.net/browse/SUP-128', status: 'To Do', createdAt: '2026-10-14T08:21:07Z' },
  },
  {
    id: 'etl', method: 'POST', path: '/v1/etl/jobs',
    body: { pipeline: 'orders-to-warehouse', source: { type: 'rest', url: 'https://erp.example.com/v1/orders' }, steps: ['parse-json', 'filter:amount>100', 'map-fields'], target: { type: 'warehouse', table: 'analytics.orders' }, mode: 'incremental' },
    status: 202, statusText: 'Accepted', latencyMs: 58,
    response: { jobId: 'job_7f3c21', status: 'queued', statusUrl: '/v1/etl/jobs/job_7f3c21', estimatedRecords: 1840, links: { logs: '/v1/etl/jobs/job_7f3c21/logs' } },
  },
  {
    id: 'ratelimit', method: 'GET', path: '/v1/inventory?warehouse=HAM',
    status: 429, statusText: 'Too Many Requests', latencyMs: 12,
    response: { type: 'https://api.example.com/problems/rate-limit', title: 'Rate limit exceeded', status: 429, detail: '600 requests per minute allowed.', retryAfterSeconds: 30, headers: { 'Retry-After': '30', 'X-RateLimit-Remaining': '0' } },
  },
];

export interface Token { text: string; cls: 'key' | 'str' | 'num' | 'lit' | 'punc'; }

/** Minimal JSON tokenizer for syntax highlighting without innerHTML. */
export function tokenizeJson(value: unknown): Token[] {
  const json = JSON.stringify(value, null, 2);
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(true|false|null)\b|([^"\d\w]+|\w+)/g;
  const out: Token[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(json))) {
    if (m[1] !== undefined) {
      out.push({ text: m[1], cls: m[2] ? 'key' : 'str' });
      if (m[2]) out.push({ text: m[2], cls: 'punc' });
    } else if (m[3] !== undefined) out.push({ text: m[3], cls: 'num' });
    else if (m[4] !== undefined) out.push({ text: m[4], cls: 'lit' });
    else out.push({ text: m[5], cls: 'punc' });
  }
  return out;
}
