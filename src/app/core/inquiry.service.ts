import { DOCUMENT, Injectable, InjectionToken, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Lang } from '../i18n/translations';

export interface InquiryConfig { endpoint: string; email: string; timeoutMs: number; mode?: 'cors' | 'no-cors'; }

export const INQUIRY_CONFIG = new InjectionToken<InquiryConfig>('INQUIRY_CONFIG', {
  providedIn: 'root',
  factory: () => ({ endpoint: environment.inquiryEndpoint, mode: environment.inquiryMode, email: environment.contactEmail, timeoutMs: environment.requestTimeoutMs }),
});

/** Structured inquiry – the contract for a future backend (e.g. Jira issue creation). */
export interface InquiryPayload {
  schemaVersion: 1;
  source: 'contact-form' | 'project-wizard';
  lang: Lang;
  submittedAt: string;
  contact: { name: string; email: string; company?: string };
  subject: string;
  message: string;
  /** Machine-readable details (ids), e.g. services, situation, scope, timeline, budget. */
  details?: Record<string, string | string[]>;
  /** Human-readable summary lines (label: value) for ticket descriptions or emails. */
  summary?: string[];
  pageUrl?: string;
}

export type InquiryResult = 'sent' | 'mailto' | 'failed';

@Injectable({ providedIn: 'root' })
export class InquiryService {
  private config = inject(INQUIRY_CONFIG);
  private doc = inject(DOCUMENT);

  get usesEndpoint(): boolean { return !!this.config.endpoint; }
  get email(): string { return this.config.email; }

  buildMailto(p: InquiryPayload): string {
    const lines = [
      `${p.contact.name} <${p.contact.email}>${p.contact.company ? ' – ' + p.contact.company : ''}`,
      '',
      ...(p.summary ?? []),
      ...(p.summary?.length ? [''] : []),
      p.message,
    ];
    return `mailto:${this.config.email}?subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(lines.join('\n').trim())}`;
  }

  /** Navigation hook – overridable in tests. */
  openMail(href: string): void { const w = this.doc.defaultView; if (w) w.location.href = href; }

  async submit(p: InquiryPayload): Promise<InquiryResult> {
    if (!this.config.endpoint) { this.openMail(this.buildMailto(p)); return 'mailto'; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.config.timeoutMs);
    try {
      if (this.config.mode === 'no-cors') {
        // Simple request (no preflight); response is opaque, so a resolved fetch counts as sent.
        await fetch(this.config.endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(p), signal: ctrl.signal });
        return 'sent';
      }
      const res = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(p),
        signal: ctrl.signal,
      });
      return res.ok ? 'sent' : 'failed';
    } catch {
      return 'failed';
    } finally {
      clearTimeout(timer);
    }
  }
}
