#!/usr/bin/env python3
"""Mosby's giant loop, planned in 2D (t578u/t579u, Dominic: "adjust it so it does not walk through any ledges or mountains ... I meant like cliffs").
  python3 tools/mosby-route/plan2d.py grid48.json [--write]        (grid48.json from: DUMP=grid48.json node tools/mosby-route/route_check.js)
Cycle shortest path on the 48-unit grid: the ring 5800..11500 u round the map centre is cut by a seam ray (+x); edges across the seam are removed and a
Dijkstra runs from each seam cell on one side to its twin on the other, so the cheapest result goes once round the centre. Cell cost = step length x
(1 + heavy footprint penetration (highest ground within his body minus his belly / rim line, metres) + grade over his length) + dear zones (ore, landmarks,
wide cracks). Hard: the volcano keep-out, the bridge decks and cliff-wall blocks themselves, the ring. Houses are only costed
(Dominic, option C: "Use the lowest route and leave the houses alone"); HOUSE_C=0 HOUSE_R=260 BR_R=250 CL_R=260 makes them hard (much steeper, see git log). Then Chaikin + a minimum-turn-radius relax,
resampled at the old spacing. No terrain is edited. Prints the lap, worst penetration and grades (level body) and the lift / pitch the runtime adds."""
import json, sys, re, os
import numpy as np
from scipy import ndimage as nd
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
d = json.load(open(sys.argv[1])); G, X0, n = d['G'], d['X0'], d['n']; WRITE = '--write' in sys.argv
h = np.array(d['h'], float).reshape(n, n); f = np.array(d['f'], int).reshape(n, n); OLD = np.array(d['loop'], float)
WS = 6.35; U = WS * 1.15 * 10; RX, RZ, BELLY, RIM, SINK = 3.45 * U, 4.0 * U, 0.82 * U, 1.72 * U, WS * 0.3
yy, xx = np.mgrid[0:n, 0:n]; wx = X0 + (xx + 0.5) * G; wy = X0 + (yy + 0.5) * G; rr = np.hypot(wx, wy)
def disc(r): k = int(np.ceil(r / G)); a, b = np.mgrid[-k:k + 1, -k:k + 1]; return (a * a + b * b) * G * G <= r * r
def dil(m, r): return nd.binary_dilation(m, structure=disc(r)) if r > 0 else m
clr = np.minimum(h - SINK + BELLY - nd.maximum_filter(h, footprint=disc(RZ * 0.86)), h - SINK + RIM - nd.maximum_filter(h, footprint=disc(RZ)))
pen = np.maximum(0, -clr / WS)
hs = nd.uniform_filter(h, size=int(2 * RZ / G) | 1); gy, gx = np.gradient(hs, G); sl = np.degrees(np.arctan(np.hypot(gx, gy)))
K = lambda e, default: float(os.environ.get(e, default))
gy2, gx2 = np.gradient(h, G); s20 = np.degrees(np.arctan(np.hypot(gx2, gy2)))  # ground slope at his middle (test/mosbygiant.js: <= 28 deg, mean <= 5, <= 10% over 10)
cost = 1 + pen ** 2 * K('PEN2', 5) + pen * K('PEN1', 50) + np.where(sl > 4, ((sl - 4) / 4) ** 2 * K('SL', 0), 0) + np.where(s20 > 5, ((s20 - 5) / 5) ** 2 * K('S20', 200), 0)
cost += dil((f & 32) > 0, 300) * K('NODE', 3) + dil((f & 4) > 0, 130) * K('CRK', 3) + dil((f & 16) > 0, 300) * 400
for ox, oy, orr in d.get('ore', []): cost[np.hypot(wx - ox, wy - oy) < orr + 300] += K('ORE', 2)
# stay near the old line unless leaving it buys something (it already keeps the test's valley-floor rule): cost rises with distance from it
_om = np.zeros((n, n), bool); _oc = ((OLD - X0) // G).astype(int); _om[_oc[:, 1], _oc[:, 0]] = True; dOld = nd.distance_transform_edt(~_om) * G
cost += K('DEV', 20) * np.clip((dOld - 100) / 400, 0, 1) ** 2
# the NE pinch between the outer wall and the forge hills (x 7300..8300, y 3500..4700): the old line is the flattest way through (~27.5 deg, test limit 28) - keep to it
_box = (wx > 7300) & (wx < 8300) & (wy > 3500) & (wy < 4700); cost += _box * np.clip((dOld - K('PINCH_D', 50)) / 60, 0, 1) * K('PINCH', 1e5)
HOUSE = dil((f & 8) > 0, K('HOUSE_R', 260)); cost += HOUSE * K('HOUSE_C', 0.01)
HARD = (HOUSE if K('HOUSE_C', 0.01) == 0 else False) | (dil((f & 2) > 0, K('BR_R', -1)) if K('BR_R', -1) >= 0 else False) | dil((f & 128) > 0, 250) | (dil((f & 32) > 0, K('NODE_R', 0)) if K('NODE_R', -1) >= 0 else False) | dil((f & 16) > 0, K('HW_R', 100)) | (s20 > K('S20MAX', 90)) | (dil((f & 64) > 0, K('CL_R', -1)) if K('CL_R', -1) >= 0 else False) | (rr > K('RO', 11500)) | (rr < K('RI', 5800))
ok = ~(HARD | (dil((f & 8) > 0, K('HOUSE_R', 260) + K('PAD', 0)) if K('HOUSE_C', 0.01) == 0 else False))  # the search keeps a little more room than the smoothed line needs
# graph: 8-neighbour edges between free cells, none crossing the seam (x > 0, y changes sign)
idx = np.arange(n * n).reshape(n, n); rows, cols, wts = [], [], []
for dj, di in ((0, 1), (1, 0), (1, 1), (1, -1), (1, 2), (2, 1), (2, -1), (1, -2)):
    j0, j1 = max(0, -dj), n - max(0, dj); i0, i1 = max(0, -di), n - max(0, di)
    A = (slice(j0, j1), slice(i0, i1)); B = (slice(j0 + dj, j1 + dj), slice(i0 + di, i1 + di))
    Mid = (slice(j0 + dj // 2, j1 + dj // 2), slice(i0 + (di // 2 if di > 0 else -((-di) // 2)), i1 + (di // 2 if di > 0 else -((-di) // 2))))
    m = ok[A] & ok[B] & ok[Mid] & ~((wx[A] > 0) & (wx[B] > 0) & ((wy[A] >= 0) != (wy[B] >= 0)))
    w = (cost[A] + cost[B])[m] / 2 * np.hypot(dj, di) * G
    a, b = idx[A][m], idx[B][m]; rows += [a, b]; cols += [b, a]; wts += [w, w]
Gr = coo_matrix((np.concatenate(wts), (np.concatenate(rows), np.concatenate(cols))), shape=(n * n, n * n)).tocsr()
# seam twins: the cell just above (y >= 0) and just below the +x ray, for each radius
js, jn = int((0 - X0) // G), int((0 - X0) // G) - 1
cand = [i for i in range(n) if K('RI', 5800) + 100 < wx[js, i] < K('RO', 11500) - 100 and ok[js, i] and ok[jn, i]][::2]
D, Pr = dijkstra(Gr, indices=[idx[js, i] for i in cand], return_predecessors=True)
tot = [D[k, idx[jn, i]] for k, i in enumerate(cand)]; k = int(np.argmin(tot)); i = cand[k]
if not np.isfinite(tot[k]): sys.exit('no circuit under these limits')
p = idx[jn, i]; path = []
while p >= 0 and p != idx[js, i]: path.append(p); p = Pr[k, p]
path.append(idx[js, i]); path = path[::-1]; raw = np.c_[wx.ravel()[path], wy.ravel()[path]]
print('seam radius', round(float(wx[js, i])), 'raw cells', len(raw))
# smooth: Chaikin x3 (closed), then relax wherever the turn radius < RMIN, resample at the old spacing
def chaikin(Q):
    a, b = Q, np.roll(Q, -1, 0); return np.vstack([0.75 * a + 0.25 * b, 0.25 * a + 0.75 * b]).reshape(2, -1, 2).transpose(1, 0, 2).reshape(-1, 2)
def resample(Q, sp):
    L = np.r_[0, np.cumsum(np.hypot(*np.diff(np.vstack([Q, Q[:1]]), axis=0).T))]; m = max(8, int(round(L[-1] / sp))); s = np.linspace(0, L[-1], m, endpoint=False)
    return np.c_[np.interp(s, L, np.r_[Q[:, 0], Q[0, 0]]), np.interp(s, L, np.r_[Q[:, 1], Q[0, 1]])]
def turn_r(Q):
    a, b, c = np.roll(Q, 1, 0), Q, np.roll(Q, -1, 0); ab, bc, ca = np.hypot(*(b - a).T), np.hypot(*(c - b).T), np.hypot(*(a - c).T)
    ar = np.abs((b - a)[:, 0] * (c - a)[:, 1] - (b - a)[:, 1] * (c - a)[:, 0]) / 2; return ab * bc * ca / (4 * ar + 1e-9)
SP = float(np.mean(np.hypot(*np.diff(np.vstack([OLD, OLD[:1]]), axis=0).T))); RMIN = K('RMIN', 500)
# constrained smoothing: Laplacian steps (more where the turn is tighter than RMIN), each point projected back out of the hard zones
_, near = nd.distance_transform_edt(HARD, return_indices=True)
def project(Q):
    i = np.clip(((Q[:, 0] - X0) // G).astype(int), 0, n - 1); j = np.clip(((Q[:, 1] - X0) // G).astype(int), 0, n - 1); bad = HARD[j, i]
    if bad.any(): Q = Q.copy(); jj, ii = near[0][j[bad], i[bad]], near[1][j[bad], i[bad]]; Q[bad] = np.c_[X0 + (ii + 0.5) * G, X0 + (jj + 0.5) * G]
    return Q
Q = raw.copy()
for _ in range(2): Q = chaikin(Q)
Q = project(resample(Q, SP / 2))
inH = lambda Q: HARD[np.clip(((Q[:, 1] - X0) // G).astype(int), 0, n - 1), np.clip(((Q[:, 0] - X0) // G).astype(int), 0, n - 1)]
for it in range(int(K('ITERS', 80))):
    rq = turn_r(Q); w = np.where(rq < RMIN, 0.5, 0.2)[:, None]
    Q2 = Q + w * (0.5 * (np.roll(Q, 1, 0) + np.roll(Q, -1, 0)) - Q); Q = np.where(inH(Q2)[:, None], Q, Q2)  # a step into a hard zone is simply not taken
    if it % 100 == 99: Q = project(resample(Q, SP / 2))
Q = resample(project(resample(Q, SP)), SP)
cr = lambda a, b: a[0] * b[1] - a[1] * b[0]
if cr(OLD[0], OLD[1] - OLD[0]) * cr(Q[0], Q[1] - Q[0]) < 0: Q = Q[::-1]
Q = np.roll(Q, -int(np.argmin(np.hypot(*(Q - OLD[0]).T))), 0)
def bil(A, x, y): return nd.map_coordinates(A, [(np.asarray(y) - X0) / G - 0.5, (np.asarray(x) - X0) / G - 0.5], order=1, mode='nearest')
H = lambda x, y: bil(h, x, y)
def body(L, lift=True):
    """the runtime body model: level base meshH - SINK, lifted by a smoothed footprint need and pitched (<= 8 deg) by the lift difference front/back"""
    cum = np.r_[0, np.cumsum(np.hypot(*np.diff(np.vstack([L, L[:1]]), axis=0).T))]; tot = cum[-1]; st = 30; s = np.arange(0, tot, st)
    px = np.interp(s, cum, np.r_[L[:, 0], L[0, 0]]); py = np.interp(s, cum, np.r_[L[:, 1], L[0, 1]])
    fx = np.roll(px, -2) - np.roll(px, 2); fy = np.roll(py, -2) - np.roll(py, 2); fl = np.hypot(fx, fy) + 1e-9; ux, uy = fx / fl, fy / fl; vx, vy = -uy, ux
    base = H(px, py) - SINK; S = []
    for rho in (0.3, 0.6, 0.86, 1):
        for kk in range(16):
            az = kk / 16 * 2 * np.pi; lz, lx = np.cos(az) * RZ * rho, np.sin(az) * RX * rho; S.append((lz, H(px + ux * lz + vx * lx, py + uy * lz + vy * lx) - (BELLY if rho <= 0.86 else RIM)))
    need = np.max([g for _, g in S], axis=0) - base  # lift needed with a level body
    al = np.degrees(np.arctan(np.abs(H(px + ux * RZ, py + uy * RZ) - H(px - ux * RZ, py - uy * RZ)) / (2 * RZ)))
    ac = np.degrees(np.arctan(np.abs(H(px + vx * RX, py + vy * RX) - H(px - vx * RX, py - vy * RX)) / (2 * RX)))
    out = dict(s=s, px=px, py=py, tot=tot, pen0=np.maximum(0, need) / WS, al=al, ac=ac)
    if not lift: return out
    nb = int(np.ceil(RZ * 1.5 / st)); y = base + nd.gaussian_filter1d(nd.maximum_filter1d(np.maximum(0, need), size=2 * nb + 1, mode='wrap'), nb / 2, mode='wrap')
    yb = base.copy(); lift_ = y - base; nf = int(round(RZ / st))
    pitch = np.clip(np.arctan((np.roll(lift_, -nf) - np.roll(lift_, nf)) / (2 * RZ)), -np.radians(8), np.radians(8))
    for _ in range(6):  # pitch changes the belly line front / back: top up the lift until nothing is under him
        res = np.max([g - (y + lz * np.tan(pitch)) for lz, g in S], axis=0); top = np.maximum(0, res)
        if top.max() < 0.05: break
        lift_ = lift_ + nd.gaussian_filter1d(nd.maximum_filter1d(top, size=2 * nb + 1, mode='wrap'), nb / 2, mode='wrap') * 1.05 + top * 0; y = base + lift_
    res = np.max([g - (y + lz * np.tan(pitch)) for lz, g in S], axis=0)
    out.update(lift=lift_ / WS, pitch=np.degrees(pitch), pen=np.maximum(0, res) / WS); return out
def testlike(L):
    cum = np.r_[0, np.cumsum(np.hypot(*np.diff(np.vstack([L, L[:1]]), axis=0).T))]; s = np.arange(0, cum[-1], WS * 10)
    px = np.interp(s, cum, np.r_[L[:, 0], L[0, 0]]); py = np.interp(s, cum, np.r_[L[:, 1], L[0, 1]]); b = WS * 10
    v = np.degrees(np.arctan(np.hypot((H(px + b, py) - H(px - b, py)) / (2 * b), (H(px, py + b) - H(px, py - b)) / (2 * b))))
    m = (f & 32) > 0; dn = nd.distance_transform_edt(~m) * G; ci = ((np.c_[px, py] - X0) // G).astype(int)
    seg = np.hypot(*np.diff(np.vstack([L, L[:1]]), axis=0).T)
    return dict(s20max=round(float(v.max()), 1), s20mean=round(float(v.mean()), 1), over10=round(float((v > 10).mean() * 100), 1), ore_cell_d=int(dn[ci[:, 1], ci[:, 0]].min()), seg_max_m=round(float(seg.max() / WS), 1))
def where(x, y):
    L = [['Lumen Tree door', 3083, -2444], ['Volcanic Forge', 9080, 6000], ['Tether Mill', -8594, 2104], ['Silverseam climb', -2744, 5664], ['Beginner town', -5690, 8040]]
    b = min(L, key=lambda q: np.hypot(q[1] - x, q[2] - y)); return f"{b[0]} ({round(np.hypot(b[1] - x, b[2] - y) / WS)} m)"
def rep(name, m):
    print(name, json.dumps(dict(lap_m=round(m['tot'] / WS), pen_level_m=round(float(m['pen0'].max()), 1), pen_after_lift_m=round(float(m['pen'].max()), 2) if 'pen' in m else None,
        along=round(float(m['al'].max()), 1), across=round(float(m['ac'].max()), 1), along_p95=round(float(np.percentile(m['al'], 95)), 1), lift_max_m=round(float(m['lift'].max()), 1) if 'lift' in m else None,
        pitch_max=round(float(np.abs(m['pitch']).max()), 1) if 'pitch' in m else None, lifted_pct=round(float((m['lift'] > 0.2).mean() * 100), 1) if 'lift' in m else None,
        min_turn_r_m=round(float(turn_r(resample(np.c_[m['px'], m['py']], 120)).min() / WS)))))
_lab, _nl = nd.label((f & 32) > 0); NODES = np.array([[X0 + (b + .5) * G, X0 + (a + .5) * G] for a, b in nd.center_of_mass((f & 32) > 0, _lab, range(1, _nl + 1))]) if _nl else np.zeros((0, 2))
def feet(L, s_node=K('NODE_S', 40)):
    # test/mosbygiant.js: his four foot colliders (hips at +-hipX, +-hipZ, swinging +-~0.6 m of stride, r 1.2 s) never within an ore node's radius
    U = WS * 1.15 * 10; hx, hz, r = 2.45 * U, 2.3 * U, 1.2 * U; cum = np.r_[0, np.cumsum(np.hypot(*np.diff(np.vstack([L, L[:1]]), axis=0).T))]; s = np.arange(0, cum[-1], 20)
    px = np.interp(s, cum, np.r_[L[:, 0], L[0, 0]]); py = np.interp(s, cum, np.r_[L[:, 1], L[0, 1]]); fx = np.roll(px, -6) - np.roll(px, 6); fy = np.roll(py, -6) - np.roll(py, 6); fl = np.hypot(fx, fy) + 1e-9; ux, uy = fx / fl, fy / fl
    worst = (1e9, None)
    for sx in (-1, 1):
        for sz in (-1, 1):
            for dz in (-0.75 * U, 0, 0.75 * U):
                x = px + ux * (sz * hz + dz) - uy * sx * hx; y = py + uy * (sz * hz + dz) + ux * sx * hx
                for nx_, ny_ in NODES:
                    d = np.hypot(x - nx_, y - ny_) - s_node - r; i = int(np.argmin(d))
                    if d[i] < worst[0]: worst = (float(d[i]), [int(px[i]), int(py[i])])
    return round(worst[0] / WS, 1), worst[1]
# local nudge: where a foot would reach an ore node, shift that stretch of the loop sideways, away from the node (smooth falloff along the loop)
def nudge_ore(Q, margin=K('NODE_M', 3) * WS, it_max=60):
    U = WS * 1.15 * 10; reach = np.hypot(2.45 * U, 2.3 * U + 0.75 * U) + 1.2 * U + K('NODE_S', 40) + margin
    for it in range(it_max):
        v = feet(Q)
        if v[0] * WS >= margin * 0.5: break
        nx_, ny_ = NODES[np.argmin(np.hypot(*(NODES - np.array(v[1])).T))]; d = np.hypot(Q[:, 0] - nx_, Q[:, 1] - ny_); i = int(np.argmin(d))
        a, b = Q[(i + 1) % len(Q)] - Q[i - 1], np.array([nx_, ny_]) - Q[i]; side = np.sign(a[0] * b[1] - a[1] * b[0]) or 1.0  # node to the left (+) or right
        nrm = np.array([-a[1], a[0]]) / (np.hypot(*a) + 1e-9); push = min(120.0, max(20.0, reach - d[i] + 10))
        k = np.arange(len(Q)); ds = np.minimum(np.abs(k - i), len(Q) - np.abs(k - i)) * SP; w = np.exp(-0.5 * (ds / 500) ** 2)
        Q = Q - (side * push) * w[:, None] * nrm[None, :]
        Q = resample(project(Q), SP)
    return Q
if K('NUDGE', 1): Q = nudge_ore(Q)
mo = body(OLD); mn = body(Q); rep('OLD', mo); rep('NEW', mn); print('TEST old', testlike(OLD), 'new', testlike(Q))
print('FEET vs ore nodes (m, at): old', feet(OLD), 'new', feet(Q))
def hhit(L):
    m = (f & 8) > 0; dt = nd.distance_transform_edt(~m) * G; ci = ((L - X0) // G).astype(int); v = dt[ci[:, 1], ci[:, 0]]; lab, _ = nd.label(m)
    ids = set()
    for (x, y), dv in zip(L, v):
        if dv < RX * 0.95:
            i0, j0 = int((x - X0) // G), int((y - X0) // G); k = int(RX // G) + 1; sub = lab[max(0, j0 - k):j0 + k + 1, max(0, i0 - k):i0 + k + 1]
            yy2, xx2 = np.mgrid[max(0, j0 - k):j0 + k + 1, max(0, i0 - k):i0 + k + 1]; dd2 = np.hypot(X0 + (xx2 + .5) * G - x, X0 + (yy2 + .5) * G - y)
            ids |= set(sub[(sub > 0) & (dd2 < RX * 0.95)].tolist())
    return len(ids)
print('house blobs under his body: old', hhit(OLD), 'new', hhit(Q)); print('new points in hard zones', int(HARD[((Q[:, 1] - X0) // G).astype(int), ((Q[:, 0] - X0) // G).astype(int)].sum()))
# where the new loop departs most from the old
dd = np.array([np.min(np.hypot(*(OLD - q).T)) for q in Q[::10]]); top = np.argsort(-dd)[:200]; seen = []
for t in top:
    q = Q[::10][t]
    if all(np.hypot(*(q - s2)) > 2500 for s2 in seen): seen.append(q); print(' moved', round(float(dd[t] / WS)), 'm at', q.astype(int).tolist(), where(*q))
    if len(seen) >= 5: break
lf = np.where(mn['lift'] > 0.5)[0]
if len(lf): print(' lifted spots (m):', [[int(mn['px'][i]), int(mn['py'][i]), round(float(mn['lift'][i]), 1), where(mn['px'][i], mn['py'][i])] for i in lf[::max(1, len(lf) // 8)]][:8])
loop = [[int(round(x)), int(round(y))] for x, y in Q]; json.dump(loop, open(os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'loop2d.json'), 'w'))
if WRITE:
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'mosby.js'); t = open(src).read()
    t2 = re.sub(r'/\*GLOOP\*/\[.*?\]/\*GEND\*/', '/*GLOOP*/' + json.dumps(loop, separators=(',', ':')) + '/*GEND*/', t, count=1, flags=re.S)
    assert t2 != t; open(src, 'w').write(t2); print('wrote src/mosby.js GLOOP', len(loop))
