import math
from kitlib import *
def hx(h): return tuple(((h >> s) & 255) / 255 for s in (16, 8, 0))
CFG = {}
CFG['goldie'] = dict(g='F', h=1.50, hair_top=0.0, curl={'l': 40, 'r': 30},
    drop_outfit=['legs'],
    scale={'Head': 1.32, 'neck_01': (1.25, 0.6, 1.25), 'spine_03': (1.35, 0.9, 1.3), 'spine_02': (1.5, 0.9, 1.45), 'spine_01': (1.55, 0.9, 1.5), 'pelvis': (1.5, 0.9, 1.45),
           'clavicle_l': (1, 0.85, 1), 'clavicle_r': (1, 0.85, 1), 'upperarm_l': (1.3, 0.8, 1.3), 'upperarm_r': (1.3, 0.8, 1.3), 'lowerarm_l': (1.25, 0.82, 1.25), 'lowerarm_r': (1.25, 0.82, 1.25), 'hand_l': 1.1, 'hand_r': 1.1,
           'thigh_l': (1.45, 0.72, 1.45), 'thigh_r': (1.45, 0.72, 1.45), 'calf_l': (1.3, 0.74, 1.3), 'calf_r': (1.3, 0.74, 1.3), 'foot_l': 1.12, 'foot_r': 1.12},
    dec={'head': 1150, 'eyes': 120, 'arms': 700, 'body': 600, 'feet': 500})
from parts import *
def goldie_shape(J, out, body):
    b = out['body']
    bulge(b, (0, J['spine_01'].y - 0.09, J['spine_01'].z + 0.02), (0.2, 0.16, 0.16), 0.045, axis=(0, -1, 0))   # round belly
    bulge(b, (0, J['spine_03'].y - 0.08, J['spine_03'].z - 0.02), (0.16, 0.12, 0.09), 0.025, axis=(0, -1, 0))  # bust
    bulge(b, (0, J['pelvis'].y, J['pelvis'].z + 0.05), (0.3, 0.3, 0.14), 0.035)  # hips
def goldie_gen(arm, J):
    body = bpy.data.objects['Superhero_Female']; ob = bpy.data.objects['Female_Peasant_Body']; feet = bpy.data.objects['Female_Peasant_Feet']
    vb = world_verts(ob); zf = max(v.z for v in world_verts(feet))
    z_top = J['spine_01'].z + 0.03; z_hem = zf - 0.07
    delete_faces(ob, lambda c, ws, f: c.z < z_top - 0.03)
    vb = world_verts(ob)
    sk = make_skirt(arm, J, vb, z_top, z_hem, flare=0.15, seg=20, rows=7, region=10, wobble=0.035)
    vs_sk = world_verts(sk) + [v for v in vb if v.z > z_top - 0.02]
    cy = J['pelvis'].y
    ap = front_panel(J, vs_sk, z_top + 0.02, z_hem + 0.06, math.radians(62), 7, 8, 0.012, cy, rfun=lambda t, s: 0.4 * t)
    apron = make_sheet(arm, J, ap, 11, skirt_weights(J, z_top, z_hem), 'apron'); orient_obj(apron, (0, cy))
    bib = front_panel(J, vb, J['spine_03'].z + 0.03, z_top + 0.03, math.radians(38), 4, 5, 0.012, J['spine_02'].y)
    bibo = make_sheet(arm, J, bib, 11, lambda co: mix_w(('spine_03', smooth01((co.z - J['spine_02'].z) / 0.12)), ('spine_02', 1 - smooth01((co.z - J['spine_02'].z) / 0.12))), 'bib'); orient_obj(bibo, (0, J['spine_02'].y))
    c, r = head_parts_frame(body); r = r * 1.0; bm = bmesh.new()
    W = 0.034
    L = [(-150, 62, -165, 38), (-105, 64, -118, 38), (-62, 66, -72, 40), (62, 66, 72, 40), (105, 64, 118, 38), (150, 62, 165, 38), (180, 70, 180, 42),
         (-28, 70, -45, 46), (28, 70, 45, 46), (0, 74, -8, 52),
         (-60, 40, -78, 10), (60, 40, 78, 10), (-95, 38, -100, 2), (95, 38, 100, 2), (-135, 36, -140, -8), (135, 36, 140, -8), (165, 34, 172, -14), (-165, 34, -172, -14)]
    for i, (a0, e0, a1, e1) in enumerate(L): lobe(bm, c, r, a0, e0, a1, e1, W * (1.08 if i < 7 else 1.0))
    hair = new_obj('hair', bm, arm, lambda co: {'Head': 1.0}, 12, closed=True)
    bm = bmesh.new(); bc, _ = on_head(c, r, 180, 58, out=0.04)
    ellipsoid(bm, bc, (0.055, 0.05, 0.045), seg=8, rings=5)
    for k2 in range(3):
        a = k2 * 2.1; p = [bc + Vector((math.cos(a + t) * 0.05, math.sin(a + t) * 0.045, 0.02 * math.sin(t * 2))) for t in [i * 0.45 for i in range(5)]]
        tube(bm, p, [0.022, 0.024, 0.024, 0.022, 0.019], sides=5, flat=0.8)
    cyl(bm, bc + Vector((0.03, 0.0, 0.05)), 0.006, 0.004, 0.13, seg=5, rot=Euler((0.5, 0.6, 0)).to_matrix())
    bun = new_obj('bun', bm, arm, lambda co: {'Head': 1.0}, lambda p: 12, closed=True)
    # glasses: two round rims + bridge in front of the eyes
    eyes = bpy.data.objects['Eyes']; ev = world_verts(eyes); bm = bmesh.new()
    for s in (1, -1):
        e = [v for v in ev if v.x * s > 0]; ec = sum(e, Vector()) / len(e); ec.y = min(v.y for v in e) - 0.012
        bmesh.ops.create_circle(bm, cap_ends=False, segments=10, radius=0.028)
        g = bmesh.new(); 
        rr = []
        for k in range(10):
            a = 2 * math.pi * k / 10; rr.append(ec + Vector((math.cos(a) * 0.03, 0, math.sin(a) * 0.026)))
        rr.append(rr[0]); tube(bm, rr, 0.002, sides=4, cap0=False, cap1=False, up=Vector((0, -1, 0)))
    bm2 = bm
    for v in [v for v in bm2.verts if v.is_wire or not v.link_faces]: bm2.verts.remove(v)
    glasses = new_obj('glasses', bm2, arm, lambda co: {'Head': 1.0}, 15)
    # the ledger, held against her right side (character right = -X), on the chest
    bm = bmesh.new(); bp = Vector((J['spine_02'].x - 0.13, J['spine_02'].y - 0.19, J['spine_02'].z + 0.03))
    boxm(bm, bp, (0.04, 0.17, 0.23), rot=Euler((0.25, 0.1, -0.95)).to_matrix())
    book = new_obj('ledger', bm, arm, lambda co: {'spine_02': 1.0}, lambda p: 16 if abs(p.normal.x) < 0.9 or True else 17)
    return [sk, apron, bibo, hair, bun, glasses, book]
CFG['goldie']['shape'] = [goldie_shape]
CFG['goldie']['gen'] = goldie_gen
CFG['goldie']['scale']['Head'] = (1.42, 1.3, 1.38)
import numpy as np
from paint import hx, sstep
def hair_fn(base, under, gap, stroke, rim, period=5.0):
    def f(P, N, UV):
        v = UV[:, 1]; u = UV[:, 0]; c = np.tile(hx(base), (len(P), 1))
        c = c + (hx(under) - c) * sstep(0.1, -0.5, N[:, 2])[:, None]                 # underside shade
        st = np.abs(((v * period + 0.15 * np.sin(u * 6.283 * 2)) % 1) - 0.5) < 0.07       # C-arc curl strokes
        c[st] = c[st] * 0.35 + hx(stroke) * 0.65
        c = c + (hx(rim) - c) * (sstep(0.55, 0.9, N[:, 2]) * 0.8)[:, None]             # rim highlight on top
        c = c + (hx(gap) - c) * sstep(0.82, 1.0, v)[:, None] * 0.7                    # dark gap where the lobe tucks under
        return c
    return f
def scalp_hairline(front=38, side=18, back=-25, soft=8):
    def mk(hc, hr):
        c = np.array(hc, np.float32); r = np.array(hr, np.float32)
        def f(P):
            d = (P - c) / r; az = np.degrees(np.arctan2(d[:, 0], -d[:, 1])); el = np.degrees(np.arctan2(d[:, 2], np.hypot(d[:, 0], d[:, 1])))
            a = np.abs(az); hl = np.where(a < 90, front + (side - front) * (a / 90), side + (back - side) * ((a - 90) / 90))
            return sstep(hl - soft, hl + soft, el)
        return f
    return mk
def stripes(a, b, n, axis=0, duty=0.5):
    def f(P, N, UV):
        t = (UV[:, axis] * n) % 1; c = np.where((t < duty)[:, None], hx(a)[None], hx(b)[None]); return c.astype(np.float32)
    return f
FEMALE_LM = dict(eyes=[(265, 365), (490, 365)], nose=(375, 465), mouth=(375, 537, 66), eye_r=44)
MALE_LM = dict(eyes=[(285, 365), (485, 365)], nose=(380, 475), mouth=(380, 545, 64), eye_r=42)
def book_fn(P, N, UV):
    c = np.tile(hx(0x5A3A22), (len(P), 1)); side = np.abs(N[:, 1]) < 0.5; c[side & (np.abs(N[:, 0]) < 0.6)] = hx(0xE8DCC0); return c
CFG['goldie'].update(lm=FEMALE_LM, scalp=scalp_hairline(34, 14, -28), pal=dict(
    skin=[hx(0xF4CA9F), hx(0xE9B482), hx(0xD59B69), hx(0xBB7F51)], socket=hx(0xA8673F), cheek=hx(0xE8957A), brow=hx(0x8A3E1E), lid=hx(0x3E2416), iris=hx(0x6B4325),
    nostril=hx(0x8E4A32), lip_u=hx(0xB85F48), lip_l=hx(0xD27E62), mouth=hx(0x6E3424), scalp=hx(0x7E401E),
    outfit={0: hx(0xE8DCC0), 1: hx(0x56663E), 2: hx(0x46552F), 3: hx(0x5A3A22), 4: hx(0x5A3A22), 5: hx(0x8A7A5A), ('arms', 4): 'skin', ('arms', 2): 'skin', ('arms', 1): hx(0xE0D2B4), ('feet', 0): hx(0x6A4428), ('feet', 1): hx(0x6A4428), ('feet', 2): hx(0x3E2616), ('feet', 3): hx(0x5A3A22), ('feet', 5): hx(0x6A5A40), ('body', 0): hx(0xE8DCC0), ('body', 4): hx(0x56663E), ('body', 3): hx(0x56663E)},
    regions={10: hx(0x5A3A26), 11: hx(0xA8957A), 12: hair_fn(0x9C552D, 0x7E401E, 0x4E2410, 0x622E11, 0xD08A55), 15: hx(0x7A5A34), 16: book_fn}))
def goldie_grips(J, hc, hr):
    bp = Vector((J['spine_02'].x - 0.13, J['spine_02'].y - 0.19, J['spine_02'].z + 0.03))
    return {'book': ('spine_02', bp + Vector((-0.02, -0.05, -0.09)), (-1, 0.8, -0.6))}
CFG['goldie']['grips'] = goldie_grips
