import { TestBed } from '@angular/core/testing';
import { LangSwitcherComponent } from './lang-switcher.component';
import { I18nService, LANG_STORAGE_KEY } from '../i18n/i18n.service';

describe('LangSwitcherComponent', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({ imports: [LangSwitcherComponent] }); });

  it('renders a button per language with aria-pressed state', async () => {
    TestBed.inject(I18nService).setLang('de');
    const f = TestBed.createComponent(LangSwitcherComponent);
    await f.whenStable();
    const btns = (f.nativeElement as HTMLElement).querySelectorAll('button');
    expect([...btns].map(b => b.textContent?.trim())).toEqual(['DE', 'EN']);
    expect(btns[0].getAttribute('aria-pressed')).toBe('true');
    expect(btns[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('switches language on click and persists it', async () => {
    const i18n = TestBed.inject(I18nService);
    i18n.setLang('de');
    const f = TestBed.createComponent(LangSwitcherComponent);
    await f.whenStable();
    (f.nativeElement as HTMLElement).querySelectorAll('button')[1].click();
    await f.whenStable();
    expect(i18n.lang()).toBe('en');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect((f.nativeElement as HTMLElement).querySelectorAll('button')[1].getAttribute('aria-pressed')).toBe('true');
  });
});
