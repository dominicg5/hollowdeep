import { NodeIO } from '@gltf-transform/core';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
const SRC = '/workspace/hollowdeep/concept/models/', OUT = '/workspace/hollowdeep/assets/models/';
fs.mkdirSync(OUT, { recursive: true });
const MODELS = { // key: [file, lod0 tris, lod1 tris, normal map]
  shack: ['Lv01_Delvers_Shack', 3600, 520, 1], cottage: ['Lv10_Orth_Cottage', 3600, 520, 1], townhouse: ['Lv20_Stacked_Townhouse', 4200, 620, 1], workshop: ['Lv30_Relic_Workshop', 4200, 620, 1],
  willow: ['Tree_Abyss_Edge_Willow', 3200, 480, 0], oak: ['Tree_Ancient_Oak', 3000, 420, 0], sequoia: ['Tree_Snowcap_Sequoia', 2400, 360, 0],
  hero: ['Tree_Abyss_Edge_Willow', 14000, 0, 1],
};
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const io = new NodeIO(); const report = {};
for (const [key, [file, t0, t1, nrm]] of Object.entries(MODELS)) {
  const doc = await io.read(SRC + file + '.glb'); const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const P = prim.getAttribute('POSITION').getArray(), N = prim.getAttribute('NORMAL').getArray(), UV = prim.getAttribute('TEXCOORD_0').getArray();
  const I = new Uint32Array(prim.getIndices().getArray()), vc = P.length / 3;
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], umn = [1e9, 1e9], umx = [-1e9, -1e9];
  for (let i = 0; i < vc; i++) { for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i * 3 + k]); mx[k] = Math.max(mx[k], P[i * 3 + k]); } for (let k = 0; k < 2; k++) { umn[k] = Math.min(umn[k], UV[i * 2 + k]); umx[k] = Math.max(umx[k], UV[i * 2 + k]); } }
  const lods = [], bufs = [];
  for (const target of [t0, t1]) { if (!target) continue;
    // UV-aware simplification so texture seams don't smear (attribute weights penalize UV stretch across seams)
    const A = new Float32Array(vc * 5); for (let i = 0; i < vc; i++) { A[i * 5] = UV[i * 2]; A[i * 5 + 1] = UV[i * 2 + 1]; A[i * 5 + 2] = N[i * 3] * 0.3; A[i * 5 + 3] = N[i * 3 + 1] * 0.3; A[i * 5 + 4] = N[i * 3 + 2] * 0.3; }
    let [idx, err] = MeshoptSimplifier.simplifyWithAttributes(I, P, 3, A, 5, [1.5, 1.5, 0.5, 0.5, 0.5], null, Math.min(I.length, target * 3), 0.2, ['Permissive']);
    if (idx.length > target * 3 * 1.6) [idx, err] = MeshoptSimplifier.simplifySloppy(I, P, 3, null, target * 3, 0.2);
    // compact vertices
    const remap = new Int32Array(vc).fill(-1); let n = 0; const order = [];
    for (const v of idx) if (remap[v] < 0) { remap[v] = n++; order.push(v); }
    const vb = new ArrayBuffer(n * 16), dv = new DataView(vb);
    order.forEach((v, j) => { const o = j * 16;
      for (let k = 0; k < 3; k++) dv.setInt16(o + k * 2, Math.round(((P[v * 3 + k] - mn[k]) / (mx[k] - mn[k]) * 2 - 1) * 32767), true);
      for (let k = 0; k < 3; k++) dv.setInt8(o + 8 + k, Math.round(Math.max(-1, Math.min(1, N[v * 3 + k])) * 127));
      for (let k = 0; k < 2; k++) dv.setUint16(o + 12 + k * 2, Math.round((UV[v * 2 + k] - umn[k]) / (umx[k] - umn[k] || 1) * 65535), true); });
    const ib = new Uint32Array(idx.length); for (let i = 0; i < idx.length; i++) ib[i] = remap[idx[i]];
    const ev = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(vb), n, 16), ei = MeshoptEncoder.encodeIndexBuffer(new Uint8Array(ib.buffer), ib.length, 4);
    lods.push({ vc: n, ic: ib.length, vb: ev.length, ib: ei.length }); bufs.push(ev, ei); }
  const head = JSON.stringify({ mn, mx, umn, umx, lods }), hb = Buffer.from(head + ' '.repeat((4 - (head.length + 8) % 4) % 4));
  const pre = Buffer.alloc(8); pre.write('HDM1', 0); pre.writeUInt32LE(hb.length, 4);
  fs.writeFileSync(OUT + key + '.bin', Buffer.concat([pre, hb, ...bufs.map((b) => Buffer.from(b))]));
  // textures
  const mat = prim.getMaterial(), bc = mat.getBaseColorTexture().getImage(), nt = mat.getNormalTexture() && mat.getNormalTexture().getImage();
  const ts = key === 'hero' ? 1024 : 512;
  if (key !== 'hero') await sharp(Buffer.from(bc)).resize(ts, ts).webp({ quality: 82 }).toFile(OUT + key + '.webp');
  if (nrm && nt) await sharp(Buffer.from(nt)).resize(ts, ts).webp({ quality: 85 }).toFile(OUT + key + '_n.webp');
  if (key === 'hero') await sharp(Buffer.from(bc)).resize(1024, 1024).webp({ quality: 82 }).toFile(OUT + key + '.webp');
  report[key] = { src: I.length / 3, lods: lods.map((l) => l.ic / 3), bytes: fs.statSync(OUT + key + '.bin').size, bbox: [mn.map((v) => +v.toFixed(3)), mx.map((v) => +v.toFixed(3))], uv: [umn, umx] };
}
console.log(JSON.stringify(report, null, 1));
