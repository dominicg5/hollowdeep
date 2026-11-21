/* ===== Mosby's dialogue and the transport tortoise (Art: /workspace/mia/ui/v3/mosby_dialog, Direction B field kit) =====
   In person only (she is beside the giant and taps him): a wide leather-and-canvas bar low in the view, the brass porthole portrait over its top-left edge
   (talking / sleepy / pleased). He asks where she came from, whether she'd like her home moved (green Yes / rust No), whether she'd pay; the map opens to pick
   the spot; the trip card shows Distance, Cost (gold coin) and Time (Confirm blue / Cancel cream). Fare: 1 gold per metre of the transport tortoise's own route
   from her house to the spot. The transport tortoise (Mosby's old size) then appears at her house with the house on its back and walks straight there. */
const MosbyTalk = (() => {
  const WSf = () => Explore.WS;
  // ---- the transport tortoise's route: his own crossing rules on a 40-unit grid (lazy, built once)
  //   wades streams and shallow lake edges (water up to ~3 m, his shell line), steps over crevices up to ~1.9 m wide (his stride is ~2 m), goes round wider ones;
  //   never through a house, the town, the Lumen Tree, an ore field or ground steeper than she can walk; keeps his body (~4 m half-width) clear of them
  const TP = { g: 40, built: false };
  const STEP_W = 12, WADE_D = 20, BODY = 30;
  function tpBuild() { if (TP.built) return TP; const R = Explore.REG, g = TP.g, nx = Math.ceil((R.X1 - R.X0) / g), ny = Math.ceil((R.Y1 - R.Y0) / g), N = nx * ny, h = new Float32Array(N), cls = new Uint8Array(N).fill(1);
    Object.assign(TP, { nx, ny, N, h, cls, X0: R.X0, Y0: R.Y0 }); const cx = (i) => R.X0 + (i + 0.5) * g, cy = (j) => R.Y0 + (j + 0.5) * g;
    const lakes = (typeof GRAND !== 'undefined' && GRAND.water && GRAND.water.lakes) || [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = cx(i), y = cy(j); h[k] = M3.meshH(x, y); if (Math.hypot(x, y) > 11000) { cls[k] = 0; continue; }
      if (typeof GRAND !== 'undefined' && GRAND.wet && GRAND.wet(x, y, 0)) { let deep = false; for (const L of lakes) if (GRAND.lakeE(L, x, y) < 0 && L.wl - h[k] > WADE_D) deep = true; cls[k] = deep ? 0 : 2; } }
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const k = j * nx + i; if (!cls[k]) continue; const sl = Math.hypot(h[k + 1] - h[k - 1], h[k + nx] - h[k - nx]) / (2 * g); if (sl > 0.62) cls[k] = 0; }
    const disc = (x, y, r) => { const i0 = Math.max(0, Math.floor((x - r - R.X0) / g)), i1 = Math.min(nx - 1, Math.floor((x + r - R.X0) / g)), j0 = Math.max(0, Math.floor((y - r - R.Y0) / g)), j1 = Math.min(ny - 1, Math.floor((y + r - R.Y0) / g)); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(cx(i) - x, cy(j) - y) <= r + g * 0.71) cls[j * nx + i] = 0; };
    for (const cr of W.cracks || []) for (let q = 0; q + 1 < cr.pts.length; q++) { const a = cr.pts[q], c = cr.pts[q + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.ceil(L / 20)); for (let s = 0; s <= n; s++) { const t = s / n, w = cr.ws[q] + (cr.ws[q + 1] - cr.ws[q]) * t; if (w > STEP_W) disc(a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, w / 2 + BODY * 0.6); } }
    for (const S of (M3.solids ? M3.solids() : [])) disc(S.x, S.y, Math.max(Math.abs(S.b[0]), Math.abs(S.b[1]), Math.abs(S.b[2]), Math.abs(S.b[3])) * S.w + BODY);
    try { for (const c of Town.cols()) disc(c.x, c.y, c.r + BODY * 0.6); } catch (e) {}
    if (Explore.ORE && Explore.ORE.nodes) for (const n of Explore.ORE.nodes) disc(n.x, n.y, (n.s || 30) * 0.7 + BODY);
    const hw = W.heartwood; if (hw) disc(hw.x, hw.y, 700); const H = M3.hwx; if (H && H.rootPts) H.rootPts.forEach((P, ri) => P.forEach((q, i) => { const r = (H.rootR[ri] && H.rootR[ri][i]) || 0; if (r > 20) disc(q.x, q.z, r + BODY); }));
    TP.built = true; return TP; }
  const cellOf = (x, y) => [Math.max(0, Math.min(TP.nx - 1, Math.floor((x - TP.X0) / TP.g))), Math.max(0, Math.min(TP.ny - 1, Math.floor((y - TP.Y0) / TP.g)))];
  const cxy = (k) => [TP.X0 + ((k % TP.nx) + 0.5) * TP.g, TP.Y0 + (Math.floor(k / TP.nx) + 0.5) * TP.g];
  function comp(s) { const { nx, ny, N, cls } = TP, seen = new Int32Array(N).fill(-1), q = new Int32Array(N); let qh = 0, qt = 0; q[qt++] = s; seen[s] = 0; while (qh < qt) { const k = q[qh++], i = k % nx, j = (k / nx) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const m = b * nx + a; if (cls[m] && seen[m] < 0) { seen[m] = 0; q[qt++] = m; } } } return seen; }
  function nearFree(x, y, inC) { const [i0, j0] = cellOf(x, y); let best = -1, bd = 1e18; for (let r = 0; r < 60 && best < 0; r++) for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) { if (i < 0 || j < 0 || i >= TP.nx || j >= TP.ny) continue; if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r) continue; const k = j * TP.nx + i; if (!TP.cls[k] || (inC && inC[k] < 0)) continue; const [a, b] = cxy(k), d = Math.hypot(a - x, b - y); if (d < bd) { bd = d; best = k; } } return best; }
  function los(a, b) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / (TP.g * 0.4))); for (let s = 0; s <= n; s++) { const [i, j] = cellOf(a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n); if (!TP.cls[j * TP.nx + i]) return false; } return true; }
  function home() { const F = Explore.ledgeFront(); return F ? [F.x, F.y] : null; }
  // the route from her house to (x, y): A* on his grid, then pulled straight where he can see along it
  function route(x, y) { tpBuild(); const H = home(); if (!H) return null; const s = nearFree(H[0], H[1]); if (s < 0) return null; const C = comp(s), t = nearFree(x, y, C); if (t < 0) return null;
    const { nx, ny, N, cls } = TP, gS = new Float32Array(N).fill(1e30), from = new Int32Array(N).fill(-1), heap = [], push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } }, pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const tx = t % nx, ty = (t / nx) | 0; gS[s] = 0; push(s, 0); const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (heap.length) { const [, k] = pop(); if (k === t) break; const i = k % nx, j = (k / nx) | 0; for (const [di, dj, c] of NB) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const m = b * nx + a; if (!cls[m]) continue; if (di && dj && (!cls[j * nx + a] || !cls[b * nx + i])) continue; const ng = gS[k] + c * (cls[m] === 2 ? 1.6 : 1); if (ng < gS[m]) { gS[m] = ng; from[m] = k; push(m, ng + Math.hypot(a - tx, b - ty)); } } }
    if (from[t] < 0 && t !== s) return null; const cells = [t]; while (cells[cells.length - 1] !== s) cells.push(from[cells[cells.length - 1]]); cells.reverse(); const raw = [H, ...cells.map(cxy)];
    const pts = [raw[0]]; let i = 0; while (i < raw.length - 1) { let j = raw.length - 1; while (j > i + 1 && !los(raw[i], raw[j])) j--; pts.push(raw[j]); i = j; }
    let L = 0; for (let q = 1; q < pts.length; q++) L += Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]); const m = L / WSf(), v = Mosby.tSpeed() / WSf();
    let wade = 0, steps = 0; for (let q = 1; q < pts.length; q++) { const a = pts[q - 1], b = pts[q], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 20); let inCr = false; for (let k2 = 0; k2 <= n; k2++) { const x2 = a[0] + (b[0] - a[0]) * k2 / n, y2 = a[1] + (b[1] - a[1]) * k2 / n, [ci, cj] = cellOf(x2, y2); if (cls[cj * nx + ci] === 2) wade++; const w = crackW(x2, y2); if (w && !inCr) steps++; inCr = !!w; } }
    return { pts, len: L, metres: Math.round(m), fee: Math.round(m), eta: m / v, dest: pts[pts.length - 1], wade: wade * 20 / WSf(), steps }; }
  function crackW(x, y) { for (const cr of W.cracks || []) for (let q = 0; q + 1 < cr.pts.length; q++) { const a = cr.pts[q], c = cr.pts[q + 1]; if (Math.abs(a[0] - x) > 300 || Math.abs(a[1] - y) > 300) continue; const dx = c[0] - a[0], dy = c[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)), w = cr.ws[q] + (cr.ws[q + 1] - cr.ws[q]) * t; if (Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t) < w / 2) return w; } return 0; }
  // ---- gold (seeded for the trip)
  const gold = () => { if (S.gold == null) S.gold = 2500; return S.gold; };
  const fmtT = (s) => { const m = Math.max(1, Math.round(s / 60)); return m >= 60 ? Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min' : m + ' min'; };
  // ---- the panel
  const ST = { el: null, step: null, card: null, trip: null };
  const CSS = `#mosDlg{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);transform:translateX(-50%);width:min(540px,calc(100% - 16px));z-index:61;font:16px Georgia,"Iowan Old Style",serif;color:#33200f;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}
#mosDlg.hidden,#mosCard.hidden{display:none}#mosDlg .mdBar{position:relative;margin-top:54px;border:18px solid transparent;border-image:url(assets/ui/kit_leather.webp) 62 fill / 18px stretch;border-radius:10px;box-shadow:0 0 0 3px #4f5a2e}
#mosDlg .mdBar:before,#mosDlg .mdBar:after,#mosDlg .mdC1,#mosDlg .mdC2,#mosCard .mcBox:before,#mosCard .mcBox:after,#mosCard .mcC1,#mosCard .mcC2{content:'';position:absolute;width:22px;height:22px;border:5px solid #c99a45;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}
#mosDlg .mdBar:before,#mosCard .mcBox:before{left:-14px;top:-14px;border-right:0;border-bottom:0;border-radius:6px 0 0 0}#mosDlg .mdBar:after,#mosCard .mcBox:after{right:-14px;top:-14px;border-left:0;border-bottom:0;border-radius:0 6px 0 0}
#mosDlg .mdC1,#mosCard .mcC1{left:-14px;bottom:-14px;border-right:0;border-top:0;border-radius:0 0 0 6px}#mosDlg .mdC2,#mosCard .mcC2{right:-14px;bottom:-14px;border-left:0;border-top:0;border-radius:0 0 6px 0}
#mosDlg .mdWell{position:relative;min-height:80px;padding:12px 44px 12px 96px;border-radius:8px;background:linear-gradient(#f8ecd0,#ecd9b0);box-shadow:inset 0 2px 5px rgba(90,50,20,.35);outline:1.5px dashed rgba(140,96,48,.7);outline-offset:-6px}
#mosDlg .mdWell p{margin:0;line-height:1.38;min-height:44px}#mosDlg .mdName{position:absolute;left:104px;top:-36px;padding:3px 14px;border-radius:8px;background:linear-gradient(#e7c27a,#b9863e);color:#3a2412;font:700 14px Georgia,serif;box-shadow:0 0 0 2px #6e4a1c,0 2px 4px rgba(0,0,0,.4)}
#mosDlg .mdPort{position:absolute;left:-6px;top:-4px;width:100px;height:100px;border-radius:50%;z-index:2;background:#f6efe0 center/cover no-repeat;box-shadow:0 0 0 6px #b07a34,0 0 0 8px #e6bb68,0 0 0 10px #6e4a1c,inset 0 2px 6px rgba(0,0,0,.35)}
#mosDlg .mdPort i{position:absolute;width:6px;height:6px;border-radius:50%;background:#f3d28a;box-shadow:0 0 0 1px #6e4a1c}
#mosDlg .mdPip{position:absolute;right:10px;bottom:10px;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#e6bb68,#9a6a2a);box-shadow:0 0 0 2px #6e4a1c;animation:mdBob 1s ease-in-out infinite}
#mosDlg .mdPip:after{content:'';position:absolute;left:7px;top:6px;width:7px;height:7px;border-right:2.5px solid #3a2412;border-bottom:2.5px solid #3a2412;transform:rotate(45deg)}@keyframes mdBob{50%{transform:translateY(3px)}}
#mosDlg .mdBtns{display:flex;gap:16px;justify-content:center;margin-top:8px}.mdB{min-width:78px;min-height:46px;padding:4px 18px;border-radius:24px;border:0;font:700 16px Georgia,serif;cursor:pointer;box-shadow:0 0 0 3px #b07a34,0 0 0 5px #6e4a1c,0 3px 5px rgba(0,0,0,.45),inset 0 2px 3px rgba(255,255,255,.35)}
.mdB.yes{background:radial-gradient(120% 95% at 50% 22%,#9bb36a,#5b7a32 55%,#3b521e);color:#f4f0dc}.mdB.no{background:radial-gradient(120% 95% at 50% 22%,#e2785a,#a8442c 55%,#702a18);color:#fbeee0}
.mdB.blue{background:radial-gradient(120% 95% at 50% 22%,#5d8ec4,#2e5f96 55%,#1c3d66);color:#f4f0dc}.mdB.cream{background:radial-gradient(120% 95% at 50% 22%,#fff6e0,#ecd9b0 60%,#cdb486);color:#3a2412}.mdB[disabled]{opacity:.45}
#mosCard{position:absolute;inset:0;z-index:62;display:flex;align-items:center;justify-content:center;background:rgba(10,8,6,.35);font:16px Georgia,serif;color:#33200f}
#mosCard .mcBox{position:relative;width:min(330px,calc(100% - 40px));padding:14px 18px 18px;border:16px solid transparent;border-image:url(assets/ui/kit_leather.webp) 62 fill / 16px stretch;border-radius:12px;box-shadow:0 0 0 3px #4f5a2e,0 10px 24px rgba(0,0,0,.5)}
#mosCard h3{margin:0 0 10px;text-align:center;font:700 26px Georgia,serif;color:#3a2412;text-shadow:0 1px 0 rgba(255,230,180,.5)}#mosCard .mcRow{display:flex;align-items:center;justify-content:space-between;min-height:48px;margin:9px 0;padding:6px 14px;border-radius:10px;background:linear-gradient(#f8ecd0,#ecd9b0);box-shadow:inset 0 2px 4px rgba(90,50,20,.3);outline:1.5px dashed rgba(140,96,48,.7);outline-offset:-5px;font-size:19px}
#mosCard .mcRow b{font-weight:700}#mosCard .mcRow img{width:30px;height:30px;margin-left:8px;vertical-align:middle}#mosCard .mcFoot{display:flex;gap:18px;justify-content:center;margin-top:16px}#mosCard .mcNote{text-align:center;font-size:13px;margin-top:8px;color:#f6e7c4;text-shadow:0 1px 1px #000}`;
  function el() { if (ST.el) return ST.el; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); const d = document.createElement('div'); d.id = 'mosDlg'; d.className = 'hidden'; d.setAttribute('role', 'dialog');
    d.innerHTML = '<div class="mdPort"></div><div class="mdBar"><span class="mdC1"></span><span class="mdC2"></span><div class="mdName">Mosby</div><div class="mdWell"><p></p><i class="mdPip"></i><div class="mdBtns"></div></div></div>';
    const port = d.querySelector('.mdPort'); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, r = 55; const b = document.createElement('i'); b.style.left = 50 + Math.cos(a) * r - 3 + 'px'; b.style.top = 50 + Math.sin(a) * r - 3 + 'px'; port.appendChild(b); }
    for (const e of ['pointerdown', 'pointerup', 'touchstart']) d.addEventListener(e, (ev) => ev.stopPropagation()); d.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('button'); if (b) return act(b.dataset.a); if (ST.step && ST.step.next) go(ST.step.next); });
    (document.getElementById('cityWrap') || document.body).appendChild(d); return (ST.el = d); }
  // the conversation: warm, sleepy; each step: face, line, then either a tap-to-continue (next) or buttons
  const STEPS = {
    hello: { face: 'sleepy', say: 'Mmm\u2026 oh. Hello down there, little one. Mind my toes\u2026 they\u2019re older than the hills.', next: 'from' },
    from: { face: 'talking', say: 'Where have you come from, on such small feet?', btn: [['From my Ledge', 'ledge', 'cream'], ['Just wandering', 'wander', 'cream']] },
    ledge: { face: 'pleased', say: 'The Ledge\u2026 I remember it. Pretty cliffs. Sleepy cliffs. Good for napping.', next: 'move' },
    wander: { face: 'sleepy', say: 'Wandering is good. I wander too\u2026 only very, very slowly.', next: 'move' },
    move: { face: 'talking', say: 'My little cousin carries houses on his back. Would you like him to move your home somewhere new?', btn: [['Yes', 'pay', 'yes'], ['No', 'nomove', 'no']] },
    nomove: { face: 'sleepy', say: 'Mm. Another time, then. I\u2019ll be plodding round here\u2026 I always am.', end: true },
    pay: { face: 'talking', say: 'He asks one gold for every metre he walks. Would you pay that?', btn: [['Yes', 'pick', 'yes'], ['No', 'nopay', 'no']] },
    nopay: { face: 'sleepy', say: 'Fair enough. Gold is heavy. So is a house, mind\u2026', end: true },
    pick: { face: 'pleased', say: 'Lovely. Show me on the map where you\u2019d like to live.', next: '@map' },
    sent: { face: 'pleased', say: 'He\u2019s on his way. Your house rides on his back \u2014 he\u2019ll go gently.', end: true },
    poor: { face: 'sleepy', say: 'Ah\u2026 not quite enough gold for that walk. A nearer spot, perhaps?', next: '@map' },
    busy: { face: 'sleepy', say: 'He\u2019s still carrying your house, little one. Let him finish first\u2026', end: true } };
  function go(id) { if (id === '@map') return pickMap(); const s = STEPS[id]; if (!s) return close(); ST.step = Object.assign({ id }, s); const d = el(); d.classList.remove('hidden'); d.querySelector('.mdPort').style.backgroundImage = `url(assets/ui/mosby/${s.face}.webp)`; d.querySelector('.mdWell p').textContent = s.say;
    d.querySelector('.mdPip').style.display = s.next || s.end ? '' : 'none'; d.querySelector('.mdBtns').innerHTML = (s.btn || []).map(([t, a, c]) => `<button class="mdB ${c}" data-a="${a}">${t}</button>`).join(''); if (s.end) ST.step.next = '@close'; }
  function act(a) { if (a === '@close') return close(); if (a === 'confirm') return confirm(); if (a === 'cancel') return closeCard(); go(a); }
  function open() { if (Mosby.GM) Mosby.GM.hold = true; if (S.mosbyTrip && !S.mosbyTrip.done) return go('busy'); go('hello'); return true; }
  function close() { if (ST.el) ST.el.classList.add('hidden'); ST.step = null; if (Mosby.GM) Mosby.GM.hold = false; }
  // map: pick the spot, then the trip card
  function pickMap() { if (ST.el) ST.el.classList.add('hidden'); if (typeof ExMap === 'undefined' || !ExMap.pick) return close(); ExMap.pick((x, y) => card(x, y), () => close()); }
  function card(x, y) { const R = route(x, y); if (!R) { go('poor'); return null; } ST.trip = R; let c = document.getElementById('mosCard'); if (!c) { c = document.createElement('div'); c.id = 'mosCard'; c.className = 'hidden'; (document.getElementById('cityWrap') || document.body).appendChild(c); c.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('button'); if (b) act(b.dataset.a); }); for (const e of ['pointerdown', 'pointerup', 'touchstart']) c.addEventListener(e, (ev) => ev.stopPropagation()); }
    const g = gold(), ok = g >= R.fee; c.innerHTML = `<div class="mcBox"><span class="mcC1"></span><span class="mcC2"></span><h3>Trip</h3><div class="mcRow"><span>Distance</span><b data-v="dist">${R.metres} m</b></div><div class="mcRow"><span>Cost</span><b data-v="cost">${R.fee}<img src="assets/ui/mosby/coin.webp" alt="gold"></b></div><div class="mcRow"><span>Time</span><b data-v="time">${fmtT(R.eta)}</b></div>
      <div class="mcFoot"><button class="mdB blue" data-a="confirm"${ok ? '' : ' disabled'}>Confirm</button><button class="mdB cream" data-a="cancel">Cancel</button></div><div class="mcNote">${ok ? `You have ${g} gold` : `Not enough gold \u2014 you have ${g}`}</div></div>`; c.classList.remove('hidden'); return R; }
  function closeCard() { const c = document.getElementById('mosCard'); if (c) c.classList.add('hidden'); ST.trip = null; close(); }
  function confirm() { const R = ST.trip; if (!R || gold() < R.fee) return; S.gold -= R.fee; S.mosbyTrip = { pts: R.pts.map(([x, y]) => [Math.round(x), Math.round(y)]), len: R.len, fee: R.fee, eta: R.eta, t0: Date.now(), done: false }; try { save(); } catch (e) {} const c = document.getElementById('mosCard'); if (c) c.classList.add('hidden'); ST.trip = null; go('sent'); return S.mosbyTrip; }
  return { TP, tpBuild, route, gold, open, close, go, card, confirm, closeCard, fmtT, crackW, get step() { return ST.step && ST.step.id; }, STEP_W, WADE_D };
})();
