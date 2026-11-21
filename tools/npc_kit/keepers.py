import math
from kitlib import *
JJ = {}
def arm_split(sleeve_end, cuff=None, sleeve_col=None):
    # positional override for male peasant arms: cloth up to `sleeve_end` (fraction elbow->wrist; 0 = elbow), skin past it,
    # optional leather cuff band; avoids the patchy texture-class read on skin
    def fn(P, col, ol):
        e, w = JJ['elbow'], JJ['wrist']; ax = np.abs(P[:, 0]); t = (ax - e) / max(w - e, 1e-4)
        d = np.clip(ol / (np.median(ol) + 1e-4), 0.8, 1.15)[:, None] ** 0.5
        out = col.copy(); sk = t > sleeve_end; out[sk] = JJ['skin'][None] * d[sk]
        if sleeve_col is not None: out[~sk] = sleeve_col[None] * d[~sk]
        if cuff: cm = (t > cuff[0]) & (t < cuff[1]); out[cm] = cuff[2][None] * d[cm]
        return out
    return fn
def find_body(): return [o for o in bpy.data.objects if o.type == 'MESH' and o.name.lower().startswith('superhero')][0]
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

# ======================= shared builders =======================
def skirt_apron(arm, J, top_dz=0.03, hem_up=0.07, flare=0.15, apron_rg=11, apron_angle=62, bib=True, wobble=0.035, bib_angle=38):
    ob = bpy.data.objects['Female_Peasant_Body']; feet = bpy.data.objects['Female_Peasant_Feet']
    zf = max(v.z for v in world_verts(feet)); z_top = J['spine_01'].z + top_dz; z_hem = zf - hem_up
    delete_faces(ob, lambda c, ws, f: c.z < z_top - 0.03); vb = world_verts(ob)
    sk = make_skirt(arm, J, vb, z_top, z_hem, flare=flare, seg=20, rows=7, region=10, wobble=wobble)
    vs_sk = world_verts(sk) + [v for v in vb if v.z > z_top - 0.02]; cy = J['pelvis'].y; res = [sk]
    if apron_rg is not None:
        ap = front_panel(J, vs_sk, z_top + 0.02, z_hem + 0.06, math.radians(apron_angle), 7, 8, 0.012, cy, rfun=lambda t, s: 0.4 * t)
        a = make_sheet(arm, J, ap, apron_rg, skirt_weights(J, z_top, z_hem), 'apron'); orient_obj(a, (0, cy)); res.append(a)
        if bib:
            bb = front_panel(J, vb, J['spine_03'].z + 0.03, z_top + 0.03, math.radians(bib_angle), 4, 5, 0.012, J['spine_02'].y)
            b = make_sheet(arm, J, bb, apron_rg, lambda co: mix_w(('spine_03', smooth01((co.z - J['spine_02'].z) / 0.12)), ('spine_02', 1 - smooth01((co.z - J['spine_02'].z) / 0.12))), 'bib'); orient_obj(b, (0, J['spine_02'].y)); res.append(b)
    return res, vb, z_top, z_hem
def hair_lobes(arm, body, L, W, rg=12, name='hair', silver=None):
    c, r, _ = head_frame(body); bm = bmesh.new()
    for i, (a0, e0, a1, e1) in enumerate(L): lobe(bm, c, r, a0, e0, a1, e1, W)
    objs = [new_obj(name, bm, arm, lambda co: {'Head': 1.0}, rg, closed=True)]
    if silver:
        bm = bmesh.new()
        for (a0, e0, a1, e1) in silver: lobe(bm, c, r, a0, e0, a1, e1, W * 1.05)
        objs.append(new_obj(name + '_silver', bm, arm, lambda co: {'Head': 1.0}, 13, closed=True))
    return objs, c, r
def skin_pal(light, mid, shadow, deep, **kw):
    d = dict(skin=[hx(light), hx(mid), hx(shadow), hx(deep)]); d.update({k: (hx(v) if isinstance(v, int) else v) for k, v in kw.items()}); return d

# ======================= Hattie (Inn) =======================
CFG['hattie'] = dict(g='F', h=1.62, curl={'l': 30, 'r': 30}, drop_outfit=['legs'],
    scale={'Head': (1.4, 1.28, 1.36), 'neck_01': (1.3, 0.55, 1.3), 'spine_03': (1.4, 0.9, 1.32), 'spine_02': (1.55, 0.9, 1.5), 'spine_01': (1.6, 0.9, 1.55), 'pelvis': (1.55, 0.9, 1.5),
           'clavicle_l': (1, 0.85, 1), 'clavicle_r': (1, 0.85, 1), 'upperarm_l': (1.35, 0.82, 1.35), 'upperarm_r': (1.35, 0.82, 1.35), 'lowerarm_l': (1.3, 0.85, 1.3), 'lowerarm_r': (1.3, 0.85, 1.3), 'hand_l': 1.12, 'hand_r': 1.12,
           'thigh_l': (1.5, 0.76, 1.5), 'thigh_r': (1.5, 0.76, 1.5), 'calf_l': (1.35, 0.78, 1.35), 'calf_r': (1.35, 0.78, 1.35), 'foot_l': 1.12, 'foot_r': 1.12},
    dec={'head': 1100, 'eyes': 120, 'arms': 700, 'body': 600, 'feet': 500}, lm=dict(FEMALE_LM, brow_w=1.2), scalp=scalp_hairline(46, 30, -20))
def hattie_shape(J, out, body): goldie_shape(J, out, body)
def tray_geo(J):
    c = Vector((0, J['spine_01'].y - 0.30, J['spine_01'].z + 0.08)); return c
def hattie_gen(arm, J):
    body = bpy.data.objects['Superhero_Female']; res, vb, zt, zh = skirt_apron(arm, J, flare=0.13, apron_angle=58, bib_angle=34)
    L = [(-150, 60, -160, 36), (-100, 62, -110, 34), (-55, 64, -62, 40), (55, 64, 62, 40), (100, 62, 110, 34), (150, 60, 160, 36), (180, 64, 180, 30),
         (-20, 70, -32, 50), (25, 70, 36, 50), (-125, 40, -135, 12), (125, 40, 135, 12), (165, 38, 172, 6), (-165, 38, -172, 6)]
    hair, c, r = hair_lobes(arm, body, L, 0.03, silver=[(-5, 72, -12, 50)])
    # tray (wood disc + rim) with three tankards and foam, carried at the waist; rides on the chest bone, hands IK onto its rim
    bm = bmesh.new(); tc = tray_geo(J)
    cyl(bm, tc, 0.22, 0.22, 0.025, seg=14); 
    tray = new_obj('tray', bm, arm, lambda co: {'spine_02': 1.0}, 18, closed=True)
    bm = bmesh.new()
    for k in range(3):
        mc = tc + Vector((-0.12 + 0.12 * k, 0.03 * (k == 1) - 0.01, 0.0125 + 0.055)); cyl(bm, mc, 0.045, 0.042, 0.11, seg=10)
        tube(bm, [mc + Vector((0.045, 0, 0.035)), mc + Vector((0.075, 0, 0.02)), mc + Vector((0.075, 0, -0.025)), mc + Vector((0.045, 0, -0.035))], 0.009, sides=4, cap0=True, cap1=True)
    mugs = new_obj('mugs', bm, arm, lambda co: {'spine_02': 1.0}, 26, closed=True)
    bm = bmesh.new()
    for k in range(3):
        mc = tc + Vector((-0.12 + 0.12 * k, 0.03 * (k == 1) - 0.01, 0.0125 + 0.11 + 0.012)); ellipsoid(bm, mc, (0.044, 0.044, 0.02), seg=8, rings=3)
    foam = new_obj('foam', bm, arm, lambda co: {'spine_02': 1.0}, 27, closed=True)
    # earrings
    bm = bmesh.new()
    for s in (1, -1): ellipsoid(bm, Vector((c.x + s * r.x * 0.98, c.y + 0.01, c.z - r.z * 0.45)), (0.008, 0.008, 0.008), seg=6, rings=3)
    ear = new_obj('earrings', bm, arm, lambda co: {'Head': 1.0}, 30, closed=True)
    return res + hair + [tray, mugs, foam, ear]
def hattie_grips(J, hc, hr):
    tc = tray_geo(J); return {'tray_l': ('spine_02', tc + Vector((0.2, 0.02, -0.03)), (1, 0.6, -0.8)), 'tray_r': ('spine_02', tc + Vector((-0.2, 0.02, -0.03)), (-1, 0.6, -0.8))}
def mug_fn(P, N, UV):
    c = np.tile(hx(0x6A4428), (len(P), 1)); band = (np.abs(((P[:, 2] * 40) % 1) - 0.5) < 0.12); c[band] = hx(0x4A3020); return c
CFG['hattie'].update(shape=[hattie_shape], gen=hattie_gen, grips=hattie_grips, pal=dict(
    skin_pal(0xEDB07A, 0xE09B63, 0xC98450, 0xA86A3E, socket=0x9A5A34, cheek=0xD97C62, brow=0x2A1A10, lid=0x2A1A10, iris=0x4A2E1A, nostril=0x8E4A32, lip_u=0xA8584A, lip_l=0xC46E5A, mouth=0x5E2A1E, scalp=0x1E140C),
    outfit={0: hx(0xE4D4B4), 1: hx(0x56663E), 2: hx(0x46552F), 3: hx(0x5A3A22), 4: hx(0x5A3A22), 5: hx(0x8A7A5A), ('arms', 4): 'skin', ('arms', 2): 'skin', ('arms', 1): hx(0xD8C8A8), ('feet', 0): hx(0x6A4428), ('feet', 1): hx(0x6A4428), ('feet', 2): hx(0x3E2616), ('feet', 3): hx(0x5A3A22), ('feet', 5): hx(0x6A5A40), ('body', 0): hx(0xE4D4B4), ('body', 4): hx(0x56663E), ('body', 3): hx(0x56663E)},
    regions={10: hx(0x4E5C36), 11: stripes(0xA84E36, 0xC9A27A, 9, 0, 0.55), 12: hair_fn(0x4B311F, 0x322215, 0x1E140C, 0x24180F, 0x806049), 13: hair_fn(0xA9998A, 0x7E7266, 0x4A3F36, 0x6E6258, 0xD8CEC2),
             18: hx(0x6A4A2E), 26: mug_fn, 27: hx(0xF2E8D2), 30: hx(0xC9A040)}))

# ======================= Tess (Rope Maker) =======================
CFG['tess'] = dict(g='F', h=1.72, curl={'l': 32, 'r': 32}, bare={'arms'}, extra_bones=['braid_00', 'braid_01', 'braid_02', 'braid_03'],
    scale={'Head': (1.3, 1.22, 1.28), 'neck_01': (1.1, 0.8, 1.1), 'spine_03': (1.08, 0.95, 1.08), 'spine_02': (1.08, 0.95, 1.08), 'spine_01': (1.1, 0.95, 1.1), 'pelvis': (1.08, 0.95, 1.08),
           'upperarm_l': (1.05, 0.95, 1.05), 'upperarm_r': (1.05, 0.95, 1.05), 'lowerarm_l': (1.05, 0.95, 1.05), 'lowerarm_r': (1.05, 0.95, 1.05), 'thigh_l': (1.12, 0.9, 1.12), 'thigh_r': (1.12, 0.9, 1.12), 'calf_l': (1.12, 0.9, 1.12), 'calf_r': (1.12, 0.9, 1.12), 'foot_l': 1.1, 'foot_r': 1.1},
    dec={'head': 1700, 'eyes': 120, 'body': 450, 'legs': 450, 'feet': 450}, lm=dict(FEMALE_LM), scalp=scalp_hairline(36, 16, -30))
def braid_joints(J, hc, hr):
    o = Vector((hc.x, hc.y + hr.y * 0.75, hc.z - hr.z * 0.25)); pts = [o, o + Vector((0, 0.012, -0.08)), o + Vector((0, 0.03, -0.23)), o + Vector((0, 0.035, -0.39))]
    return {('braid_0%d' % i): (p.x, p.z, -p.y) for i, p in enumerate(pts)}
def tess_gen(arm, J):
    body = bpy.data.objects['Superhero_Female']; ob = bpy.data.objects['Female_Peasant_Body']; legs = bpy.data.objects['Female_Peasant_Legs']; vb = world_verts(ob)
    z_top = J['spine_01'].z + 0.08; z_hem = J['thigh_l'].z - 0.2
    vl = world_verts(legs) + vb
    tun = make_skirt(arm, J, vl, z_top, z_hem, flare=0.05, seg=16, rows=5, region=29, wobble=0.0, name='tunic')
    # ragged hem: pull every other hem vertex up
    for v in tun.data.vertices:
        if v.co.z < z_hem + 0.005:
            a = math.atan2(v.co.x, -v.co.y); v.co.z += 0.045 * (0.5 + 0.5 * math.sin(a * 5 + 0.7)) * (1 if int((a + 4) * 2.55) % 2 else 0.4)
    L = [(-150, 58, -165, 30), (-100, 60, -112, 30), (-50, 64, -66, 34), (50, 64, 66, 34), (100, 60, 112, 30), (150, 58, 165, 30), (180, 62, 180, 28),
         (-15, 68, -30, 46), (20, 68, 34, 46), (-78, 30, -84, -4), (78, 30, 84, -4)]
    hair, c, r = hair_lobes(arm, body, L, 0.03)
    # bandana: a band around the head at the hairline, knot + two tails at the back
    bm = bmesh.new(); ring = []
    for k in range(17):
        az = -180 + 360 * k / 16; p, n = on_head(c, r * 1.08, az, 42 - 16 * abs(math.cos(math.radians(az / 2))) * 0 - 10 * (1 - abs(az) / 180), out=0.012); ring.append(p)
    tube(bm, ring, 0.022, sides=4, flat=0.35, cap0=False, cap1=False)
    kn, kn_n = on_head(c, r, 180, 30, out=0.03); ellipsoid(bm, kn, (0.03, 0.025, 0.025), seg=6, rings=3)
    for s in (1, -1): tube(bm, [kn, kn + Vector((s * 0.06, 0.03, -0.02)), kn + Vector((s * 0.1, 0.05, -0.07))], [0.018, 0.016, 0.012], sides=4, flat=0.3)
    band = new_obj('bandana', bm, arm, lambda co: {'Head': 1.0}, 21, closed=True)
    # braid: 7 twisted segments down the back on the 4-bone chain (extras6 section 5)
    BJ = braid_joints(J, c, r); b0 = Vector((BJ['braid_00'][0], -BJ['braid_00'][2], BJ['braid_00'][1]))
    bm = bmesh.new(); pts = []
    for i in range(15):
        s = i / 14 * 0.55; pts.append(b0 + Vector((0.006 * math.sin(i * 1.7), 0.012 + 0.04 * min(1, s / 0.25), -s)))
    for k in range(3):   # three twisted strands
        P2 = [p + Vector((math.cos(i * 1.15 + k * 2.09) * 0.016, math.sin(i * 1.15 + k * 2.09) * 0.012, 0)) for i, p in enumerate(pts)]
        tube(bm, P2, [0.02 * (1 - 0.35 * i / 14) for i in range(15)], sides=5, flat=0.85)
    tube(bm, [pts[-1] + Vector((0, 0, 0.01)), pts[-1] + Vector((0, 0.005, -0.06))], [0.016, 0.022], sides=5)
    def bw(co):
        s = max(0.0, b0.z - co.z); seg = min(6, int(s / 0.0786))
        tbl = [{'braid_00': 1}, {'braid_00': .5, 'braid_01': .5}, {'braid_01': 1}, {'braid_01': .5, 'braid_02': .5}, {'braid_02': 1}, {'braid_02': .5, 'braid_03': .5}, {'braid_03': 1}]
        return tbl[seg]
    braid = new_obj('braid', bm, arm, bw, 12, closed=True)
    # rope coil worn across the body (right shoulder to left hip) and the Ledge Tether spool at her right hip
    bm = bmesh.new(); ctr = Vector((0.04, J['spine_02'].y, J['spine_02'].z + 0.02)); pts = []
    for k in range(25):
        a = 2 * math.pi * k / 24; rx = radius_at(vb, ctr.z + math.sin(a) * 0.0, a, cy=ctr.y, band=0.08, sector=0.4) + 0.02
        p = Vector((math.sin(a) * rx * 1.05, ctr.y - math.cos(a) * rx * 1.05, ctr.z + 0.17 * math.cos(a + 0.3) * (-1) * 0 + 0.16 * (math.sin(a) * -1) * 0.0 + (0.17 * (math.cos(a) * 0 + math.sin(a)))))
        pts.append(p)
    tube(bm, pts, 0.03, sides=6, flat=0.7, cap0=False, cap1=False)
    rope = new_obj('rope', bm, arm, lambda co: mix_w(('spine_03', smooth01((co.z - J['spine_02'].z + 0.05) / 0.15)), ('spine_01', 1 - smooth01((co.z - J['spine_02'].z + 0.05) / 0.15))), 22, closed=True)
    bm = bmesh.new(); sp = Vector((J['thigh_r'].x - 0.06, J['pelvis'].y - 0.02, J['pelvis'].z - 0.02))
    cyl(bm, sp, 0.05, 0.05, 0.11, seg=10, rot=Euler((0, math.pi / 2, 0)).to_matrix())
    spool = new_obj('spool', bm, arm, lambda co: {'pelvis': 0.7, 'thigh_r': 0.3}, 31, closed=True)
    return [tun] + hair + [band, braid, rope, spool]
def wraps_extra(out, P, N, UV, SRC, RG): pass
def tess_face(layer, C):
    import random; rnd = random.Random(7)
    def fr(d):
        for _ in range(60):
            x = 375 + rnd.gauss(0, 95); y = 445 + rnd.gauss(0, 28)
            if abs(x - 375) < 30 and y > 430: continue
            d.ellipse([x - 4, y - 3, x + 4, y + 3], fill=C(hx(0x8C4A26), 150))
    layer(fr, 1.0)
def tess_arm_paint(P, N, UV): return None
CFG['tess'].update(gen=tess_gen, extra_joints=braid_joints, face_extra=tess_face, pal=dict(
    skin_pal(0xE9B48A, 0xD9A27A, 0xBE8660, 0x9C6A48, socket=0x844622, cheek=0xD98A6A, brow=0x4A2614, lid=0x2E180C, iris=0x4E3A1E, nostril=0x5A2C14, lip_u=0xA85E4A, lip_l=0xC07A60, mouth=0x5A2A1A, scalp=0x2E1A0C),
    outfit={0: hx(0xA08460), 1: hx(0xA08460), 2: hx(0x6E4A2E), 3: hx(0x5A3A22), 4: hx(0x6A4428), 5: hx(0x7A6A50), ('legs', 0): hx(0x7A5636), ('legs', 1): hx(0x7A5636), ('legs', 4): hx(0x6E4A2E), ('legs', 2): hx(0x5A3A24),
            ('feet', 0): hx(0x6A4428), ('feet', 1): hx(0x6A4428), ('feet', 2): hx(0x3E2616), ('feet', 3): hx(0x6A4428), ('body', 2): hx(0x8A6E4E), ('body', 4): hx(0x8A6E4E)},
    regions={29: hx(0xA08460), 12: hair_fn(0x5A321A, 0x3E2010, 0x24120A, 0x2E180C, 0x8A5A36, period=7), 21: hx(0x5A7038), 22: stripes(0x8A6A40, 0x6E5230, 14, 0, 0.5), 31: stripes(0x4E9AA0, 0x2E6A70, 6, 1, 0.6)}))

# ======================= Brannick (Smithy) =======================
CFG['brannick'] = dict(g='M', h=1.92, curl={'l': 34, 'r': 50},
    scale={'Head': (1.3, 1.22, 1.3), 'neck_01': (1.5, 0.6, 1.5), 'spine_03': (1.45, 0.95, 1.45), 'spine_02': (1.5, 0.95, 1.5), 'spine_01': (1.45, 0.95, 1.4), 'pelvis': (1.3, 0.95, 1.3),
           'clavicle_l': (1.2, 1.1, 1.2), 'clavicle_r': (1.2, 1.1, 1.2), 'upperarm_l': (1.5, 0.92, 1.5), 'upperarm_r': (1.5, 0.92, 1.5), 'lowerarm_l': (1.5, 0.9, 1.5), 'lowerarm_r': (1.5, 0.9, 1.5), 'hand_l': 1.25, 'hand_r': 1.25,
           'thigh_l': (1.4, 0.8, 1.4), 'thigh_r': (1.4, 0.8, 1.4), 'calf_l': (1.35, 0.8, 1.35), 'calf_r': (1.35, 0.8, 1.35), 'foot_l': 1.2, 'foot_r': 1.2},
    dec={'head': 1050, 'eyes': 110, 'arms': 800, 'body': 650, 'legs': 450, 'feet': 500}, lm=dict(MALE_LM, brow_w=1.5, brow_y=56))
def brannick_shape(J, out, body):
    b = out['body']
    bulge(b, (0, J['spine_03'].y - 0.06, J['spine_03'].z - 0.04), (0.3, 0.22, 0.2), 0.07, axis=(0, -1, 0))   # barrel chest
    bulge(b, (0, J['spine_02'].y, J['spine_02'].z), (0.32, 0.3, 0.24), 0.05)                                   # round torso
    bulge(b, (0, J['spine_01'].y - 0.08, J['spine_01'].z), (0.22, 0.18, 0.16), 0.04, axis=(0, -1, 0))          # belly
def hammer_line(J):
    g = Vector((J['upperarm_r'].x + 0.02, J['spine_03'].y - 0.2, J['spine_03'].z + 0.02)); d = Vector((-0.12, 0.62, 0.78)).normalized(); return g, d
def brannick_gen(arm, J):
    JJ.update(elbow=abs(J['lowerarm_l'].x), wrist=abs(J['hand_l'].x), skin=CFG['brannick']['pal']['skin'][1])
    body = find_body()
    ob = bpy.data.objects['Male_Peasant_Body']; legs = bpy.data.objects['Male_Peasant_Legs']; vb = world_verts(ob) + world_verts(legs)
    c, r, _ = head_frame(body)
    # leather apron: bib from the chest, skirt panel to the knee
    z_top = J['spine_03'].z + 0.06; z_bot = J['calf_l'].z + 0.05
    ap = front_panel(J, vb, z_top, z_bot, math.radians(55), 9, 8, 0.016, J['spine_01'].y, rfun=lambda t, s: 0.6 * max(0, t - 0.45))
    apron = make_sheet(arm, J, ap, 25, lambda co: mix_w(('spine_03', smooth01((co.z - J['spine_01'].z) / 0.25)), ('pelvis', 1 - smooth01((co.z - J['spine_01'].z) / 0.25)), ('thigh_' + ('l' if co.x > 0 else 'r'), 0.4 * smooth01((J['pelvis'].z - co.z) / 0.3))), 'apron')
    orient_obj(apron, (0, J['spine_01'].y))
    # beard: a full mass under the jaw with two braids hanging to the chest
    bm = bmesh.new(); bc = Vector((c.x, c.y - r.y * 0.55, c.z - r.z * 0.62))
    ellipsoid(bm, bc, (r.x * 0.82, r.y * 0.55, r.z * 0.45), seg=10, rings=5)
    for s in (1, -1):
        p0 = bc + Vector((s * 0.05, -0.02, -0.06)); pts = [p0 + Vector((0, -0.005 * i, -0.045 * i)) for i in range(6)]
        tube(bm, pts, [0.024, 0.022, 0.02, 0.019, 0.018, 0.02], sides=5, twist=0.9)
    mo, _ = on_head(c, r, 0, -18, out=0.0)
    for s in (1, -1): tube(bm, [mo + Vector((0, -0.01, 0.0)), mo + Vector((s * 0.05, -0.008, -0.012)), mo + Vector((s * 0.085, 0.0, -0.04))], [0.016, 0.018, 0.012], sides=5)
    beard = new_obj('beard', bm, arm, lambda co: {'Head': 0.6, 'neck_01': 0.4} if co.z < c.z - r.z * 0.9 else {'Head': 1.0}, 14, closed=True)
    # brass goggles pushed up on the forehead, on a leather strap
    bm = bmesh.new(); ring = []
    for k in range(17):
        az = -180 + 360 * k / 16; p, n = on_head(c, r * 1.02, az, 34 - 8 * (abs(az) / 180), out=0.008); ring.append(p)
    tube(bm, ring, 0.014, sides=4, flat=0.4, cap0=False, cap1=False)
    strap = new_obj('strap', bm, arm, lambda co: {'Head': 1.0}, 25, closed=True)
    bm = bmesh.new()
    for s in (1, -1):
        p, n = on_head(c, r, s * 22, 38, out=0.018); cyl(bm, p, 0.03, 0.026, 0.03, seg=10, rot=Vector((0, 0, 1)).rotation_difference(n).to_matrix())
    gog = new_obj('goggles', bm, arm, lambda co: {'Head': 1.0}, 30, closed=True)
    # sledgehammer on his right shoulder (rides on the chest; the right hand IK-locks onto the haft)
    g, d = hammer_line(J); bm = bmesh.new()
    a, b = g - d * 0.14, g + d * 0.62; cyl(bm, (a + b) / 2, 0.022, 0.02, (b - a).length, seg=7, rot=Vector((0, 0, 1)).rotation_difference(d).to_matrix())
    haft = new_obj('haft', bm, arm, lambda co: {'spine_03': 1.0}, 18, closed=True)
    bm = bmesh.new(); side = d.cross(Vector((1, 0, 0))).normalized()
    boxm(bm, b + d * 0.02, (0.1, 0.1, 0.22), rot=Vector((0, 0, 1)).rotation_difference(side).to_matrix())
    head = new_obj('hammerhead', bm, arm, lambda co: {'spine_03': 1.0}, 19, closed=True)
    return [apron, beard, strap, gog, haft, head]
def brannick_grips(J, hc, hr):
    g, d = hammer_line(J); return {'hammer': ('spine_03', g, (-1, 0.2, -1.0))}
def iron_fn(P, N, UV): c = np.tile(hx(0x5E6066), (len(P), 1)); c[N[:, 2] > 0.6] = hx(0x7A7C80); return c
CFG['brannick'].update(shape=[brannick_shape], gen=brannick_gen, grips=brannick_grips, pal=dict(
    skin_pal(0xDDA078, 0xC98A62, 0xAE7050, 0x8E5838, socket=0x7E4A2C, cheek=0xD9785A, brow=0x6E6A66, lid=0x3A2014, iris=0x3E2C1C, nostril=0x5E3220, lip_u=0x9A5444, lip_l=0xB0644E, mouth=0x4E2418, scalp=0xC98A62, cheek_a=0.6),
    outfit={0: hx(0x8A3226), 1: hx(0x6A4428), 2: hx(0x3E2A1A), 3: hx(0x5A3A22), 4: hx(0x5A3A22), 5: hx(0x8A7A5A), ('arms', 4): hx(0x6A4428), ('arms', 2): 'skin', ('legs', 0): hx(0x464A32), ('legs', 4): hx(0x464A32), ('legs', 2): hx(0x3A3E28), ('legs', 1): hx(0x464A32),
            ('feet', 0): hx(0x5A3A22), ('feet', 1): hx(0x5A3A22), ('feet', 2): hx(0x3E2616), ('feet', 3): hx(0x5A3A22), ('body', 4): hx(0x8A3226), ('body', 1): hx(0x8A3226)},
    regions={25: hx(0x6A4428), 14: hair_fn(0x8C8A86, 0x6A6864, 0x4A4846, 0x5E5C58, 0xB8B4AE, period=8), 30: hx(0x9A7A3A), 18: hx(0x5A3A22), 19: iron_fn}))

# ======================= Fennick (Guide's Hut) =======================
CFG['fennick'] = dict(g='M', h=1.22, curl={'l': 30, 'r': 52},
    scale={'Head': (1.55, 1.45, 1.5), 'neck_01': (1.2, 0.5, 1.2), 'spine_03': (1.15, 0.8, 1.15), 'spine_02': (1.2, 0.8, 1.2), 'spine_01': (1.25, 0.82, 1.2), 'pelvis': (1.2, 0.85, 1.2),
           'upperarm_l': (1.15, 0.78, 1.15), 'upperarm_r': (1.15, 0.78, 1.15), 'lowerarm_l': (1.15, 0.8, 1.15), 'lowerarm_r': (1.15, 0.8, 1.15), 'hand_l': 1.1, 'hand_r': 1.1,
           'thigh_l': (1.2, 0.68, 1.2), 'thigh_r': (1.2, 0.68, 1.2), 'calf_l': (1.15, 0.7, 1.15), 'calf_r': (1.15, 0.7, 1.15), 'foot_l': 1.05, 'foot_r': 1.05},
    dec={'head': 1000, 'eyes': 100, 'arms': 650, 'body': 500, 'legs': 350, 'feet': 450}, lm=dict(MALE_LM, brow_w=1.7, brow_y=58))
def staff_line(J): return Vector((J['thigh_r'].x - 0.1, J['pelvis'].y - 0.14, 0.0))
def fennick_gen(arm, J):
    JJ.update(elbow=abs(J['lowerarm_l'].x), wrist=abs(J['hand_l'].x), skin=CFG['fennick']['pal']['skin'][1])
    body = find_body()
    ob = bpy.data.objects['Male_Peasant_Body']; legs = bpy.data.objects['Male_Peasant_Legs']; vb = world_verts(ob) + world_verts(legs)
    c, r, _ = head_frame(body)
    # cloak: open at the front, from the shoulders to the shins, ragged hem; hood folded at the back
    z_top = J['neck_01'].z - 0.02; z_hem = J['calf_l'].z - 0.12; cy = J['spine_02'].y; seg = 18; rows = 8; rings = []
    for i in range(rows + 1):
        t = i / rows; z = z_top + (z_hem - z_top) * t; ring = []
        for k in range(seg + 1):
            th = math.radians(28) + (2 * math.pi - math.radians(56)) * k / seg; rr = radius_at(vb, z, th, cy=cy, band=0.05, sector=0.35) + 0.02 + 0.07 * t * t
            zz = z + (0.03 * math.sin(th * 7) if i == rows else 0); ring.append(Vector((math.sin(th) * rr, cy - math.cos(th) * rr, zz)))
        rings.append(ring)
    bm = bmesh.new(); ring_grid(bm, rings, closed=False)
    hc = Vector((c.x, c.y + r.y * 1.05, z_top + 0.02)); ellipsoid(bm, hc, (0.13, 0.07, 0.07), seg=8, rings=4)
    cloak = new_obj('cloak', bm, arm, lambda co: mix_w(('spine_03', smooth01((co.z - J['spine_01'].z) / 0.2)), ('pelvis', 1 - smooth01((co.z - J['spine_01'].z) / 0.2)), ('thigh_' + ('l' if co.x > 0 else 'r'), 0.35 * smooth01((J['pelvis'].z - co.z) / 0.25))), 23, axis_c=(0, cy))
    # beard: one lofted shell, three lobes on its bottom edge, a two-lobe mustache over it (extras6 section 3)
    bm = bmesh.new(); top = c.z - r.z * 0.35; H = 0.27 * 1.0; rows = []
    for i in range(7):
        t = i / 6; z = top - H * t; row = []
        for j in range(9):
            s = j / 8; th = math.radians(-80 + 160 * s)
            lobe_ = 0.035 * (math.cos((s - 0.5) * math.pi * 3) ** 2) * t ** 3 if t > 0.6 else 0
            rr = (r.x * (1.0 - 0.45 * t)) ; fw = 0.11 * math.sin(math.pi * min(1, t * 1.4)) * (1 - abs(s - 0.5) * 1.2)
            row.append(Vector((math.sin(th) * rr * 1.05, c.y - math.cos(th) * r.y * (0.75 - 0.3 * t) - fw, z - lobe_)))
        rows.append(row)
    ring_grid(bm, rows, closed=False)
    mo, _ = on_head(c, r, 0, -12, out=0.012)
    for s in (1, -1): tube(bm, [mo, mo + Vector((s * 0.06, -0.01, -0.015)), mo + Vector((s * 0.1, 0.0, -0.05))], [0.022, 0.026, 0.018], sides=5)
    for s in (1, -1):   # white side tufts under the cap
        p, n = on_head(c, r, s * 95, 10, out=0.01); ellipsoid(bm, p, (0.035, 0.05, 0.05), seg=6, rings=4)
        p, n = on_head(c, r, s * 135, 5, out=0.01); ellipsoid(bm, p, (0.035, 0.05, 0.05), seg=6, rings=4)
    beard = new_obj('beard', bm, arm, lambda co: {'Head': 0.6, 'neck_01': 0.4} if co.z < top - H * 0.66 else {'Head': 1.0}, 14, point=(c.x, c.y + 0.05, c.z - 0.1))
    # big white brows
    bm = bmesh.new()
    for s in (1, -1):
        p, n = on_head(c, r, s * 22, 28, out=0.006); tube(bm, [p + Vector((-s * 0.03, 0, -0.004)), p, p + Vector((s * 0.035, 0.0, -0.012))], [0.012, 0.016, 0.01], sides=4, flat=0.6)
    brows = new_obj('brows', bm, arm, lambda co: {'Head': 1.0}, 14, closed=True)
    # knit cap
    bm = bmesh.new(); prof = [(c.z + r.z * 0.25, 1.06), (c.z + r.z * 0.6, 0.98), (c.z + r.z * 0.88, 0.75), (c.z + r.z * 1.05, 0.3)]
    rings = []
    for z, m in prof:
        ring = []
        for k in range(14):
            th = 2 * math.pi * k / 14; ring.append(Vector((c.x + math.sin(th) * r.x * m, c.y - math.cos(th) * r.y * m, z)))
        rings.append(ring)
    ring_grid(bm, rings, True, cap1=True); cap = new_obj('cap', bm, arm, lambda co: {'Head': 1.0}, 24, closed=True)
    # staff planted at his right side with the crystal on top; the right hand IK-locks onto it
    s0 = staff_line(J); bm = bmesh.new(); cyl(bm, s0 + Vector((0, 0, 0.6)), 0.02, 0.016, 1.2, seg=7)
    staff = new_obj('staff', bm, arm, lambda co: {'root': 1.0}, 18, closed=True)
    bm = bmesh.new(); ellipsoid(bm, s0 + Vector((0, 0, 1.27)), (0.04, 0.04, 0.085), seg=6, rings=3); crys = new_obj('crystal', bm, arm, lambda co: {'root': 1.0}, 20, closed=True)
    # brass bell on a cord at the chest
    bm = bmesh.new(); cyl(bm, Vector((0.02, J['spine_02'].y - 0.16, J['spine_02'].z - 0.02)), 0.022, 0.035, 0.06, seg=8); bell = new_obj('bell', bm, arm, lambda co: {'spine_02': 1.0}, 30, closed=True)
    return [cloak, beard, brows, cap, staff, crys, bell]
def fennick_grips(J, hc, hr): s0 = staff_line(J); return {'staff': ('root', s0 + Vector((0.0, 0.0, J['spine_01'].z - 0.02)), (-1, 0.8, -0.6))}
def beard_fn(P, N, UV):
    c = np.tile(hx(0xE1C8AD), (len(P), 1)); u = UV[:, 0]; st = np.abs(((u * 26) % 1) - 0.5) < 0.1; c[st] = hx(0xA48B72)
    c = c + (hx(0xB9A085) - c) * sstep(0.0, -0.6, N[:, 2])[:, None]; c = c + (hx(0xF4E8D6) - c) * (sstep(0.5, 0.9, N[:, 2]) * 0.7)[:, None]; return c
def knit_fn(P, N, UV): c = np.tile(hx(0x8A6438), (len(P), 1)); st = np.abs(((UV[:, 0] * 28) % 1) - 0.5) < 0.18; c[st] = hx(0x6E4C28); return c
CFG['fennick'].update(gen=fennick_gen, grips=fennick_grips, pal=dict(
    skin_pal(0xA06A44, 0x8A5A3A, 0x704628, 0x5A361C, socket=0x5E3016, cheek=0xB87040, brow=0xE1C8AD, lid=0x2A140A, iris=0x2E1C10, nostril=0x4A2614, lip_u=0x7A4430, lip_l=0x8E5038, mouth=0x3A1A0E, scalp=0x8A5A3A, cheek_a=0.5),
    outfit={0: hx(0xB09A72), 1: hx(0x8A6A44), 2: hx(0x5A4024), 3: hx(0x7A5434), 4: hx(0x7A5434), 5: hx(0x8A7A5A), ('arms', 0): hx(0x56603A), ('arms', 4): hx(0x56603A), ('arms', 2): 'skin', ('arms', 1): hx(0x56603A), ('legs', 0): hx(0x6A5030), ('legs', 4): hx(0x6A5030),
            ('feet', 0): hx(0x7A5434), ('feet', 1): hx(0x7A5434), ('feet', 2): hx(0x5A3A22), ('feet', 3): hx(0x8A6040)},
    regions={23: hx(0x56603A), 14: beard_fn, 24: knit_fn, 18: hx(0x6A4A2E), 20: hx(0x3FC0A8), 30: hx(0xB08A3A)}))

CFG['brannick']['pal']['arm_fn'] = arm_split(-0.15, cuff=(0.72, 0.92, hx(0x6A4428)))
CFG['fennick']['pal']['arm_fn'] = arm_split(0.94, sleeve_col=hx(0x56603A))
