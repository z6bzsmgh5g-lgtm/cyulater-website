import { FlowEngine, PROCESSOR_FNS, classify, evalExpr, getField, parseExpr, parseMapping, FlowFile, Ctx, NodeState } from './flow-engine';
import { FlowGraph, FlowNode, PROCESSORS, PROCESSOR_MAP, ProcessorType, sampleRecords } from './flow-model';
import { buildTemplate, TEMPLATE_IDS } from './flow-templates';
import { addNode, connect } from './flow-graph';

function node(type: ProcessorType, config: Record<string, string> = {}): FlowNode {
  return { id: 'x', type, x: 0, y: 0, config: { ...PROCESSOR_MAP[type].defaults, ...config } };
}
function ctx(type: ProcessorType, config: Record<string, string> = {}): Ctx {
  const state: NodeState = { emitted: 0, buffer: [], flushed: false, counter: 0, output: [] };
  return { node: node(type, config), state, tick: 1, lang: 'de' };
}
const ff = (content: unknown, attrs: Record<string, string> = {}): FlowFile => ({ id: 'FF-1', attrs, content });
function run(type: ProcessorType, content: unknown, config: Record<string, string> = {}) {
  return PROCESSOR_FNS[type]!(ff(content), ctx(type, config));
}

describe('expression & mapping helpers', () => {
  it('parses expressions with all operators', () => {
    expect(parseExpr('amount > 100')).toEqual({ field: 'amount', op: '>', value: '100' });
    expect(parseExpr('status = "open"')).toEqual({ field: 'status', op: '==', value: 'open' });
    expect(parseExpr('text CONTAINS rechnung')?.op).toBe('contains');
    expect(parseExpr('a.b <= 3')?.field).toBe('a.b');
    expect(parseExpr('nonsense')).toBeNull();
    expect(parseExpr('')).toBeNull();
  });
  it('evaluates numerically and textually', () => {
    const r = { amount: 120, status: 'open', nested: { v: '7' } };
    expect(evalExpr(parseExpr('amount > 100')!, r)).toBe(true);
    expect(evalExpr(parseExpr('amount < 100')!, r)).toBe(false);
    expect(evalExpr(parseExpr('amount >= 120')!, r)).toBe(true);
    expect(evalExpr(parseExpr('status == OPEN')!, r)).toBe(true);
    expect(evalExpr(parseExpr('status != open')!, r)).toBe(false);
    expect(evalExpr(parseExpr('status contains pe')!, r)).toBe(true);
    expect(evalExpr(parseExpr('nested.v == 7')!, r)).toBe(true);
    expect(evalExpr(parseExpr('missing > 1')!, r)).toBeUndefined();
  });
  it('reads nested fields and parses mappings', () => {
    expect(getField({ a: { b: 2 } }, 'a.b')).toBe(2);
    expect(getField('x', 'a')).toBeUndefined();
    expect(parseMapping('a=b\n c = d ,e')).toEqual([{ target: 'a', source: 'b' }, { target: 'c', source: 'd' }, { target: 'e', source: 'e' }]);
  });
  it('classifies deterministically', () => {
    expect(classify('Rechnung doppelt abgebucht').category).toBe('billing');
    expect(classify('Login Fehler 403').category).toBe('technical');
    expect(classify('Bitte ein Angebot').category).toBe('sales');
    const other = classify('Danke!');
    expect(other.category).toBe('other');
    expect(other.confidence).toBeLessThan(0.5);
    expect(classify('Rechnung abgebucht Gutschrift').confidence).toBeGreaterThan(classify('Rechnung').confidence);
  });
});

describe('processors', () => {
  it('json-parse: ok, passthrough and failure', () => {
    const ok = run('json-parse', '{"a":1}');
    expect(ok).toMatchObject({ kind: 'route', rel: 'success', code: 'json.ok' });
    expect(ok.kind === 'route' && ok.ff.content).toEqual({ a: 1 });
    expect(run('json-parse', { a: 1 })).toMatchObject({ rel: 'success', code: 'json.passthrough' });
    const bad = run('json-parse', '{"a":');
    expect(bad).toMatchObject({ rel: 'failure', code: 'json.invalid' });
    expect(bad.kind === 'route' && bad.ff.attrs['parse.error']).toBeTruthy();
  });
  it('map-fields renames, drops unmapped and reports missing fields', () => {
    const o = run('map-fields', { id: 1, customer: 'X', extra: true }, { mapping: 'order_id=id\nname=customer\nfoo=bar' });
    expect(o.kind === 'route' && o.ff.content).toEqual({ order_id: 1, name: 'X', foo: null });
    expect(o).toMatchObject({ code: 'map.missing', params: { missing: 'bar' } });
    expect(run('map-fields', 'raw')).toMatchObject({ code: 'map.notobject' });
  });
  it('filter routes matched / unmatched / missing / bad expression', () => {
    expect(run('filter', { amount: 200 })).toMatchObject({ rel: 'matched', code: 'filter.match', params: { value: '200' } });
    expect(run('filter', { amount: 50 })).toMatchObject({ rel: 'unmatched', code: 'filter.nomatch' });
    expect(run('filter', { other: 1 })).toMatchObject({ rel: 'unmatched', code: 'filter.missing' });
    expect(run('filter', { amount: 1 }, { expression: '???' })).toMatchObject({ rel: 'unmatched', code: 'filter.badexpr' });
  });
  it('enrich-api adds CRM data or marks unknown', () => {
    const o = run('enrich-api', { customer: 'Muster AG' });
    expect(o.kind === 'route' && o.ff.content).toMatchObject({ segment: 'mid-market' });
    expect(o).toMatchObject({ code: 'enrich.ok', params: { url: 'https://crm.example.com/v1/customers/Muster AG' } });
    expect(run('enrich-api', { customer: 'Nobody' })).toMatchObject({ code: 'enrich.nomatch' });
  });
  it('simulated transient error retries with exponential backoff, then succeeds', () => {
    const c = ctx('enrich-api', { simulateError: 'transient' });
    expect(PROCESSOR_FNS['enrich-api']!(ff({}), c)).toMatchObject({ kind: 'retry', delay: 1, code: 'api.500', params: { attempt: 1 } });
    expect(PROCESSOR_FNS['enrich-api']!(ff({}, { 'retry.count': '1' }), c)).toMatchObject({ kind: 'retry', delay: 2, params: { attempt: 2 } });
    expect(PROCESSOR_FNS['enrich-api']!(ff({}, { 'retry.count': '2' }), c)).toMatchObject({ kind: 'route', rel: 'success' });
    // only the first FlowFile is affected
    expect(PROCESSOR_FNS['enrich-api']!({ id: 'FF-2', attrs: {}, content: {} }, c)).toMatchObject({ kind: 'route' });
  });
  it('simulated permanent error gives up after maxRetries → failure', () => {
    const c = ctx('rest-post', { simulateError: 'permanent', maxRetries: '2' });
    expect(PROCESSOR_FNS['rest-post']!(ff({}), c).kind).toBe('retry');
    expect(PROCESSOR_FNS['rest-post']!(ff({}, { 'retry.count': '1' }), c)).toMatchObject({ kind: 'retry', delay: 2 });
    expect(PROCESSOR_FNS['rest-post']!(ff({}, { 'retry.count': '2' }), c)).toMatchObject({ kind: 'route', rel: 'failure', code: 'api.giveup', params: { attempts: 3 } });
  });
  it('validate checks required, email and positive amount', () => {
    expect(run('validate', { id: 1, name: 'A', email: 'a@b.de', amount: '5' })).toMatchObject({ rel: 'valid' });
    const bad = run('validate', { id: 1, name: '', email: 'x(at)y', amount: '-1' });
    expect(bad).toMatchObject({ rel: 'invalid', code: 'validate.invalid' });
    expect(bad.kind === 'route' && bad.ff.attrs['validation.errors']).toContain('name: empty');
    expect(bad.kind === 'route' && bad.params?.['problems']).toContain('invalid email');
    expect(bad.kind === 'route' && bad.params?.['problems']).toContain('amount: not > 0');
  });
  it('ai-classify adds category and confidence', () => {
    const o = run('ai-classify', { text: 'Rechnung falsch' });
    expect(o.kind === 'route' && o.ff.content).toMatchObject({ category: 'billing' });
    expect(o.kind === 'route' && o.ff.attrs['ai.category']).toBe('billing');
    expect(run('ai-classify', { text: 'Hallo' })).toMatchObject({ code: 'ai.other' });
  });
  it('sinks deliver and record output', () => {
    const j = ctx('jira-ticket', { project: 'sup', summary: 'Fall {id}' });
    expect(PROCESSOR_FNS['jira-ticket']!(ff({ id: 7 }), j)).toMatchObject({ kind: 'deliver', params: { key: 'SUP-101', summary: 'Fall 7' } });
    expect(j.state.output).toEqual(['SUP-101: Fall 7']);
    const c = ctx('csv-export');
    PROCESSOR_FNS['csv-export']!(ff({ a: 1, b: { c: 2 } }), c);
    PROCESSOR_FNS['csv-export']!(ff({ a: 3, b: null }), c);
    expect(c.state.output).toEqual(['a;b', '1;{"c":2}', '3;']);
    expect(PROCESSOR_FNS['warehouse']!(ff({ a: 1 }), ctx('warehouse'))).toMatchObject({ kind: 'deliver', code: 'dwh.ok', params: { row: 1 } });
    expect(PROCESSOR_FNS['rest-post']!(ff({ a: 1 }), ctx('rest-post'))).toMatchObject({ kind: 'deliver', params: { status: 201 } });
  });
  it('every transform/sink has a processor function; catalog is consistent', () => {
    for (const p of PROCESSORS) {
      if (p.category !== 'source') expect(PROCESSOR_FNS[p.type], p.type).toBeTypeOf('function');
      else expect(sampleRecords(p.type, 'de').length, p.type).toBeGreaterThan(3);
      for (const f of p.fields) expect(p.defaults[f.key], `${p.type}.${f.key}`).toBeDefined();
    }
  });
  it('sample data is localized for webhook messages and contains one malformed order', () => {
    expect(sampleRecords('webhook', 'en')[0].content).toContain('invoice');
    expect(sampleRecords('webhook', 'de')[0].content).toContain('Rechnung');
    expect(sampleRecords('rest-get', 'de').filter(r => { try { JSON.parse(r.content as string); return false; } catch { return true; } }).length).toBe(1);
  });
});

describe('FlowEngine', () => {
  it('runs the API → warehouse template: parse failure, filter drops, warehouse rows', () => {
    const eng = new FlowEngine(buildTemplate('api-warehouse'));
    eng.runToEnd();
    expect(eng.finished).toBe(true);
    expect(eng.created).toBe(8);
    expect(eng.stats.get('t2')).toMatchObject({ in: 8, failed: 1, dropped: 1 });
    expect(eng.stats.get('t3')!.rels).toEqual({ matched: 4, unmatched: 3 });
    expect(eng.stats.get('t3')!.dropped).toBe(3);
    expect(eng.stats.get('t5')!.delivered).toBe(4);
    expect(eng.output('t5')[0]).toContain('order_id');
    expect(eng.totalQueued()).toBe(0);
  });
  it('one FlowFile per processor per tick; outputs visible next tick', () => {
    const eng = new FlowEngine(buildTemplate('api-warehouse'));
    const r1 = eng.step();
    expect(r1.transfers).toEqual([{ edgeId: 'te1', ffId: 'FF-001' }]);
    expect(eng.queueSize('te1')).toBe(1);
    const r2 = eng.step();
    expect(r2.active).toEqual(['t1', 't2']);
    expect(eng.queueSize('te1')).toBe(1);
    expect(eng.queueSize('te2')).toBe(1);
  });
  it('CSV → validate → Jira creates tickets for invalid lines', () => {
    const eng = new FlowEngine(buildTemplate('csv-jira'));
    eng.runToEnd();
    expect(eng.stats.get('t2')!.rels).toEqual({ valid: 3, invalid: 3 });
    expect(eng.stats.get('t3')!.delivered).toBe(3);
    expect(eng.output('t4')).toEqual(['DATA-101: Ungültiger Datensatz K-202 prüfen', 'DATA-102: Ungültiger Datensatz K-204 prüfen', 'DATA-103: Ungültiger Datensatz K-205 prüfen']);
  });
  it('webhook → AI → routing sends billing to Jira and the rest via REST', () => {
    const eng = new FlowEngine(buildTemplate('webhook-ai'), 'en');
    eng.runToEnd();
    expect(eng.stats.get('t5')!.delivered).toBe(2);
    expect(eng.stats.get('t6')!.delivered).toBe(4);
    expect(eng.output('t5')[0]).toBe('SUP-101: Abrechnung: T-301');
  });
  it('retry template: transient 500 handled with backoff, aggregate emits once at the end', () => {
    const eng = new FlowEngine(buildTemplate('api-retry'));
    const steps = eng.runToEnd();
    const s = eng.stats.get('t3')!;
    expect(s.retries).toBe(2);
    expect(s.rels['success']).toBe(7);
    const retryTicks = eng.eventsFor('t3').filter(e => e.type === 'retry').map(e => e.tick);
    expect(retryTicks[1] - retryTicks[0]).toBeGreaterThanOrEqual(1);
    const aggEmits = eng.eventsFor('t4').filter(e => e.code === 'agg.emit');
    expect(aggEmits.length).toBe(1);
    expect(aggEmits[0].tick).toBe(steps.length - 1);
    expect(eng.output('t5')[0]).toBe('groups;total');
    expect(eng.stats.get('t5')!.delivered).toBe(1);
  });
  it('permanent error ends in failure; unconnected failure is dropped', () => {
    const g = buildTemplate('api-retry');
    g.nodes[2].config['simulateError'] = 'permanent';
    g.nodes[2].config['maxRetries'] = '2';
    const eng = new FlowEngine(g);
    eng.runToEnd();
    const s = eng.stats.get('t3')!;
    expect(s.retries).toBe(2);
    expect(s.rels['failure']).toBe(1);
    expect(eng.eventsFor('t3').some(e => e.type === 'drop' && e.code === 'api.giveup')).toBe(true);
  });
  it('drops records on unconnected relationships and finishes with sources only', () => {
    let g: FlowGraph = { nodes: [], edges: [] };
    g = addNode(g, 'db-query').graph;
    const eng = new FlowEngine(g);
    eng.runToEnd();
    expect(eng.stats.get(g.nodes[0].id)).toMatchObject({ dropped: 5, out: 0 });
    expect(eng.provenance.filter(e => e.type === 'drop').length).toBe(5);
  });
  it('handles empty graphs and keeps provenance before/after snapshots', () => {
    const empty = new FlowEngine({ nodes: [], edges: [] });
    expect(empty.step().finished).toBe(true);
    const eng = new FlowEngine(buildTemplate('api-warehouse'));
    eng.runToEnd();
    const ev = eng.eventsFor('t2').find(e => e.code === 'json.ok')!;
    expect(typeof ev.before).toBe('string');
    expect(typeof ev.after).toBe('object');
    expect(eng.step()).toMatchObject({ finished: true, events: [] });
  });
  it('fan-in: two sources into one processor are both processed', () => {
    let g: FlowGraph = { nodes: [], edges: [] };
    const a = addNode(g, 'db-query'); g = a.graph;
    const b = addNode(g, 'csv-file'); g = b.graph;
    const w = addNode(g, 'warehouse'); g = w.graph;
    g = connect(g, a.node.id, 'success', w.node.id).graph;
    g = connect(g, b.node.id, 'success', w.node.id).graph;
    const eng = new FlowEngine(g);
    eng.runToEnd();
    expect(eng.stats.get(w.node.id)!.delivered).toBe(11);
  });
  it('all templates finish well below the tick limit', () => {
    for (const id of TEMPLATE_IDS) {
      const eng = new FlowEngine(buildTemplate(id));
      eng.runToEnd();
      expect(eng.tick, id).toBeLessThan(40);
      expect(eng.totalQueued(), id).toBe(0);
    }
  });
});
