import { FlowEngine, ProvEvent } from './flow-engine';
import { explainAction, explainEvent, explainRun, eventPriority, nodeLabel, pickNarration } from './flow-explain';
import { FLOW_TEXTS, fmt } from './flow-i18n';
import { PROCESSORS } from './flow-model';
import { buildTemplate, TEMPLATE_IDS } from './flow-templates';
import { addNode } from './flow-graph';

const ev = (p: Partial<ProvEvent>): ProvEvent => ({ seq: 1, tick: 1, nodeId: 't3', ffId: 'FF-001', type: 'route', code: 'filter.nomatch', params: {}, ...p });

describe('flow explanations', () => {
  it('formats templates and leaves unknown placeholders', () => {
    expect(fmt('{a} und {b}', { a: 1 })).toBe('1 und {b}');
  });
  it('has complete DE and EN texts with identical keys', () => {
    for (const k of ['ui', 'codes', 'actions', 'summary', 'connectErrors', 'issues', 'fields', 'options'] as const) {
      expect(Object.keys(FLOW_TEXTS.en[k]).sort(), k).toEqual(Object.keys(FLOW_TEXTS.de[k]).sort());
    }
    for (const p of PROCESSORS) {
      expect(FLOW_TEXTS.de.procs[p.type].name).toBeTruthy();
      expect(FLOW_TEXTS.en.procs[p.type].desc).toBeTruthy();
      for (const f of p.fields) expect(FLOW_TEXTS.de.fields[f.key], f.key).toBeTruthy();
    }
    for (const id of TEMPLATE_IDS) expect(FLOW_TEXTS.en.templates[id].intro).toBeTruthy();
    expect(FLOW_TEXTS.de.tour.length).toBe(FLOW_TEXTS.en.tour.length);
  });
  it('labels duplicate processors with an index', () => {
    let g = buildTemplate('webhook-ai');
    expect(nodeLabel(g, g.nodes[3], 'de')).toBe('Filtern');
    g = addNode(g, 'filter').graph;
    expect(nodeLabel(g, g.nodes[3], 'de')).toBe('Filtern #1');
    expect(nodeLabel(g, g.nodes[6], 'en')).toBe('Filter #2');
    expect(nodeLabel(g, undefined, 'en')).toBe('?');
  });
  it('explains filter decisions with values and why', () => {
    const g = buildTemplate('api-warehouse');
    const n = explainEvent(ev({ params: { expr: 'amount > 100', field: 'amount', value: '85' } }), g, 'de');
    expect(n.text).toBe('Filtern: amount = 85 erfüllt „amount > 100“ nicht – Datensatz geht an „unmatched“.');
    expect(explainEvent(ev({ params: { expr: 'amount > 100', field: 'amount', value: '85' } }), g, 'en').text).toContain('does not meet');
  });
  it('explains drops, retries and give-ups with tone', () => {
    const g = buildTemplate('api-retry');
    const drop = explainEvent(ev({ nodeId: 't2', type: 'drop', code: 'json.invalid', rel: 'failure', params: { rel: 'failure', error: 'Unexpected end' } }), g, 'de');
    expect(drop.tone).toBe('warn');
    expect(drop.text).toContain('„failure“ ist nicht verbunden');
    const retry = explainEvent(ev({ nodeId: 't3', type: 'retry', code: 'api.500', params: { attempt: 1, wait: 1, max: 3 } }), g, 'de');
    expect(retry).toMatchObject({ tone: 'warn' });
    expect(retry.text).toContain('HTTP 500');
    expect(retry.text).toContain('Backoff');
    expect(explainEvent(ev({ code: 'api.giveup', params: { attempts: 4 } }), g, 'en').tone).toBe('error');
    expect(explainEvent(ev({ code: 'unknown.code' }), g, 'en').text).toContain('passed the record on');
  });
  it('prioritizes errors over routine steps and novel over repeated events', () => {
    expect(eventPriority(ev({ code: 'api.500', type: 'retry' }), false)).toBeGreaterThan(eventPriority(ev({ code: 'json.ok' }), true));
    expect(eventPriority(ev({ code: 'json.ok' }), true)).toBeGreaterThan(eventPriority(ev({ code: 'json.ok' }), false));
    expect(eventPriority(ev({ type: 'create', code: 'src.rest-get' }), true)).toBeLessThan(0);
    const seen = new Set<string>();
    const a = ev({ code: 'json.ok', nodeId: 't2' }), b = ev({ code: 'api.500', type: 'retry', nodeId: 't3' });
    expect(pickNarration([a, b], seen)).toBe(b);
    expect(pickNarration([a], seen)).toBe(a);
    expect(pickNarration([a], seen)).toBeNull();
  });
  it('explains user actions', () => {
    expect(explainAction('connected', { from: 'A', to: 'B', rel: 'success' }, 'de')).toContain('„A“ → „B“');
    expect(explainAction('unknown', {}, 'en')).toBe('unknown');
  });
  it('summarizes a run in plain language (filter: 3 von 7 verworfen)', () => {
    const eng = new FlowEngine(buildTemplate('api-warehouse'));
    eng.runToEnd();
    const s = explainRun(eng, 'de').map(n => n.text);
    expect(s[0]).toMatch(/^Lauf beendet nach \d+ Takten: 8 Datensätze erzeugt, 4 zugestellt, 1 als Fehler markiert, 4 verworfen\.$/);
    expect(s).toContain('Filtern hat 3 von 7 Datensätzen aussortiert, weil sie die Bedingung „amount > 100“ nicht erfüllt haben.');
    expect(s.some(t => t.startsWith('JSON parsen: 1 von 8'))).toBe(true);
  });
  it('summarizes retries, tickets and AI categories', () => {
    const r = new FlowEngine(buildTemplate('api-retry')); r.runToEnd();
    expect(explainRun(r, 'en').some(n => n.text.includes('had to retry 2 time(s) – then the transfer succeeded'))).toBe(true);
    const j = new FlowEngine(buildTemplate('csv-jira')); j.runToEnd();
    expect(explainRun(j, 'de').some(n => n.text.includes('DATA-101, DATA-102, DATA-103'))).toBe(true);
    const a = new FlowEngine(buildTemplate('webhook-ai')); a.runToEnd();
    const ai = explainRun(a, 'de').find(n => n.nodeId === 't3')!;
    expect(ai.text).toContain('2× billing');
    expect(ai.text).toContain('1× other');
  });
});
