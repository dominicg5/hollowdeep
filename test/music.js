// The game music (src/theus_audio.js, GameMusic): the overworld valley loop by default (fetched on the first tap, once), Theus's volcano radius overriding it
// by priority, an equal-power crossfade on every change; one format (Ogg, else .m4a), fetched once; his hammer whoosh / strike with distance falloff.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 240000 }).catch(() => {}); await p.waitForFunction(() => Explore.on && FORGE.M && FORGE.M.built, null, { timeout: 90000 }).catch(() => {});
  const res = () => p.evaluate(() => performance.getEntriesByType('resource').filter((e) => /assets\/audio\//.test(e.name)).map((e) => e.name.split('/').pop()));
  await p.waitForTimeout(3000);
  const a0 = await p.evaluate(() => ({ f: GameMusic.A.fetches, started: !!GameMusic.A.started, d: Math.round(GameMusic.dist()), same: GameMusic === TheusAudio })); const r0 = await res();
  ok(a0.f === 0 && !a0.started && r0.length === 0 && a0.d > 300 && a0.same, `before any tap: no audio fetched, nothing started (${a0.d} m from Theus)`);
  await p.touchscreen.tap(195, 300); await p.waitForTimeout(4000);
  const a1 = await p.evaluate(() => { const A = GameMusic.A, q = A.src.overworld; return { started: A.started, st: A.ctx && A.ctx.state, cur: A.cur, loop: !!(q && q.s.loop), dur: A.buf.valley_handpan_A_loop && +A.buf.valley_handpan_A_loop.duration.toFixed(2), g: q && +q.g.gain.value.toFixed(2), f: A.fetches, fmt: GameMusic.fmt() }; }); const r1 = await res();
  console.log(JSON.stringify(a1), r1);
  ok(a1.started && a1.cur === 'overworld' && a1.loop && a1.dur === 36 && a1.fmt === 'ogg' && r1.join() === 'valley_handpan_A_loop.ogg' && a1.f === 1, `first tap: the audio starts (${a1.st}) and the overworld valley loop (${a1.dur} s) is fetched once and loops as a Web Audio buffer, gain ${a1.g} (got overworld music)`);
  // into Theus's volcano radius: his loop takes over (priority), crossfading
  const a2 = await p.evaluate(async () => { const M = GameMusic, A = M.A, o = {}; A.dOv = 10; M.update(); const t0 = performance.now(); while (A.cur !== 'theus' && performance.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 30));
    o.cur = A.cur; await new Promise((r) => setTimeout(r, 1250)); const gi = A.src.theus && A.src.theus.g.gain.value, go = A.out && A.out.g.gain.value; o.mid = [+(gi / M.Z.theus.vol).toFixed(2), +(go / M.Z.overworld.vol).toFixed(2)]; o.pow = +(o.mid[0] ** 2 + o.mid[1] ** 2).toFixed(2); o.outId = A.out && A.out.id;
    await new Promise((r) => setTimeout(r, 1600)); o.end = [+(A.src.theus.g.gain.value / M.Z.theus.vol).toFixed(2), +(A.out.g.gain.value).toFixed(3)]; o.loop = A.src.theus.s.loop; o.alive = Object.keys(A.src);
    A.dOv = 5000; M.update(); o.back = A.cur; await new Promise((r) => setTimeout(r, 1250)); o.mid2 = [+(A.src.overworld.g.gain.value / M.Z.overworld.vol).toFixed(2), +(A.out.g.gain.value / M.Z.theus.vol).toFixed(2)]; o.outId2 = A.out.id; await new Promise((r) => setTimeout(r, 1600));
    A.dOv = 10; M.update(); await new Promise((r) => setTimeout(r, 400)); o.again = A.cur; A.dOv = 5000; M.update(); o.f = A.fetches; return o; }); const r2 = await res();
  console.log(JSON.stringify(a2), r2);
  ok(a2.cur === 'theus' && a2.outId === 'overworld' && a2.loop && a2.end[0] === 1 && a2.end[1] < 0.01 && a2.alive.join() === 'theus', `inside the volcano radius Theus's loop overrides the overworld one (priority 10 over 0), crossfaded: half-way ${a2.mid.join(' / ')} of full`);
  ok(Math.abs(a2.pow - 1) < 0.12 && a2.mid.every((v) => v > 0.3 && v < 0.95) && a2.back === 'overworld' && a2.outId2 === 'theus' && Math.abs(a2.mid2[0] ** 2 + a2.mid2[1] ** 2 - 1) < 0.12, `every change is an equal-power crossfade (~2.5 s, power ${a2.pow} half-way; back out: ${a2.mid2.join(' / ')}), no hard cut (got crossfade all)`);
  ok(a2.again === 'theus' && a2.f === 4 && r2.every((f) => /\.ogg$/.test(f)) && new Set(r2).size === r2.length && r2.length === 4, `each track fetched once in one format, kept in memory (${r2.join(', ')}); re-entering the radius plays straight away`);
  const a3 = await p.evaluate(() => { const T = GameMusic, o = {}; T.A.dOv = 0; o.fall = [0, 150, 299, 300, 400].map((d) => +T.fall(d).toFixed(2)); o.hits = [T.hit(0), T.hit(150), T.hit(400)].map((v) => +v.toFixed(2));
    T.A.plays.length = 0; const F = FORGE, th = F.hitTimes()[0]; const t0 = F.M.tOv; for (const t of [th - 1.0, th - 0.8, th - 0.4, th + 0.02]) { F.M.tOv = t; F.anim(0, 0); } F.M.tOv = t0; o.order = T.A.plays.map((q) => q[0].replace('theus_', '')); T.A.dOv = null; return o; });
  ok(a3.order.join() === 'swing_whoosh,thunder_strike_D' && a3.fall.join() === '1,0.5,0,0,0' && a3.hits.join() === '1,0.5,0', `Theus's hammer still: whoosh then strike on the hit frame, volume by distance ${a3.fall.join(' / ')}`);
  const a4 = await p.evaluate(async () => { const A = GameMusic.A; Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); await new Promise((r) => setTimeout(r, 300)); const s = A.ctx.state; GameMusic.setMute(true); const m = A.master.gain.value; GameMusic.setMute(false); GameMusic.setVol(0.5); return [s, m, A.master.gain.value]; });
  ok(a4.join() === 'suspended,0,0.5', `hidden tab -> silent (${a4[0]}); mute / volume hooks still work (${a4.join(',')})`);
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();
