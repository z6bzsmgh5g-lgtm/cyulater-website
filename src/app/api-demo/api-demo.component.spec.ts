import { TestBed } from '@angular/core/testing';
import { ApiDemoComponent } from './api-demo.component';
import { DEMO_CALLS, tokenizeJson } from './api-demo.data';
import { I18nService } from '../i18n/i18n.service';
import { TRANSLATIONS } from '../i18n/translations';

describe('tokenizeJson', () => {
  it('round-trips to the pretty-printed JSON and classifies tokens', () => {
    const v = { a: 'x', n: 1.5, b: true, z: null, arr: [1, 'y'] };
    const toks = tokenizeJson(v);
    expect(toks.map(t => t.text).join('')).toBe(JSON.stringify(v, null, 2));
    expect(toks.find(t => t.text === '"a"')?.cls).toBe('key');
    expect(toks.find(t => t.text === '"x"')?.cls).toBe('str');
    expect(toks.find(t => t.text === '1.5')?.cls).toBe('num');
    expect(toks.find(t => t.text === 'true')?.cls).toBe('lit');
    expect(toks.find(t => t.text === 'null')?.cls).toBe('lit');
  });

  it('round-trips every demo payload', () => {
    for (const c of DEMO_CALLS) {
      expect(tokenizeJson(c.response).map(t => t.text).join('')).toBe(JSON.stringify(c.response, null, 2));
    }
  });
});

describe('ApiDemoComponent', () => {
  async function render() {
    TestBed.inject(I18nService).setLang('de');
    const f = TestBed.createComponent(ApiDemoComponent);
    f.componentInstance.delayMs = 0;
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement, c: f.componentInstance };
  }

  it('renders one tab per endpoint with the first selected', async () => {
    const { el } = await render();
    const tabs = el.querySelectorAll('[role=tab]');
    expect(tabs.length).toBe(3);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(el.querySelector('.console__idle')?.textContent).toContain(TRANSLATIONS.de.demo.idle);
    expect(el.querySelector('.console__note')?.textContent).toContain('simulierte');
  });

  it('sends a request and shows status + highlighted response', async () => {
    const { f, el, c } = await render();
    c.delayMs = 30;
    el.querySelector<HTMLButtonElement>('.console__actions .btn--primary')!.click();
    f.detectChanges();
    expect(c.state()).toBe('loading');
    expect(el.querySelector('[aria-busy=true]')).not.toBeNull();
    await new Promise(r => setTimeout(r, 60));
    await f.whenStable();
    expect(c.state()).toBe('done');
    expect(el.querySelector('.status-pill')?.textContent).toContain('200 OK');
    expect(el.querySelector('.code--response')?.textContent).toContain('ORD-1042');
    expect(el.querySelectorAll('.code--response .tk-key').length).toBeGreaterThan(3);
  });

  it('switches endpoints via click and arrow keys, resetting state', async () => {
    const { f, el, c } = await render();
    c.send();
    await new Promise(r => setTimeout(r, 5));
    expect(c.state()).toBe('done');
    const tabs = el.querySelectorAll<HTMLButtonElement>('[role=tab]');
    tabs[2].click();
    await f.whenStable();
    expect(c.selectedId()).toBe('issue');
    expect(c.state()).toBe('idle');
    expect(el.querySelector('.console__url code')?.textContent).toContain('/jira/issues');
    tabs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await f.whenStable();
    expect(c.selectedId()).toBe('orders');
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(c.selectedId()).toBe('issue');
  });

  it('shows 201 Created for the Jira endpoint and supports reset', async () => {
    const { f, el, c } = await render();
    c.select('issue');
    c.send();
    await new Promise(r => setTimeout(r, 5));
    await f.whenStable();
    expect(el.querySelector('.status-pill')?.textContent).toContain('201 Created');
    c.reset();
    expect(c.state()).toBe('idle');
  });
});
