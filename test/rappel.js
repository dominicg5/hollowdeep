// The Rappel button (Dominic): one slot in #charClimb .tvb. Climbing -> [Rappel] (pin, clip, stow, then rappels on its own); rappelling -> [Stop];
// stopped -> [Ascend][Rappel] side by side (each runs on its own, tap it again to stop); a wall tap on the rope unclips, coils and climbs to the spot; the foot of the wall ends the rappel.
// SHOT=1: climb_rappel_button_states.png (Rappel / Stop / Ascend + Rappel / back to climbing) and climb_rappel_flow.mp4 (anchor, auto-rappel, stop, ascend) to /workspace/shots-char/final/.
const { chromium } = require('playwright-core'); const fs = require('fs'), cp = require('child_process');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '', OUT = '/workspace/shots-char/final/', TMP = '/workspace/probe/js/rap/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForTimeout(4000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} });
  await p.waitForFunction(() => typeof CharView !== 'undefined' && typeof S !== 'undefined', null, { timeout: 120000 }).catch(() => {});
  await p.evaluate(() => document.querySelector('nav#tabs [data-tab=char]').click()); await p.waitForFunction(() => CharView.st.ok && CharView.rig, null, { timeout: 120000 }).catch(() => {});
  await p.click('#charAnim [data-anim=climb]', { force: true }); await p.evaluate(() => { const C = CharView, st = C.st; st.paused = true; C.sim(1 / 30, 90); st.dist = 6; C.pgGo({ wall: true, x: st.climbPos.x, y: 5.4 }); for (let i = 0; i < 1500 && st.pg; i++) C.sim(1 / 30, 1); C.sim(1 / 30, 15); C.advance(1 / 30, 2); });
  if (SHOT) fs.mkdirSync(TMP, { recursive: true });
  const slot = () => p.evaluate(() => { const C = CharView, box = document.querySelector('#charClimb .tvb'); return { btns: [...box.querySelectorAll('button')].map((x) => x.textContent + (x.classList.contains('on') ? '*' : '') + (x.classList.contains('dis') ? '-' : '')).join('|'), k: C.an.tv ? C.an.tv.k : null, y: +C.st.climbPos.y.toFixed(2), gnd: !!C.st.gnd, act: C.an.act, held: C.an.eq.held }; });
  let strip = 0; const state = async () => { if (!SHOT) return; await p.evaluate(() => CharView.advance(1 / 30, 2)); const r = await p.evaluate(() => { const q = document.getElementById('charClimb').getBoundingClientRect(); return { x: Math.max(0, q.right - 230), y: q.y - 10, width: 230, height: 230 }; }); await p.screenshot({ path: `${TMP}state${strip++}.png`, clip: r }); };
  let fr = 0; const film = async (n, step = 5) => { for (let i = 0; i < n; i++) { await p.evaluate((s) => { CharView.sim(1 / 30, s - 1); CharView.advance(1 / 30, 1); }, step); if (SHOT) await p.screenshot({ path: `${TMP}f${String(fr++).padStart(3, '0')}.png`, clip: { x: 0, y: 70, width: 390, height: 640 } }); } };
  const tap = (sel) => p.evaluate((sel) => document.querySelector('#charClimb ' + sel).click(), sel);
  const until = (cond, n = 600) => p.evaluate(([c, n]) => { const C = CharView, st = C.st, f = new Function('C', 'st', 'return ' + c); for (let i = 0; i < n && !f(C, st); i++) C.sim(1 / 30, 1); return f(C, st); }, [cond, n]);
  // 1. climbing: one Rappel button
  const s0 = await slot(); await state(); ok(s0.btns === 'Rappel' && s0.act === 'climb' && !s0.k && s0.y > 2.5, `climbing: the slot is one Rappel button (${JSON.stringify(s0)})`);
  // 2. Rappel: pin, clip, stow, then rappels on its own; the slot reads Stop
  await film(2); await tap('[data-tv=go]'); const s1a = await slot(); await film(14); const rp = await until("C.st.tvK === 'rappel' && C.st.climbPos.y < " + (s0.y - 0.5)); const s1 = await slot(); const pin = await p.evaluate(() => !!(CharView.rig.wall.userData.pin && CharView.rig.wall.userData.pin.visible));
  await state(); ok(/anchor/.test(s1a.k) && s1a.btns === 'Stop*' && rp && s1.k === 'rappel' && s1.btns === 'Stop*' && pin && s1.held === 'none', `Rappel: anchors (${s1a.k}), clips, stows the picks and rappels by itself; the slot shows Stop (${JSON.stringify(s1)})`);
  await film(4);
  // 3. Stop: hangs on the rope; the slot shows Ascend + Rappel
  await tap('[data-tv=stop]'); await p.evaluate(() => CharView.sim(1 / 30, 2)); const y1 = (await slot()).y; await p.evaluate(() => CharView.sim(1 / 30, 45)); const s2 = await slot(); await state();
  ok(s2.k === 'hang' && Math.abs(s2.y - y1) < 0.02 && s2.btns === 'Ascend|Rappel', `Stop: she hangs still (${y1} -> ${s2.y}); the slot shows Ascend + Rappel side by side (${s2.btns})`);
  await film(4);
  // 4. Ascend runs on its own, tapping it again stops; Rappel the same
  await tap('[data-tv=ascend]'); await until("C.st.tvK === 'ascend'", 120); await film(4); const s3 = await slot(); await tap('[data-tv=ascend]'); await p.evaluate(() => CharView.sim(1 / 30, 3)); const s3b = await slot();
  await tap('[data-tv=rappel]'); await until("C.st.tvK === 'rappel'", 120); await p.evaluate(() => CharView.sim(1 / 30, 30)); const s4 = await slot(); await tap('[data-tv=rappel]'); await p.evaluate(() => CharView.sim(1 / 30, 3)); const s4b = await slot();
  ok(s3.k === 'ascend' && s3.y > s2.y + 0.3 && s3.btns === 'Ascend*|Rappel' && s3b.k === 'hang' && s3b.btns === 'Ascend|Rappel' && s4.k === 'rappel' && s4.y < s3b.y - 0.3 && s4.btns === 'Ascend|Rappel*' && s4b.k === 'hang', `Ascend climbs by itself (${s2.y} -> ${s3.y}), tap again stops; Rappel the same (${s3b.y} -> ${s4.y}); the pair stays (${s3.btns} / ${s4.btns})`);
  // 5. a wall tap while on the rope: unclips, coils, back on the picks climbing to the spot; the slot is back to Rappel
  const tgt = await p.evaluate(() => { const st = CharView.st, q = { wall: true, x: st.climbPos.x + 0.8, y: st.climbPos.y + 1.1 + 0.9 }; CharView.pgGo(q); return { x: +q.x.toFixed(2), y: +(q.y - 1.1).toFixed(2) }; });
  await p.evaluate(() => CharView.sim(1 / 30, 2)); const s5a = await slot(); const off = await until('!C.an.tv', 300); const s5b = await slot(); await until('!C.st.pg', 1200); await p.evaluate(() => CharView.sim(1 / 30, 15)); const s5 = await slot(); const x5 = await p.evaluate(() => +CharView.st.climbPos.x.toFixed(2)); await state();
  ok(s5a.k === 'coil' && off && s5b.act === 'climb' && s5b.held === 'climb' && s5.btns === 'Rappel' && !s5.k && Math.abs(x5 - tgt.x) < 0.35 && Math.abs(s5.y - tgt.y) < 0.4, `wall tap on the rope: unclips + coils (${s5a.k}), back on the picks, climbs to the tapped spot (${x5},${s5.y} vs ${tgt.x},${tgt.y}); the slot reads Rappel again`);
  // 6. the foot of the wall ends the rappel (as before): lands, coils, steps off; the slot is idle on the ground
  await tap('[data-tv=go]'); const g = await until('C.st.gnd', 2400); await p.evaluate(() => CharView.sim(1 / 30, 10)); const s6 = await slot();
  ok(g && s6.gnd && !s6.k && /Rappel-/.test(s6.btns), `rappel to the foot of the wall: she lands, coils and steps off; the button rests (${s6.btns})`);
  // 7. Stop while anchoring: she stays clipped on the picks and the slot offers Rappel again
  await p.evaluate(() => { const C = CharView, st = C.st; C.pgGo({ wall: true, x: st.gnd.x, y: 3.6 }); for (let i = 0; i < 2000 && st.pg; i++) C.sim(1 / 30, 1); C.sim(1 / 30, 15); });
  await tap('[data-tv=go]'); await p.evaluate(() => CharView.sim(1 / 30, 10)); await tap('[data-tv=stop]'); await p.evaluate(() => CharView.sim(1 / 30, 120)); const s7 = await slot();
  ok(s7.k === 'anchored' && s7.btns === 'Rappel' && s7.held === 'climb', `Stop mid-anchor: stays clipped on the picks, the slot offers Rappel (${JSON.stringify(s7)})`);
  await tap('[data-tv=go]'); const r8 = await until("C.st.tvK === 'rappel'", 200); ok(r8 && (await slot()).btns === 'Stop*', 'Rappel from there rappels on (the slot reads Stop)');
  if (SHOT) {
    cp.execSync(`ffmpeg -y -loglevel error -i ${TMP}state0.png -i ${TMP}state1.png -i ${TMP}state2.png -i ${TMP}state3.png -filter_complex "[0][1][2][3]hstack=inputs=4" ${OUT}climb_rappel_button_states.png`);
    cp.execSync(`ffmpeg -y -loglevel error -framerate 6 -i ${TMP}f%03d.png -vf "scale=390:-2,format=yuv420p" -c:v libx264 -r 6 ${OUT}climb_rappel_flow.mp4`);
    console.log('frames ' + fr);
  }
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();
