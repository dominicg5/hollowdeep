# Atlas painter: rasterises every triangle in atlas space and paints each texel from its rest position, normal,
# original UV (face canvas / outfit texture detail) and region, with Art's hexes. Matte, chalky value bands.
import numpy as np, math, os, glob
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
SZ = 1024
def hx(h): return np.array([((h >> s) & 255) / 255 for s in (16, 8, 0)], np.float32)
def lum(c): return c @ np.array([0.3, 0.55, 0.15], np.float32)
def sstep(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
LP = np.array([-0.35, -0.55, 0.76], np.float32); LP /= np.linalg.norm(LP)   # painted key light (Blender axes: from her front-left, above)
class Tex:
    def __init__(self, path, size=1024):
        im = Image.open(path).convert('RGB').resize((size, size), Image.BILINEAR); self.a = np.asarray(im, np.float32) / 255; self.n = size
    def at(self, uv):
        x = np.clip((uv[:, 0] % 1) * self.n, 0, self.n - 1).astype(int); y = np.clip((1 - uv[:, 1] % 1) * self.n, 0, self.n - 1).astype(int); return self.a[y, x]
def raster(T):
    # -> per texel arrays: tri id, barycentrics
    tid = np.full((SZ, SZ), -1, np.int32); bary = np.zeros((SZ, SZ, 3), np.float32)
    for i, t in enumerate(T['uva']):
        x0, y0 = np.floor(t.min(0)).astype(int); x1, y1 = np.ceil(t.max(0)).astype(int)
        x0 = max(0, x0); y0 = max(0, y0); x1 = min(SZ - 1, x1); y1 = min(SZ - 1, y1)
        if x1 < x0 or y1 < y0: continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = t; d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-9: continue
        l0 = ((by - cy) * (X - cx) + (cx - bx) * (Y - cy)) / d; l1 = ((cy - ay) * (X - cx) + (ax - cx) * (Y - cy)) / d; l2 = 1 - l0 - l1
        m = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
        ys, xs = np.nonzero(m); ys = ys + y0; xs = xs + x0
        tid[ys, xs] = i; bary[ys, xs] = np.stack([l0[m], l1[m], l2[m]], -1)
    return tid, bary
def interp(T, key, tid, bary, mask):
    a = T[key][tid[mask]]; b = bary[mask]; return (a * b[:, :, None]).sum(1)
def dilate(img, mask, it=12):
    img = img.copy(); m = mask.copy()
    for _ in range(it):
        acc = np.zeros_like(img); cnt = np.zeros(m.shape, np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            mm = np.roll(np.roll(m, dy, 0), dx, 1); acc += np.roll(np.roll(img, dy, 0), dx, 1) * mm[..., None]; cnt += mm
        new = (~m) & (cnt > 0); img[new] = acc[new] / cnt[new][:, None]; m = m | new
    img[~m] = img[m].mean(0); return img
def noise2(shape, scale, seed):
    r = np.random.RandomState(seed); n = r.rand(shape[0] // scale + 3, shape[1] // scale + 3).astype(np.float32)
    return ndimage.zoom(n, scale, order=3)[:shape[0], :shape[1]]
def classify_outfit(c):
    # peasant texture classes: 0 shirt (cream), 1 leather (tan/orange), 2 dark (corset/trousers), 3 boot (khaki), 4 brown, 5 metal
    import colorsys
    mx = c.max(1); mn = c.min(1); L = lum(c); s = (mx - mn) / (mx + 1e-4)
    h = np.zeros(len(c)); r, g, b = c[:, 0], c[:, 1], c[:, 2]
    k = np.full(len(c), 4)
    k[(L > 0.45) & (s < 0.32)] = 0
    k[(s < 0.18) & (L > 0.25) & (L <= 0.45)] = 5
    k[(L > 0.28) & (s >= 0.32) & (r > g * 1.25)] = 1
    k[(L > 0.3) & (s >= 0.2) & (s < 0.5) & (g > r * 0.82) & (k != 0)] = 3
    k[L < 0.16] = 2
    return k
def paint(T, pal, face_canvas, texs, head, eyes_c, scalp_fn=None, extra=None):
    tid, bary = raster(T); mask = tid >= 0
    P = interp(T, 'pa', tid, bary, mask); N = interp(T, 'na', tid, bary, mask); N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-6
    UO = interp(T, 'uvo', tid, bary, mask); SRC = T['src'][tid[mask]]; RG = T['rg'][tid[mask]]
    out = np.zeros((len(P), 3), np.float32)
    ndl = N @ LP; band = sstep(-0.25, 0.15, ndl) * 0.5 + sstep(0.35, 0.7, ndl) * 0.5   # 0 shadow .. 1 light, soft edges
    def shade3(base, light, shadow, sel):
        b = band[sel][:, None]; return np.where(b < 0.5, shadow + (base - shadow) * (b / 0.5), base + (light - base) * ((b - 0.5) / 0.5))
    def flat(base, sel, k=0.09):
        b = band[sel][:, None]; return base * (1 - k + 2 * k * b)
    # --- skin (head, neck, bare arms) ---
    sk = SRC == 0
    if sk.any():
        S = pal['skin']; base = shade3(S[1], S[0], S[2], sk)
        deep = sstep(-0.35, -0.75, N[sk, 2])[:, None]; base = base + (S[3] - base) * deep * 0.8
        # form detail from the original painted face/body texture (its socket, nose and lip shading)
        oc = texs['body'].at(UO[sk]); ol = lum(oc); d = np.clip(ol / (np.median(ol) + 1e-4), 0.7, 1.2) ** 0.55
        base = base * d[:, None]
        # the face canvas (painted in the original face-UV space): RGBA over the skin
        fc = face_canvas; x = np.clip((UO[sk, 0] % 1) * fc.shape[1], 0, fc.shape[1] - 1).astype(int); y = np.clip((1 - UO[sk, 1] % 1) * fc.shape[0], 0, fc.shape[0] - 1).astype(int)
        f = fc[y, x]; base = base * (1 - f[:, 3:4]) + f[:, :3] * f[:, 3:4]
        if scalp_fn is not None:
            sc = scalp_fn(P[sk])[:, None]; base = base * (1 - sc) + pal['scalp'] * sc
        out[sk] = base
    # --- eyeballs ---
    ey = SRC == 1
    if ey.any():
        p = P[ey]; c = np.where((p[:, 0] > 0)[:, None], eyes_c[0][None], eyes_c[1][None]); d = p - c; d /= np.linalg.norm(d, axis=1, keepdims=True) + 1e-6
        ang = np.arccos(np.clip(-d[:, 1], -1, 1))
        col = np.tile(hx(0xF1E9DA), (len(p), 1)); col[ang < 0.62] = pal['iris']; col[ang < 0.28] = hx(0x1E120A)
        hl = np.hypot(d[:, 0] + 0.2 * np.sign(p[:, 0]) * 0 + 0.17, d[:, 2] - 0.2) < 0.13; col[hl & (ang < 0.7)] = hx(0xFFF6E8)
        col = col * (1 - 0.35 * sstep(0.2, 0.6, d[:, 2]))[:, None]   # lid shadow on the top of the ball
        out[ey] = col
    # --- outfit (classes from the peasant texture, recoloured to Art's hexes, keeping its painted folds) ---
    for part, sid in (('arms', 2), ('body', 3), ('legs', 4), ('feet', 5)):
        sel = SRC == sid
        if not sel.any(): continue
        oc = texs['outfit'].at(UO[sel]); k = classify_outfit(oc); ol = lum(oc); col = np.zeros((sel.sum(), 3), np.float32)
        for ci in range(6):
            m = k == ci
            if not m.any(): continue
            tgt = pal['outfit'].get((part, ci), pal['outfit'].get(ci, hx(0x6a5038)))
            if tgt is None: continue
            if isinstance(tgt, str): tgt = pal['skin'][1]
            d = np.clip(ol[m] / (np.median(ol[m]) + 1e-4), 0.72, 1.25) ** 0.6
            col[m] = tgt[None] * d[:, None]
        out[sel] = flat(col, sel)
    # --- generated parts by region ---
    gs = SRC == 9
    if gs.any():
        for r in np.unique(RG[gs]):
            sel = gs & (RG == r); fn = pal['regions'].get(int(r))
            if fn is None: out[sel] = hx(0xff00ff); continue
            col = fn(P[sel], N[sel], UO[sel]) if callable(fn) else np.tile(fn, (sel.sum(), 1))
            out[sel] = flat(col, sel, 0.1)
    if extra: extra(out, P, N, UO, SRC, RG)
    img = np.zeros((SZ, SZ, 3), np.float32); img[mask] = out
    # chalky painterly variation (low-frequency value noise, +-4%)
    nz = noise2((SZ, SZ), 24, 3) * 0.6 + noise2((SZ, SZ), 6, 5) * 0.4; img = img * (0.96 + 0.08 * nz[..., None])
    img = dilate(np.clip(img, 0, 1), mask)
    return Image.fromarray((img * 255 + 0.5).astype(np.uint8))
def face_canvas(lm, pal, size=2048, extra=None):
    # lm: landmarks in original 2048 face-UV px: eyes (l, r), nose, mouth (x, y, half-width)
    W = size; im = Image.new('RGBA', (W, W), (0, 0, 0, 0)); s = W / 2048
    def layer(draw_fn, blur, alpha=1.0):
        L = Image.new('RGBA', (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(L); draw_fn(d); L = L.filter(ImageFilter.GaussianBlur(blur * s))
        if alpha < 1: a = np.asarray(L).copy(); a[..., 3] = (a[..., 3] * alpha).astype(np.uint8); L = Image.fromarray(a)
        im.alpha_composite(L)
    C = lambda c, a=255: tuple(int(x * 255) for x in c) + (a,)
    (ex1, ey1), (ex2, ey2) = lm['eyes']; nx, ny = lm['nose']; mx, my, mw = lm['mouth']; er = lm.get('eye_r', 46)
    # socket shadow, cheek warmth
    layer(lambda d: [d.ellipse([x - er * 1.6, y - er * 1.25, x + er * 1.6, y + er * 1.2], fill=C(pal['socket'], 70)) for x, y in lm['eyes']], 26)
    ck = lm.get('cheek', (110, 80)); ca = pal.get('cheek_a', 0.55)
    layer(lambda d: [d.ellipse([x - 70, ny - 25 - 55, x + 70, ny - 25 + 55], fill=C(pal['cheek'], int(255 * ca))) for x in (ex1 - 20, ex2 + 20)], 30)
    # lid lines (thicker toward the outer corner), brows (tapered), nostrils, lips, mouth line
    def lids(d):
        for (x, y), sg in ((lm['eyes'][0], -1), (lm['eyes'][1], 1)):
            for k in range(30):
                t = k / 29; a = math.pi * (1.1 - 1.2 * t) if sg > 0 else math.pi * (-0.1 + 1.2 * t)
                px = x + math.cos(a) * er * 1.05; py = y - math.sin(a) * er * 0.62 - 4; w = 3 + 4 * (t if sg > 0 else 1 - t)
                d.ellipse([px - w, py - w * 0.7, px + w, py + w * 0.7], fill=C(pal['lid']))
    layer(lids, 1.5)
    bw = lm.get('brow_w', 1.0); by = lm.get('brow_y', 62)
    def brows(d):
        for (x, y), sg in ((lm['eyes'][0], -1), (lm['eyes'][1], 1)):
            for k in range(14):
                t = k / 13; px = x - sg * er * 1.1 + sg * t * er * 2.3; py = y - by - math.sin(t * math.pi) * 14 + t * 4
                w = (11 - 7 * t) * bw; d.ellipse([px - w, py - w * 0.55, px + w, py + w * 0.55], fill=C(pal['brow']))
    layer(brows, 2.5)
    layer(lambda d: [d.ellipse([nx + sg * 19 - 9, ny + 8 - 6, nx + sg * 19 + 9, ny + 8 + 6], fill=C(pal['nostril'])) for sg in (-1, 1)], 2.5)
    layer(lambda d: d.ellipse([nx - 34, ny + 14, nx + 34, ny + 30], fill=C(pal['nostril'], 90)), 6)
    layer(lambda d: d.chord([mx - mw, my - 26, mx + mw, my + 6], 180, 360, fill=C(pal['lip_u'])), 3, 0.85)
    layer(lambda d: d.chord([mx - mw * 0.85, my - 6, mx + mw * 0.85, my + 34], 0, 180, fill=C(pal['lip_l'])), 3, 0.85)
    layer(lambda d: d.line([(mx - mw, my - 2), (mx - mw * 0.4, my + 3), (mx, my + 1), (mx + mw * 0.4, my + 3), (mx + mw, my - 2)], fill=C(pal['mouth']), width=6), 1.2)
    if extra: extra(layer, C)
    return np.asarray(im, np.float32) / 255
