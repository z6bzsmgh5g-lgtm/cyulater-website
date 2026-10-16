/**
 * Flow Studio – data model, processor catalog and DEMO sample data.
 * Pure TypeScript (no Angular) so the simulation can be unit-tested in isolation.
 */
export type Lang = 'de' | 'en';
export type Category = 'source' | 'transform' | 'sink';
export type ProcessorType =
  | 'rest-get' | 'csv-file' | 'db-query' | 'webhook'
  | 'json-parse' | 'map-fields' | 'filter' | 'enrich-api' | 'aggregate' | 'ai-classify' | 'validate'
  | 'warehouse' | 'jira-ticket' | 'rest-post' | 'csv-export';

export interface ConfigField { key: string; kind: 'text' | 'textarea' | 'select' | 'number'; options?: string[]; }
export interface ProcessorDef {
  type: ProcessorType;
  category: Category;
  /** Short glyph shown in the node badge. */
  glyph: string;
  /** Outgoing relationships (NiFi terminology). Sinks without a failure path have none. */
  rels: string[];
  fields: ConfigField[];
  defaults: Record<string, string>;
}

const ERR_MODES = ['off', 'transient', 'permanent'];

export const PROCESSORS: readonly ProcessorDef[] = [
  { type: 'rest-get', category: 'source', glyph: 'GET', rels: ['success'],
    fields: [{ key: 'url', kind: 'text' }], defaults: { url: 'https://api.example.com/v1/orders' } },
  { type: 'csv-file', category: 'source', glyph: 'CSV', rels: ['success'],
    fields: [{ key: 'file', kind: 'text' }, { key: 'delimiter', kind: 'select', options: [';', ','] }], defaults: { file: 'kunden_export.csv', delimiter: ';' } },
  { type: 'db-query', category: 'source', glyph: 'SQL', rels: ['success'],
    fields: [{ key: 'query', kind: 'textarea' }], defaults: { query: 'SELECT id, name, segment, revenue FROM customers WHERE active = 1' } },
  { type: 'webhook', category: 'source', glyph: 'HOOK', rels: ['success'],
    fields: [{ key: 'path', kind: 'text' }], defaults: { path: '/hooks/support' } },
  { type: 'json-parse', category: 'transform', glyph: '{ }', rels: ['success', 'failure'], fields: [], defaults: {} },
  { type: 'map-fields', category: 'transform', glyph: 'MAP', rels: ['success'],
    fields: [{ key: 'mapping', kind: 'textarea' }], defaults: { mapping: 'order_id=id\ncustomer_name=customer\namount_eur=amount\nstatus=status' } },
  { type: 'filter', category: 'transform', glyph: 'IF', rels: ['matched', 'unmatched'],
    fields: [{ key: 'expression', kind: 'text' }], defaults: { expression: 'amount > 100' } },
  { type: 'enrich-api', category: 'transform', glyph: 'API+', rels: ['success', 'failure'],
    fields: [{ key: 'url', kind: 'text' }, { key: 'simulateError', kind: 'select', options: ERR_MODES }, { key: 'maxRetries', kind: 'number' }],
    defaults: { url: 'https://crm.example.com/v1/customers/{customer}', simulateError: 'off', maxRetries: '3' } },
  { type: 'aggregate', category: 'transform', glyph: 'Σ', rels: ['success'],
    fields: [{ key: 'groupBy', kind: 'text' }, { key: 'sumField', kind: 'text' }], defaults: { groupBy: 'status', sumField: 'amount' } },
  { type: 'ai-classify', category: 'transform', glyph: 'KI', rels: ['success'],
    fields: [{ key: 'field', kind: 'text' }], defaults: { field: 'text' } },
  { type: 'validate', category: 'transform', glyph: '✓', rels: ['valid', 'invalid'],
    fields: [{ key: 'required', kind: 'text' }, { key: 'emailField', kind: 'text' }, { key: 'positiveField', kind: 'text' }],
    defaults: { required: 'id, name, email', emailField: 'email', positiveField: 'amount' } },
  { type: 'warehouse', category: 'sink', glyph: 'DWH', rels: [],
    fields: [{ key: 'table', kind: 'text' }], defaults: { table: 'analytics.orders' } },
  { type: 'jira-ticket', category: 'sink', glyph: 'JIRA', rels: [],
    fields: [{ key: 'project', kind: 'text' }, { key: 'summary', kind: 'text' }], defaults: { project: 'DEMO', summary: 'Datensatz {id} prüfen' } },
  { type: 'rest-post', category: 'sink', glyph: 'POST', rels: ['failure'],
    fields: [{ key: 'url', kind: 'text' }, { key: 'simulateError', kind: 'select', options: ERR_MODES }, { key: 'maxRetries', kind: 'number' }],
    defaults: { url: 'https://erp.example.com/v1/import', simulateError: 'off', maxRetries: '3' } },
  { type: 'csv-export', category: 'sink', glyph: 'CSV↓', rels: [],
    fields: [{ key: 'file', kind: 'text' }], defaults: { file: 'export.csv' } },
];

export const PROCESSOR_MAP: Record<ProcessorType, ProcessorDef> =
  Object.fromEntries(PROCESSORS.map(p => [p.type, p])) as Record<ProcessorType, ProcessorDef>;
export const FAILURE_RELS = new Set(['failure', 'invalid']);

export interface FlowNode { id: string; type: ProcessorType; x: number; y: number; config: Record<string, string>; }
export interface FlowEdge { id: string; from: string; rel: string; to: string; }
export interface FlowGraph { nodes: FlowNode[]; edges: FlowEdge[]; }

// ---------------- DEMO sample data (fictitious) ----------------

const ORDERS = [
  { id: 'ORD-1041', customer: 'Beispiel GmbH', amount: 1290, currency: 'EUR', status: 'open' },
  { id: 'ORD-1042', customer: 'Muster AG', amount: 85, currency: 'EUR', status: 'open' },
  { id: 'ORD-1043', customer: 'Nordlicht KG', amount: 455.5, currency: 'EUR', status: 'paid' },
  { id: 'ORD-1044', customer: 'Beispiel GmbH', amount: 2400, currency: 'EUR', status: 'open' },
  null, // malformed payload (truncated JSON)
  { id: 'ORD-1046', customer: 'Alpenblick e.K.', amount: 49.9, currency: 'EUR', status: 'cancelled' },
  { id: 'ORD-1047', customer: 'Nordlicht KG', amount: 730, currency: 'EUR', status: 'paid' },
  { id: 'ORD-1048', customer: 'Fiktiv Systems', amount: 99, currency: 'EUR', status: 'open' },
];
const MALFORMED = '{"id":"ORD-1045","customer":"Muster AG","amount":';

const CSV_HEADER = ['id', 'name', 'email', 'amount'];
const CSV_ROWS = [
  ['K-201', 'Anna Beispiel', 'anna@beispiel.example', '120.00'],
  ['K-202', 'Ben Muster', 'ben.muster(at)muster.example', '80.00'],
  ['K-203', 'Clara Test', 'clara@test.example', '250.00'],
  ['K-204', '', 'david@demo.example', '40.00'],
  ['K-205', 'Eva Fiktiv', 'eva@fiktiv.example', '-15.00'],
  ['K-206', 'Frank Demo', 'frank@demo.example', '310.00'],
];

const CUSTOMERS = [
  { id: 'C-01', name: 'Beispiel GmbH', segment: 'enterprise', revenue: 182000 },
  { id: 'C-02', name: 'Muster AG', segment: 'mid-market', revenue: 64000 },
  { id: 'C-03', name: 'Nordlicht KG', segment: 'mid-market', revenue: 51000 },
  { id: 'C-04', name: 'Alpenblick e.K.', segment: 'smb', revenue: 9800 },
  { id: 'C-05', name: 'Fiktiv Systems', segment: 'smb', revenue: 12500 },
];

const MESSAGES: Record<Lang, string[]> = {
  de: [
    'Unsere Rechnung vom September wurde doppelt abgebucht.',
    'Der Login schlägt seit dem Update mit Fehler 403 fehl.',
    'Bitte senden Sie uns ein Angebot für 25 Lizenzen.',
    'Die API liefert seit heute Morgen Timeouts.',
    'Die Gutschrift für die Rücksendung fehlt noch auf der Rechnung.',
    'Vielen Dank für die schnelle Hilfe!',
  ],
  en: [
    'Our September invoice was charged twice.',
    'Login has failed with error 403 since the update.',
    'Please send us a quote for 25 licenses.',
    'The API has been returning timeouts since this morning.',
    'The refund for the return is still missing on the invoice.',
    'Thanks a lot for the quick help!',
  ],
};

export interface SampleRecord { content: unknown; attrs: Record<string, string>; }

/** Demo records a source emits, in order. Content is raw text for API/webhook sources (needs JSON parsing). */
export function sampleRecords(type: ProcessorType, lang: Lang): SampleRecord[] {
  switch (type) {
    case 'rest-get':
      return ORDERS.map((o, i) => ({ content: o ? JSON.stringify(o) : MALFORMED, attrs: { 'mime.type': 'application/json', 'http.status': '200', 'record.index': String(i + 1) } }));
    case 'webhook':
      return MESSAGES[lang].map((text, i) => ({
        content: JSON.stringify({ ticketId: `T-${301 + i}`, from: `kunde${i + 1}@demo.example`, text }),
        attrs: { 'mime.type': 'application/json', 'http.method': 'POST' },
      }));
    case 'csv-file':
      return CSV_ROWS.map((r, i) => ({ content: Object.fromEntries(CSV_HEADER.map((h, j) => [h, r[j]])), attrs: { 'csv.line': String(i + 2), 'csv.raw': r.join(';') } }));
    case 'db-query':
      return CUSTOMERS.map((c, i) => ({ content: { ...c }, attrs: { 'sql.row': String(i + 1) } }));
    default:
      return [];
  }
}

/** Fictitious CRM lookup used by "Enrich via API". */
export const CRM_LOOKUP: Record<string, { segment: string; accountManager: string }> = {
  'Beispiel GmbH': { segment: 'enterprise', accountManager: 'A. Demo' },
  'Muster AG': { segment: 'mid-market', accountManager: 'B. Demo' },
  'Nordlicht KG': { segment: 'mid-market', accountManager: 'B. Demo' },
  'Alpenblick e.K.': { segment: 'smb', accountManager: 'C. Demo' },
  'Fiktiv Systems': { segment: 'smb', accountManager: 'C. Demo' },
};

export const CLASSIFIER_KEYWORDS: Record<string, string[]> = {
  billing: ['rechnung', 'abgebucht', 'abbuchung', 'gutschrift', 'zahlung', 'invoice', 'charged', 'refund', 'payment'],
  technical: ['fehler', 'login', 'api', 'timeout', 'absturz', 'error', 'crash', 'passwort', 'password'],
  sales: ['angebot', 'lizenz', 'preis', 'quote', 'license', 'pricing', 'demo'],
};
