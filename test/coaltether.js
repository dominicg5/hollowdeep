// v8 coal tiers + Ledge Tether strand capacities: Ember Onyx is about 96 days with coal costs,
// and an Ember Onyx bit on a Mithril Ledge Tether runs at about 31% (25 coal/h against a burn of 80).
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const near = (a, b, e) => Math.abs(a - b) <= e;

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800);
  await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof Skills !== 'undefined' && typeof Explore !== 'undefined' && typeof CharView !== 'undefined', null, { timeout: 200000 }).catch(() => {});

  const r = await p.evaluate(() => {
    const burn = Explore.BITS.map((q) => q.burn);
    const push = CharView.DTIERS.map((k) => CharView.LGRADES[k].push);
    const pull = CharView.DTIERS.map((k) => CharView.LGRADES[k].pull);
    const scale = Skills.SKILL_XP_SCALE;
    const daysNo = Skills.hoursToLevel(120) / 24;
    const daysCoal = Skills.hoursToLevel(120, { coal: true }) / 24;
    const daysLum = Skills.hoursToLevel(95, { coal: true }) / 24;
    S.home = S.home || { ports: {}, open: 8 };
    S.home.ports.x = { a: { grade: 'mithril', dir: 'to' }, b: { grade: 'mithril', dir: 'from' } };
    Skills.migrate(); S.skills.mining = Skills.xpToReach(200);
    const d = { tier: 'onyx', type: 'onyx', port: 'x', hop: 0, on: true, coal: 100 };
    const flow = Explore.drillFlow(d);
    const need = Explore.bitPushNeed('onyx');
    const text = Explore.drillStrandText(d);
    const caps = Explore.drillCaps(d);
    return { burn, push, pull, scale, daysNo, daysCoal, daysLum, flow, need, text, caps, factor: flow.factor, pct: flow.pct };
  });

  ok(r.scale === 5.55, 'SKILL_XP_SCALE stays 5.55');
  ok(r.burn.join() === '2,4,7,12,20,32,50,80', 'BITS burn (Bronze→Ember Onyx): ' + r.burn.join(', '));
  ok(r.push.join() === '3,5,9,15,25,40,63,100', 'LGRADES push coal/h: ' + r.push.join(', '));
  ok(r.pull.join() === '220,250,290,330,370,440,510,700', 'LGRADES pull ore/h: ' + r.pull.join(', '));
  ok(near(r.factor, 25 / 80, 1e-12) && r.pct === 31, `Ember Onyx bit on Mithril Ledge Tether: ${r.pct}% (factor ${r.factor}, 25/80)`);
  ok(r.caps && r.caps.push === 25 && r.caps.pull === 370, 'Mithril strand caps are 25 coal/h push and 370 ore/h pull');
  ok(r.text === '25 / 25 coal/h', 'strand readout at full starved burn: ' + r.text);
  ok(r.need && r.need.k === 'onyx' && r.need.burn === 80, 'Ember Onyx bit needs an Ember Onyx Ledge Tether (80 coal/h)');
  ok(near(r.daysNo, 90.06, 0.15), `no-coal Ember Onyx still ~90 d (${r.daysNo.toFixed(2)})`);
  ok(near(r.daysCoal, 95.7, 0.5), `with coal, Ember Onyx is about 96 d (v8 ${r.daysCoal.toFixed(2)}, model 95.7)`);
  ok(errs.length === 0, 'no JS errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
