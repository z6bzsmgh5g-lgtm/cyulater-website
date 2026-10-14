import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

function mockPrefersLight(light: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('light') ? light : false, media: q, addEventListener() {}, removeEventListener() {} }));
}

describe('ThemeService', () => {
  beforeEach(() => { localStorage.clear(); TestBed.resetTestingModule(); });
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to dark without preference', () => {
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });

  it('follows the OS light preference', () => {
    mockPrefersLight(true);
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });

  it('prefers a stored choice', () => {
    mockPrefersLight(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });

  it('toggles, persists and applies data-theme + theme-color', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color'; document.head.appendChild(meta);
    const s = TestBed.inject(ThemeService);
    s.toggle();
    TestBed.tick();
    expect(s.theme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(meta.getAttribute('content')).toBe('#f7f5fb');
    s.toggle();
    TestBed.tick();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    meta.remove();
  });

  it('uses view transitions when available', () => {
    const start = vi.fn((cb: () => void) => cb());
    (document as unknown as { startViewTransition: unknown }).startViewTransition = start;
    const s = TestBed.inject(ThemeService);
    s.set('light');
    expect(start).toHaveBeenCalledOnce();
    expect(s.theme()).toBe('light');
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });
});
