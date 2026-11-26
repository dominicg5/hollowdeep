/* (Dominic t720u / t722u, Art's design approved on card t721s2718) overhead combat health bars - hers and each monster's in the fight - over the 3D canvas,
   under (t566s2518) Art's nameplate: one centred row, a brass 'Lv N' badge (coloured against her combat level) then the name.
   Plain DOM + CSS (no PNGs), constant screen size, billboarded; every number is in HEALTH_BARS (src/creatures/data.js). Used by the Attack Playground
   (char3d.js) and the overworld golems (world_golems.js), which both call frame() once per frame with their candidates:
     HealthBars.frame(scope, { host, canvas, cam, m, dt, myLevel, items: [{ key, me, name, level, dist, hp, max, shield, root, head, fighting }] }) -> { shown }
       a monster with fighting = true puts it (and her) in the fight; the bars show only while a fight is on and fade FADE_AFTER_S after it ends;
       names + badges show for the nearest NAME_MAX others within NAME_R_M metres (dist), hers only if ME_PLATE
     HealthBars.clear(scope)    drop a scope's bars at once (playground closed / map left)
     HealthBars.state(scope)    what is on screen (tests) */
const HealthBars = (() => {
  const D = () => HEALTH_BARS, S = {}, V = () => new THREE.Vector3();
  let css = false;
  function style() { if (css) return; css = true; const T = D(), el = document.createElement('style'), o = T.NAME_OUTLINE_PX, ol = (c, k) => [[-k, -k], [k, -k], [-k, k], [k, k], [-k, 0], [k, 0], [0, -k], [0, k]].map(([x, y]) => `${x}px ${y}px 0 ${c}`).join(','); el.id = 'hbStyle';
    el.textContent = `.hbLayer{pointer-events:none;overflow:visible}.hbPlate{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);will-change:left,top;font-family:${T.FONT}}`
      + `.hbRow{display:flex;align-items:center;justify-content:center;gap:${T.ROW_GAP_PX}px;white-space:nowrap}.hbRow+.hbBar{margin-top:${T.STACK_GAP_PX}px}`
      + `.hbName{font-weight:700;font-size:${T.NAME_PX}px;line-height:1.15;color:${T.NAME};text-shadow:${ol(T.NAME_OUTLINE, o)}}`
      + `.hbLv{font-weight:700;font-size:${T.BADGE_PX}px;line-height:1.2;background:${T.BADGE_BG};border:1px solid ${T.BADGE_BORDER};border-radius:999px;padding:${T.BADGE_PAD}}.hbLv.lower{color:${T.LV_LOWER}}.hbLv.even{color:${T.LV_EVEN}}.hbLv.higher{color:${T.LV_HIGHER}}.hbLv.much{color:${T.LV_MUCH}}`
      + `.hbBar{position:relative;box-sizing:border-box;height:${T.H_PX + 2 * T.FRAME_PX}px;border:${T.FRAME_PX}px solid ${T.FRAME};border-radius:${T.RADIUS_PX}px;box-shadow:${T.SHADOW},inset 0 0 0 1px ${T.INNER};background:${T.TRACK}}.hbTrack{position:absolute;inset:0;overflow:hidden;border-radius:1px}`
      + `.hbBar i{position:absolute;left:1px;top:1px;bottom:1px;display:block;border-radius:1px}.hbBar .hbTrail{background:${T.TRAIL}}.hbBar .hbTrail.go{transition:width ${T.TRAIL_CATCH_S}s ease-out}`
      + `.hbBar.me .hbFill{background:linear-gradient(180deg,${T.ME_HI} 0,${T.ME_HI} ${T.HI_TOP * 100}%,${T.ME_FILL} ${T.HI_TOP * 100}%)}.hbBar.mob .hbFill{background:linear-gradient(180deg,${T.MOB_HI} 0,${T.MOB_HI} ${T.HI_TOP * 100}%,${T.MOB_FILL} ${T.HI_TOP * 100}%)}`
      + `.hbBar.me.low .hbFill{animation:hbPulse ${(1 / T.LOW_HZ).toFixed(3)}s ease-in-out infinite}@keyframes hbPulse{50%{filter:brightness(${T.LOW_BRIGHT})}}`
      + `.hbBar b{position:absolute;inset:-4px 0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${T.NUM_PX}px;line-height:1;color:${T.NUM};text-shadow:${ol(T.NUM_OUTLINE, 1)};white-space:nowrap}`;
    document.head.appendChild(el); }
  // ---- one model's sizes, measured once (in its root's local units): its top, its head bone's rest height, head and body width
  function headOf(root) { let h = null; root.traverse((o) => { if (!h && o.isBone && /^head$/i.test(o.name)) h = o; }); return h; }
  function measure(root, head) { const ud = root.userData; if (ud.hbM && ud.hbM.head === head) return ud.hbM; root.updateMatrixWorld(true); const inv = root.matrixWorld.clone().invert(), bb = new THREE.Box3(), hb = new THREE.Box3(), v = V();
    root.traverse((o) => { if (!o.isMesh || o.userData.isInk) return; const P = o.geometry.attributes.position, sk = o.isSkinnedMesh ? o.skeleton : null, hi = sk && head ? sk.bones.indexOf(head) : -1, J = o.geometry.attributes.skinIndex, W = o.geometry.attributes.skinWeight;
      const M = o.matrixWorld.clone().premultiply(inv); for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i).applyMatrix4(M); bb.expandByPoint(v); if (hi >= 0) { let bj = J.getX(i), bw = W.getX(i); for (const [j, w] of [[J.getY(i), W.getY(i)], [J.getZ(i), W.getZ(i)], [J.getW(i), W.getW(i)]]) if (w > bw) { bw = w; bj = j; } if (bj === hi) hb.expandByPoint(v); } } });
    if (head && hb.isEmpty()) { head.updateMatrixWorld(true); head.traverse((o) => { if (!o.isMesh) return; const P = o.geometry.attributes.position, M = o.matrixWorld.clone().premultiply(inv); for (let i = 0; i < P.count; i += 3) hb.expandByPoint(v.fromBufferAttribute(P, i).applyMatrix4(M)); }); }
    const hy = head ? head.getWorldPosition(V()).applyMatrix4(inv).y : 0, bw = bb.isEmpty() ? 0.5 : Math.max(bb.max.x - bb.min.x, 1e-3), hw = hb.isEmpty() ? 0 : hb.max.x - hb.min.x;
    return (ud.hbM = { head, top: bb.isEmpty() ? 1 : bb.max.y, hy, headW: hw, bodyW: bw }); }
  // ---- a scope (one per host: 'pga', 'map'): its layer, its plates, the fight clock
  function scope(id, host) { let s = S[id]; if (s && s.host === host) return s; if (s) clear(id); style(); const L = document.createElement('div'); L.className = 'hbLayer'; L.dataset.scope = id;
    L.style.cssText = (host === document.body ? 'position:fixed;' : 'position:absolute;') + 'left:0;top:0;width:0;height:0;z-index:' + (host === document.body ? 60 : 4); host.appendChild(L);
    return (S[id] = { host, L, bars: {}, members: new Set(), named: [], fight: false, t: 1e9, op: 0 }); }
  function plate(s, key, me) { let b = s.bars[key]; if (b) return b; const el = document.createElement('div'); el.className = 'hbPlate'; el.dataset.key = key;
    el.innerHTML = `<div class="hbRow"><span class="hbLv"></span><span class="hbName"></span></div><div class="hbBar ${me ? 'me' : 'mob'}"><div class="hbTrack"><i class="hbTrail"></i><i class="hbFill"></i></div><b></b></div>`; s.L.appendChild(el);
    const row = el.children[0], bar = el.children[1];
    return (s.bars[key] = { el, row, lv: row.children[0], nm: row.children[1], bar, tr: bar.children[0].children[0], fl: bar.children[0].children[1], num: bar.children[1], me, f: -1, trail: -1, hold: 0, hp: null, max: null, txt: '', name: '', lvTxt: '', lvCls: '', x: 0, y: 0, w: 0, vis: false, rowOn: null, barOn: null }); }
  function setW(e, u) { e.style.width = 'calc(' + (u * 100).toFixed(2) + '% - 2px)'; }
  const show = (e, on) => { e.style.display = on ? '' : 'none'; };
  function lvClass(lv, my) { const d = (lv || 1) - (my || 1); return d < 0 ? 'lower' : d === 0 ? 'even' : d < D().LV_MUCH_D ? 'higher' : 'much'; }
  function frame(id, o) { const T = D(), s = scope(id, o.host || document.body), dt = Math.min(o.dt || 0, 0.25), items = o.items || [];
    // the fight clock: bars only in a fight, FADE_AFTER_S after it ends they fade over FADE_S
    const fighting = items.filter((q) => q.fighting && !q.me); if (fighting.length) { s.fight = true; s.t = 0; s.op = 1; for (const q of fighting) s.members.add(q.key); for (const q of items) if (q.me) s.members.add(q.key); }
    else { if (s.fight) { s.fight = false; s.t = 0; } if (s.members.size) { s.t += dt; s.op = s.t <= T.FADE_AFTER_S ? 1 : Math.max(0, 1 - (s.t - T.FADE_AFTER_S) / T.FADE_S); if (s.op <= 0) s.members.clear(); } }
    // names + badges: the nearest NAME_MAX within NAME_R_M (hers only with ME_PLATE)
    const named = new Set(items.filter((q) => (!q.me || T.ME_PLATE) && q.dist != null && q.dist <= T.NAME_R_M).sort((a, b) => a.dist - b.dist).slice(0, T.NAME_MAX).map((q) => q.key)); s.named = [...named];
    const cam = o.cam, cv = o.canvas, cr = cv && cv.getBoundingClientRect(), hr = s.host === document.body ? { left: 0, top: 0 } : s.host.getBoundingClientRect(), ox = cr ? cr.left - hr.left : 0, oy = cr ? cr.top - hr.top : 0;
    const right = cam ? V().setFromMatrixColumn(cam.matrixWorld, 0).normalize() : null, m = o.m || 1, scr = (p) => { const q = p.clone().project(cam); return q.z > 1 || q.z < -1 ? null : [ox + (q.x + 1) / 2 * cr.width, oy + (1 - q.y) / 2 * cr.height]; };
    const seen = new Set();
    for (const q of items) { const rowOn = named.has(q.key), barOn = s.members.has(q.key) && s.op > 0; let b = s.bars[q.key]; if (!rowOn && !barOn) { if (b) { b.el.remove(); delete s.bars[q.key]; } continue; }
      seen.add(q.key); b = b || plate(s, q.key, !!q.me); if (b.rowOn !== rowOn) { show(b.row, rowOn); b.rowOn = rowOn; } if (b.barOn !== barOn) { show(b.bar, barOn); b.barOn = barOn; if (!barOn) b.f = -1; } b.bar.style.opacity = barOn ? String(s.op) : '';
      if (rowOn) { const nm = q.name || '', lt = 'Lv ' + (q.level || 1), lc = lvClass(q.level, o.myLevel); if (nm !== b.name) { b.name = nm; b.nm.textContent = nm; } if (lt !== b.lvTxt) { b.lvTxt = lt; b.lv.textContent = lt; } if (lc !== b.lvCls) { if (b.lvCls) b.lv.classList.remove(b.lvCls); b.lv.classList.add(lc); b.lvCls = lc; } }
      // HP: a drop leaves the parchment trail behind (it catches up TRAIL_DELAY_S after the last hit); a heal fills at once
      const max = Math.max(1, q.max || 1), hp = Math.max(0, Math.min(max, q.hp || 0)), f = hp / max;
      if (barOn) { if (b.f < 0) { b.f = b.trail = f; b.hold = 0; b.tr.classList.remove('go'); setW(b.fl, f); setW(b.tr, f); }
        else if (f < b.f - 1e-6) { b.hold = T.TRAIL_DELAY_S; b.tr.classList.remove('go'); b.f = f; setW(b.fl, f); }
        else if (f > b.f + 1e-6) { b.f = f; setW(b.fl, f); if (b.trail < f) { b.trail = f; b.tr.classList.remove('go'); setW(b.tr, f); } }
        if (b.hold > 0 && (b.hold -= dt) <= 0) { b.hold = 0; b.trail = b.f; b.tr.classList.add('go'); setW(b.tr, b.f); }
        const txt = Math.round(hp) + '/' + Math.round(max) + (q.shield > 0 ? ' +' + Math.round(q.shield) : ''); if (txt !== b.txt) { b.txt = txt; b.num.textContent = txt; } b.hp = Math.round(hp); b.max = Math.round(max);
        b.bar.classList.toggle('low', !!q.me && hp > 0 && f < T.LOW); }
      // where: LIFT_M above its top (riding its head bone when it has one), at least MIN_GAP_PX clear of it on screen; bar width from its head (or body), clamped
      const root = q.root; let pa = null, pt = null, at = null, M = null, sc = 1; if (cam && cr && root && root.parent && root.visible !== false) { M = measure(root, q.head || null); sc = root.getWorldScale(V()).y;
        const top = M.head ? M.head.getWorldPosition(V()).add(V().set(0, (M.top - M.hy) * sc, 0)) : root.getWorldPosition(V()).add(V().set(0, M.top * sc, 0)); at = top.clone().add(V().set(0, T.LIFT_M * m, 0)); pa = scr(at); pt = scr(top); }
      if (!pa || !pt) { if (b.vis) { b.el.style.display = 'none'; b.vis = false; } continue; }
      const wW = (M.headW > 0 ? M.headW * T.HEAD_W_K : (q.me ? T.HER_HEAD_W_M * m / sc : M.bodyW * T.BODY_W_K)) * sc, pr = scr(at.clone().addScaledVector(right, wW)), wpx = Math.round(Math.max(T.MIN_W_PX, Math.min(T.MAX_W_PX, pr ? Math.abs(pr[0] - pa[0]) : T.MIN_W_PX)));
      const y = Math.min(pa[1], pt[1] - T.MIN_GAP_PX); b.x = pa[0]; b.y = y; b.gap = +(pt[1] - y).toFixed(1); if (wpx !== b.w) { b.w = wpx; b.bar.style.width = wpx + 'px'; }
      b.el.style.left = pa[0].toFixed(1) + 'px'; b.el.style.top = y.toFixed(1) + 'px'; if (!b.vis) { b.el.style.display = ''; b.vis = true; } }
    for (const k of Object.keys(s.bars)) if (!seen.has(k)) { s.bars[k].el.remove(); delete s.bars[k]; }
    return { shown: s.members.size > 0 || named.size > 0 }; }
  function clear(id) { const s = S[id]; if (!s) return; s.L.remove(); delete S[id]; }
  function state(id) { const s = S[id]; if (!s) return { on: false, fight: false, shown: false, bars: [], named: [] }; return { on: true, fight: s.fight, t: +s.t.toFixed(2), op: +s.op.toFixed(2), shown: s.members.size > 0 && s.op > 0, members: [...s.members], named: s.named.slice(),
    bars: Object.entries(s.bars).map(([k, b]) => ({ key: k, me: b.me, bar: !!b.barOn, row: !!b.rowOn, hp: b.hp, max: b.max, txt: b.txt, name: b.name, lv: b.lvTxt, lvCls: b.lvCls, fill: +b.f.toFixed(3), trail: +b.trail.toFixed(3), hold: +b.hold.toFixed(2), low: b.bar.classList.contains('low'), vis: b.vis, w: b.w, x: Math.round(b.x), y: Math.round(b.y), gap: b.gap, op: b.barOn ? +s.op.toFixed(2) : 0, inDom: !!b.el.parentNode })) }; }
  return { frame, clear, state, measure, headOf, lvClass };
})();
