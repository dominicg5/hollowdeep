// tether routes: shortest rope-like lay from the Ledge door to the nearest drills - near-straight, on walkable ground or decks, gentle bends, no wiggles
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800); await p.evaluate(() => closeModalQuiet()).catch(() => {});
  const R = await p.evaluate(async () => { setTab('city'); await new Promise((r) => setTimeout(r, 800)); Explore.build(); const N = Explore.ORE.nodes, WS = Explore.WS, H = Explore.doorSpots().find((q) => q.type === 'ledge'), hm = [H.x, H.y];
    let ns = N.filter((q) => !q.cliff && Explore.oreStand(q)).sort((a, b) => Math.hypot(a.x - hm[0], a.y - hm[1]) - Math.hypot(b.x - hm[0], b.y - hm[1])); const seen = new Set(), pick = []; for (const q of ns) { const k = q.spot ? q.spot.x + ',' + q.spot.y : q.x; if (seen.has(k)) continue; seen.add(k); pick.push(q); if (pick.length === 4) break; } ns.length = 0; ns.push(...pick);
    return ns.map((n) => { const r = Explore.drillRoute({ id: 'tt' + N.indexOf(n), node: N.indexOf(n), name: 'Drill', port: 'p0', tier: 'iron', type: n.type }); if (!r) return null; const p = r.pts; let L = 0, off = 0, flips = 0, maxTurn = 0, prevS = 0, a0 = null;
      for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      for (let i = 0; i + 1 < p.length; i += 1) { const c = Explore.clsAt((p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2); if (c === 0) off++; }
      // resample every 1 m and measure heading changes: sign flips (S-wiggles) and the sharpest turn per metre
      const S = []; let acc = 0, k = 0; for (let s = 0; s <= L; s += WS) { while (k < p.length - 2 && acc + Math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]) < s) { acc += Math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]); k++; } const sl = Math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]) || 1, t = Math.min(1, (s - acc) / sl); S.push([p[k][0] + (p[k + 1][0] - p[k][0]) * t, p[k][1] + (p[k + 1][1] - p[k][1]) * t]); }
      for (let i = 1; i + 1 < S.length; i++) { const t1 = Math.atan2(S[i][1] - S[i - 1][1], S[i][0] - S[i - 1][0]), t2 = Math.atan2(S[i + 1][1] - S[i][1], S[i + 1][0] - S[i][0]); let d = t2 - t1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; maxTurn = Math.max(maxTurn, Math.abs(d)); if (Math.abs(d) > 0.01) { const sg = Math.sign(d); if (prevS && sg !== prevS) flips++; prevS = sg; } }
      // the rope never lies over a boulder (its own included: it ends at the drill beside it); only the last 1.5 m may touch the target's skirt
      let over = 0; const BL = N.filter((q) => q.boulder); for (let i = 0; i < S.length - 2; i++) for (const q of BL) if (Math.hypot(S[i][0] - q.x, S[i][1] - q.y) < q.s * 0.55) over++;
      const ch = Math.hypot(p[p.length - 1][0] - p[0][0], p[p.length - 1][1] - p[0][1]), pl = Explore.plan(p[0][0], p[0][1], p[p.length - 1][0], p[p.length - 1][1]);
      return { m: r.len, ratio: +(L / ch).toFixed(3), walkRatio: pl ? +(L / pl.len).toFixed(3) : null, off, flips, maxTurnDegPerM: +(maxTurn * 57.3).toFixed(1), n: p.length, over }; }); });
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); ok = ok && c; };
  console.log(JSON.stringify(R)); const V = R.filter(Boolean); chk(V.length >= 2, 'routes computed for the nearest drills');
  for (const r of V) { chk(r.off === 0, `route ${r.m} m stays on walkable ground / decks`); chk(r.walkRatio == null || r.walkRatio <= 1.02, `no longer than the walked shortest path (x${r.walkRatio})`); chk(r.flips <= 2, `no S-wiggles (${r.flips} turn-direction flips)`); chk(r.maxTurnDegPerM <= 25, `gentle bends (sharpest ${r.maxTurnDegPerM} deg per m)`); chk(r.over === 0, `rope stays off every boulder (${r.over} samples over one)`); }
  chk(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | ')); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await b.close(); })();
