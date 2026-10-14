import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { I18nService } from './i18n/i18n.service';
import { TRANSLATIONS } from './i18n/translations';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('creates the app', async () => {
    const { fixture } = await render();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders all sections', async () => {
    const { el } = await render();
    for (const id of ['start', 'leistungen', 'vorgehen', 'arbeitsweise', 'technologien', 'faq', 'kontakt']) {
      expect(el.querySelector('#' + id), id).not.toBeNull();
    }
  });

  it('renders six service cards and four process steps', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('.card').length).toBe(6);
    expect(el.querySelectorAll('.step').length).toBe(4);
  });

  it('renders the hero title in the active language and switches at runtime', async () => {
    TestBed.inject(I18nService).setLang('de');
    const { fixture, el } = await render();
    expect(el.querySelector('h1')?.textContent).toContain(TRANSLATIONS.de.hero.title);
    TestBed.inject(I18nService).setLang('en');
    await fixture.whenStable();
    expect(el.querySelector('h1')?.textContent).toContain(TRANSLATIONS.en.hero.title);
    expect(el.querySelector('#main-menu a')?.textContent).toContain('Services');
  });

  it('toggles the mobile menu and closes it on Escape', async () => {
    const { fixture, el } = await render();
    const toggle = el.querySelector<HTMLButtonElement>('.nav__toggle')!;
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('#main-menu')?.classList).toContain('open');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the menu after navigating via a link', async () => {
    const { fixture, el } = await render();
    fixture.componentInstance.menuOpen.set(true);
    el.querySelector<HTMLAnchorElement>('#main-menu a')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.menuOpen()).toBe(false);
  });

  it('opens one FAQ item at a time (accordion)', async () => {
    const { fixture, el } = await render();
    const buttons = el.querySelectorAll<HTMLButtonElement>('.faq__item button');
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    buttons[1].click();
    await fixture.whenStable();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
    buttons[1].click();
    await fixture.whenStable();
    expect(buttons[1].getAttribute('aria-expanded')).toBe('false');
  });

  it('shows the placeholder email note', async () => {
    const { el } = await render();
    expect(el.querySelector('.placeholder-note')?.textContent).toMatch(/Platzhalter|Placeholder/);
  });
});
