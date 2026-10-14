import { TestBed } from '@angular/core/testing';
import { ScopeWizardComponent } from './scope-wizard.component';
import { I18nService } from '../i18n/i18n.service';
import { TRANSLATIONS } from '../i18n/translations';
import { INQUIRY_CONFIG, InquiryService } from '../core/inquiry.service';

function setup(endpoint = '') {
  TestBed.configureTestingModule({
    imports: [ScopeWizardComponent],
    providers: [{ provide: INQUIRY_CONFIG, useValue: { endpoint, email: 'test@example.com', timeoutMs: 1000 } }],
  });
  TestBed.inject(I18nService).setLang('de');
  const opened: string[] = [];
  TestBed.inject(InquiryService).openMail = h => { opened.push(h); };
  const f = TestBed.createComponent(ScopeWizardComponent);
  return { f, c: f.componentInstance, el: f.nativeElement as HTMLElement, opened };
}

async function completeToContact(f: ReturnType<typeof setup>['f']) {
  const c = f.componentInstance;
  c.toggleService('api'); c.toggleService('jira'); c.next();
  c.form.controls.situation.setValue('extend'); c.next();
  c.form.controls.scope.setValue('poc'); c.form.controls.timeline.setValue('1-3'); c.form.controls.budget.setValue('5-15k'); c.next();
  await f.whenStable();
}

describe('ScopeWizardComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts on step 1 of 4 with progress', async () => {
    const { f, c, el } = setup();
    await f.whenStable();
    expect(c.step()).toBe(0);
    expect(el.querySelector('.wizard__count')?.textContent).toContain('Schritt 1 von 4');
    expect(el.querySelectorAll('input[type=checkbox][data-service]').length).toBe(6);
    expect(el.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('1');
  });

  it('blocks advancing without a selected service and shows an error', async () => {
    const { f, c, el } = setup();
    await f.whenStable();
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await f.whenStable();
    expect(c.step()).toBe(0);
    expect(el.querySelector('.field__err')?.textContent).toContain(TRANSLATIONS.de.wizard.servicesErr);
  });

  it('toggles services via checkboxes and advances', async () => {
    const { f, c, el } = setup();
    await f.whenStable();
    el.querySelector<HTMLInputElement>('input[data-service=data]')!.click();
    await f.whenStable();
    expect(c.services()).toEqual(['data']);
    el.querySelector<HTMLInputElement>('input[data-service=data]')!.click();
    expect(c.services()).toEqual([]);
    c.toggleService('ai');
    c.next();
    await f.whenStable();
    expect(c.step()).toBe(1);
  });

  it('requires situation, scope and timeline; budget is optional', async () => {
    const { f, c } = setup();
    c.toggleService('ai'); c.next();
    c.next();
    expect(c.step()).toBe(1);
    c.form.controls.situation.setValue('new'); c.next();
    expect(c.step()).toBe(2);
    c.form.controls.scope.setValue('training'); c.next();
    expect(c.step()).toBe(2);
    c.form.controls.timeline.setValue('asap'); c.next();
    expect(c.step()).toBe(3);
    await f.whenStable();
  });

  it('shows a recommendation matching the chosen scope', async () => {
    const { f, c, el } = setup();
    c.toggleService('ai'); c.next(); c.form.controls.situation.setValue('new'); c.next();
    c.form.controls.scope.setValue('project');
    await f.whenStable();
    expect(el.querySelector('.wizard__rec')?.textContent).toContain(TRANSLATIONS.de.wizard.recommendations.project);
  });

  it('goes back without losing answers', async () => {
    const { f, c } = setup();
    await completeToContact(f);
    expect(c.step()).toBe(3);
    c.back(); c.back();
    expect(c.step()).toBe(1);
    expect(c.form.controls.situation.value).toBe('extend');
    expect(c.services()).toEqual(['api', 'jira']);
  });

  it('builds a structured payload and summary', async () => {
    const { f, c } = setup();
    await completeToContact(f);
    c.form.patchValue({ name: 'Erika', email: 'erika@firma.de', company: 'Firma', message: 'Shop an ERP anbinden', privacy: true });
    const p = c.buildPayload();
    expect(p).toMatchObject({
      schemaVersion: 1, source: 'project-wizard', lang: 'de',
      contact: { name: 'Erika', email: 'erika@firma.de', company: 'Firma' },
      details: { services: ['api', 'jira'], situation: 'extend', scope: 'poc', timeline: '1-3', budget: '5-15k' },
      message: 'Shop an ERP anbinden',
    });
    expect(p.subject).toContain('Schnittstellen & APIs');
    expect(p.summary!.join('\n')).toContain('Proof of Concept');
    expect(p.summary!.join('\n')).toContain('5.000 – 15.000 €');
    expect(p.summary!.join('\n')).toContain(TRANSLATIONS.de.wizard.recommendations.poc);
  });

  it('validates the contact step before submitting', async () => {
    const { f, c, el, opened } = setup();
    await completeToContact(f);
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await f.whenStable();
    expect(opened.length).toBe(0);
    expect(el.querySelectorAll('.field__err').length).toBe(3);
    expect(c.result()).toBeNull();
  });

  it('falls back to mailto and shows confirmation; restart resets', async () => {
    const { f, c, el, opened } = setup('');
    await completeToContact(f);
    c.form.patchValue({ name: 'Erika', email: 'erika@firma.de', privacy: true });
    await c.submit();
    await f.whenStable();
    expect(opened.length).toBe(1);
    expect(decodeURIComponent(opened[0])).toContain('Proof of Concept');
    expect(el.querySelector('.wizard__done')?.textContent).toContain(TRANSLATIONS.de.wizard.mailto);
    el.querySelector<HTMLButtonElement>('.wizard__done button')!.click();
    await f.whenStable();
    expect(c.step()).toBe(0);
    expect(c.services()).toEqual([]);
    expect(c.result()).toBeNull();
  });

  it('posts to the endpoint and shows a fallback link on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const { f, c, el } = setup('https://api.example.com/inquiry');
    await completeToContact(f);
    c.form.patchValue({ name: 'Erika', email: 'erika@firma.de', privacy: true });
    await c.submit();
    await f.whenStable();
    expect(c.result()).toBe('failed');
    expect(el.querySelector('.form__error a')?.getAttribute('href')).toMatch(/^mailto:test@example\.com\?subject=/);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    await c.submit();
    await f.whenStable();
    expect(el.querySelector('.wizard__done')?.textContent).toContain(TRANSLATIONS.de.wizard.sent);
  });

  it('translates at runtime', async () => {
    const { f, el } = setup();
    TestBed.inject(I18nService).setLang('en');
    await f.whenStable();
    expect(el.querySelector('.wizard__count')?.textContent).toContain('Step 1 of 4');
    expect(el.textContent).toContain('Software Development');
  });
});
