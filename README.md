# Hollowdeep: playable prototype

One self-contained file: `hollowdeep-prototype.html`. It has no dependencies and works offline. Open it in any modern browser (Safari/Chrome on a phone, or desktop). Progress saves to the browser's localStorage.

**Test mode is ON by default:** 1 game hour = 1 real minute. Training thresholds are also scaled ×0.01 (+100% boost at 3,000 taps, daily cap 600). Toggle it, skip time, or reset in ⚙️ Settings.

## How to play
- **🗺️ Rim City** (opens first): a huge, painterly top-down map of the lands around the Hollow (world radius 11,000; about 8,000 AI homes). The old city crowds the Hollow's lip; beyond it lie villages, lone farmsteads and a patchwork of far lands where the earth is cracking open. Drag to pan, pinch or scroll to zoom, and use ＋/－, 🏠 (fly home), 🌐 (whole map), 📖 (legend), 📔 (Wren's journal), 🍂 (seasons and debug) or the round minimap. Homes, called **Lanternholds**, carry their owners' names. Yours is ringed in gold and drawn from your real save: hall level, a banner per Hollow layer reached, mole skulls, a cracked wall after a lost raid, and pets asleep on the porch. Tap anything:
  - a **home**: owner, level, power, its history, and a **Raid** button. The raid uses the same hero raid system; it costs 10 Lumen, is a 30 min march, and leaves a 6h shield.
  - a **bazaar** (one per inner region, plus the Cinderglass Bazaar out in the lava fields): buy and sell resources at regional prices. Price spikes are foreshadowed by the ticker and bring crowds.
  - a **Rim Vault**: buy extra storage. The buildable 🏦 Rim Vault adds +30% caps and +3% raid protection per level.
  - **Tether lifts, landmarks** (the broken Statue of the First Descent, the Memorial Wall of the Lost, the sealed Undergate at the far end of a great chasm), **rift mouths** (Lumen-lit fissures far out in the lands that may lead back down into the Hollow), static **named townsfolk** (Pell the lamplighter, Kip and others), the **Hollow** itself, and any **region**.
  - Ten lands, discovered by exploring (linger zoomed in over one, raid a home there, fight a mole there, or visit a rift). Until then the map, legend and cards show only "Unexplored lands" with no names or resources. Nine ring the Hollow and repeat as a warped patchwork in the far lands; the tenth, **the Emberwound**, is a lava field far out, where molten rock seeps from the cracks and flows across the ground, glowing at night. It yields 🖤 **Obsidian**.
  - Living world (kept calm and light): pets dozing on porches, lifts that ride up and down, cranes over the chasms, boats, chimney and vent smoke, things peeking out of cracks, mist, Lumen motes, rain, storms with lightning deep below, and updrafts. There are no roads or walkers. A rare day-time sky-fish casts its shadow, and a small glowing school surges out of the chasm at nightfall.
  - Seasons (Bloomtide, Lumen Summer, Ambertide, Frostfall; one game day each in test mode) bring the Lumen Festival lanterns, the Harvest Fair and winter frost. A rumor ticker hints at real upcoming raids, moles, price spikes and festivals.
- **🏰 Capital**: one builder at a time. Upgrade the Lantern Hall (income), Storehouse (caps and raid protection), Training Grounds, Tether Lift (how deep your Spine reaches, lift capacity, and a cheaper Pull), Guardian Wall (rock golems; from Lv 6 it also needs Obsidian), Kennel (pet slots), and Rim Forge (smelts raw ore at the top). Obsidian comes from the Bellows layer, raids on Emberwound homes, or the Cinderglass Bazaar.
- **🕳️ Hollow**: send Wren on timed expeditions. The Lip takes 1h, Terraces 3h, Rootfall 6h, and the Bellows 10h. Deeper trips pay better but are riskier. A failed run leaves her "stranded" (half loot, home later, or pay Lumen for a rescue line). Expeditions can also find pet eggs.
- **🐢 Outposts**: your Strider *Longstep* mines a vein and lifts its goods to the Rim every hour. Hauling costs Lumen (**the Pull** = weight × depth × layer pull). Install a **Smelter** (iron + coal → steel) or a **Lumen Still** (moss → lumen) to refine below, and set shipping to "Refined only". Moving means packing up, traveling, and settling, all on timers. It costs Crowns plus Lumen that scales with depth, and the outpost is raid bait while it's moving. At Tether Lift Lv 2 you can build a second outpost, the Tetherdrill. Outposts burn Lumen to stay lit, and they "go dark" if the capital runs out.
- **⚔️ Raids**: auto-resolved raids on 3 AI rival bases, scored by your hero + pets vs. their defense, for 0 to 3 stars of loot. AI raiders hit you every 8 to 14 game hours (the first, at 1.5h, is a tutorial raid you win). That's when the **wall stands up** and the golems wake. Raiders sometimes go after an outpost that's moving or has a full stockhold instead.
- **🗡️ Training**: tap the dummy (or hold Space). Taps feed a rolling 7-day bank: boost = 100% × (bank ÷ 300k)^0.75, with a daily cap of 60k. Taps over the cap earn cosmetic Spar Marks, and anything faster than 12 taps/sec is ignored. The boost multiplies all hero XP.
- **Offline**: close the tab and come back (more than 45s later). The game simulates the gap (up to 72 game hours) and shows a "While you were away" summary.

## What to test
1. Tap the dummy 20 to 30 times. The counter, boost %, and next-milestone line should update, and the sword should swing.
2. Send Wren to The Lip and wait about 1 minute. Loot and XP should show up as a toast and in the Chronicle (Raids tab).
3. Wait about 90 seconds from a new game for the tutorial raid and the golem reveal. You can also use Raids → "Test: trigger a raid on me".
4. The full chain: upgrade the Tether Lift to Lv 3 (needs Steel from Rootfall/Bellows expeditions or rival raids), move Longstep to the Iron Seam (layer 4), add a Smelter, choose "Refined only", and compare the two Pull numbers on the card.
5. Close the tab for a few minutes and reopen it (or use ⚙️ → Skip +8h). Check the away summary.
6. Feel: does a 2 to 3 minute check-in feel worth it? Is moving a real decision? Is the tap boost worth tapping?

## Tuning
Every number lives in the `CONFIG` object at the top of the `<script>`: layers, loot, timers, costs, the tap curve, Pull weights, raid odds, and pets.

## Dev
- Source pieces are in `src/`: `head.html`, `game.js`, `ui.js`, and the Rim City map files `map_gen.js` (seeded generation), `map_draw.js` (procedural fallback painter), `art_manifest.js` + `map_art.js` (painted-art renderer), `map_life.js` (time, seasons, agents) and `map_ui.js` (camera, input, overlays, cards). Rebuild `index.html` with `./build.sh`.
- Painted art lives in `assets/` (about 7 MB of WebP): four sprite atlases (about 250 painted sprites: homes in 10 regional styles, in 2 designs and 6 sizes each, bazaars, vaults, lifts, cranes, landmarks, plants, rocks, lava vents and obsidian, yard props, townsfolk, pets, the Rim Mole, sky-fish), 25 seamless ground and crop textures, the Hollow, and painted UI art in `assets/ui/` for the other tabs. It loads behind a progress screen. If any file fails to load, the map falls back to the old procedural painter.
- Because of the image assets, serve the folder over http for local testing (for example `python3 -m http.server 8765`). `test/city.js` defaults to `http://localhost:8765/index.html`. `test/shots.js` takes quick review screenshots.
- Headless tests: `cd test && node test.js` (Playwright-core + system Chrome; about 100s because it waits for a real 1-hour test-mode expedition and the tutorial raid), and `node city.js` for the map (mobile viewport: render, drag, wheel, pinch, tap a home then raid, market, vault, lore, ticker, tabs, screenshots).
- The map is Canvas 2D. The static world is pre-rendered into 256px tiles at 8 zoom levels from 1/64 to 2 (an LRU cache with a per-frame render budget, crossfades, and prewarmed coarse levels). Far zoom draws homes as roof specks, and night lights merge into settlement glows. Plants are scattered at paint time from a world hash, so they cost no memory. Everything alive is a deterministic function of time. The map is seeded (`CITY.seed`), so every player sees the same world. `test/perf.js` benchmarks frame time under a 4x CPU throttle.

## Known limitations
- 2D only, no 3D and no sound. Sprites are not rotated, so homes all face the camera. The Hollow is a single painted image, so it softens at the closest zoom. Rift mouths are lore only for now; you cannot descend through them.
- Single-player: rivals, raiders and every Rim City Lanternhold are simulated AI. No server and no real PvP. Bazaar prices are local.
- Saves are per browser/device (localStorage). Clearing site data wipes them.
- The balance is a first pass and untested with real players.
- Not included yet: Gates and Wardens, Captains, line cutting/splice repair, Mother Veins, capital capture, Shellbacks, pet Moults.
