/* ===== HDToon: Art's Hollowdeep creature look (creature_pipeline/scripts/hollowdeepToon.js, copied verbatim for three r149; only the ES-module
   import / export lines are dropped so it runs on the game's global THREE). makeChalkMaterial(): painted 3-step toon with chalk grain, cool shadow
   tint, warm rim, lumenite emissive; addInkOutline(): constant-pixel inverted-hull ink that follows the skin. Used by Creatures.make for rows with
   shade: 'hdToon' (the golems, the Lumen Mushroom; re-copied GD-33 with Art's emissive-rim options rimE / rimE0 / rimE1 / rimMix / rimMask). Do not edit here - update Art's file and re-copy. ===== */
const HDToon = (() => {
// Hollowdeep creature look for three r149: chalky painted toon + crack-free ink outline. ES module.
const NOISE = `
float hd_h(vec3 p){ p = fract(p*0.3183099 + .1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float hd_n(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hd_h(i),hd_h(i+vec3(1,0,0)),f.x),mix(hd_h(i+vec3(0,1,0)),hd_h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hd_h(i+vec3(0,0,1)),hd_h(i+vec3(1,0,1)),f.x),mix(hd_h(i+vec3(0,1,1)),hd_h(i+vec3(1,1,1)),f.x),f.y),f.z); }
float hd_fbm(vec3 p){ return hd_n(p)*0.55 + hd_n(p*2.13)*0.28 + hd_n(p*4.41)*0.17; }
float hd_st(vec3 q, vec3 d){ vec3 a = normalize(cross(d, vec3(0.3,0.5,0.8))); vec3 b = cross(d,a);
  return hd_n(vec3(dot(q,d)*0.5, dot(q,a)*7.5, dot(q,b)*7.5)); }       // stretched noise -> short chalk dashes            // long thin chalk stroke field
float hdGrain; float hdTooth; float hdStroke;`;
// opts: grain (terminator raggedness), tooth (paper grain on colour), steps, shade (cool shadow tint), rim, emissive (0..1 of vertex colour)
function makeChalkMaterial(o = {}) {
  const m = new THREE.MeshToonMaterial({ vertexColors: o.vertexColors !== false, color: o.color ?? 0xffffff, flatShading: !!o.flat });
  const U = { uAtlasC:{value:o.atlasColor||null}, uGlow:{value:o.glow??1.6}, uGlowC:{value:new THREE.Vector3(...(o.glowColor||[0.027,0.63,0.51]))}, uAtlasN:{value:o.atlasNormal||null}, uNormalAmt:{value:o.normalAmt??0.45}, uAtlasOverride:{value:o.atlasOverride??-1.0}, uTS:{value:o.tileScales||[1,1,1,1,1,1,1,1]}, uHA:{value:o.tileHue||[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]}, uVA:{value:o.tileVal||[0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8]}, uNA:{value:o.tileNormal||[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]}, uLM:{value:o.tileLum||[0.2,0.2,0.2,0.2,0.2,0.2,0.2,0.2]}, uABlend:{value:o.atlasBlend??0.6},
    uGrain: { value: o.grain ?? 0.32 }, uTooth: { value: o.tooth ?? 0.22 }, uScale: { value: o.scale ?? 9.0 },
    uShade: { value: new THREE.Color(o.shade ?? 0x6a6488) }, uRim: { value: new THREE.Color(o.rim ?? 0xffe6b8) }, uRimAmt: { value: o.rimAmt ?? 0.35 }, uRimE: { value: new THREE.Color(o.rimE ?? 0x000000) }, uRimE0: { value: o.rimE0 ?? 0.15 }, uRimE1: { value: o.rimE1 ?? 0.55 }, uRimMix: { value: o.rimMix ?? 0.0 }, uRimMask: { value: o.rimMask ?? 0.0 },
    uEmis: { value: o.emissive ?? 0.0 }, uLift: { value: o.lift ?? 0.0 }, uStroke: { value: o.stroke ?? 0.0 }, uFacet: { value: o.facet ?? 0.0 },
    uDetail: { value: o.detailMap ?? null }, uDetailS: { value: 1.0 / (o.detailScale ?? 1.0) }, uDetailAmt: { value: o.detailMap ? (o.detailAmt ?? 0.5) : 0.0 } };
  if (o.detailMap) { o.detailMap.wrapS = o.detailMap.wrapT = THREE.RepeatWrapping; m.defines = { ...(m.defines||{}), HD_DETAIL: 1 }; }
  if(o.atlasColor) m.defines = {...(m.defines||{}),HD_ATLAS:1};
  m.userData.uniforms = U;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;\n#ifdef HD_ATLAS\nattribute vec3 hdTex; varying vec3 vHD; attribute float hdGlow; varying float vGlow;\n#endif')
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position; vObjN = normal;\n#ifdef HD_ATLAS\nvHD=hdTex; vGlow=hdGlow;\n#endif');   // bind-pose coords: grain sticks to the body when animated
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vObj; varying vec3 vObjN;\nuniform float uGrain,uTooth,uScale,uRimAmt,uEmis,uLift,uStroke,uFacet,uDetailS,uDetailAmt;\n#ifdef HD_DETAIL\nuniform sampler2D uDetail;\n#endif\nuniform vec3 uShade,uRim,uRimE; uniform float uRimE0,uRimE1,uRimMix,uRimMask;\n${NOISE}
#ifdef HD_ATLAS
varying vec3 vHD; varying float vGlow; uniform float uGlow; uniform vec3 uGlowC; uniform sampler2D uAtlasC,uAtlasN; uniform float uNormalAmt,uAtlasOverride,uABlend; uniform float uTS[8], uHA[8], uVA[8], uNA[8], uLM[8];
float hdPick(float a[8], float i){ float s=a[0]; for(int k=0;k<8;k++) if(abs(float(k)-i)<0.5) s=a[k]; return s; }
float hdTS(float i){ return hdPick(uTS,i); }
vec2 hdUV(vec2 uv,float idx){ vec2 tile=vec2(mod(idx,4.0),1.0-floor(idx/4.0)); /* atlas row 0 is the TOP of the png; textures are flipY'd */ return (tile + (16.0+fract(uv)*512.0)/544.0)/vec2(4.0,2.0); }
vec3 hdTri(sampler2D t,vec3 P,vec3 w,float i){ vec3 p=P/hdTS(i); return texture2D(t,hdUV(p.yz,i)).rgb*w.x+texture2D(t,hdUV(p.xz,i)).rgb*w.y+texture2D(t,hdUV(p.xy,i)).rgb*w.z; }
vec3 hdPerturb(vec3 eye,vec3 N,vec3 mapN,vec2 uv){
 vec3 q0=dFdx(eye),q1=dFdy(eye); vec2 st0=dFdx(uv),st1=dFdy(uv);
 vec3 q1p=cross(q1,N),q0p=cross(N,q0); vec3 T=q1p*st0.x+q0p*st1.x, B=q1p*st0.y+q0p*st1.y;
 float sc=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-8)); return normalize(T*sc*mapN.x+B*sc*mapN.y+N*mapN.z); }
#endif`)

      .replace('#include <gradientmap_pars_fragment>', `
vec3 getGradientIrradiance(vec3 normal, vec3 lightDirection){
  float x = dot(normal, lightDirection)*0.5 + 0.5 + (hdGrain-0.5)*uGrain;      // chalk-ragged terminator
  float t = 0.18 + 0.47*smoothstep(0.47,0.53,x) + 0.35*smoothstep(0.74,0.79,x); // 3 painted tone steps
  return mix(uShade, vec3(1.0), t);                                              // cool painted shadow
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec3 q = vObj*uScale;
  hdStroke = max(hd_st(q*1.1, normalize(vec3(1.0,0.35,0.6))), hd_st(q*1.45+7.0, normalize(vec3(-0.45,1.0,0.25)))*0.92);
  hdStroke = smoothstep(0.66, 0.88, hdStroke);
  hdGrain = mix(hd_fbm(q*1.0) * 0.6 + hd_n(q*7.3) * 0.4, hdStroke, uStroke);
  hdTooth = hd_n(q*9.7)*0.6 + hd_n(q*23.0)*0.4;
  #ifdef HD_ATLAS
  { float ta=uAtlasOverride>=0.0?uAtlasOverride:floor(vHD.x+0.5), tb=floor(vHD.y+0.5), wb=clamp(vHD.z,0.0,1.0);
    vec3 w=pow(abs(normalize(vObjN)),vec3(4.0)); w/=max(w.x+w.y+w.z,0.0001);
    // per-material preset: the atlas gives the VALUE pattern (normalised by its mean, amount uVA) and only uHA of the hue;
    // the rest of the hue stays the painted palette (cool grey stone stays grey, warm only where the paint is warm)
    float lv=dot(diffuseColor.rgb,vec3(0.3,0.59,0.11));
    if(ta>=0.0){ vec3 ca=pow(hdTri(uAtlasC,vObj,w,ta),vec3(2.2)); float lmA=hdPick(uLM,ta);
      vec3 cA=mix(diffuseColor.rgb*mix(1.0,clamp(dot(ca,vec3(0.3,0.59,0.11))/lmA,0.3,2.2),hdPick(uVA,ta)), ca*lv/lmA, hdPick(uHA,ta));
      if(tb>=0.0 && wb>0.01){ vec3 cb=pow(hdTri(uAtlasC,vObj,w,tb),vec3(2.2)); float lmB=hdPick(uLM,tb);
        vec3 cB=mix(diffuseColor.rgb*mix(1.0,clamp(dot(cb,vec3(0.3,0.59,0.11))/lmB,0.3,2.2),hdPick(uVA,tb)), cb*lv/lmB, hdPick(uHA,tb));
        cA=mix(cA,cB,wb); }
      diffuseColor.rgb=mix(diffuseColor.rgb,cA,uABlend); }
  }
  #endif
  #ifdef HD_DETAIL
  { vec3 w = pow(abs(normalize(vObjN)), vec3(4.0)); w /= (w.x + w.y + w.z); vec3 pd = vObj * uDetailS;
    float dt = texture2D(uDetail, pd.yz).r * w.x + texture2D(uDetail, pd.xz).r * w.y + texture2D(uDetail, pd.xy).r * w.z;
    diffuseColor.rgb *= 1.0 + (dt - 0.5) * 2.0 * uDetailAmt;            // CC0 surface features, value-only (repainted)
    hdGrain = mix(hdGrain, dt, 0.35); }
  #endif
  diffuseColor.rgb *= 1.0 + hdStroke*0.12*uStroke;                               // light chalk strokes over the paint
  diffuseColor.rgb *= 1.0 - uFacet*0.5 + uFacet*hd_h(floor(normalize(vObjN)*6.0)+3.1);   // per-facet value shift (crystals)
  diffuseColor.rgb *= 1.0 + (hd_fbm(q*0.35)-0.5)*0.22;                          // big painted value wobble
  diffuseColor.rgb *= 1.0 - uTooth*0.5 + uTooth*hdTooth;                          // paper tooth / chalk`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
#ifdef HD_ATLAS
{ float ta=uAtlasOverride>=0.0?uAtlasOverride:floor(vHD.x+0.5), tb=floor(vHD.y+0.5), wb=clamp(vHD.z,0.0,1.0);
 if(ta>=0.0){ vec3 w=pow(abs(normalize(vObjN)),vec3(4.0)); w/=max(w.x+w.y+w.z,0.0001);
  float sa=hdTS(ta); vec3 pa=vObj/sa;
  vec3 nx=texture2D(uAtlasN,hdUV(pa.yz,ta)).xyz*2.0-1.0, ny=texture2D(uAtlasN,hdUV(pa.xz,ta)).xyz*2.0-1.0, nz=texture2D(uAtlasN,hdUV(pa.xy,ta)).xyz*2.0-1.0;
  if(tb>=0.0 && wb>0.01){ float sb=hdTS(tb); vec3 pb=vObj/sb;
   nx=mix(nx,texture2D(uAtlasN,hdUV(pb.yz,tb)).xyz*2.0-1.0,wb); ny=mix(ny,texture2D(uAtlasN,hdUV(pb.xz,tb)).xyz*2.0-1.0,wb); nz=mix(nz,texture2D(uAtlasN,hdUV(pb.xy,tb)).xyz*2.0-1.0,wb); }
  float na=mix(hdPick(uNA,ta),(tb>=0.0?hdPick(uNA,tb):hdPick(uNA,ta)),wb)*uNormalAmt; nx.xy*=na; ny.xy*=na; nz.xy*=na;
  normal=normalize(hdPerturb(-vViewPosition,normal,normalize(nx),pa.yz)*w.x+hdPerturb(-vViewPosition,normal,normalize(ny),pa.xz)*w.y+hdPerturb(-vViewPosition,normal,normalize(nz),pa.xy)*w.z); }
}
#endif`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
  { vec3 V = normalize(vViewPosition); float fr = pow(1.0 - clamp(dot(normal, V), 0.0, 1.0), 3.0);
    reflectedLight.directDiffuse += uRim * smoothstep(0.35,0.6,fr) * uRimAmt * diffuseColor.rgb;
    reflectedLight.indirectDiffuse += diffuseColor.rgb * uLift;
    { float rk = smoothstep(uRimE0, uRimE1, fr) * step(0.0001, uRimE.r + uRimE.g + uRimE.b);
#ifdef HD_ATLAS
    if (uRimMask > 0.5) rk *= vGlow;   // optional: per-vertex rim mask in hdGlow (only when uRimMask is set)
#endif
    reflectedLight.directDiffuse *= 1.0 - uRimMix * rk; reflectedLight.indirectDiffuse *= 1.0 - uRimMix * rk; totalEmissiveRadiance += uRimE * rk; } }`)   // optional glowing rim (mixes toward uRimE); default black = off
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * uEmis;\n#ifdef HD_ATLAS\n  totalEmissiveRadiance += uGlowC * vGlow * uGlow;   // lumenite crack veins\n#endif`);
  };
  m.customProgramCacheKey = () => 'hdchalk' + (o.detailMap ? 'D' : '') + (o.atlasColor?'A':'');
  return m;
}
// Smoothed normals keyed by position: hull stays closed across flat-shaded/split seams -> no cracks.
function smoothNormalsByPosition(geo) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal, map = new Map(), key = (i) =>
    `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const idx = geo.index ? geo.index.array : null, n = idx ? idx.length : pos.count;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3();
  for (let t = 0; t < n; t += 3) {
    const i0 = idx ? idx[t] : t, i1 = idx ? idx[t + 1] : t + 1, i2 = idx ? idx[t + 2] : t + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    fn.subVectors(c, b).cross(a.clone().sub(b)); // area-weighted
    for (const i of [i0, i1, i2]) { const k = key(i); const v = map.get(k) || new THREE.Vector3(); v.add(fn); map.set(k, v); }
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const v = map.get(key(i)).clone().normalize(); out.set([v.x, v.y, v.z], i * 3); }
  return new THREE.BufferAttribute(out, 3);
}
// Constant-pixel-width ink hull for (Skinned)Mesh. width in px at 1080p-equivalent.
function addInkOutline(mesh, o = {}) {
  const g = mesh.geometry.clone(); g.setAttribute('normal', smoothNormalsByPosition(mesh.geometry));
  const mat = new THREE.MeshBasicMaterial({ color: o.color ?? 0x2b1d14, side: THREE.BackSide });
  const U = { uW: { value: o.width ?? 2.2 }, uWorld: { value: o.worldWidth ?? 0.022 }, uRes: { value: new THREE.Vector2(1080, 1080) } };   // R7: outline = min(uW px, uWorld metres): thin at small on-screen size
  mat.userData.uniforms = U;
  mat.onBeforeCompile = (s) => { Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )', '#if 1')
      .replace('#include <common>', '#include <common>\nuniform float uW; uniform float uWorld; uniform vec2 uRes;')
      .replace('#include <project_vertex>', `#include <project_vertex>
  { vec3 nV = normalize(normalMatrix * objectNormal); vec2 d = (projectionMatrix * vec4(nV, 0.0)).xy;
    float l = length(d); if (l > 1e-5) gl_Position.xy += d / l * min(uW * 2.0 / uRes.y * gl_Position.w, uWorld * projectionMatrix[1][1]); gl_Position.z += 0.0004 * gl_Position.w; }`); };
  mat.customProgramCacheKey = () => 'hdink';
  const ol = mesh.isSkinnedMesh ? new THREE.SkinnedMesh(g, mat) : new THREE.Mesh(g, mat);
  if (mesh.isSkinnedMesh) ol.bind(mesh.skeleton, mesh.bindMatrix);
  ol.name = mesh.name + '_ink'; ol.frustumCulled = false; ol.userData.isInk = true;
  mesh.parent.add(ol); ol.position.copy(mesh.position); ol.quaternion.copy(mesh.quaternion); ol.scale.copy(mesh.scale);
  return ol;
}
function setInkResolution(root, w, h) { root.traverse((n) => { if (n.userData.isInk) n.material.userData.uniforms.uRes.value.set(w, h); }); }

return { makeChalkMaterial, addInkOutline, setInkResolution, smoothNormalsByPosition };
})();
