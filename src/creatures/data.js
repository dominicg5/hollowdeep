/* ===== Creatures: the data table (t661). One entry per creature; src/creatures/creatures.js loads, builds and animates any entry the same way,
   so a new creature is a new row here + its GLB under assets/models/creatures/. Stats are PLACEHOLDERS (Dominic: "easy placeholder values").
   Combat XP per kill = 4 x creature HP (Art's rule); the Combat XP per-level curve is still a placeholder. (GD-12) It bites back:
   Combat.creatureAttack reads str + acc (GD-15 formula); the attack timing / reach / walk fields below drive the playground arena. ===== */

// ---------------------------------------------------------------------------------------------------------------------------------------------
// LUMEN MUSHROOM - the Attack Playground's practice target (t653u). (GD-33, Dominic t553u: "that replaces the old Lumen Mushroom") Model: Art's own Mushnub
// (creature_pipeline/production/mushnub_i23d, image-to-3D build3, gate 3 PASS), the game build mushnub_i23d_slim.glb shipped as assets/models/creatures/mushnub_i23d.glb
// (600 KB: welded, 7,108 tris, 4 bones, 1024 JPEG albedo + emissive built in, COLOR_0 vertex shading and the _HD_GLOW rim-glow mask kept). Drawn with Art's chalk toon +
// ink outline from its material extras (hd_srim / hd_sshade / hd_lift / hd_rimE...), like his viewer. Replaces the Quaternius CC0 Mushnub (recoloured at load).
const LUMEN_MUSHROOM = {
  id: 'lumen_mushroom',
  name: 'Lumen Mushroom',
  hp: 8,            // max HP (Art's stats, Dominic t655)
  str: 1,           // Strength: its bite does str on a full hit, otherwise 0..str (Combat.creatureAttack, GD-15)
  def: 0,           // Defense (Combat.hitChance: her Accuracy / (def + 100))
  acc: 30,          // Accuracy - PLACEHOLDER (GD-15): its full-hit chance on her = acc / (her Defense + 100), capped at 60%; otherwise 0..str
  xp: 32,           // Combat XP per kill = 4 x creature HP (Art's rule); awarded via Combat.addXp, on the shared Skills curve (Skills.xpToReach, Lv 1-300).
  respawnS: 3,      // seconds after it dies before a fresh one pops back up
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
  hp: 20,           // placeholder, not approved
  str: 2,            // placeholder, not approved - its slam does str on a full hit, otherwise 0..str (Combat.creatureAttack)
  def: 5,            // placeholder, not approved
  acc: 35,           // placeholder, not approved
  xp: 80,           // Combat XP per kill = 4 x HP (Art's rule) - follows the placeholder HP
  respawnS: 6,
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
  hp: 35,           // placeholder, not approved
  str: 3,            // placeholder, not approved - its slam does str on a full hit, otherwise 0..str (Combat.creatureAttack)
  def: 10,            // placeholder, not approved
  acc: 45,           // placeholder, not approved
  xp: 140,           // Combat XP per kill = 4 x HP (Art's rule) - follows the placeholder HP
  respawnS: 6,
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
  hp: 50,           // placeholder, not approved
  str: 4,            // placeholder, not approved - its slam does str on a full hit, otherwise 0..str (Combat.creatureAttack)
  def: 15,            // placeholder, not approved
  acc: 55,           // placeholder, not approved
  xp: 200,           // Combat XP per kill = 4 x HP (Art's rule) - follows the placeholder HP
  respawnS: 6,
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

const CREATURE_DATA = { lumen_mushroom: LUMEN_MUSHROOM, tin_golem: TIN_GOLEM, copper_golem: COPPER_GOLEM, coal_golem: COAL_GOLEM };

// (GD-19) her side of the playground fight. Tap a creature: she runs up, locks on (always facing it) and starts one attack sequence every ATTACK_INTERVAL_S
// seconds, each the next of her 4 swing styles, each swing rolling the damage once; walking off ends her attacks (the creature's leash is its own row above).
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
