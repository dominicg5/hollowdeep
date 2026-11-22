/* ---- The Volcanic Forge (Art's creatures/volcanic_forge handoff: volcanic_forge_layout_diagram.png = source of truth, volcanic_forge_v3.png = the look; Dominic: "a pass ...
   put it in the area I've circled closer to the outside edge"; scale: "everything together at the largest size that fits" = x1.3, so the four-armed ape smith is 91 m).
   Every layout value below is Art's diagram in DESIGN metres (x from the notched lip toward the raised platform, y toward the talk-ledge side, z up from the valley floor),
   built at F = 1.3 real metres each (U world units). Site (Dominic, option A): the lip at (8750, 6000), the loop running west, the volcano to the east toward the rim.
   - The volcano: a plain cone, no entrance; crater 200 across, summit 260 on the far side, a low notched lip (z 40) facing the platform, the lava lake 12 below it.
   - The raised platform: bare flat rock 90 x 70, top z 26, 60 from the lip; its sides are steep solid rock (~63 deg, no overhang; under the ~72 deg climb limit after the terrain grid samples it), so the flat top is 64 x 44 round the 56 x 36 striking surface the wall climb takes, so players can stand
     on top and watch him strike. The ape, his hammers, his tongs and the bar never collide with the player (they pass through), and he only ever strikes the bar on the
     56 x 36 striking surface, so the rest of the top is a standing margin.
   - The 27 s loop: dip 4, lift 2, turn + one 30 stride 4, lay 2, 7 strikes every 1.6 s as the bar cools (11), return 4. Bar colours = the diagram's keyframes.
   - The scorched black oval (560 x 350) with ember cracks, an ash band, burnt edge, then green; sparks fly 60-150 and settle as embers.
   - The talk ledge on the neighbouring hill (z 50, ~210 from the strike spot) by a switchback path off the existing path network.
   Terrain edits are LOCAL and only switch on after world generation (W.ready), so they never feed its random draws (Dominic's rule after 30a1753); afterGen() moves the
   rival homes that stand in the works to the nearest open ground, reroutes the paths round the cone / platform / work area and clears the trees off the scorched ground. */
const FORGE = (() => {
  const WS = 6.35, F = 1.3, U = WS * F, LIP = [8750, 6000], HB = 90, LOOP = 27, HITS = 7, HIT0 = 12.8, HITDT = 1.6;
  const L = { crater: [-100, 0], rimR: 100, lava: 28, lip: 40, summit: 260, D: 18, S: 48, plat: [60, 150, 35, 26], skirt: 26 / 2.0, strike: [77, 133, 18], scorch: [60, 0, 280, 175], ash: 70,
    ledge: [112, 197, 50], ledgeR: 14, bar: [30, 4, 4], tongs: 30, handle: 25, head: [5, 9, 5], grip: 6 };
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const wld = (X, Y) => [LIP[0] - X * U, LIP[1] + Y * U], loc = (x, y) => [(LIP[0] - x) / U, (y - LIP[1]) / U];
  const M = { built: false, moved: [], kept: [], paths: [], trees: 0 };
  const on = () => typeof W !== 'undefined' && W.ready === true;

  /* ---------- the land (design metres) ---------- */
  const DEG = Math.PI / 180;
  const Hr = (th) => L.lip + 70 * sm(8 * DEG, 45 * DEG, th) + 150 * Math.pow((1 - Math.cos(th)) / 2, 1.4); // rim height: the notched lip (40) facing the platform, the summit (260) opposite
  const Rb = (th) => L.rimR + lerp(8, 1.8 * Hr(th), sm(10 * DEG, 70 * DEG, th)); // cone foot: a 40 m wall under the notch, a long concave run elsewhere (summit 260 over a ~570 base radius: ~0.45)
  function cone(X, Y) { const dx = X - L.crater[0], r = Math.hypot(dx, Y), ths = Math.atan2(Y, dx), th = Math.abs(ths), rb = Rb(th); if (r >= rb) return null; const hr = Hr(th);
    if (r < L.rimR) return { z: 20 + (hr - 20) * sm(L.rimR - 30, L.rimR, r), inner: true, r, th, u: 1 };
    // concave profile: ~40 deg under the rim flaring to ~15 deg at the foot; 16 radial ridges (gullies between) fading out in the lower third, none at the notch; the rim itself stays smooth
    const t = (r - L.rimR) / (rb - L.rimR), s = 1 - t, rid = Math.pow(Math.abs(Math.cos(8 * ths)), 0.5), fade = sm(0.33, 0.7, s) * sm(0, 0.12, t) * sm(18 * DEG, 38 * DEG, th);
    return { z: Math.max(0, hr * (0.513 * s * s + 0.487 * s) + 5 * (rid - 0.6) * fade), inner: false, r, th, u: s, rid }; }
  function platD(X, Y) { const [x0, x1, hy] = L.plat, k = L.skirt, dx = Math.max(x0 + k - X, X - x1 + k, 0), dy = Math.max(Math.abs(Y) - hy + k, 0); return Math.hypot(dx, dy); } // distance from the flat top (the 90 x 70 block's foot is at x 60: 12 m clear of his shins at S)
  function platSD(X, Y) { const [x0, x1, hy] = L.plat, k = L.skirt, dx = Math.max(x0 + k - X, X - x1 + k), dy = Math.abs(Y) - hy + k; return dx <= 0 && dy <= 0 ? Math.max(dx, dy) : Math.hypot(Math.max(dx, 0), Math.max(dy, 0)); }
  function platZ(X, Y) { const n1 = Math.sin(X * 0.11 + Y * 0.07 + 1.3) * Math.sin(Y * 0.09 - X * 0.05), n2 = Math.sin(X * 0.23 - Y * 0.19 + 0.4); const d = platSD(X, Y) + 0.9 * n1 + 0.35 * n2; if (d > L.skirt + 1.5) return -1; // a rough mesa: wobbly outline, chipped bevelled rim, fractured sides (slope <= ~2.5: climbable)
    const top = L.plat[3] + 0.12 * Math.sin(X * 0.3) * Math.sin(Y * 0.27); if (d <= -2) return top; const chip = 0.8 * sm(0.4, 0.9, n2 * 0.5 + 0.5 + 0.3 * n1);
    if (d <= 0) return top - chip * sm(-2, 0, d) - 0.25 * sm(-2, 0, d); const w = 0.9 * Math.sin(X * 0.21 + Y * 0.13) + 0.6 * Math.sin(X * 0.47 - Y * 0.31);
    return Math.max(0, top - chip - 0.25 - Math.max(0, d + 0.4 * w * sm(0, 2, d) * (1 - sm(L.skirt - 2, L.skirt, d))) * 2.0); }
  // the switchback up the neighbouring hill to the talk ledge: from path 21 on the green side, legs across the hill's outer flank, hairpins rounded (no turn over 120 deg)
  const SWB = (() => { const [lx, ly, lz] = L.ledge, pol = (r, a) => [lx + r * Math.cos(a * DEG), ly + r * Math.sin(a * DEG)];
    const key = [[175, 255], pol(80, 125), pol(60, 55), pol(40, 125), pol(L.ledgeR + 4, 70)], P = [key[0]]; // the foot south of the hill (clear of the crevice that runs north-south east of it), four legs up its south flank
    for (let k = 1; k + 1 < key.length; k++) { const a = key[k - 1], b = key[k], c = key[k + 1], ab = [b[0] - a[0], b[1] - a[1]], bc = [c[0] - b[0], c[1] - b[1]], la = Math.hypot(...ab), lc = Math.hypot(...bc), R = Math.min(12, la * 0.4, lc * 0.4), n = 6;
      const p0 = [b[0] - ab[0] / la * R, b[1] - ab[1] / la * R], p1 = [b[0] + bc[0] / lc * R, b[1] + bc[1] / lc * R]; // round the hairpin at b (a quadratic arc through n + 1 points: no turn sharper than ~30 deg)
      for (let i = 0; i <= n; i++) { const t = i / n; P.push([lerp(lerp(p0[0], b[0], t), lerp(b[0], p1[0], t), t), lerp(lerp(p0[1], b[1], t), lerp(b[1], p1[1], t), t)]); } }
    P.push(key[key.length - 1], [lx, ly]); const s = [0]; for (let i = 1; i < P.length; i++) s.push(s[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = s[P.length - 2]; return { P, s, tot, z0: 0, z1: lz }; })();
  function swbNear(X, Y) { const P = SWB.P; let best = 1e9, bz = 0; for (let i = 0; i + 1 < P.length; i++) { const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = clamp(((X - a[0]) * dx + (Y - a[1]) * dy) / l2, 0, 1), d = Math.hypot(X - a[0] - dx * t, Y - a[1] - dy * t);
      if (d < best) { best = d; const s = SWB.s[i] + Math.sqrt(l2) * t; bz = lerp(SWB.z0, SWB.z1, clamp(s / SWB.tot, 0, 1)); } } return [best, bz]; }
  const inBox = (X, Y) => X > -700 && X < 430 && Y > -470 && Y < 470;
  // the terrain: a smooth valley floor under the scorched oval (blended back over the ash band), the neighbouring hill + talk ledge + switchback benches, the cone, the platform
  function carve(x, y, hm) { if (!on()) return hm; const [X, Y] = loc(x, y); if (!inBox(X, Y)) return hm; let [h, mh] = hm;
    const e = Math.hypot((X - L.scorch[0]) / L.scorch[2], Y / L.scorch[3]), dE = (e - 1) * L.scorch[3], wF = 1 - sm(0, L.ash, dE);
    if (wF > 0) { const z0 = HB + U * 0.45 * (Math.sin(x * 0.0021 + 1.3) * Math.sin(y * 0.0017) + 0.5 * Math.sin(x * 0.0063 - y * 0.0049)); h += (z0 - h) * wF; mh *= 1 - wF; }
    const rL = Math.hypot(X - L.ledge[0], Y - L.ledge[1]);
    if (rL < 128) { const zh = HB + U * (L.ledge[2] + 2) * (1 - sm(L.ledgeR + 2, 124, rL)) * sm(-5, 22, dE); /* (the hill stops at the scorched oval: a steep face toward the works) */ if (zh > h) { h = zh; mh *= sm(L.ledgeR, 40, rL); } }
    if (rL < L.ledgeR + 10) { const w = 1 - sm(L.ledgeR, L.ledgeR + 10, rL); h += (HB + U * L.ledge[2] - h) * w; mh *= 1 - w; }
    if (rL < 128 && !M.noBench) { const [d, z] = swbNear(X, Y); if (d < 9) { const w = 1 - sm(4, 8.5, d); h += (HB + U * z - h) * w; mh *= 1 - w; } }
    const c = cone(X, Y); if (c) { const zc = HB + U * c.z; if (c.inner) h = zc; else h = lerp(Math.max(h, zc), zc, sm(0.02, 0.18, c.u)); mh = Math.max(mh, 300 * sm(0, 8, c.z)); } // a clean cone: the rim-zone peaks under it no longer poke through
    const pz = platZ(X, Y); if (pz > 0) { h = Math.max(h, HB + U * pz); mh = Math.max(mh, 320 * sm(0, 3, pz)); }
    return [h, mh]; }
  // areas the homes / paths keep out of (m: margin in world units)
  function workIn(X, Y, md) { return X > -5 - md && X < L.plat[1] + L.skirt + 12 + md && Math.abs(Y) < 45 + md; }
  function keepOut(x, y, m) { const [X, Y] = loc(x, y), md = (m || 0) / U; if (!inBox(X, Y)) return false; const dx = X - L.crater[0], r = Math.hypot(dx, Y), th = Math.abs(Math.atan2(Y, dx));
    if (r < Rb(th) + 5 + md) return 'cone'; if (platD(X, Y) < L.skirt + 12 + md) return 'platform'; if (workIn(X, Y, md)) return 'work'; if (X > -20 - md && X < 175 + md && Math.abs(Y) < 90 + md) return 'yard'; /* no home (or its yard trees) at his feet, the stride strip or round the platform */
    if (Math.hypot(X - L.ledge[0], Y - L.ledge[1]) < 30 + md) return 'ledge'; if (swbNear(X, Y)[0] < 12 + md) return 'switchback'; return false; }
  function pathKeep(X, Y) { const dx = X - L.crater[0], r = Math.hypot(dx, Y), th = Math.abs(Math.atan2(Y, dx)); return r < Rb(th) - 10 || platD(X, Y) < L.skirt + 12 || workIn(X, Y, 0); }
  function scorched(x, y, m) { const [X, Y] = loc(x, y); if (!inBox(X, Y)) return false; const e = Math.hypot((X - L.scorch[0]) / L.scorch[2], Y / L.scorch[3]); return (e - 1) * L.scorch[3] < (m || 0) / U; }
  const clear = (x, y, m) => scorched(x, y, (m || 0) + 35 * U) || !!keepOut(x, y, m);

  /* ---------- after world generation (never during it): paths, homes, trees ---------- */
  const C0 = [-40, 0]; let BND = null;
  function bnd() { if (BND) return BND; BND = []; const R = []; for (let k = 0; k < 360; k++) { const a = k * DEG, ux = Math.cos(a), uy = Math.sin(a); let last = 0; for (let d = 0; d < 720; d += 1) if (pathKeep(C0[0] + ux * d, C0[1] + uy * d)) last = d; R.push(last); }
    for (let k = 0; k < 360; k++) { let m = 0; for (let j = -3; j <= 3; j++) m = Math.max(m, R[(k + j + 360) % 360]); const a = k * DEG; BND.push([C0[0] + Math.cos(a) * (m + 15), C0[1] + Math.sin(a) * (m + 15)]); } return BND; } // (each ray takes the farthest of its neighbours: chords between rays never clip a corner)
  const angOf = (q) => ((Math.round(Math.atan2(q[1] - C0[1], q[0] - C0[0]) / DEG) % 360) + 360) % 360;
  function walk(a0, a1, cov) { const d = ((a1 - a0) % 360 + 540) % 360 - 180, st = d >= 0 ? 1 : -1, out = []; for (let k = 0; k <= Math.abs(d); k++) { const a = ((a0 + st * k) % 360 + 360) % 360; out.push(a); if (cov && k > 0 && cov.has(a)) return { a: out, hit: true }; } return { a: out, hit: false }; }
  function reroutePaths() { const PA = typeof Explore !== 'undefined' && Explore.PATHS; if (!PA) return; const B = bnd(), cov = new Set(), done = []; M.paths = [];
    PA.forEach((f, pi) => { const pts = []; for (let i = 1; i + 1 < f.length; i += 2) pts.push(loc(f[i], f[i + 1])); if (!pts.some((q) => inBox(q[0], q[1]))) return;
      const D = []; for (let i = 0; i < pts.length; i++) { D.push(pts[i]); if (i + 1 < pts.length) { const a = pts[i], b = pts[i + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2); for (let k = 1; k < n; k++) D.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]); } }
      const ins = D.map((q) => pathKeep(q[0], q[1])); if (!ins.some(Boolean)) return; if (ins.every(Boolean)) { PA[pi] = [f[0]]; M.paths.push([pi, 'inside: removed']); return; }
      const out = [], mine = new Set(); let i = 0, hs = false, he = false; while (i < D.length) { if (!ins[i]) { out.push(D[i]); i++; continue; } let j = i; while (j < D.length && ins[j]) j++;
        if (i > 0 && j < D.length) { const w = walk(angOf(D[i - 1]), angOf(D[j])); w.a.forEach((a) => { out.push(B[a]); mine.add(a); }); }
        else if (j < D.length) { hs = true; const w = walk(angOf(D[j]), angOf(D[0]), cov); w.a.reverse().forEach((a) => { out.push(B[a]); mine.add(a); }); } /* the start was inside: from where it joins (another rerouted path, or its own snap) round to the exit */
        else { he = true; const w = walk(angOf(D[i - 1]), angOf(D[D.length - 1]), cov); w.a.forEach((a) => { out.push(B[a]); mine.add(a); }); }
        i = j; }
      mine.forEach((a) => cov.add(a)); const thin = [out[0]]; let k0 = 0; for (let k = 1; k + 1 < out.length; k++) { const a = out[k0], c = out[k + 1], L2 = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; let dev = 0; for (let m = k0 + 1; m <= k; m++) { const b = out[m]; dev = Math.max(dev, Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / L2); } if (dev > 0.5 || L2 > 25) { thin.push(out[k]); k0 = k; } } thin.push(out[out.length - 1]); // (no skipped point strays over 0.5 m from the kept line)
      // a walk that joined an earlier rerouted path ends ON that path's kept line (no stub running beside it)
      const proj = (q) => { let bd = 1e9, bq = null; for (const P of done) for (let m = 0; m + 1 < P.length; m++) { const a = P[m], b = P[m + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = clamp(((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2, 0, 1), c = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(q[0] - c[0], q[1] - c[1]); if (d < bd) { bd = d; bq = c; } } return [bd, bq]; };
      const snap = (L) => { if (!done.length) return; while (L.length > 2 && proj(L[L.length - 2])[0] < 10) L.pop(); const [d, c] = proj(L[L.length - 1]); if (d < 25) L[L.length - 1] = c; };
      if (he) snap(thin); if (hs) { thin.reverse(); snap(thin); thin.reverse(); } done.push(thin);
      const nf = [f[0]]; for (const q of thin) { const w = wld(q[0], q[1]); nf.push(Math.round(w[0]), Math.round(w[1])); } PA[pi] = nf; M.paths.push([pi, (f.length - 1) / 2, thin.length]); });
    // the switchback to the talk ledge, off the nearest path on the green side
    const st = SWB.P[0], w0 = wld(st[0], st[1]); let best = null; const crk = (W.cracks || []).flatMap((c) => c.pts.filter((q) => Math.hypot(q[0] - w0[0], q[1] - w0[1]) < 2500));
    const lineOk = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 20); for (let k = 0; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; if (crk.some((q) => Math.hypot(q[0] - x, q[1] - y) < 14 * U)) return false; } return true; }; // (the link never crosses a crevice)
    PA.forEach((f) => { for (let i = 1; i + 3 < f.length; i += 2) { const ax = f[i], ay = f[i + 1], bx = f[i + 2], by = f[i + 3], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = clamp(((w0[0] - ax) * dx + (w0[1] - ay) * dy) / l2, 0, 1), q = [ax + dx * t, ay + dy * t], d = Math.hypot(w0[0] - q[0], w0[1] - q[1]); if ((!best || d < best.d) && lineOk(q, w0)) best = { d, q }; } });
    if (best && best.d > 4) { PA.push([0, Math.round(best.q[0]), Math.round(best.q[1]), Math.round(w0[0]), Math.round(w0[1])]); M.swb = PA.length - 1; } M.swbJoin = best ? Math.round(best.d) : null;
    // the switchback itself is a valley-route tread (map3d VR: a painted 4 m shelf she walks exactly, finer than the terrain grid; its ends anchor the path network)
    if (typeof M3 !== 'undefined' && M3.VR && !M3.VR.list.some((q) => q[0] === 'forge-switchback')) { M3.VR.list.push(['forge-switchback', 1, SWB.P.map((q, i) => { const w = wld(q[0], q[1]), z = lerp(SWB.z0, SWB.z1, clamp(SWB.s[i] / SWB.tot, 0, 1)); return [Math.round(w[0]), Math.round(w[1]), +((HB + U * z) / WS).toFixed(2)]; })]); M3.VR.bins = null; } }
  function moveHomes() { if (!W.homes) return; const PA = (typeof Explore !== 'undefined' && Explore.PATHS) || [], segs = []; for (const f of PA) for (let i = 1; i + 3 < f.length; i += 2) segs.push([f[i], f[i + 1], f[i + 2], f[i + 3]]);
    const pathD = (x, y) => { let m = 1e9; for (const [ax, ay, bx, by] of segs) { if (Math.abs(ax - x) > 900 && Math.abs(bx - x) > 900) continue; const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1); m = Math.min(m, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } return m; };
    const H = (x, y) => (typeof M3 !== 'undefined' && M3.heightAt ? M3.heightAt(x, y)[0] : 0);
    const ok = (x, y, h) => { const r = h.size * 0.62; if (keepOut(x, y, r + 12) || Math.hypot(x, y) > CITY.R - 1100) return false; if (typeof isWet === 'function' && isWet(x, y, r + 6)) return false; if (typeof chasmDist === 'function' && chasmDist(x, y) < r + 8) return false;
      if (W.homes.some((o) => o !== h && Math.hypot(o.x - x, o.y - y) < (o.size + h.size) * 0.62 + 14)) return false; if (pathD(x, y) < r + 36) return false; const z = H(x, y); if (Math.abs(H(x + 40, y) - z) > 13 || Math.abs(H(x, y + 40) - z) > 13 || Math.abs(H(x - 40, y) - z) > 13 || Math.abs(H(x, y - 40) - z) > 13) return false; return true; };
    for (const h of W.homes) { if (h.isPlayer) continue; const r = h.size * 0.62, why = keepOut(h.x, h.y, r + 10); if (!why) { if (scorched(h.x, h.y)) M.kept.push(h.id); continue; }
      let spot = null; for (let ring = 1; ring < 90 && !spot; ring++) { const R = ring * 36, n = Math.ceil(2 * Math.PI * R / 36); for (let k = 0; k < n; k++) { const a = (k / n) * 2 * Math.PI + ring * 0.37, x = h.x + Math.cos(a) * R, y = h.y + Math.sin(a) * R; if (ok(x, y, h)) { spot = [x, y]; break; } } }
      if (spot) { const from = [Math.round(h.x), Math.round(h.y)]; if (typeof moveHome === 'function') moveHome(h, spot[0], spot[1]); else { h.x = spot[0]; h.y = spot[1]; } M.moved.push([h.id, why, from, spot.map(Math.round)]); } else M.moved.push([h.id, why, [Math.round(h.x), Math.round(h.y)], null]); } }
  const PRUNE = new Set(['tree', 'pine', 'palm', 'deadtree', 'bush', 'rock', 'boulder', 'basalt', 'obsidian', 'slag', 'logs', 'hay', 'shrooms', 'mosspatch', 'scree', 'cracked', 'field', 'reeds', 'dune', 'cliff']); // nature and loose decor only (named works stay)
  function pruneTrees() { if (!W.objs) return; const keep = []; for (const o of W.objs) { if (PRUNE.has(o.type) && clear(o.x, o.y, (o.r || 0) + 6)) { M.trees++;
        if (W.buckets) { const k = Math.floor(o.x / W.bucket) + ',' + Math.floor(o.y / W.bucket), Lb = W.buckets.get(k); if (Lb) { const i = Lb.indexOf(o); if (i >= 0) Lb.splice(i, 1); } } continue; } keep.push(o); } W.objs = keep; }
  function afterGen() { if (!on() || M.gen) return; M.gen = true; if (typeof M3 !== 'undefined' && M3.heightAt) { M.noBench = true; const f = wld(SWB.P[0][0], SWB.P[0][1]); SWB.z0 = clamp((M3.heightAt(f[0], f[1])[0] - HB) / U, 0, 44); M.noBench = false; } /* the tread starts at the ground at its foot */ reroutePaths(); moveHomes(); pruneTrees(); }
  // the tin field (mine spot 4) reaches onto the platform: its nodes, boulders and chips inside the works go (the platform stays bare rock); the rest of the field stays.
  // Positions only, after the field is laid out, so its random draws (and every other field's) are untouched.
  function orePrune(O) { if (!on() || !O || !O.nodes) return; const out = (o) => { const [X, Y] = loc(o.x, o.y); return inBox(X, Y) && pathKeep(X, Y); }; let n = 0;
    O.nodes = O.nodes.filter((q) => { if (!out(q)) return true; n++; const Ls = q.spot && q.spot.nodes, i = Ls ? Ls.indexOf(q) : -1; if (i >= 0) Ls.splice(i, 1); return false; });
    const r0 = O.rocks.length, d0 = O.deco.length; O.rocks = O.rocks.filter((q) => !out(q)); O.deco = O.deco.filter((q) => q.x == null || !out(q)); M.ore = { nodes: n, rocks: r0 - O.rocks.length, deco: d0 - O.deco.length }; }
  // the switchback's top end is a destination (the dead-end trim and audit treat it like a door)
  function anchors() { const [x, y] = wld(L.ledge[0], L.ledge[1]); return [[x, y, (L.ledgeR + 6) * U]]; }

  /* ---------- the loop (27 s) ---------- */
  const BARK = [[0, '#5a3a2c', 0], [4, '#fff2b0', 3.0], [6, '#ffc040', 2.6], [10, '#ff8a1a', 2.2], [12, '#ff6a14', 1.9], [15.2, '#e8401a', 1.3], [18.4, '#a82a14', 0.7], [21.6, '#5a2418', 0.25], [23, '#4a4240', 0], [27, '#4a4240', 0]];
  const hx = (s) => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
  function barAt(t) { t = ((t % LOOP) + LOOP) % LOOP; let i = 0; while (i + 1 < BARK.length && BARK[i + 1][0] <= t) i++; const a = BARK[i], b = BARK[Math.min(i + 1, BARK.length - 1)], u = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0, ca = hx(a[1]), cb = hx(b[1]);
    return { c: ca.map((v, k) => lerp(v, cb[k], u)), em: lerp(a[2], b[2], u) }; }
  const hitTimes = () => Array.from({ length: HITS }, (_, i) => +(HIT0 + i * HITDT).toFixed(2));
  function phase(t) { t = ((t % LOOP) + LOOP) % LOOP; return t < 4 ? 'dip' : t < 6 ? 'lift' : t < 10 ? 'turn' : t < 12 ? 'lay' : t < 23 ? 'strike' : 'return'; }
  // body plan (design metres, ape-local: +z forward, +y up, +x his left); 70 standing, ~58 in the working crouch
  const BP = { hip: 34, hipW: 6, thigh: 17, shin: 15, ankle: 2, chestUp: 2, torso: 26, shA: [11, 24, 0], shB: [10, 14, 1], armA: [17, 15], armB: [15, 14], head: [0, 25, 2] };
  // key poses: X (along the loop line), yaw (deg, 90 = facing the volcano / +x world), hip height, lean (deg), tongs hand-mid [y, z] + pitch (deg down), bar attached
  function pose(t) { t = ((t % LOOP) + LOOP) % LOOP; const P = {}; const k = (a, b, t0, t1) => lerp(a, b, sm(t0, t1, t));
    const dip = { y: 45, z: 15, p: 56 }, lift = { y: 52, z: 14, p: 12 }, lay = { y: 39, z: 13, p: 20 };
    if (t < 2) { P.X = L.D; P.yaw = 90; P.lean = k(14, 20, 0, 2); P.tg = { y: k(52, dip.y, 0, 1.6), z: k(14, dip.z, 0, 1.6), p: k(18, dip.p, 0, 1.8) }; }
    else if (t < 4) { P.X = L.D; P.yaw = 90; P.lean = 20; P.tg = { ...dip, p: dip.p + 2 * Math.sin((t - 2) * 3) }; }
    else if (t < 6) { P.X = L.D; P.yaw = 90; P.lean = k(20, 12, 4, 6); P.tg = { y: k(dip.y, lift.y, 4, 5.8), z: k(dip.z, lift.z, 4, 5.8), p: k(dip.p, lift.p, 4, 5.6) }; }
    else if (t < 10) { const u = sm(6.2, 9.8, t); P.X = lerp(L.D, L.S, u); P.yaw = lerp(90, -90, sm(6, 9.6, t)); P.lean = 12 + 2 * Math.sin(u * Math.PI); P.tg = { ...lift }; P.walk = u; }
    else if (t < 12) { P.X = L.S; P.yaw = -90; P.lean = k(12, 18, 10, 11.6); P.tg = { y: k(lift.y, lay.y, 10, 11.8), z: k(lift.z, lay.z, 10, 11.8), p: k(lift.p, lay.p, 10, 11.8) }; P.lay = sm(10.2, 11.9, t); }
    else if (t < 23) { P.X = L.S; P.yaw = -90; P.lean = 18; P.tg = { ...lay }; P.lay = 1; }
    else { const u = sm(24, 26.6, t); P.X = lerp(L.S, L.D, u); P.yaw = lerp(-90, 90, sm(23.8, 26.4, t)); P.lean = t < 24 ? k(18, 12, 23, 24) : k(12, 14, 26, 27); P.tg = t < 26 ? { y: k(lay.y, lift.y, 23, 24), z: k(lay.z, lift.z, 23, 24), p: k(lay.p, lift.p, 23, 24) } : { y: k(lift.y, 52, 26, 27), z: k(lift.z, 14, 26, 27), p: k(lift.p, 18, 26, 27) }; P.lay = 1 - sm(23, 23.9, t); P.walk = u; P.back = true; }
    P.hipY = BP.hip - 2.6; // upright, legs planted
    // the hammer (upper right hand) strikes all 7 hits: sigma 1 = raised overhead, 0 = head down on the bar; the upper left hand braces the tongs; at rest it hangs at his side
    const H = hitTimes(), sw = () => { if (t < 11 || t > 23.6) return null; let s = 1;
        for (const th of H) { if (t >= th - 0.42 && t <= th) return 1 - sm(th - 0.42, th, t) ** 1.6; if (t > th && t < th + 1.18) s = sm(th + 0.08, th + 1.1, t); }
        if (t < H[0] - 0.42) s = sm(11, 12.2, t); if (t > H[H.length - 1] + 1.18) s = 1 - sm(22.6, 23.6, t); return s; };
    P.ham = [null, sw()]; return P; }

  /* ---------- 3D ---------- */
  let THREEok = false;
  function apeGeo(mob) { const parts = [], q = mob ? 0.8 : 1.15, sg = (n) => Math.max(6, Math.round(n * q));
    const lin = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map((v) => Math.pow(v / 255, 2.2)); // (sRGB hex -> linear vertex colour)
    const FK = 0.72, FL = lin(0x9c958a).map((v) => v * FK), FM = lin(0x6f6961).map((v) => v * FK), FS = lin(0x3f3a35).map((v) => v * FK), // (fur hexes x0.72: under ACES at exposure 1.25 the spec hexes read near-white)
      SKIN = lin(0x8a6a52), LEATH = lin(0x5a3418), LEDGE = lin(0x321b0a), BRASS = lin(0xb8862b), BRD = lin(0x6b4a1c), HEADC = lin(0x3a3632), WRAP = lin(0x4a2c16), WOOD = lin(0x4f3420), IRON = lin(0x2e2b28), EYE = [0.008, 0.007, 0.006];
    // kind: 0 plain, 1 fur, 2 fur with clumped tufts; col: an rgb or f(local x, y, z, ny) evaluated before the part is placed
    const add = (g, bone, col, kind, at, rot, scl) => { if (typeof col === 'function') { const p = g.attributes.position, n = g.attributes.normal, c = []; for (let i = 0; i < p.count; i++) c.push(col(p.getX(i), p.getY(i), p.getZ(i), n.getY(i))); g.userData.c = c; }
      if (scl) g.scale(...scl); if (rot) { if (rot[0]) g.rotateX(rot[0]); if (rot[1]) g.rotateY(rot[1]); if (rot[2]) g.rotateZ(rot[2]); } if (at) g.translate(...at); parts.push({ g, bone, col: typeof col === 'function' ? null : col, kind: kind || 0 }); };
    const sph = (r, w, h) => new THREE.SphereGeometry(r, sg(w || 20), sg(h || 14)), cap = (r, l, s) => new THREE.CapsuleGeometry(r, l, 4, sg(s || 14)), box = (x, y, z, a, b, c) => new THREE.BoxGeometry(x, y, z, a || 1, b || 1, c || 1);
    const taper = (r0, r1, l, s) => new THREE.CylinderGeometry(r0, r1, l, sg(s || 14), 3, false); // (+y end radius r0)
    // a flat band through points (model space, on one bone): boxes w x 0.7 between consecutive points, the face toward 'out'; leather with dark edges
    const band = (pts, w, bone, out) => { for (let i = 0; i + 1 < pts.length; i++) { const A = new THREE.Vector3(...pts[i]), B = new THREE.Vector3(...pts[i + 1]), ya = B.clone().sub(A), l = ya.length(); ya.normalize(); const za = new THREE.Vector3(...out).sub(ya.clone().multiplyScalar(ya.dot(new THREE.Vector3(...out)))).normalize(), xa = ya.clone().cross(za);
        const g = box(w, l + 0.6, 0.7, 4, 1, 1); g.userData.c = []; const p = g.attributes.position; for (let k = 0; k < p.count; k++) g.userData.c.push(Math.abs(p.getX(k)) > w / 2 - 0.05 ? LEDGE : LEATH);
        g.applyMatrix4(new THREE.Matrix4().makeBasis(xa, ya, za)); g.translate(...A.clone().add(B).multiplyScalar(0.5).toArray()); parts.push({ g, bone, col: null, kind: 0 }); } };
    // bones: 0 hips, 1 chest, 2 head, 3/4 thighL/shinL, 5/6 thighR/shinR, 7/8 armA L up/fore, 9/10 armA R, 11/12 armB L, 13/14 armB R, 15 tongs, 16 (spare: the left upper hand braces the tongs), 17 hammer R
    const hy = BP.hip, cy = hy + BP.chestUp;
    add(sph(1, 22, 16), 0, FM, 1, [0, hy + 1, -0.5], null, [11.5, 8, 9]);
    add(sph(1, 26, 18), 1, FM, 1, [0, cy + 13, 0.5], null, [13.5, 15.5, 11]); add(sph(1, 24, 14), 1, FM, 1, [0, cy + 19, 1.5], null, [15.5, 9, 10.5]);
    add(sph(1, 24, 14), 1, FM, 2, [0, cy + 23, -4], null, [17, 9.5, 10]); add(sph(1, 18, 12), 1, FM, 2, [0, cy + 26.5, -5.5], null, [10, 7, 8]); // the heavy shoulder hump
    add(sph(1, 16, 12), 1, SKIN, 0, [0, cy + 16, 9.2], null, [8, 8, 3]); add(sph(1, 16, 12), 1, FM, 1, [0, cy + 23.5, 2.5], null, [6.8, 4.5, 6.2]); // chest skin, a short thick neck
    const hc = [0, cy + BP.head[1] + 1.5, BP.head[2] + 1.5]; add(sph(1, 22, 16), 2, FM, 1, hc, null, [6, 5.6, 6]); add(sph(1, 14, 10), 2, FM, 2, [0, hc[1] + 4.6, hc[2] - 1.8], null, [3.6, 2.8, 4.8]);
    add(sph(1, 18, 10), 2, SKIN.map((v) => v * 0.62), 0, [0, hc[1] + 2.0, hc[2] + 4.4], null, [7.4, 1.9, 2.7]); // the broad brow ridge
    add(sph(1, 16, 12), 2, SKIN, 0, [0, hc[1] + 0.1, hc[2] + 3.9], null, [4.9, 4.4, 2.5]); add(sph(1, 16, 12), 2, SKIN, 0, [0, hc[1] - 2.2, hc[2] + 4.7], null, [4.2, 3.2, 3.0]);
    for (const s of [1, -1]) { add(sph(0.62, 10, 8), 2, EYE, 0, [s * 2.1, hc[1] + 0.7, hc[2] + 5.7]); add(sph(1.4, 10, 8), 2, SKIN, 0, [s * 5.9, hc[1] + 0.2, hc[2] - 0.6]); }
    // legs: planted, thick thighs, tufted shins, feet with skin soles
    for (const [s, b0] of [[1, 3], [-1, 5]]) { const x = s * BP.hipW; add(cap(5.3, BP.thigh - 5), b0, FM, 1, [x, hy - BP.thigh / 2, 0]); add(taper(4.6, 3.6, BP.shin - 2), b0 + 1, FM, 2, [x, hy - BP.thigh - BP.shin / 2 + 0.5, 0.3]); add(sph(4.2, 14, 10), b0 + 1, FM, 1, [x, hy - BP.thigh, 0.3]);
      add(sph(1, 16, 10), b0 + 1, (px, py, pz, ny) => ny < -0.3 ? SKIN : FM, 0, [x, 1.7, 2.6], null, [4.0, 1.8, 6.4]); }
    // arms: deltoid caps, thick tapered forearms (tufted), brass bracers, big hands with skin palms
    const arm = (sx, sy, sz, L1, L2, r1, rE, rW, b0, side) => { const x = side * sx, ys = cy + sy, ye = ys - L1, yw = ye - L2;
      add(sph(1, 16, 12), b0, FM, 2, [x * 1.04, ys + 0.6, sz - 0.5], null, [r1 * 1.3, r1 * 1.15, r1 * 1.25]); add(cap(r1, L1 - 2 * r1 + 1.5), b0, FM, 1, [x, ys - L1 / 2, sz]);
      add(sph(rE * 0.98, 14, 10), b0 + 1, FM, 1, [x, ye, sz]); add(taper(rE, rW, L2 - 1.5), b0 + 1, FM, 2, [x, ye - (L2 - 1.5) / 2, sz]);
      for (const [f, w] of [[0.55, 0.62], [0.8, 0.5]]) { const r = lerp(rE, rW, f) + 0.25; add(new THREE.TorusGeometry(r, w, sg(6), sg(18)), b0 + 1, f < 0.6 ? BRASS : BRD, 0, [x, ye - L2 * f, sz], [Math.PI / 2, 0, 0]); }
      add(sph(1, 14, 10), b0 + 1, (px, py, pz, ny) => ny > 0.55 ? FM : SKIN, 0, [x, yw - 1.8, sz + 0.4], null, [rW * 1.25, 3.2, rW * 1.4]); };
    arm(BP.shA[0], BP.shA[1], BP.shA[2], BP.armA[0], BP.armA[1], 4.6, 5.0, 3.4, 7, 1); arm(BP.shA[0], BP.shA[1], BP.shA[2], BP.armA[0], BP.armA[1], 4.6, 5.0, 3.4, 9, -1);
    arm(BP.shB[0], BP.shB[1], BP.shB[2], BP.armB[0], BP.armB[1], 3.8, 4.2, 2.9, 11, 1); arm(BP.shB[0], BP.shB[1], BP.shB[2], BP.armB[0], BP.armB[1], 3.8, 4.2, 2.9, 13, -1);
    // the leather apron (#5a3418, edges #321b0a): a bib from mid-chest to above the knees following the body (chest bone above the navel seam, hips bone below), a neck loop, a navel belt, an X of back straps clipped at the hips, 3 brass rivets
    const ell = (x, y, c, r) => { const k = 1 - (x / r[0]) ** 2 - ((y - c[1]) / r[1]) ** 2; return k > 0 ? c[2] + r[2] * Math.sqrt(k) : -1e9; };
    const front = (x, y) => Math.max(ell(x, y, [0, cy + 13, 0.5], [13.5, 15.5, 11]), ell(x, y, [0, cy + 19, 1.5], [15.5, 9, 10.5]), ell(x, y, [0, hy + 1, -0.5], [11.5, 8, 9]), y < hy ? 5.3 * Math.sqrt(Math.max(0, 1 - ((Math.abs(x) - BP.hipW) / 5.3) ** 2)) : -1e9);
    const back = (x, y) => -Math.max(ell(x, y, [0, cy + 13, -0.5], [13.5, 15.5, 11]), ell(x, y, [0, cy + 23, 4], [17, 9.5, 10]));
    const yT = cy + 18, yB = 21, wAt = (y) => lerp(14.5, 18, (yT - y) / (yT - yB)); let zPrev = null;
    for (const [y0, y1, rows, bone] of [[yT, cy, 7, 1], [cy, yB, 9, 0]]) { const P = [], C = [], I = [], cols = 9; for (let j = 0; j <= rows; j++) { const y = lerp(y0, y1, j / rows), w = wAt(y), zr = [];
        for (let i = 0; i <= cols; i++) { const x = (i / cols - 0.5) * w; let z = front(x, y) + 0.8; if (zPrev) z = Math.max(z, zPrev[i] - 0.45); zr.push(z); P.push(x, y, z); const ed = i === 0 || i === cols || (j === 0 && y0 === yT) || (j === rows && y1 === yB); C.push(ed ? LEDGE : LEATH.map((v) => v * (0.9 + 0.2 * Math.sin(x * 1.3 + y * 0.7)))); } zPrev = zr; }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; I.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); g.userData.c = C; parts.push({ g, bone, col: null, kind: 0 }); }
    const ring = (rx, rz, w, at, rot) => { const g = new THREE.CylinderGeometry(1, 1, w, sg(26), 1, true); g.userData.c = []; const p = g.attributes.position; for (let k = 0; k < p.count; k++) g.userData.c.push(LEDGE); // (1 height segment: its two rims are the dark edges, the middle shades to leather)
      const g2 = new THREE.CylinderGeometry(1, 1, w * 0.7, sg(26), 1, true); g2.userData.c = []; for (let k = 0; k < g2.attributes.position.count; k++) g2.userData.c.push(LEATH); for (const G of [g, g2]) { const k = G === g2 ? 0.25 : 0; G.scale(rx + k, 1, rz + k); if (rot) G.rotateX(rot); G.translate(...at); } return [g, g2]; };
    for (const G of ring(11.4, 10.4, 5.6, [0, cy + 3, 0.6])) parts.push({ g: G, bone: 1, col: null, kind: 0 }); // the belt at the navel (its centre strip slightly proud: lit leather between dark edges)
    for (const G of ring(7.6, 6.8, 3.4, [0, cy + 24.2, 1.8], 0.42)) parts.push({ g: G, bone: 1, col: null, kind: 0 }); // the neck loop, dipping at the front
    for (const s of [1, -1]) { band([[s * 5.0, cy + 22.6, 7.3], [s * 6.4, cy + 20.4, 10.4], [s * 6.8, yT - 0.3, front(s * 6.8, yT) + 1.0]], 3.0, 1, [s * 0.2, 0.3, 1]); // neck loop -> bib corners
      const pts = []; for (let k = 0; k <= 5; k++) { const u = k / 5, x = lerp(s * 9.5, -s * 8.2, u), y = lerp(cy + 21, cy + 3.5, u); pts.push([x, y, back(x, y) - 0.9 - (k === 5 ? 1.2 : 0)]); } band(pts, 4.4, 1, [0, 0.2, -1]); // the X across his back
      add(box(2.6, 3.2, 0.9), 1, BRASS, 0, [-s * 8.2, cy + 3.3, back(-s * 8.2, cy + 3.3) - 2.6]); add(sph(0.85, 8, 6), 1, BRASS, 0, [s * 6.8, yT - 1.4, front(s * 6.8, yT - 1.4) + 1.3]); }
    add(sph(0.85, 8, 6), 1, BRASS, 0, [0, cy + 9, front(0, cy + 9) + 1.3]); add(box(3.2, 3.6, 0.9), 1, BRASS, 0, [0, cy + 3, 11.4]); // rivet, buckle
    // the tongs (bone 15: rest at the model origin, +z along the reins to the jaws), the hammer (bone 17: +z along the handle, head at the end)
    add(box(0.9, 0.9, L.tongs), 15, IRON, 0, [1.0, 0, L.tongs / 2]); add(box(0.9, 0.9, L.tongs), 15, IRON, 0, [-1.0, 0, L.tongs / 2]); add(box(3.2, 1.6, 1.6), 15, IRON, 0, [0, 0, L.tongs * 0.62]);
    add(box(1.2, 3.4, 4.5), 15, IRON, 0, [0, 1.6, L.tongs - 1.4]); add(box(1.2, 3.4, 4.5), 15, IRON, 0, [0, -1.6, L.tongs - 1.4]);
    { const b = 17; add(new THREE.CylinderGeometry(0.75, 0.9, L.handle, sg(8)), b, WOOD, 0, [0, 0, L.handle / 2], [Math.PI / 2, 0, 0]); add(new THREE.CylinderGeometry(1.05, 1.05, 7, sg(8)), b, WRAP, 0, [0, 0, 3.5], [Math.PI / 2, 0, 0]);
      add(box(L.head[0], L.head[1], L.head[2]), b, HEADC, 0, [0, 0, L.handle]); add(box(L.head[0] + 0.5, 1.2, L.head[2] + 0.5), b, BRASS, 0, [0, L.head[1] * 0.38, L.handle]); add(box(L.head[0] + 0.5, 1.2, L.head[2] + 0.5), b, BRD, 0, [0, -L.head[1] * 0.38, L.handle]); }
    // merge: rigid skinning (one bone per part). Fur: lit / mid / shadow by facing (up lit, under dark), darker at the joints, clumped tufts (shoulders, forearms, shins) + a noise normal
    const J = [[0, cy + 24], [BP.shA[0], cy + BP.shA[1]], [BP.shA[0], cy + BP.shA[1] - BP.armA[0]], [BP.shB[0], cy + BP.shB[1]], [BP.shB[0], cy + BP.shB[1] - BP.armB[0]], [BP.hipW, hy], [BP.hipW, hy - BP.thigh], [0, hy - 4]];
    const P = [], N = [], C = [], SI = [], SW = [], I = [], FU = []; let base = 0; const nz = (x, y, z) => 0.5 + 0.25 * Math.sin(x * 1.7 + y * 0.9) * Math.sin(z * 1.3 - y * 0.7) + 0.25 * Math.sin(x * 4.1 - z * 3.3 + y * 2.9);
    for (const { g, bone, col, kind } of parts) { const gi = g.index ? g : null, p = g.attributes.position, n = g.attributes.normal, oy = bone >= 15 ? cy : 0; /* tongs + hammer: modelled at their bone's origin, which rests at the chest (bind pose) */
      for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i) + oy, z = p.getZ(i); const nn = nz(x, y, z), ny = n.getY(i); let c = g.userData.c ? g.userData.c[i] : col;
        if (kind) { const tf = kind === 2 ? Math.pow(Math.max(0, Math.sin(x * 1.9 + z * 1.3 + y * 0.4) * Math.sin(y * 2.3 - x * 0.7 + z * 0.9)), 2) : 0, sh = (nn - 0.5) * 0.6 + tf * 0.7; x += n.getX(i) * sh; y += n.getY(i) * sh; z += n.getZ(i) * sh;
          let jd = 1e9; for (const [jx, jy] of J) jd = Math.min(jd, Math.hypot(Math.abs(x) - jx, y - jy)); const ao = (1 - 0.42 * (1 - sm(1, 6, jd))) * (0.86 + 0.28 * nn) * (y < 6 ? 0.8 : 1);
          const lit = ny >= 0 ? FM.map((v, k) => lerp(v, FL[k], Math.pow(ny, 0.8))) : FM.map((v, k) => lerp(v, FS[k], Math.min(1, -ny * 1.15))); c = lit.map((v, k) => lerp(v, FL[k], tf * 0.35) * ao); }
        P.push(x, y, z); N.push(n.getX(i), ny, n.getZ(i)); C.push(...c); SI.push(bone, 0, 0, 0); SW.push(1, 0, 0, 0); FU.push(kind ? nn : -1); }
      if (gi) for (let i = 0; i < gi.index.count; i++) I.push(base + gi.index.getX(i)); else for (let i = 0; i < p.count; i++) I.push(base + i); base += p.count; g.dispose(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); geo.setIndex(I); geo.computeVertexNormals();
    { const nr = geo.attributes.normal, ps = geo.attributes.position; for (let i = 0; i < nr.count; i++) { if (FU[i] < 0) continue; const x = ps.getX(i), y = ps.getY(i), z = ps.getZ(i), v = new THREE.Vector3(nr.getX(i) + 0.22 * Math.sin(x * 3.1 + y * 1.7), nr.getY(i) + 0.22 * Math.sin(y * 2.9 - z * 2.3), nr.getZ(i) + 0.22 * Math.sin(z * 3.3 + x * 2.1)).normalize(); nr.setXYZ(i, v.x, v.y, v.z); } }
    geo.computeBoundingSphere(); return geo; }
  function bones() { const B = [], mk = (p, par) => { const b = new THREE.Bone(); b.position.set(...p); if (par != null) B[par].add(b); B.push(b); return b; };
    const hy = BP.hip; mk([0, hy, 0]); mk([0, BP.chestUp, 0], 0); mk([BP.head[0], BP.torso - 1 + 0, BP.head[2]], 1);
    for (const s of [1, -1]) { mk([s * BP.hipW, 0, 0], 0); mk([0, -BP.thigh, 0], B.length - 1); }
    for (const s of [1, -1]) { mk([s * BP.shA[0], BP.shA[1], BP.shA[2]], 1); mk([0, -BP.armA[0], 0], B.length - 1); }
    for (const s of [1, -1]) { mk([s * BP.shB[0], BP.shB[1], BP.shB[2]], 1); mk([0, -BP.armB[0], 0], B.length - 1); }
    mk([0, 0, 0], 1); mk([0, 0, 0], 1); mk([0, 0, 0], 1); return B; }
  function lavaTex() { const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'), im = g.createImageData(N, N); // lava #fb6b1c with a hot #ffd24a core and hot veins, a little dark crust
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = i / N * 2 * Math.PI, b = j / N * 2 * Math.PI, rc = Math.hypot(i / N - 0.5, j / N - 0.5) * 2;
      const v = 0.5 + 0.22 * Math.sin(a * 3 + Math.sin(b * 2) * 2) * Math.cos(b * 3 + Math.sin(a * 2)) + 0.18 * Math.sin(a * 7 + b * 5) * Math.sin(b * 6 - a * 2) + 0.1 * Math.sin(a * 13 - b * 11), c = clamp(v, 0, 1), o = (j * N + i) * 4;
      const hot = clamp(Math.max(sm(0.62, 0.85, c), 1 - sm(0.05, 0.55, rc)), 0, 1), crust = sm(0.26, 0.12, c) * sm(0.3, 0.7, rc) * 0.7;
      im.data[o] = lerp(lerp(251, 255, hot), 74, crust); im.data[o + 1] = lerp(lerp(107, 210, hot), 30, crust); im.data[o + 2] = lerp(lerp(28, 74, hot), 14, crust); im.data[o + 3] = 255; } g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t; }
  function smokeTex() { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); }
  function dotTex() { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const g = cv.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,220,150,.8)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cv); }
  function build(C) { if (M.built || typeof THREE === 'undefined' || !C || !C.scene) return; M.built = true; THREEok = true; const mob = typeof QUALITY !== 'undefined' && QUALITY.name === 'mobile'; M.mob = mob;
    const g = new THREE.Group(); g.name = 'volcanicForge'; C.scene.add(g); M.grp = g;
    // lava lake: one unlit disc at z 28 (12 m under the lip), slowly turning (its hot core stays centred), not tone-mapped
    { const [cx, cz] = wld(L.crater[0], L.crater[1]); const lg = new THREE.CircleGeometry(84 * U, mob ? 28 : 48); lg.rotateX(-Math.PI / 2); M.lavaT = lavaTex(); const lm = new THREE.MeshBasicMaterial({ map: M.lavaT, color: 0xffffff }); lm.toneMapped = false;
      const lava = new THREE.Mesh(lg, lm); lava.position.set(cx, HB + L.lava * U, cz); lava.name = 'forgeLava'; g.add(lava); M.lava = lava; }
    // a light, low-alpha smoke plume (#6e6258): 8 camera-facing quads in one draw
    { const n = 8, pg = new THREE.BufferGeometry(), I = []; for (let k = 0; k < n; k++) { const b = k * 4; I.push(b, b + 1, b + 2, b, b + 2, b + 3); } const uv = []; for (let k = 0; k < n; k++) uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 12), 3)); pg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); pg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 16), 4)); pg.setIndex(I);
      const sm2 = new THREE.MeshBasicMaterial({ color: 0x6e6258, map: smokeTex(), transparent: true, depthWrite: false, vertexColors: true, fog: true }); const pl = new THREE.Mesh(pg, sm2); pl.frustumCulled = false; pl.name = 'forgeSmoke'; pl.renderOrder = 2; g.add(pl); M.smoke = pl; }
    // the ape: one skinned mesh (rigid parts, vertex colours) = one draw call
    { const geo = apeGeo(mob), B = bones(), mat = new THREE.MeshLambertMaterial({ vertexColors: true }); rimLight(mat); const ape = new THREE.SkinnedMesh(geo, mat); ape.add(B[0]); ape.updateMatrixWorld(true); ape.bind(new THREE.Skeleton(B));
      ape.frustumCulled = false; ape.castShadow = !mob; ape.scale.setScalar(U); ape.name = 'forgeApe'; g.add(ape); M.ape = ape; M.B = B; M.apeTris = geo.index.count / 3; }
    // the bar (30 x 4 x 4): an emissive gradient, core -> edges (aE: 0 at the face centres, 1 at the box edges and ends), colours from the diagram's keyframes
    { const bg = new THREE.BoxGeometry(L.bar[2], L.bar[1], L.bar[0], 4, 4, 12); const p = bg.attributes.position, e = []; for (let k = 0; k < p.count; k++) { const ax = Math.abs(p.getX(k)) / (L.bar[2] / 2), ay = Math.abs(p.getY(k)) / (L.bar[1] / 2), az = Math.abs(p.getZ(k)) / (L.bar[0] / 2); e.push(Math.max(clamp(ax + ay - 1, 0, 1), sm(0.7, 1, az))); }
      bg.setAttribute('aE', new THREE.Float32BufferAttribute(e, 1)); bg.translate(0, 0, L.bar[0] / 2 - L.grip); M.barM = new THREE.MeshLambertMaterial({ color: 0x5a3a2c }); M.barM.toneMapped = false; M.barU = { uCore: { value: new THREE.Color() }, uEdge: { value: new THREE.Color() }, uI: { value: 0 } };
      M.barM.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, M.barU); sh.vertexShader = 'attribute float aE; varying float vE;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvE = aE;');
        sh.fragmentShader = 'uniform vec3 uCore; uniform vec3 uEdge; uniform float uI; varying float vE;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = mix(uCore, uEdge, smoothstep(0.0, 1.0, vE)) * uI;'); };
      const bar = new THREE.Mesh(bg, M.barM); bar.scale.setScalar(U); bar.name = 'forgeBar'; g.add(bar); M.bar = bar; }
    // sparks: one Points cloud (additive), bursts on each hit sized by the bar's glow, settling as embers
    { const n = mob ? 320 : 480; M.spN = n; M.sp = []; const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); pg.setDrawRange(0, 0);
      const pm = new THREE.PointsMaterial({ size: 1.5 * U, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }); const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; pts.name = 'forgeSparks'; g.add(pts); M.pts = pts; }
    M.t0 = performance.now() / 1000; M.lastT = null; M.barRest = null; anim(0, 0); }
  const V3 = () => new THREE.Vector3(), DOWN = () => new THREE.Vector3(0, -1, 0), ZAX = () => new THREE.Vector3(0, 0, 1);
  function ik2(S, T, L1, L2, pole) { const d = T.clone().sub(S); let dist = d.length(); const dn = d.clone().normalize(); dist = clamp(dist, Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01);
    const a = (L1 * L1 + dist * dist - L2 * L2) / (2 * dist), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)), p = pole.clone().sub(dn.clone().multiplyScalar(pole.dot(dn))); if (p.lengthSq() < 1e-6) p.set(0, 0, 1); p.normalize();
    return [S.clone().add(dn.clone().multiplyScalar(a)).add(p.multiplyScalar(h)), S.clone().add(dn.clone().multiplyScalar(dist))]; }
  function aimLimb(up, fore, S, E, H) { up.quaternion.setFromUnitVectors(DOWN(), E.clone().sub(S).normalize()); const dl = H.clone().sub(E).applyQuaternion(up.quaternion.clone().invert()).normalize(); fore.quaternion.setFromUnitVectors(DOWN(), dl); }
  function setPose(t) { const B = M.B, P = pose(t), ape = M.ape, [wx, wz] = wld(P.X, 0); ape.position.set(wx, HB, wz); ape.rotation.set(0, P.yaw * DEG, 0); ape.updateMatrix(); ape.updateMatrixWorld(true);
    const hips = B[0], chest = B[1], head = B[2]; hips.position.set(0, P.hipY, 0); hips.quaternion.identity(); chest.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), P.lean * DEG); head.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -P.lean * 0.55 * DEG + 0.12);
    hips.updateMatrix(); chest.updateMatrix(); const chM = hips.matrix.clone().multiply(chest.matrix), chI = chM.clone().invert(), toC = (v) => v.clone().applyMatrix4(chI), dirC = (v) => v.clone().transformDirection(chI);
    // legs: feet planted (stride while walking: left foot first half, right second), knees forward
    const wk = P.walk || 0, stepOf = (side) => { const u = side > 0 ? sm(0, 0.55, wk) : sm(0.45, 1, wk); return u; };
    for (const [s, b0] of [[1, 3], [-1, 5]]) { const u = P.walk != null ? stepOf(s) : 0, lift = Math.sin(Math.PI * u) * 5, fz = 3 + (P.walk != null ? (u - wk) * (L.S - L.D) * (P.back ? -1 : 1) * 0.0 : 0);
      const T = new THREE.Vector3(s * (BP.hipW + 1), BP.ankle + lift, fz), Sh = new THREE.Vector3(s * BP.hipW, P.hipY, 0); const T2 = T.clone().sub(new THREE.Vector3(0, P.hipY, 0)), S2 = new THREE.Vector3(s * BP.hipW, 0, 0);
      const [E, H] = ik2(S2, T2, BP.thigh, BP.shin, new THREE.Vector3(0, 0, 1)); aimLimb(B[b0], B[b0 + 1], S2, E, H); void Sh; }
    // tongs: hand-mid in ape space -> chest space; jaws 30 along the pitch; both lower hands on the reins
    const tg = P.tg, hm = new THREE.Vector3(0, tg.y, tg.z), td = new THREE.Vector3(0, -Math.sin(tg.p * DEG), Math.cos(tg.p * DEG)); const hmC = toC(hm), tdC = dirC(td);
    B[15].position.copy(hmC); B[15].quaternion.setFromUnitVectors(ZAX(), tdC);
    for (const [s, b0] of [[1, 11], [-1, 13]]) { const S = new THREE.Vector3(s * BP.shB[0], BP.shB[1], BP.shB[2]), T = hmC.clone().add(tdC.clone().multiplyScalar(s > 0 ? 1.5 : 4.5)).add(new THREE.Vector3(s * 1.2, 0, 0)); const [E, H] = ik2(S, T, BP.armB[0], BP.armB[1], new THREE.Vector3(s, -0.4, -0.6)); aimLimb(B[b0], B[b0 + 1], S, E, H); }
    // hammers: sigma between the raised pose and the head on the bar; at rest they hang beside him, heads down
    const barC = M.barRest ? M.barRest.local : new THREE.Vector3(0, 30, 50);
    { const S = new THREE.Vector3(BP.shA[0], BP.shA[1], BP.shA[2]), T = hmC.clone().add(tdC.clone().multiplyScalar(9)).add(new THREE.Vector3(2.4, 1.6, 0)); const [E, H] = ik2(S, T, BP.armA[0], BP.armA[1], new THREE.Vector3(1, 0.3, -0.6)); aimLimb(B[7], B[8], S, E, H); B[16].position.set(0, 0, 0); } // the upper left hand braced on the reins
    for (const [side, s, b0, hb] of [[1, -1, 9, 17]]) { const sg = P.ham[side]; let hand, hdir;
      if (sg == null) { hand = new THREE.Vector3(s * 13, P.hipY - 2, 6); hdir = new THREE.Vector3(s * 0.15, -0.55, 0.82).normalize(); }
      else { const strikeHead = new THREE.Vector3(s * 3.5, barC.y + L.bar[1] / 2 + L.head[1] / 2, barC.z + (s > 0 ? 6 : -3)), dS = new THREE.Vector3(0, -0.55, 0.84).normalize(), handS = strikeHead.clone().sub(dS.clone().multiplyScalar(L.handle));
        const handR = new THREE.Vector3(s * 9, 74, 12), dR = new THREE.Vector3(s * 0.1, 0.78, -0.62).normalize(); hand = handS.clone().lerp(handR, sg); hdir = dS.clone().lerp(dR, sg).normalize(); }
      const hC = toC(hand), dC = dirC(hdir), S = new THREE.Vector3(s * BP.shA[0], BP.shA[1], BP.shA[2]); B[hb].position.copy(hC); B[hb].quaternion.setFromUnitVectors(ZAX(), dC);
      const [E, H] = ik2(S, hC, BP.armA[0], BP.armA[1], new THREE.Vector3(s, 0.2, -0.8)); aimLimb(B[b0], B[b0 + 1], S, E, H); }
    ape.updateMatrixWorld(true); return P; }
  function jawWorld() { const b = M.B[15]; return { p: new THREE.Vector3(0, 0, L.tongs - 1.2).applyMatrix4(b.matrixWorld), q: b.getWorldQuaternion(new THREE.Quaternion()) }; }
  function headWorld() { return new THREE.Vector3(0, -L.head[1] / 2, L.handle).applyMatrix4(M.B[17].matrixWorld); } // (the one hammer, upper right hand)
  function restBar() { if (M.barRest) return M.barRest; setPose(12.0); const j = jawWorld(), flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2); // laid flat along the loop line (world -x), resting on the striking surface
    const top = HB + (L.plat[3] + L.bar[1] / 2) * U, p = new THREE.Vector3(j.p.x, top, LIP[1]); const local = new THREE.Vector3(0, L.plat[3] + L.bar[1] / 2, (LIP[0] - j.p.x) / U - L.S); M.barRest = { p, q: flat, local }; return M.barRest; }
  const lin = (c) => c.map((v) => Math.pow(v, 2.2)), CORE = lin([1, 0xde / 255, 0x48 / 255]);
  function anim(t, night) { if (!M.built) return; void t; void night; const now = M.tOv != null ? M.tOv : performance.now() / 1000, T = M.tOv != null ? ((M.tOv % LOOP) + LOOP) % LOOP : ((now - M.t0) % LOOP + LOOP) % LOOP; // (tOv: a test / shot pins the loop time)
    M.T = T; M.phase = phase(T); M.lava.rotation.y = (now * 0.01) % (2 * Math.PI);
    restBar(); const P = setPose(T), bc = barAt(T), gl = clamp(bc.em / 0.9, 0, 1), ce = lin(bc.c), heat = sm(0.4, 1.9, bc.em); // edges = the keyframe colour (#ff6a1a -> #b23a12 -> #4a2416 over the strikes), core -> #ffde48 while hot
    M.barM.color.setRGB(...lin(bc.c).map((v) => v * (1 - 0.85 * gl))); M.barU.uEdge.value.setRGB(...ce); M.barU.uCore.value.setRGB(...ce.map((v, k) => lerp(v, CORE[k], heat))); M.barU.uI.value = gl * (0.85 + 0.1 * bc.em);
    const j = jawWorld(), R = M.barRest; if ((P.lay || 0) >= 0.999) { M.bar.position.copy(R.p); M.bar.quaternion.copy(R.q); }
    else { const lay = P.lay || 0; M.bar.position.copy(j.p).lerp(R.p, lay); M.bar.quaternion.copy(j.q).slerp(R.q, lay); }
    // the rim light: from the lava, in view space
    if (M.rimU && typeof M3 !== 'undefined' && M3.camera) { const c = M3.camera; c.updateMatrixWorld(); const d = M.lava.position.clone().sub(M.ape.position).setY(30 * U).normalize(); M.rimU.uRimDir.value.copy(d.transformDirection(c.matrixWorldInverse)); }
    stepSmoke(now);
    // sparks: a burst of 30-60 at each hit (more while the bar is hot), arcing down into the valley; embers on the ground
    const H = hitTimes(), last = M.lastT; if (last != null) for (let i = 0; i < H.length; i++) { const th = H[i]; if ((last < th && T >= th) || (last > T && th <= T)) burst(i, barAt(th).em); } M.lastT = T; stepSparks(now); }
  function rimLight(mat) { M.rimU = { uRimDir: { value: new THREE.Vector3(1, 0, 0) }, uRimC: { value: new THREE.Color(0xff7a2a).convertSRGBToLinear().multiplyScalar(0.55) } }; // a low orange rim from the lava side, faked in the shader (no extra light: mobile)
    mat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, M.rimU); sh.fragmentShader = 'uniform vec3 uRimDir; uniform vec3 uRimC;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float rf = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2) * clamp(dot(normal, uRimDir) * 0.8 + 0.25, 0.0, 1.0); totalEmissiveRadiance += uRimC * rf * (0.6 + 0.4 * diffuseColor.r * 3.0); }'); }; }
  function stepSmoke(now) { const c = typeof M3 !== 'undefined' && M3.camera; if (!c || !M.smoke) return; const ps = M.smoke.geometry.attributes.position, cl = M.smoke.geometry.attributes.color, rt = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1);
    const n = 8, o = M.lava.position; for (let k = 0; k < n; k++) { const u = ((k / n + now * 0.012) % 1), h = (30 + u * 280) * U, sz = (35 + u * 110) * U, a = 0.16 * sm(0, 0.12, u) * (1 - sm(0.55, 1, u)), cx = o.x + (Math.sin(k * 2.3 + now * 0.05) * 12 - u * 70) * U, cz = o.z + Math.cos(k * 1.7) * 14 * U * u, cyy = HB + h;
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; pts.forEach(([sx, sy], m) => { ps.setXYZ(k * 4 + m, cx + (rt.x * sx + up.x * sy) * sz, cyy + (rt.y * sx + up.y * sy) * sz, cz + (rt.z * sx + up.z * sy) * sz); cl.setXYZW(k * 4 + m, 1, 1, 1, a); }); }
    ps.needsUpdate = true; cl.needsUpdate = true; }
  const SPA = lin([1, 0xd2 / 255, 0x4a / 255]), SPB = lin([1, 0x6a / 255, 0x1a / 255]);
  function burst(i, em) { const n = Math.round(30 + 30 * clamp(em / 1.9, 0, 1)), p0 = headWorld(); M.hits = (M.hits || 0) + 1; M.lastBurst = n;
    for (let k = 0; k < n; k++) { const a = (Math.random() - 0.5) * 2.2, el = 0.15 + Math.random() * 0.6, sp = (12 + Math.random() * 18) * U, mix = Math.random(); // fan out off the bar, away from him (world -x) and over the edge into the valley
      const dir = new THREE.Vector3(-Math.cos(a), 0, Math.sin(a) * 1.2); M.sp.push({ p: p0.clone(), v: dir.multiplyScalar(sp * Math.cos(el)).add(new THREE.Vector3(0, sp * Math.sin(el), 0)), age: 0, life: 4 + Math.random() * 3, ground: false, c: SPA.map((v, q) => lerp(v, SPB[q], mix)) });
      if (M.sp.length > M.spN) M.sp.shift(); } }
  function stepSparks(now) { const dt = clamp(M.spPrev ? now - M.spPrev : 0.016, 0, 0.1); M.spPrev = now; const g = 9.8 * U, pos = M.pts.geometry.attributes.position, col = M.pts.geometry.attributes.color; let n = 0;
    for (let i = M.sp.length - 1; i >= 0; i--) { const s = M.sp[i]; s.age += dt; if (s.age > s.life) { M.sp.splice(i, 1); continue; } if (!s.ground) { s.v.y -= g * dt; s.p.addScaledVector(s.v, dt); const gz = (s.p.y < HB + 40 * U && typeof M3 !== 'undefined' && M3.heightAt ? M3.heightAt(s.p.x, s.p.z)[0] : HB) + 0.4 * U; if (s.p.y < gz) { s.p.y = gz; s.ground = true; s.tg = s.age; } } }
    for (const s of M.sp) { if (n >= M.spN) break; pos.setXYZ(n, s.p.x, s.p.y, s.p.z); const f = s.ground ? Math.max(0, 1 - (s.age - s.tg) / 2.5) * 0.5 : 1 - 0.4 * sm(0, s.life, s.age); col.setXYZ(n, s.c[0] * f, s.c[1] * f * (s.ground ? 0.5 : 1), s.c[2] * f); n++; }
    M.pts.geometry.setDrawRange(0, n); pos.needsUpdate = true; col.needsUpdate = true; }
  const shaderU = () => new THREE.Vector4(LIP[0], LIP[1], U, 1);
  return { WS, F, U, LIP, HB, LOOP, HITS, L, M, wld, loc, carve, keepOut, scorched, clear, afterGen, orePrune, anchors, build, anim, barAt, hitTimes, phase, pose, platZ, platD, cone, Hr, Rb, shaderU, pathKeepW: (x, y) => { const [X, Y] = loc(x, y); return inBox(X, Y) && pathKeep(X, Y); }, BP, SWB, swbNear, setPose, restBar, jawWorld, headWorld, on };
})();
