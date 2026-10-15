import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { I18nService } from '../i18n/i18n.service';
import { InquiryPayload, InquiryResult, InquiryService } from '../core/inquiry.service';
import { ServiceIcon } from '../i18n/translations';

export type Scope = 'training' | 'poc' | 'project' | 'retainer';
export const WIZARD_STEPS = 4;

/** Multi-step project scoping wizard producing a structured inquiry. */
@Component({
  selector: 'app-scope-wizard',
  imports: [ReactiveFormsModule],
  templateUrl: './scope-wizard.component.html',
})
export class ScopeWizardComponent {
  readonly i18n = inject(I18nService);
  readonly inquiry = inject(InquiryService);
  private heading = viewChild<ElementRef<HTMLElement>>('stepHeading');

  readonly step = signal(0);
  readonly totalSteps = WIZARD_STEPS;
  readonly attempted = signal(false);
  readonly sending = signal(false);
  readonly result = signal<InquiryResult | null>(null);
  readonly services = signal<ServiceIcon[]>([]);

  readonly form = inject(FormBuilder).nonNullable.group({
    situation: ['', Validators.required],
    scope: ['', Validators.required],
    timeline: ['', Validators.required],
    budget: [''],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    company: [''],
    message: [''],
    privacy: [false, Validators.requiredTrue],
  });

  readonly stepLabel = computed(() =>
    this.i18n.t().wizard.stepOf.replace('{n}', String(this.step() + 1)).replace('{total}', String(this.totalSteps)));

  readonly progress = computed(() => ((this.step() + 1) / this.totalSteps) * 100);

  toggleService(id: ServiceIcon): void {
    this.services.update(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  }

  stepValid(i: number): boolean {
    const c = this.form.controls;
    switch (i) {
      case 0: return this.services().length > 0;
      case 1: return c.situation.valid;
      case 2: return c.scope.valid && c.timeline.valid;
      default: return c.name.valid && c.email.valid && c.privacy.valid;
    }
  }

  showError(ctrl: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[ctrl];
    return c.invalid && (c.touched || this.attempted());
  }

  next(): void {
    if (!this.stepValid(this.step())) { this.attempted.set(true); this.markStepTouched(); return; }
    this.attempted.set(false);
    this.go(this.step() + 1);
  }

  back(): void { this.attempted.set(false); this.go(this.step() - 1); }

  private go(i: number): void {
    this.step.set(Math.max(0, Math.min(this.totalSteps - 1, i)));
    queueMicrotask(() => this.heading()?.nativeElement.focus({ preventScroll: true }));
  }

  private markStepTouched(): void {
    const c = this.form.controls;
    const map: Record<number, (keyof typeof c)[]> = { 1: ['situation'], 2: ['scope', 'timeline'], 3: ['name', 'email', 'privacy'] };
    (map[this.step()] ?? []).forEach(k => c[k].markAsTouched());
  }

  private labelOf(list: { id: string; label: string }[], id: string): string { return list.find(o => o.id === id)?.label ?? id; }

  readonly recommendation = computed(() => {
    // Recompute on language change; scope is read from the form at call time via signal below.
    const rec = this.i18n.t().wizard.recommendations;
    const scope = this.scopeValue() as Scope;
    return scope ? rec[scope] : '';
  });
  readonly scopeValue = signal('');

  constructor() {
    this.form.controls.scope.valueChanges.subscribe(v => this.scopeValue.set(v));
  }

  summaryLines(): string[] {
    const t = this.i18n.t();
    const w = t.wizard, v = this.form.getRawValue();
    const svc = this.services().map(id => t.services.items.find(s => s.icon === id)?.title ?? id).join(', ');
    return [
      `${w.steps[0]}: ${svc}`,
      `${w.steps[1]}: ${this.labelOf(w.situations, v.situation)}`,
      `${w.scopeQ.replace(/\?$/, '')}: ${this.labelOf(w.scopes, v.scope)}`,
      `${w.timelineQ}: ${this.labelOf(w.timelines, v.timeline)}`,
      ...(v.budget ? [`${w.budgetQ.replace(/ \(.*\)$/, '')}: ${this.labelOf(w.budgets, v.budget)}`] : []),
      ...(this.recommendation() ? [`${w.recommendation}: ${this.recommendation()}`] : []),
    ];
  }

  buildPayload(): InquiryPayload {
    const v = this.form.getRawValue();
    const t = this.i18n.t();
    const svcTitles = this.services().map(id => t.services.items.find(s => s.icon === id)?.title ?? id);
    return {
      schemaVersion: 1, source: 'project-wizard', type: 'projekt-check', lang: this.i18n.lang(), submittedAt: new Date().toISOString(),
      contact: { name: v.name.trim(), email: v.email.trim(), ...(v.company.trim() ? { company: v.company.trim() } : {}) },
      subject: `${t.wizard.eyebrow}: ${svcTitles.join(', ')} – ${v.name.trim()}`,
      message: v.message.trim(),
      details: { services: [...this.services()], situation: v.situation, scope: v.scope, timeline: v.timeline, ...(v.budget ? { budget: v.budget } : {}) },
      summary: this.summaryLines(),
      pageUrl: typeof location !== 'undefined' ? location.href : undefined,
    };
  }

  async submit(): Promise<void> {
    if (!this.stepValid(3)) { this.attempted.set(true); this.markStepTouched(); return; }
    if (this.sending()) return;
    this.sending.set(true);
    try { this.result.set(await this.inquiry.submit(this.buildPayload())); }
    finally { this.sending.set(false); }
  }

  mailtoHref(): string { return this.inquiry.buildMailto(this.buildPayload()); }

  restart(): void {
    this.form.reset(); this.services.set([]); this.result.set(null); this.attempted.set(false); this.go(0);
  }
}
