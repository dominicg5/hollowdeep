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
  xp: 32,           // Combat XP per kill = 4 x creature HP (Art's rule); awarded via Combat.addXp. The Combat XP per-level curve is still a placeholder.
  respawnS: 3,      // seconds after it dies before a fresh one pops back up
  height: 0.8,      // metres tall in the playground
  atkS: 2,          // (GD-12) seconds between bites once it is fighting her
  atkHitAt: 0.35,   // seconds into the bite clip that the bite lands
  atkReach: 1.1,    // metres: it closes to this and bites; a bite lands if she is still within atkReach + 0.35
  aggroS: 8,        // seconds it stays on her after she last hit it (or while she stands right beside it)
  leashR: 5,        // metres: it gives up the chase past this and goes back to wandering
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
