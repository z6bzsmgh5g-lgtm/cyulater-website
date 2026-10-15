import { TestBed } from '@angular/core/testing';
import { ContactFormComponent } from './contact-form.component';
import { I18nService } from '../i18n/i18n.service';
import { TRANSLATIONS } from '../i18n/translations';
import { INQUIRY_CONFIG, InquiryService } from '../core/inquiry.service';

function setup(endpoint = '') {
  TestBed.configureTestingModule({
    imports: [ContactFormComponent],
    providers: [{ provide: INQUIRY_CONFIG, useValue: { endpoint, email: 'test@example.com', timeoutMs: 1000 } }],
  });
  TestBed.inject(I18nService).setLang('de');
  const opened: string[] = [];
  TestBed.inject(InquiryService).openMail = (h: string) => { opened.push(h); };
  const fixture = TestBed.createComponent(ContactFormComponent);
  return { fixture, comp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, opened };
}

const valid = { name: 'Max Muster', email: 'max@firma.de', company: 'Firma GmbH', type: 'kontakt' as const, website: '', topic: 'Data Engineering', message: 'Wir brauchen eine Datenpipeline.', privacy: true };

describe('ContactFormComponent', () => {
  it('maps the request type to source/type and the Jira label; support option exists', async () => {
    const { fixture, comp, el } = setup('https://api.example.com/inquiries');
    await fixture.whenStable();
    expect([...el.querySelectorAll('#cf-type option')].map(o => (o as HTMLOptionElement).value)).toEqual(['kontakt', 'projekt-check', 'support']);
    comp.form.setValue({ ...valid, type: 'support' });
    const p = comp.buildPayload();
    expect(p.source).toBe('contact-form');
    expect(p.type).toBe('support');
    expect(p.subject).toContain('Support');
  });

  it('silently drops submissions with a filled honeypot', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { fixture, comp } = setup('https://api.example.com/inquiries');
    await fixture.whenStable();
    comp.form.setValue({ ...valid, website: 'http://spam.example' });
    await comp.submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(comp.result()).toBe('sent');
  });

  afterEach(() => vi.unstubAllGlobals());

  it('starts invalid and shows no errors before interaction', async () => {
    const { fixture, comp, el } = setup();
    await fixture.whenStable();
    expect(comp.form.invalid).toBe(true);
    expect(el.querySelectorAll('.field__err').length).toBe(0);
  });

  it('validates required fields', () => {
    const { comp } = setup();
    const c = comp.form.controls;
    expect(c.name.hasError('required')).toBe(true);
    expect(c.email.hasError('required')).toBe(true);
    expect(c.message.hasError('required')).toBe(true);
    expect(c.privacy.hasError('required')).toBe(true);
    expect(c.company.valid && c.topic.valid).toBe(true);
  });

  it('validates email format and message length', () => {
    const { comp } = setup();
    comp.form.controls.email.setValue('kein-email');
    expect(comp.form.controls.email.hasError('email')).toBe(true);
    comp.form.controls.email.setValue('a@b.de');
    expect(comp.form.controls.email.valid).toBe(true);
    comp.form.controls.message.setValue('kurz');
    expect(comp.form.controls.message.hasError('minlength')).toBe(true);
  });

  it('shows errors and does not submit when invalid', async () => {
    const { fixture, comp, el, opened } = setup();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    expect(opened.length).toBe(0);
    expect(el.querySelector('.form__error')?.textContent).toContain(TRANSLATIONS.de.contact.errSummary);
    expect(el.querySelectorAll('.field__err').length).toBe(4);
    expect(el.querySelector('#cf-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(comp.result()).toBeNull();
  });

  it('falls back to a prefilled mailto link when no endpoint is configured', async () => {
    const { fixture, comp, el, opened } = setup('');
    comp.form.setValue(valid);
    await comp.submit();
    await fixture.whenStable();
    expect(opened.length).toBe(1);
    expect(opened[0].startsWith('mailto:test@example.com?subject=')).toBe(true);
    expect(decodeURIComponent(opened[0])).toContain('Max Muster');
    expect(decodeURIComponent(opened[0])).toContain('Wir brauchen eine Datenpipeline.');
    expect(comp.result()).toBe('mailto');
    expect(el.querySelector('.form__ok')).not.toBeNull();
  });

  it('posts JSON to the configured endpoint and resets on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { fixture, comp, el, opened } = setup('https://api.example.com/inquiries');
    comp.form.setValue(valid);
    await comp.submit();
    await fixture.whenStable();
    expect(opened.length).toBe(0);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/inquiries');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ schemaVersion: 1, source: 'contact-form', lang: 'de', contact: { name: 'Max Muster', email: 'max@firma.de', company: 'Firma GmbH' }, details: { type: 'kontakt', topic: 'Data Engineering' }, type: 'kontakt', labels: ['website-anfrage', 'anfrage-kontakt'] });
    expect(comp.result()).toBe('sent');
    expect(comp.form.controls.name.value).toBe('');
    expect(el.querySelector('.form__ok')?.textContent).toContain(TRANSLATIONS.de.contact.sent);
  });

  it('shows a mailto fallback message when the endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { fixture, comp, el } = setup('https://api.example.com/inquiries');
    comp.form.setValue(valid);
    await comp.submit();
    await fixture.whenStable();
    expect(comp.result()).toBe('failed');
    expect(el.querySelector('.form__error a')?.getAttribute('href')).toBe('mailto:test@example.com');
  });

  it('translates labels and errors when the language changes', async () => {
    const { fixture, comp, el } = setup();
    TestBed.inject(I18nService).setLang('en');
    await comp.submit();
    await fixture.whenStable();
    expect(el.querySelector('label[for=cf-email]')?.textContent).toContain('Email');
    expect(el.querySelector('#cf-email-err')?.textContent).toContain(TRANSLATIONS.en.contact.errEmail);
  });
});
