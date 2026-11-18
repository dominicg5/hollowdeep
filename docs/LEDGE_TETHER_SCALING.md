# Ledge Tethers at ~3,000 on the main map: design note

**Status:** design only. The main map doesn't draw anyone's Ledge Tethers yet. The
braided Tether exists only in the Ledge and Character views (`char3d.js`, `mountTether`).
None of this is cheap to bolt on before the map has a tether layer, so this note sets out how that layer should be built.

## Data model (teleport-ready)
- A tether is `{ id, owner, a:{x,y,z}, b:{x,y,z}, grade, state }`.
- Both ends are **arbitrary world points**. An end can be dropped anywhere: a ledge, a
  cliff, a bridge deck, or open ground. Ends are never tied to a house slot.
- The same point type is the travel target used by the Map screen (`Explore.reach` /
  `plan`). A later "ride the tether" can then reuse the travel code with a timer.
- Transport is a **timer, not physics**. A ride is `{ tether, t0, dur }`, and the rider's
  position is `lerp(a, b, ease((now - t0) / dur))` along the cable's catenary. Nothing simulates per frame.

## Spatial chunks
- Reuse the bridge chunking from `explore.js` (`3000`-unit chunks, `Explore.lod`).
- Each tether is binned into every chunk that its a→b segment crosses (grid DDA).
- Only chunks inside the view radius get geometry. Chunk buffers are rebuilt lazily when
  a tether is added or removed, never per frame.

## LOD by camera distance (per chunk, with hysteresis ±10%)
| distance | form | cost |
|---|---|---|
| < 150 u | full braid (6 strands, the char3d look), real geometry | only the ~5 nearest |
| 150–1,500 u | single tube, 6 sides, baked braid normal map | one InstancedMesh per chunk |
| 1,500–6,000 u | camera-facing line strip (`LineSegments`, 2 verts/segment, 8 segments per catenary) | one draw per chunk |
| > 6,000 u | not drawn (the map screen draws the 2D lines instead) | 0 |

## Instancing
- Mid-range tubes are one unit-length cylinder, instanced per catenary *segment*: 8
  segments × 3,000 tethers is 24k instances, and only the visible chunks are live (typically ≤ 2k).
- Per-instance attributes are `aStart`, `aEnd` (vec3) and `aGrade` (float → palette row). The
  vertex shader orients and stretches the cylinder, so CPU matrices are never rebuilt.
- Far lines share one `LineBasicMaterial` per grade tier, so there are 8 draws worst case.

## Emissive glow
- Lumen and higher grades get an emissive core: `emissive = palette[grade].core * (0.4 +
  0.6 * night)`. This is shared uniforms, not per-tether lights.
- Bloom stays off on mobile. The glow comes from the emissive core plus an additive
  sprite at each anchor, and only in the near and mid tiers.

## Budgets (mobile 390×844@2x)
- ≤ 12 extra draw calls for all tethers (near braids 5 + mid instanced ≤ 4 chunks + far lines ≤ 3 tiers).
- ≤ 60k extra triangles; line tier ≈ 48k verts worst case.
- Rebuild cost: ≤ 2 ms per changed chunk, amortised one chunk per frame.

## Order of work
1. Data plus the 2D lines on the Map screen (cheap, and gives immediate value).
2. Far lines plus chunk binning.
3. Instanced mid tubes.
4. Near braid (reuse `mountTether` meshes).
5. Timer transport, using the Map screen's travel chip UI.
