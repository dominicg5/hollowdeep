# Bake a keeper from Art's look kit (handoff/npc/<keeper>/<keeper>_preview.glb: base parts re-UV'd to Art's 1024 atlas + Art's add-ons,
# one material) into the game's meta/bin format. Runtime-side fixes for the pilot happen here, not in Art's files:
#   stray Icosphere removed, root bone at the floor, head shape pass (rounder / cartoonier, everything on the head follows),
#   smoothed head normals (SubD transfer), per-vertex face AO, softer curl-lobe normals, apron pulled toward the skirt,
#   back straps densified and lifted off the body, a hem cap under the skirt, ledger carried by hand_r.
# usage: python bake_art.py goldie
import sys, os, math, json
sys.path.insert(0, os.path.dirname(__file__))
from kitlib import *
import numpy as np
import bmesh, mathutils
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
K = sys.argv[1]; HERE = os.path.dirname(os.path.abspath(__file__)); ART = os.path.join(HERE, 'art')
from keepers import CFG
C = CFG[K]
reset(); objs = imp(os.path.join(ART, K + '_preview.glb'))
delete([o for o in bpy.data.objects if o.name.startswith('Icosphere')]); bpy.context.view_layer.update()
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
M = {o.name: o for o in bpy.data.objects if o.type == 'MESH'}
# ---- root bone at the floor (the WIP carried z -0.221 from the feet-grounding step; nothing is weighted to root)
bpy.context.view_layer.objects.active = arm; arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones['root']; d = eb.tail - eb.head; eb.head = Vector((0, 0, 0)); eb.tail = d
bpy.ops.object.mode_set(mode='OBJECT')
J = {n: bone_head(arm, n) for n in KEEP}
head = M['Superhero_Female']; eyes = M['Eyes']
HEADPARTS = [n for n in ('Eyes', 'glasses', 'goldie_hair', 'goldie_bun', 'goldie_pencil') if n in M]
def wget(o, v, name):
    g = o.vertex_groups.get(name)
    if not g: return 0.0
    for e in v.groups:
        if e.group == g.index: return e.weight
    return 0.0
# ---- head shape pass: spherize the head toward its own ellipsoid (pulls nose/chin in, fills the narrow jaw and cheeks),
# fading out down the neck; the eyes, glasses and hair take the displacement of the nearest head vertex so nothing floats
c, r, _ = head_frame(head)
A = C.get('art_round', 0.32)
orig = [v.co.copy() for v in head.data.vertices]; disp = []
for v in head.data.vertices:
    p = v.co; q = Vector(((p.x - c.x) / r.x, (p.y - c.y) / r.y, (p.z - c.z) / r.z)); L = q.length or 1.0
    fall = smooth01((q.z + 1.6) / 0.55) * min(1.0, wget(head, v, 'Head') + 0.5 * wget(head, v, 'neck_01'))
    a = A * fall
    a += 0.22 * fall * smooth01((-q.z - 0.3) / 0.5) * smooth01((0.4 - q.y) / 0.6)   # lower face: rounder jaw, softer chin
    q2 = q * ((1 - a) + a / L)
    # a touch wider at the cheeks (cartoon), narrower chin point
    jaw = math.exp(-((q.z + 0.75) / 0.38) ** 2) * fall * smooth01((0.6 - q.y) / 0.8)
    q2.x *= 1.0 + 0.2 * jaw                                   # round the jaw out (no V chin)
    if q.z < -0.85: q2.z += 0.15 * (-0.85 - q.z) * fall * smooth01((0.5 - abs(q.x)) / 0.4)   # blunt the chin point
    dv = Vector((q2.x * r.x + c.x, q2.y * r.y + c.y, q2.z * r.z + c.z)) - p; disp.append(dv)
kd = KDTree(len(orig))
for i, p in enumerate(orig): kd.insert(p, i)
kd.balance()
for i, v in enumerate(head.data.vertices): v.co = orig[i] + disp[i]
for n in HEADPARTS:
    o = M[n]
    if n == 'Eyes':   # each eyeball moves rigidly with its socket
        for s in (1, -1):
            vs = [v for v in o.data.vertices if v.co.x * s > 0]
            if not vs: continue
            cen = sum((v.co for v in vs), Vector()) / len(vs); nb = kd.find_n(cen, 6); dv = sum((disp[j] for _, j, _ in nb), Vector()) / len(nb)
            for v in vs: v.co += dv
        continue
    for v in o.data.vertices:
        nb = kd.find_n(v.co, 4); ws = [1.0 / (dd + 1e-3) for _, _, dd in nb]; v.co += sum((disp[j] * w for (_, j, _), w in zip(nb, ws)), Vector()) / sum(ws)
head.data.update()
# ---- smoothed head normals: transfer custom normals from a SubD copy (extras6), one smoothing group
cp = head.copy(); cp.data = head.data.copy(); bpy.context.collection.objects.link(cp)
for m in list(cp.modifiers): cp.modifiers.remove(m)
sd = cp.modifiers.new('sd', 'SUBSURF'); sd.levels = 2; set_active(cp); bpy.ops.object.modifier_apply(modifier='sd')
for p in head.data.polygons: p.use_smooth = True
arm_mods = [(m.name, m.object) for m in head.modifiers if m.type == 'ARMATURE']
for m in list(head.modifiers): head.modifiers.remove(m)
dt = head.modifiers.new('dt', 'DATA_TRANSFER'); dt.object = cp; dt.use_loop_data = True; dt.data_types_loops = {'CUSTOM_NORMAL'}; dt.loop_mapping = 'POLYINTERP_NEAREST'
set_active(head); bpy.ops.object.modifier_apply(modifier='dt'); delete([cp])
for nm, ob in arm_mods: mm = head.modifiers.new(nm, 'ARMATURE'); mm.object = ob
# ---- per-vertex face AO (extras6: sockets / under the nose / under the jaw), ray-cast against the head + eyes only (no glasses rings)
bm = bmesh.new(); bm.from_mesh(head.data); bm2 = bmesh.new(); bm2.from_mesh(eyes.data); 
for v in bm2.verts: bm.verts.new(v.co)
bvh = BVHTree.FromBMesh(bm); bm.free(); bm2.free()
rng = np.random.default_rng(3); dirs = rng.normal(size=(32, 3)); dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
ao = np.ones(len(head.data.vertices), np.float32)
for v in head.data.vertices:
    n = v.normal; hit = tot = 0.0
    for dd in dirs:
        dv = Vector(dd)
        if dv.dot(n) < 0: dv = -dv
        w = dv.dot(n); tot += w; loc, _, _, _ = bvh.ray_cast(v.co + n * 0.0015, dv, 0.045)
        if loc is not None: hit += w
    ao[v.index] = 1.0 - 0.6 * (hit / tot)
ao = np.clip(ao, 0.76, 1.0)
def set_ao(o, vals):
    at = o.data.attributes.new('ao', 'FLOAT', 'POINT'); at.data.foreach_set('value', vals)
set_ao(head, ao)
for o in M.values():
    if o is not head: set_ao(o, np.ones(len(o.data.vertices), np.float32))
# ---- softer curl lobes: blend each lobe's normals toward the radial direction from the lobe centre (no 6-sided zig-zag bands)
def soften(o, k=0.55):
    bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table(); seen = set(); nrm = [Vector(v.normal) for v in bm.verts]
    for v0 in bm.verts:
        if v0.index in seen: continue
        comp = []; st = [v0]; seen.add(v0.index)
        while st:
            v = st.pop(); comp.append(v)
            for e in v.link_edges:
                w = e.other_vert(v)
                if w.index not in seen: seen.add(w.index); st.append(w)
        cen = sum((v.co for v in comp), Vector()) / len(comp)
        for v in comp:
            rd = (v.co - cen); rd = rd.normalized() if rd.length > 1e-6 else v.normal
            if rd.dot(v.normal) < 0: rd = -rd
            nrm[v.index] = (v.normal * (1 - k) + rd * k).normalized()
    bm.free()
    for p in o.data.polygons: p.use_smooth = True
    o.data.normals_split_custom_set_from_vertices(nrm)
for n in ('goldie_hair', 'goldie_bun'):
    if n in M: soften(M[n])
# ---- apron: follow the skirt bell in the side view (stays >= 3 cm off it) instead of hanging out like a board
sk = M.get('goldie_skirt'); ap = M.get('goldie_apron')
if sk and ap:
    sv = [v.co.copy() for v in sk.data.vertices]
    for v in ap.data.vertices:
        near = [s.y for s in sv if abs(s.z - v.co.z) < 0.035 and abs(s.x - v.co.x) < 0.06]
        if not near: continue
        tgt = min(near) - 0.03
        if v.co.y < tgt: v.co.y = tgt + (v.co.y - tgt) * 0.3
# ---- back straps: densify the 7-point polylines and lift them 12 mm off the vest so they stop cutting through on the back
st_o = M.get('goldie_bib_straps'); bo = M['Female_Peasant_Body']
if st_o:
    bm = bmesh.new(); bm.from_mesh(st_o.data); bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if e.calc_length() > 0.03], cuts=2, use_grid_fill=True); bm.to_mesh(st_o.data); bm.free()
    bt = bmesh.new(); bt.from_mesh(bo.data); bt.normal_update(); body_bvh = BVHTree.FromBMesh(bt); bt.free()
    for v in st_o.data.vertices:
        loc, nn, _, dd = body_bvh.find_nearest(v.co)
        if loc is None: continue
        s = (v.co - loc).dot(nn)
        if s < 0.012: v.co = loc + nn * 0.012 + (v.co - loc - nn * s) * 0.0
# ---- hem cap: a dark disc just above the hem lip so nothing reads hollow under the skirt when she walks
if sk:
    ring = [v.co for v in sk.data.vertices if v.co.z < 0.25]
    zc = 0.245; rad = min(math.hypot(p.x, p.y) for p in ring) * 0.96 if ring else 0.25
    img = np.asarray(__import__('PIL.Image', fromlist=['Image']).open(os.path.join(ART, K + '_atlas_1024.png')).convert('RGB')).astype(np.float32)
    sub = img[530:690, 530:1010].sum(2); yy, xx = np.unravel_index(np.argmin(sub), sub.shape); du, dvv = (530 + xx + 0.5) / 1024, 1 - (530 + yy + 0.5) / 1024
    bm = bmesh.new(); cyv = []
    for i in range(16):
        t = 2 * math.pi * i / 16; cyv.append(bm.verts.new((math.cos(t) * rad, math.sin(t) * rad, zc)))
    f = bm.faces.new(cyv); bmesh.ops.triangulate(bm, faces=[f])
    uvl = bm.loops.layers.uv.new('UVMap')
    for fc in bm.faces:
        fc.normal_flip() if fc.normal.z > 0 else None
        for l in fc.loops: l[uvl].uv = (du, dvv)
    me = bpy.data.meshes.new('hem_cap'); bm.to_mesh(me); bm.free(); cap = bpy.data.objects.new('hem_cap', me); bpy.context.collection.objects.link(cap)
    cap.parent = arm; g = cap.vertex_groups.new(name='pelvis'); g.add(list(range(len(me.vertices))), 1.0, 'REPLACE'); mm = cap.modifiers.new('arm', 'ARMATURE'); mm.object = arm
    me.materials.append(sk.data.materials[0]); set_ao(cap, np.ones(len(me.vertices), np.float32)); M['hem_cap'] = cap
# ---- ledger carried by hand_r: rigid-weight it to the hand, placed in the hand's rest frame so that when the IK puts the wrist on the
# grip and the runtime turns the hand with the torso (+ carry yaw), the book sits exactly where it was designed
grips = C['grips'](J, c, r); gb, G, pole = grips['book']; CARRY = math.radians(C.get('carry_yaw', 100))
lg = M.get('ledger')
if lg:
    Rz = Matrix.Rotation(-CARRY, 3, 'Z')
    for v in lg.data.vertices: v.co = J['hand_r'] + Rz @ (v.co - G)
    for gg in list(lg.vertex_groups): lg.vertex_groups.remove(gg)
    lg.vertex_groups.new(name='hand_r').add(list(range(len(lg.data.vertices))), 1.0, 'REPLACE')
# ---- mitten rig (23 bones)
EXTRA = [n for n in ('braid_00', 'braid_01', 'braid_02', 'braid_03', 'prop_l', 'prop_r') if n in arm.data.bones and any(o.vertex_groups.get(n) for o in M.values())]
BONES = KEEP + EXTRA   # Art's props may ride the palm sockets prop_l / prop_r (children of the hands); Tess's braid chain
for n in EXTRA: J[n] = bone_head(arm, n)
for o in M.values(): merge_fingers(o); drop_groups(o, set(BONES))
rep = {n: tris(o) for n, o in M.items()}; print('TRIS', json.dumps(rep), sum(rep.values()))
# ---- tags for the extractor: src 0 skin / 1 eyes / 2 cloth; rg 15 glasses, 16 ledger, 12 hair (ink widths)
RG = {'glasses': 15, 'ledger': 16, 'goldie_hair': 12, 'goldie_bun': 12, 'goldie_pencil': 30}
for n, o in M.items():
    s = 0 if n == 'Superhero_Female' else 1 if n == 'Eyes' else 2
    for nm, val in (('src', s), ('rg', RG.get(n, 0))):
        at = o.data.attributes.new(nm, 'INT', 'FACE'); at.data.foreach_set('value', [val] * len(o.data.polygons))
    uvs = o.data.uv_layers; uvs[0].name = 'UVatlas'
    if 'UVorig' not in uvs: uvs.new(name='UVorig')
from atlas import join, extract
kp = join(list(M.values()), 'keeper_' + K)
mesh, _T = extract(kp, BONES)
OUT = os.path.join(HERE, 'out'); D = os.path.join(OUT, K); os.makedirs(D, exist_ok=True)
import shutil; shutil.copy(os.path.join(ART, K + '_atlas_1024.png'), os.path.join(OUT, K + '_atlas.png'))
Jy = {n: (v.x, v.z, -v.y) for n, v in J.items()}
meta = {'bones': BONES, 'heads': [list(map(float, Jy[b])) for b in BONES], 'h': C['h'], 'arrays': {}, 'look': 'art:' + K + '_preview.glb'}
for k2, a in mesh.items():
    a = np.ascontiguousarray(a); a.tofile(os.path.join(D, k2 + '.bin')); meta['arrays'][k2] = [str(a.dtype), list(a.shape)]
meta['grips'] = {'book': {'bone': gb, 'pos': [float(G.x), float(G.z), float(-G.y)], 'pole': [float(pole[0]), float(pole[2]), float(-pole[1])], 'carry': {'bone': 'spine_02', 'yaw': CARRY}}}
json.dump(meta, open(os.path.join(D, 'meta.json'), 'w'))
print('EXPORT', K, 'verts', len(mesh['pos']), 'tris', len(mesh['idx']) // 3, 'bones', len(BONES))
