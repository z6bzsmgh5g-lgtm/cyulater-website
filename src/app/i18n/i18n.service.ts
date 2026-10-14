import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DEFAULT_LANG, Dict, LANGS, Lang, TRANSLATIONS } from './translations';

export const LANG_STORAGE_KEY = 'cyulater.lang';

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v);
}

/** Lightweight signal-based runtime translation service. */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private doc = inject(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);

  readonly lang = signal<Lang>(this.detect());
  readonly t = computed<Dict>(() => TRANSLATIONS[this.lang()]);
  readonly languages = LANGS;

  constructor() {
    effect(() => this.apply(this.lang()));
  }

  setLang(lang: Lang): void {
    if (!isLang(lang)) return;
    this.lang.set(lang);
    try { this.doc.defaultView?.localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /* storage unavailable */ }
  }

  /** Priority: ?lang= query param, stored choice, browser languages, default. */
  detect(): Lang {
    const win = this.doc.defaultView;
    try {
      const q = new URLSearchParams(win?.location.search ?? '').get('lang');
      if (isLang(q)) return q;
      const stored = win?.localStorage.getItem(LANG_STORAGE_KEY);
      if (isLang(stored)) return stored;
    } catch { /* ignore */ }
    const prefs = win?.navigator.languages?.length ? win.navigator.languages : [win?.navigator.language ?? ''];
    for (const p of prefs) {
      const base = (p || '').toLowerCase().split('-')[0];
      if (isLang(base)) return base;
    }
    return DEFAULT_LANG;
  }

  private apply(lang: Lang): void {
    const d = TRANSLATIONS[lang];
    this.doc.documentElement.lang = lang;
    this.title.setTitle(d.meta.title);
    this.meta.updateTag({ name: 'description', content: d.meta.description });
    this.meta.updateTag({ property: 'og:title', content: d.meta.title });
    this.meta.updateTag({ property: 'og:description', content: d.meta.description });
    this.meta.updateTag({ property: 'og:locale', content: d.meta.ogLocale });
  }
}
