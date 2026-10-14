import { Component, ElementRef, computed, effect, inject, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { ThemeService } from '../core/theme.service';
import { InquiryService } from '../core/inquiry.service';

export interface PaletteItem { id: string; label: string; group: 'nav' | 'action'; run: () => void; }

/** Ctrl/Cmd+K command palette for keyboard-first navigation. */
@Component({
  selector: 'app-command-palette',
  templateUrl: './command-palette.component.html',
  host: { '(document:keydown)': 'onGlobalKey($event)' },
})
export class CommandPaletteComponent {
  readonly i18n = inject(I18nService);
  private theme = inject(ThemeService);
  private inquiry = inject(InquiryService);
  readonly navigate = output<string>();

  readonly open = signal(false);
  readonly query = signal('');
  readonly activeIndex = signal(0);
  private input = viewChild<ElementRef<HTMLInputElement>>('search');
  private returnFocus: HTMLElement | null = null;

  constructor() {
    effect(() => { if (this.open()) queueMicrotask(() => this.input()?.nativeElement.focus()); });
  }

  readonly items = computed<PaletteItem[]>(() => {
    const t = this.i18n.t();
    const nav: [string, string][] = [
      ['leistungen', t.nav.services], ['demo', t.nav.demo], ['vorgehen', t.nav.process], ['arbeitsweise', t.why.eyebrow],
      ['technologien', t.tech.eyebrow], ['projekt-check', t.nav.scoping], ['faq', t.nav.faq], ['kontakt', t.nav.contact],
    ];
    return [
      ...nav.map(([id, label]) => ({ id: 'nav-' + id, label, group: 'nav' as const, run: () => this.navigate.emit(id) })),
      { id: 'act-top', label: t.palette.actTop, group: 'action', run: () => this.navigate.emit('start') },
      { id: 'act-wizard', label: t.palette.actWizard, group: 'action', run: () => this.navigate.emit('projekt-check') },
      { id: 'act-lang', label: t.palette.actLang, group: 'action', run: () => this.i18n.setLang(this.i18n.lang() === 'de' ? 'en' : 'de') },
      { id: 'act-theme', label: t.palette.actTheme, group: 'action', run: () => this.theme.toggle() },
      { id: 'act-mail', label: t.palette.actMail, group: 'action', run: () => this.inquiry.openMail('mailto:' + this.inquiry.email) },
    ];
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.items().filter(i => i.label.toLowerCase().includes(q)) : this.items();
  });

  readonly activeId = computed(() => this.filtered()[this.activeIndex()]?.id ?? null);

  show(): void {
    this.returnFocus = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
    this.query.set(''); this.activeIndex.set(0); this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    this.returnFocus?.focus?.();
  }

  onGlobalKey(ev: KeyboardEvent): void {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      if (this.open()) this.close(); else this.show();
    }
  }

  onInput(v: string): void { this.query.set(v); this.activeIndex.set(0); }

  onKey(ev: KeyboardEvent): void {
    const n = this.filtered().length;
    switch (ev.key) {
      case 'ArrowDown': ev.preventDefault(); if (n) this.activeIndex.set((this.activeIndex() + 1) % n); break;
      case 'ArrowUp': ev.preventDefault(); if (n) this.activeIndex.set((this.activeIndex() - 1 + n) % n); break;
      case 'Enter': ev.preventDefault(); { const it = this.filtered()[this.activeIndex()]; if (it) this.execute(it); } break;
      case 'Escape': ev.preventDefault(); this.close(); break;
      case 'Tab': ev.preventDefault(); break; // keep focus inside the dialog
    }
  }

  execute(item: PaletteItem): void {
    this.open.set(false);
    item.run();
  }
}
