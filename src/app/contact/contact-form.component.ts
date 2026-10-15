import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { I18nService } from '../i18n/i18n.service';
import { InquiryPayload, InquiryResult, InquiryService, InquiryType } from '../core/inquiry.service';

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
})
export class ContactFormComponent {
  readonly i18n = inject(I18nService);
  readonly inquiry = inject(InquiryService);
  readonly email = this.inquiry.email;
  readonly submitted = signal(false);
  readonly sending = signal(false);
  readonly result = signal<InquiryResult | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    company: [''],
    type: ['kontakt' as InquiryType],
    /** Honeypot – hidden from humans; bots that fill it are silently dropped. */
    website: [''],
    topic: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
    privacy: [false, Validators.requiredTrue],
  });

  showError(ctrl: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[ctrl];
    return c.invalid && (c.touched || this.submitted());
  }

  buildPayload(): InquiryPayload {
    const v = this.form.getRawValue();
    const t = this.i18n.t().contact;
    return {
      schemaVersion: 1, source: 'contact-form', type: v.type, lang: this.i18n.lang(), submittedAt: new Date().toISOString(),
      contact: { name: v.name.trim(), email: v.email.trim(), ...(v.company.trim() ? { company: v.company.trim() } : {}) },
      subject: `${t.types[v.type]}${v.topic ? ': ' + v.topic : ''} – ${v.name.trim()}`,
      message: v.message.trim(),
      details: { type: v.type, ...(v.topic ? { topic: v.topic } : {}) },
      summary: [`${t.type}: ${t.types[v.type]}`, ...(v.topic ? [`${t.topic}: ${v.topic}`] : [])],
      pageUrl: typeof location !== 'undefined' ? location.href : undefined,
    };
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.sending()) { this.result.set(null); return; }
    if (this.form.controls.website.value) { this.result.set('sent'); this.form.reset(); this.submitted.set(false); return; }
    this.sending.set(true);
    try { this.result.set(await this.inquiry.submit(this.buildPayload())); }
    finally { this.sending.set(false); }
    if (this.result() === 'sent') { this.form.reset(); this.submitted.set(false); }
  }
}
