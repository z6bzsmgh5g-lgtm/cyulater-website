import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { I18nService, LANG_STORAGE_KEY, isLang } from './i18n.service';
import { LANGS, TRANSLATIONS, Dict } from './translations';

function setNavigatorLanguages(langs: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(langs);
}

describe('I18nService', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  it('isLang validates codes', () => {
    expect(isLang('de')).toBe(true);
    expect(isLang('en')).toBe(true);
    expect(isLang('fr')).toBe(false);
    expect(isLang(null)).toBe(false);
  });

  it('detects English from the browser language', () => {
    setNavigatorLanguages(['en-US', 'de']);
    expect(TestBed.inject(I18nService).lang()).toBe('en');
  });

  it('detects German from the browser language', () => {
    setNavigatorLanguages(['de-AT']);
    expect(TestBed.inject(I18nService).lang()).toBe('de');
  });

  it('falls back to German for unsupported browser languages', () => {
    setNavigatorLanguages(['fr-FR', 'es']);
    expect(TestBed.inject(I18nService).lang()).toBe('de');
  });

  it('prefers a stored choice over the browser language', () => {
    setNavigatorLanguages(['de-DE']);
    localStorage.setItem(LANG_STORAGE_KEY, 'en');
    expect(TestBed.inject(I18nService).lang()).toBe('en');
  });

  it('ignores invalid stored values', () => {
    setNavigatorLanguages(['de-DE']);
    localStorage.setItem(LANG_STORAGE_KEY, 'xx');
    expect(TestBed.inject(I18nService).lang()).toBe('de');
  });

  it('persists the choice and exposes the matching dictionary', () => {
    const s = TestBed.inject(I18nService);
    s.setLang('en');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
    expect(s.t()).toBe(TRANSLATIONS.en);
    s.setLang('de');
    expect(s.t().nav.services).toBe('Leistungen');
  });

  it('ignores unsupported languages in setLang', () => {
    const s = TestBed.inject(I18nService);
    s.setLang('de');
    s.setLang('fr' as never);
    expect(s.lang()).toBe('de');
  });

  it('updates <html lang>, title and meta tags', () => {
    const s = TestBed.inject(I18nService);
    s.setLang('en');
    TestBed.tick();
    expect(document.documentElement.lang).toBe('en');
    expect(TestBed.inject(Title).getTitle()).toBe(TRANSLATIONS.en.meta.title);
    const meta = TestBed.inject(Meta);
    expect(meta.getTag('name="description"')?.content).toBe(TRANSLATIONS.en.meta.description);
    expect(meta.getTag('property="og:locale"')?.content).toBe('en_US');
    s.setLang('de');
    TestBed.tick();
    expect(document.documentElement.lang).toBe('de');
    expect(meta.getTag('property="og:title"')?.content).toBe(TRANSLATIONS.de.meta.title);
  });

  it('has identical structure for every language (no missing keys)', () => {
    const shape = (o: unknown): unknown =>
      Array.isArray(o) ? o.map(shape) : o && typeof o === 'object'
        ? Object.fromEntries(Object.keys(o).sort().map(k => [k, shape((o as Record<string, unknown>)[k])])) : typeof o;
    const ref = shape(TRANSLATIONS.de);
    for (const l of LANGS) expect(shape(TRANSLATIONS[l] as Dict), l).toEqual(ref);
  });

  it('has no empty strings in any language', () => {
    const walk = (o: unknown, path: string): string[] =>
      typeof o === 'string' ? (o.trim() ? [] : [path])
        : o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => walk(v, `${path}.${k}`)) : [];
    for (const l of LANGS) expect(walk(TRANSLATIONS[l], l)).toEqual([]);
  });
});
