
/* =====================================================================
   RIM CITY — static painting (cached in tiles)
   ===================================================================== */
const FOG = [62, 88, 84];
function groundRGB(x, y) {
  const f = regionF(x, y), i = Math.floor(f) % NREG, fr = f - Math.floor(f);
  let c = REGIONS[i].ground;
  const edge = 0.14;
  if (fr > 1 - edge) { const n = REGIONS[(i + 1) % NREG].ground, t = (fr - (1 - edge)) / (2 * edge); c = mix(c, n, t); }
  else if (fr < edge) { const p = REGIONS[(i + NREG - 1) % NREG].ground, t = (edge - fr) / (2 * edge); c = mix(c, p, t); }
  const n = 0.9 + vnoise(x / 140, y / 140) * 0.14 + vnoise(x / 40, y / 40) * 0.05;
  c = [c[0] * n, c[1] * n, c[2] * n];
  const hd = hollowDist(x, y); if (hd < 140) c = mix(c, [205, 182, 138], clamp(1 - hd / 140, 0, 1) * 0.55);
  const r = Math.hypot(x, y); if (r > CITY.R - 250) c = mix(c, FOG, clamp((r - (CITY.R - 250)) / 500, 0, 1));
  return c;
}
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
const gsCanvas = document.createElement('canvas'); const GSN = 24; gsCanvas.width = gsCanvas.height = GSN + 2; const gsCtx = gsCanvas.getContext('2d'); const gsImg = gsCtx.createImageData(GSN + 2, GSN + 2);

function drawStatic(c, x0, y0, x1, y1, s) {
  const ws = x1 - x0, cell = ws / GSN;
  // 1. Ground: tiny smooth-scaled color field = soft painterly blends
  for (let j = 0; j < GSN + 2; j++) for (let i = 0; i < GSN + 2; i++) { const col = groundRGB(x0 + (i - 0.5) * cell, y0 + (j - 0.5) * cell), o = (j * (GSN + 2) + i) * 4; gsImg.data[o] = col[0]; gsImg.data[o + 1] = col[1]; gsImg.data[o + 2] = col[2]; gsImg.data[o + 3] = 255; }
  gsCtx.putImageData(gsImg, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(gsCanvas, 1, 1, GSN, GSN, x0, y0, ws, ws);
  // painterly flecks
  if (s >= 0.25) { const rr = mulberry32(Math.floor(x0 * 13 + y0 * 7 + s * 1000)); c.lineCap = 'round';
    for (let k = 0; k < 70; k++) { const x = x0 + rr() * ws, y = y0 + rr() * ws; const g = groundRGB(x, y); c.strokeStyle = shade(g, rr() < 0.5 ? 1.12 : 0.86); c.globalAlpha = 0.5; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5 + rr() * 6, y + (rr() - 0.5) * 4); c.stroke(); }
    c.globalAlpha = 1; }
  const objs = queryObjs(x0, y0, x1, y1);
  // 2. decals
  for (const o of objs) if (o.layer === 0) drawDecal(c, o, s);
  // 3. water
  if (boxHit([x0, y0, x1, y1], W.lake.x - 400, W.lake.y - 400, W.lake.x + 400, W.lake.y + 400) || true) drawWater(c, x0, y0, x1, y1, s);
  // 4. the Hollow
  if (x1 > -CITY.hollowR * 1.4 && x0 < CITY.hollowR * 1.4 && y1 > -CITY.hollowR * 1.4 && y0 < CITY.hollowR * 1.4) drawHollow(c, s);
  // 5. cracks
  for (const k of W.cracks) if (boxHit(k.bbox, x0, y0, x1, y1)) drawCrack(c, k, s);
  // 6. lift cables
  c.lineCap = 'round';
  for (const L of W.lifts) if (boxHit(bboxOf([[L.x, L.y], [L.bx, L.by]], 10), x0, y0, x1, y1)) { c.strokeStyle = 'rgba(60,45,30,.7)'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(L.x, L.y); c.lineTo(L.bx, L.by); c.stroke(); c.strokeStyle = 'rgba(255,220,140,.35)'; c.lineWidth = 0.8; c.stroke(); }
  // 7. roads & bridges
  for (const rd of W.roads) if (boxHit(rd.bbox, x0, y0, x1, y1)) drawRoad(c, rd, s, x0, y0, x1, y1);
  // 8. objects by y
  const l1 = objs.filter((o) => o.layer === 1 && !o.isPlayer).sort((a, b) => a.y - b.y);
  for (const o of l1) drawObj(c, o, s);
}
function boxHit(b, x0, y0, x1, y1) { return b[2] >= x0 && b[0] <= x1 && b[3] >= y0 && b[1] <= y1; }
function pathPoly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }

function drawWater(c, x0, y0, x1, y1, s) {
  const L = W.lake;
  if (boxHit([L.x - 420, L.y - 420, L.x + 420, L.y + 420], x0, y0, x1, y1)) {
    pathPoly(c, W.lakePts); c.fillStyle = '#d8c9a0'; c.save(); c.lineWidth = 22; c.strokeStyle = 'rgba(214,198,150,.9)'; c.stroke(); c.restore();
    const g = c.createRadialGradient(L.x, L.y, 20, L.x, L.y, L.r * 1.2); g.addColorStop(0, '#3f7f9e'); g.addColorStop(0.7, '#5d9bb3'); g.addColorStop(1, '#8cc3c9');
    c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.stroke();
  }
  // river
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = '#d6c696'; c.lineWidth = 58; polyStroke(c, W.river);
  c.strokeStyle = '#5d9bb3'; c.lineWidth = 42; polyStroke(c, W.river);
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 6; polyStroke(c, W.river);
}
function polyStroke(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }

const HOLLOW_BANDS = [[1.0, '#7a6448'], [0.93, '#5b5048'], [0.84, '#46464e'], [0.74, '#36405a'], [0.63, '#2a3452'], [0.52, '#1f2846'], [0.4, '#18203a'], [0.28, '#121830']];
function drawHollow(c, s) {
  // rim lip
  c.save();
  const scaled = (f, dx, dy) => W.hollowPts.map((p) => [p[0] * f + dx, p[1] * f + dy]);
  pathPoly(c, scaled(1.04, 0, 0)); c.fillStyle = '#cdb68a'; c.fill();
  HOLLOW_BANDS.forEach(([f, col], i) => {
    const pts = scaled(f, 0, (1 - f) * 70 * 0.4); pathPoly(c, pts); c.fillStyle = col; c.fill();
    if (s > 0.08) { c.strokeStyle = 'rgba(255,230,180,' + (0.22 - i * 0.02) + ')'; c.lineWidth = 3; c.stroke(); }
  });
  // terraced ledge texture
  if (s > 0.12) { const rr = mulberry32(99); c.strokeStyle = 'rgba(255,240,200,.08)'; c.lineWidth = 2;
    for (let k = 0; k < 160; k++) { const a = rr() * TAU, f = 0.3 + rr() * 0.68, r = hollowR(a) * f; const [x, y] = polar(r, a); c.beginPath(); c.arc(0, (1 - f) * 28, r, a, a + 0.05 + rr() * 0.12); c.stroke(); } }
  // deep glow
  const g = c.createRadialGradient(0, 40, 10, 0, 40, CITY.hollowR * 0.55); g.addColorStop(0, 'rgba(255,214,120,.55)'); g.addColorStop(0.4, 'rgba(255,190,90,.18)'); g.addColorStop(1, 'rgba(255,190,90,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 40, CITY.hollowR * 0.55, 0, TAU); c.fill();
  // distant lights of other delvers' outposts
  const rr = mulberry32(7); for (let k = 0; k < 90; k++) { const a = rr() * TAU, f = 0.3 + rr() * 0.62; const [x, y] = polar(hollowR(a) * f, a); c.fillStyle = `rgba(255,${200 + Math.floor(rr() * 50)},120,${0.5 + rr() * 0.4})`; c.beginPath(); c.arc(x, y + (1 - f) * 28, 2.2 + rr() * 2, 0, TAU); c.fill(); }
  c.restore();
}
function drawCrack(c, k, s) {
  pathPoly(c, k.poly); c.fillStyle = '#cdb68a'; c.save(); c.lineWidth = k.wide ? 14 : 7; c.strokeStyle = 'rgba(205,182,138,.9)'; c.lineJoin = 'round'; c.stroke(); c.restore();
  c.fillStyle = k.wide ? '#1d2236' : '#2a2a34'; c.fill();
  if (s > 0.1) { c.save(); c.clip(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = 'rgba(70,64,80,.9)'; c.lineWidth = Math.max(...k.ws) * 0.55; polyStroke(c, k.pts.map((p) => [p[0] + 3, p[1] + 4]));
    c.strokeStyle = k.wide ? 'rgba(255,212,107,.35)' : 'rgba(255,212,107,.22)'; c.lineWidth = k.wide ? 6 : 2; polyStroke(c, k.pts); c.restore(); }
}
function drawRoad(c, rd, s, x0, y0, x1, y1) {
  const wOuter = rd.kind === 'promenade' ? 30 : rd.kind === 'ring' ? 25 : 21, wInner = wOuter - 6;
  const col = rd.kind === 'promenade' ? ['#9b8564', '#e3d4b0'] : ['#8f7650', '#d6c194'];
  c.lineCap = 'round'; c.lineJoin = 'round';
  const runs = []; let cur = null;
  for (let i = 0; i < rd.pts.length - 1; i++) {
    const p = rd.pts[i], q = rd.pts[i + 1];
    if (Math.max(p[0], q[0]) < x0 - 40 || Math.min(p[0], q[0]) > x1 + 40 || Math.max(p[1], q[1]) < y0 - 40 || Math.min(p[1], q[1]) > y1 + 40) { cur = null; continue; }
    if (rd.bridge[i]) { cur = null; drawBridge(c, p, q, wOuter, s); continue; }
    if (!cur) { cur = [p]; runs.push(cur); } cur.push(q);
  }
  for (const pass of [0, 1, 2]) for (const run of runs) {
    if (pass === 0) { c.strokeStyle = col[0]; c.lineWidth = wOuter; }
    else if (pass === 1) { c.strokeStyle = col[1]; c.lineWidth = wInner; }
    else { if (s < 0.3) continue; c.strokeStyle = 'rgba(120,95,60,.18)'; c.lineWidth = 1.5; c.setLineDash([6, 10]); }
    polyStroke(c, run); c.setLineDash([]);
  }
}
function drawBridge(c, p, q, w, s) {
  const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
  c.save(); c.translate(p[0], p[1]); c.rotate(ang);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-2, -w / 2 + 6, len + 4, w);
  c.fillStyle = '#8a6440'; c.fillRect(-2, -w / 2, len + 4, w);
  if (s > 0.2) { c.strokeStyle = '#5e4128'; c.lineWidth = 1.2; for (let d = 0; d < len; d += 5) { c.beginPath(); c.moveTo(d, -w / 2); c.lineTo(d, w / 2); c.stroke(); } }
  c.fillStyle = '#4b3420'; c.fillRect(-2, -w / 2 - 2, len + 4, 3); c.fillRect(-2, w / 2 - 1, len + 4, 3);
  c.restore();
}

function blob(c, x, y, r, seed, n) { const rr = mulberry32(Math.floor(seed * 1e6)); c.beginPath(); n = n || 9; for (let i = 0; i <= n; i++) { const a = (i / n) * TAU, rad = r * (0.75 + rr() * 0.35); const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); }
function drawDecal(c, o, s) {
  switch (o.type) {
    case 'dune': c.save(); c.translate(o.x, o.y); c.rotate(o.a); c.lineCap = 'round';
      c.strokeStyle = 'rgba(180,140,80,.35)'; c.lineWidth = 7; c.beginPath(); c.arc(0, 4, o.r, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      c.strokeStyle = 'rgba(255,245,215,.55)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, o.r, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.restore(); break;
    case 'cliff': for (let i = 0; i < 4; i++) { blob(c, o.x + i * 4, o.y + i * 5, o.r * (1 - i * 0.2), o.seed + i); c.fillStyle = shade([150, 146, 132], 0.88 + i * 0.08); c.fill(); if (s > 0.15) { c.strokeStyle = 'rgba(80,75,65,.35)'; c.lineWidth = 2; c.stroke(); } } break;
    case 'field': { c.save(); c.translate(o.x, o.y); c.rotate(o.a); const w = o.r * 1.6, h = o.r * 1.1; const base = o.c < 0.33 ? [214, 186, 90] : o.c < 0.66 ? [170, 186, 96] : [196, 160, 86];
      c.fillStyle = shade(base, 1); c.fillRect(-w / 2, -h / 2, w, h); if (s > 0.12) { c.strokeStyle = shade(base, 0.82); c.lineWidth = 2; for (let x = -w / 2 + 4; x < w / 2; x += 7) { c.beginPath(); c.moveTo(x, -h / 2); c.lineTo(x, h / 2); c.stroke(); } }
      c.strokeStyle = 'rgba(90,110,60,.6)'; c.lineWidth = 3; c.strokeRect(-w / 2, -h / 2, w, h); c.restore(); break; }
    case 'mosspatch': { const g = c.createRadialGradient(o.x, o.y, 2, o.x, o.y, o.r); g.addColorStop(0, 'rgba(200,255,170,.55)'); g.addColorStop(1, 'rgba(160,230,140,0)'); c.fillStyle = g; c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill(); break; }
    case 'cracked': { c.strokeStyle = 'rgba(70,35,20,.45)'; c.lineWidth = 1.6; const rr = mulberry32(Math.floor(o.seed * 1e6)); for (let i = 0; i < 5; i++) { c.beginPath(); let x = o.x, y = o.y; c.moveTo(x, y); let a = rr() * TAU; for (let k = 0; k < 4; k++) { a += (rr() - 0.5) * 1.2; x += Math.cos(a) * 9; y += Math.sin(a) * 9; c.lineTo(x, y); } c.stroke(); } break; }
    case 'scree': { const rr = mulberry32(Math.floor(o.seed * 1e6)); c.fillStyle = 'rgba(90,85,110,.35)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(o.x + (rr() - 0.5) * o.r * 1.6, o.y + (rr() - 0.5) * o.r * 1.6, 2 + rr() * 3, 0, TAU); c.fill(); } break; }
    case 'reeds': { c.strokeStyle = '#5f8a4a'; c.lineWidth = 1.5; const rr = mulberry32(Math.floor(o.seed * 1e6)); for (let i = 0; i < 7; i++) { const x = o.x + (rr() - 0.5) * 18, y = o.y + (rr() - 0.5) * 18; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rr() - 0.5) * 5, y - 7); c.stroke(); } break; }
    case 'shrooms': { c.fillStyle = '#c8634c'; c.beginPath(); c.arc(o.x, o.y, 3, 0, TAU); c.arc(o.x + 6, o.y + 3, 2.4, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.fillRect(o.x - 1, o.y - 1, 1.5, 1.5); break; }
    case 'leaves': { const rr = mulberry32(Math.floor(o.seed * 1e6)); for (let i = 0; i < 10; i++) { c.fillStyle = ['#d8762f', '#c9822f', '#b0573a', '#e2b04a'][i % 4]; c.globalAlpha = 0.6; c.beginPath(); c.ellipse(o.x + (rr() - 0.5) * o.r * 1.6, o.y + (rr() - 0.5) * o.r * 1.6, 3, 1.8, rr() * 3, 0, TAU); c.fill(); } c.globalAlpha = 1; break; }
  }
}
function shadowCircle(c, x, y, r) { c.fillStyle = 'rgba(40,30,20,.22)'; c.beginPath(); c.ellipse(x + r * 0.35, y + r * 0.45, r, r * 0.85, 0, 0, TAU); c.fill(); }
function canopy(c, x, y, r, col, s) {
  shadowCircle(c, x, y, r);
  if (s < 0.12) { c.fillStyle = shade(col, 1); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); return; }
  c.fillStyle = shade(col, 0.8); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = shade(col, 1); c.beginPath(); c.arc(x - r * 0.15, y - r * 0.2, r * 0.75, 0, TAU); c.fill();
  c.fillStyle = shade(col, 1.18); c.beginPath(); c.arc(x - r * 0.35, y - r * 0.4, r * 0.35, 0, TAU); c.fill();
}
function drawObj(c, o, s) {
  switch (o.type) {
    case 'home': return drawHome(c, o, s);
    case 'tree': { const col = o.autumn ? [210, 120, 50] : o.mossy ? [96, 160, 104] : REGIONS[o.region].key === 'docks' ? [92, 150, 100] : [70, 120, 70]; canopy(c, o.x, o.y, o.r, col, s); if (o.mossy && s > 0.2) { c.fillStyle = 'rgba(220,255,180,.7)'; c.beginPath(); c.arc(o.x + 3, o.y - 2, 1.6, 0, TAU); c.arc(o.x - 4, o.y + 3, 1.3, 0, TAU); c.fill(); } return; }
    case 'orchard': canopy(c, o.x, o.y, o.r, [130, 140, 60], s); if (s > 0.2) { c.fillStyle = '#e2902f'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(o.x + Math.cos(i * 1.3) * o.r * 0.55, o.y + Math.sin(i * 1.3) * o.r * 0.55, 1.8, 0, TAU); c.fill(); } } return;
    case 'pine': { shadowCircle(c, o.x, o.y, o.r * 0.9); const col = REGIONS[o.region].key === 'bluffs' ? [70, 100, 80] : [52, 96, 66];
      for (let i = 0; i < 3; i++) { const r = o.r * (1 - i * 0.28); c.fillStyle = shade(col, 0.85 + i * 0.15); c.beginPath(); for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + i * 0.3, rr = k % 2 ? r * 0.7 : r; k ? c.lineTo(o.x + Math.cos(a) * rr, o.y - i * 2 + Math.sin(a) * rr) : c.moveTo(o.x + Math.cos(a) * rr, o.y - i * 2 + Math.sin(a) * rr); } c.closePath(); c.fill(); } return; }
    case 'palm': { shadowCircle(c, o.x, o.y, 8); c.strokeStyle = '#5f8a4a'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.beginPath(); c.moveTo(o.x, o.y); c.quadraticCurveTo(o.x + Math.cos(a) * 8, o.y + Math.sin(a) * 8 - 3, o.x + Math.cos(a) * 13, o.y + Math.sin(a) * 13); c.stroke(); } c.fillStyle = '#7a5a30'; c.beginPath(); c.arc(o.x, o.y, 2.5, 0, TAU); c.fill(); return; }
    case 'deadtree': c.strokeStyle = '#4a3528'; c.lineWidth = 2; c.lineCap = 'round'; for (let i = 0; i < 4; i++) { const a = i * 1.7 + o.seed * 6; c.beginPath(); c.moveTo(o.x, o.y); c.lineTo(o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r); c.stroke(); } return;
    case 'rock': case 'boulder': { shadowCircle(c, o.x, o.y, o.r); const col = REGIONS[o.region].key === 'crystal' ? [110, 105, 130] : REGIONS[o.region].key === 'badlands' ? [130, 92, 72] : REGIONS[o.region].key === 'dunes' ? [190, 160, 112] : [150, 146, 136];
      blob(c, o.x, o.y, o.r, o.seed, 7); c.fillStyle = shade(col, 0.95); c.fill(); if (s > 0.15) { blob(c, o.x - o.r * 0.2, o.y - o.r * 0.25, o.r * 0.55, o.seed + 1, 6); c.fillStyle = shade(col, 1.15); c.fill(); } return; }
    case 'crystal': { const g = c.createRadialGradient(o.x, o.y, 2, o.x, o.y, o.r * 1.8); g.addColorStop(0, 'rgba(190,160,255,.5)'); g.addColorStop(1, 'rgba(190,160,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(o.x, o.y, o.r * 1.8, 0, TAU); c.fill();
      const rr = mulberry32(Math.floor(o.seed * 1e6)); for (let i = 0; i < 5; i++) { const a = rr() * TAU, L = o.r * (0.6 + rr() * 0.7), w = 3 + rr() * 3; c.save(); c.translate(o.x, o.y); c.rotate(a); c.beginPath(); c.moveTo(0, -w); c.lineTo(L, 0); c.lineTo(0, w); c.closePath(); c.fillStyle = i % 2 ? '#9b7fe0' : '#7fd4e6'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.8; c.stroke(); c.restore(); } return; }
    case 'kiln': { shadowCircle(c, o.x, o.y, o.r); c.fillStyle = '#c9a06a'; c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill(); c.fillStyle = '#e8c890'; c.beginPath(); c.arc(o.x - 4, o.y - 4, o.r * 0.6, 0, TAU); c.fill(); c.fillStyle = '#ff9a3c'; c.beginPath(); c.arc(o.x, o.y, 4, 0, TAU); c.fill(); return; }
    case 'quarry': { for (let i = 0; i < 4; i++) { c.fillStyle = shade([150, 146, 132], 0.95 - i * 0.12); c.fillRect(o.x - o.r + i * 7, o.y - o.r * 0.7 + i * 5, (o.r - i * 7) * 2, (o.r * 0.7 - i * 5) * 2); } c.fillStyle = '#e8e4da'; c.fillRect(o.x + o.r - 6, o.y - 6, 8, 6); c.fillRect(o.x + o.r - 4, o.y + 2, 7, 5); return; }
    case 'sawmill': { shadowCircle(c, o.x, o.y, o.r); c.fillStyle = '#8a6440'; c.fillRect(o.x - 18, o.y - 12, 36, 24); c.fillStyle = '#a67c50'; c.fillRect(o.x - 18, o.y - 12, 36, 11); c.fillStyle = '#c9c4b8'; c.beginPath(); c.arc(o.x + 22, o.y + 6, 7, 0, TAU); c.fill(); drawLogs(c, o.x - 28, o.y + 14); return; }
    case 'logs': drawLogs(c, o.x, o.y); return;
    case 'hay': shadowCircle(c, o.x, o.y, 6); c.fillStyle = '#e2c45a'; c.beginPath(); c.arc(o.x, o.y, 6, 0, TAU); c.fill(); c.strokeStyle = '#b8964a'; c.lineWidth = 1; c.beginPath(); c.arc(o.x, o.y, 3.5, 0, TAU); c.stroke(); return;
    case 'windmill': shadowCircle(c, o.x, o.y, 12); c.fillStyle = '#e8dcc0'; c.beginPath(); c.arc(o.x, o.y, 11, 0, TAU); c.fill(); c.fillStyle = '#9a6a4a'; c.beginPath(); c.arc(o.x, o.y, 6, 0, TAU); c.fill(); return;
    case 'mine': { c.strokeStyle = '#5a4a3a'; c.lineWidth = 1.5; const dx = Math.cos(o.a), dy = Math.sin(o.a), nx = -dy * 3, ny = dx * 3; c.beginPath(); c.moveTo(o.x + nx, o.y + ny); c.lineTo(o.x + nx + dx * 70, o.y + ny + dy * 70); c.moveTo(o.x - nx, o.y - ny); c.lineTo(o.x - nx + dx * 70, o.y - ny + dy * 70); c.stroke();
      for (let d = 4; d < 70; d += 6) { c.beginPath(); c.moveTo(o.x + dx * d + nx * 1.6, o.y + dy * d + ny * 1.6); c.lineTo(o.x + dx * d - nx * 1.6, o.y + dy * d - ny * 1.6); c.stroke(); }
      blob(c, o.x, o.y, 20, o.seed, 8); c.fillStyle = '#6a6480'; c.fill(); c.fillStyle = '#16131f'; c.beginPath(); c.arc(o.x, o.y, 9, 0, TAU); c.fill(); c.strokeStyle = '#8a6440'; c.lineWidth = 3; c.beginPath(); c.arc(o.x, o.y, 10, 0, TAU); c.stroke(); return; }
    case 'slag': { shadowCircle(c, o.x, o.y, o.r); const g = c.createRadialGradient(o.x - 4, o.y - 4, 2, o.x, o.y, o.r); g.addColorStop(0, '#6a5a50'); g.addColorStop(1, '#3a2e2a'); c.fillStyle = g; blob(c, o.x, o.y, o.r, o.seed); c.fill(); return; }
    case 'chimney': shadowCircle(c, o.x, o.y, 10); c.fillStyle = '#8a4a32'; c.fillRect(o.x - 8, o.y - 8, 16, 16); c.fillStyle = '#2a1e1a'; c.fillRect(o.x - 4, o.y - 4, 8, 8); return;
    case 'post': c.fillStyle = '#3a2e22'; c.beginPath(); c.arc(o.x, o.y, 2, 0, TAU); c.fill(); return;
    case 'pond': { c.fillStyle = '#5d9bb3'; blob(c, o.x, o.y, o.r, o.seed); c.fill(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#6aa36a'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(o.x + Math.cos(i * 2) * o.r * 0.5, o.y + Math.sin(i * 2) * o.r * 0.4, 3, 0, TAU); c.fill(); } return; }
    case 'pier': { c.save(); c.translate(o.x, o.y); c.rotate(o.a); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(2, -3, 46, 10); c.fillStyle = '#9a7048'; c.fillRect(0, -5, 46, 10); c.strokeStyle = '#6a4a2a'; c.lineWidth = 1; for (let d = 0; d < 46; d += 4) { c.beginPath(); c.moveTo(d, -5); c.lineTo(d, 5); c.stroke(); } c.restore(); return; }
    case 'market': return drawMarket(c, o, s);
    case 'vault': return drawVault(c, o, s);
    case 'plaza': c.fillStyle = '#e6d8b8'; c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill(); c.strokeStyle = '#b8a47a'; c.lineWidth = 2; c.stroke(); if (s > 0.15) { c.strokeStyle = 'rgba(150,130,90,.35)'; c.lineWidth = 1; c.beginPath(); c.arc(o.x, o.y, o.r * 0.65, 0, TAU); c.stroke(); }
      if (o.fountain) { c.fillStyle = '#8a8070'; c.beginPath(); c.arc(o.x, o.y, 10, 0, TAU); c.fill(); c.fillStyle = '#7ab3c6'; c.beginPath(); c.arc(o.x, o.y, 7.5, 0, TAU); c.fill(); } else { c.fillStyle = '#9a9280'; c.beginPath(); c.arc(o.x, o.y, 5, 0, TAU); c.fill(); } return;
    case 'lift': { shadowCircle(c, o.x, o.y, 14); c.fillStyle = '#7a5f3c'; c.fillRect(o.x - 12, o.y - 12, 24, 24); c.fillStyle = '#a07a4a'; c.fillRect(o.x - 9, o.y - 9, 18, 18); c.strokeStyle = '#3a2a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(o.x - 9, o.y - 9); c.lineTo(o.x + 9, o.y + 9); c.moveTo(o.x + 9, o.y - 9); c.lineTo(o.x - 9, o.y + 9); c.stroke(); c.fillStyle = '#ffd46b'; c.beginPath(); c.arc(o.x, o.y, 3.5, 0, TAU); c.fill(); return; }
    case 'statue': { c.fillStyle = '#e0d6c0'; c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill(); c.strokeStyle = '#a8987a'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#9a9488'; c.fillRect(o.x - 9, o.y - 9, 18, 18); c.fillStyle = '#c4beb0'; c.beginPath(); c.arc(o.x - 1, o.y - 2, 6, 0, TAU); c.fill(); c.fillStyle = '#8a8478'; c.beginPath(); c.moveTo(o.x + 4, o.y + 2); c.lineTo(o.x + 14, o.y + 12); c.lineTo(o.x + 9, o.y + 15); c.closePath(); c.fill(); c.fillRect(o.x + 12, o.y - 14, 5, 4); return; }
    case 'memorial': { c.save(); c.translate(o.x, o.y); c.rotate(o.a + Math.PI / 2); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-36, 2, 76, 10); c.fillStyle = '#8f8a80'; c.fillRect(-38, -6, 76, 12); c.fillStyle = '#b8b2a4'; for (let i = 0; i < 9; i++) c.fillRect(-35 + i * 8, -4, 6, 8); c.restore(); return; }
    case 'gate': { c.save(); c.translate(o.x, o.y); c.fillStyle = '#6c6a64'; c.beginPath(); c.arc(0, 0, o.r, 0, TAU); c.fill(); c.fillStyle = '#4a4440'; c.beginPath(); c.arc(0, 0, o.r * 0.78, 0, TAU); c.fill(); c.strokeStyle = '#b8964a'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, o.r * 0.78, 0, TAU); c.stroke();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.beginPath(); c.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); c.lineTo(Math.cos(a) * o.r * 0.75, Math.sin(a) * o.r * 0.75); c.stroke(); } c.fillStyle = '#d9b46a'; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill(); c.restore(); return; }
  }
}
function drawLogs(c, x, y) { c.fillStyle = '#7a5434'; for (let i = 0; i < 3; i++) { c.fillRect(x - 10, y - 6 + i * 4, 20, 3.5); } c.fillStyle = '#c9a070'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + 10, y - 4 + i * 4, 1.8, 0, TAU); c.fill(); } }
function drawMarket(c, m, s) {
  c.fillStyle = '#e8dbbb'; c.beginPath(); c.arc(m.x, m.y, m.r, 0, TAU); c.fill(); c.strokeStyle = '#b8a47a'; c.lineWidth = 3; c.stroke();
  if (s > 0.12) { c.strokeStyle = 'rgba(160,140,100,.3)'; c.lineWidth = 1; for (let r = 14; r < m.r; r += 12) { c.beginPath(); c.arc(m.x, m.y, r, 0, TAU); c.stroke(); } }
  for (const st of m.stalls) { const x = m.x + Math.cos(st.a) * (m.r - 16), y = m.y + Math.sin(st.a) * (m.r - 16); c.save(); c.translate(x, y); c.rotate(st.a + Math.PI / 2);
    c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-8, -5, 18, 12); c.fillStyle = st.c; c.fillRect(-9, -7, 18, 12); if (s > 0.2) { c.fillStyle = 'rgba(255,255,255,.7)'; for (let k = -9; k < 9; k += 6) c.fillRect(k, -7, 3, 12); } c.restore(); }
  c.fillStyle = '#8a8070'; c.beginPath(); c.arc(m.x, m.y, 9, 0, TAU); c.fill(); c.fillStyle = '#ffd46b'; c.beginPath(); c.arc(m.x, m.y, 4, 0, TAU); c.fill();
}
function drawVault(c, v, s) {
  c.fillStyle = '#e2d6bc'; c.beginPath(); c.arc(v.x, v.y, v.r, 0, TAU); c.fill();
  shadowCircle(c, v.x, v.y, 26); c.fillStyle = '#b8b0a0'; c.fillRect(v.x - 26, v.y - 22, 52, 44); c.fillStyle = '#d4ccba'; c.fillRect(v.x - 26, v.y - 22, 52, 8);
  c.fillStyle = '#f2ead6'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(v.x - 22 + i * 8.8, v.y + 18, 2.6, 0, TAU); c.fill(); }
  const g = c.createRadialGradient(v.x - 5, v.y - 5, 2, v.x, v.y, 16); g.addColorStop(0, '#fff2b8'); g.addColorStop(0.5, '#e2b04a'); g.addColorStop(1, '#a8782a'); c.fillStyle = g; c.beginPath(); c.arc(v.x, v.y, 14, 0, TAU); c.fill();
}
function drawHome(c, h, s) {
  c.save(); c.translate(h.x, h.y); c.rotate(h.ang);
  const w = h.size, d = h.size * 0.74;
  c.fillStyle = 'rgba(40,30,20,.25)'; c.fillRect(-w / 2 + 5, -d / 2 + 6, w, d);
  if (s < 0.09) { c.fillStyle = h.roof; c.fillRect(-w / 2, -d / 2, w, d); c.restore(); return; }
  // yard
  if (s > 0.2) { c.fillStyle = 'rgba(255,250,230,.16)'; c.fillRect(-w / 2 - 6, -d / 2 - 4, w + 12, d + 14); }
  // wing
  if (h.wing) { const ww = w * 0.5, wd = d * 0.8; const wx = h.wing > 0 ? w / 2 - 4 : -w / 2 - ww + 4; c.fillStyle = 'rgba(40,30,20,.2)'; c.fillRect(wx + 4, -wd / 2 + 6, ww, wd); c.fillStyle = h.roofD; c.fillRect(wx, -wd / 2, ww, wd); c.fillStyle = h.roofL; c.fillRect(wx, -wd / 2, ww, wd / 2); }
  const st = h.style;
  if (st === 0) { // gable
    c.fillStyle = h.roofL; c.fillRect(-w / 2, -d / 2, w, d / 2); c.fillStyle = h.roofD; c.fillRect(-w / 2, 0, w, d / 2);
    if (s > 0.3) { c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1; for (let x = -w / 2 + 4; x < w / 2; x += 4) { c.beginPath(); c.moveTo(x, -d / 2); c.lineTo(x, d / 2); c.stroke(); } }
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(w / 2, 0); c.stroke();
  } else if (st === 1) { // hip
    c.fillStyle = h.roof; c.fillRect(-w / 2, -d / 2, w, d);
    c.fillStyle = h.roofL; c.beginPath(); c.moveTo(-w / 2, -d / 2); c.lineTo(w / 2, -d / 2); c.lineTo(w / 4, 0); c.lineTo(-w / 4, 0); c.closePath(); c.fill();
    c.fillStyle = h.roofD; c.beginPath(); c.moveTo(-w / 2, d / 2); c.lineTo(w / 2, d / 2); c.lineTo(w / 4, 0); c.lineTo(-w / 4, 0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-w / 4, 0); c.lineTo(w / 4, 0); c.stroke();
  } else if (st === 2) { // flat with dome
    c.fillStyle = h.roof; c.fillRect(-w / 2, -d / 2, w, d); c.strokeStyle = h.roofD; c.lineWidth = 2; c.strokeRect(-w / 2 + 1, -d / 2 + 1, w - 2, d - 2);
    const g = c.createRadialGradient(-3, -3, 1, 0, 0, d * 0.35); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, h.roofD); c.fillStyle = g; c.beginPath(); c.arc(w * 0.12, 0, d * 0.32, 0, TAU); c.fill();
  } else { // round cottage
    const r = d * 0.62; c.fillStyle = h.roofD; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r); g.addColorStop(0, h.roofL); g.addColorStop(1, h.roof); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 0.9, 0, TAU); c.fill();
    if (s > 0.3) { c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 1; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); c.stroke(); } }
    c.fillStyle = '#ffd46b'; c.beginPath(); c.arc(0, 0, 2.2, 0, TAU); c.fill();
  }
  if (h.tower) { c.fillStyle = 'rgba(40,30,20,.25)'; c.beginPath(); c.arc(-w / 2 + 3, -d / 2 + 6, 8, 0, TAU); c.fill(); c.fillStyle = h.roofD; c.beginPath(); c.arc(-w / 2, -d / 2, 8, 0, TAU); c.fill(); c.fillStyle = h.roofL; c.beginPath(); c.moveTo(-w / 2, -d / 2); c.arc(-w / 2, -d / 2, 8, Math.PI, Math.PI * 1.75); c.closePath(); c.fill(); }
  // history: battered wall, banners, trophies
  if (s > 0.28) {
    if (h.battered) { c.strokeStyle = 'rgba(40,25,15,.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(w / 2 - 3, -d / 2 + 2); c.lineTo(w / 2 - 8, -d / 2 + 7); c.lineTo(w / 2 - 5, -d / 2 + 11); c.stroke(); c.fillStyle = '#8a8070'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(w / 2 + 3 + i * 2, d / 2 + 2 - i * 3, 1.6, 0, TAU); c.fill(); } }
    for (let i = 0; i < h.banners; i++) { const bx = -w / 2 + 3 + i * 6, by = d / 2 + 5; c.strokeStyle = '#3a2e22'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by - 9); c.stroke(); c.fillStyle = LAYER_COLORS[i]; c.beginPath(); c.moveTo(bx, by - 9); c.lineTo(bx + 5, by - 7); c.lineTo(bx, by - 5); c.closePath(); c.fill(); }
    if (h.trophies) { const tx = w / 2 + 6, ty = -d / 2 - 3; c.fillStyle = '#f2ead6'; c.beginPath(); c.ellipse(tx, ty, 4, 3, 0, 0, TAU); c.fill(); c.fillStyle = '#3a2e22'; c.beginPath(); c.arc(tx - 1.5, ty, 0.8, 0, TAU); c.arc(tx + 1.5, ty, 0.8, 0, TAU); c.fill(); }
  }
  c.restore();
}
