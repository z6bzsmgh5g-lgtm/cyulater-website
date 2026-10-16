/** Preset flows. Positions are canvas coordinates (see CANVAS_W/H). */
import { FlowEdge, FlowGraph, FlowNode, PROCESSOR_MAP, ProcessorType } from './flow-model';
import { colX } from './flow-graph';

export type TemplateId = 'api-warehouse' | 'csv-jira' | 'webhook-ai' | 'api-retry';
export const TEMPLATE_IDS: TemplateId[] = ['api-warehouse', 'csv-jira', 'webhook-ai', 'api-retry'];

function n(id: string, type: ProcessorType, x: number, y: number, config: Record<string, string> = {}): FlowNode {
  return { id, type, x, y, config: { ...PROCESSOR_MAP[type].defaults, ...config } };
}
function e(id: string, from: string, rel: string, to: string): FlowEdge { return { id, from, rel, to }; }

export function buildTemplate(id: TemplateId): FlowGraph {
  switch (id) {
    case 'api-warehouse':
      return {
        nodes: [n('t1', 'rest-get', colX(0), 190), n('t2', 'json-parse', colX(1), 190), n('t3', 'filter', colX(2), 190, { expression: 'amount > 100' }),
          n('t4', 'map-fields', colX(3), 120), n('t5', 'warehouse', colX(4), 120, { table: 'analytics.orders' })],
        edges: [e('te1', 't1', 'success', 't2'), e('te2', 't2', 'success', 't3'), e('te3', 't3', 'matched', 't4'), e('te4', 't4', 'success', 't5')],
      };
    case 'csv-jira':
      return {
        nodes: [n('t1', 'csv-file', colX(0), 190), n('t2', 'validate', colX(1), 190), n('t3', 'warehouse', colX(2), 80, { table: 'crm.customers' }),
          n('t4', 'jira-ticket', colX(2), 320, { project: 'DATA', summary: 'Ungültiger Datensatz {id} prüfen' })],
        edges: [e('te1', 't1', 'success', 't2'), e('te2', 't2', 'valid', 't3'), e('te3', 't2', 'invalid', 't4')],
      };
    case 'webhook-ai':
      return {
        nodes: [n('t1', 'webhook', colX(0), 190), n('t2', 'json-parse', colX(1), 190), n('t3', 'ai-classify', colX(2), 190),
          n('t4', 'filter', colX(3), 190, { expression: 'category == billing' }),
          n('t5', 'jira-ticket', colX(4), 80, { project: 'SUP', summary: 'Abrechnung: {ticketId}' }), n('t6', 'rest-post', colX(4), 320, { url: 'https://helpdesk.example.com/v1/tickets' })],
        edges: [e('te1', 't1', 'success', 't2'), e('te2', 't2', 'success', 't3'), e('te3', 't3', 'success', 't4'),
          e('te4', 't4', 'matched', 't5'), e('te5', 't4', 'unmatched', 't6')],
      };
    case 'api-retry':
      return {
        nodes: [n('t1', 'rest-get', colX(0), 190), n('t2', 'json-parse', colX(1), 190), n('t3', 'enrich-api', colX(2), 190, { simulateError: 'transient' }),
          n('t4', 'aggregate', colX(3), 190, { groupBy: 'segment', sumField: 'amount' }), n('t5', 'csv-export', colX(4), 190, { file: 'umsatz_je_segment.csv' })],
        edges: [e('te1', 't1', 'success', 't2'), e('te2', 't2', 'success', 't3'), e('te3', 't3', 'success', 't4'), e('te4', 't4', 'success', 't5')],
      };
  }
}
