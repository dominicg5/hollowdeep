// Theus (the forge ape) talk + Theus's pickaxe tier upgrades. Checks: tier maths (x2^N, costs 20..10240, ore/h formula), the upgrade consumes exactly the cost of
// the same kind and refuses when short, save round-trip (hollowdeep.save.v1; an old save without pickTiers loads as T0), drills unaffected, strike yield x mult,
// the anvil gate (on the platform top a tap opens the talk; on the ground it doesn't), portraits, the panel (no "gates" wording, Mastered at T10), no page errors.
// SHOT=1: theus_dialogue / pickaxe_upgrade_normal / _short / _mastered to /workspace/shots-char/final/.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '', OUT = '/workspace/shots-char/final/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(4000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 240000 }).catch(() => {}); await p.waitForFunction(() => Explore.on && FORGE.M.built, null, { timeout: 120000 }).catch(() => {});
  const R = await p.evaluate(() => { const K = Skills, o = {};
    o.mult = Array.from({ length: 11 }, (_, n) => { S.pickTiers = { steel: n }; return K.pickUpgMult('steel'); }); o.cost = Array.from({ length: 10 }, (_, i) => K.pickUpgCost(i + 1));
    const L = 40, base = K.characterOrePerHour('iron', 2, L); o.oreh = [0, 3, 10].map((n) => +(K.characterOrePerHour('iron', 2, L, { upg: Math.pow(2, n) }) / base).toFixed(6));
    S.pickGrade = 'steel'; S.pickTiers = { steel: 4 }; o.eq = +(K.equippedOrePerHour('iron', L) / K.characterOrePerHour('iron', K.equippedPickTier(), L)).toFixed(6); o.eqMult = K.equippedPickMult();
    // drills: the same with every pickaxe at T0 and at T10
    S.pickTiers = {}; const d0 = ['copper', 'iron', 'gold'].map((x) => K.drillOrePerHour(x, 2, L)); S.pickTiers = Object.fromEntries(K.PICK_KINDS.map((k) => [k, 10])); const d1 = ['copper', 'iron', 'gold'].map((x) => K.drillOrePerHour(x, 2, L)); o.drill = [d0, d1];
    o.strike = [K.oreFromStrike(0.6, 1, 0.5), K.oreFromStrike(0.6, 1, 0.7), K.oreFromStrike(0.6, 8, 0.9), K.oreFromStrike(0.6, 8, 0.5), K.oreFromStrike(0.6, 1024, 0.99)];
    // consumption: 25 steel pickaxes (10 bag + 15 vault), T0 -> T1 costs 20, then T1 -> T2 (40) is refused with nothing taken
    S.pickTiers = {}; const id = 'tool:pick_steel'; Craft.take(id, Craft.have(id)); Craft.add('bag', id, 10); Craft.add('vault', id, 15); o.h0 = Craft.have(id);
    const r1 = Theus.upgrade('steel'); o.r1 = [r1.ok, K.pickUpgTier('steel'), Craft.have(id)]; const r2 = Theus.upgrade('steel'); o.r2 = [r2.ok, r2.why, K.pickUpgTier('steel'), Craft.have(id)]; o.other = K.pickUpgTier('iron');
    // save round-trip; an old save with no pickTiers
    save(); const raw = JSON.parse(localStorage.getItem('hollowdeep.save.v1')), back = load(); o.saved = [raw.pickTiers && raw.pickTiers.steel, back && back.pickTiers && back.pickTiers.steel];
    const old = Object.assign({}, raw); delete old.pickTiers; localStorage.setItem('hollowdeep.save.v1', JSON.stringify(old)); const ob = load(); o.old = [ob && JSON.stringify(ob.pickTiers), (() => { const s0 = S; S = ob; const t = K.pickUpgTier('steel'); S = s0; return t; })()]; save();
    // the anvil gate: on the platform top vs the scorched ground below
    const F = FORGE, t = []; for (const [X, Y] of [[85, 0], [120, 10], [105, -80], [140, 100]]) { Theus.close(); const r = Theus.tapAt(F.wld(X, Y)); t.push([X, Y, r, !document.getElementById('thDlg').classList.contains('hidden'), F.platD(X, Y)]); } Theus.close(); o.gate = t;
    // the talk: portrait faces, "Upgrade pickaxe" opens the card, Prometheus only in the lore line
    Theus.open(); const port = () => document.querySelector('#thDlg .tPort').style.backgroundImage; o.f0 = port(); Theus.go('menu'); o.f1 = port(); o.btns = [...document.querySelectorAll('#thDlg .tBtns button')].map((x) => x.textContent);
    o.prom = Object.entries(Theus.STEPS).filter(([, s]) => /Prometheus/.test(s.say)).map(([k]) => k); document.querySelector('#thDlg button[data-a="upgrade"]').click(); o.f2 = port(); o.deal = Theus.step; document.querySelector('#thDlg').click(); o.upOpen = !document.getElementById('thUp').classList.contains('hidden');
    // a real Upgrade click with 40 owned at T1 -> T2, pleased face + line
    Craft.add('bag', id, 40); Theus.openUp('steel'); const btn = document.querySelector('#thUp .uGo'); o.btnOn = btn && !btn.disabled; btn.click(); o.click = [K.pickUpgTier('steel'), Craft.have(id), !!document.querySelector('#thUp .uFx .sp'), /pleased/.test(document.querySelector('#thUp .uSay i').style.backgroundImage)];
    o.gates = /gates/i.test(document.getElementById('thUp').innerHTML + document.getElementById('thDlg').innerHTML); Theus.closeUp();
    const img = (f) => new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res(null); i.src = 'assets/ui/theus/' + f + '.webp'; }); return Promise.all(['idle', 'talking', 'pleased'].map(img)).then((im) => { o.img = im; return o; }); });
  console.log('THEUS ' + JSON.stringify(R));
  ok(R.mult.join() === '1,2,4,8,16,32,64,128,256,512,1024', `tier N = x2^N (T10 x${R.mult[10]})`);
  ok(R.cost.join() === '20,40,80,160,320,640,1280,2560,5120,10240', `costs T1-T10: ${R.cost.join(', ')}`);
  ok(R.oreh.join() === '1,8,1024' && R.eq === 16 && R.eqMult === 16, `ore/h formula: x${R.oreh.join(', x')} at T0/T3/T10; equipped Steel T4 ore/h = x${R.eq}`);
  ok(JSON.stringify(R.drill[0]) === JSON.stringify(R.drill[1]), `drills unaffected: ${R.drill[0].map((v) => v.toFixed(2)).join(', ')} ore/h at all-T0 and all-T10`);
  ok(R.strike.join() === '1,0,4,5,614', `strike yield x mult (chance 0.6: x1 -> 1/0, x8 -> 4/5, x1024 -> ${R.strike[4]})`);
  ok(R.h0 === 25 && R.r1.join() === 'true,1,5' && R.r2.join() === 'false,short,1,5' && R.other === 0, `consumption: 25 owned, T1 took 20 (left ${R.r1[2]}); T2 (40) refused, nothing taken; other kinds stay T0`);
  ok(R.saved.join() === '1,1' && R.old[1] === 0 && R.old[0] === '{}', `save round-trip (hollowdeep.save.v1): steel T${R.saved[1]}; an old save without pickTiers loads as ${R.old[0]} -> T${R.old[1]}`);
  ok(R.gate[0][2] === 'open' && R.gate[0][3] && R.gate[1][2] === 'open' && R.gate[2][2] === 'hint' && !R.gate[2][3] && R.gate[3][2] === 'hint' && !R.gate[3][3], `anvil gate: on the platform top opens the talk, on the ground only the hint: ${JSON.stringify(R.gate)}`);
  ok(/theus\/idle/.test(R.f0) && /theus\/talking/.test(R.f1) && /theus\/pleased/.test(R.f2) && R.img.every((q) => q && q[0] === 192 && q[1] === 192), `portraits: idle default, talking mid-line, pleased on the deal (192x192 x3)`);
  ok(R.btns.includes('Upgrade pickaxe') && R.upOpen && R.prom.join() === 'who', `talk: ${R.btns.join(' / ')}; "Upgrade pickaxe" opens the card; Prometheus only in the lore line (${R.prom})`);
  ok(R.btnOn && R.click.join() === '2,5,true,true' && !R.gates, `Upgrade button: T1 -> T2, 40 consumed, hammer + sparks, pleased line; no "gates" wording`);
  // the real path: she stands on the platform top / on the ground below; a tap on his body goes through Explore.tap (the pick), then the gate
  const pk = await p.evaluate(async () => { const F = FORGE, o = {}, wait = (ms) => new Promise((r) => setTimeout(r, ms)), dlg = () => !document.getElementById('thDlg').classList.contains('hidden');
    const spot = (want) => { const el = M3.renderer.domElement; for (let y = 120; y < el.clientHeight - 160; y += 16) for (let x = 20; x < el.clientWidth - 70; x += 16) if (Theus.hit(x, y) === want) return [x, y]; return null; };
    F.M.tOv = 14.5; Theus.closeUp(); Theus.close(); Explore.enter(...F.wld(80, 0)); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); Explore.EX.az = 4.7; await wait(2500);
    o.top = F.loc(...Explore.here()).map(Math.round); const sp = spot(true), off = spot(false); o.sp = sp; o.off = off; o.hitOn = !!sp; o.hitOff = !off || Theus.hit(...off); const el = M3.renderer.domElement; o.gndHit = Theus.hit(el.clientWidth / 2, el.clientHeight - 200); /* (the platform at her feet) */ if (sp) Explore.tap(...sp); o.openTop = dlg(); Theus.close(); o.tapTop = Theus.tapAt(); Theus.close();
    Explore.enter(...F.wld(105, -80)); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); await wait(600); o.gnd = F.loc(...Explore.here()).map(Math.round); o.tapGnd = Theus.tapAt(); o.openGnd = dlg();
    Explore.enter(...F.wld(80, 0)); for (let i = 0; i < 5; i++) Explore.tick(1 / 30); Explore.EX.az = 4.7; await wait(2500); return o; });
  console.log('PICK ' + JSON.stringify(pk));
  ok(pk.hitOn && !pk.hitOff && !pk.gndHit && pk.openTop && pk.tapTop === 'open', `on the anvil top (at ${pk.top}): a tap on his body (${pk.sp}) through Explore.tap opens the talk; the platform at her feet / beside him (${pk.off}) is no hit (skinned raycast, ground-occluded)`);
  ok(pk.tapGnd === 'hint' && !pk.openGnd, `on the ground (at ${pk.gnd}): tapping him gives only the hint, no talk`);
  if (SHOT) {
    await p.evaluate(() => { Theus.go('menu'); }); await p.waitForTimeout(900); await p.screenshot({ path: OUT + 'theus_dialogue.png' });
    const panel = async (f, setup) => { await p.evaluate(setup); await p.waitForTimeout(500); await p.screenshot({ path: OUT + f }); };
    await panel('pickaxe_upgrade_normal.png', () => { Theus.close(); const id = 'tool:pick_steel'; Craft.take(id, Craft.have(id)); Craft.add('bag', id, 214); S.pickTiers = { bronze: 6, iron: 5, steel: 3, gold: 1 }; Theus.openUp('steel'); });
    await panel('pickaxe_upgrade_short.png', () => { const id = 'tool:pick_steel'; Craft.take(id, Craft.have(id)); Craft.add('bag', id, 45); Theus.openUp('steel'); });
    await panel('pickaxe_upgrade_mastered.png', () => { S.pickTiers.bronze = 10; Theus.openUp('bronze'); }); await p.evaluate(() => { FORGE.M.tOv = null; });
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();
