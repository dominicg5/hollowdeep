# generated clothing, hair and props (Blender coordinates: metres, Z up, the keeper faces -Y)
import math
from kitlib import *
def skirt_weights(J, z_top, z_hem):
    def w(co):
        t = smooth01((z_top - co.z) / max(0.05, z_top - z_hem)); side = 'l' if co.x > 0 else 'r'
        return mix_w(('pelvis', 1 - 0.45 * t), ('thigh_' + side, 0.45 * t * min(1, abs(co.x) / 0.08)), ('spine_01', 0.25 * (1 - t)))
    return w
def make_skirt(arm, J, vs_body, z_top, z_hem, flare, seg=18, rows=7, region=10, wobble=0.0, name='skirt', front_open=None, cy=None):
    cy = J['pelvis'].y if cy is None else cy; bm = bmesh.new(); prof = []
    r_top = [radius_at(vs_body, z_top, 2 * math.pi * k / seg, cy=cy) + 0.012 for k in range(seg)]
    for i in range(rows + 1):
        t = i / rows; z = z_top + (z_hem - z_top) * t; prof.append((z, t))
    def rf(th, z): return 1.0
    rings = []
    for z, t in prof:
        ring = []
        for k in range(seg):
            th = 2 * math.pi * k / seg; r0 = r_top[k]; bell = flare * (math.sin(t * math.pi * 0.5) ** 0.7)
            wv = 1 + wobble * math.sin(th * 7 + 1.3) * t
            r = (r0 + bell) * wv
            ring.append(Vector((math.sin(th) * r, cy - math.cos(th) * r, z)))
        rings.append(ring)
    ring_grid(bm, rings, True)
    return new_obj(name, bm, arm, skirt_weights(J, z_top, z_hem), region, axis_c=(0, cy))
def orient_obj(ob, axis_c):
    bm = bmesh.new(); bm.from_mesh(ob.data); orient(bm, axis_c); bm.to_mesh(ob.data); bm.free(); ob.data.update()
def make_sheet(arm, J, rows_pts, region, weights, name):
    bm = bmesh.new(); ring_grid(bm, rows_pts, closed=False); return new_obj(name, bm, arm, weights, region)
def front_panel(J, vs_ref, z_top, z_bot, half_angle, rows, cols, off, cy, rfun=None, zf=None):
    # rows of points hugging vs_ref (body/skirt) between angles +-half_angle at the front
    R = []
    for i in range(rows + 1):
        t = i / rows; z = z_top + (z_bot - z_top) * t; row = []
        for j in range(cols + 1):
            s = j / cols; th = -half_angle + 2 * half_angle * s
            r = radius_at(vs_ref, z, th, cy=cy, band=0.07, sector=0.3) + off * (1 + (rfun(t, s) if rfun else 0))
            row.append(Vector((math.sin(th) * r, cy - math.cos(th) * r, z)))
        R.append(row)
    return R
def head_parts_frame(body):
    c, r, vs = head_frame(body); return c, r
def curls(arm, c, r, spec, region, name, width=0.04, sides=6, segs=4, flat=0.7, bone='Head', bm=None):
    # spec: list of (az, el, length, kind, bend, width_mult)
    own = bm is None; bm = bm or bmesh.new()
    for az, el, L, kind, bend, wm in spec:
        p0, n0 = on_head(c, r, az, el, out=-0.006)
        # 'down' along the surface toward the hairline / nape
        p1, _ = on_head(c, r, az, el - 12)
        d = (p1 - p0).normalized(); pts = curl_path(p0, n0, d, L, bend=bend, n=segs + 1, kind=kind)
        w0 = width * wm; rad = [w0 * (1 - 0.35 * (i / segs)) for i in range(segs + 1)]   # the end stays >= 0.65 of the root
        tube(bm, pts, rad, sides=sides, flat=flat, up=n0, cap0=True, cap1=True)
    if own: return new_obj(name, bm, arm, lambda co: {bone: 1.0}, region)
    return bm
