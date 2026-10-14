import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { I18nService } from '../i18n/i18n.service';

/** PLATZHALTER / PLACEHOLDER: echte Kontakt-E-Mail-Adresse hier eintragen. */
export const CONTACT_EMAIL = 'kontakt@example.com';

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
})
export class ContactFormComponent {
  readonly i18n = inject(I18nService);
  readonly email = CONTACT_EMAIL;
  readonly submitted = signal(false);
  readonly sent = signal(false);

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

  buildMailto(): string {
    const v = this.form.getRawValue();
    const t = this.i18n.t().contact;
    const subject = `${t.submit}${v.topic ? ': ' + v.topic : ''} – ${v.name}`;
    const body = `${t.name}: ${v.name}\n${t.email}: ${v.email}\n${t.company}: ${v.company}\n${t.topic}: ${v.topic}\n\n${v.message}`;
    return `mailto:${this.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  /** Navigation hook (overridable in tests). */
  openMail(href: string): void { window.location.href = href; }

  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.sent.set(false); return; }
    this.openMail(this.buildMailto());
    this.sent.set(true);
  }
}
