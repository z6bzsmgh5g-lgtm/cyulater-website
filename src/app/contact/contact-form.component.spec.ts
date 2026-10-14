import { TestBed } from '@angular/core/testing';
import { ContactFormComponent, CONTACT_EMAIL } from './contact-form.component';
import { I18nService } from '../i18n/i18n.service';
import { TRANSLATIONS } from '../i18n/translations';

describe('ContactFormComponent', () => {
  let comp: ContactFormComponent;
  let el: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<ContactFormComponent>>;
  let opened: string[];

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [ContactFormComponent] });
    TestBed.inject(I18nService).setLang('de');
    fixture = TestBed.createComponent(ContactFormComponent);
    comp = fixture.componentInstance;
    opened = [];
    comp.openMail = (h: string) => { opened.push(h); };
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  const fillValid = () => comp.form.setValue({ name: 'Max Muster', email: 'max@firma.de', company: 'Firma GmbH', topic: 'Data Engineering', message: 'Wir brauchen eine Datenpipeline.', privacy: true });

  it('starts invalid and shows no errors before interaction', () => {
    expect(comp.form.invalid).toBe(true);
    expect(el.querySelectorAll('.field__err').length).toBe(0);
  });

  it('validates required fields', () => {
    const c = comp.form.controls;
    expect(c.name.hasError('required')).toBe(true);
    expect(c.email.hasError('required')).toBe(true);
    expect(c.message.hasError('required')).toBe(true);
    expect(c.privacy.hasError('required')).toBe(true);
    expect(c.company.valid).toBe(true);
    expect(c.topic.valid).toBe(true);
  });

  it('validates email format', () => {
    comp.form.controls.email.setValue('kein-email');
    expect(comp.form.controls.email.hasError('email')).toBe(true);
    comp.form.controls.email.setValue('a@b.de');
    expect(comp.form.controls.email.valid).toBe(true);
  });

  it('requires a minimum message length', () => {
    comp.form.controls.message.setValue('kurz');
    expect(comp.form.controls.message.hasError('minlength')).toBe(true);
  });

  it('shows errors and does not open mail when submitting invalid form', async () => {
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    expect(opened.length).toBe(0);
    expect(el.querySelector('.form__error')?.textContent).toContain(TRANSLATIONS.de.contact.errSummary);
    expect(el.querySelectorAll('.field__err').length).toBe(4);
    expect(el.querySelector('#cf-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(comp.sent()).toBe(false);
  });

  it('opens a prefilled mailto link on valid submit', async () => {
    fillValid();
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    expect(opened.length).toBe(1);
    expect(opened[0].startsWith(`mailto:${CONTACT_EMAIL}?subject=`)).toBe(true);
    expect(decodeURIComponent(opened[0])).toContain('Max Muster');
    expect(decodeURIComponent(opened[0])).toContain('Wir brauchen eine Datenpipeline.');
    expect(comp.sent()).toBe(true);
    expect(el.querySelector('.form__ok')).not.toBeNull();
  });

  it('translates labels and errors when the language changes', async () => {
    TestBed.inject(I18nService).setLang('en');
    comp.submit();
    await fixture.whenStable();
    expect(el.querySelector('label[for=cf-email]')?.textContent).toContain('Email');
    expect(el.querySelector('#cf-email-err')?.textContent).toContain(TRANSLATIONS.en.contact.errEmail);
  });
});
