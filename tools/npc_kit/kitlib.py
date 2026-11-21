# Hollowdeep NPC kit: Blender helpers (run with Blender's Python, bpy 4.x/5.x)
import bpy, bmesh, glob, math, os
from mathutils import Vector, Matrix, Quaternion, Euler
SRC = os.environ.get('NPCKIT_SRC', '/workspace/npckit_src')
def first(pat):
    r = glob.glob(os.path.join(SRC, pat)); assert r, pat; return r[0]
BASE = {'F': 'ubc/*/Base Characters/Godot - UE/Superhero_Female_FullBody.gltf', 'M': 'ubc/*/Base Characters/Godot - UE/Superhero_Male_FullBody.gltf'}
OUTFIT = {'F': 'mcof/*/Exports/glTF*/Outfits/Female_Peasant.gltf', 'M': 'mcof/*/Exports/glTF*/Outfits/Male_Peasant.gltf'}
TEX = {'F': 'ubc/*/Base Characters/Textures/T_Superhero_Female_Light_BaseColor.png', 'M': 'ubc/*/Base Characters/Textures/T_Superhero_Male_Ligh.png', 'P': 'mcof/*/Exports/glTF*/Outfits/T_Peasant_BaseColor.png'}
KEEP = ['root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r']
FINGERS = ['index', 'middle', 'ring', 'pinky', 'thumb']

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(rel):
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=first(rel)); return [o for o in bpy.data.objects if o not in before]
def ctx(ob, **kw):
    return bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob], **kw)
def set_active(ob):
    for o in bpy.context.view_layer.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
def delete(objs):
    for o in objs: bpy.data.objects.remove(o, do_unlink=True)
def armature_of(objs):
    return [o for o in objs if o.type == 'ARMATURE'][0]
def meshes(objs):
    return [o for o in objs if o.type == 'MESH' and not o.name.startswith('Icosphere')]
def rebind(ob, arm):
    ob.parent = arm; ob.matrix_parent_inverse = Matrix()
    for m in ob.modifiers:
        if m.type == 'ARMATURE': m.object = arm
    if not any(m.type == 'ARMATURE' for m in ob.modifiers):
        m = ob.modifiers.new('Armature', 'ARMATURE'); m.object = arm
def clean_uv(ob, name='UVorig'):
    me = ob.data
    while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
    if len(me.uv_layers) == 0: me.uv_layers.new(name=name)
    me.uv_layers[0].name = name
    for a in [a.name for a in me.color_attributes]: me.color_attributes.remove(me.color_attributes[a])
def wsum(ob, v, names):
    s = 0
    for g in v.groups:
        if ob.vertex_groups[g.group].name in names: s += g.weight
    return s
def delete_verts(ob, pred):
    bm = bmesh.new(); bm.from_mesh(ob.data); dl = bm.verts.layers.deform.active; idx = {g.index: g.name for g in ob.vertex_groups}
    kill = [v for v in bm.verts if pred(v.co, {idx[k]: w for k, w in v[dl].items()} if dl else {})]
    bmesh.ops.delete(bm, geom=kill, context='VERTS'); bm.to_mesh(ob.data); bm.free(); ob.data.update()
def delete_faces(ob, pred):
    bm = bmesh.new(); bm.from_mesh(ob.data); dl = bm.verts.layers.deform.active; idx = {g.index: g.name for g in ob.vertex_groups}
    def W(v): return {idx[k]: w for k, w in v[dl].items()} if dl else {}
    kill = [f for f in bm.faces if pred(f.calc_center_median(), [W(v) for v in f.verts], f)]
    bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(ob.data); bm.free(); ob.data.update()
def dom(ws):
    tot = {}
    for w in ws:
        for k, x in w.items(): tot[k] = tot.get(k, 0) + x
    return max(tot, key=tot.get) if tot else ''
def chain_of(name):
    for f in FINGERS:
        if name.startswith(f + '_'): return f
    return None
def merge_fingers(ob):
    # mitten hands: every finger weight goes to its hand (the curl is baked into the rest pose first)
    for side in 'lr':
        h = ob.vertex_groups.get('hand_' + side) or ob.vertex_groups.new(name='hand_' + side)
        fg = [g for g in ob.vertex_groups if chain_of(g.name) and g.name.endswith('_' + side)]
        if not fg: continue
        for v in ob.data.vertices:
            s = 0
            for g in v.groups:
                if ob.vertex_groups[g.group] in fg: s += g.weight
            if s > 0: h.add([v.index], s, 'ADD')
        for g in fg: ob.vertex_groups.remove(g)
def drop_groups(ob, keep):
    # any weight on a dropped bone goes to its nearest kept ancestor
    arm = ob.parent
    for g in list(ob.vertex_groups):
        if g.name in keep: continue
        b = arm.data.bones.get(g.name); tgt = None
        while b is not None and b.parent is not None:
            b = b.parent
            if b.name in keep: tgt = b.name; break
        if tgt:
            t = ob.vertex_groups.get(tgt) or ob.vertex_groups.new(name=tgt)
            for v in ob.data.vertices:
                for e in v.groups:
                    if e.group == g.index and e.weight > 0: t.add([v.index], e.weight, 'ADD')
        ob.vertex_groups.remove(g)
def apply_armature(ob):
    for m in list(ob.modifiers):
        if m.type == 'ARMATURE':
            arm = m.object
            with ctx(ob): bpy.ops.object.modifier_apply(modifier=m.name)
            m2 = ob.modifiers.new('Armature', 'ARMATURE'); m2.object = arm
def pose_apply(arm, mesh_objs):
    for o in mesh_objs: apply_armature(o)
    set_active(arm); bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='SELECT'); bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode='OBJECT')
def curl_fingers(arm, side, amt):
    # relaxed curl on each finger joint, sign picked so the tips move toward the palm (-Z in the T-pose)
    pb = arm.pose.bones
    for f in FINGERS:
        for j in (1, 2, 3):
            b = pb.get('%s_0%d_%s' % (f, j, side))
            if not b: continue
            a = amt * (0.6 if f == 'thumb' else 1.0) * (0.7 if j == 1 else 1.0)
            b.rotation_mode = 'XYZ'
            best = None
            for ax in ('X', 'Z'):
                for sg in (1, -1):
                    b.rotation_euler = (0, 0, 0); bpy.context.view_layer.update(); tip = arm.matrix_world @ b.tail
                    e = [0, 0, 0]; e['XYZ'.index(ax)] = sg * a; b.rotation_euler = e; bpy.context.view_layer.update(); t2 = arm.matrix_world @ b.tail
                    score = (t2.z - tip.z) if f != 'thumb' else -(abs(t2.y - tip.y)) + (t2.z - tip.z) * 0.3
                    if best is None or score < best[0]: best = (score, tuple(e))
            b.rotation_euler = best[1]
    bpy.context.view_layer.update()
def bone_scale(arm, table):
    for b in arm.data.bones: b.inherit_scale = 'NONE'
    for n, s in table.items():
        pb = arm.pose.bones.get(n)
        if pb is None: continue
        pb.scale = s if isinstance(s, (tuple, list)) else (s, s, s)
    bpy.context.view_layer.update()
def bone_head(arm, n):
    return arm.matrix_world @ arm.data.bones[n].head_local
def bulge(ob, c, r, amt, axis=None, falloff=2.0, lim=None):
    # push verts out from centre c (or along axis) with a smooth falloff of radius r (metres, per axis tuple)
    c = Vector(c); r = Vector(r if isinstance(r, (tuple, list)) else (r, r, r))
    for v in ob.data.vertices:
        d = v.co - c; q = Vector((d.x / r.x, d.y / r.y, d.z / r.z)).length
        if q >= 1: continue
        if lim and not lim(v.co): continue
        w = (1 - q * q) ** falloff
        if axis is not None: v.co += Vector(axis) * (amt * w)
        else:
            dd = Vector((d.x, d.y, 0)) if d.length > 1e-6 else Vector((0, -1, 0))
            if dd.length < 1e-6: dd = Vector((0, -1, 0))
            v.co += dd.normalized() * (amt * w)
    ob.data.update()
def decimate(ob, tris):
    ob.data.calc_loop_triangles(); n = len(ob.data.loop_triangles)
    if n <= tris: return n
    m = ob.modifiers.new('Dec', 'DECIMATE'); m.ratio = tris / n; m.use_collapse_triangulate = True
    # keep the decimate before the armature modifier
    while ob.modifiers[0].name != 'Dec':
        with ctx(ob): bpy.ops.object.modifier_move_up(modifier='Dec')
    with ctx(ob): bpy.ops.object.modifier_apply(modifier='Dec')
    ob.data.calc_loop_triangles(); return len(ob.data.loop_triangles)
def tris(ob):
    ob.data.calc_loop_triangles(); return len(ob.data.loop_triangles)

# ---------- generated parts ----------
def orient(bm, axis_c=None, point=None):
    # make normals face away from a vertical axis through axis_c (sheets, skirts) or from a point; closed shells use recalc
    if axis_c is None and point is None:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return
    bm.normal_update(); s = 0
    for f in bm.faces:
        c = f.calc_center_median(); d = (c - Vector(point)) if point is not None else Vector((c.x - axis_c[0], c.y - axis_c[1], 0)); s += d.dot(f.normal)
    if s < 0:
        for f in bm.faces: f.normal_flip()
    bm.normal_update()
def new_obj(name, bm, arm, weights, region, paint_uv=None, axis_c=None, point=None, closed=False):
    if closed or axis_c is not None or point is not None: orient(bm, axis_c, point)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    if me.uv_layers.get('UVorig') is None: me.uv_layers.new(name='UVorig')
    while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
    rebind(ob, arm)
    for v in me.vertices:
        for b, w in weights(v.co).items():
            if w <= 0: continue
            g = ob.vertex_groups.get(b) or ob.vertex_groups.new(name=b); g.add([v.index], w, 'REPLACE')
    a = me.attributes.new('rg', 'INT', 'FACE')
    for i, p in enumerate(me.polygons): a.data[i].value = region(p) if callable(region) else region
    for p in me.polygons: p.use_smooth = True
    return ob
def ring_grid(bm, rings, closed=True, cap0=False, cap1=False, uvl=None, uvs=None):
    # rings: list of lists of Vectors (same count). returns faces; uv: (u around, v along)
    R = len(rings); C = len(rings[0]); vs = [[bm.verts.new(p) for p in r] for r in rings]; fs = []
    for i in range(R - 1):
        for j in range(C if closed else C - 1):
            j2 = (j + 1) % C; f = bm.faces.new((vs[i][j], vs[i][j2], vs[i + 1][j2], vs[i + 1][j])); fs.append((f, i, j))
    caps = []
    if cap0: caps.append(bm.faces.new(list(reversed(vs[0]))))
    if cap1: caps.append(bm.faces.new(vs[-1]))
    bm.normal_update()
    uvl = bm.loops.layers.uv.get('UVorig') or bm.loops.layers.uv.new('UVorig')
    for f, i, j in fs:
        for l in f.loops:
            vi = next(k for k in range(R) if l.vert in vs[k]); vj = vs[vi].index(l.vert)
            u = vj / C if not (j == C - 1 and vj == 0) else 1.0
            l[uvl].uv = (u, vi / (R - 1))
    for f in caps:
        for l in f.loops: l[uvl].uv = (0.5, 1.0)
    return vs
def lathe(bm, prof, seg=16, cx=0, cy=0, rfun=None, cap0=False, cap1=False, yaw0=0):
    # prof: [(z, r)], rfun(theta, z) -> radius multiplier. theta 0 = front (-Y)
    rings = []
    for z, r in prof:
        ring = []
        for k in range(seg):
            t = yaw0 + 2 * math.pi * k / seg; m = rfun(t, z) if rfun else 1.0
            ring.append(Vector((cx + math.sin(t) * r * m, cy - math.cos(t) * r * m, z)))
        rings.append(ring)
    return ring_grid(bm, rings, True, cap0, cap1)
def tube(bm, pts, rad, sides=6, flat=1.0, up=Vector((0, 0, 1)), cap0=True, cap1=True, twist=0.0):
    # a swept tube with a flattened cross-section; ends are capped (never collapsed to a point)
    pts = [Vector(p) for p in pts]; rings = []; n = len(pts)
    for i, p in enumerate(pts):
        t = (pts[min(n - 1, i + 1)] - pts[max(0, i - 1)]).normalized(); u = up - t * up.dot(t)
        if u.length < 1e-4: u = Vector((1, 0, 0)) - t * t.x
        u.normalize(); w = t.cross(u); r = rad[i] if isinstance(rad, (list, tuple)) else rad; ring = []
        for k in range(sides):
            a = 2 * math.pi * k / sides + twist * i; ring.append(p + u * math.cos(a) * r * flat + w * math.sin(a) * r)
        rings.append(ring)
    return ring_grid(bm, rings, True, cap0, cap1)
def ellipsoid(bm, c, r, seg=8, rings=5, rot=None):
    c = Vector(c); R = []
    for i in range(1, rings):
        ph = math.pi * i / rings; ring = []
        for k in range(seg):
            t = 2 * math.pi * k / seg; p = Vector((math.sin(ph) * math.cos(t) * r[0], math.sin(ph) * math.sin(t) * r[1], math.cos(ph) * r[2]))
            if rot: p = rot @ p
            ring.append(c + p)
        R.append(ring)
    vs = ring_grid(bm, R, True)
    top = bm.verts.new(c + ((rot @ Vector((0, 0, r[2]))) if rot else Vector((0, 0, r[2])))); bot = bm.verts.new(c + ((rot @ Vector((0, 0, -r[2]))) if rot else Vector((0, 0, -r[2]))))
    for k in range(seg):
        k2 = (k + 1) % seg; bm.faces.new((top, vs[0][k], vs[0][k2])); bm.faces.new((bot, vs[-1][k2], vs[-1][k]))
    bm.normal_update(); return vs
def boxm(bm, c, s, rot=None):
    m = Matrix.Translation(Vector(c)) @ (rot.to_4x4() if rot else Matrix()) @ Matrix.Diagonal((s[0], s[1], s[2], 1))
    r = bmesh.ops.create_cube(bm, size=1.0, matrix=m); return r
def cyl(bm, c, r1, r2, h, seg=10, rot=None, cap=True):
    m = Matrix.Translation(Vector(c)) @ (rot.to_4x4() if rot else Matrix())
    return bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h, matrix=m)

# ---------- fitting helpers ----------
def world_verts(o):
    dg = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(dg); m = e.to_mesh(); r = [o.matrix_world @ v.co for v in m.vertices]; e.to_mesh_clear(); return r
def radius_at(vs, z, theta, cy=0.0, cx=0.0, band=0.025, sector=0.35):
    best = 0.0
    for v in vs:
        if abs(v.z - z) > band: continue
        dx, dy = v.x - cx, v.y - cy; t = math.atan2(dx, -dy); d = math.atan2(math.sin(t - theta), math.cos(t - theta))
        if abs(d) < sector: best = max(best, math.hypot(dx, dy))
    return best
def head_frame(body):
    # the head as an ellipsoid (centre, radii) from the verts weighted to Head
    gi = body.vertex_groups['Head'].index; vs = []
    for v in body.data.vertices:
        for g in v.groups:
            if g.group == gi and g.weight > 0.6: vs.append(body.matrix_world @ v.co)
    xs = [v.x for v in vs]; ys = [v.y for v in vs]; zs = [v.z for v in vs]
    zt = max(zs); zb = min(zs)
    c = Vector(((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, zt - (zt - zb) * 0.42))
    return c, Vector(((max(xs) - min(xs)) / 2, (max(ys) - min(ys)) / 2, zt - c.z)), vs
def on_head(c, r, az, el, out=0.0):
    # az 0 = front (-Y), + to her left (+X); el 0 = equator, 90 = crown
    a, e = math.radians(az), math.radians(el)
    n = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    p = Vector((c.x + n.x * r.x, c.y + n.y * r.y, c.z + n.z * r.z))
    nn = Vector((n.x / r.x, n.y / r.y, n.z / r.z)).normalized()
    return p + nn * out, nn
def lobe(bm, c, r, az0, el0, az1, el1, w, sides=5, segs=4, flat=0.7, hook=0.5, lift=0.55):
    # a hair lobe lying on the scalp: rises off the surface, rolls over and hooks back under at the end (never a point)
    pts = []; ups = []
    for i in range(segs + 1):
        t = i / segs; az = az0 + (az1 - az0) * t; el = el0 + (el1 - el0) * t
        out = w * (0.25 + lift * math.sin(math.pi * min(1, t * 1.15)))
        p, n = on_head(c, r, az, el, out=out); pts.append(p); ups.append(n)
    # hook: the last point curls back under toward the scalp
    d = (pts[-1] - pts[-2]); pts[-1] = pts[-2] + d * 0.6 - ups[-1] * w * hook
    rad = [w * (0.85 + 0.15 * math.sin(math.pi * i / segs)) * (1 - 0.3 * (i / segs)) for i in range(segs + 1)]
    tube(bm, pts, rad, sides=sides, flat=flat, up=ups[segs // 2], cap0=True, cap1=True)
def curl_path(p0, nrm, down, length, bend=150, n=5, kind='C'):
    # a C (or S) curl: leaves the scalp along `down`, rolls outward; returns points
    d = down.normalized(); nn = nrm.normalized(); R = length / math.radians(bend); pts = []
    for i in range(n):
        t = i / (n - 1); a = math.radians(bend) * t
        if kind == 'S' and t > 0.5: a = math.radians(bend) * 0.5 - (a - math.radians(bend) * 0.5) * 0.9
        pts.append(p0 + d * (R * math.sin(a)) + nn * (R * (1 - math.cos(a))) + nn * 0.004)
    return pts
def mix_w(*pairs):
    tot = {}
    for b, w in pairs:
        if w > 0: tot[b] = tot.get(b, 0) + w
    s = sum(tot.values()) or 1; return {k: v / s for k, v in tot.items()}
def smooth01(x):
    x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
