#!/usr/bin/env python3
"""Mosby's valley circuit (Dominic: "he shouldn't be climbing over ridges and mountains - walk across the flattest areas in the valley region").

  python3 tools/mosby-route/plan.py grid.json [avoid.json] [--write]

grid.json  : from dump_grid.js (heights + flags on a 64-unit grid)
avoid.json : sites he must walk round, [[x, y, r], ...] in map units (tools/mosby-route/avoid.json: the 5 keeper sites' pads - every footprint /
             yard circle and rect corner from mia/handoff/town/spread_sites/sites.json, r + 60 u - so his 47 m strip stays >= 10 m off each pad).
             (houses are NOT avoided: he walks through them.)
--write    : put the new loop into src/mosby.js between /*GLOOP*/ and /*GEND*/ (rebuild after).

Method: Dijkstra on the grid once round the map centre (a cut ray along +x forces one full circuit, not back-and-forth), inside the lower
valley ring (6000 < r < 11400). Cost per step rises steeply with ground slope under his footprint (flat <= 5 deg is cheap, > 10 deg
quadratic, > 16 deg cubic); cells steeper than SLMAX (30 deg) are forbidden outright. Hard: every ore node (its radius + 300 units for his feet), ore cliffs, wide
crevices, the Lumen Tree / landmarks, the town's colliders and the avoid sites (+330 units). Shallow water is allowed (it is flat). The path is then smoothed as r(theta) with a
Gaussian (no shrink, keeps it a clean loop) and resampled every 60 units.
"""
import json, sys, heapq, re, os
import numpy as np
from scipy import ndimage as nd

args = [a for a in sys.argv[1:] if not a.startswith('--')]; WRITE = '--write' in sys.argv
d = json.load(open(args[0])); n, G, X0 = d['n'], d['G'], d['X0']
AVOID = json.load(open(args[1])) if len(args) > 1 else []
h = np.array(d['h'], float).reshape(n, n); f = np.array(d['f']).reshape(n, n)
gy, gx = np.gradient(h, G); sl = np.degrees(np.arctan(np.hypot(gx, gy)))
slf = nd.maximum_filter(sl, size=3)
yy, xx = np.mgrid[0:n, 0:n]; wx = X0 + (xx + 0.5) * G; wy = X0 + (yy + 0.5) * G; rr = np.hypot(wx, wy)
def dil(m, r):
    k = int(np.ceil(r / G)); a, b = np.mgrid[-k:k + 1, -k:k + 1]; return nd.binary_dilation(m, structure=(a * a + b * b) * G * G <= r * r)
FOOT, RMIN, RMAX, R0 = 130, 6000, 11400, 9200
SLMAX = float(os.environ.get("SLMAX", 30))
ORE_R = float(os.environ.get("ORE_R", 130))
hard = dil((f & (4 | 16)) > 0, FOOT) | dil((f & 32) > 0, ORE_R) | (rr > RMAX) | (rr < RMIN) | (sl > SLMAX)
ORE_REACH = float(os.environ.get("ORE_REACH", 300))  # his feet vs each ore node (node radius + this, from the line he walks)
if d.get('ore'):
    for ox, oy, os_ in d['ore']: hard |= np.hypot(wx - ox, wy - oy) < os_ + ORE_REACH
REACH = 330  # his feet plant up to ~45 m either side of the line he walks
for ax, ay, ar in AVOID + d.get('town', []): hard |= np.hypot(wx - ax, wy - ay) < ar + REACH  # the town's own colliders come with the grid
cost = 1 + np.where(slf <= 5, 0, ((slf - 5) / 5) ** 2 * 4) + np.where(slf > 10, (slf - 10) ** 2 * 3, 0) + np.where(slf > 16, (slf - 16) ** 3 * 10, 0)
ci = lambda x, y: (int((y - X0) // G), int((x - X0) // G))
s, g = ci(R0, G * 0.6), ci(R0, -G * 0.6)
dist = np.full((n, n), np.inf); prev = -np.ones((n, n, 2), int); dist[s] = 0; pq = [(0, s)]
while pq:
    c, (j, i) = heapq.heappop(pq)
    if c > dist[j, i]: continue
    if (j, i) == g: break
    for dj in (-1, 0, 1):
        for di in (-1, 0, 1):
            J, I = j + dj, i + di
            if not (dj or di) or not (0 <= J < n and 0 <= I < n) or hard[J, I]: continue
            if wx[j, i] > 0 and wx[J, I] > 0 and (wy[j, i] >= 0) != (wy[J, I] >= 0): continue
            nc = c + (cost[j, i] + cost[J, I]) / 2 * np.hypot(dj, di)
            if nc < dist[J, I]: dist[J, I] = nc; prev[J, I] = (j, i); heapq.heappush(pq, (nc, (J, I)))
if not np.isfinite(dist[g]): sys.exit('no valley circuit under these limits')
p, path = g, []
while p != s: path.append((wx[p], wy[p])); p = tuple(prev[p])
path.append((wx[s], wy[s])); raw = np.array(path[::-1])
th = np.unwrap(np.arctan2(raw[:, 1], raw[:, 0])); r = np.hypot(raw[:, 0], raw[:, 1]); flip = th[-1] < th[0]
if flip: th = -th
o = np.argsort(th); T = np.linspace(th[o][0], th[o][0] + 2 * np.pi, 4000, endpoint=False)
Rs = nd.gaussian_filter1d(np.interp(T, th[o], r[o], period=2 * np.pi), 6, mode='wrap'); T = -T if flip else T
P = np.c_[Rs * np.cos(T), Rs * np.sin(T)]
L = np.r_[0, np.cumsum(np.hypot(*np.diff(np.vstack([P, P[:1]]), axis=0).T))]; st = np.arange(0, L[-1], 60)
R = np.c_[np.interp(st, L, np.r_[P[:, 0], P[0, 0]]), np.interp(st, L, np.r_[P[:, 1], P[0, 1]])]
# final clearance pass: his feet plant ~45 m either side of the line, so push the line off any ore node closer than its radius + ORE_CLEAR, then relax
ORE_CLEAR = float(os.environ.get("ORE_CLEAR", 345))
if d.get('ore') or AVOID:
    O = np.array([[x, y, r + ORE_CLEAR] for x, y, r in d.get('ore', [])] + [[x, y, r + REACH + 25] for x, y, r in AVOID], float)  # (centre, clearance)
    for it in range(60):
        moved = False
        for ox, oy, orr in O:
            v = R - [ox, oy]; dd = np.hypot(v[:, 0], v[:, 1]); m = dd < orr
            if m.any(): R[m] = [ox, oy] + v[m] / dd[m, None] * orr; moved = True
        if not moved: break
        R = 0.5 * R + 0.25 * (np.roll(R, 1, 0) + np.roll(R, -1, 0))
    for ox, oy, orr in O:
        v = R - [ox, oy]; dd = np.hypot(v[:, 0], v[:, 1]); m = dd < orr
        if m.any(): R[m] = [ox, oy] + v[m] / dd[m, None] * orr
samp = nd.map_coordinates(sl, [(R[:, 1] - X0) / G - 0.5, (R[:, 0] - X0) / G - 0.5], order=1)
print(json.dumps({'points': len(R), 'length_m': round(L[-1] / 6.35), 'slope_max': round(float(samp.max()), 1), 'slope_mean': round(float(samp.mean()), 1), 'over10_pct': round(float((samp > 10).mean() * 100), 1)}))
loop = [[int(round(x)), int(round(y))] for x, y in R]
if WRITE:
    src = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'mosby.js'); t = open(src).read()
    t2 = re.sub(r'/\*GLOOP\*/\[.*?\]/\*GEND\*/', '/*GLOOP*/' + json.dumps(loop, separators=(',', ':')) + '/*GEND*/', t, count=1, flags=re.S)
    assert t2 != t, 'GLOOP marker not found / unchanged'; open(src, 'w').write(t2); print('wrote src/mosby.js GLOOP')
else: json.dump(loop, sys.stdout, separators=(',', ':'))
