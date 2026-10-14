import { TestBed } from '@angular/core/testing';
import { INQUIRY_CONFIG, InquiryPayload, InquiryService } from './inquiry.service';
import { environment } from '../../environments/environment';

const payload: InquiryPayload = {
  schemaVersion: 1, source: 'project-wizard', lang: 'en', submittedAt: '2026-10-15T00:00:00.000Z',
  contact: { name: 'Jane Doe', email: 'jane@corp.example', company: 'Corp' },
  subject: 'Project check: APIs – Jane Doe', message: 'Hello',
  details: { services: ['api'], scope: 'poc' }, summary: ['Topics: APIs', 'Scope: Proof of concept'],
};

function make(endpoint: string, timeoutMs = 1000) {
  TestBed.configureTestingModule({ providers: [{ provide: INQUIRY_CONFIG, useValue: { endpoint, email: 'hi@example.com', timeoutMs } }] });
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
    expect(JSON.parse(init.body)).toEqual(payload);
    expect(opened.length).toBe(0);
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
