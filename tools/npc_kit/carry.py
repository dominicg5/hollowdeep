# Held props on the palm socket (prop_r, child of hand_r): the prop is authored where it should be held (rest space, e.g. a tray
# forward at chest height), then moved into the right hand's rest frame. In game the right hand is IK'd to the prop's right grip
# (a point that rides the chest bone) and turned with the torso (+ the carry yaw), so the prop lands back where it was authored and
# follows the hand for idles, talk and walk; the left hand IKs to the left grip, which rides the prop itself.
import math, bpy
from mathutils import Vector, Matrix
def ensure_socket(arm, side='r'):
    n = 'prop_' + side
    if n in arm.data.bones: return n
    bpy.context.view_layer.objects.active = arm; arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT'); E = arm.data.edit_bones
    hb = E['hand_' + side]; mid = E.get('middle_01_' + side); tip = mid.head if mid else hb.tail
    b = E.new(n); b.head = (hb.head + tip) / 2; b.tail = b.head + (tip - hb.head).normalized() * 0.06; b.parent = hb; b.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT'); return n
def tray_hold(objs, J, yaw_deg=150.0, inset=0.015):
    """objs: the carried meshes (tray first). Returns grips {name: (bone, pos, pole, carry)} in Blender rest space."""
    tray = objs[0]; vs = [tray.matrix_world @ v.co for v in tray.data.vertices]
    xs = [v.x for v in vs]; ys = [v.y for v in vs]; zs = [v.z for v in vs]
    yc = (min(ys) + max(ys)) / 2; zc = max(zs) - 0.25 * (max(zs) - min(zs))
    Gr = Vector((min(xs) + inset, yc, zc)); Gl = Vector((max(xs) - inset, yc, zc))     # her right = -X
    th = math.radians(yaw_deg); Rz = Matrix.Rotation(-th, 3, 'Z'); H = J['hand_r']
    for o in objs:
        for v in o.data.vertices: v.co = H + Rz @ (v.co - Gr)
        for g in list(o.vertex_groups): o.vertex_groups.remove(g)
        o.vertex_groups.new(name='prop_r').add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    return {'tray_r': ('spine_02', Gr, (-1, 0.6, -0.8), {'bone': 'spine_02', 'yaw': th}),
            'tray_l': ('prop_r', H + Rz @ (Gl - Gr), (1, 0.6, -0.8), None)}
def grips_meta(g):
    out = {}
    for n, (bb, v, p, *rest) in g.items():
        e = {'bone': bb, 'pos': [float(v.x), float(v.z), float(-v.y)], 'pole': [float(p[0]), float(p[2]), float(-p[1])]}
        if rest and rest[0]: e['carry'] = rest[0]
        out[n] = e
    return out
