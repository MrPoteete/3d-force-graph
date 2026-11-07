// Headless check of a built orrery page. Exits 1 on any failure.
// usage: node tests/check.cjs <url>     (serve the --standalone build first)
// Needs Playwright with Chromium; set PLAYWRIGHT to its module path if it is not resolvable from here.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

(async () => {
  const url = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 500 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(6000);
  const failures = [];

  // 1. Background shows its true colour with bloom on. The clear-colour bug (fixed 2026-11-07)
  //    encoded it twice: #04050b measured 43.7 instead of 6.7, and flickered on a real GPU.
  const bg = await p.evaluate(async () => {
    const o = window.__orrery, set = (k, v) => o.gui.controllersRecursive().find(c => c.property === k).setValue(v);
    set('stars', false); set('labels', 'Off'); set('linkVisibility', 'Focus only'); set('background', '#04050b'); set('bloom', 0.75);
    o.Graph.nodeVisibility(false);
    await new Promise(r => setTimeout(r, 2500));
    const gl = document.querySelector('#stage canvas'), c = document.createElement('canvas'); c.width = 40; c.height = 25;
    const g = c.getContext('2d', { willReadFrequently: true });
    return await new Promise(res => requestAnimationFrame(() => {
      g.drawImage(gl, 0, 0, 40, 25); const d = g.getImageData(0, 0, 40, 25).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
      res(s / (d.length / 4) / 3);
    }));
  });
  const expected = (4 + 5 + 11) / 3;
  if (Math.abs(bg - expected) > 2) failures.push(`background brightness ${bg.toFixed(1)}, expected ${expected.toFixed(1)} ±2`);
  await p.reload(); await p.waitForTimeout(6000);

  // 2. Every preset and every dial value applies without throwing; dials still drive the live settings after a preset.
  const sweep = await p.evaluate(async () => {
    const o = window.__orrery, out = { n: 0, fails: [] }, sleep = ms => new Promise(r => setTimeout(r, ms));
    const top = [...o.nodes].sort((a, b) => b.nAll - a.nAll)[0];
    o.select(top, false);
    const preset = o.gui.controllersRecursive().find(c => c.property === 'preset');
    for (const name of Object.keys(o.PRESETS)) { try { preset.setValue(name); } catch (e) { out.fails.push(`preset ${name}: ${e.message}`); } await sleep(100); }
    for (const c of o.gui.controllersRecursive()) {
      const v = c.getValue(), vals = [];
      if (typeof v === 'function') continue;
      if (c._values) vals.push(...c._values);
      else if (typeof v === 'number') vals.push(c._min ?? 0, c._max ?? 1, v);
      else if (typeof v === 'boolean') vals.push(!v, v);
      else if (typeof v === 'string' && v.startsWith('#')) vals.push('#ff0000', v);
      else continue;
      for (const x of vals) { try { c.setValue(x); out.n++; } catch (e) { out.fails.push(`${c.property}=${x}: ${e.message}`); } }
      await sleep(5);
    }
    preset.setValue('Paper');
    o.gui.controllersRecursive().find(c => c.property === 'background').setValue('#123456');
    out.rebind = o.S.background === '#123456';
    out.reader = !document.getElementById('reader').hidden;
    return out;
  });
  failures.push(...sweep.fails);
  if (!sweep.rebind) failures.push('dials stopped driving the live settings after a preset');
  if (!sweep.reader) failures.push('reader did not open on select');
  failures.push(...errs.map(e => 'page error: ' + e));

  console.log(`background ${bg.toFixed(1)} (expected ${expected.toFixed(1)}), ${sweep.n} dial settings applied`);
  if (failures.length) { console.log('FAIL\n' + failures.join('\n')); process.exitCode = 1; } else console.log('PASS');
  await b.close();
})();
