/** Immutable graph editing helpers (pure). */
import { FlowEdge, FlowGraph, FlowNode, PROCESSOR_MAP, ProcessorType } from './flow-model';

export type ConnectError = 'self' | 'into-source' | 'from-sink' | 'unknown-rel' | 'cycle' | 'missing';
export interface ConnectResult { ok: boolean; graph: FlowGraph; error?: ConnectError; edge?: FlowEdge; }

export const NODE_W = 156;
export const NODE_H = 72;
export const CANVAS_W = 1130;
export const COL = 236;
export const ROW = 110;
export const colX = (c: number) => 24 + c * COL;
export const CANVAS_H = 500;

let seq = 0;
export function newId(prefix: string, graph: FlowGraph): string {
  const used = new Set([...graph.nodes.map(n => n.id), ...graph.edges.map(e => e.id)]);
  let id: string;
  do { id = `${prefix}${++seq}`; } while (used.has(id));
  return id;
}

export function clampPos(x: number, y: number): { x: number; y: number } {
  return { x: Math.round(Math.min(Math.max(x, 8), CANVAS_W - NODE_W - 8)), y: Math.round(Math.min(Math.max(y, 8), CANVAS_H - NODE_H - 8)) };
}

/** Next free grid slot to the right of `after` (or the first free slot). */
export function freeSlot(graph: FlowGraph, after?: FlowNode): { x: number; y: number } {
  const taken = (x: number, y: number) => graph.nodes.some(n => Math.abs(n.x - x) < NODE_W - 20 && Math.abs(n.y - y) < NODE_H);
  const startCol = after ? Math.round((after.x - 24) / COL) + 1 : 0;
  const rowPref = after ? Math.round((after.y - 40) / 110) : 0;
  for (let c = startCol; c < 5; c++) for (let dr = 0; dr < 4; dr++) {
    for (const r of [rowPref + dr, rowPref - dr]) {
      if (r < 0 || r > 3) continue;
      const x = colX(c), y = 40 + r * ROW;
      if (!taken(x, y)) return clampPos(x, y);
    }
  }
  return clampPos(colX(graph.nodes.length % 5), 40 + (Math.floor(graph.nodes.length / 5) % 4) * ROW);
}

export function addNode(graph: FlowGraph, type: ProcessorType, pos?: { x: number; y: number }, after?: FlowNode): { graph: FlowGraph; node: FlowNode } {
  const p = pos ? clampPos(pos.x, pos.y) : freeSlot(graph, after);
  const node: FlowNode = { id: newId('n', graph), type, x: p.x, y: p.y, config: { ...PROCESSOR_MAP[type].defaults } };
  return { graph: { ...graph, nodes: [...graph.nodes, node] }, node };
}

export function moveNode(graph: FlowGraph, id: string, x: number, y: number): FlowGraph {
  const p = clampPos(x, y);
  return { ...graph, nodes: graph.nodes.map(n => (n.id === id ? { ...n, ...p } : n)) };
}

export function removeNode(graph: FlowGraph, id: string): FlowGraph {
  return { nodes: graph.nodes.filter(n => n.id !== id), edges: graph.edges.filter(e => e.from !== id && e.to !== id) };
}

export function removeEdge(graph: FlowGraph, id: string): FlowGraph {
  return { ...graph, edges: graph.edges.filter(e => e.id !== id) };
}

export function updateConfig(graph: FlowGraph, id: string, key: string, value: string): FlowGraph {
  return { ...graph, nodes: graph.nodes.map(n => (n.id === id ? { ...n, config: { ...n.config, [key]: value } } : n)) };
}

export function reachable(graph: FlowGraph, from: string, target: string): boolean {
  const seen = new Set<string>(); const stack = [from];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === target) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const e of graph.edges) if (e.from === cur) stack.push(e.to);
  }
  return false;
}

export function canConnect(graph: FlowGraph, from: string, rel: string, to: string): ConnectError | null {
  const a = graph.nodes.find(n => n.id === from), b = graph.nodes.find(n => n.id === to);
  if (!a || !b) return 'missing';
  if (from === to) return 'self';
  if (PROCESSOR_MAP[b.type].category === 'source') return 'into-source';
  const rels = PROCESSOR_MAP[a.type].rels;
  if (!rels.length) return 'from-sink';
  if (!rels.includes(rel)) return 'unknown-rel';
  if (reachable(graph, to, from)) return 'cycle';
  return null;
}

/** Connect `from.rel` → `to`. Each relationship has at most one target; an existing one is replaced. */
export function connect(graph: FlowGraph, from: string, rel: string, to: string): ConnectResult {
  const base = { ...graph, edges: graph.edges.filter(e => !(e.from === from && e.rel === rel)) };
  const error = canConnect(base, from, rel, to);
  if (error) return { ok: false, graph, error };
  const edge: FlowEdge = { id: newId('e', graph), from, rel, to };
  return { ok: true, graph: { ...base, edges: [...base.edges, edge] }, edge };
}

/** First relationship of `from` that is still unconnected (success-like first), or the first one. */
export function freeRel(graph: FlowGraph, from: string): string | null {
  const n = graph.nodes.find(x => x.id === from);
  if (!n) return null;
  const rels = PROCESSOR_MAP[n.type].rels;
  return rels.find(r => !graph.edges.some(e => e.from === from && e.rel === r)) ?? rels[0] ?? null;
}

/** Topological order (Kahn); nodes in cycles/unreached are appended in insertion order. */
export function topoOrder(graph: FlowGraph): FlowNode[] {
  const indeg = new Map(graph.nodes.map(n => [n.id, 0]));
  for (const e of graph.edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  const queue = graph.nodes.filter(n => indeg.get(n.id) === 0);
  const out: FlowNode[] = []; const seen = new Set<string>();
  while (queue.length) {
    const n = queue.shift()!;
    if (seen.has(n.id)) continue;
    seen.add(n.id); out.push(n);
    for (const e of graph.edges.filter(x => x.from === n.id)) {
      indeg.set(e.to, indeg.get(e.to)! - 1);
      if (indeg.get(e.to) === 0) queue.push(graph.nodes.find(x => x.id === e.to)!);
    }
  }
  return [...out, ...graph.nodes.filter(n => !seen.has(n.id))];
}

/** Warnings shown before a run. */
export function graphIssues(graph: FlowGraph): { code: 'no-source' | 'no-sink' | 'unconnected-input' | 'empty'; nodeId?: string }[] {
  const issues: { code: 'no-source' | 'no-sink' | 'unconnected-input' | 'empty'; nodeId?: string }[] = [];
  if (!graph.nodes.length) return [{ code: 'empty' }];
  if (!graph.nodes.some(n => PROCESSOR_MAP[n.type].category === 'source')) issues.push({ code: 'no-source' });
  if (!graph.nodes.some(n => PROCESSOR_MAP[n.type].category === 'sink')) issues.push({ code: 'no-sink' });
  for (const n of graph.nodes) {
    if (PROCESSOR_MAP[n.type].category !== 'source' && !graph.edges.some(e => e.to === n.id)) issues.push({ code: 'unconnected-input', nodeId: n.id });
  }
  return issues;
}

/** Cubic bezier between an output port and the target's input. */
export function portY(node: FlowNode, rel: string): number {
  const rels = PROCESSOR_MAP[node.type].rels;
  const i = Math.max(0, rels.indexOf(rel));
  return node.y + (NODE_H * (i + 1)) / (rels.length + 1);
}
export function edgePath(from: FlowNode, rel: string, to: FlowNode): string {
  const x1 = from.x + NODE_W, y1 = portY(from, rel), x2 = to.x, y2 = to.y + NODE_H / 2;
  const dx = Math.max(36, Math.abs(x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}
export function pathMid(from: FlowNode, rel: string, to: FlowNode): { x: number; y: number } {
  return { x: (from.x + NODE_W + to.x) / 2, y: (portY(from, rel) + to.y + NODE_H / 2) / 2 };
}
