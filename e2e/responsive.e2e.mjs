import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:4300/';
const b = await chromium.launch(); let bad = 0;
for (const w of [320, 375, 414, 768, 900, 1024, 1180, 1280, 1440, 1920]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  const errs = []; p.on('console', m => ['error', 'warning'].includes(m.type()) && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL); await p.locator('#flow-studio').scrollIntoViewIfNeeded(); await p.waitForSelector('.fs');
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const fs = document.querySelector('.fs').getBoundingClientRect();
    const st = document.querySelector('.fs__stage');
    return { sw: document.documentElement.scrollWidth, fsRight: Math.round(fs.right), compact: !!document.querySelector('.fs--compact'), scale: st ? st.style.width : null };
  });
  const okk = r.sw <= w && r.fsRight <= w && !errs.length;
  if (!okk) bad++;
  console.log(w, okk ? 'OK' : 'FAIL', JSON.stringify(r), errs.join('|'));
  if (w === 1024 || w === 768) await p.locator('.fs').screenshot({ path: `/tmp/pw/fs-${w}.png` });
  await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
