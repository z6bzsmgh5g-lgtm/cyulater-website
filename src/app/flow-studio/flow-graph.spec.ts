import { addNode, canConnect, clampPos, connect, edgePath, freeRel, freeSlot, graphIssues, moveNode, removeEdge, removeNode, topoOrder, updateConfig, CANVAS_W, NODE_W } from './flow-graph';
import { FlowGraph } from './flow-model';
import { buildTemplate } from './flow-templates';

const empty = (): FlowGraph => ({ nodes: [], edges: [] });

describe('flow graph editing', () => {
  it('adds nodes with defaults at free, non-overlapping slots', () => {
    let g = empty();
    const a = addNode(g, 'rest-get'); g = a.graph;
    const b = addNode(g, 'json-parse', undefined, a.node); g = b.graph;
    expect(a.node.config['url']).toContain('example.com');
    expect(b.node.x).toBeGreaterThan(a.node.x);
    expect(new Set(g.nodes.map(n => n.id)).size).toBe(2);
    const c = addNode(g, 'filter', { x: 99999, y: -5 });
    expect(c.node.x).toBe(CANVAS_W - NODE_W - 8);
    expect(c.node.y).toBe(8);
    expect(freeSlot(g)).not.toEqual({ x: a.node.x, y: a.node.y });
  });
  it('connects with validation (self, source input, sink output, cycle, unknown rel)', () => {
    let g = empty();
    const s = addNode(g, 'rest-get'); g = s.graph;
    const f = addNode(g, 'filter'); g = f.graph;
    const m = addNode(g, 'map-fields'); g = m.graph;
    const w = addNode(g, 'warehouse'); g = w.graph;
    expect(canConnect(g, f.node.id, 'matched', f.node.id)).toBe('self');
    expect(canConnect(g, f.node.id, 'matched', s.node.id)).toBe('into-source');
    expect(canConnect(g, w.node.id, 'success', f.node.id)).toBe('from-sink');
    expect(canConnect(g, f.node.id, 'nope', m.node.id)).toBe('unknown-rel');
    expect(canConnect(g, 'zzz', 'success', m.node.id)).toBe('missing');
    g = connect(g, f.node.id, 'matched', m.node.id).graph;
    expect(connect(g, m.node.id, 'success', f.node.id)).toMatchObject({ ok: false, error: 'cycle' });
    const r = connect(g, s.node.id, 'success', f.node.id);
    expect(r.ok).toBe(true);
    expect(r.edge).toMatchObject({ from: s.node.id, rel: 'success', to: f.node.id });
  });
  it('replaces the target of an already connected relationship', () => {
    let g = buildTemplate('api-warehouse');
    g = connect(g, 't3', 'matched', 't5').graph;
    expect(g.edges.filter(e => e.from === 't3' && e.rel === 'matched').map(e => e.to)).toEqual(['t5']);
  });
  it('freeRel picks the first unconnected relationship', () => {
    const g = buildTemplate('api-warehouse');
    expect(freeRel(g, 't3')).toBe('unmatched');
    expect(freeRel(g, 't2')).toBe('failure');
    expect(freeRel(g, 't5')).toBeNull();
  });
  it('moves, configures and removes nodes/edges immutably', () => {
    const g = buildTemplate('api-warehouse');
    const moved = moveNode(g, 't1', 100, 100);
    expect(moved.nodes[0]).toMatchObject({ x: 100, y: 100 });
    expect(g.nodes[0].x).toBe(24);
    expect(updateConfig(g, 't3', 'expression', 'amount > 5').nodes[2].config['expression']).toBe('amount > 5');
    const r = removeNode(g, 't3');
    expect(r.nodes.length).toBe(4);
    expect(r.edges.some(e => e.from === 't3' || e.to === 't3')).toBe(false);
    expect(removeEdge(g, 'te1').edges.length).toBe(3);
    expect(clampPos(-10, -10)).toEqual({ x: 8, y: 8 });
  });
  it('orders topologically and reports issues', () => {
    const g = buildTemplate('webhook-ai');
    expect(topoOrder(g).map(n => n.id).slice(0, 4)).toEqual(['t1', 't2', 't3', 't4']);
    expect(graphIssues(empty())).toEqual([{ code: 'empty' }]);
    expect(graphIssues(g)).toEqual([]);
    const lonely = addNode(g, 'filter').graph;
    expect(graphIssues(lonely).map(i => i.code)).toEqual(['unconnected-input']);
    const noSrc = removeNode(g, 't1');
    expect(graphIssues(noSrc).map(i => i.code)).toContain('no-source');
  });
  it('draws bezier paths between ports', () => {
    const g = buildTemplate('api-warehouse');
    expect(edgePath(g.nodes[0], 'success', g.nodes[1])).toBe('M 180 226 C 220 226, 220 226, 260 226');
  });
});
