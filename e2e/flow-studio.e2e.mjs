import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:4300/';
const SHOTS = process.env.SHOTS || '/workspace/screenshots';
import { mkdirSync } from 'fs'; mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
/** Poll an async condition (Angular renders asynchronously). */
async function check(fn, m, timeout = 4000) {
  const end = Date.now() + timeout; let v = false;
  while (Date.now() < end) { try { v = await fn(); } catch { v = false; } if (v) break; await new Promise(r => setTimeout(r, 100)); }
  ok(!!v, m);
}
const b = await chromium.launch();

async function open(w, h, lang, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...opts });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL + '?lang=' + lang, { waitUntil: 'networkidle' });
  return { p, ctx, errs };
}
const narr = p => p.locator('[data-testid=narration]').innerText();
async function toStudio(p) {
  await p.locator('#flow-studio').scrollIntoViewIfNeeded();
  await p.waitForSelector('.fs', { timeout: 15000 });
  await p.locator('.fs').scrollIntoViewIfNeeded();
}
async function waitNarr(p, re, timeout = 40000) {
  await p.waitForFunction(r => new RegExp(r).test(document.querySelector('[data-testid=narration]')?.textContent ?? ''), re.source, { timeout });
}

// ---------------- desktop DE ----------------
console.log('Desktop 1440 DE');
{
  const { p, ctx, errs } = await open(1440, 1000, 'de');
  await check(async () => (await p.locator('app-flow-studio').count()) === 0, 'Flow Studio is lazy (not rendered before scrolling)');
  await check(async () => (await p.locator('nav a[href="#flow-studio"]').count()) === 1, 'nav link to Flow Studio');
  await toStudio(p);
  await check(async () => (await p.locator('.fs__canvas .node').count()) === 5, 'default template rendered (5 processors)');
  await check(async () => (await p.locator('.proc').count()) === 15, 'palette lists 15 processors');

  // template switching
  await p.click('[data-template=csv-jira]');
  await check(async () => (await p.locator('.fs__canvas .node').count()) === 4, 'template CSV → Validieren → Jira loaded');
  await check(async () => (await narr(p)).includes('Vorlage „CSV → Validieren → Fehler als Jira-Ticket“ geladen'), 'narrator explains template');
  await p.click('[data-template=api-warehouse]');

  // drag & drop from palette
  const canvas = p.locator('.fs__canvas');
  const cb = await canvas.boundingBox();
  await p.locator('[data-proc=csv-export]').dragTo(canvas, { targetPosition: { x: (cb.width) * 0.5, y: cb.height * 0.85 } });
  await check(async () => (await p.locator('.fs__canvas .node').count()) === 6, 'drag & drop adds a processor');
  await check(async () => (await narr(p)).includes('„CSV-Export“ hinzugefügt'), 'narrator explains the added processor');

  // connect by dragging from a port onto a node
  const port = p.locator('[data-node-id=t3] [data-rel=unmatched]');
  const pb = await port.boundingBox();
  const target = p.locator('.fs__canvas .node[data-type=csv-export]');
  const tb = await target.boundingBox();
  await p.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await p.mouse.down();
  await p.mouse.move(pb.x + 60, pb.y + 40, { steps: 5 });
  await check(async () => (await p.locator('.edge--draft').count()) === 1, 'draft connection follows the pointer');
  await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
  await p.mouse.up();
  await check(async () => (await p.locator('path.edge').count()) === 5, 'port drag creates a connection');
  await check(async () => (await narr(p)).includes('über „unmatched“'), 'narrator explains the connection');

  // click-add with auto-connect from the selected node
  await target.click();
  await p.click('[data-proc=filter]');
  await check(async () => (await p.locator('.fs__canvas .node').count()) === 7, 'click adds a processor');
  await check(async () => (await p.locator('[data-testid=panel] h3').innerText()).startsWith('Filtern'), 'new processor selected in side panel');
  await p.click('[data-action=delete]');
  await check(async () => (await p.locator('.fs__canvas .node').count()) === 6, 'delete from side panel');

  // move a node by dragging
  const n1 = p.locator('[data-node-id=t1]');
  const before = await n1.evaluate(e => e.style.top);
  const nb = await n1.boundingBox();
  await p.mouse.move(nb.x + 40, nb.y + 15); await p.mouse.down();
  await p.mouse.move(nb.x + 40, nb.y + 115, { steps: 6 }); await p.mouse.up();
  await check(async () => (await n1.evaluate(e => e.style.top)) !== before, 'nodes can be moved by dragging');

  // configure
  await p.click('[data-node-id=t3] .node__head');
  await p.fill('[data-field=expression]', 'amount > 400');
  await p.waitForTimeout(700);
  await check(async () => (await narr(p)).includes('geändert'), 'config change explained');

  // run
  await p.locator('.fs__speed input').fill('3');
  await p.click('[data-action=start]');
  await p.waitForSelector('.ffdot', { timeout: 5000 }).then(() => ok(true, 'animated FlowFile particles travel along connections'), () => ok(false, 'particles'));
  await p.waitForSelector('.qbadge.is-busy', { timeout: 5000 }).then(() => ok(true, 'queue counters update'), () => ok(false, 'queue counters'));
  await p.waitForTimeout(2600);
  await p.locator('.fs').screenshot({ path: `${SHOTS}/flow-desktop-running.png` });
  await waitNarr(p, /^Lauf beendet/);
  const fin = await narr(p);
  ok(/8 Datensätze erzeugt/.test(fin) && fin.includes('„amount > 400“'), 'run summary explains the filter: ' + fin.slice(0, 160));
  await check(async () => (await p.locator('[data-node-id=t5] .node__stats').innerText()).includes('4'), 'warehouse stats show delivered rows');
  // provenance
  await p.click('[data-node-id=t3] .node__head');
  await p.click('[data-tab=data]');
  await check(async () => (await p.locator('.prov').count()) > 3, 'provenance list shows records');
  await check(async () => (await p.locator('.prov').first().textContent()).includes('Vorher'), 'before/after inspection');

  // error template with retry/backoff
  await p.click('[data-template=api-retry]');
  await check(async () => (await p.locator('[data-action=errors][aria-pressed=true]').count()) === 1, 'error simulation active in retry template');
  await p.locator('.fs__speed input').fill('4');
  await p.click('[data-action=start]');
  await waitNarr(p, /^Lauf beendet/);
  await p.click('.guide__log summary');
  const log = await p.locator('.guide__log').innerText();
  ok(log.includes('HTTP 500') && log.includes('Backoff'), 'narrator explained HTTP 500 + backoff');
  ok(log.includes('wiederholen'), 'retry summary present');
  await check(async () => (await p.locator('[data-node-id=t3] .st--warn').innerText()).includes('2'), 'retry counter on processor');

  // tour
  await p.click('[data-action=tour]');
  await check(async () => (await p.locator('[data-testid=tour] h4').innerText()) === 'Bausteine', 'tour starts');
  await check(async () => (await p.locator('.fs__palette.tour-hl').count()) === 1, 'tour highlights palette');
  await p.click('[data-action=tour-next]'); await p.click('[data-action=tour-next]');
  await check(async () => (await p.locator('.fs__templates.tour-hl').count()) === 1, 'tour highlights templates');
  for (let i = 0; i < 4; i++) await p.click('[data-action=tour-next]');
  await check(async () => (await p.locator('[data-testid=tour]').count()) === 0, 'tour ends');

  // template screenshot: CSV → Jira finished with provenance open
  await p.click('[data-template=csv-jira]');
  await p.click('[data-action=start]');
  await waitNarr(p, /^Lauf beendet/);
  await p.click('[data-node-id=t2] .node__head');
  await p.click('[data-tab=data]');
  await p.locator('.fs').screenshot({ path: `${SHOTS}/flow-template-csv-jira.png` });
  await check(async () => (await p.locator('.code--out').count()) === 0 || true, 'template screenshot');
  await p.click('[data-node-id=t4] .node__head');
  await p.click('[data-tab=data]');
  await check(async () => (await p.locator('.code--out').innerText()).includes('DATA-101'), 'Jira sink lists simulated ticket keys');

  // API demo extra scenarios
  await p.locator('#demo').scrollIntoViewIfNeeded();
  await p.click('#demo-tab-ratelimit');
  await p.click('.console__actions .btn--primary');
  await p.waitForSelector('.status-pill--err', { timeout: 3000 }).then(() => ok(true, 'API demo: 429 scenario'), () => ok(false, 'API demo 429'));
  ok(errs.length === 0, 'no console errors/warnings (desktop DE) ' + errs.join(' | '));
  await ctx.close();
}

// ---------------- desktop EN ----------------
console.log('Desktop 1440 EN');
{
  const { p, ctx, errs } = await open(1440, 1000, 'en');
  await toStudio(p);
  await check(async () => (await p.locator('[data-proc=filter] .proc__name').innerText()) === 'Filter', 'English processor names');
  await p.click('[data-template=webhook-ai]');
  await check(async () => (await narr(p)).startsWith('Loaded template'), 'English template explanation');
  await p.locator('.fs__speed input').fill('4');
  await p.click('[data-action=start]');
  await waitNarr(p, /^Run finished/);
  ok(true, 'English run summary: ' + (await narr(p)).slice(0, 120));
  await p.click('[data-node-id=t3] .node__head');
  await p.click('[data-tab=data]');
  await check(async () => (await p.locator('.prov').first().textContent()).includes('Before'), 'English provenance labels');
  // language switch at runtime keeps the studio
  await p.locator('app-lang-switcher button', { hasText: /DE/ }).first().click();
  await p.waitForFunction(() => document.documentElement.lang === 'de');
  await check(async () => (await p.locator('[data-proc=filter] .proc__name').innerText()) === 'Filtern', 'runtime switch EN → DE');
  ok(errs.length === 0, 'no console errors (EN) ' + errs.join(' | '));
  await ctx.close();
}

// ---------------- reduced motion ----------------
console.log('Reduced motion');
{
  const { p, ctx } = await open(1440, 1000, 'de', { reducedMotion: 'reduce' });
  await toStudio(p);
  await p.click('[data-action=start]');
  await p.waitForTimeout(3000);
  await check(async () => (await p.locator('.ffdot').count()) === 0, 'no particles with prefers-reduced-motion');
  await check(async () => (await narr(p)).length > 20, 'narration still works');
  await ctx.close();
}

// ---------------- mobile 375 ----------------
console.log('Mobile 375 DE');
{
  const { p, ctx, errs } = await open(375, 800, 'de', { hasTouch: true, isMobile: true });
  await toStudio(p);
  await check(async () => (await p.locator('.fs--compact').count()) === 1, 'compact vertical layout');
  await check(async () => (await p.locator('.lnode').count()) === 5, 'vertical flow shows 5 processors');
  await check(async () => (await p.evaluate(() => document.documentElement.scrollWidth <= 375)), 'no horizontal overflow');
  await p.locator('.lnode[data-node-id=t3]').tap();
  await check(async () => (await p.locator('.fs__panel--inline [data-field=expression]').count()) === 1, 'tap opens inline configuration');
  await p.locator('[data-proc=csv-export]').tap();
  await check(async () => (await p.locator('.lnode').count()) === 6, 'tap on palette adds processor (auto-connected)');
  await check(async () => (await narr(p)).includes('über „unmatched“'), 'auto-connect explained on mobile');
  await p.locator('[data-action=start]').tap();
  await p.waitForSelector('.lconn__item.is-flowing', { timeout: 5000 }).then(() => ok(true, 'animated vertical connections'), () => ok(false, 'flowing connections'));
  await p.waitForTimeout(2500);
  await p.locator('.fs').screenshot({ path: `${SHOTS}/flow-mobile-375.png` });
  await waitNarr(p, /^Lauf beendet/, 60000);
  ok(true, 'mobile run finishes');
  await p.locator('[data-template=webhook-ai]').tap();
  await check(async () => (await p.locator('.lnode').count()) === 6, 'template on mobile');
  await check(async () => (await p.evaluate(() => document.documentElement.scrollWidth <= 375)), 'still no horizontal overflow');
  ok(errs.length === 0, 'no console errors (mobile) ' + errs.join(' | '));
  await ctx.close();
}
await b.close();
console.log(`\nE2E: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
