# Hollowdeep NPC kit bake: Quaternius CC0 base + outfit -> one customised, mitten-handed, 23-bone keeper per shop.
# usage: python bake.py <keeper> [preview.glb]   (needs the bpy module; writes out/<keeper>.npz for pack.mjs)
import sys, os, math, json
sys.path.insert(0, os.path.dirname(__file__))
from kitlib import *
import numpy as np
K = sys.argv[1]; PREV = sys.argv[2] if len(sys.argv) > 2 else None
from keepers import CFG
C = CFG[K]; G = C['g']
reset()
ob_base = imp(BASE[G]); ob_out = imp(OUTFIT[G])
armB, armO = armature_of(ob_base), armature_of(ob_out)
arm = armO if G == 'M' else armB   # the male outfit is cut for the regular male skeleton; the female outfit fits the base exactly
other = armB if arm is armO else armO
parts = {}
for o in meshes(ob_base) + meshes(ob_out):
    rebind(o, arm); clean_uv(o); parts[o.name] = o
delete([o for o in ob_base + ob_out if o.type == 'MESH' and o.name.startswith('Icosphere')] + [other])
body = [o for n, o in parts.items() if n.startswith('Super') or n.startswith('SuperHero')][0]
delete([o for n, o in parts.items() if n.startswith('Eyebrows') or n == 'Face'])
eyes = [o for n, o in parts.items() if n.startswith('Eyes') or n == 'Face.001'][0]
out = {n.split('_Peasant_')[1].lower(): o for n, o in parts.items() if '_Peasant_' in n}
# base body: keep the head and neck (plus bare arms for sleeveless keepers); the outfit covers the rest
keepb = C.get('bare', set())
HEADS = {'Head', 'neck_01'}
def keep_body(ws):
    d = dom(ws)
    if d in HEADS: return True
    if 'arms' in keepb and (d.startswith('upperarm') or d.startswith('lowerarm') or d.startswith('hand') or chain_of(d)): return True
    return False
delete_faces(body, lambda c, ws, f: not keep_body(ws))
if 'arms' in keepb: delete([out.pop('arms')])
for n in C.get('drop_outfit', []): delete([out.pop(n)])
for n, fn in C.get('trim', {}).items(): delete_faces(out[n], fn)
src = {body.name: 0, eyes.name: 1}
for o in out.values(): src[o.name] = 2
# fingers: relaxed curl baked into the rest pose (the kit is mitten-handed: 23 bones)
for side in 'lr': curl_fingers(arm, side, math.radians(C.get('curl', {}).get(side, 28)))
allm = [body, eyes] + list(out.values())
pose_apply(arm, allm)
# proportions: per-bone scale (no scale inheritance), applied as the new rest
bone_scale(arm, C['scale']); pose_apply(arm, allm)
for b in arm.data.bones: b.inherit_scale = 'FULL'
# feet back on the ground, then the overall height (both through the root bone, so the meshes follow the skin)
feet = out.get('feet') or body
def mesh_min_z(o):
    dg = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(dg); return min((o.matrix_world @ v.co).z for v in e.to_mesh().vertices)
rb = arm.pose.bones['root']; R3 = arm.data.bones['root'].matrix_local.to_3x3()
rb.location = R3.inverted() @ Vector((0, 0, -mesh_min_z(feet))); bpy.context.view_layer.update(); pose_apply(arm, allm)
top = max((v.co.z for v in body.data.vertices)); f = C['h'] / (top + C.get('hair_top', 0.0))
rb.scale = (f, f, f); bpy.context.view_layer.update(); pose_apply(arm, allm)
J = {n: bone_head(arm, n) for n in KEEP}
for fn in C.get('shape', []): fn(J, out, body)
for o in allm: merge_fingers(o); drop_groups(o, set(KEEP))
gen = C['gen'](arm, J) if 'gen' in C else []
for o in gen: src[o.name] = 3
for n, t in C.get('dec', {}).items():
    o = body if n == 'head' else eyes if n == 'eyes' else out.get(n)
    if o: decimate(o, t)
rep = {o.name: tris(o) for o in allm + gen}
print('TRIS', json.dumps(rep), sum(rep.values()))
if PREV:
    for o in bpy.data.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=PREV, export_format='GLB', use_selection=False, export_animations=False)
# ---- atlas + export ----
from atlas import *
import paint as PT
hc, hr, _hv = head_frame(body)
ev = world_verts(eyes); eyes_c = [np.array(sum([v for v in ev if v.x * s > 0], Vector()) / max(1, len([v for v in ev if v.x * s > 0])), np.float32) for s in (1, -1)]
SRCID = {'arms': 2, 'body': 3, 'legs': 4, 'feet': 5}
tag(body, 0); tag(eyes, 1)
for n, o in out.items(): tag(o, SRCID[n])
for o in gen: tag(o, 9)
HAIR = {12, 13, 14}
def is_hair(o): return o in gen and o.data.attributes['rg'].data[0].value in HAIR
groups = {'head': [body], 'eyes': [eyes], 'hair': [o for o in gen if is_hair(o)], 'rest': list(out.values()) + [o for o in gen if not is_hair(o)]}
done = []
for gname, objs in groups.items():
    if not objs: continue
    g = join(objs, 'grp_' + gname) if len(objs) > 1 else objs[0]
    unwrap_pack(g, RECTS[gname], angle=C.get('uv_angle', {}).get(gname, 60)); done.append(g)
kp = join(done, 'keeper_' + K)
bones = KEEP + C.get('extra_bones', [])
mesh, TT = extract(kp, bones)
texs = {'body': PT.Tex(first(TEX[G]), 2048), 'outfit': PT.Tex(first(TEX['P']), 2048)}
fcv = PT.face_canvas(C['lm'], C['pal'], extra=C.get('face_extra'))
img = PT.paint(TT, C['pal'], fcv, texs, (hc, hr), eyes_c, scalp_fn=C['scalp'](hc, hr) if 'scalp' in C else None)
OUT = os.path.join(os.path.dirname(__file__), 'out'); os.makedirs(OUT, exist_ok=True)
img.save(os.path.join(OUT, K + '_atlas.png'))
Jy = {n: (v.x, v.z, -v.y) for n, v in J.items()}
Jy.update({n: tuple(v) for n, v in C['extra_joints'](J, hc, hr).items()} if 'extra_joints' in C else {})
D = os.path.join(OUT, K); os.makedirs(D, exist_ok=True)
meta = {'bones': bones, 'heads': [list(map(float, Jy[b])) for b in bones], 'h': C['h'], 'arrays': {}}
for k2, a in mesh.items():
    a = np.ascontiguousarray(a); a.tofile(os.path.join(D, k2 + '.bin')); meta['arrays'][k2] = [str(a.dtype), list(a.shape)]
meta['grips'] = {n: {'bone': bb, 'pos': [float(v.x), float(v.z), float(-v.y)], 'pole': [float(p[0]), float(p[2]), float(-p[1])]} for n, (bb, v, p) in C['grips'](J, hc, hr).items()} if 'grips' in C else {}
json.dump(meta, open(os.path.join(D, 'meta.json'), 'w'))
print('EXPORT', K, 'verts', len(mesh['pos']), 'tris', len(mesh['idx']) // 3, 'bones', len(bones))
