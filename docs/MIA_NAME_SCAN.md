# Made in Abyss name scan (report only - nothing renamed)

Scanned `src/` and `docs/` (case-insensitive) for Made in Abyss proper nouns and signature terms:
Abyss, Orth, Netherworld, Cave Raider, Whistle (Red/Blue/Moon/Black/White), Curse, Relic, Riko, Reg, Nanachi, Ozen,
Bondrewd, Lyza, Prushka, Faputa, Vueko, Ilblu, Belchero, Ido Front, Seeker Camp, Eternal Fortune, Inverted Forest,
Goblet of Giants, Sea of Corpses, Capital of the Unreturned, Narehate, Cartridge, Star Compass, Blaze Reap, Umbra Hands,
Crimson Splitjaw, Orbed Piercer, Corpse-weeper, Edge of the Abyss.

## Exact hits
None. ("Orth"/"Ozen" only matched inside other words, e.g. "north"; "Edge of the" is "Edge of the wall" / "edge of the world".)

## Close or thematic overlaps (worth a look, no action taken)
| Term in game | Where | Overlap | Risk |
|---|---|---|---|
| **Hollow** / Hollowdeep / "the Hollow" | everywhere (title, the pit) | The official English MiA localisation calls transformed people "Hollows" (Narehate). Ours is a place name, not a creature. | low-medium |
| **Delver** (player class, random names `Delver1234`, "Old Delver's Mouth") | char3d.js, head.html, map_gen.js, map_life.js | MiA's official term is "Cave Raider"; "delver" is generic English (also used by other games). | low |
| **Layers** of the pit, Lumen cost = weight x layers climbed x layer pull | ui.js, map_gen.js, map_life.js | Mirrors MiA's numbered Layers and the "strain of ascent" idea (the Curse). Mechanic, not a name. | medium (concept) |
| Memorial wall for delvers who never returned; first delver who never returned | map_life.js | Echoes MiA's lost-delver lore (Lyza, the Unreturned). Generic theme. | low |
| Lanterns going down into a glowing pit | map_art.js | Generic adventure imagery. | low |

## 3-5 original character-class names (proposals, not applied)
1. **Ropewarden**: tether and anchor specialist (Ledge Tethers, belays).
2. **Seamreader**: finds ore seams and veins, the mining class.
3. **Lampwright**: light and Lumen crafter (lanterns, glow gear).
4. **Cliffhewer**: climber and wall-breaker (picks, cliff veins).
5. **Emberkeeper**: forge and furnace class (smelting, drills, coal).
