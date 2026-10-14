import { TestBed } from '@angular/core/testing';
import { CommandPaletteComponent } from './command-palette.component';
import { I18nService } from '../i18n/i18n.service';
import { ThemeService } from '../core/theme.service';

describe('CommandPaletteComponent', () => {
  async function render() {
    localStorage.clear();
    TestBed.inject(I18nService).setLang('de');
    const f = TestBed.createComponent(CommandPaletteComponent);
    const nav: string[] = [];
    f.componentInstance.navigate.subscribe(id => nav.push(id));
    await f.whenStable();
    return { f, c: f.componentInstance, el: f.nativeElement as HTMLElement, nav };
  }
  const key = (k: string, extra: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra });

  it('is closed initially and opens with Ctrl+K / Cmd+K', async () => {
    const { f, el } = await render();
    expect(el.querySelector('[role=dialog]')).toBeNull();
    const ev = key('k', { ctrlKey: true });
    document.dispatchEvent(ev);
    await f.whenStable();
    expect(ev.defaultPrevented).toBe(true);
    expect(el.querySelector('[role=dialog]')).not.toBeNull();
    document.dispatchEvent(key('K', { metaKey: true }));
    await f.whenStable();
    expect(el.querySelector('[role=dialog]')).toBeNull();
  });

  it('focuses the search input and lists navigation + actions', async () => {
    const { f, c, el } = await render();
    c.show();
    await f.whenStable();
    await Promise.resolve();
    expect(document.activeElement).toBe(el.querySelector('input'));
    expect(el.querySelectorAll('[role=option]').length).toBe(13);
    expect(el.querySelectorAll('.palette__group').length).toBe(2);
  });

  it('filters by query and shows an empty state', async () => {
    const { f, c, el } = await render();
    c.show();
    c.onInput('faq');
    await f.whenStable();
    expect(el.querySelectorAll('[role=option]').length).toBe(1);
    c.onInput('zzzz');
    await f.whenStable();
    expect(el.querySelector('.palette__empty')).not.toBeNull();
  });

  it('navigates with arrow keys and Enter, emitting the section id', async () => {
    const { f, c, el, nav } = await render();
    c.show();
    await f.whenStable();
    const input = el.querySelector('input')!;
    input.dispatchEvent(key('ArrowDown'));
    await f.whenStable();
    expect(input.getAttribute('aria-activedescendant')).toBe('nav-demo');
    input.dispatchEvent(key('ArrowUp'));
    input.dispatchEvent(key('ArrowUp'));
    await f.whenStable();
    expect(c.activeId()).toBe('act-mail');
    input.dispatchEvent(key('ArrowDown'));
    input.dispatchEvent(key('Enter'));
    await f.whenStable();
    expect(nav).toEqual(['leistungen']);
    expect(c.open()).toBe(false);
  });

  it('runs actions: switch language and toggle theme', async () => {
    const { f, c } = await render();
    const theme = TestBed.inject(ThemeService);
    const before = theme.theme();
    c.show(); c.onInput('design'); c.execute(c.filtered()[0]);
    expect(theme.theme()).not.toBe(before);
    c.show(); c.onInput('english'); c.execute(c.filtered()[0]);
    await f.whenStable();
    expect(TestBed.inject(I18nService).lang()).toBe('en');
    expect(c.items().find(i => i.id === 'nav-leistungen')?.label).toBe('Services');
  });

  it('closes with Escape and restores focus', async () => {
    const { f, c, el } = await render();
    const btn = document.createElement('button');
    document.body.appendChild(btn); btn.focus();
    c.show();
    await f.whenStable();
    el.querySelector('input')!.dispatchEvent(key('Escape'));
    await f.whenStable();
    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(btn);
    btn.remove();
  });

  it('closes when clicking the backdrop', async () => {
    const { f, c, el } = await render();
    c.show();
    await f.whenStable();
    el.querySelector<HTMLElement>('.palette__backdrop')!.click();
    await f.whenStable();
    expect(c.open()).toBe(false);
  });
});
