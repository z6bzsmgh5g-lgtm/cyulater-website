import { TestBed } from '@angular/core/testing';
import { PipelineComponent } from './pipeline.component';
import { I18nService } from '../i18n/i18n.service';
import { TRANSLATIONS } from '../i18n/translations';

describe('PipelineComponent', () => {
  async function render() {
    TestBed.inject(I18nService).setLang('de');
    const f = TestBed.createComponent(PipelineComponent);
    await f.whenStable();
    return { f, el: f.nativeElement as HTMLElement, c: f.componentInstance };
  }
  afterEach(() => vi.unstubAllGlobals());

  it('renders 7 focusable nodes and 6 edges', async () => {
    const { el } = await render();
    const nodes = el.querySelectorAll('.pl-node');
    expect(nodes.length).toBe(7);
    nodes.forEach(n => expect(n.getAttribute('tabindex')).toBe('0'));
    expect(el.querySelectorAll('.pl-edge').length).toBe(6);
  });

  it('shows the hint, then node details on click, and toggles off', async () => {
    const { f, el } = await render();
    expect(el.querySelector('.pipeline__hint')?.textContent).toContain(TRANSLATIONS.de.pipeline.hint);
    const jira = [...el.querySelectorAll<SVGGElement>('.pl-node')].find(n => n.getAttribute('aria-label') === 'Jira')!;
    jira.dispatchEvent(new MouseEvent('click'));
    await f.whenStable();
    expect(el.querySelector('figcaption')?.textContent).toContain(TRANSLATIONS.de.pipeline.nodes.find(n => n.id === 'jira')!.desc);
    expect(jira.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelectorAll('.pl-edge.is-dim').length).toBe(5);
    jira.dispatchEvent(new MouseEvent('click'));
    await f.whenStable();
    expect(el.querySelector('.pipeline__hint')).not.toBeNull();
  });

  it('supports keyboard activation (Enter/Space)', async () => {
    const { f, el, c } = await render();
    const core = el.querySelector<SVGGElement>('.pl-node--core')!;
    core.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await f.whenStable();
    expect(c.active()).toBe('core');
    expect(el.querySelectorAll('.pl-edge.is-dim').length).toBe(0);
    core.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(c.active()).toBeNull();
  });

  it('previews on hover without overriding a pinned node', async () => {
    const { f, el, c } = await render();
    const nodes = [...el.querySelectorAll<SVGGElement>('.pl-node')];
    nodes[0].dispatchEvent(new MouseEvent('mouseenter'));
    expect(c.active()).toBe('erp');
    nodes[0].dispatchEvent(new MouseEvent('click'));
    expect(c.pinned()).toBe('erp');
    nodes[1].dispatchEvent(new MouseEvent('mouseenter'));
    expect(c.active()).toBe('erp');
    el.querySelector('svg')!.dispatchEvent(new MouseEvent('mouseleave'));
    expect(c.active()).toBe('erp');
    nodes[0].dispatchEvent(new MouseEvent('click'));
    nodes[1].dispatchEvent(new MouseEvent('mouseenter'));
    expect(c.active()).toBe('api');
    el.querySelector('svg')!.dispatchEvent(new MouseEvent('mouseleave'));
    expect(c.active()).toBeNull();
    await f.whenStable();
  });

  it('renders animated packets unless reduced motion is preferred', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('.pl-packet').length).toBe(6);
    TestBed.resetTestingModule();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
    const f2 = TestBed.createComponent(PipelineComponent);
    await f2.whenStable();
    expect((f2.nativeElement as HTMLElement).querySelectorAll('.pl-packet').length).toBe(0);
  });

  it('switches to a vertical layout on narrow screens', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('max-width'), addEventListener() {}, removeEventListener() {} }));
    const f = TestBed.createComponent(PipelineComponent);
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 360 470');
  });

  it('translates labels at runtime', async () => {
    const { f, el } = await render();
    TestBed.inject(I18nService).setLang('en');
    await f.whenStable();
    expect(el.textContent).toContain('Data warehouse');
    expect(el.textContent).toContain(TRANSLATIONS.en.pipeline.sourcesTitle);
  });
});
