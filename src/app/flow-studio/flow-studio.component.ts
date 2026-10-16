import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { I18nService } from '../i18n/i18n.service';
import { FAILURE_RELS, FlowGraph, FlowNode, PROCESSORS, PROCESSOR_MAP, ProcessorDef, ProcessorType } from './flow-model';
import { CANVAS_H, CANVAS_W, NODE_H, NODE_W, addNode, canConnect, connect, edgePath, freeRel, graphIssues, moveNode, pathMid, portY, removeEdge, removeNode, topoOrder, updateConfig } from './flow-graph';
import { FlowEngine, NodeStats, StepResult } from './flow-engine';
import { Narration, Tone, explainAction, explainEvent, explainRun, nodeLabel, pickNarration } from './flow-explain';
import { FLOW_TEXTS, fmt } from './flow-i18n';
import { TEMPLATE_IDS, TemplateId, buildTemplate } from './flow-templates';

export type RunState = 'idle' | 'running' | 'paused' | 'finished';
interface Particle { id: number; d: string; dur: number; fail: boolean; }
interface LogEntry extends Narration { id: number; tick: number; }
const DRAG_TYPE = 'application/x-flow-proc';
const EMPTY_STATS: NodeStats = { in: 0, out: 0, failed: 0, dropped: 0, retries: 0, delivered: 0, rels: {} };
export const TICK_MS = [1500, 950, 600, 320];

/** Flow Studio – an Apache-NiFi-inspired, fully simulated data-flow builder with a plain-language guide. */
@Component({
  selector: 'app-flow-studio',
  imports: [NgTemplateOutlet],
  templateUrl: './flow-studio.component.html',
  styleUrl: './flow-studio.component.scss',
  host: { '(document:keydown.escape)': 'cancelConnect()' },
})
export class FlowStudioComponent {
  readonly i18n = inject(I18nService);
  readonly T = computed(() => FLOW_TEXTS[this.i18n.lang()]);
  readonly W = CANVAS_W; readonly H = CANVAS_H; readonly NW = NODE_W; readonly NH = NODE_H;
  readonly templates = TEMPLATE_IDS;
  readonly groups = (['source', 'transform', 'sink'] as const).map(cat => ({ cat, items: PROCESSORS.filter(p => p.category === cat) }));

  readonly graph = signal<FlowGraph>(buildTemplate('api-warehouse'));
  readonly activeTemplate = signal<TemplateId | null>('api-warehouse');
  readonly selectedId = signal<string | null>(null);
  readonly runState = signal<RunState>('idle');
  readonly version = signal(0);
  readonly activeNodes = signal<ReadonlySet<string>>(new Set());
  readonly flowingEdges = signal<ReadonlySet<string>>(new Set());
  readonly particles = signal<Particle[]>([]);
  readonly speed = signal(2);
  readonly errorsOn = signal(false);
  readonly tourStep = signal<number | null>(null);
  readonly panelTab = signal<'config' | 'data'>('config');
  readonly connectFrom = signal<{ nodeId: string; rel: string } | null>(null);
  readonly dragLine = signal<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  readonly compact = signal(false);
  readonly narration = signal<LogEntry>({ id: 0, tick: 0, text: '', tone: 'info' });
  readonly log = signal<LogEntry[]>([]);

  engine: FlowEngine | null = null;
  /** Disable particles (reduced motion / tests). */
  reducedMotion = false;
  private readonly canvas = viewChild<ElementRef<HTMLElement>>('canvas');
  private readonly wrap = viewChild<ElementRef<HTMLElement>>('wrap');
  /** Canvas zoom so the whole flow fits the available width (min 0.62, then scroll). */
  readonly scale = signal(1);
  private ro?: ResizeObserver;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private cfgTimer: ReturnType<typeof setTimeout> | undefined;
  private particleTimers = new Set<ReturnType<typeof setTimeout>>();
  private seen = new Set<string>();
  private nid = 0; private pid = 0;
  private drag: { id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null = null;
  private portDrag: { nodeId: string; rel: string; moved: boolean; sx: number; sy: number } | null = null;

  constructor() {
    const win = typeof window !== 'undefined' ? window : undefined;
    const mm = win?.matchMedia?.bind(win);
    this.reducedMotion = !!mm?.('(prefers-reduced-motion: reduce)').matches;
    const mq = mm?.('(max-width: 760px)');
    const onMq = () => this.compact.set(!!mq?.matches);
    onMq();
    mq?.addEventListener?.('change', onMq);
    // Fit the canvas to its container (re-observed whenever the wrap element is (re)created).
    effect(() => {
      const el = this.wrap()?.nativeElement;
      this.ro?.disconnect();
      if (!el || typeof ResizeObserver === 'undefined') return;
      this.ro = new ResizeObserver(() => this.fit(el));
      this.ro.observe(el);
      this.fit(el);
    });
    afterNextRender(() => { const el = this.wrap()?.nativeElement; if (el) this.fit(el); });
    inject(DestroyRef).onDestroy(() => {
      this.ro?.disconnect();
      mq?.removeEventListener?.('change', onMq);
      this.clearTimers();
      clearTimeout(this.cfgTimer);
    });
    const t = FLOW_TEXTS[this.i18n.lang()].templates['api-warehouse'];
    this.narrate(explainAction('template', { name: t.name, intro: t.intro }, this.i18n.lang()), 'info');
  }

  private fit(el: HTMLElement): void {
    const w = el.clientWidth;
    if (w > 0) this.scale.set(Math.max(0.62, Math.min(1, (w - 4) / CANVAS_W)));
  }

  // ---------- derived view state ----------
  readonly locked = computed(() => this.runState() === 'running');
  readonly tickMs = computed(() => TICK_MS[this.speed() - 1] ?? 950);
  readonly selected = computed(() => this.graph().nodes.find(n => n.id === this.selectedId()) ?? null);
  readonly tourTarget = computed(() => { const s = this.tourStep(); return s === null ? null : this.T().tour[s]?.target ?? null; });

  stats(id: string): NodeStats { this.version(); return this.engine?.stats.get(id) ?? EMPTY_STATS; }
  queue(edgeId: string): number { this.version(); return this.engine?.queueSize(edgeId) ?? 0; }
  label(n: FlowNode | null | undefined): string { return n ? nodeLabel(this.graph(), n, this.i18n.lang()) : ''; }
  def(n: FlowNode): ProcessorDef { return PROCESSOR_MAP[n.type]; }
  isFail(rel: string): boolean { return FAILURE_RELS.has(rel); }
  isLinked(n: FlowNode, rel: string): boolean { return this.graph().edges.some(e => e.from === n.id && e.rel === rel); }
  portOffset(n: FlowNode, rel: string): number { return portY(n, rel) - n.y; }
  procName(type: ProcessorType): string { return this.T().procs[type].name; }

  readonly edgeViews = computed(() => {
    const g = this.graph();
    return g.edges.map(e => {
      const a = g.nodes.find(n => n.id === e.from)!, b = g.nodes.find(n => n.id === e.to)!;
      return { e, d: edgePath(a, e.rel, b), mid: pathMid(a, e.rel, b), fail: FAILURE_RELS.has(e.rel) };
    });
  });

  readonly listViews = computed(() => {
    const g = this.graph();
    return topoOrder(g).map(n => ({
      n, rels: PROCESSOR_MAP[n.type].rels.map(rel => {
        const e = g.edges.find(x => x.from === n.id && x.rel === rel);
        return { rel, edge: e, target: e ? g.nodes.find(x => x.id === e.to) : undefined };
      }),
    }));
  });

  readonly relOptions = computed(() => {
    const n = this.selected(); const g = this.graph();
    if (!n) return [];
    return PROCESSOR_MAP[n.type].rels.map(rel => {
      const current = g.edges.find(e => e.from === n.id && e.rel === rel);
      const base = { ...g, edges: g.edges.filter(e => !(e.from === n.id && e.rel === rel)) };
      const options = g.nodes.filter(t => !canConnect(base, n.id, rel, t.id)).map(t => ({ id: t.id, label: this.label(t) }));
      return { rel, current: current?.to ?? '', options };
    });
  });

  readonly selectedEvents = computed(() => {
    this.version();
    const id = this.selectedId(); const lang = this.i18n.lang();
    if (!id || !this.engine) return [];
    return this.engine.eventsFor(id).filter(e => e.type !== 'create').slice(-12).reverse().map(ev => ({
      ev, text: explainEvent(ev, this.graph(), lang).text, before: this.pretty(ev.before), after: this.pretty(ev.after),
    }));
  });
  readonly selectedOutput = computed(() => { this.version(); const id = this.selectedId(); return id && this.engine ? this.engine.output(id).slice(-6) : []; });

  readonly totals = computed(() => {
    this.version();
    let delivered = 0, failed = 0, dropped = 0;
    for (const s of this.engine?.stats.values() ?? []) { delivered += s.delivered; failed += s.failed; dropped += s.dropped; }
    return { tick: this.engine?.tick ?? 0, created: this.engine?.created ?? 0, delivered, failed, dropped, queued: this.engine?.totalQueued() ?? 0 };
  });
  readonly issues = computed(() => {
    const lang = this.i18n.lang();
    return graphIssues(this.graph()).map(i => fmt(FLOW_TEXTS[lang].issues[i.code], { name: this.label(this.graph().nodes.find(n => n.id === i.nodeId)) }));
  });

  pretty(v: unknown): string {
    if (v === undefined) return '–';
    const s = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    return s.length > 700 ? s.slice(0, 700) + ' …' : s;
  }

  // ---------- narration ----------
  narrate(text: string, tone: Tone = 'info', nodeId?: string): void {
    const entry: LogEntry = { id: ++this.nid, tick: this.engine?.tick ?? 0, text, tone, nodeId };
    this.narration.set(entry);
    this.log.update(l => [entry, ...l].slice(0, 60));
  }
  private act(action: string, params: Record<string, string>, tone: Tone = 'info'): void {
    this.narrate(explainAction(action, params, this.i18n.lang()), tone);
  }

  // ---------- editing ----------
  /** Applies an edit; stale run results are discarded. Returns false while running. */
  private edit(fn: (g: FlowGraph) => FlowGraph): boolean {
    if (this.locked()) { this.narrate(this.T().ui['locked'], 'warn'); return false; }
    if (this.engine) this.hardReset();
    this.graph.update(fn);
    this.activeTemplate.set(null);
    return true;
  }

  addProc(type: ProcessorType, pos?: { x: number; y: number }): void {
    const after = pos ? undefined : this.selected() ?? undefined;
    let created: FlowNode | undefined;
    let linked: { rel: string; from: FlowNode } | undefined;
    const ok = this.edit(g => {
      const r = addNode(g, type, pos, after);
      created = r.node;
      let out = r.graph;
      if (after) {
        const rel = freeRel(out, after.id);
        if (rel && !canConnect(out, after.id, rel, r.node.id) && !out.edges.some(e => e.from === after.id && e.rel === rel)) {
          out = connect(out, after.id, rel, r.node.id).graph;
          linked = { rel, from: after };
        }
      }
      return out;
    });
    if (!ok || !created) return;
    this.selectedId.set(created.id);
    this.panelTab.set('config');
    const T = this.T();
    let text = explainAction('added', { name: this.label(created), desc: T.procs[type].desc }, this.i18n.lang());
    if (linked) text += ' ' + explainAction('connected', { from: this.label(linked.from), to: this.label(created), rel: linked.rel }, this.i18n.lang());
    this.narrate(text, 'info', created.id);
  }

  removeSelected(): void {
    const n = this.selected();
    if (!n) return;
    const name = this.label(n);
    if (this.edit(g => removeNode(g, n.id))) { this.selectedId.set(null); this.act('removed', { name }); }
  }

  doConnect(from: string, rel: string, to: string): boolean {
    this.connectFrom.set(null);
    const g = this.graph();
    const res = connect(g, from, rel, to);
    if (!res.ok) { this.narrate(this.T().connectErrors[res.error!], 'error'); return false; }
    if (!this.edit(() => res.graph)) return false;
    const a = g.nodes.find(n => n.id === from), b = g.nodes.find(n => n.id === to);
    this.act('connected', { from: this.label(a), to: this.label(b), rel }, 'success');
    return true;
  }

  setRelTarget(rel: string, to: string): void {
    const n = this.selected();
    if (!n) return;
    if (!to) {
      const e = this.graph().edges.find(x => x.from === n.id && x.rel === rel);
      if (e && this.edit(g => removeEdge(g, e.id))) this.act('disconnected', { from: this.label(n), rel });
      return;
    }
    this.doConnect(n.id, rel, to);
  }

  updateField(key: string, value: string): void {
    const n = this.selected();
    if (!n || n.config[key] === value) return;
    if (!this.edit(g => updateConfig(g, n.id, key, value))) return;
    clearTimeout(this.cfgTimer);
    this.cfgTimer = setTimeout(() => this.act('config', { name: this.label(n), field: this.T().fields[key] ?? key }), 500);
  }

  loadTemplate(id: TemplateId): void {
    if (this.locked()) { this.narrate(this.T().ui['locked'], 'warn'); return; }
    this.hardReset();
    const g = buildTemplate(id);
    this.graph.set(g);
    this.activeTemplate.set(id);
    this.errorsOn.set(g.nodes.some(n => (n.config['simulateError'] ?? 'off') !== 'off'));
    this.selectedId.set(null);
    this.seen.clear();
    const t = this.T().templates[id];
    this.act('template', { name: t.name, intro: t.intro });
  }

  toggleErrors(): void {
    const on = !this.errorsOn();
    const tpl = this.activeTemplate();
    if (!this.edit(g => ({ ...g, nodes: g.nodes.map(n => (n.type === 'enrich-api' || n.type === 'rest-post' ? { ...n, config: { ...n.config, simulateError: on ? 'transient' : 'off' } } : n)) }))) return;
    this.activeTemplate.set(tpl);
    this.errorsOn.set(on);
    this.act(on ? 'errorsOn' : 'errorsOff', {}, on ? 'warn' : 'info');
  }

  select(id: string | null): void {
    this.selectedId.set(id);
  }

  // ---------- pointer / keyboard interaction ----------
  onPaletteDragStart(ev: DragEvent, type: ProcessorType): void {
    ev.dataTransfer?.setData(DRAG_TYPE, type);
    ev.dataTransfer?.setData('text/plain', type);
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copy';
  }
  onCanvasDragOver(ev: DragEvent): void {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
  }
  onCanvasDrop(ev: DragEvent): void {
    ev.preventDefault();
    const type = (ev.dataTransfer?.getData(DRAG_TYPE) || ev.dataTransfer?.getData('text/plain')) as ProcessorType;
    if (!type || !PROCESSOR_MAP[type]) return;
    const p = this.toCanvas(ev.clientX, ev.clientY);
    this.addProc(type, { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 });
  }
  private toCanvas(cx: number, cy: number): { x: number; y: number } {
    const el = this.canvas()?.nativeElement;
    const r = el?.getBoundingClientRect();
    const s = this.scale();
    return { x: (cx - (r?.left ?? 0)) / s, y: (cy - (r?.top ?? 0)) / s };
  }

  onNodePointerDown(ev: PointerEvent, n: FlowNode): void {
    if (ev.button !== 0 || (ev.target as HTMLElement).closest('.port')) return;
    this.drag = { id: n.id, sx: ev.clientX, sy: ev.clientY, ox: n.x, oy: n.y, moved: false };
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
  }
  onNodePointerMove(ev: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    const s = this.scale();
    const dx = (ev.clientX - d.sx) / s, dy = (ev.clientY - d.sy) / s;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (this.locked()) return;
    if (!d.moved && this.engine) this.hardReset();
    d.moved = true;
    this.graph.update(g => moveNode(g, d.id, d.ox + dx, d.oy + dy));
  }
  onNodePointerUp(): void {
    const d = this.drag;
    this.drag = null;
    if (d && !d.moved) this.onNodeClick(d.id);
  }
  onNodeClick(id: string): void {
    const cf = this.connectFrom();
    if (cf && cf.nodeId !== id) { this.doConnect(cf.nodeId, cf.rel, id); this.selectedId.set(id); return; }
    this.connectFrom.set(null);
    this.selectedId.set(id);
  }
  onNodeKey(ev: KeyboardEvent, n: FlowNode): void {
    if ((ev.target as HTMLElement).closest('.port')) return;
    const step = ev.shiftKey ? 48 : 16;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.onNodeClick(n.id); }
    else if (moves[ev.key]) {
      ev.preventDefault();
      const [dx, dy] = moves[ev.key];
      this.edit(g => moveNode(g, n.id, n.x + dx, n.y + dy));
    } else if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault();
      this.selectedId.set(n.id);
      this.removeSelected();
    }
  }

  onPortDown(ev: PointerEvent, n: FlowNode, rel: string): void {
    ev.stopPropagation();
    if (ev.button !== 0) return;
    this.portDrag = { nodeId: n.id, rel, moved: false, sx: ev.clientX, sy: ev.clientY };
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
  }
  onPortMove(ev: PointerEvent): void {
    const p = this.portDrag;
    if (!p) return;
    if (!p.moved && Math.hypot(ev.clientX - p.sx, ev.clientY - p.sy) < 4) return;
    p.moved = true;
    const n = this.graph().nodes.find(x => x.id === p.nodeId)!;
    const to = this.toCanvas(ev.clientX, ev.clientY);
    this.dragLine.set({ x1: n.x + NODE_W, y1: portY(n, p.rel), x2: to.x, y2: to.y });
  }
  onPortUp(ev: PointerEvent): void {
    const p = this.portDrag;
    this.portDrag = null;
    this.dragLine.set(null);
    if (!p) return;
    if (!p.moved) { this.startConnect(p.nodeId, p.rel); return; }
    const hit = (typeof document !== 'undefined' ? document.elementFromPoint?.(ev.clientX, ev.clientY) : null)?.closest('[data-node-id]') as HTMLElement | null;
    const to = hit?.dataset['nodeId'];
    if (to && to !== p.nodeId) this.doConnect(p.nodeId, p.rel, to);
  }
  /** Keyboard activation of a port (pointer clicks are handled via pointerup). */
  onPortClick(ev: MouseEvent, n: FlowNode, rel: string): void {
    ev.stopPropagation();
    if (ev.detail === 0) this.startConnect(n.id, rel);
  }
  startConnect(nodeId: string, rel: string): void {
    if (this.locked()) { this.narrate(this.T().ui['locked'], 'warn'); return; }
    this.connectFrom.set({ nodeId, rel });
    this.act('connectStart', { rel, name: this.label(this.graph().nodes.find(n => n.id === nodeId)) });
  }
  cancelConnect(): void { this.connectFrom.set(null); this.dragLine.set(null); }

  // ---------- run control ----------
  private ensureEngine(): boolean {
    if (this.engine && this.runState() !== 'finished') return true;
    if (this.runState() === 'finished') this.hardReset();
    const g = this.graph();
    const blocking = graphIssues(g).find(i => i.code === 'empty' || i.code === 'no-source');
    if (blocking) { this.narrate(this.T().issues[blocking.code], 'error'); return false; }
    this.engine = new FlowEngine(g, this.i18n.lang());
    this.seen.clear();
    this.version.update(v => v + 1);
    return true;
  }

  start(): void {
    if (this.runState() === 'running') return;
    const resuming = this.runState() === 'paused';
    if (!this.ensureEngine()) return;
    this.cancelConnect();
    this.runState.set('running');
    if (!resuming) {
      const notes = this.issues();
      this.narrate([explainAction('start', {}, this.i18n.lang()), ...notes].join(' '), 'info');
    }
    this.schedule();
  }
  pause(): void {
    if (this.runState() !== 'running') return;
    clearTimeout(this.timer);
    this.runState.set('paused');
    this.act('pause', {});
  }
  stepOnce(): void {
    if (this.runState() === 'running') this.pause();
    if (!this.ensureEngine()) return;
    if (this.runState() === 'idle') this.runState.set('paused');
    this.doStep();
  }
  reset(): void { this.hardReset(); this.act('reset', {}); }

  private hardReset(): void {
    this.clearTimers();
    this.engine = null;
    this.runState.set('idle');
    this.particles.set([]);
    this.activeNodes.set(new Set());
    this.flowingEdges.set(new Set());
    this.version.update(v => v + 1);
  }
  private clearTimers(): void {
    clearTimeout(this.timer);
    for (const t of this.particleTimers) clearTimeout(t);
    this.particleTimers.clear();
  }
  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.runState() !== 'running') return;
      this.doStep();
      if (this.runState() === 'running') this.schedule();
    }, this.tickMs());
  }

  doStep(): StepResult | null {
    const eng = this.engine;
    if (!eng) return null;
    const r = eng.step();
    this.version.update(v => v + 1);
    this.activeNodes.set(new Set(r.active));
    this.flowingEdges.set(new Set(r.transfers.map(t => t.edgeId)));
    this.spawnParticles(r);
    const lang = this.i18n.lang();
    const ev = pickNarration(r.events, this.seen);
    if (ev) { const n = explainEvent(ev, this.graph(), lang); this.narrate(n.text, n.tone, n.nodeId); }
    if (r.finished) {
      clearTimeout(this.timer);
      this.runState.set('finished');
      const sum = explainRun(eng, lang);
      for (const s of sum.slice(1).reverse()) this.narrate(s.text, s.tone, s.nodeId);
      this.narrate(sum[0].text + (sum.length > 1 ? ' ' + sum.slice(1, 3).map(s => s.text).join(' ') : ''), 'success');
    }
    return r;
  }

  private spawnParticles(r: StepResult): void {
    if (this.reducedMotion || this.compact() || !r.transfers.length) return;
    const views = this.edgeViews();
    const dur = Math.round(this.tickMs() * 0.85);
    const add = r.transfers.map(t => { const v = views.find(x => x.e.id === t.edgeId)!; return { id: ++this.pid, d: v.d, dur, fail: v.fail }; });
    this.particles.update(p => [...p, ...add].slice(-40));
    const ids = new Set(add.map(a => a.id));
    const timer = setTimeout(() => { this.particles.update(p => p.filter(x => !ids.has(x.id))); this.particleTimers.delete(timer); }, dur + 50);
    this.particleTimers.add(timer);
  }

  setSpeed(v: string): void {
    this.speed.set(Math.min(4, Math.max(1, Number(v) || 2)));
    if (this.runState() === 'running') this.schedule();
  }

  // ---------- tour ----------
  startTour(): void { this.tourStep.set(0); }
  tourNext(): void { this.tourStep.update(s => (s === null ? null : s + 1 >= this.T().tour.length ? null : s + 1)); }
  tourBack(): void { this.tourStep.update(s => (s === null ? null : Math.max(0, s - 1))); }
  endTour(): void { this.tourStep.set(null); }

  particlePath(d: string): string { return `path('${d}')`; }
}
