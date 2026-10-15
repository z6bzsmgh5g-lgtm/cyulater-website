import { TestBed } from '@angular/core/testing';
import { INQUIRY_CONFIG, InquiryPayload, InquiryService, toWire } from './inquiry.service';
import { environment } from '../../environments/environment';

const payload: InquiryPayload = {
  schemaVersion: 1, source: 'project-wizard', type: 'projekt-check', lang: 'en', submittedAt: '2026-10-15T00:00:00.000Z',
  contact: { name: 'Jane Doe', email: 'jane@corp.example', company: 'Corp' },
  subject: 'Project check: APIs – Jane Doe', message: 'Hello',
  details: { services: ['api'], scope: 'poc' }, summary: ['Topics: APIs', 'Scope: Proof of concept'],
};

function make(endpoint: string, timeoutMs = 1000, mode: 'cors' | 'no-cors' = 'cors', rateLimit?: { max: number; windowMs: number }) {
  TestBed.configureTestingModule({ providers: [{ provide: INQUIRY_CONFIG, useValue: { endpoint, email: 'hi@example.com', timeoutMs, mode, rateLimit } }] });
  const s = TestBed.inject(InquiryService);
  const opened: string[] = [];
  s.openMail = h => { opened.push(h); };
  return { s, opened };
}

describe('InquiryService', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('defaults to the environment config (mailto when endpoint is empty)', () => {
    const s = TestBed.inject(InquiryService);
    expect(s.email).toBe(environment.contactEmail);
    expect(s.usesEndpoint).toBe(!!environment.inquiryEndpoint);
  });

  it('builds a mailto link with subject, contact, summary and message', () => {
    const { s } = make('');
    const href = s.buildMailto(payload);
    expect(href.startsWith('mailto:hi@example.com?subject=')).toBe(true);
    const decoded = decodeURIComponent(href);
    expect(decoded).toContain('Project check: APIs – Jane Doe');
    expect(decoded).toContain('Jane Doe <jane@corp.example> – Corp');
    expect(decoded).toContain('Scope: Proof of concept');
    expect(decoded).toContain('Hello');
  });

  it('opens mailto when no endpoint is set', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { s, opened } = make('');
    await expect(s.submit(payload)).resolves.toBe('mailto');
    expect(opened.length).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs the JSON payload to the endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { s, opened } = make('https://hooks.example.com/inquiry');
    await expect(s.submit(payload)).resolves.toBe('sent');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hooks.example.com/inquiry');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(toWire(payload));
    expect(opened.length).toBe(0);
  });

  it('no-cors mode sends text/plain JSON without preflight and treats an opaque response as sent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, type: 'opaque', status: 0 });
    vi.stubGlobal('fetch', fetchMock);
    const { s } = make('https://api-private.atlassian.com/automation/webhooks/jira/a/b/c/SECRET', 1000, 'no-cors');
    await expect(s.submit(payload)).resolves.toBe('sent');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.mode).toBe('no-cors');
    expect(init.headers['Content-Type']).toMatch(/^text\/plain/);
    expect(JSON.parse(init.body)).toEqual(toWire(payload));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    await expect(s.submit(payload)).resolves.toBe('failed');
  });

  it('wire format flattens summary and precomputes Jira labels', () => {
    const w = toWire(payload);
    expect(w.summary).toBe('Topics: APIs\nScope: Proof of concept');
    expect(w.label).toBe('anfrage-projekt-check');
    expect(w.labels).toEqual(['website-anfrage', 'anfrage-projekt-check']);
    expect(toWire({ ...payload, contact: { name: 'a', email: 'b' } }).contact.company).toBe('');
  });

  it('rate-limits endpoint submissions per browser', async () => {
    localStorage.removeItem('cyulater.inquiry.sent');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { s } = make('https://api.example.com/inquiries', 1000, 'cors', { max: 2, windowMs: 60_000 });
    await expect(s.submit(payload)).resolves.toBe('sent');
    await expect(s.submit(payload)).resolves.toBe('sent');
    await expect(s.submit(payload)).resolves.toBe('limited');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    localStorage.setItem('cyulater.inquiry.sent', JSON.stringify([Date.now() - 120_000, Date.now() - 120_000]));
    await expect(s.submit(payload)).resolves.toBe('sent');
    localStorage.removeItem('cyulater.inquiry.sent');
  });

  it('returns failed on non-2xx responses and network errors', async () => {
    const { s } = make('https://hooks.example.com/inquiry');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(s.submit(payload)).resolves.toBe('failed');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    await expect(s.submit(payload)).resolves.toBe('failed');
  });

  it('aborts after the configured timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => new Promise((_res, rej) => {
      init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
    })));
    const { s } = make('https://hooks.example.com/inquiry', 50);
    const p = s.submit(payload);
    await vi.advanceTimersByTimeAsync(60);
    await expect(p).resolves.toBe('failed');
  });
});
