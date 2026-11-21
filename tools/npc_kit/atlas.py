# UV atlas layout (per-group smart project + pack into fixed rects of one 1024 atlas) and mesh extraction
import bpy, math, numpy as np
from kitlib import *
RECTS = {'head': (0, 0, 512, 512), 'hair': (0, 512, 512, 768), 'eyes': (0, 768, 128, 896), 'rest': (512, 0, 1024, 1024)}
def tag(ob, src, rg=None):
    me = ob.data
    a = me.attributes.get('src') or me.attributes.new('src', 'INT', 'FACE')
    for i in range(len(me.polygons)): a.data[i].value = src
    if me.attributes.get('rg') is None:
        b = me.attributes.new('rg', 'INT', 'FACE')
        for i in range(len(me.polygons)): b.data[i].value = -1 if rg is None else rg
def join(objs, name):
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); objs[0].name = name; return objs[0]
def unwrap_pack(ob, rect, angle=60, margin=0.004):
    me = ob.data
    if me.uv_layers.get('UVatlas') is None: me.uv_layers.new(name='UVatlas')
    me.uv_layers.active = me.uv_layers['UVatlas']
    set_active(ob); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=0.003, scale_to_bounds=False)
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(margin=margin, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    x0, y0, x1, y1 = rect; uv = me.uv_layers['UVatlas'].data
    # atlas pixel rect (y down) -> blender uv (v up)
    for l in uv:
        u, v = l.uv; l.uv = ((x0 + u * (x1 - x0)) / 1024, 1 - (y0 + (1 - v) * (y1 - y0)) / 1024)
def extract(ob, bones):
    # unique render vertices (position, normal, atlas uv) with skin; Blender Z-up -> three Y-up
    me = ob.data; me.calc_loop_triangles(); cn = me.corner_normals
    uvA = me.uv_layers['UVatlas'].data; uvO = me.uv_layers['UVorig'].data
    src = me.attributes['src'].data; rg = me.attributes['rg'].data
    gname = {g.index: g.name for g in ob.vertex_groups}; bidx = {b: i for i, b in enumerate(bones)}
    vskin = []
    for v in me.vertices:
        ws = sorted([(e.weight, bidx[gname[e.group]]) for e in v.groups if gname.get(e.group) in bidx and e.weight > 1e-4], reverse=True)[:4]
        if not ws: ws = [(1.0, 0)]
        s = sum(w for w, _ in ws); ws = [(w / s, b) for w, b in ws] + [(0.0, 0)] * (4 - len(ws)); vskin.append(ws)
    key = {}; P = []; N = []; UV = []; SI = []; SW = []; IDX = []; IW = []
    def inkw(s, r): return 0.0 if s == 1 or r in (15,) else 0.3 if s == 0 else 0.6 if r in (16, 30) else 0.5 if r in (12, 13, 14) else 1.0
    T = {'pa': [], 'na': [], 'uva': [], 'uvo': [], 'src': [], 'rg': []}
    for t in me.loop_triangles:
        tri = []
        for li, vi in zip(t.loops, t.vertices):
            n = cn[li].vector; a = uvA[li].uv
            k = (vi, round(a[0] * 8192), round(a[1] * 8192), round(n.x * 64), round(n.y * 64), round(n.z * 64))
            j = key.get(k)
            if j is None:
                j = key[k] = len(P); co = me.vertices[vi].co; P.append((co.x, co.z, -co.y)); N.append((n.x, n.z, -n.y)); UV.append((a[0], 1 - a[1]))
                sk = vskin[vi]; SI.append([b for _, b in sk]); SW.append([w for w, _ in sk]); IW.append(inkw(src[t.polygon_index].value, rg[t.polygon_index].value))
            tri.append(j)
        IDX.append(tri)
        T['pa'].append([tuple(me.vertices[v].co) for v in t.vertices]); T['na'].append([tuple(cn[l].vector) for l in t.loops])
        T['uva'].append([(uvA[l].uv[0] * 1024, (1 - uvA[l].uv[1]) * 1024) for l in t.loops]); T['uvo'].append([tuple(uvO[l].uv) for l in t.loops])
        T['src'].append(src[t.polygon_index].value); T['rg'].append(rg[t.polygon_index].value)
    mesh = dict(pos=np.array(P, np.float32), nrm=np.array(N, np.float32), uv=np.array(UV, np.float32), si=np.array(SI, np.uint8), sw=np.array(SW, np.float32), idx=np.array(IDX, np.uint32).reshape(-1), inkw=np.array(IW, np.float32))
    tris = {k: np.array(v, np.float32 if k not in ('src', 'rg') else np.int32) for k, v in T.items()}
    return mesh, tris
