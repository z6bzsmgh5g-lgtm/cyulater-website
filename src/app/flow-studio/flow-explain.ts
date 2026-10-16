/** Plain-language explanations for engine events, user actions and run summaries (pure). */
import { FlowEngine, ProvEvent } from './flow-engine';
import { FlowGraph, FlowNode, Lang, PROCESSOR_MAP } from './flow-model';
import { FLOW_TEXTS, fmt } from './flow-i18n';

export type Tone = 'info' | 'success' | 'warn' | 'error';
export interface Narration { text: string; tone: Tone; nodeId?: string; }

export function nodeLabel(graph: FlowGraph, node: FlowNode | undefined, lang: Lang): string {
  if (!node) return '?';
  const name = FLOW_TEXTS[lang].procs[node.type].name;
  const same = graph.nodes.filter(n => n.type === node.type);
  return same.length > 1 ? `${name} #${same.indexOf(node) + 1}` : name;
}

const TONE: Record<string, Tone> = {
  'json.invalid': 'error', 'api.giveup': 'error', 'api.500': 'warn', 'validate.invalid': 'warn', 'filter.nomatch': 'info',
  'filter.badexpr': 'error', 'filter.missing': 'warn', 'map.missing': 'warn', 'ai.other': 'warn', 'enrich.nomatch': 'warn',
  'dwh.ok': 'success', 'jira.ok': 'success', 'post.ok': 'success', 'csv.ok': 'success', 'agg.emit': 'success',
};

export function explainEvent(ev: ProvEvent, graph: FlowGraph, lang: Lang): Narration {
  const T = FLOW_TEXTS[lang];
  const node = graph.nodes.find(n => n.id === ev.nodeId);
  const params = { ...ev.params, node: nodeLabel(graph, node, lang), ff: ev.ffId };
  if (ev.type === 'drop') {
    const base = T.codes[ev.code] ? fmt(T.codes[ev.code], params) + ' ' : '';
    return { text: base + fmt(T.codes['drop'], params), tone: 'warn', nodeId: ev.nodeId };
  }
  const tpl = T.codes[ev.code] ?? T.codes['noop'];
  return { text: fmt(tpl, params), tone: TONE[ev.code] ?? 'info', nodeId: ev.nodeId };
}

/** Priority for the narrator: errors and routing decisions beat routine steps; first occurrences beat repeats. */
export function eventPriority(ev: ProvEvent, novel: boolean): number {
  if (ev.type === 'create') return -1; // the source's route event carries the same information
  if (ev.code === 'api.giveup' || ev.code === 'json.invalid') return 9;
  if (ev.code === 'api.500') return 8;
  if (ev.type === 'drop') return novel ? 7 : 3;
  if (ev.code === 'validate.invalid' || ev.code === 'filter.badexpr') return 6;
  if (ev.code === 'agg.emit') return 6;
  if (ev.code === 'filter.nomatch' || ev.code === 'ai.other') return novel ? 5 : 2;
  return novel ? 4 : 1;
}

/** Choose the one event per tick worth narrating; `seen` tracks node+code pairs already explained. */
export function pickNarration(events: ProvEvent[], seen: Set<string>): ProvEvent | null {
  let best: ProvEvent | null = null, bestP = 1;
  for (const ev of events) {
    const key = `${ev.nodeId}|${ev.code}|${ev.type}`;
    const p = eventPriority(ev, !seen.has(key));
    if (p > bestP) { best = ev; bestP = p; }
  }
  if (best) seen.add(`${best.nodeId}|${best.code}|${best.type}`);
  return best;
}

export function explainAction(action: string, params: Record<string, string>, lang: Lang): string {
  return fmt(FLOW_TEXTS[lang].actions[action] ?? action, params);
}

/** End-of-run explanations: overall numbers plus per-processor insights. */
export function explainRun(engine: FlowEngine, lang: Lang): Narration[] {
  const T = FLOW_TEXTS[lang];
  const g = engine.graph;
  let delivered = 0, failed = 0, dropped = 0;
  for (const s of engine.stats.values()) { delivered += s.delivered; failed += s.failed; dropped += s.dropped; }
  const out: Narration[] = [{ text: fmt(T.summary['run'], { ticks: engine.tick, created: engine.created, delivered, failed, dropped }), tone: 'success' }];
  const drops: Narration[] = [];
  for (const n of g.nodes) {
    const s = engine.stats.get(n.id)!;
    const label = nodeLabel(g, n, lang);
    const p = { node: label, total: s.in };
    if (n.type === 'filter' && s.in) out.push({ text: fmt(T.summary['filter'], { ...p, unmatched: s.rels['unmatched'] ?? 0, expr: n.config['expression'] }), tone: 'info', nodeId: n.id });
    if (n.type === 'validate' && s.rels['invalid']) out.push({ text: fmt(T.summary['validate'], { ...p, invalid: s.rels['invalid'] }), tone: 'warn', nodeId: n.id });
    if (n.type === 'json-parse' && s.rels['failure']) out.push({ text: fmt(T.summary['json'], { ...p, failed: s.rels['failure'] }), tone: 'warn', nodeId: n.id });
    if (s.retries) out.push({ text: fmt(T.summary[s.rels['failure'] ? 'retry' : 'retryOk'], { node: label, retries: s.retries, failed: s.rels['failure'] ?? 0 }), tone: s.rels['failure'] ? 'error' : 'success', nodeId: n.id });
    if (n.type === 'jira-ticket' && s.delivered) {
      const keys = engine.output(n.id).map(l => l.split(':')[0]);
      out.push({ text: fmt(T.summary['jira'], { node: label, n: s.delivered, keys: keys.join(', ') }), tone: 'success', nodeId: n.id });
    }
    if (n.type === 'ai-classify' && s.in) {
      const counts: Record<string, number> = {};
      for (const ev of engine.eventsFor(n.id)) if (ev.params['category']) counts[String(ev.params['category'])] = (counts[String(ev.params['category'])] ?? 0) + 1;
      out.push({ text: fmt(T.summary['ai'], { node: label, cats: Object.entries(counts).map(([k, v]) => `${v}× ${k}`).join(', ') }), tone: 'info', nodeId: n.id });
    }
    if (s.dropped && PROCESSOR_MAP[n.type].category !== 'sink') {
      const rels = [...new Set(engine.eventsFor(n.id).filter(e => e.type === 'drop').map(e => e.rel))].join(', ');
      drops.push({ text: fmt(T.summary['dropped'], { node: label, n: s.dropped, rels }), tone: 'warn', nodeId: n.id });
    }
  }
  return [...out, ...drops];
}
