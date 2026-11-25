// Combat stats (t627u, Dominic via Art card t448s1773): Art's round brass icon (crossed swords + red heart) in the Character view, a 44 px+ touch target;
// tapping it opens a panel with Strength, HP and Accuracy split by source (level, swords, Skill Tree) and the total - nothing else below (t648u).
// Every number must be the combat module's own (Combat.playerStats / applyNodes / level / hitChance / fmt): nothing recomputed. DOM checks only, no renders.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok && typeof S !== 'undefined' && S && S.combat, null, { timeout: 200000 }).catch(() => {});
  // a known setup: Combat level 30, an iron T2 sword + a bronze sword, 5 in Strength and 4 in Vigor
  const keep = await p.evaluate(() => { const k = JSON.stringify({ xp: S.combat.xp, skill: S.skill || {}, L: S.swordL, R: S.swordR, t: S.tswords }); Combat.setLevel(30); Combat.resetTree(); for (let i = 0; i < 5; i++) Combat.addPoint('strength'); for (let i = 0; i < 4; i++) Combat.addPoint('vigor');
    S.swordL = 'iron'; S.swordR = 'bronze'; S.tswords = Object.assign({}, S.tswords, { iron: 2, bronze: 0 }); setTab('city'); return k; });
  const H = await p.evaluate(() => { const b = document.getElementById('csBtn'); return !!b && b.offsetParent !== null; });
  await p.evaluate(() => setTab('char')); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const o = {}, b = document.getElementById('csBtn'), R = b && b.getBoundingClientRect();
    o.btn = b ? { w: R.width, h: R.height, l: R.left, t: R.top, r: R.right, b: R.bottom, vis: b.offsetParent !== null && getComputedStyle(b).display !== 'none', img: getComputedStyle(b).backgroundImage, solo: document.getElementById('charWrap').classList.contains('solo'),
      top: (() => { const e = document.elementFromPoint(R.left + R.width / 2, R.top + R.height / 2); return e === b; })() } : null;
    o.overlap = ['pvBtn', 'swAtk', 'charTop', 'charAnim', 'charEquip', 'charClimb'].filter((id) => { const e = document.getElementById(id); if (!e || e.offsetParent === null) return false; const q = e.getBoundingClientRect(); return q.width > 0 && !(q.right <= R.left || q.left >= R.right || q.bottom <= R.top || q.top >= R.bottom); });
    return o; });
  await p.tap('#csBtn'); await p.waitForTimeout(300);
  const q = await p.evaluate(() => { const o = {}, e = document.getElementById('combatStats'), cell = (k, s) => { const c = e.querySelector(`tr[data-cs=${k}] td[data-src=${s}]`); return c ? +c.textContent : NaN; };
    o.on = !!(e && e.classList.contains('on')); o.title = (e.querySelector('h2') || {}).textContent;
    const P = Combat.playerStats(), L0 = Combat.playerStats(Object.assign({}, S, { skill: {} }), { L: null, R: null }), E = Combat.applyNodes(), sw = Combat.fmt(P.swords.pair), r1 = (v) => Math.round(v * 10) / 10;
    o.rows = ['str', 'hp', 'acc', 'def'].map((k) => ({ k, ui: ['level', 'swords', 'tree', 'total'].map((s) => cell(k, s)), combat: [r1(L0[k] || 0), r1(sw[k] || 0), r1(E[k] || 0), P[k] || 0] }));
    o.match = o.rows.every((x) => JSON.stringify(x.ui) === JSON.stringify(x.combat)); o.names = [...e.querySelectorAll('tbody th')].map((t) => t.textContent);
    o.heads = [...e.querySelectorAll('thead th')].map((t) => t.textContent).filter(Boolean);
    o.level = Combat.level(); o.kids = [...e.querySelector('.csTray').children].map((c) => c.className).join(); o.extra = !!e.querySelector('p, [data-cs=hit], [data-cs=lv], .csNote, .csFoot, .csLv'); o.top = [...e.querySelector('.csTop').children].map((c) => c.className || c.tagName).join();
    o.setup = { str: [L0.str, sw.str, E.str, P.str], hp: [L0.hp, sw.hp, E.hp, P.hp], acc: P.acc };
    const tr = e.querySelector('.csTray').getBoundingClientRect(), x = e.querySelector('[data-cs=close]').getBoundingClientRect(); o.tray = [tr.left >= 0, tr.right <= innerWidth + 0.5, tr.top >= 0, tr.bottom <= innerHeight + 0.5]; o.close = [x.width, x.height];
    return o; });
  await p.tap('#combatStats [data-cs=close]'); await p.waitForTimeout(200);
  const c = await p.evaluate(() => !document.querySelector('#combatStats.on'));
  const hm = await p.evaluate(async () => { setTab('home'); await new Promise((r) => setTimeout(r, 800)); const b = document.getElementById('csBtn'); return b.offsetParent !== null && getComputedStyle(b).display !== 'none'; });
  await p.evaluate((k) => { const o = JSON.parse(k); S.combat.xp = o.xp; S.skill = o.skill; S.swordL = o.L; S.swordR = o.R; S.tswords = o.t; if (typeof save === 'function') save(); }, keep);
  console.log(JSON.stringify({ r, q, c, hm, H }));
  ok(r.btn && r.btn.vis && r.btn.solo && r.btn.w >= 44 && r.btn.h >= 44 && r.btn.l >= 0 && r.btn.r <= 390 && r.btn.top && /combat_stats_64\.webp/.test(r.btn.img), `Character view: Art's combat stats icon, a ${r.btn && r.btn.w}x${r.btn && r.btn.h} px touch target, on top`);
  ok(r.overlap.length === 0, 'it overlaps none of the Character view controls ' + JSON.stringify(r.overlap));
  ok(!H && !hm, 'only in the Character view (not on the map or in the Ledge)');
  ok(q.on && q.title === 'Combat stats' && q.names.join() === 'Strength,HP,Accuracy,Defense' && q.heads.join() === 'Level,Swords,Tree,Total', `tap: the panel opens with Strength / HP / Accuracy / Defense (GD-15) by Level / Swords / Tree / Total ${JSON.stringify([q.names, q.heads])}`);
  ok(q.match, 'every number is the combat module\'s (playerStats / applyNodes / fmt) ' + JSON.stringify(q.rows));
  ok(q.setup.str[2] === 5 && q.setup.hp[2] === 12 && q.setup.str[1] > 0 && q.setup.acc > 0 && q.level === 30, 'the tree and swords shares show up (5 Strength, 12 HP from the tree; swords add Strength / Accuracy) ' + JSON.stringify(q.setup));
  ok(q.kids === 'csTop,csCard' && !q.extra && q.top === 'csIc,H2,csX', 't648u: only the header (icon, title, close) and the stats table - no level line, hit-chance note or footer ' + JSON.stringify([q.kids, q.top, q.extra]));
  ok(q.tray.every(Boolean) && q.close[0] >= 44 && q.close[1] >= 44, 'the panel fits the iPhone screen; 44 px close ' + JSON.stringify([q.tray, q.close]));
  ok(c, 'close');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
