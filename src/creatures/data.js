/* ===== Creatures: the data table (t661). One entry per creature; src/creatures/creatures.js loads, builds and animates any entry the same way,
   so a new creature is a new row here + its GLB under assets/models/creatures/. Stats are PLACEHOLDERS (Dominic: "easy placeholder values").
   Combat XP per kill = 4 x creature HP (Art's rule); the Combat XP per-level curve is still a placeholder. (GD-12) It bites back:
   Combat.creatureAttack reads str + acc (GD-15 formula); the attack timing / reach / walk fields below drive the playground arena. ===== */

// ---------------------------------------------------------------------------------------------------------------------------------------------
// LUMEN MUSHROOM - the Attack Playground's practice target (t653u). Model: "Mushnub" from Quaternius' Ultimate Monsters (CC0 1.0, see CREDITS.md),
// shipped alone as assets/models/creatures/mushnub.glb (67 KB, no pack zip). Body, rig and clips untouched; recoloured at load: a glowing lumenite
// cyan cap (#66d8ff), a cream stem (#eedcbc), its own sleepy side eyes (Art's concept mia/concepts/creatures/mushnub/mushnub_lumen_concept.png).
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
  atkHitAt: 0.35,   // seconds into the bite clip that the bite lands
  atkReach: 1.1,    // metres: it closes to this and bites; a bite lands if she is still within atkReach + 0.35
  aggro: 'provoked', // (GD-21, Dominic t682u) 'provoked': it leaves her alone - wanders, never bites - until she hits it; then it hunts her (leashR below).
                    // Past the leash it gives up and is passive again (she has to hit it again). 'near' (not used yet): it also turns on her when she walks right up.
  leashR: 4,        // (GD-19) metres: once she hits it (or walks right up to it) it keeps closing in and biting until she is farther than this, then it goes back
                    // to wandering. 4 m = its bite reach (1.1 m) + ~3 m, so stepping back a little does not shake it but running off does
  walkSpd: 0.55,    // m/s, wandering and closing in
  icon: '🍄',
  model: 'assets/models/creatures/mushnub.glb',
  clips: { idle: 'Idle', hit: 'HitRecieve', death: 'Death', walk: 'Walk', attack: 'Bite_Front' },   // (the pack's own clip names, "CharacterArmature|" stripped)
  // recolour: the first rule whose test matches a GLB material name wins; part names the material (tag 'lumen_mushroom:<part>')
  look: [
    { test: /Secondary/, part: 'cap', color: 0x66d8ff, emissive: 0x2fb8f0, glow: 0.55 },
    { test: /Main/, part: 'stem', color: 0xeedcbc, emissive: 0x3a3428, glow: 0.25 },
    { test: /Eye_White/, part: 'eyeWhite', color: 0xeef1f6 },
    { test: /./, part: 'eyeBlack', color: 0x141518 },
  ],
};
// ---------------------------------------------------------------------------------------------------------------------------------------------

const CREATURE_DATA = { lumen_mushroom: LUMEN_MUSHROOM };

// (GD-19) her side of the playground fight. Tap a creature: she runs up, locks on (always facing it) and starts one attack sequence every ATTACK_INTERVAL_S
// seconds, each the next of her 4 swing styles, each swing rolling the damage once; walking off ends her attacks (the creature's leash is its own row above).
const PLAYGROUND_COMBAT = {
  ATTACK_INTERVAL_S: 3,
  // (Dominic t698u) chasing a creature that walks away: once she is back in reach she starts AND finishes a whole attack sequence.
  // COMMIT_SWING: a started swing is never dropped to re-chase (she stays, keeps facing it); KEEP_REACH_M: hysteresis - a committed swing still lands at its
  // strike point up to REACH + this (she starts at STAND + 0.3, the plain reach is 1.7 m); SLOW_TARGET: the creature's walk speed while her swing is on it
  // (it flinches); RETRY_UNLANDED: a sequence that ended without its roll does not cost her the 3 s wait; KEEP_DRAWN: the chase run (locked on, it is a fight) does not sheathe her swords;
  // HOLD_IN_REACH: once caught up she holds position until it is past the full 1.7 m reach (she does not re-chase each few cm while her run winds down).
  CHASE: { COMMIT_SWING: true, KEEP_REACH_M: 0.6, SLOW_TARGET: 0.3, RETRY_UNLANDED: true, KEEP_DRAWN: true, HOLD_IN_REACH: true },
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
