import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { I18nService } from '../i18n/i18n.service';
import { InquiryPayload, InquiryResult, InquiryService } from '../core/inquiry.service';

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
      schemaVersion: 1, source: 'contact-form', lang: this.i18n.lang(), submittedAt: new Date().toISOString(),
      contact: { name: v.name.trim(), email: v.email.trim(), ...(v.company.trim() ? { company: v.company.trim() } : {}) },
      subject: `${t.submit}${v.topic ? ': ' + v.topic : ''} – ${v.name.trim()}`,
      message: v.message.trim(),
      details: v.topic ? { topic: v.topic } : {},
      summary: v.topic ? [`${t.topic}: ${v.topic}`] : [],
      pageUrl: typeof location !== 'undefined' ? location.href : undefined,
    };
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.sending()) { this.result.set(null); return; }
    this.sending.set(true);
    try { this.result.set(await this.inquiry.submit(this.buildPayload())); }
    finally { this.sending.set(false); }
    if (this.result() === 'sent') { this.form.reset(); this.submitted.set(false); }
  }
}
