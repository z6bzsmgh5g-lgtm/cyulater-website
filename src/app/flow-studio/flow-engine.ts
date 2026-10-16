/**
 * Flow Studio simulation engine – deterministic, tick-based, framework-free.
 * Each tick every processor handles at most one FlowFile; outputs become visible downstream in the next tick.
 */
import { CLASSIFIER_KEYWORDS, CRM_LOOKUP, FAILURE_RELS, FlowGraph, FlowNode, Lang, PROCESSOR_MAP, sampleRecords } from './flow-model';
import { topoOrder } from './flow-graph';

export interface FlowFile { id: string; attrs: Record<string, string>; content: unknown; }
export type Params = Record<string, string | number>;
export type EventType = 'create' | 'route' | 'drop' | 'retry' | 'collect' | 'deliver';
export interface ProvEvent {
  seq: number; tick: number; nodeId: string; ffId: string; type: EventType;
  rel?: string; code: string; params: Params; before?: unknown; after?: unknown;
}
export interface NodeStats { in: number; out: number; failed: number; dropped: number; retries: number; delivered: number; rels: Record<string, number>; }
export interface Transfer { edgeId: string; ffId: string; }
export interface StepResult { tick: number; events: ProvEvent[]; transfers: Transfer[]; active: string[]; finished: boolean; }

export type Outcome =
  | { kind: 'route'; rel: string; ff: FlowFile; code: string; params?: Params }
  | { kind: 'retry'; delay: number; code: string; params?: Params }
  | { kind: 'collect'; code: string; params?: Params }
  | { kind: 'deliver'; code: string; params?: Params; ff?: FlowFile };

export interface NodeState {
  emitted: number;
  errorTarget?: string;
  buffer: FlowFile[];
  flushed: boolean;
  counter: number;
  output: string[];
}
export interface Ctx { node: FlowNode; state: NodeState; tick: number; lang: Lang; }

// ---------------- helpers ----------------

export function getField(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export interface Expr { field: string; op: string; value: string; }
const EXPR_RE = /^\s*([\w.]+)\s*(>=|<=|==|!=|>|<|=|contains)\s*(.+?)\s*$/i;
export function parseExpr(src: string): Expr | null {
  const m = EXPR_RE.exec(src ?? '');
  if (!m) return null;
  return { field: m[1], op: m[2].toLowerCase() === 'contains' ? 'contains' : m[2] === '=' ? '==' : m[2], value: m[3].replace(/^['"]|['"]$/g, '') };
}
export function evalExpr(e: Expr, record: unknown): boolean | undefined {
  const raw = getField(record, e.field);
  if (raw === undefined || raw === null) return undefined;
  const a = Number(raw), b = Number(e.value);
  const numeric = typeof raw !== 'boolean' && String(raw).trim() !== '' && !isNaN(a) && e.value.trim() !== '' && !isNaN(b);
  const s = String(raw).toLowerCase(), v = e.value.toLowerCase();
  switch (e.op) {
    case '>': return numeric ? a > b : s > v;
    case '<': return numeric ? a < b : s < v;
    case '>=': return numeric ? a >= b : s >= v;
    case '<=': return numeric ? a <= b : s <= v;
    case '==': return numeric ? a === b : s === v;
    case '!=': return numeric ? a !== b : s !== v;
    case 'contains': return s.includes(v);
  }
  return undefined;
}

export function parseMapping(src: string): { target: string; source: string }[] {
  return (src ?? '').split(/[\n,]+/).map(l => l.trim()).filter(Boolean).map(l => {
    const [t, s] = l.split('=').map(x => x.trim());
    return { target: t, source: s || t };
  }).filter(m => m.target);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function classify(text: string): { category: string; confidence: number; keyword: string } {
  const t = (text ?? '').toLowerCase();
  let best = { category: 'other', hits: 0, keyword: '' };
  for (const [cat, words] of Object.entries(CLASSIFIER_KEYWORDS)) {
    const hit = words.filter(w => t.includes(w));
    if (hit.length > best.hits) best = { category: cat, hits: hit.length, keyword: hit[0] };
  }
  const confidence = best.hits ? Math.min(0.97, 0.72 + best.hits * 0.11) : 0.41;
  return { category: best.category, confidence: Math.round(confidence * 100) / 100, keyword: best.keyword };
}

function clone<T>(v: T): T { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
function withContent(ff: FlowFile, content: unknown, attrs: Record<string, string> = {}): FlowFile {
  return { id: ff.id, attrs: { ...ff.attrs, ...attrs }, content };
}
function fill(tpl: string, rec: unknown): string {
  return (tpl ?? '').replace(/\{([\w.]+)\}/g, (_, k) => String(getField(rec, k) ?? '?'));
}

/** Simulated HTTP 500 handling shared by enrich-api and rest-post. */
function simulatedError(ff: FlowFile, ctx: Ctx): Outcome | null {
  const mode = ctx.node.config['simulateError'] ?? 'off';
  if (mode === 'off') return null;
  ctx.state.errorTarget ??= ff.id;
  if (ctx.state.errorTarget !== ff.id) return null;
  const attempts = Number(ff.attrs['retry.count'] ?? 0);
  const max = Math.max(0, Math.min(6, Number(ctx.node.config['maxRetries'] ?? 3) || 0));
  if (mode === 'transient' && attempts < Math.min(2, max)) {
    const delay = 2 ** attempts;
    return { kind: 'retry', delay, code: 'api.500', params: { attempt: attempts + 1, wait: delay, max } };
  }
  if (mode === 'permanent') {
    if (attempts < max) { const delay = 2 ** attempts; return { kind: 'retry', delay, code: 'api.500', params: { attempt: attempts + 1, wait: delay, max } }; }
    return { kind: 'route', rel: 'failure', ff: withContent(ff, ff.content, { 'http.status': '500', 'retry.exhausted': 'true' }), code: 'api.giveup', params: { attempts: attempts + 1 } };
  }
  return null;
}

// ---------------- processors ----------------

export type ProcessorFn = (ff: FlowFile, ctx: Ctx) => Outcome;

export const PROCESSOR_FNS: Partial<Record<FlowNode['type'], ProcessorFn>> = {
  'json-parse': (ff): Outcome => {
    if (typeof ff.content !== 'string') return { kind: 'route', rel: 'success', ff, code: 'json.passthrough' };
    try {
      return { kind: 'route', rel: 'success', ff: withContent(ff, JSON.parse(ff.content), { 'mime.type': 'application/json' }), code: 'json.ok' };
    } catch (err) {
      return { kind: 'route', rel: 'failure', ff: withContent(ff, ff.content, { 'parse.error': (err as Error).message.slice(0, 80) }), code: 'json.invalid', params: { error: (err as Error).message.slice(0, 80) } };
    }
  },
  'map-fields': (ff, ctx): Outcome => {
    const rec = ff.content;
    if (!rec || typeof rec !== 'object') return { kind: 'route', rel: 'success', ff, code: 'map.notobject' };
    const maps = parseMapping(ctx.node.config['mapping']);
    const out: Record<string, unknown> = {};
    const missing: string[] = [];
    for (const m of maps) {
      const v = getField(rec, m.source);
      if (v === undefined) missing.push(m.source);
      out[m.target] = v ?? null;
    }
    return { kind: 'route', rel: 'success', ff: withContent(ff, out), code: missing.length ? 'map.missing' : 'map.ok', params: { fields: maps.length, missing: missing.join(', ') } };
  },
  filter: (ff, ctx): Outcome => {
    const src = ctx.node.config['expression'];
    const e = parseExpr(src);
    if (!e) return { kind: 'route', rel: 'unmatched', ff, code: 'filter.badexpr', params: { expr: src ?? '' } };
    const r = evalExpr(e, ff.content);
    const value = String(getField(ff.content, e.field) ?? '–');
    if (r === undefined) return { kind: 'route', rel: 'unmatched', ff, code: 'filter.missing', params: { expr: src, field: e.field } };
    return { kind: 'route', rel: r ? 'matched' : 'unmatched', ff, code: r ? 'filter.match' : 'filter.nomatch', params: { expr: src, field: e.field, value } };
  },
  'enrich-api': (ff, ctx): Outcome => {
    const err = simulatedError(ff, ctx);
    if (err) return err;
    const rec = (ff.content && typeof ff.content === 'object' ? ff.content : {}) as Record<string, unknown>;
    const key = String(rec['customer'] ?? rec['customer_name'] ?? rec['name'] ?? '');
    const hit = CRM_LOOKUP[key];
    const out = { ...rec, segment: hit?.segment ?? 'unknown', accountManager: hit?.accountManager ?? null };
    return { kind: 'route', rel: 'success', ff: withContent(ff, out, { 'http.status': '200', 'enrich.source': 'crm' }), code: hit ? 'enrich.ok' : 'enrich.nomatch', params: { key: key || '–', segment: out.segment, url: fill(ctx.node.config['url'], rec) } };
  },
  aggregate: (ff, ctx): Outcome => {
    ctx.state.buffer.push(ff);
    return { kind: 'collect', code: 'agg.collect', params: { n: ctx.state.buffer.length } };
  },
  'ai-classify': (ff, ctx): Outcome => {
    const field = ctx.node.config['field'] || 'text';
    const c = classify(String(getField(ff.content, field) ?? ''));
    const rec = (ff.content && typeof ff.content === 'object' ? ff.content : { value: ff.content }) as Record<string, unknown>;
    return { kind: 'route', rel: 'success', ff: withContent(ff, { ...rec, category: c.category, confidence: c.confidence }, { 'ai.category': c.category }), code: c.keyword ? 'ai.ok' : 'ai.other', params: { category: c.category, confidence: Math.round(c.confidence * 100), keyword: c.keyword } };
  },
  validate: (ff, ctx): Outcome => {
    const rec = ff.content;
    const problems: string[] = [];
    for (const f of (ctx.node.config['required'] ?? '').split(',').map(s => s.trim()).filter(Boolean)) {
      const v = getField(rec, f);
      if (v === undefined || v === null || String(v).trim() === '') problems.push(`${f}: empty`);
    }
    const ef = ctx.node.config['emailField']?.trim();
    if (ef) { const v = getField(rec, ef); if (v !== undefined && String(v).trim() !== '' && !EMAIL_RE.test(String(v))) problems.push(`${ef}: invalid email`); }
    const pf = ctx.node.config['positiveField']?.trim();
    if (pf) { const v = getField(rec, pf); if (v !== undefined && (isNaN(Number(v)) || Number(v) <= 0)) problems.push(`${pf}: not > 0`); }
    if (problems.length) return { kind: 'route', rel: 'invalid', ff: withContent(ff, rec, { 'validation.errors': problems.join('; ') }), code: 'validate.invalid', params: { problems: problems.join('; ') } };
    return { kind: 'route', rel: 'valid', ff, code: 'validate.ok' };
  },
  warehouse: (ff, ctx): Outcome => {
    ctx.state.counter++;
    ctx.state.output.push(JSON.stringify(ff.content));
    return { kind: 'deliver', code: 'dwh.ok', params: { table: ctx.node.config['table'] || 'table', row: ctx.state.counter } };
  },
  'jira-ticket': (ff, ctx): Outcome => {
    ctx.state.counter++;
    const key = `${(ctx.node.config['project'] || 'DEMO').toUpperCase()}-${100 + ctx.state.counter}`;
    const summary = fill(ctx.node.config['summary'], ff.content);
    ctx.state.output.push(`${key}: ${summary}`);
    return { kind: 'deliver', code: 'jira.ok', params: { key, summary }, ff: withContent(ff, ff.content, { 'jira.key': key }) };
  },
  'rest-post': (ff, ctx): Outcome => {
    const err = simulatedError(ff, ctx);
    if (err) return err;
    ctx.state.counter++;
    ctx.state.output.push(JSON.stringify(ff.content));
    return { kind: 'deliver', code: 'post.ok', params: { url: ctx.node.config['url'] || '', status: 201 } };
  },
  'csv-export': (ff, ctx): Outcome => {
    const rec = (ff.content && typeof ff.content === 'object' ? ff.content : { value: ff.content }) as Record<string, unknown>;
    const cell = (v: unknown) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? ''));
    if (!ctx.state.output.length) ctx.state.output.push(Object.keys(rec).join(';'));
    ctx.state.output.push(Object.values(rec).map(cell).join(';'));
    ctx.state.counter++;
    return { kind: 'deliver', code: 'csv.ok', params: { file: ctx.node.config['file'] || 'export.csv', lines: ctx.state.counter } };
  },
};

function flushAggregate(ctx: Ctx, ffId: string): FlowFile {
  const groupBy = ctx.node.config['groupBy']?.trim();
  const sumField = ctx.node.config['sumField']?.trim();
  const groups = new Map<string, { count: number; sum: number }>();
  for (const ff of ctx.state.buffer) {
    const g = groupBy ? String(getField(ff.content, groupBy) ?? '–') : 'all';
    const cur = groups.get(g) ?? { count: 0, sum: 0 };
    cur.count++;
    if (sumField) { const n = Number(getField(ff.content, sumField)); if (!isNaN(n)) cur.sum += n; }
    groups.set(g, cur);
  }
  const content = {
    groups: [...groups.entries()].map(([k, v]) => ({ [groupBy || 'group']: k, count: v.count, ...(sumField ? { [`sum_${sumField}`]: Math.round(v.sum * 100) / 100 } : {}) })),
    total: ctx.state.buffer.length,
  };
  return { id: ffId, attrs: { 'record.count': String(ctx.state.buffer.length), 'fragment.count': String(groups.size) }, content };
}

// ---------------- engine ----------------

export class FlowEngine {
  tick = 0;
  finished = false;
  readonly queues = new Map<string, FlowFile[]>();
  readonly stats = new Map<string, NodeStats>();
  readonly states = new Map<string, NodeState>();
  readonly penalized = new Map<string, { ff: FlowFile; readyAt: number }[]>();
  readonly provenance: ProvEvent[] = [];
  created = 0;
  private seq = 0;
  private ffSeq = 0;
  private order: FlowNode[];
  private sources = new Map<string, ReturnType<typeof sampleRecords>>();
  static readonly MAX_TICKS = 400;
  static readonly MAX_PROVENANCE = 600;

  constructor(readonly graph: FlowGraph, readonly lang: Lang = 'de') {
    this.order = topoOrder(graph);
    for (const e of graph.edges) this.queues.set(e.id, []);
    for (const n of graph.nodes) {
      this.stats.set(n.id, { in: 0, out: 0, failed: 0, dropped: 0, retries: 0, delivered: 0, rels: {} });
      this.states.set(n.id, { emitted: 0, buffer: [], flushed: false, counter: 0, output: [] });
      this.penalized.set(n.id, []);
      if (PROCESSOR_MAP[n.type].category === 'source') this.sources.set(n.id, sampleRecords(n.type, lang));
    }
  }

  queueSize(edgeId: string): number { return this.queues.get(edgeId)?.length ?? 0; }
  totalQueued(): number { let s = 0; for (const q of this.queues.values()) s += q.length; return s; }

  /** True when the node will never produce output again. */
  private exhausted(id: string, seen = new Set<string>()): boolean {
    const node = this.graph.nodes.find(n => n.id === id)!;
    const st = this.states.get(id)!;
    if (node.type === 'aggregate' && st.buffer.length && !st.flushed) return false;
    return this.inputsDone(id, seen);
  }

  /** True when no more input will ever arrive (sources: all records emitted). */
  private inputsDone(id: string, seen = new Set<string>()): boolean {
    if (seen.has(id)) return true;
    seen.add(id);
    const node = this.graph.nodes.find(n => n.id === id)!;
    if (PROCESSOR_MAP[node.type].category === 'source') return this.states.get(id)!.emitted >= (this.sources.get(id)?.length ?? 0);
    const inEdges = this.graph.edges.filter(e => e.to === id);
    if (inEdges.some(e => this.queueSize(e.id) > 0)) return false;
    if (this.penalized.get(id)!.length) return false;
    return inEdges.every(e => this.exhausted(e.from, seen));
  }

  private event(ev: Omit<ProvEvent, 'seq' | 'tick'>, out: ProvEvent[]): void {
    const full: ProvEvent = { seq: ++this.seq, tick: this.tick, ...ev, before: clone(ev.before), after: clone(ev.after) };
    out.push(full);
    this.provenance.push(full);
    if (this.provenance.length > FlowEngine.MAX_PROVENANCE) this.provenance.shift();
  }

  step(): StepResult {
    if (this.finished) return { tick: this.tick, events: [], transfers: [], active: [], finished: true };
    this.tick++;
    const events: ProvEvent[] = [];
    const pending: { edgeId: string; ff: FlowFile }[] = [];
    const active: string[] = [];
    // Aggregates flush when everything upstream is exhausted at tick start.
    const flushNow = new Set(this.order.filter(n => n.type === 'aggregate' && !this.states.get(n.id)!.flushed && this.states.get(n.id)!.buffer.length
      && this.inputsDone(n.id)).map(n => n.id));

    const route = (node: FlowNode, rel: string, ff: FlowFile, before: unknown, code: string, params: Params = {}) => {
      const st = this.stats.get(node.id)!;
      st.rels[rel] = (st.rels[rel] ?? 0) + 1;
      if (FAILURE_RELS.has(rel)) st.failed++;
      const edge = this.graph.edges.find(e => e.from === node.id && e.rel === rel);
      if (edge) {
        if (!FAILURE_RELS.has(rel)) st.out++;
        pending.push({ edgeId: edge.id, ff });
        this.event({ nodeId: node.id, ffId: ff.id, type: 'route', rel, code, params, before, after: ff.content }, events);
      } else {
        st.dropped++;
        this.event({ nodeId: node.id, ffId: ff.id, type: 'drop', rel, code, params: { ...params, rel }, before, after: ff.content }, events);
      }
    };

    for (const node of this.order) {
      const def = PROCESSOR_MAP[node.type];
      const st = this.stats.get(node.id)!;
      const state = this.states.get(node.id)!;
      const ctx: Ctx = { node, state, tick: this.tick, lang: this.lang };

      if (def.category === 'source') {
        const recs = this.sources.get(node.id)!;
        if (state.emitted >= recs.length) continue;
        const r = recs[state.emitted++];
        const ff: FlowFile = { id: `FF-${String(++this.ffSeq).padStart(3, '0')}`, attrs: { ...r.attrs, 'source.processor': node.type }, content: r.content };
        this.created++;
        active.push(node.id);
        this.event({ nodeId: node.id, ffId: ff.id, type: 'create', code: `src.${node.type}`, params: { n: state.emitted, total: recs.length, ...node.config }, after: ff.content }, events);
        route(node, 'success', ff, undefined, `src.${node.type}`, { n: state.emitted, total: recs.length });
        continue;
      }

      if (flushNow.has(node.id)) {
        state.flushed = true;
        active.push(node.id);
        const ff = flushAggregate(ctx, `FF-${String(++this.ffSeq).padStart(3, '0')}`);
        const groups = (ff.content as { groups: unknown[] }).groups.length;
        route(node, 'success', ff, { records: state.buffer.length }, 'agg.emit', { n: state.buffer.length, groups, groupBy: node.config['groupBy'] || '–' });
        continue;
      }

      // take: penalized-and-ready first, otherwise first non-empty input queue
      let ff: FlowFile | undefined;
      let fromRetry = false;
      const pen = this.penalized.get(node.id)!;
      const ready = pen.findIndex(p => p.readyAt <= this.tick);
      if (ready >= 0) { ff = pen.splice(ready, 1)[0].ff; fromRetry = true; }
      else {
        for (const e of this.graph.edges) {
          if (e.to !== node.id) continue;
          const q = this.queues.get(e.id)!;
          if (q.length) { ff = q.shift(); break; }
        }
      }
      if (!ff) continue;
      if (!fromRetry) st.in++;
      active.push(node.id);
      const fn = PROCESSOR_FNS[node.type];
      if (!fn) { route(node, def.rels[0] ?? 'success', ff, ff.content, 'noop'); continue; }
      const before = ff.content;
      const o = fn(ff, ctx);
      switch (o.kind) {
        case 'route': route(node, o.rel, o.ff, before, o.code, o.params); break;
        case 'retry': {
          st.retries++;
          const next = { ...ff, attrs: { ...ff.attrs, 'retry.count': String(Number(ff.attrs['retry.count'] ?? 0) + 1) } };
          pen.push({ ff: next, readyAt: this.tick + o.delay });
          this.event({ nodeId: node.id, ffId: ff.id, type: 'retry', code: o.code, params: o.params ?? {}, before, after: before }, events);
          break;
        }
        case 'collect':
          this.event({ nodeId: node.id, ffId: ff.id, type: 'collect', code: o.code, params: o.params ?? {}, before, after: before }, events);
          break;
        case 'deliver':
          st.delivered++;
          st.rels['delivered'] = (st.rels['delivered'] ?? 0) + 1;
          this.event({ nodeId: node.id, ffId: ff.id, type: 'deliver', code: o.code, params: o.params ?? {}, before, after: (o.ff ?? ff).content }, events);
          break;
      }
    }

    for (const p of pending) this.queues.get(p.edgeId)!.push(p.ff);
    const transfers = pending.map(p => ({ edgeId: p.edgeId, ffId: p.ff.id }));
    this.finished = this.graph.nodes.every(n => this.exhausted(n.id)) || this.tick >= FlowEngine.MAX_TICKS;
    return { tick: this.tick, events, transfers, active, finished: this.finished };
  }

  /** Run to completion (tests, "skip to end"). */
  runToEnd(): StepResult[] {
    const out: StepResult[] = [];
    while (!this.finished) out.push(this.step());
    return out;
  }

  eventsFor(nodeId: string): ProvEvent[] { return this.provenance.filter(e => e.nodeId === nodeId); }
  output(nodeId: string): string[] { return this.states.get(nodeId)?.output ?? []; }
}
