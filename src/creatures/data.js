/* ===== Creatures: the data table (t661). One entry per creature; src/creatures/creatures.js loads, builds and animates any entry the same way,
   so a new creature is a new row here + its GLB under assets/models/creatures/. Stats are PLACEHOLDERS (Dominic: "easy placeholder values").
   Combat XP per kill = 4 x creature HP (Art's rule); the Combat XP per-level curve is still a placeholder. (GD-12) It bites back:
   Combat.creatureAttack reads str + acc (GD-15 formula); the attack timing / reach / walk fields below drive the playground arena. ===== */

// (Dominic, card t575s2576: 'I would like the countdown respawn not visible') seconds from a creature's death to its respawn - hidden timers: nothing on screen
// counts them down (no countdown in the playground status / overhead bars / map); each row's respawnS reads this table
const RESPAWN_S = { lumen_mushroom: 20, tin_golem: 30, copper_golem: 45, coal_golem: 60 };

// ---------------------------------------------------------------------------------------------------------------------------------------------
// LUMEN MUSHROOM - the Attack Playground's practice target (t653u). (GD-33, Dominic t553u: "that replaces the old Lumen Mushroom") Model: Art's own Mushnub
// (creature_pipeline/production/mushnub_i23d, image-to-3D build3, gate 3 PASS), the game build mushnub_i23d_slim.glb shipped as assets/models/creatures/mushnub_i23d.glb
// (600 KB: welded, 7,108 tris, 4 bones, 1024 JPEG albedo + emissive built in, COLOR_0 vertex shading and the _HD_GLOW rim-glow mask kept). Drawn with Art's chalk toon +
// ink outline from its material extras (hd_srim / hd_sshade / hd_lift / hd_rimE...), like his viewer. Replaces the Quaternius CC0 Mushnub (recoloured at load).
const LUMEN_MUSHROOM = {
  id: 'lumen_mushroom',
  name: 'Lumen Mushroom',
  level: 1,        // (t566s2518) combat level on its nameplate badge (+ its coin drop, L..3L) - under MONSTER_LEVELS.CAP (Dominic t573s2565), see MONSTER_LEVELS
  hp: 8,            // max HP (Art's stats, Dominic t655)
  str: 1,           // Strength: its bite does str on a full hit, otherwise 0..str (Combat.creatureAttack, GD-15)
  def: 0,           // Defense (Combat.hitChance: her Accuracy / (def + 100))
  acc: 30,          // Accuracy - PLACEHOLDER (GD-15): its full-hit chance on her = acc / (her Defense + 100), capped at 60%; otherwise 0..str
  xp: 32,           // Combat XP per kill = 4 x creature HP (Art's rule); awarded via Combat.addXp, on the shared Skills curve (Skills.xpToReach, Lv 1-300).
  respawnS: RESPAWN_S.lumen_mushroom, // seconds after it dies before a fresh one pops back up (hidden timer, RESPAWN_S)
  height: 0.8,      // metres tall in the playground
  atkS: 2,          // (GD-12) seconds between bites once it is fighting her
  atkHitAt: 0.333,  // seconds into Attack that the cap-butt lands (GD-33: Art's hit_timing.json, frame 10 @ 30 fps)
  deathHitAt: 0.767, // (GD-33) Death: it splats on the ground 0.767 s in (frame 23)
  atkReach: 1.1,    // metres: it closes to this and bites; a bite lands if she is still within atkReach + 0.35
  aggro: 'provoked', // (GD-21, Dominic t682u) 'provoked': it leaves her alone - wanders, never bites - until she hits it; then it hunts her (leashR below).
                    // Past the leash it gives up and is passive again (she has to hit it again). 'near' (not used yet): it also turns on her when she walks right up.
  leashR: 4,        // (GD-19) metres: once she hits it (or walks right up to it) it keeps closing in and biting until she is farther than this, then it goes back
                    // to wandering. 4 m = its bite reach (1.1 m) + ~3 m, so stepping back a little does not shake it but running off does
  walkSpd: 0.55,    // m/s, wandering and closing in
  icon: '🍄',
  model: 'assets/models/creatures/mushnub_i23d.glb', // (GD-33) Art's build, copied unchanged (mushnub_i23d_slim.glb)
  shade: 'hdToon',  // Art's chalk toon + ink outline (src/creatures/hd_toon.js), its look from the GLB's own material extras and textures
  srgbOut: true,    // (t704u) encode its own output to sRGB like Art's viewer (the playground renders linear)
  clips: { idle: 'Idle', hit: 'Hit', death: 'Death', walk: 'Walk', attack: 'Attack' },   // (GD-33) Art's clip names (Idle 2.03 s, Walk 1.03, Attack 1.03, Hit 0.63, Death 1.53)
};
// ---------------------------------------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------------------------------------------------
// (GD-30, Dominic via Art t526s2249) Art's golem family: Tin < Copper < Coal (ore tiers). One body (Art's image-to-3D golem, 23,154 tris, 20 bones), each
// painted for its ore. Clips Idle / Walk / Attack / Hit / Death. ALL STATS BELOW ARE PLACEHOLDERS, NOT APPROVED (ascending with the ore tier).
const TIN_GOLEM = {
  id: 'tin_golem',
  name: 'Tin Golem',
  level: 5,        // (t566s2518) combat level on its nameplate badge (+ its coin drop, L..3L) - under MONSTER_LEVELS.CAP (Dominic t573s2565), see MONSTER_LEVELS
  hp: 20,           // placeholder, not approved
  str: 2,            // placeholder, not approved - its slam does str on a full hit, otherwise 0..str (Combat.creatureAttack)
  def: 5,            // placeholder, not approved
  acc: 35,           // placeholder, not approved
  xp: 80,           // Combat XP per kill = 4 x HP (Art's rule) - follows the placeholder HP
  respawnS: RESPAWN_S.tin_golem, // (t575s2576) hidden respawn timer, RESPAWN_S
  height: 2.6,      // metres (Art's build: 2.6 m)
  bodyR: 0.85,      // (GD-30) metres from its centre to its body surface: her reach / stand-off and its slam reach are measured from here (the mushroom is 0)
  atkS: 3,          // placeholder, not approved - seconds between slams once provoked
  atkHitAt: 0.633,  // the two-fist slam lands 0.633 s into Attack (Art's hit_timing.json, frame 19 @ 30 fps)
  deathHitAt: 1.067, // Death: it hits the ground 1.067 s in (frame 32); it holds the final pose, then sinks away before the respawn
  atkReach: 0.9,    // metres past its body surface that the slam closes to; a slam lands if she is still within atkReach + 0.35
  aggro: 'provoked', // passive until she hits it, like the mushroom
  leashR: 5,        // placeholder, not approved
  walkSpd: 0.45,    // m/s - placeholder, not approved
  icon: '🪨',
  model: 'assets/models/creatures/tin_golem_i23d.glb', // Art's t539 game-fix build (welded, _HD_TEX / _HD_FEAT stripped, _HD_GLOW kept (t542), 0.97 MB; crystals rigid to the chest, no head / jaw spring, shin / foot cut moved to the foot; t553 arm fix: the 167/168-vert foot shells reweighted from hand.L/R to foot.L/R), copied unchanged (tin_golem_i23d.glb)
  clips: { idle: 'Idle', hit: 'Hit', death: 'Death', walk: 'Walk', attack: 'Attack' },
  shade: 'hdToon',  // Art's chalk toon + ink outline (src/creatures/hd_toon.js), colours from the GLB's vertex paint and material extras
  crystalGain: [1.09, 1.07, 1.03], // (t543, Dominic: tone down Tin's crystals) with its glow on, its crystal median (paint x this + glow) lands on #6b5f55, halfway between Art's lineup #787068 and hero #5f4f42
  glowGain: 0.2,    // (t543) its crystal / vein / eye glow strength (Art's default 1.6: on its own that already took the Tin crystal median to #989897; 0.2 is a third of the target)
  crackGlow: true,  // (t705u) its ore-coloured crack glow (t542: Art's _HD_GLOW 0..1 per vertex x its hd_glow colour x 1.6, bound without the atlas; Coal's glow colour is black = none, as in Art's lineup)
  srgbOut: true,    // (t704u) encode its own output to sRGB like Art's viewer (the game renders linear; the vertex paint is linear)
  rigid: { bones: ['head', 'jaw', 'crys.back', 'crys.sh.L', 'crys.sh.R'], clips: ['Idle', 'Walk', 'Attack', 'Hit'] }, // (t704u) head + shard spikes ride the chest; Death keeps its crumble
};
const COPPER_GOLEM = {
  id: 'copper_golem',
  name: 'Copper Golem',
  level: 13,       // (t566s2518) combat level on its nameplate badge (+ its coin drop, L..3L) - under MONSTER_LEVELS.CAP (Dominic t573s2565), see MONSTER_LEVELS
  hp: 35,           // placeholder, not approved
  str: 3,            // placeholder, not approved - its slam does str on a full hit, otherwise 0..str (Combat.creatureAttack)
  def: 10,            // placeholder, not approved
  acc: 45,           // placeholder, not approved
  xp: 140,           // Combat XP per kill = 4 x HP (Art's rule) - follows the placeholder HP
  respawnS: RESPAWN_S.copper_golem, // (t575s2576) hidden respawn timer, RESPAWN_S
  height: 2.6,      // metres (Art's build: 2.6 m)
  bodyR: 0.85,      // (GD-30) metres from its centre to its body surface: her reach / stand-off and its slam reach are measured from here (the mushroom is 0)
  atkS: 3,          // placeholder, not approved - seconds between slams once provoked
  atkHitAt: 0.633,  // the two-fist slam lands 0.633 s into Attack (Art's hit_timing.json, frame 19 @ 30 fps)
  deathHitAt: 1.067, // Death: it hits the ground 1.067 s in (frame 32); it holds the final pose, then sinks away before the respawn
  atkReach: 0.9,    // metres past its body surface that the slam closes to; a slam lands if she is still within atkReach + 0.35
  aggro: 'provoked', // passive until she hits it, like the mushroom
  leashR: 5,        // placeholder, not approved
  walkSpd: 0.45,    // m/s - placeholder, not approved
  icon: '🪨',
  model: 'assets/models/creatures/copper_golem_i23d.glb', // Art's t539 game-fix build (welded, _HD_TEX / _HD_FEAT stripped, _HD_GLOW kept (t542), 0.97 MB; crystals rigid to the chest, no head / jaw spring, shin / foot cut moved to the foot; t553 arm fix: the 167/168-vert foot shells reweighted from hand.L/R to foot.L/R), copied unchanged (copper_golem_i23d.glb)
  clips: { idle: 'Idle', hit: 'Hit', death: 'Death', walk: 'Walk', attack: 'Attack' },
  shade: 'hdToon',  // Art's chalk toon + ink outline (src/creatures/hd_toon.js), colours from the GLB's vertex paint and material extras
  crackGlow: true,  // (t705u) its ore-coloured crack glow (t542: Art's _HD_GLOW 0..1 per vertex x its hd_glow colour x 1.6, bound without the atlas; Coal's glow colour is black = none, as in Art's lineup)
  srgbOut: true,    // (t704u) encode its own output to sRGB like Art's viewer (the game renders linear; the vertex paint is linear)
  rigid: { bones: ['head', 'jaw', 'crys.back', 'crys.sh.L', 'crys.sh.R'], clips: ['Idle', 'Walk', 'Attack', 'Hit'] }, // (t704u) head + shard spikes ride the chest; Death keeps its crumble
};
const COAL_GOLEM = {
  id: 'coal_golem',
  name: 'Coal Golem',
  level: 20,       // (t566s2518) combat level on its nameplate badge (+ its coin drop, L..3L) - under MONSTER_LEVELS.CAP (Dominic t573s2565), see MONSTER_LEVELS
  hp: 50,           // placeholder, not approved
  str: 4,            // placeholder, not approved - its slam does str on a full hit, otherwise 0..str (Combat.creatureAttack)
  def: 15,            // placeholder, not approved
  acc: 55,           // placeholder, not approved
  xp: 200,           // Combat XP per kill = 4 x HP (Art's rule) - follows the placeholder HP
  respawnS: RESPAWN_S.coal_golem, // (t575s2576) hidden respawn timer, RESPAWN_S
  height: 2.6,      // metres (Art's build: 2.6 m)
  bodyR: 0.85,      // (GD-30) metres from its centre to its body surface: her reach / stand-off and its slam reach are measured from here (the mushroom is 0)
  atkS: 3,          // placeholder, not approved - seconds between slams once provoked
  atkHitAt: 0.633,  // the two-fist slam lands 0.633 s into Attack (Art's hit_timing.json, frame 19 @ 30 fps)
  deathHitAt: 1.067, // Death: it hits the ground 1.067 s in (frame 32); it holds the final pose, then sinks away before the respawn
  atkReach: 0.9,    // metres past its body surface that the slam closes to; a slam lands if she is still within atkReach + 0.35
  aggro: 'provoked', // passive until she hits it, like the mushroom
  leashR: 5,        // placeholder, not approved
  walkSpd: 0.4,    // m/s - placeholder, not approved
  icon: '🪨',
  model: 'assets/models/creatures/coal_golem_i23d.glb', // Art's t539 game-fix build (welded, _HD_TEX / _HD_FEAT stripped, _HD_GLOW kept (t542), 0.97 MB; crystals rigid to the chest, no head / jaw spring, shin / foot cut moved to the foot; t553 arm fix: the 167/168-vert foot shells reweighted from hand.L/R to foot.L/R), copied unchanged (coal_golem_i23d.glb)
  clips: { idle: 'Idle', hit: 'Hit', death: 'Death', walk: 'Walk', attack: 'Attack' },
  shade: 'hdToon',  // Art's chalk toon + ink outline (src/creatures/hd_toon.js), colours from the GLB's vertex paint and material extras
  crackGlow: true,  // (t705u) its ore-coloured crack glow (t542: Art's _HD_GLOW 0..1 per vertex x its hd_glow colour x 1.6, bound without the atlas; Coal's glow colour is black = none, as in Art's lineup)
  srgbOut: true,    // (t704u) encode its own output to sRGB like Art's viewer (the game renders linear; the vertex paint is linear)
  rigid: { bones: ['head', 'jaw', 'crys.back', 'crys.sh.L', 'crys.sh.R'], clips: ['Idle', 'Walk', 'Attack', 'Hit'] }, // (t704u) head + shard spikes ride the chest; Death keeps its crumble
};
// ---------------------------------------------------------------------------------------------------------------------------------------------

// (Dominic, card t573s2565 via Art: 'Monster levels shouldn't exceed what we can kill at whatever level requires iron ore') the cap = the level that unlocks
// iron ore: Mining 20 (Skills ORES.iron.unlock), the same level as the iron swords (Combat SWORD_UNLOCK.iron 20). The old placeholders 1 / 10 / 25 / 40 scaled into
// 1..CAP keeping the Mushroom at 1: L' = 1 + (L - 1) x (CAP - 1) / (40 - 1), rounded -> 1 / 5 / 13 / 20. (A Combat 20 player with iron T0 swords, no skill points,
// beats the Coal golem's current placeholder stats in ~76% of straight fights, Copper ~100%.) The rows' level fields below carry these values.
const MONSTER_LEVELS = {
  CAP: 20,          // never above the iron-ore unlock level
  FROM: { lumen_mushroom: 1, tin_golem: 10, copper_golem: 25, coal_golem: 40 }, // the t566s2518 placeholders
  LEVEL: { lumen_mushroom: 1, tin_golem: 5, copper_golem: 13, coal_golem: 20 },  // = each row's level
};
const CREATURE_DATA = { lumen_mushroom: LUMEN_MUSHROOM, tin_golem: TIN_GOLEM, copper_golem: COPPER_GOLEM, coal_golem: COAL_GOLEM };

// ---------------------------------------------------------------------------------------------------------------------------------------------
// (Dominic t580u in Art's chat; t736u: "Mosby and Theus will be replaced by these completely and reinstalled with the same motions and noises as before. This
// includes the walkable and mineable features of Mosby") Art's i23d builds of the two big NPCs ARE their bodies now - the old procedural tortoise and the baked
// ape (assets/forge_ape.bin) are gone. Not combat creatures: they are NOT in CREATURE_DATA (no fights, levels or drops); src/creatures/npc_models.js registers
// them with Creatures.def and builds them with the same loader / chalk toon / ink as the golems. Both GLBs are built at 1/10 of their in-game size (Art's
// README): scaleM 10 = in-game metres per GLB metre. Mosby's numbers (walk top, ore, feet) are in MOSBY_RIG, Theus' (tools, clips per loop phase) in THEUS_RIG.
const NPC_MODELS = {
  mosby_giant: {
    id: 'mosby_giant', name: 'Mosby',
    model: 'assets/models/creatures/mosby_i23d.glb', // Art's mosby_i23d_slim.glb (production/mosby_i23d, t577u pointed tail + silver tin; 15,999 tris, 8 bones incl. tail, 1 MB)
    nativeH: 6.486,   // metres tall in the GLB (its bounds: 7.63 wide, 11.04 long) -> 64.9 m tall, 76 m wide, 110 m long in game
    scaleM: 10,       // (Art's README: 1/10 scale) in-game metres per GLB metre. The small house-carrying tortoise is the same GLB at 1/10 of this (MOSBY_RIG.smallK)
    shade: 'hdToon',  // Art's chalk toon + ink outline, look from the material extras (albedo + emissive maps, rim mask)
    crackGlow: true, glowColor: [0.32, 0.86, 1.0], glowGain: 1.6, // _HD_GLOW (Lumen crown + glyphs, 98 verts) on the golems' glow path; the GLB's own hd_glow is black, so the Lumen teal is set here
    clips: { idle: 'Idle', walk: 'Walk', talk: 'Talk' }, // Idle 3.03 s, Walk 2.03 s, Talk 2.03 s (Art's hit_timing.json); Talk while his dialogue is open
  },
  theus: {
    id: 'theus', name: 'Theus',
    model: 'assets/models/creatures/theus_i23d.glb', // Art's theus_i23d_slim.glb (production/theus_i23d, t577u colour fixes; 16,000 tris, 10 bones, 1 MB)
    nativeH: 9.803,   // metres tall in the GLB -> 98 m in game (the old baked ape was 91 m: 70 design m x 1.3)
    scaleM: 10,       // (Art's README: 1/10 scale) in-game metres per GLB metre
    shade: 'hdToon',
    clips: { idle: 'Idle', walk: 'Walk', talk: 'Talk', strike: 'Strike' }, // Idle 3.03, Walk 1.37, Talk 2.03, Strike 1.33 s
  },
  // (t740u) the Mole pet (src/pet_mole.js). (Dominic-approved rig_v2, 26 Nov) Art's arms-out mole, production/arms_out_v1/mole/rig_v2 mole_pet_i23d_slim.glb copied unchanged:
  // 15,998 tris, the same 7 bones, the shoulder pivot moved into the shoulder joint and the arms re-weighted (forearm + paw all on arm.L / arm.R), clips Idle / Walk / Deposit
  // Already game size (1.00 scale, feet on y 0): NOT x10. The ore in its satchel is part of the mesh (no separate ore piece).
  mole_pet: {
    id: 'mole_pet', name: 'Mole',
    model: 'assets/models/creatures/mole_pet_i23d.glb',
    nativeH: 0.78, scaleM: 1, // 0.78 m tall (the old procedural mole's H), footprint about 0.83 x 0.44 m (arms out; was 0.58 x 0.44)
    shade: 'hdToon',          // the material's hd_* extras; its _HD_GLOW is all 0 (no rim glow)
    clips: { idle: 'Idle', walk: 'Walk', deposit: 'Deposit' }, // Idle 2.033 s loop, Walk 1.033 s loop (waddle), Deposit 1.333 s (30 fps)
    handoffS: 1.3,  // Deposit: hop lands 0.5 s, bow into the satchel from 0.7 s, the ore changes hands at 1.3 s (deliver() / pickUp())
    walkStride: 0.07, // (t741u measured off the clip; rig_v2 re-measured 0.070 / 0.074 m, was 0.08) metres its paws sweep per Walk cycle: the clip plays at speed x 1.033 / walkStride, up to walkTsMax
    walkTsMax: 3,     // fastest Walk playback (3 waddles a second; the legs paddle at this rate while it hops)
    hop: { v0: 0.3, len: 0.6, hzMax: 4.5, h: 0.11, hMaxK: 1.8, contact: 0.16, vRef: 3.4, lean: 0.12 }, // (t741u) above v0 m/s it bounds: hops of len m (longer past hzMax a second), h m high (x up to hMaxK for the long catch-up hops), paws down for the contact share of each (x vRef / speed above its 3.4 m/s trot), leaning lean rad forward
    walkMin: 0.25,    // m/s below which it stands (Idle)
    // (Dominic, 26 Nov: arms to the sides while resting) Idle / rest only: arm.L turns -deg and arm.R +deg about the body's forward axis (axis, body frame), eased
    // over blendS s in and out. 15 deg is as far down as the arms go before the paws touch the belly (measured over the Idle clip: the paws clear the body by
    // 0.9 cm at their closest at 15 deg and sink into it from about 20 deg); the paw tips go from about 65 deg off vertical to about 50 deg
    armsRest: { deg: 15, axis: [0, 0, 1], blendS: 0.3 },
  },
};
for (const k in NPC_MODELS) NPC_MODELS[k].height = NPC_MODELS[k].nativeH * NPC_MODELS[k].scaleM; // in-game metres tall (Creatures.make scales the model to it)

// (t740u) the player, rebuilt on Art's GLBs (src/char3d.js): the male / female bodies are Art's (old bodies deleted); the old rig's motions drive Art's bones
// (same names, rest rotations all identity), so walk / run / mine / attack / sword swings / ride / ledge / fidgets are the ones we had. Art's Walk and Run
// clips take the legs and hips while she moves (phase-locked to the gait, at Art's stride so the planted foot stays put). Lengths are metres in Art's model
// frame (feet on y 0, +z forward, x her left). The slim files use EXT_texture_webp + KHR_mesh_quantization (read by src/creatures/creatures.js).
const PLAYER_MODELS = {
  m: {
    id: 'player_m', name: 'Player (male)',
    model: 'assets/models/player/player_male_v5.glb', // (t-male-v5) Fal's player_male_v5 (approved by Dominic), rigged onto the i23d male's skeleton: same 19 bones, rest pose and clips
    height: 1.52, keepOrigin: true, uv: true, // already game size (top 1.520 m, feet at y 0): NOT x10; no recentring (the pose code drives the bones in place)
    clips: { idle: 'Idle', walk: 'Walk', run: 'Run', mine: 'Mine', attack: 'Attack' }, // Idle 2.4, Walk 1.0, Run 0.66, Mine 1.2 (pick lands 0.636), Attack 0.9 (hit 0.423)
    hipZ: 0.0726,   // Art's hips sit this far forward of the origin: the model is set back by it so her hips are over the rig root, like the old body's
    legK: 0.688,    // Art's leg (thigh joint to ankle 0.485 m) / the old rig's (LT + LS 0.705): the old hips' bob / squat is scaled by it
    gait: { walk: { S: 1.26, ph0: 0.075 }, run: { S: 2.30, ph0: 0.442 } }, // S: metres per gait cycle of Art's clip (planted-foot speed x duration); ph0: clip phase where the left foot plants (the old gait's phase 0)
    grip: [0.024, -0.075, 0.044], gripMirrorX: true, // hand-local offset from the old palm point (0, -0.045, -0.031) to the middle of the closed mitten (past its cuff): tools sit in the fist.
                    // (t-male-v5) Fal's mittens sit 2.2 / 2.6 cm toward the body off the hand bones: x is mirrored for the left hand
    pack: { W: 0.40, H: 0.40, D: 0.19, y0: 0.04, zb: -0.30 }, // the backpack in the chest frame (width, height, depth, centre height, back face): the Tether coil, winch and lantern hang on it. (t-male-v5) re-measured off Fal's
                    // rigid pack: x -0.198..0.195, y -0.161..0.238, back face -0.302
    backZ: -0.325,  // (t741u; t-male-v5 unchanged: Fal's pack back face is at -0.302) chest-frame z of the sheaths and the stowed pick's back slot: on the back face of his pack (part of the mesh: nothing fits between)
    headTop: 1.520,  // top of the model (hair / helmet), metres
    reachM: 0.06,    // (t741u) how far a shoulder may give toward a hand target past Art's arm reach (the arms are solved onto the old rig's palm points)
    footDH: 0.25,    // (t741u) most a foot is lifted / lowered onto sloped ground (and the hips drop for the downhill foot)
  },
  f: {
    id: 'player_f', name: 'Player (female)',
    model: 'assets/models/player/player_female_i23d.glb', // Art's player_female_i23d_slim.glb (26 Nov, 668 KB)
    height: 1.47, keepOrigin: true, uv: true,
    clips: { idle: 'Idle', walk: 'Walk', run: 'Run', mine: 'Mine', attack: 'Attack' },
    hipZ: 0.0369,
    legK: 0.622,    // 0.417 / 0.67
    gait: { walk: { S: 1.07, ph0: 0.075 }, run: { S: 1.97, ph0: 0.442 } },
    grip: [0, -0.035, 0.036],
    pack: { W: 0.36, H: 0.30, D: 0.17, y0: -0.075, zb: -0.27 }, // (her pack sits lower and smaller: y -0.22..0.08 in the chest frame)
    backZ: -0.295,
    headTop: 1.471,
    reachM: 0.08,    // (her arms are the shorter: 0.48 m shoulder to fist vs the old rig's 0.515)
    footDH: 0.25,
  },
};

// (t736u) Mosby, rebuilt on Art's GLB (src/mosby.js): everything he does is read off the model. Lengths are giant metres in the GLB's own frame (feet on y 0,
// nose +z, x his left) unless they say otherwise; the small tortoise is the same model at smallK. His body units (Mosby.B: the ride / veins frame) are
// bodyM giant metres each (B.K 1.15 x GK 10), so the numbers below / 11.5 are body units.
const MOSBY_RIG = {
  model: 'mosby_giant', bodyM: 11.5, smallK: 0.1,
  bones: { shell: 'body', head: 'head', feet: ['lf.L', 'lf.R', 'lb.L', 'lb.R'] }, // GLB bones: the shell group (ride / veins frame) follows 'body', the neck + head group 'head'
  // B (body units) from the GLB bounds: shell half-width 38.1 m, shell length -52.8..31.4 m (centre -10.7 m), rim ~23 m up, belly 8.6 m up at his middle
  B: { rx: 3.32, rz: 3.66, ry: 3.64, by: 2.0, belly: 0.75 },
  // the walk top (MosbyRide's walkable region + heights): the top-most surface of the 'body' triangles rasterised in his shell frame (cellM grid), and a smoothed
  // copy (box blur ~smoothM) for the region's edge - his plates and ore lumps are bumpy, the edge follows the dome. MosbyRide tests the region at 30 deg; Art's
  // dome is steeper than the old one (65 m tall over 76 m), so the region's edge is put where the smoothed dome reaches walkMaxDeg: domeY is that height scaled
  // by tan(30) / tan(walkMaxDeg) about the summit (her feet still stand on the real surface: MosbyRide.hy rasterises the same triangles unsmoothed).
  // 52 deg = the shoulder of the crown, just past the ring of ore plates (measured: at 45 deg the ring is 1-3 m outside, at 55 deg the edge runs down the rim).
  walkTop: { cellM: 1.0, smoothM: 3.0, walkMaxDeg: 52 },
  // the mineable ore: Art baked it into the shell (albedo), so the ore IS the mine spot - no separate vein rocks. Found by colour on the rasterised top (copper
  // orange, coal black, tin silver, Lumen teal) and clustered; [type, x, z, r] in giant metres (r = the patch's radius, capped 5 m: she mines it from its edge,
  // and it is solid like a rock). The big black boss at his summit is coal she stands ON (solid false, mined in place); the copper and coal on the outer
  // rim (+-33 m, 31 m up) and the tail are below the walk top and stay decoration.
  ores: [
    { type: 'coal', x: 0.4, z: -8.9, r: 2.5, solid: false }, // the summit boss (r 11.5 m patch)
    { type: 'coal', x: -17.2, z: 13.3, r: 5.0 }, { type: 'coal', x: 16.0, z: 13.9, r: 5.0 },
    { type: 'coal', x: -26.1, z: -16.0, r: 5.0 }, { type: 'coal', x: 26.0, z: -15.8, r: 5.0 },
    { type: 'tin', x: -23.5, z: 0.5, r: 3.7 }, { type: 'tin', x: 22.0, z: 0.5, r: 3.7 },
    { type: 'copper', x: -18.2, z: -31.2, r: 3.9 }, { type: 'copper', x: 19.0, z: -32.1, r: 4.6 }, { type: 'copper', x: 1.6, z: -39.7, r: 3.6 },
  ],
  lumen: { x: -0.3, y: 45.4, z: 41.6, r: 3.0 }, // the Lumen Crystal crown baked on top of his head (its glow is the _HD_GLOW teal): the crystal's mine spot, head frame
  // feet: each leg bone's sole = its vertices within soleBandM of the leg's lowest point (centroid, bind pose); the foot collider sits on it, footR x the
  // sole's measured radius (~10.5-11.7 m) ; the head collider is the 'head' bone's vertices' centre, headR m
  soleBandM: 1.0, footRK: 0.85, headR: 12.0,
  // (t738u) his walk is the original one (the old stepAnim, body units) on Art's bones: a lateral-sequence walk (BL, FL, BR, FR a quarter cycle apart: ph = the
  // leg's offset, a larger one lifts earlier), on the ground duty of each cycle (Mosby.B.cyc s, stride B.stride); the swing lifts a front / back sole liftFront /
  // liftBack; a leg telescopes along itself at most stretch so a planted sole stays on the ground; the body shifts sway[0] over the planted side and rolls sway[1],
  // dips dip[0] / pitches dip[1] at each footfall, breathes breath; the head nods / looks / rolls (radians); a planted sole stays pinned to its spot at most lockM
  // body units off its stride (t739u)
  gait: { duty: 0.72, ph: { 'lb.L': 0, 'lf.L': 0.75, 'lb.R': 0.5, 'lf.R': 0.25 }, liftFront: 0.5, liftBack: 0.36, stretch: 0.2, lockM: 0.8, sway: [0.09, 0.03], dip: [0.06, 0.012], breath: 0.012,
    head: { nod: 0.035, walkDown: 0.04, dipNod: 0.05, look: 0.1, roll: 0.035 },
    // (t739u) the giant's line round the loop (metres): sampled every stepM, eased over +-posM, heading = its direction over +-headM; on a bend his pace drops so his
    // farthest sole (reachM from his middle) swings round at most slipMax m/s, never below minPace of his walk, eased in / out over +-slowM
    route: { stepM: 1, posM: 24, headM: 20, reachM: 40, slipMax: 1.5, minPace: 0.5, slowM: 30 } },
  // the pace: unchanged (B.stride / B.cyc body units / s: 5.4 m/s giant, 0.54 m/s small) - his loop timing, meet and the house trips keep their clocks
  // the small tortoise (her house on his back): the house sits on his summit (houseW body units wide), his colliders [dz, r] body units along his length
  houseW: 3.25, houseLift: -0.1, smallCols: [[3.7, 1.1], [0.6, 3.3], [-2.4, 3.2]],
};

// (t736u / t738u) Theus is Art's GLB moved by the original forge loop: the old rig's bones are posed exactly as before (no mesh) and Art's bones follow them
// (THEUS_RIG.retarget); the old hammer and tongs (same sizes, FORGE.L.handle / head / tongs / grip, design metres) are held closed in his fists at the ends of his arms
const THEUS_RIG = {
  // (t738u) his motion is the original forge loop's (src/volcanic_forge.js setPose on the old rig's bones), retargeted onto Art's skeleton. Per Art bone: turn = the
  // old bone whose turn (from its bind) it takes (move: and its shift, bindAt = that bone's bind spot, design m); aim = the old hand / foot it points at (rel: from
  // his own shoulder along the old arm from this old shoulder bone; without rel: straight at the old foot, so a planted foot stays planted)
  retarget: {
    body: { turn: 1, move: true, bindAt: [0, 36, 0] }, // the old chest (its lean, dip and twist) and the hips' drop / shift
    head: { turn: 2 },                                 // his gaze: down the bar to the blow, up over the carry
    'armU.R': { aim: 'hammer' },                       // the hammer arm, straight at the old fist on the hammer's grip: wind-up, drive, impact, rebound
    'armU.L': { aim: 'palmL' },                        // braced on his knee at the dip, swinging on the walks, planted on the platform's edge
    'armL.L': { aim: 'reinL' }, 'armL.R': { aim: 'reinR' },                   // both lower fists straight at the old fists on the tongs' reins
    'thigh.L': { aim: 'footL', stretch: 0.12 }, 'thigh.R': { aim: 'footR', stretch: 0.12 }, // the old foot placement (two steps per foot per walk); a leg lengthens up to 12% so a planted foot stays put
  },
  // the old rig's body plan (design m: FORGE.BP) fitted to Art's skeleton (his joints and fist / sole reach, x1.3 = his metres), so the old IK swings, reaches and
  // steps with his proportions: shoulders (shA upper, shB lower: from the chest pivot at hip + chestUp), arm lengths (+ the old 4.3 fist / 1.8 rein offsets = his
  // arm bones' reach), hips and legs (thigh + shin + ankle = his leg's reach); sho: the right shoulder's extra offset (none: his own shoulder)
  bodyPlan: { hipW: 6.57, thigh: 16, shin: 14.4, ankle: 1.4, shA: [18.24, 19.8, 0], armA: [14.3, 12.8], shB: [16.41, 9.24, 0], armB: [12.6, 11.8], sho: 0 },
  strikeAlong: 6, // (design m) where the blows fall along the laid bar from its jaws end (the old 17.5 is past his arm + hammer's reach)
  hammer: { bone: 'armU.R' }, tongs: { bone: 'armL.R', bone2: 'armL.L' }, handBandM: 4.0, // his fists: the lowest handBandM (GLB m) of each arm bone's vertices (bind)
};

// (GD-19) her side of the playground fight. Tap a creature: she runs up, locks on (always facing it) and starts one attack sequence every ATTACK_INTERVAL_S
// seconds, each the next of her 4 swing styles, each swing rolling the damage once; walking off ends her attacks (the creature's leash is its own row above).
// (Dominic t720u / t722u, Art's design approved on card t721s2718) overhead combat health bars, hers and the monster's: drawn by src/creatures/healthbars.js
// (DOM over the 3D canvas: constant screen size, billboarded). Shown ONLY while a fight is on - not when a monster is merely targeted - and gone FADE_AFTER_S after it ends.
const HEALTH_BARS = {
  FADE_AFTER_S: 5,        // (t722u) after the fight ends the bars stay this long...
  FADE_S: 0.35,           // ...then fade out over this
  LIFT_M: 0.5,            // (t566s2518 nameplate) the plate is pinned this far above the top of the model's bounding box (riding its head bone when it has one)
  MIN_GAP_PX: 4,          // at least this screen gap between the model top and the plate
  HEAD_W_K: 1.0,          // bar width = this x the head width...
  BODY_W_K: 0.6,          // ...or this x the body width for a creature with no head bone
  MIN_W_PX: 48, MAX_W_PX: 96, // clamped on screen
  H_PX: 10,               // bar height (the HP number sits on it)
  FRAME_PX: 2, FRAME: '#b08a3e', INNER: '#3a2c1c', RADIUS_PX: 3, SHADOW: '0 1px 2px rgba(0,0,0,.5)', // brass frame, 1 px inner line
  TRACK: '#2a2118',
  ME_FILL: '#6fae4a', ME_HI: '#8fcf63',     // hers: green, highlight over the top HI_TOP
  MOB_FILL: '#c8452f', MOB_HI: '#e0664c',   // the monster's: rust red
  HI_TOP: 0.4,
  TRAIL: '#f3e6c4', TRAIL_DELAY_S: 0.4, TRAIL_CATCH_S: 0.25, // parchment damage chunk behind the fill: holds, then catches up 0.4 s after a hit (heals fill instantly)
  NUM_PX: 12, NUM: '#f3e6c4', NUM_OUTLINE: '#1d150d',    // "14/20", centred, bold, 1 px outline (t566s2518: 12 px, was 10)
  LOW: 0.25, LOW_HZ: 1.5, LOW_BRIGHT: 1.45,               // below 25% her fill pulses brighter at 1.5 Hz
  HER_HEAD_W_M: 0.2,      // her head width when her rig has no measurable head part (metres)
  // (Art's nameplate, card t566s2518, mockup hd-notes/nameplate/nameplate_mockup.html) one centred row - brass Lv badge, then the name - with the health bar under it
  FONT: 'Georgia, "Times New Roman", serif',
  NAME_PX: 12, NAME: '#f3e6c4', NAME_OUTLINE: '#1a140e', NAME_OUTLINE_PX: 1,
  BADGE_PX: 12, BADGE_BG: '#2a2118', BADGE_BORDER: '#b08a3e', BADGE_PAD: '1px 6px',
  ROW_GAP_PX: 5, STACK_GAP_PX: 4,  // badge -> name gap; row -> bar gap
  // badge text colour: their combat level against hers
  LV_LOWER: '#6fae4a', LV_EVEN: '#f3e6c4', LV_HIGHER: '#e08a3a', LV_MUCH: '#c8452f', LV_MUCH_D: 10, // higher by 1..9 = orange, by 10+ = red
  NAME_R_M: 30, NAME_MAX: 10,  // names + badges: the nearest NAME_MAX within NAME_R_M of her (the health bars keep the combat-only rule)
  ME_PLATE: false,             // her own name / badge hidden (her health bar still shows in a fight)
};
// (Dominic, Art's card t566s2525: 'a varying range of gold coins dropped after every monster kill and automatically put into a players inventory unless it's full.
// Coins have no stacking limit' / 'if inventory is full the coins will drop on the ground') - src/creatures/coin_drops.js. No boss multiplier (not approved).
const COIN_DROPS = {
  ITEM: 'coin:gold',      // the backpack item (Gold Coins): one slot, no stacking limit
  MIN_K: 1, MAX_K: 3,     // a kill drops a whole random number of coins in [MIN_K x L, MAX_K x L], L = the creature row's combat level
  GROUND_S: 300,          // (Dominic: '5 minutes') coins dropped on a full backpack stay on the ground this long
  PICK_R_M: 1.2,          // she picks them up by walking within this (metres), once the backpack has room
  SPRITE_M: 0.45,         // their size on the ground (metres)
  ICON: { one: 'assets/ui/icons/coins/gold_coin_128.png', stack: 'assets/ui/icons/coins/gold_coin_stack_128.png', pile: 'assets/ui/icons/coins/gold_coin_pile_128.png' }, // Art's icons
  STACK_AT: 10,           // the icon is a stack from this many coins...
  PILE_AT: 100,           // ...and a pile from this many (inventory slot and the ground drop)
};
const PLAYGROUND_COMBAT = {
  ATTACK_INTERVAL_S: 3,
  MOB_START_SLACK_M: 0.25, // (GD-30 t706u) a hunting creature that has stopped beside her starts walking again only once she is this far past its reach (no walk / idle flicker)
  // (GD-30) who stands in the arena: the first row is her default target (the HUD); at = spawn spot (arena metres, she starts at the centre);
  // roam = metres it wanders round its spawn (0 / missing = the whole arena)
  CREATURES: [
    { id: 'lumen_mushroom', at: [0.38, 0, 0.95] },
    { id: 'tin_golem', at: [-3.4, 0, -2.6], roam: 1.6 },
  ],
  // (Dominic t698u) chasing a creature that walks away: once she is back in reach she starts AND finishes a whole attack sequence.
  // COMMIT_SWING: a started swing is never dropped to re-chase (she stays, keeps facing it); KEEP_REACH_M: hysteresis - a committed swing still lands at its
  // strike point up to REACH + this (she starts at STAND + 0.3, the plain reach is 1.7 m); SLOW_TARGET: the creature's walk speed while her swing is on it
  // (it flinches); RETRY_UNLANDED: a sequence that ended without its roll does not cost her the 3 s wait; KEEP_DRAWN: the chase run (locked on, it is a fight) does not sheathe her swords;
  // HOLD_IN_REACH: once caught up she holds position until it is past the full 1.7 m reach (she does not re-chase each few cm while her run winds down).
  // (Dominic t719u: 'indecisive movement back and forth') REPATH_M: she re-aims her run only once its stand-off spot has moved this far (was 0.35 m in code), REPATH_S: and at most
  // this often; HOLD_TARGET: the creature she has targeted stops wandering and faces her until it hunts her (its wander no longer drags her run about)
  CHASE: { COMMIT_SWING: true, KEEP_REACH_M: 0.6, SLOW_TARGET: 0.3, RETRY_UNLANDED: true, KEEP_DRAWN: true, HOLD_IN_REACH: true, REPATH_M: 0.5, REPATH_S: 0.25, HOLD_TARGET: true },
  // (GD-22, Dominic t684u) at 0 HP she crumbles to ash, then the respawn plays: her colours go ash grey, a cut sweeps from the top of her head to her feet
  // (everything above it gone) while ash and embers drift up off the cut; once she is gone the arena waits a beat, then she respawns at the centre.
  // Cheap for iPhone: one clipping plane on her own materials and one small particle cloud - no full-screen pass, no extra render target.
  ASH: {
    TINT_S: 0.35,       // seconds to go ash grey (starts at once, overlaps the dissolve)
    DISSOLVE_S: 1.7,    // seconds for the cut to sweep head to feet
    HOLD_S: 0.5,        // seconds of empty floor (the last ash settling) before the respawn
    PARTICLES: 140,     // ash + ember specks, shed from the cut as it passes
    EMBER_FRAC: 0.3,    // share of the specks that glow as embers (the rest grey ash)
    RISE_MPS: 0.55,     // how fast a speck drifts up
    DRIFT_MPS: 0.25,    // sideways drift
    LIFE_S: 1.1,        // a speck fades out over this
  },
};
