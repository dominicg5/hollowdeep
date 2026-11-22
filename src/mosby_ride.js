/* ===== Hitch a ride on Mosby (Dominic: "an option to hitch a ride on his back ... you have to interact with him to get off ... which will drop you in the
   general location of where Mosby is at"; then: "don't build a platform on Mosby I like his shell too much. Just make it so the player can walk on his shell
   and can't walk too far off the slope")
   - 'Hitch a ride' in his talk menu puts her on the crown of his shell (free for now). Her explore group is pinned to his shell every frame (its position,
     his turn, his sway and breathing), so she walks about in the shell's own frame, in metres: no sliding as he walks, turns or sways.
   - She stands on the real carved shell: a heightfield ray-cast once from his shell mesh, in the shell's frame (so it moves with him), bilinear between samples.
   - Walkable = the gentle top: an invisible boundary where the dome gets steeper than 30 deg; she can't walk or slide past it.
   - Aboard, a tap on the walkable shell walks her there; a tap anywhere else (ground, sky, the map) does NOT take her off - it only lets go of his
     dialogue (the tap-fix holds). A tap on the rest of Mosby (head, legs, the steep flanks), or the 'Hop off' button, opens his menu with 'Hop off'.
   - Hop off: she lands on the nearest safe spot within ~15 m of his flank (dry, walkable, not steep, not a cliff edge or crack, clear of his body and feet).
   - Saved (S.mosbyRide): a reload while riding puts her back on his shell where she stood. */
const MosbyRide = (() => {
  const R = { on: false, btn: null, hf: null };
  const GM = () => Mosby.GM, WS = () => Explore.WS, MAXSLOPE = 30;
  const shell = () => GM().shell, um = () => WS() / GM().g.scale.x; // shell-local units per metre
  // the walkable top: the dome's summit and, per direction, how far out the slope stays <= 30 deg (model units, shell frame)
  function region() { if (R.reg) return R.reg; const B = Mosby.B, dy = Mosby.domeY; let sx = 0, sz = 0, sy = -1e9; for (let x = -B.rx * 0.6; x <= B.rx * 0.6; x += 0.05) for (let z = -B.rz * 0.6; z <= B.rz * 0.6; z += 0.05) { const y = dy(x, z); if (y != null && y > sy) { sy = y; sx = x; sz = z; } }
    const slope = (x, z) => { const e = 0.02, a = dy(x + e, z), b = dy(x - e, z), c = dy(x, z + e), d = dy(x, z - e); if (a == null || b == null || c == null || d == null) return 90; return Math.atan(Math.hypot((a - b) / (2 * e), (c - d) / (2 * e))) * 180 / Math.PI; };
    const N = 72, rmax = []; for (let i = 0; i < N; i++) { const q = i / N * Math.PI * 2, cx = Math.cos(q), cz = Math.sin(q); let r = 0; while (r < 6 && slope(sx + cx * (r + 0.01), sz + cz * (r + 0.01)) <= MAXSLOPE) r += 0.01; rmax.push(r); }
    return (R.reg = { sx, sz, sy, rmax, N, slope }); }
  const rAt = (q) => { const G = region(), f = ((q / (Math.PI * 2)) % 1 + 1) % 1 * G.N, i = Math.floor(f), t = f - i; return G.rmax[i % G.N] * (1 - t) + G.rmax[(i + 1) % G.N] * t; };
  // metres <-> shell units; inside(x, z) in metres, with her body radius (0.4 m) kept inside the boundary
  function clampM(x, z) { const G = region(), u = um(), lx = x * u - G.sx, lz = z * u - G.sz, r = Math.hypot(lx, lz), q = Math.atan2(lz, lx), lim = Math.max(0, rAt(q) - 0.4 * u); if (r <= lim) return [x, z, true]; return [(G.sx + lx / r * lim) / u, (G.sz + lz / r * lim) / u, false]; }
  // the heightfield: once, the carved carapace mesh rasterised top-down in the shell's own frame (so it moves with him): 0.2 m cells over the walkable top
  function hfBuild() { if (R.hf) return R.hf; const G = region(), u = um(), sh = shell(); let mesh = null, mc = 0; for (const o of sh.children) if (o.isMesh && o.geometry && o.geometry.attributes.position.count > mc) { mc = o.geometry.attributes.position.count; mesh = o; } /* the carved carapace (the biggest piece of the shell) */
    const rmx = Math.max(...G.rmax), cell = 0.2, half = Math.ceil(rmx / u / cell) + 3, n = half * 2 + 1, h = new Float32Array(n * n).fill(NaN), cu = cell * u, ox = G.sx - half * cu, oz = G.sz - half * cu;
    if (mesh) { const P = mesh.geometry.attributes.position, I = mesh.geometry.index, m = mesh.matrix, A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), nt = I ? I.count / 3 : P.count / 3; mesh.updateMatrix();
      for (let t = 0; t < nt; t++) { const ia = I ? I.getX(3 * t) : 3 * t, ib = I ? I.getX(3 * t + 1) : 3 * t + 1, ic = I ? I.getX(3 * t + 2) : 3 * t + 2; A.fromBufferAttribute(P, ia).applyMatrix4(m); B.fromBufferAttribute(P, ib).applyMatrix4(m); C.fromBufferAttribute(P, ic).applyMatrix4(m);
        const i0 = Math.max(0, Math.ceil((Math.min(A.x, B.x, C.x) - ox) / cu)), i1 = Math.min(n - 1, Math.floor((Math.max(A.x, B.x, C.x) - ox) / cu)), j0 = Math.max(0, Math.ceil((Math.min(A.z, B.z, C.z) - oz) / cu)), j1 = Math.min(n - 1, Math.floor((Math.max(A.z, B.z, C.z) - oz) / cu)); if (i0 > i1 || j0 > j1) continue;
        const d = (B.z - C.z) * (A.x - C.x) + (C.x - B.x) * (A.z - C.z); if (Math.abs(d) < 1e-12) continue;
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = ox + i * cu, z = oz + j * cu, l1 = ((B.z - C.z) * (x - C.x) + (C.x - B.x) * (z - C.z)) / d, l2 = ((C.z - A.z) * (x - C.x) + (A.x - C.x) * (z - C.z)) / d, l3 = 1 - l1 - l2; if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue; const y = l1 * A.y + l2 * B.y + l3 * C.y, k = j * n + i; if (!(h[k] >= y)) h[k] = y; } } } /* the top-most surface */
    return (R.hf = { h, n, half, cell }); }
  function hy(x, z) { const H = hfBuild(), G = region(), u = um(), fx = (x * u - G.sx) / (H.cell * u) + H.half, fz = (z * u - G.sz) / (H.cell * u) + H.half, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, at = (a, b) => (a < 0 || b < 0 || a >= H.n || b >= H.n) ? NaN : H.h[b * H.n + a];
    let v = at(i, j) * (1 - tx) * (1 - tz) + at(i + 1, j) * tx * (1 - tz) + at(i, j + 1) * (1 - tx) * tz + at(i + 1, j + 1) * tx * tz; if (!isFinite(v)) { const y = Mosby.domeY(x * u, z * u); v = y == null ? G.sy : y; } return v / u; }
  // where her feet rest: the highest shell under her soles (centre and 4 points 0.3 m out), so a sole bridges a groove between plates instead of sinking into it
  const foot = (x, z) => Math.max(hy(x, z), hy(x + 0.3, z), hy(x - 0.3, z), hy(x, z + 0.3), hy(x, z - 0.3));
  // pin her group to the shell: shell matrix x (1 / units per metre)
  const _m = new THREE.Matrix4(), _s = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1);
  function sync() { if (!R.on) return; if (R.btn) { const dl = document.getElementById('mosDlg'), v = dl && !dl.classList.contains('hidden') ? 'hidden' : ''; if (R.btn.style.visibility !== v) R.btn.style.visibility = v; } /* bottom centre is his menu's place while it is open (it has its own Hop off) */ const sh = shell(), P = Explore.EX.par; if (!sh || !P) return; sh.updateWorldMatrix(true, false); const u = um(); _m.compose(sh.position, sh.quaternion, _one).premultiply(sh.parent.matrixWorld).multiply(_s.makeScale(u, u, u)); _m.decompose(P.position, P.quaternion, P.scale); P.updateMatrixWorld(true); } /* the shell's frame minus its slow breathing (her group keeps a uniform scale); keep() lifts her with the breathing */
  function keep(G) { const c = clampM(G.x, G.z); G.x = c[0]; G.z = c[1]; G.y = foot(G.x, G.z) * shell().scale.y; if (!c[2] && G.path) { G.path = null; G.goal = null; } }
  const api = { sync, keep, tap: (sx, sy) => tapAboard(sx, sy), detach };
  function mount(at) { if (!Explore.on || !GM().g || !shell()) return false; const G = CharView.st.gnd; if (!G) return false; if (Mosby.MEET) Mosby.MEET.on = false; if (typeof ExMap !== 'undefined' && ExMap.st && ExMap.st.trip) ExMap.cancel();
    const Rg = region(), u = um(); R.on = true; Explore.EX.ride = api; const p = clampM(at ? at.x : Rg.sx / u, at ? at.z : Rg.sz / u - 3); G.x = p[0]; G.z = p[1]; G.hy = foot; G.y = foot(G.x, G.z); G.path = null; G.goal = null; G.exC = null; G.exW = 0;
    G.bnd = { X0: -1e5, X1: 1e5, Z0: -1e5, Z1: 1e5 }; if (CharView.st.exCf) CharView.st.exCf.set(G.x, G.y, G.z); sync(); S.mosbyRide = { on: true, x: +G.x.toFixed(2), z: +G.z.toFixed(2) }; try { save(); } catch (e) {} ui(true); return true; }
  // her group back to the plain ground frame (exit, or before hopping off); the saved ride is kept unless she hopped off
  function detach() { R.on = false; Explore.EX.ride = null; const P = Explore.EX.par; if (P) P.quaternion.identity(); ui(false); }
  // where she lands: the nearest safe spot within ~15 m of his flank (on her side first)
  function landing(side) { const G = GM(), w = WS(), s = G.g.scale.x, h = Explore.here() || [G.at.x, G.at.y], flank = Mosby.B.rx * s, a0 = side != null ? side : Math.atan2(h[1] - G.at.y, h[0] - G.at.x), cands = [];
    for (let dm = 2; dm <= 15; dm += 1.5) for (let k = 0; k < 36; k++) { const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 18), x = G.at.x + Math.cos(a) * (flank + dm * w), y = G.at.y + Math.sin(a) * (flank + dm * w); cands.push({ x, y, d: dm + Math.ceil(k / 2) * 0.35 }); }
    cands.sort((p, q) => p.d - q.d); for (const c of cands) { if (!safe(c.x, c.y).ok) continue; const k = Explore.reach(c.x, c.y); /* she lands on the walk grid: the snapped spot must be safe too */ if (k && safe(k[0], k[1]).ok) return k; } return null; }
  function safe(x, y) { const w = WS(), G = GM(), s = G.g.scale.x; const why = (k) => ({ ok: false, why: k });
    if ((typeof GRAND !== 'undefined' && GRAND.wet && GRAND.wet(x, y, w * 1)) || (typeof isWet === 'function' && isWet(x, y, 0))) return why('water');
    if (typeof MosbyTalk !== 'undefined' && MosbyTalk.crackW(x, y)) return why('crack');
    const dx = x - G.at.x, dy = y - G.at.y, a = G.yaw || 0, lx = dx * Math.cos(a) - dy * Math.sin(a), lz = dx * Math.sin(a) + dy * Math.cos(a); if ((lx / (Mosby.B.rx * s)) ** 2 + (lz / (Mosby.B.rz * s * 1.25)) ** 2 < 1.1) return why('body'); // his shell, head and tail
    for (const c of G.col || []) if (Math.hypot(c.x - x, c.y - y) < c.r + w * 3) return why('feet');
    const h0 = M3.meshH(x, y); let mx = 0; for (let k = 0; k < 8; k++) { const q = k / 8 * Math.PI * 2; mx = Math.max(mx, Math.abs(M3.meshH(x + Math.cos(q) * w * 2, y + Math.sin(q) * w * 2) - h0)); } if (mx > w * 0.9) return why('steep'); // > ~24 deg over 2 m, or a drop
    const k2 = Explore.reach(x, y); if (!k2 || Math.hypot(k2[0] - x, k2[1] - y) > w * 2.5) return why('not walkable');
    if (Explore.solidAt && Explore.solidAt(x, y)) return why('solid');
    return { ok: true }; }
  // he may have carried her far past the walk patch she got on in: if nothing near him is reachable, rebuild the patch beside him (on her side) and look again
  function dismount() { if (!R.on) return null; const Gm = GM(), h = Explore.here() || [Gm.at.x, Gm.at.y], side = Math.atan2(h[1] - Gm.at.y, h[0] - Gm.at.x), G = CharView.st.gnd, face = G ? G.face : 0, az = Explore.EX.az; let p = landing(side); detach(); S.mosbyRide = null; try { save(); } catch (e) {}
    if (!p) { const r = Mosby.B.rx * Gm.g.scale.x + WS() * 8; Explore.enter(Gm.at.x + Math.cos(side) * r, Gm.at.y + Math.sin(side) * r, { az, face }); p = landing(side); }
    const k = p || Explore.here() || [Gm.at.x + WS() * 60, Gm.at.y]; Explore.enter(k[0], k[1], { az, face }); R.last = { x: k[0], y: k[1], want: p }; return R.last; }
  // a tap while aboard
  const _rc = new THREE.Raycaster(), _inv = new THREE.Matrix4();
  // where a tap ray meets the walkable top of his shell (marched in the shell frame, in metres), or null
  function shellPoint(sx, sy) { const el = M3.renderer && M3.renderer.domElement, w = el ? el.clientWidth : innerWidth, h = el ? el.clientHeight : innerHeight; _rc.setFromCamera(new THREE.Vector2((sx / w) * 2 - 1, -(sy / h) * 2 + 1), M3.camera);
    const P = Explore.EX.par; P.updateMatrixWorld(true); _inv.copy(P.matrixWorld).invert(); const o = _rc.ray.origin.clone().applyMatrix4(_inv), d = _rc.ray.direction.clone().transformDirection(_inv), Rg = region(), u = um(), reach = Math.max(...Rg.rmax) / u + 2;
    const f = (t) => { const x = o.x + d.x * t, z = o.z + d.z * t; return o.y + d.y * t - hy(x, z); }, near = (t) => Math.hypot((o.x + d.x * t) * u - Rg.sx, (o.z + d.z * t) * u - Rg.sz) / u < reach;
    let pt = 0, pf = null; for (let t = 0; t < 600; t += 0.5) { if (!near(t)) { pf = null; pt = t; continue; } const v = f(t); if (pf != null && pf > 0 && v <= 0) { let a = pt, b2 = t; for (let k = 0; k < 20; k++) { const m = (a + b2) / 2; if (f(m) > 0) a = m; else b2 = m; } const x = o.x + d.x * b2, z = o.z + d.z * b2; const c = clampM(x, z); if (!c[2] && Math.hypot(c[0] - x, c[1] - z) > 1.5) return null; return { x: c[0], z: c[1], dist: P.localToWorld(new THREE.Vector3(x, hy(x, z), z)).distanceTo(_rc.ray.origin) }; } pf = v; pt = t; }
    return null; }
  // what a tap aboard lands on: 'shell' (the walkable top, nothing of him nearer), 'body' (any other visible part of him: head, legs, steep flanks), or 'none'
  function classify(sx, sy) { const q = shellPoint(sx, sy); let body = false;
    if (Mosby.bodyHit(sx, sy)) { const hit = _rc.intersectObject(GM().g, true).find((i) => { if (!i.object.isMesh) return false; for (let o = i.object; o; o = o.parent) if (!o.visible) return false; return true; }); body = !!hit && !(q && hit.distance > q.dist - WS() * 3); }
    return { k: body ? 'body' : q ? 'shell' : 'none', q }; }
  function tapAboard(sx, sy) { const c = classify(sx, sy), q = c.q;
    if (c.k === 'body') { Mosby.release(); if (typeof MosbyTalk !== 'undefined') MosbyTalk.open(); return { talk: true }; }
    Mosby.release(); if (!q) return { stay: true }; // the ground, the sky: she stays aboard, his dialogue (if any) closes
    const G = CharView.st.gnd; G.path = [{ x: q.x, z: q.z }]; G.pi = 0; G.goal = { x: q.x, z: q.z, fit: true, done: () => { if (S.mosbyRide) { S.mosbyRide.x = +G.x.toFixed(2); S.mosbyRide.z = +G.z.toFixed(2); } } }; G.gBest = 1e9; G.stall = 0; return { walk: [q.x, q.z] }; }
  // the 'Hop off' button (opens his menu)
  function ui(on) { let b = R.btn || document.getElementById('exHopBtn'); if (!b && on) { b = document.createElement('button'); b.id = 'exHopBtn'; b.textContent = '🐢 Hop off'; b.setAttribute('aria-label', 'Ask Mosby to let you down');
      b.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 84px);z-index:60;white-space:nowrap;padding:10px 22px;border-radius:22px;border:0;font:700 15px Georgia,serif;color:#f4f0dc;background:radial-gradient(120% 95% at 50% 22%,#9bb36a,#5b7a32 55%,#3b521e);box-shadow:0 0 0 3px #b07a34,0 0 0 5px #6e4a1c,0 3px 5px rgba(0,0,0,.45)';
      for (const e of ['pointerdown', 'pointerup', 'touchstart']) b.addEventListener(e, (ev) => ev.stopPropagation()); b.addEventListener('click', (e) => { e.stopPropagation(); if (typeof MosbyTalk !== 'undefined') MosbyTalk.open(); }); (document.getElementById('cityWrap') || document.body).appendChild(b); }
    R.btn = b; if (b) b.style.display = on ? '' : 'none'; }
  // a reload / coming back to the walking view while riding: back on his shell where she stood
  function resume() { if (R.on || typeof S === 'undefined' || !S || !S.mosbyRide || !S.mosbyRide.on) return; if (typeof Explore === 'undefined' || !Explore.on || !GM() || !GM().g || !shell() || typeof M3 === 'undefined' || M3.models !== 'ready') return; mount({ x: S.mosbyRide.x || 0, z: S.mosbyRide.z || 0 }); }
  if (typeof window !== 'undefined') setInterval(resume, 400);
  return { R, mount, dismount, landing, safe, sync, region, clampM, hy, um, resume, tapAboard, shellPoint, classify, get on() { return R.on; } };
})();
