import { TestBed } from '@angular/core/testing';
import { FlowStudioComponent, TICK_MS } from './flow-studio.component';
import { I18nService } from '../i18n/i18n.service';
import { PROCESSORS } from './flow-model';

async function render(lang: 'de' | 'en' = 'de') {
  TestBed.inject(I18nService).setLang(lang);
  const f = TestBed.createComponent(FlowStudioComponent);
  f.componentInstance.reducedMotion = true;
  await f.whenStable();
  const el = f.nativeElement as HTMLElement;
  const c = f.componentInstance;
  const sync = async () => { await f.whenStable(); };
  return { f, c, el, sync, narr: () => el.querySelector('[data-testid=narration]')?.textContent?.trim() ?? '' };
}

describe('FlowStudioComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('renders palette, templates and the default template on the canvas', async () => {
    const { el, narr } = await render();
    expect(el.querySelectorAll('.proc').length).toBe(PROCESSORS.length);
    expect(el.querySelectorAll('[data-template]').length).toBe(4);
    expect(el.querySelectorAll('.fs__canvas .node').length).toBe(5);
    expect(el.querySelectorAll('.edge').length).toBe(4);
    expect(narr()).toContain('Vorlage „API → JSON → Mapping → Warehouse“ geladen');
    expect(el.querySelector('.fs__demo-note')?.textContent).toContain('Demo-Daten');
  });

  it('adds a processor by click, selects it and auto-connects it to the selected node', async () => {
    const { c, el, sync, narr } = await render();
    c.select('t5'); // warehouse (sink) → no auto-connect possible
    c.select('t3'); // filter: unmatched is free
    el.querySelector<HTMLButtonElement>('[data-proc=csv-export]')!.click();
    await sync();
    const g = c.graph();
    const added = g.nodes.at(-1)!;
    expect(added.type).toBe('csv-export');
    expect(c.selectedId()).toBe(added.id);
    expect(g.edges.some(e => e.from === 't3' && e.rel === 'unmatched' && e.to === added.id)).toBe(true);
    expect(narr()).toContain('„CSV-Export“ hinzugefügt');
    expect(narr()).toContain('über „unmatched“');
    expect(el.querySelector('[data-testid=panel] h3')?.textContent).toBe('CSV-Export');
  });

  it('supports drag & drop from the palette onto the canvas', async () => {
    const { c, sync } = await render();
    const data = new Map<string, string>();
    const dt = { setData: (k: string, v: string) => data.set(k, v), getData: (k: string) => data.get(k) ?? '', effectAllowed: '', dropEffect: '' };
    c.onPaletteDragStart({ dataTransfer: dt } as unknown as DragEvent, 'filter');
    c.onCanvasDrop({ preventDefault() {}, dataTransfer: dt, clientX: 300, clientY: 400 } as unknown as DragEvent);
    await sync();
    const n = c.graph().nodes.at(-1)!;
    expect(n.type).toBe('filter');
    expect(n.x).toBe(Math.round(300 - 78));
    expect(c.graph().edges.length).toBe(4); // dropped nodes are not auto-connected
  });

  it('connects via port (keyboard) then target click, and explains invalid connections', async () => {
    const { c, el, sync, narr } = await render();
    const port = el.querySelector<HTMLButtonElement>('[data-node-id=t2] [data-rel=failure]')!;
    port.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));
    await sync();
    expect(c.connectFrom()).toEqual({ nodeId: 't2', rel: 'failure' });
    expect(el.querySelector('.fs__connect-hint')).not.toBeNull();
    c.onNodeClick('t5');
    await sync();
    expect(c.graph().edges.some(e => e.from === 't2' && e.rel === 'failure' && e.to === 't5')).toBe(true);
    expect(narr()).toContain('Verbunden: „JSON parsen“ → „Data Warehouse“');
    expect(c.doConnect('t4', 'success', 't2')).toBe(false);
    await sync();
    expect(narr()).toContain('Schleife');
    c.startConnect('t1', 'success');
    c.cancelConnect();
    expect(c.connectFrom()).toBeNull();
  });

  it('steps through a run: stats, queues, narration and provenance', async () => {
    const { c, el, sync, narr } = await render();
    c.stepOnce();
    await sync();
    expect(c.runState()).toBe('paused');
    expect(el.querySelector('[data-node-id=t1] .node__stats')?.textContent).toContain('1');
    expect(c.queue('te1')).toBe(1);
    expect(el.querySelector('[data-edge-label=te1] .qbadge')?.textContent?.trim()).toBe('1');
    expect(narr()).toContain('REST API GET hat Datensatz 1 von 8');
    c.stepOnce(); c.stepOnce(); c.stepOnce();
    c.select('t3');
    c.panelTab.set('data');
    await sync();
    const prov = el.querySelector('[data-testid=provenance]')!;
    expect(prov.querySelectorAll('.prov').length).toBeGreaterThan(0);
    expect(prov.textContent).toContain('Vorher');
    expect(prov.textContent).toContain('amount');
    while (c.runState() !== 'finished') c.stepOnce();
    await sync();
    expect(narr()).toMatch(/^Lauf beendet nach \d+ Takten: 8 Datensätze erzeugt, 4 zugestellt/);
    expect(narr()).toContain('aussortiert');
    expect(c.log().length).toBeGreaterThan(5);
    c.select('t5'); c.panelTab.set('data');
    await sync();
    expect(el.querySelector('.code--out')?.textContent).toContain('order_id');
  });

  it('runs on a timer, locks editing while running, pauses and resets', async () => {
    const { c, f } = await render();
    const narr = () => c.narration().text;
    vi.useFakeTimers();
    const sync = async () => f.detectChanges();
    c.start();
    expect(c.runState()).toBe('running');
    expect(narr()).toContain('Der Fluss läuft');
    vi.advanceTimersByTime(TICK_MS[1] * 3 + 10);
    expect(c.totals().tick).toBe(3);
    const before = c.graph().nodes.length;
    c.addProc('filter');
    await sync();
    expect(c.graph().nodes.length).toBe(before);
    expect(narr()).toContain('gesperrt');
    c.setSpeed('4');
    vi.advanceTimersByTime(TICK_MS[3] + 5);
    expect(c.totals().tick).toBe(4);
    c.pause();
    expect(c.runState()).toBe('paused');
    vi.advanceTimersByTime(5000);
    expect(c.totals().tick).toBe(4);
    c.start();
    vi.advanceTimersByTime(TICK_MS[3] * 60);
    expect(c.runState()).toBe('finished');
    c.reset();
    expect(c.runState()).toBe('idle');
    expect(c.engine).toBeNull();
    expect(narr()).toContain('Zurückgesetzt');
  });

  it('configures a processor; the change is explained and used by the next run', async () => {
    const { c, el, f, narr } = await render();
    vi.useFakeTimers();
    const sync = async () => f.detectChanges();
    c.select('t3');
    await sync();
    const input = el.querySelector<HTMLInputElement>('[data-field=expression]')!;
    expect(input.value).toBe('amount > 100');
    input.value = 'amount > 1000';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(600);
    await sync();
    expect(narr()).toContain('Bedingung (z. B. amount > 100) geändert');
    while (c.runState() !== 'finished') c.stepOnce();
    expect(c.stats('t3').rels['matched']).toBe(2);
  });

  it('changes and removes connections from the side panel', async () => {
    const { c, el, sync } = await render();
    c.select('t3');
    await sync();
    const sel = el.querySelector<HTMLSelectElement>('[data-rel-select=unmatched]')!;
    expect([...sel.options].map(o => o.value)).toEqual(['', 't4', 't5']);
    sel.value = 't5'; sel.dispatchEvent(new Event('change'));
    await sync();
    expect(c.graph().edges.some(e => e.from === 't3' && e.rel === 'unmatched' && e.to === 't5')).toBe(true);
    c.setRelTarget('matched', '');
    expect(c.graph().edges.some(e => e.from === 't3' && e.rel === 'matched')).toBe(false);
  });

  it('keyboard: Enter selects, arrows move, Delete removes', async () => {
    const { c, el, sync, narr } = await render();
    const node = el.querySelector<HTMLElement>('[data-node-id=t2]')!;
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(c.selectedId()).toBe('t2');
    const x = c.graph().nodes[1].x;
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(c.graph().nodes[1].x).toBe(x + 16);
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await sync();
    expect(c.graph().nodes.some(n => n.id === 't2')).toBe(false);
    expect(narr()).toContain('entfernt');
  });

  it('loads templates, toggles simulated API errors and explains retries', async () => {
    const { c, el, sync, narr } = await render();
    el.querySelector<HTMLButtonElement>('[data-template=api-retry]')!.click();
    await sync();
    expect(c.errorsOn()).toBe(true);
    expect(el.querySelector('[data-action=errors]')?.getAttribute('aria-pressed')).toBe('true');
    const texts: string[] = [];
    while (c.runState() !== 'finished') { c.stepOnce(); texts.push(c.narration().text); }
    expect(texts.some(t => t.includes('HTTP 500') && t.includes('Backoff'))).toBe(true);
    c.toggleErrors();
    expect(c.graph().nodes.find(n => n.type === 'enrich-api')!.config['simulateError']).toBe('off');
    await sync();
    expect(narr()).toContain('deaktiviert');
    c.loadTemplate('webhook-ai');
    expect(c.errorsOn()).toBe(false);
    c.toggleErrors();
    expect(c.graph().nodes.find(n => n.type === 'rest-post')!.config['simulateError']).toBe('transient');
  });

  it('refuses to start without a source and explains why', async () => {
    const { c, sync, narr } = await render();
    for (const id of ['t1', 't2', 't3', 't4', 't5']) { c.select(id); c.removeSelected(); }
    c.start();
    await sync();
    expect(c.runState()).toBe('idle');
    expect(narr()).toContain('leer');
  });

  it('guided tour highlights areas step by step', async () => {
    const { c, el, sync } = await render();
    el.querySelector<HTMLButtonElement>('[data-action=tour]')!.click();
    await sync();
    expect(el.querySelector('[data-testid=tour] h4')?.textContent).toBe('Bausteine');
    expect(el.querySelector('.fs__palette')?.classList).toContain('tour-hl');
    el.querySelector<HTMLButtonElement>('[data-action=tour-next]')!.click();
    await sync();
    expect(el.querySelector('.fs__canvas-wrap')?.classList).toContain('tour-hl');
    c.tourBack(); c.tourBack();
    expect(c.tourStep()).toBe(0);
    for (let i = 0; i < 10; i++) c.tourNext();
    await sync();
    expect(el.querySelector('[data-testid=tour]')).toBeNull();
  });

  it('switches language at runtime', async () => {
    const { el, sync, f } = await render('de');
    expect(el.querySelector('[data-proc=filter] .proc__name')?.textContent).toBe('Filtern');
    f.componentRef.injector.get(I18nService).setLang('en');
    await sync();
    expect(el.querySelector('[data-proc=filter] .proc__name')?.textContent).toBe('Filter');
    expect(el.querySelector('[data-action=start]')?.textContent).toContain('Start');
    expect(el.querySelector('.fs__demo-note')?.textContent).toContain('Demo data');
  });

  it('compact (mobile) mode renders a vertical flow with tap-to-configure', async () => {
    const { c, el, sync } = await render();
    c.compact.set(true);
    await sync();
    expect(el.querySelector('.fs__canvas')).toBeNull();
    expect(el.querySelectorAll('.lnode').length).toBe(5);
    expect(el.querySelector('.lnode')?.getAttribute('data-node-id')).toBe('t1');
    expect(el.querySelectorAll('.lconn__item.is-open').length).toBe(2); // failure + unmatched
    el.querySelector<HTMLButtonElement>('.lnode[data-node-id=t3]')!.click();
    await sync();
    expect(el.querySelector('.fs__panel--inline [data-field=expression]')).not.toBeNull();
    c.stepOnce();
    await sync();
    expect(el.querySelector('.lconn__item.is-flowing')).not.toBeNull();
  });

  it('spawns animated FlowFile particles unless reduced motion is requested', async () => {
    const { c } = await render();
    vi.useFakeTimers();
    c.reducedMotion = false;
    c.stepOnce();
    expect(c.particles().length).toBe(1);
    vi.advanceTimersByTime(TICK_MS[1]);
    expect(c.particles().length).toBe(0);
    c.reducedMotion = true;
    c.stepOnce();
    expect(c.particles().length).toBe(0);
  });
});
