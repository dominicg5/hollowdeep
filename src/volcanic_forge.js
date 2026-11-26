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
  const L = { crater: [-100, 0], rimR: 100, lava: 28, lip: 40, summit: 260, D: 18, S: 48, plat: [60, 150, 35, 26], skirt: 16.5, strike: [77, 133, 18], scorch: [60, 0, 280, 175], ash: 70,
    ledge: [112, 197, 50], ledgeR: 14, bar: [30, 4, 4], tongs: 30, handle: 25, head: [5, 9, 5], grip: 10 };
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const wld = (X, Y) => [LIP[0] - X * U, LIP[1] + Y * U], loc = (x, y) => [(LIP[0] - x) / U, (y - LIP[1]) / U];
  const M = { built: false, moved: [], kept: [], paths: [], trees: 0 };
  const on = () => typeof W !== 'undefined' && W.ready === true;

  /* ---------- the land (design metres) ---------- */
  const DEG = Math.PI / 180;
  const Hr = (th) => L.lip + 70 * sm(12 * DEG, 58 * DEG, th) + 150 * Math.pow((1 - Math.cos(th)) / 2, 1.4); // rim height: the notched lip (40) facing the platform, the summit (260) opposite
  const Rr = (th) => L.rimR + 95 * Math.pow((1 - Math.cos(th)) / 2, 1.2); // crater rim radius: 100 at the work-side lip, 220 under the summit (a bowl, not a shaft)
  const Rb = (th) => Rr(th) + lerp(8, 1.8 * Hr(th), sm(10 * DEG, 70 * DEG, th)); // cone foot: a 40 m wall under the notch, a long concave run elsewhere
  function cone(X, Y) { const dx = X - L.crater[0], r = Math.hypot(dx, Y), ths = Math.atan2(Y, dx), th = Math.abs(ths), rb = Rb(th); if (r >= rb) return null; const hr = Hr(th);
    const rr = Rr(th); const lipB = 5 * sm(10 * DEG, 35 * DEG, th) * Math.pow(Math.cos(Math.PI / 2 * clamp((r - rr) / 12, -1, 1)), 2); /* (pass 4) a thick rounded rim lip, none at the notch */
    if (r < rr) { const zi = 20 + (hr - 20) * Math.pow(clamp((r - 70) / (rr - 70), 0, 1), 1.6), lg = sm(36, 60, zi) * (1 - sm(hr - 14, hr - 4, zi)), st = zi - lg * 3.2 * Math.sin(2 * Math.PI * zi / 22) / (2 * Math.PI) * 2.2; return { z: st + lipB, inner: true, r, th, u: 1 }; } // the bowl; ledges every 22 m on its upper walls // the bowl: floor 20 (lava 28 fills it to r ~86), walls curving up to the rim
    // concave profile: ~40 deg under the rim flaring to ~15 deg at the foot; 16 radial ridges (gullies between) fading out in the lower third, none at the notch; the rim itself stays smooth
    const t = (r - rr) / (rb - rr), s = 1 - t, rid = Math.pow(Math.abs(Math.cos(8 * ths)), 0.5), fade = sm(0.2, 0.6, s) * sm(0, 0.1, t) * sm(18 * DEG, 38 * DEG, th);
    return { z: Math.max(0, hr * (0.3 * s * s + 0.7 * s) + 13 * (rid - 0.6) * fade + lipB), inner: false, r, th, u: s, rid }; } // (pass 4: a straighter flank so it reads as a cone; 16 ridges cut deeper)
  // the platform: a natural rock outcrop. Lumpy oval top (centre 103, 28.5 x 21) slightly domed, worn flat only at the strike zone; broken stepped sides at ~1.6 (climbable); slumped boulders at its foot
  const PC = [104, 0], PA = 28.5, PB = 21;
  function platE(X, Y) { const dx = X - PC[0], dy = Y - PC[1], ph = Math.atan2(dy / PB, dx / PA), wk = 1 - 0.75 * sm(0.55, 0.95, -Math.cos(ph)), lump = 1 + wk * (0.07 * Math.sin(3 * ph + 0.7) + 0.045 * Math.sin(5 * ph + 2.1)) + 0.02 * Math.sin(9 * ph + 1.3);
    const e = Math.hypot(dx / PA, dy / PB) / lump, rad = Math.hypot(PA * Math.cos(ph), PB * Math.sin(ph)) * lump; return [e, (e - 1) * rad]; }
  function platSD(X, Y) { return platE(X, Y)[1]; }
  function platD(X, Y) { return Math.max(0, platSD(X, Y)); } // distance from the top's edge (0 on the top)
  const BOULD = [[15, 4.2, 7], [55, 3.4, 6], [100, 4.6, 8], [-35, 3.8, 6.5], [-60, 2.8, 5]].map(([a, h, r]) => { const ph = a * DEG; let k = 1; for (let i = 0; i < 30; i++) { const X = PC[0] + Math.cos(ph) * PA * k, Y = Math.sin(ph) * PB * k; if (platSD(X, Y) > L.skirt - 3) break; k += 0.06; } return [PC[0] + Math.cos(ph) * PA * k, Math.sin(ph) * PB * k, h, r]; });
  function platZ(X, Y) { const [e, d0] = platE(X, Y), n1 = Math.sin(X * 0.11 + Y * 0.07 + 1.3) * Math.sin(Y * 0.09 - X * 0.05), n2 = Math.sin(X * 0.23 - Y * 0.19 + 0.4), d = d0 + 0.5 * n1;
    let bz = -1; for (const [bx, by, h, r] of BOULD) { const q = Math.hypot(X - bx, Y - by); if (q < r) bz = Math.max(bz, h * (0.5 + 0.5 * Math.cos(Math.PI * q / r)) * (0.85 + 0.15 * n2)); }
    if (d > L.skirt + 1) return bz;
    const flat = 1 - sm(0.8, 1.2, Math.hypot((X - 102) / 25, Y / 11)), top = L.plat[3] + (1.4 * Math.max(0, 1 - e * e) + 0.25 * n1 * n2) * (1 - flat);
    if (d <= 0) return Math.max(bz, top - 1.2 * sm(-2.5, 0, d)); // a worn, rounded rim
    const v = 1.6 * Math.max(0, d + 0.35 * n2 * sm(0, 2, d)), P = 6, st = v - P / (2 * Math.PI) * 0.45 * Math.sin(2 * Math.PI * v / P); // broken steps (slope 0.9..2.3)
    return Math.max(bz, 0, top - 1.2 - st); }
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
  const inBox = (X, Y) => X > -840 && X < 430 && Y > -470 && Y < 470;
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
  // (Dominic t565u) the map views (pull-out map + minimap): his lava lake orange / red, the crater and cone dark basalt, the scorched oval charred black with ember
  // cracks, fading through the ash band back to the ground colour - drawn in code over the existing map colours (c), no texture. null = not the volcano's ground
  function mapTint(x, y, c) { const [X, Y] = loc(x, y); if (Math.abs(X + 100) > 900 || Math.abs(Y) > 900) return null; /* (not clipped to the works' box: his cone's foot runs past it) */ const dx = X - L.crater[0], r = Math.hypot(dx, Y), th = Math.abs(Math.atan2(Y, dx)), lum = clamp((c[0] + c[1] + c[2]) / 420, 0.65, 1.3);
    if (r < 84) { const n = 0.5 + 0.5 * Math.sin(X * 0.11 + 3 * Math.cos(Y * 0.09)) * Math.sin(Y * 0.13 - X * 0.05), t = clamp(r / 84 + 0.25 * (n - 0.5), 0, 1); return t < 0.45 ? [255, lerp(196, 120, t / 0.45), lerp(70, 34, t / 0.45)] : [lerp(250, 196, (t - 0.45) / 0.55), lerp(110, 40, (t - 0.45) / 0.55), lerp(30, 22, (t - 0.45) / 0.55)]; } /* the lava: a hot yellow-orange core, orange, red at its edge */
    if (r < Rr(th)) return [92 * lum, 38 * lum, 26 * lum]; /* the crater wall, lit red from below */
    if (r < Rb(th)) return [54 * lum, 46 * lum, 44 * lum]; /* the cone: dark basalt (keeps the map's hill shading) */
    const dE = (Math.hypot((X - L.scorch[0]) / L.scorch[2], Y / L.scorch[3]) - 1) * L.scorch[3]; if (dE >= L.ash) return null;
    if (dE < 0 && Math.abs(Math.sin(X * 0.045 + 2.2 * Math.sin(Y * 0.031)) * Math.cos(Y * 0.038 - X * 0.012)) < 0.035) return [200, 74, 28]; /* ember cracks */
    const k = [34 * lum, 30 * lum, 29 * lum], ash = [104 * lum, 98 * lum, 92 * lum], w = sm(0, L.ash * 0.55, dE), w2 = sm(L.ash * 0.45, L.ash, dE); return k.map((v, i) => { const a = v + (ash[i] - v) * w; return a + (c[i] - a) * w2; }); } /* charred earth -> ash -> ground */
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
    const keptH = []; for (const h of W.homes) { if (h.isPlayer) continue; const r = h.size * 0.62, why = keepOut(h.x, h.y, r + 10); if (!why) { if (scorched(h.x, h.y)) M.kept.push(h.id), keptH.push(h); continue; }
      let spot = null; for (let ring = 1; ring < 90 && !spot; ring++) { const R = ring * 36, n = Math.ceil(2 * Math.PI * R / 36); for (let k = 0; k < n; k++) { const a = (k / n) * 2 * Math.PI + ring * 0.37, x = h.x + Math.cos(a) * R, y = h.y + Math.sin(a) * R; if (ok(x, y, h)) { spot = [x, y]; break; } } }
      if (spot) { const from = [Math.round(h.x), Math.round(h.y)]; if (typeof moveHome === 'function') moveHome(h, spot[0], spot[1]); else { h.x = spot[0]; h.y = spot[1]; } M.moved.push([h.id, why, from, spot.map(Math.round)]); } else M.moved.push([h.id, why, [Math.round(h.x), Math.round(h.y)], null]); } 
    // (Art pass 4) the 8 homes on the scorch nearest the platform move out to the ash ring or the green past it (never the player's); the rest stay, each with a crack-free ring
    const [px, py] = wld(PC[0], PC[1]); keptH.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
    for (const h of keptH.slice(0, 8)) { if (h.isPlayer) continue; let spot = null; for (let ring = 1; ring < 90 && !spot; ring++) { const R = ring * 36, n = Math.ceil(2 * Math.PI * R / 36); for (let k = 0; k < n; k++) { const a = (k / n) * 2 * Math.PI + ring * 0.37, x = h.x + Math.cos(a) * R, y = h.y + Math.sin(a) * R; if (!scorched(x, y, h.size * 0.62 + 8 * U) && ok(x, y, h)) { spot = [x, y]; break; } } }
      if (spot) { const from = [Math.round(h.x), Math.round(h.y)]; if (typeof moveHome === 'function') moveHome(h, spot[0], spot[1]); else { h.x = spot[0]; h.y = spot[1]; } M.moved.push([h.id, 'scorch', from, spot.map(Math.round)]); M.kept.splice(M.kept.indexOf(h.id), 1); } }
    M.keptH = keptH.filter((h) => M.kept.includes(h.id)); fillHomeU(); }
  function fillHomeU() { if (!M.homeU) return; M.homeU.forEach((v, i) => { const h = (M.keptH || [])[i]; if (h) { const [X, Y] = loc(h.x, h.y); v.set(X, Y, h.size * 0.62 / U + 12.5, 1); } else v.set(0, 0, 0, 0); }); }
  const homeU = () => { if (!M.homeU) { M.homeU = Array.from({ length: 8 }, () => new THREE.Vector4()); fillHomeU(); } return M.homeU; }; // (design x, y, crack-free radius: the home + 10-15 m)
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
  // where he is (design metres along the loop line), which way he faces (deg, 90 = the volcano), the walks (0..1), the bar laid (0..1), the current hit, the bar's quarter turns
  function pose(t) { t = ((t % LOOP) + LOOP) % LOOP; const P = {};
    if (t < 4) { P.X = L.D; P.yaw = 90; P.lay = 0; }
    else if (t < 6) { P.X = L.D; P.yaw = 90; P.lay = 0; }
    else if (t < 10) { const u = sm(6.2, 9.8, t); P.X = lerp(L.D, L.S, u); P.yaw = lerp(90, -90, sm(6, 9.6, t)); P.walk = u; P.lay = 0; }
    else if (t < 12) { P.X = L.S; P.yaw = -90; P.lay = sm(10.2, 11.9, t); }
    else if (t < 23) { P.X = L.S; P.yaw = -90; P.lay = 1; }
    else { const u = sm(24, 26.6, t); P.X = lerp(L.S, L.D, u); P.yaw = lerp(-90, 90, sm(23.8, 26.4, t)); P.lay = 1 - sm(23, 23.9, t); P.walk = u; P.back = true; }
    // strikes: per hit th, its swing (wind-up 0.85 s before, recovery 0.75 after); the bar turns a quarter after hits 3 and 6
    const H = hitTimes(); P.hit = null; for (let i = 0; i < H.length; i++) { const th = H[i]; if (t >= th - 0.85 && t < th + 0.75) { P.hit = { i, th }; break; } }
    P.roll = (sm(H[2] + 0.15, H[2] + 0.6, t) + sm(H[5] + 0.15, H[5] + 0.6, t)) * Math.PI / 2 * (t < 23 ? 1 : 0); return P; }

  function lavaTex() { const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'), im = g.createImageData(N, N); // lava #fb6b1c with a hot #ffd24a core and hot veins, a little dark crust
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = i / N * 2 * Math.PI, b = j / N * 2 * Math.PI, rc = Math.hypot(i / N - 0.5, j / N - 0.5) * 2;
      const v = 0.5 + 0.22 * Math.sin(a * 3 + Math.sin(b * 2) * 2) * Math.cos(b * 3 + Math.sin(a * 2)) + 0.18 * Math.sin(a * 7 + b * 5) * Math.sin(b * 6 - a * 2) + 0.1 * Math.sin(a * 13 - b * 11), c = clamp(v, 0, 1), o = (j * N + i) * 4;
      const hot = clamp(Math.max(sm(0.62, 0.85, c), 1 - sm(0.05, 0.55, rc)), 0, 1), crust = sm(0.26, 0.12, c) * sm(0.3, 0.7, rc) * 0.7;
      im.data[o] = lerp(lerp(251, 255, hot), 74, crust); im.data[o + 1] = lerp(lerp(107, 210, hot), 30, crust); im.data[o + 2] = lerp(lerp(28, 74, hot), 14, crust); im.data[o + 3] = 255; } g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t; }
  function smokeTex() { const cv = document.createElement('canvas'); cv.width = cv.height = 64; /* (pass 5: a billowed puff: lumpy edge, shaded underside) */ const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.55, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); /* billows: lumps round the core */ for (let k = 0; k < 11; k++) { const a = k * 2.4, bx = 32 + Math.cos(a) * (12 + 3 * Math.sin(k)), by = 30 + Math.sin(a) * 10, br = 8 + 4 * Math.abs(Math.sin(k * 1.7)), b2 = g.createRadialGradient(bx, by, 0, bx, by, br); b2.addColorStop(0, 'rgba(255,255,255,.75)'); b2.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = b2; g.fillRect(0, 0, 64, 64); } g.globalCompositeOperation = 'source-atop'; const sh = g.createLinearGradient(0, 18, 0, 60); sh.addColorStop(0, 'rgba(90,85,80,0)'); sh.addColorStop(1, 'rgba(90,85,80,.55)'); g.fillStyle = sh; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); }
  function dotTex() { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const g = cv.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,220,150,.8)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cv); }
  function build(C) { if (M.built || typeof THREE === 'undefined' || !C || !C.scene) return; M.built = true; const mob = typeof QUALITY !== 'undefined' && QUALITY.name === 'mobile'; M.mob = mob;
    const g = new THREE.Group(); g.name = 'volcanicForge'; C.scene.add(g); M.grp = g;
    // lava lake: one unlit disc at z 28 (12 m under the lip), slowly turning (its hot core stays centred), not tone-mapped
    { const [cx, cz] = wld(L.crater[0], L.crater[1]); const lg = new THREE.CircleGeometry(84 * U, mob ? 28 : 48); lg.rotateX(-Math.PI / 2); M.lavaT = lavaTex(); const lm = new THREE.MeshBasicMaterial({ map: M.lavaT, color: 0xffffff }); lm.toneMapped = false;
      const lava = new THREE.Mesh(lg, lm); lava.position.set(cx, HB + L.lava * U, cz); lava.name = 'forgeLava'; g.add(lava); M.lava = lava; }
    // a light, low-alpha smoke plume (#6e6258): 8 camera-facing quads in one draw
    { M.burn = burnTrees(mob); const n = 40 + 2 * M.burn.length; M.smN = n; M.smP = 40; const pg = new THREE.BufferGeometry(), I = []; for (let k = 0; k < n; k++) { const b = k * 4; I.push(b, b + 1, b + 2, b, b + 2, b + 3); } const uv = []; for (let k = 0; k < n; k++) uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 12), 3)); pg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); pg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 16), 4)); pg.setIndex(I);
      const sm2 = new THREE.MeshBasicMaterial({ color: 0xffffff, map: smokeTex(), transparent: true, depthWrite: false, vertexColors: true, fog: false }); const pl = new THREE.Mesh(pg, sm2); pl.frustumCulled = false; pl.name = 'forgeSmoke'; pl.renderOrder = 2; g.add(pl); M.smoke = pl; }
    // Theus: Art's model in a group the loop places (glbReady / place, below); his hammer + tongs props
    { const ape = new THREE.Group(); ape.name = 'forgeApe'; g.add(ape); M.ape = ape; tools(); }
    // the bar (30 x 4 x 4): an emissive gradient, core -> edges (aE: 0 at the face centres, 1 at the box edges and ends), colours from the diagram's keyframes
    { const bg = new THREE.BoxGeometry(L.bar[2], L.bar[1], L.bar[0], 4, 4, 12); const p = bg.attributes.position, e = []; for (let k = 0; k < p.count; k++) { const ax = Math.abs(p.getX(k)) / (L.bar[2] / 2), ay = Math.abs(p.getY(k)) / (L.bar[1] / 2), az = Math.abs(p.getZ(k)) / (L.bar[0] / 2); e.push(Math.max(clamp(ax + ay - 1, 0, 1), sm(0.7, 1, az))); }
      bg.setAttribute('aE', new THREE.Float32BufferAttribute(e, 1)); bg.translate(0, 0, L.bar[0] / 2 - L.grip); M.barM = new THREE.MeshLambertMaterial({ color: 0x5a3a2c }); M.barM.toneMapped = false; M.barU = { uCore: { value: new THREE.Color() }, uEdge: { value: new THREE.Color() }, uI: { value: 0 } };
      M.barM.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, M.barU); sh.vertexShader = 'attribute float aE; varying float vE;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvE = aE;');
        sh.fragmentShader = 'uniform vec3 uCore; uniform vec3 uEdge; uniform float uI; varying float vE;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = mix(uCore, uEdge, smoothstep(0.0, 1.0, vE)) * uI;'); };
      const bar = new THREE.Mesh(bg, M.barM); bar.scale.setScalar(U); bar.name = 'forgeBar'; bar.visible = false; g.add(bar); M.bar = bar; } /* (shown with him, once his GLB is in: glbReady) */
    // sparks: one Points cloud (additive), bursts on each hit sized by the bar's glow, settling as embers
    { const n = mob ? 420 : 700; M.spN = n; M.sp = []; const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); pg.setDrawRange(0, 0);
      const pm = new THREE.PointsMaterial({ size: 1.5 * U, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }); const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; pts.name = 'forgeSparks'; g.add(pts); M.pts = pts; }
    buildStumps(g, mob); buildFire(g, mob);
    M.t0 = performance.now() / 1000; M.lastT = null; M.barRest = null; anim(0, 0); }
  /* ---------- Theus (t736u): Art's i23d model IS his body (NPC_MODELS.theus, THEUS_RIG in src/creatures/data.js); the baked ape, its fur, IK and bones are gone ----------
     M.ape is the group the loop places (on the loop line at pose(t).X, facing pose(t).yaw, feet on the forge ground HB); Art's model stands in it (x WS: its metres
     -> map units). Clips by loop phase (THEUS_RIG.phaseClip; Walk / Strike run on the loop clock, so a pinned loop time poses him exactly); Strike starts
     strikeHitS before each hit so its blow lands on the hit (the whoosh, the thunder strike and the sparks stay on the hit times). The hammer and tongs (not in
     Art's mesh) are the old props held at the ends of his right upper / lower arms. Until the GLB has loaded there is no Theus (and no bar / sparks) */
  function tools() { const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), lam = (c) => new THREE.MeshLambertMaterial({ color: new THREE.Color(c).convertSRGBToLinear() }), part = (g, m, at, rot) => { const o = new THREE.Mesh(g, m); o.position.fromArray(at); if (rot) o.rotation.set(rot[0], rot[1], rot[2]); o.castShadow = !M.mob; return o; };
    const IRON = lam(0x2e2b28), WOOD = lam(0x4f3420), WRAP = lam(0x4a2c16), HEADC = lam(0x3a3632), BRASS = lam(0xb8862b), BRD = lam(0x6b4a1c);
    const tg = new THREE.Group(); tg.name = 'theusTongs'; tg.add(part(box(0.9, 0.9, L.tongs), IRON, [1.0, 0, L.tongs / 2]), part(box(0.9, 0.9, L.tongs), IRON, [-1.0, 0, L.tongs / 2]), part(box(3.2, 1.6, 1.6), IRON, [0, 0, L.tongs * 0.62]),
      part(box(4.6, 1.0, L.grip + 1), IRON, [0, 2.5, L.tongs - 1.2 - L.grip / 2]), part(box(4.6, 1.0, L.grip + 1), IRON, [0, -2.5, L.tongs - 1.2 - L.grip / 2])); /* (the jaws: a third of the bar in them) */
    const hm = new THREE.Group(); hm.name = 'theusHammer'; hm.add(part(new THREE.CylinderGeometry(0.75, 0.9, L.handle, 8), WOOD, [0, 0, L.handle / 2], [Math.PI / 2, 0, 0]), part(new THREE.CylinderGeometry(1.05, 1.05, 7, 8), WRAP, [0, 0, 3.5], [Math.PI / 2, 0, 0]),
      part(box(L.head[0], L.head[1], L.head[2]), HEADC, [0, 0, L.handle]), part(box(L.head[0] + 0.5, 1.2, L.head[2] + 0.5), BRASS, [0, L.head[1] * 0.38, L.handle]), part(box(L.head[0] + 0.5, 1.2, L.head[2] + 0.5), BRD, [0, -L.head[1] * 0.38, L.handle]));
    for (const o of [tg, hm]) { o.scale.setScalar(U); o.visible = false; M.grp.add(o); } M.tongs = tg; M.hammer = hm; }
  // his hand on an arm bone: the arm's vertices within handBandM of its lowest point (bind pose), in the bone's frame
  function hand(I, sk, nm) { const R = THEUS_RIG, bones = sk.skeleton.bones, b = bones.findIndex((q) => q.name === nm), P = sk.geometry.attributes.position, J = sk.geometry.attributes.skinIndex, Wt = sk.geometry.attributes.skinWeight, v = new THREE.Vector3(), bt = (sk.applyBoneTransform || sk.boneTransform).bind(sk), pts = [];
    for (let i = 0; i < P.count; i++) { let d = 0, w = -1; for (let q = 0; q < 4; q++) { const x = Wt.array[i * 4 + q]; if (x > w) { w = x; d = J.array[i * 4 + q]; } } if (d !== b) continue; v.fromBufferAttribute(P, i); bt(i, v); pts.push(v.clone().applyMatrix4(sk.matrixWorld)); }
    const lo = Math.min(...pts.map((p) => p.y)), band = R.handBandM * WS, c = new THREE.Vector3(); let n = 0; for (const p of pts) if (p.y < lo + band) { c.add(p); n++; } c.multiplyScalar(1 / Math.max(1, n));
    const bone = bones[b]; return { bone, at: bone.worldToLocal(c.clone()) }; }
  const hStrike = () => (L.plat[3] + L.bar[1] + L.head[1] / 2); // (design m over HB) the hammer head's centre when it meets the laid bar
  function glbReady() { if (M.glb) return M.glb; if (typeof NpcModels === 'undefined' || typeof NPC_MODELS === 'undefined' || typeof THEUS_RIG === 'undefined') return null; const I = NpcModels.make('theus'); if (!I) return null;
    const R = THEUS_RIG, ape = M.ape; I.root.name = 'theusGlb'; I.root.scale.setScalar(WS); ape.add(I.root); let sk = null; I.root.traverse((o) => { if (o.isSkinnedMesh && !o.userData.isInk && !sk) sk = o; });
    // rest: the hands in their bones' frames; then his stance at the bar (12.5 s) with Strike at its blow: the hammer is gripped so its head meets the laid bar
    // there (handle level-ish, out in front of his fist), and the bar's rest is laid under that head
    const P0 = pose(12.5), [wx, wz] = wld(P0.X, 0); ape.position.set(wx, HB, wz); ape.rotation.set(0, P0.yaw * DEG, 0); ape.updateMatrixWorld(true);
    const H = hand(I, sk, R.hammer.bone), Tn = hand(I, sk, R.tongs.bone), q0 = Tn.bone.getWorldQuaternion(new THREE.Quaternion()), qa = ape.getWorldQuaternion(new THREE.Quaternion());
    Tn.off = q0.clone().invert().multiply(qa); /* (the tongs point straight ahead of him at rest) */
    const a = NpcModels.play(I, 'strike', { restart: true, once: true }); I.mixer.update(0.2); a.time = R.strikeHitS; I.mixer.update(1e-6); ape.updateMatrixWorld(true); /* (past its fade-in, at its blow) */
    // Art's Strike lands well out to his right: at the bar he stands turned (M.yawS, eased in as he arrives and out as he leaves) so the blow falls on the platform's middle line
    { const f0 = H.bone.localToWorld(H.at.clone()), h0 = f0.clone().addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(qa), L.handle * U), dx = h0.x - wx, dz = h0.z - wz; let best = 0, bd = 1e18;
      for (let d = -80; d <= 80; d += 0.25) { const t = d * DEG, e = Math.abs(wz - dx * Math.sin(t) + dz * Math.cos(t) - LIP[1]); if (e < bd - 1e-6 || (Math.abs(e - bd) <= 1e-6 && Math.abs(d) < Math.abs(best))) { bd = e; best = d; } }
      M.yawS = best; ape.rotation.set(0, (P0.yaw + best) * DEG, 0); ape.updateMatrixWorld(true); ape.getWorldQuaternion(qa); }
    const fist = H.bone.localToWorld(H.at.clone()), qh = H.bone.getWorldQuaternion(new THREE.Quaternion()), fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(qa), up = (hStrike() * U + HB - fist.y) / (L.handle * U), el = Math.asin(clamp(up, -0.9, 0.9));
    const want = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -el).premultiply(qa); /* (prop +z = the handle, ahead of him, tilted by el) */ H.off = qh.clone().invert().multiply(want);
    const head = fist.clone().add(fwd.clone().multiplyScalar(Math.cos(el) * L.handle * U)).add(new THREE.Vector3(0, Math.sin(el) * L.handle * U, 0)), flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2); // laid flat along the loop line (world -x), on the striking surface
    const top = HB + (L.plat[3] + L.bar[1] / 2) * U, mid = new THREE.Vector3(-1, 0, 0).multiplyScalar((L.bar[0] / 2 - L.grip) * U), p = new THREE.Vector3(head.x, top, head.z).sub(mid);
    { const lx = loc(p.x, p.z)[0], m0 = L.plat[0] + 23; if (lx < m0) p.x -= (m0 - lx) * U; } /* (slid along its length so all of it lies on the striking surface: his blow still lands on it) */
    M.barRest = { p, q: flat, local: new THREE.Vector3(...loc(p.x, p.z), (p.y - HB) / U), head: head.clone() }; M.gripEl = +(el / DEG).toFixed(1); M.fistGap = +((fist.y - HB) / U - hStrike()).toFixed(2);
    NpcModels.play(I, 'idle', { restart: true }); I.mixer.update(1);
    // likewise at the dip (2 s) his tongs hand is out to his side: he stands turned (M.yawD) so the tongs reach into the lava through the lip's notch
    { const P2 = pose(2), [dx0, dz0] = wld(P2.X, 0); ape.position.set(dx0, HB, dz0); ape.rotation.set(0, P2.yaw * DEG, 0); ape.updateMatrixWorld(true); const q2 = ape.getWorldQuaternion(new THREE.Quaternion()), fh = Tn.bone.localToWorld(Tn.at.clone()), jy = jawY(2) * U + HB - fh.y, pt = Math.asin(clamp(jy / (L.tongs * U), -0.95, 0.95));
      const j0 = fh.addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(q2), Math.cos(pt) * (L.tongs - 1.2) * U), dx = j0.x - dx0, dz = j0.z - dz0; let best = 0, bd = 1e18;
      for (let d = -80; d <= 80; d += 0.25) { const t = d * DEG, e = Math.abs(dz0 - dx * Math.sin(t) + dz * Math.cos(t) - LIP[1]); if (e < bd - 1e-6 || (Math.abs(e - bd) <= 1e-6 && Math.abs(d) < Math.abs(best))) { bd = e; best = d; } } M.yawD = best; }
    M.glb = I; M.sk = sk; M.hand = { hammer: H, tongs: Tn }; M.hammer.visible = M.tongs.visible = true; M.bar.visible = true; return I; }
  // place him for loop time T: the group from the loop, his clip, the props in his hands
  function place(T, now) { const P = pose(T), ape = M.ape, [wx, wz] = wld(P.X, 0); ape.position.set(wx, HB, wz); ape.rotation.set(0, (P.yaw + (M.yawS || 0) * stanceW(T) + (M.yawD || 0) * dipW(T)) * DEG, 0); const I = glbReady(); if (!I) { ape.updateMatrixWorld(true); return P; }
    const R = THEUS_RIG, dt0 = clamp(now - (M.glbT == null ? now : M.glbT), 0, 0.1), dt = dt0 > 0 ? dt0 : M.tOv != null ? 0.2 : 0; M.glbT = now; /* (a pinned loop time still finishes his clip fades) */ const ph = phase(T), talk = typeof Theus !== 'undefined' && Theus.ST && !!Theus.ST.step, sc = I.clips[I.def.clips.strike], dur = (sc && sc.duration) || 1.333;
    let hit = null; if (ph === 'strike') for (const th of hitTimes()) if (T >= th - R.strikeHitS && T < th - R.strikeHitS + dur) hit = th;
    const key = hit != null ? 'strike' : R.phaseClip[ph] === 'walk' ? 'walk' : talk ? 'talk' : R.phaseClip[ph] || 'idle';
    if (key === 'strike') { if (M.glbHit !== hit || I.key !== 'strike') { M.glbHit = hit; NpcModels.play(I, 'strike', { once: true, restart: true }); M.glbStrikes = (M.glbStrikes || 0) + 1; } I.act.time = Math.max(0, T - (hit - R.strikeHitS) - dt); } /* (its blow on the hit, on the loop clock) */
    else { NpcModels.play(I, key); if (key === 'walk' && I.act) { const wc = I.clips[I.def.clips.walk], t0 = ph === 'turn' ? 6 : 23; I.act.time = Math.max(0, ((T - t0) % wc.duration + wc.duration) % wc.duration - dt); } }
    M.clip = key; I.mixer.update(dt); ape.updateMatrixWorld(true);
    for (const [k, o] of [['hammer', M.hammer], ['tongs', M.tongs]]) { const h = M.hand[k]; o.position.copy(h.bone.localToWorld(h.at.clone())); h.bone.getWorldQuaternion(o.quaternion).multiply(h.off); o.updateMatrixWorld(true); }
    // the tongs pitched in his fist so their jaws are where the loop has the bar (THEUS_RIG.jawY: into the lava over the lip, carried high, laid on the platform)
    { const o = M.tongs, y = jawY(T), s2 = clamp((HB + y * U - o.position.y) / (L.tongs * U), -0.95, 0.95), pt = Math.asin(s2); o.quaternion.multiply(_qx.setFromAxisAngle(_ax, -pt)); o.updateMatrixWorld(true); M.tongsPitch = +(pt / DEG).toFixed(1); M.barLevel = pt * dipW(T); /* (the bar itself dips level into the lava, as before) */ }
    return P; }
  function stanceW(T) { T = ((T % LOOP) + LOOP) % LOOP; return T < 9.2 ? 0 : T < 10 ? sm(9.2, 10, T) : T < 23 ? 1 : T < 23.6 ? 1 - sm(23, 23.6, T) : 0; } // (his turn to the bar: eased in on his last stride, out as he lifts it off)
  function dipW(T) { T = ((T % LOOP) + LOOP) % LOOP; return T < 4 ? 1 : T < 5 ? 1 - sm(4, 5, T) : T < 26.2 ? 0 : sm(26.2, 27, T); } // (his turn to the notch: held through the dip, eased out as he lifts, back in at the end of his return)
  const _qx = new THREE.Quaternion(), _ax = new THREE.Vector3(1, 0, 0);
  function jawY(T) { const K = THEUS_RIG.jawY; T = ((T % LOOP) + LOOP) % LOOP; let i = 0; while (i + 1 < K.length && K[i + 1][0] <= T) i++; const a = K[i], b = K[Math.min(i + 1, K.length - 1)]; return b[0] > a[0] ? lerp(a[1], b[1], sm(a[0], b[0], T)) : a[1]; }
  function jawWorld() { const t = M.tongs, q = t.getWorldQuaternion(new THREE.Quaternion()); if (M.barLevel) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), M.barLevel)); return { p: new THREE.Vector3(0, 0, L.tongs - 1.2).applyMatrix4(t.matrixWorld), q }; }
  function headWorld() { return new THREE.Vector3(0, -L.head[1] / 2, L.handle).applyMatrix4(M.hammer.matrixWorld); } // the hammer head's striking face
  function restBar() { return M.barRest; }
  const lin = (c) => c.map((v) => Math.pow(v, 2.2)), CORE = lin([1, 0xde / 255, 0x48 / 255]);
  function anim(t, night) { if (!M.built) return; void t; void night; const now = M.tOv != null ? M.tOv : performance.now() / 1000, T = M.tOv != null ? ((M.tOv % LOOP) + LOOP) % LOOP : ((now - M.t0) % LOOP + LOOP) % LOOP; // (tOv: a test / shot pins the loop time)
    M.T = T; M.phase = phase(T); M.lava.rotation.y = (now * 0.01) % (2 * Math.PI);
    const P = place(T, now), bc = barAt(T), gl = clamp(bc.em / 0.9, 0, 1), ce = lin(bc.c), heat = sm(0.4, 1.9, bc.em); // edges = the keyframe colour (#ff6a1a -> #b23a12 -> #4a2416 over the strikes), core -> #ffde48 while hot
    M.barM.color.setRGB(...lin(bc.c).map((v) => v * (1 - 0.85 * gl))); M.barU.uEdge.value.setRGB(...ce); M.barU.uCore.value.setRGB(...ce.map((v, k) => lerp(v, CORE[k], heat))); M.barU.uI.value = gl * (0.85 + 0.1 * bc.em);
    if (M.glb) { const j = jawWorld(), R = M.barRest; if ((P.lay || 0) >= 0.999) { M.bar.position.copy(R.p); M.bar.quaternion.copy(R.q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), P.roll || 0)); }
    else { const lay = P.lay || 0; M.bar.position.copy(j.p).lerp(R.p, lay); M.bar.quaternion.copy(j.q).slerp(R.q, lay); } }
    stepSmoke(now); stepEmbers(now); stepFire(now);
    // sparks: a burst of 30-60 at each hit (more while the bar is hot), arcing down into the valley; embers on the ground
    const H = hitTimes(), last = M.lastT, SA = typeof TheusAudio !== 'undefined' ? TheusAudio : null; if (last != null) for (let i = 0; i < H.length; i++) { const th = H[i], sw = th - 0.85; if (SA && ((last < sw && T >= sw) || (last > T && sw <= T && T < th))) SA.swing(0.85, T - sw); /* his swing starts (wind-up): the whoosh, its crack just before contact */ if ((last < th && T >= th) || (last > T && th <= T)) { if (M.glb) burst(i, barAt(th).em); if (SA) SA.hit(); } } M.lastT = T; stepSparks(now); }
  const hsh = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); }; // (local hash: no rnd() draws)
  const gH = (x, z) => (typeof M3 !== 'undefined' && M3.heightAt ? M3.heightAt(x, z)[0] : HB);
  // charred stumps on the scorch (sparser toward the platform, none in the work / stride strip), one instanced draw; a few with ember tips (points in the fire cloud)
  function buildStumps(g, mob) { const P = []; for (let i = 0; i < 400 && P.length < 22; i++) { const X = L.scorch[0] + (hsh(i, 1.3) * 2 - 1) * L.scorch[2] * 0.95, Y = (hsh(i, 7.7) * 2 - 1) * L.scorch[3] * 0.95; if (Math.hypot((X - L.scorch[0]) / L.scorch[2], Y / L.scorch[3]) > 0.93) continue;
      const [x, y] = wld(X, Y); if (keepOut(x, y, 10 * U) && keepOut(x, y, 10 * U) !== 'yard' || workIn(X, Y, 12) || platD(X, Y) < L.skirt + 25) continue; if (hsh(i, 3.1) > sm(40, 160, Math.hypot(X - PC[0], Y))) continue; if (P.some((q) => Math.hypot(q[0] - X, q[1] - Y) < 22)) continue;
      if (typeof M3 !== 'undefined' && M3.paths && M3.paths.some && M3.paths.some((pp) => (pp.pts || pp).some && (pp.pts || pp).some((q) => Array.isArray(q) && Math.hypot(q[0] - x, q[1] - y) < 14 * U))) continue; P.push([X, Y, i]); }
    const geo = (() => { const parts = [], tr = new THREE.CylinderGeometry(0.62, 0.9, 1, 9, 4, false); { const p = tr.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k), a = Math.atan2(p.getZ(k), p.getX(k)); if (y > 0.45) p.setY(k, y + 0.42 * Math.abs(Math.sin(a * 2.5 + 0.6)) * (0.6 + 0.8 * hsh(Math.round(Math.cos(a) * 40), Math.round(Math.sin(a) * 40))) - 0.2); /* a jagged broken top */ const w = 1 + 0.12 * Math.sin(a * 3 + y * 5); p.setX(k, p.getX(k) * w); p.setZ(k, p.getZ(k) * w); } } tr.translate(0, 0.5, 0); parts.push(tr);
      for (const [a, s] of [[0.3, 1], [2.5, 0.8], [4.4, 0.9]]) { const f = new THREE.ConeGeometry(0.36 * s, 1.1 * s, 5, 1, false); f.translate(0, 0.55 * s, 0); f.rotateZ(-1.15); f.rotateY(a); f.translate(Math.cos(a) * 0.55, 0.02, -Math.sin(a) * 0.55); parts.push(f); } // root flares
      const b = new THREE.CylinderGeometry(0.1, 0.17, 0.55, 5); b.translate(0, 0.27, 0); b.rotateZ(-0.95); b.translate(0.55, 0.62, 0.1); parts.push(b); // a branch stub
      let P = [], N = 0; for (const g of parts) { const q = g.index ? g.toNonIndexed() : g; P = P.concat(Array.from(q.attributes.position.array)); N++; } const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.computeVertexNormals(); return out; })();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff }), own = (M.burn || []).filter((b) => b.own), im = { setMatrixAt: (n, m) => { const p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k)).applyMatrix4(m); SP.push(v.x, v.y, v.z); } SN.push(p.count); }, setColorAt: (n, c) => { for (let k = 0; k < SN[SN.length - 1]; k++) SC.push(c.r, c.g, c.b); } }, SP = [], SC = [], SN = [], m4 = new THREE.Matrix4(), c0 = new THREE.Color(0x1c1814).convertSRGBToLinear(), c1 = new THREE.Color(0x2a221b).convertSRGBToLinear(); M.stumpTips = []; // (#1c1814..#2a221b as linear: raw hexes read pale grey)
    P.forEach(([X, Y, i], n) => { const [x, z] = wld(X, Y), h = 6.3 * (0.5 + hsh(i, 5.5)) * U, r = 1.5 * (1.1 + 0.9 * hsh(i, 6.6)) * U, /* (pass 5: stumps 1.5x) */ y = gH(x, z) - 0.3 * U, ln = hsh(i, 2.2) < 0.35 ? 0.22 + 0.2 * hsh(i, 8.8) : 0.06 * (hsh(i, 8.8) - 0.5); m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(ln, hsh(i, 4.4) * 6.28, 0, 'YXZ')), new THREE.Vector3(r, h, r)); /* heights 0.5-1.5x, a third leaning */
      im.setMatrixAt(n, m4); im.setColorAt(n, c0.clone().lerp(c1, hsh(i, 9.9))); if (hsh(i, 1.9) < 0.3) M.stumpTips.push(new THREE.Vector3(x, y + h, z)); });
    void own; void mat; const sm2 = buildChar(g, SP, SC); sm2.name = 'forgeStumps'; sm2.castShadow = !mob; M.stumps = sm2; M.nStumps = P.length; } /* (pass 7: the stumps baked into one mesh with our two charred burning trees: one draw; the ember trunks by the platform stay stumps) */
  // (pass 7) the two burning trees: a charred tapering trunk with bare broken branches (one merged draw), flames at the trunk top and two branch tips, an ember glow on the wood near them (emissive, flickering; no scene light)
  function buildChar(g, SP, SC) { const own = (M.burn || []).filter((b) => b.own), P = SP.slice(), C = SC.slice(), GL = new Array(SP.length / 3).fill(0), up = new THREE.Vector3(0, 1, 0);
    const limb = (a, b, r0, r1, list) => { const d = b.clone().sub(a), c0 = new THREE.CylinderGeometry(r1, r0, d.length(), 6, 1, false), c = c0.index ? c0.toNonIndexed() : c0; c.translate(0, d.length() / 2, 0); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize())); c.translate(a.x, a.y, a.z); list.push(c); };
    own.forEach((b, k) => { const parts = [], H = b.H, ph = b.ph * 6.28, top = new THREE.Vector3(0.03 * H, H, 0); limb(new THREE.Vector3(0, -0.02 * H, 0), new THREE.Vector3(0.015 * H, 0.55 * H, 0), 0.05 * H, 0.032 * H, parts); limb(new THREE.Vector3(0.015 * H, 0.55 * H, 0), top, 0.032 * H, 0.012 * H, parts);
      const tips = []; [[0.42, 0, 0.36, 0.9], [0.55, 2.3, 0.3, 0.75], [0.68, 4.1, 0.27, 0.95], [0.8, 1.2, 0.22, 0.7], [0.9, 3.3, 0.14, 0.8]].forEach(([h, a, l, el], j) => { const s = new THREE.Vector3(0.015 * H * h / 0.55, h * H, 0), aa = a + ph, d = new THREE.Vector3(Math.cos(aa) * Math.cos(el), Math.sin(el), Math.sin(aa) * Math.cos(el)), e = s.clone().addScaledVector(d, l * H);
        limb(s, e, 0.016 * H * (1 - h * 0.5), 0.004 * H, parts); if (j < 3) { const t = e.clone().addScaledVector(d, -0.25 * l * H), d2 = d.clone().applyAxisAngle(up, 0.9).setY(d.y + 0.4).normalize(); limb(t, t.clone().addScaledVector(d2, 0.35 * l * H), 0.006 * H, 0.002 * H, parts); } tips.push(e); });
      const fp = [top, tips[2], tips[3]], m = new THREE.Matrix4().compose(new THREE.Vector3(b.x, b.y - 0.3 * U, b.z), new THREE.Quaternion().setFromAxisAngle(up, k * 2.1), new THREE.Vector3(1, 1, 1)); b.fp = fp.map((q) => q.clone().applyMatrix4(m));
      for (const q of parts) { const p = q.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)); let gw = 0; for (const f of fp) gw = Math.max(gw, 1 - sm(0.015 * H, 0.1 * H, v.distanceTo(f))); const hc = hsh(v.x * 3.1, v.y * 1.7); v.applyMatrix4(m); P.push(v.x, v.y, v.z); C.push(...[0.018, 0.014, 0.011].map((c) => c * (0.7 + 0.6 * hc))); GL.push(gw * (0.6 + 0.4 * hc)); } } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.setAttribute('aGlow', new THREE.Float32BufferAttribute(GL, 1)); geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true }); M.charU = { uGlow: { value: 1 } }; mat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, M.charU); sh.vertexShader = 'attribute float aGlow; varying float vGl;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGl = aGlow;');
      sh.fragmentShader = 'varying float vGl; uniform float uGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.1, 0.012) * vGl * vGl * uGlow * 1.3;'); };
    const mesh = new THREE.Mesh(geo, mat); g.add(mesh); M.charTrees = own.length ? mesh : null; return mesh; }
  // trees just outside the scorched edge, burning: flickering flame points + 2 smoke quads each (in the plume's draw)
  function burnTrees(mob) { const out = []; if (typeof W === 'undefined' || !W.objs) return out; const NS = mob ? 8 : 12, best = new Array(NS).fill(null); // one burning tree per sector of the ring just outside the scorched edge
    for (const o of W.objs) { if (o.type !== 'tree' && o.type !== 'pine') continue; const [X, Y] = loc(o.x, o.y); if (!inBox(X, Y)) continue; const dE = (Math.hypot((X - L.scorch[0]) / L.scorch[2], Y / L.scorch[3]) - 1) * L.scorch[3]; if (dE < 34 || dE > 85 || keepOut(o.x, o.y, 0)) continue;
      const sec = Math.floor(((Math.atan2(Y / L.scorch[3], (X - L.scorch[0]) / L.scorch[2]) + Math.PI) / (2 * Math.PI)) * NS) % NS, sc = Math.abs(dE - 45); if (!best[sec] || sc < best[sec].sc) best[sec] = { o, sc }; }
    for (const b of best) if (b) { const o = b.o, H = (o.r || 18) * (o.type === 'pine' ? 6.6 : 5.4); out.push({ x: o.x, z: o.y, y: gH(o.x, o.y), H, ph: hsh(o.x, o.y) }); }
    // (pass 6) two charred burning trees of our own on the scorched ground beside the platform (-Y side), where the far-side showcase looks; the scorch's outer edge is all cone flank from there (local placement, no worldgen draws)
    let own = 0; const cand = []; for (let X = 48; X <= 112; X += 4) for (let Y = 128; Y <= 172; Y += 4) { /* (pass 7: at the visible scorch edge on the right of the showcase frame, by the green hill) */ const [x, z] = wld(X, Y), ko = keepOut(x, z, 6 * U); if (cone(X, Y) || (ko && ko !== 'yard') || workIn(X, Y, 14) || platD(X, Y) < L.skirt + 6) continue;
      if (typeof M3 !== 'undefined' && M3.paths && M3.paths.some && M3.paths.some((pp) => (pp.pts || pp).some && (pp.pts || pp).some((q) => Array.isArray(q) && Math.hypot(q[0] - x, q[1] - z) < 12 * U))) continue; cand.push([Math.hypot(X - 74, Y - 152), X, Y]); }
    cand.sort((a, b) => a[0] - b[0]); const pick = []; for (const c of cand) { if (pick.length >= 2) break; if (pick.some((q) => Math.hypot(q[1] - c[1], q[2] - c[2]) < 16)) continue; pick.push(c); }
    for (const [, X, Y] of pick) { const [x, z] = wld(X, Y); out.push({ x, z, y: gH(x, z), H: (34 + 6 * own) * U, ph: hsh(X, Y), own: true }); own++; } M.nOwnBurn = own;
    M.nBurn = out.length; return out; }
  function buildFire(g, mob) { const per = mob ? 9 : 14, n = M.burn.length * per + (M.stumpTips || []).length; M.fireN = n; const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); M.firePer = per;
    const pm = new THREE.PointsMaterial({ size: 5 * U, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }); pm.toneMapped = false; const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; pts.name = 'forgeFire'; g.add(pts); M.fire = pts; }
  function stepFire(now) { if (!M.fire) return; const ps = M.fire.geometry.attributes.position, cl = M.fire.geometry.attributes.color, per = M.firePer; let n = 0;
    if (M.charU) M.charU.uGlow.value = 0.75 + 0.15 * Math.sin(now * 11) + 0.1 * Math.sin(now * 23.7);
    for (let b = 0; b < M.burn.length; b++) { const B = M.burn[b]; if (B.fp) { for (let k = 0; k < per; k++) { const A = B.fp[k % B.fp.length], u = ((k / per) + now * (1.1 + 0.4 * hsh(b, k)) + hsh(k, b)) % 1, a = hsh(b * 7 + k, 3.3) * 6.28 + now * 2, r = B.H * 0.035 * (1 - 0.7 * u);
          ps.setXYZ(n, A.x + Math.cos(a) * r - u * 0.02 * B.H, A.y + B.H * 0.15 * u + 0.006 * B.H * Math.sin(now * 13 + k), A.z + Math.sin(a) * r); const f = 1.25 * (1 - u * u) * (0.7 + 0.3 * Math.sin(now * 19 + k * 2.3)); cl.setXYZ(n, f, f * lerp(0.42, 0.1, u), f * lerp(0.07, 0.01, u)); n++; } continue; } /* (pass 7: #ffb347 core to #ff5a1a, flickering, at the trunk top and two branch tips) */
      for (let k = 0; k < per; k++) { const u = ((k / per) + now * (0.9 + 0.3 * hsh(b, k)) + hsh(k, b)) % 1, a = hsh(b * 7 + k, 3.3) * 6.28, r = B.H * 0.18 * (1 - u * 0.6);
        ps.setXYZ(n, B.x + Math.cos(a + now) * r, B.y + B.H * (0.3 + 0.75 * u + 0.05 * Math.sin(now * 9 + k)), B.z + Math.sin(a + now) * r); const f = (1 - u) * (0.75 + 0.25 * Math.sin(now * 17 + k * 3.1)); cl.setXYZ(n, f, f * lerp(0.75, 0.18, u), f * lerp(0.2, 0.02, u)); n++; } }
    for (const p of M.stumpTips || []) { const f = 0.25 + 0.15 * Math.sin(now * 3 + p.x); ps.setXYZ(n, p.x, p.y, p.z); cl.setXYZ(n, f, f * 0.144, f * 0.01); n++; }
    M.fire.geometry.setDrawRange(0, n); ps.needsUpdate = true; cl.needsUpdate = true; }
  // embers: small glowing points drifting up out of the crater and off the platform, carried out over the valley, settling on the ground as dim embers (share the sparks' cloud)
  function stepEmbers(now) { const dt = clamp(M.emPrev ? now - M.emPrev : 0.016, 0, 0.1); M.emPrev = now; M.emAcc = (M.emAcc || 0) + dt * (M.mob ? 9 : 14); const o = M.lava.position;
    while (M.emAcc >= 1) { M.emAcc -= 1; const fromCr = Math.random() < 0.7, a = Math.random() * 6.28, r = Math.random() * 60 * U, p = fromCr ? new THREE.Vector3(o.x + Math.cos(a) * r, o.y + 4 * U, o.z + Math.sin(a) * r) : (() => { const [x, z] = wld(PC[0] + (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30); return new THREE.Vector3(x, HB + 28 * U, z); })();
      const wa = Math.random() * 6.28, ws = (5 + Math.random() * 9) * U; M.sp.push({ p, v: new THREE.Vector3(Math.cos(wa) * ws, (fromCr ? 14 + Math.random() * 10 : 5 + Math.random() * 5) * U, Math.sin(wa) * ws), age: 0, life: 10 + Math.random() * 8, ground: false, g: 2.2, drag: 0.15, c: [1, 0.25 + 0.3 * Math.random(), 0.03], ember: true }); if (M.sp.length > M.spN) M.sp.shift(); } }
  function stepSmoke(now) { const c = typeof M3 !== 'undefined' && M3.camera; if (!c || !M.smoke) return; const ps = M.smoke.geometry.attributes.position, cl = M.smoke.geometry.attributes.color, rt = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1);
    const n = M.smP || 16, o = M.lava.position; for (let k = 0; k < M.smN; k++) { if (k >= n) { const b = M.burn[(k - n) >> 1], u = (((k - n) & 1) * 0.5 + now * 0.08 + b.ph) % 1, sz = b.H * (0.35 + 0.6 * u), a = 0.38 * sm(0, 0.2, u) * (1 - sm(0.45, 1, u)), cx = b.x - u * 12 * U, cz = b.z + u * 5 * U, cyy = b.y + b.H * (0.9 + 1.4 * u);
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], m) => { ps.setXYZ(k * 4 + m, cx + (rt.x * sx + up.x * sy) * sz, cyy + (rt.y * sx + up.y * sy) * sz, cz + (rt.z * sx + up.z * sy) * sz); cl.setXYZW(k * 4 + m, 0.12, 0.105, 0.095, a); }); continue; } const u = ((k / n + now * 0.012) % 1), h = (30 + Math.pow(u, 0.85) * 400) * U, sz = (34 + u * 120) * (0.8 + 0.4 * hsh(k, 3.3)) * U, a = Math.min(0.85, 1.15 * Math.pow(1 - u, 1.2)) * sm(0, 0.05, u), sp = 6 + 30 * u, cx = o.x + (Math.sin(k * 2.3 + now * 0.07) * sp - u * 45 - u * u * 170) * U, cz = o.z + (Math.cos(k * 1.7 + now * 0.05) * sp + u * 14 + u * u * 50) * U, /* (pass 6: the whole column leans downwind) */ cyy = HB + h; /* (pass 5: a column of ~40 billowed puffs, tight at the vent, spreading and bending downwind) */
      const ra = k * 1.3 + now * 0.06 * (k & 1 ? 1 : -1), ca = Math.cos(ra), sa = Math.sin(ra), R2 = rt.clone().multiplyScalar(ca).addScaledVector(up, sa), U2 = up.clone().multiplyScalar(ca).addScaledVector(rt, -sa); /* each billow turns slowly */
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; pts.forEach(([sx, sy], m) => { ps.setXYZ(k * 4 + m, cx + (R2.x * sx + U2.x * sy) * sz, cyy + (R2.y * sx + U2.y * sy) * sz, cz + (R2.z * sx + U2.z * sy) * sz); const gw = 0.55 * (1 - sm(0.02, 0.22, u)) * (sy < 0 ? 1 : 0.45); cl.setXYZW(k * 4 + m, lerp(0.102, 0.254, u) + gw * 0.55, lerp(0.080, 0.212, u) + gw * 0.16, lerp(0.069, 0.181, u) + gw * 0.03, a); }); } /* (pass 6: a faint orange underglow at the base of the column) */ // #5a5049 at the base -> #8a7f76 up high
    ps.needsUpdate = true; cl.needsUpdate = true; }
  const SPA = lin([1, 0xd2 / 255, 0x4a / 255]), SPB = lin([1, 0x6a / 255, 0x1a / 255]);
  function burst(i, em) { const n = Math.round(30 + 30 * clamp(em / 1.9, 0, 1)), p0 = headWorld(); M.hits = (M.hits || 0) + 1; M.lastBurst = n;
    for (let k = 0; k < n; k++) { const a = (Math.random() - 0.5) * 2.2, el = 0.15 + Math.random() * 0.6, sp = (12 + Math.random() * 18) * U, mix = Math.random(); // fan out off the bar, away from him (world -x) and over the edge into the valley
      const dir = new THREE.Vector3(-Math.cos(a), 0, Math.sin(a) * 1.2); M.sp.push({ p: p0.clone(), v: dir.multiplyScalar(sp * Math.cos(el)).add(new THREE.Vector3(0, sp * Math.sin(el), 0)), age: 0, life: 4 + Math.random() * 3, ground: false, c: SPA.map((v, q) => lerp(v, SPB[q], mix)) });
      if (M.sp.length > M.spN) M.sp.shift(); } }
  function stepSparks(now) { const dt = clamp(M.spPrev ? now - M.spPrev : 0.016, 0, 0.1); M.spPrev = now; const g = 9.8 * U, pos = M.pts.geometry.attributes.position, col = M.pts.geometry.attributes.color; let n = 0;
    for (let i = M.sp.length - 1; i >= 0; i--) { const s = M.sp[i]; s.age += dt; if (s.age > s.life) { M.sp.splice(i, 1); continue; } if (!s.ground) { s.v.y -= (s.g ? s.g * U : g) * dt; if (s.drag) s.v.y = Math.max(s.v.y, -4 * U); s.p.addScaledVector(s.v, dt); const gz = (s.p.y < HB + 40 * U && typeof M3 !== 'undefined' && M3.heightAt ? M3.heightAt(s.p.x, s.p.z)[0] : HB) + 0.4 * U; if (s.p.y < gz) { s.p.y = gz; s.ground = true; s.tg = s.age; } } }
    for (const s of M.sp) { if (n >= M.spN) break; pos.setXYZ(n, s.p.x, s.p.y, s.p.z); const f = s.ground ? Math.max(0, 1 - (s.age - s.tg) / (s.ember ? 6 : 2.5)) * (s.ember ? 0.35 : 0.5) : (s.ember ? 0.55 + 0.25 * Math.sin(now * 11 + s.p.x) : 1) - 0.4 * sm(0, s.life, s.age); col.setXYZ(n, s.c[0] * f, s.c[1] * f * (s.ground ? 0.5 : 1), s.c[2] * f); n++; }
    M.pts.geometry.setDrawRange(0, n); pos.needsUpdate = true; col.needsUpdate = true; }
  const shaderU = () => new THREE.Vector4(LIP[0], LIP[1], U, 1);
  return { mapTint, WS, F, U, LIP, HB, LOOP, HITS, L, M, wld, loc, carve, keepOut, scorched, clear, afterGen, orePrune, anchors, build, anim, barAt, hitTimes, phase, pose, platZ, platD, cone, Hr, Rb, Rr, shaderU, homeU, pathKeepW: (x, y) => { const [X, Y] = loc(x, y); return inBox(X, Y) && pathKeep(X, Y); }, SWB, swbNear, place, restBar, jawWorld, headWorld, glbReady, on };
})();
