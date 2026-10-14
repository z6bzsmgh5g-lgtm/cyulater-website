import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

export type Theme = 'dark' | 'light';
export const THEME_STORAGE_KEY = 'cyulater.theme';
const THEME_COLORS: Record<Theme, string> = { dark: '#0a0811', light: '#f7f5fb' };

/** Dark/light theme with persisted choice and OS preference detection. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private doc = inject(DOCUMENT);
  readonly theme = signal<Theme>(this.detect());

  constructor() {
    effect(() => {
      const t = this.theme();
      this.doc.documentElement.dataset['theme'] = t;
      this.doc.documentElement.style.colorScheme = t;
      this.doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[t]);
    });
  }

  detect(): Theme {
    const w = this.doc.defaultView;
    try {
      const s = w?.localStorage.getItem(THEME_STORAGE_KEY);
      if (s === 'dark' || s === 'light') return s;
    } catch { /* ignore */ }
    return typeof w?.matchMedia === 'function' && w.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  set(t: Theme): void {
    const apply = () => this.theme.set(t);
    const d = this.doc as Document & { startViewTransition?: (cb: () => void) => unknown };
    const reduce = typeof this.doc.defaultView?.matchMedia === 'function' && this.doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof d.startViewTransition === 'function' && !reduce) d.startViewTransition(apply); else apply();
    try { this.doc.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, t); } catch { /* ignore */ }
  }

  toggle(): void { this.set(this.theme() === 'dark' ? 'light' : 'dark'); }
}
