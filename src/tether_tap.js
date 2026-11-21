// ---- tap-a-tether: tap one of her own laid tethers (the Ledge line, a drop or a drill tether) on the map -> a small field-kit bubble (Art's B_* skin:
// moss canvas, brass close, enamel buttons) at the rope offering a teleport to its start (the Ledge door) or its end, each with its name. Standing near
// one end, it only offers the other. Reuses Explore.teleportTo; the rope's hit band is generous (HIT px either side of the drawn line).
const TetherTap = (() => {
  const HIT = 30, NEAR_M = 30, ST = { el: null, T: null };
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KI = { main: '🪢', drill: '🛠️', drop: '🪝' }, KN = { main: 'Ledge Tether', drill: 'Drill tether', drop: 'Drop tether' };
  function routes() { return typeof Explore !== 'undefined' && Explore.tetherRoutes ? Explore.tetherRoutes() : []; }
  // nearest rope to a screen point: each route sampled every ~3 m on the ground it drapes over, projected, then point-to-segment distance in px
  function hitAt(sx, sy) { if (typeof M3 === 'undefined' || !M3.project) return null; const WS = Explore.WS; let best = null;
    for (const T of routes()) { let prev = null; for (let i = 1; i < T.pts.length; i++) { const a = T.pts[i - 1], b = T.pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (WS * 3)));
        for (let k = i === 1 ? 0 : 1; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n, p = M3.project(x, y, WS * 0.3); if (p[0] < -999) { prev = null; continue; }
          if (prev) { const vx = p[0] - prev[0], vy = p[1] - prev[1], l2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((sx - prev[0]) * vx + (sy - prev[1]) * vy) / l2)), d = Math.hypot(prev[0] + vx * u - sx, prev[1] + vy * u - sy);
            if (d < HIT && (!best || d < best.d)) best = { T, d, x: prev[2] + (x - prev[2]) * u, y: prev[3] + (y - prev[3]) * u }; }
          prev = [p[0], p[1], x, y]; } } }
    return best; }
  function options(T) { const h = Explore.here && Explore.here(), WS = Explore.WS; if (!h) return [T.a, T.b]; const da = Math.hypot(h[0] - T.a.x, h[1] - T.a.y) / WS, db = Math.hypot(h[0] - T.b.x, h[1] - T.b.y) / WS;
    if (da < NEAR_M && da <= db) return [T.b]; if (db < NEAR_M) return [T.a]; return [T.a, T.b]; }
  function el() { if (ST.el) return ST.el; const d = document.createElement('div'); d.id = 'tetherBub'; d.className = 'kKit hidden'; d.setAttribute('role', 'dialog'); (document.getElementById('cityWrap') || document.body).appendChild(d);
    for (const e of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup']) d.addEventListener(e, (ev) => ev.stopPropagation());
    d.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('button'); if (!b) return; if (b.dataset.k === 'close') return close(); go(b.dataset.k); }); return (ST.el = d); }
  function open(T, sx, sy) { ST.T = T; const d = el(), O = options(T), lbl = (o) => (o === T.a ? 'Start' : 'End');
    d.innerHTML = `<div class="tbTop"><span class="tbI">${KI[T.kind] || '🪢'}</span><span class="tbN"><b>${esc(T.name)}</b><small>${KN[T.kind] || 'Tether'}</small></span><button class="kX tbX" data-k="close" aria-label="Close">✕</button></div>` +
      O.map((o) => `<button class="tbGo kBlue" data-k="${o.key}" data-side="${lbl(o).toLowerCase()}"><span>✨</span><b>Teleport to ${lbl(o).toLowerCase()}</b><small>${esc(o.name)}</small></button>`).join('') + '<i class="tbTail"></i>';
    d.classList.remove('hidden'); const P = d.parentElement.getBoundingClientRect(), w = d.offsetWidth, hgt = d.offsetHeight; let x = sx - w / 2, y = sy - hgt - 22, up = true; if (y < 8) { y = sy + 22; up = false; }
    x = Math.max(8, Math.min(P.width - w - 8, x)); d.style.left = x + 'px'; d.style.top = y + 'px'; d.classList.toggle('below', !up); d.style.setProperty('--tx', Math.max(18, Math.min(w - 18, sx - x)) + 'px'); return true; }
  function close() { if (ST.el) ST.el.classList.add('hidden'); ST.T = null; }
  function go(key) { close(); if (typeof Explore !== 'undefined' && Explore.teleportTo) Explore.teleportTo(key); }
  // Explore.tap calls this after ore / town folk / doors and before a plain walk: a tap on her rope opens the bubble, any other tap closes it
  function tap(sx, sy) { const was = !!ST.T; close(); const H = hitAt(sx, sy); if (!H) return was ? 'tetherClose' : null; open(H.T, sx, sy); return 'tether'; }
  return { HIT, NEAR_M, hitAt, routes, options, open, close, tap, go, get T() { return ST.T; }, get el() { return ST.el; } };
})();
