/* ===== Creatures: the data table (t661). One entry per creature; src/creatures/creatures.js loads, builds and animates any entry the same way,
   so a new creature is a new row here + its GLB under assets/models/creatures/. Stats are PLACEHOLDERS (Dominic: "easy placeholder values").
   Combat XP per kill = 4 x creature HP (Art's rule); the Combat XP per-level curve is still a placeholder. str is stored only: no creature
   counterattacks exist yet, nothing reads it. ===== */

// ---------------------------------------------------------------------------------------------------------------------------------------------
// LUMEN MUSHROOM - the Attack Playground's practice target (t653u). Model: "Mushnub" from Quaternius' Ultimate Monsters (CC0 1.0, see CREDITS.md),
// shipped alone as assets/models/creatures/mushnub.glb (67 KB, no pack zip). Body, rig and clips untouched; recoloured at load: a glowing lumenite
// cyan cap (#66d8ff), a cream stem (#eedcbc), its own sleepy side eyes (Art's concept mia/concepts/creatures/mushnub/mushnub_lumen_concept.png).
const LUMEN_MUSHROOM = {
  id: 'lumen_mushroom',
  name: 'Lumen Mushroom',
  hp: 8,            // max HP (Art's stats, Dominic t655)
  str: 1,           // Strength - STORED ONLY: no creature counterattacks exist yet, nothing reads this
  def: 0,           // Defense (Combat.hitChance: her Accuracy / (def + 100))
  xp: 32,           // Combat XP per kill = 4 x creature HP (Art's rule); awarded via Combat.addXp. The Combat XP per-level curve is still a placeholder.
  respawnS: 3,      // seconds after it dies before a fresh one pops back up
  height: 0.8,      // metres tall in the playground
  icon: '🍄',
  model: 'assets/models/creatures/mushnub.glb',
  clips: { idle: 'Idle', hit: 'HitRecieve', death: 'Death' },   // (the pack's own clip names, "CharacterArmature|" stripped)
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
